import { Room, Seat, User } from '@afterparty/shared-types';
import { Redis } from 'ioredis';

export class RoomManager {
  private rooms = new Map<string, Room>();               // roomId -> Room
  private codeToRoomId = new Map<string, string>();       // roomCode -> roomId
  private userToRoomId = new Map<string, string>();       // userId -> roomId
  private redis: Redis | null = null;

  constructor(redisClient: Redis | null = null) {
    this.redis = redisClient;
  }

  /**
   * Generates a 6-digit numeric room code guaranteed collision-free.
   */
  private generateUniqueRoomCode(): string {
    for (let attempts = 0; attempts < 1000; attempts++) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      if (!this.codeToRoomId.has(code)) {
        return code;
      }
    }
    // Fallback timestamp-based code
    return (Date.now() % 1000000).toString().padStart(6, '0');
  }

  /**
   * Creates a new room.
   */
  public createRoom(host: User, gameType: string = 'card_highlow', seatCount: number = 6): Room {
    const clampedSeats = Math.max(2, Math.min(12, seatCount));
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const roomCode = this.generateUniqueRoomCode();

    const seats: Seat[] = Array.from({ length: clampedSeats }, (_, i) => ({
      seatIndex: i,
      user: i === 0 ? host : null, // Host automatically sits at seat 0
      isReady: true,
    }));

    const room: Room = {
      roomId,
      roomCode,
      hostId: host.id,
      gameType,
      seatCount: clampedSeats,
      seats,
      status: 'waiting',
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    this.codeToRoomId.set(roomCode, roomId);
    this.userToRoomId.set(host.id, roomId);

    this.syncRoomToRedis(room);
    return room;
  }

  public getRoomById(roomId: string): Room | null {
    return this.rooms.get(roomId) || null;
  }

  public getRoomByCode(code: string): Room | null {
    const roomId = this.codeToRoomId.get(code);
    return roomId ? (this.rooms.get(roomId) || null) : null;
  }

  public getRoomByUserId(userId: string): Room | null {
    const roomId = this.userToRoomId.get(userId);
    return roomId ? (this.rooms.get(roomId) || null) : null;
  }

  /**
   * Joins room by 6-digit room code.
   */
  public joinRoom(roomCode: string, user: User): Room {
    const room = this.getRoomByCode(roomCode);
    if (!room) {
      throw new Error('房间不存在或已解散');
    }

    this.userToRoomId.set(user.id, room.roomId);

    // If user already in a seat, refresh user info
    const existingSeat = room.seats.find(s => s.user?.id === user.id);
    if (existingSeat) {
      existingSeat.user = user;
    } else {
      // Find first empty seat and take it if available
      const emptySeat = room.seats.find(s => s.user === null);
      if (emptySeat) {
        emptySeat.user = user;
        emptySeat.isReady = true;
      }
    }

    this.syncRoomToRedis(room);
    return room;
  }

  /**
   * Selects a specific seat number (0..seatCount-1).
   */
  public takeSeat(roomId: string, user: User, seatIndex: number): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('房间不存在');
    if (seatIndex < 0 || seatIndex >= room.seats.length) throw new Error('无效的座位号');

    const targetSeat = room.seats[seatIndex];
    if (targetSeat.user && targetSeat.user.id !== user.id) {
      throw new Error('该座位已被其他玩家入座');
    }

    // Leave any existing seat in this room
    for (const seat of room.seats) {
      if (seat.user?.id === user.id) {
        seat.user = null;
      }
    }

    targetSeat.user = user;
    targetSeat.isReady = true;

    this.syncRoomToRedis(room);
    return room;
  }

  /**
   * Leaves current seat.
   */
  public leaveSeat(roomId: string, userId: string): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('房间不存在');

    for (const seat of room.seats) {
      if (seat.user?.id === userId) {
        seat.user = null;
      }
    }

    this.syncRoomToRedis(room);
    return room;
  }

  /**
   * Host updates total seats count (2..12).
   */
  public updateSeatCount(roomId: string, hostId: string, seatCount: number): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('房间不存在');
    if (room.hostId !== hostId) throw new Error('仅房主有权调整座位数');
    if (room.status === 'playing') throw new Error('游戏进行中无法修改座位');

    const count = Math.max(2, Math.min(12, seatCount));
    if (count > room.seats.length) {
      for (let i = room.seats.length; i < count; i++) {
        room.seats.push({ seatIndex: i, user: null, isReady: false });
      }
    } else if (count < room.seats.length) {
      // Remove empty seats from end first
      room.seats = room.seats.slice(0, count);
    }
    room.seatCount = count;

    this.syncRoomToRedis(room);
    return room;
  }

  /**
   * Host starts game.
   */
  public startGame(roomId: string, hostId: string): { room: Room; seatedPlayers: User[] } {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('房间不存在');
    if (room.hostId !== hostId) throw new Error('仅房主有权开始游戏');

    const seatedPlayers = room.seats.filter(s => s.user !== null).map(s => s.user!);
    if (seatedPlayers.length === 0) {
      throw new Error('至少需要一名玩家入座才能开始');
    }

    room.status = 'playing';
    this.syncRoomToRedis(room);
    return { room, seatedPlayers };
  }

  /**
   * User leaves room.
   */
  public leaveRoom(roomId: string, userId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    this.leaveSeat(roomId, userId);
    this.userToRoomId.delete(userId);

    // If host leaves, assign next seated player as host, or dissolve room if empty
    const remainingSeated = room.seats.filter(s => s.user !== null);
    if (remainingSeated.length === 0) {
      this.rooms.delete(roomId);
      this.codeToRoomId.delete(room.roomCode);
      if (this.redis) {
        this.redis.del(`room:data:${roomId}`);
        this.redis.srem('active_room_codes', room.roomCode);
      }
      return null;
    }

    if (room.hostId === userId) {
      room.hostId = remainingSeated[0].user!.id;
    }

    this.syncRoomToRedis(room);
    return room;
  }

  private syncRoomToRedis(room: Room): void {
    if (this.redis && this.redis.status === 'ready') {
      this.redis.set(`room:data:${room.roomId}`, JSON.stringify(room), 'EX', 86400);
      this.redis.sadd('active_room_codes', room.roomCode);
    }
  }
}
