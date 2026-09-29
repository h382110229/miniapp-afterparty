import { WebSocket } from 'ws';
import { FastifyInstance } from 'fastify';
import { Redis } from 'ioredis';
import { RoomManager } from '../modules/room/RoomManager.js';
import { AuthService } from '../modules/auth/AuthService.js';
import { ClientAction, ServerEvent, User } from '@afterparty/shared-types';

interface ClientConnection {
  socket: WebSocket;
  user: User | null;
  roomId: string | null;
  isAlive: boolean;
}

export class WebSocketHub {
  private clients = new Map<WebSocket, ClientConnection>();
  private roomSockets = new Map<string, Set<WebSocket>>();
  private roomManager: RoomManager;
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;

  constructor(roomManager: RoomManager, pubRedis?: Redis | null, subRedis?: Redis | null) {
    this.roomManager = roomManager;
    this.pubClient = pubRedis || null;
    this.subClient = subRedis || null;

    if (this.subClient) {
      this.subClient.on('message', (channel, message) => {
        if (channel.startsWith('room:broadcast:')) {
          const roomId = channel.replace('room:broadcast:', '');
          try {
            const event = JSON.parse(message) as ServerEvent;
            this.broadcastToRoom(roomId, event);
          } catch (err) {
            console.error('[WebSocketHub] Error parsing pubsub broadcast:', err);
          }
        }
      });
    }
  }

  public register(fastify: FastifyInstance): void {
    fastify.get('/ws', { websocket: true }, (rawSocket: any, req) => {
      const socket: WebSocket = rawSocket?.socket || rawSocket;
      const client: ClientConnection = {
        socket,
        user: null,
        roomId: null,
        isAlive: true,
      };

      this.clients.set(socket, client);

      socket.on('pong', () => {
        client.isAlive = true;
      });

      socket.on('message', async (raw: any) => {
        try {
          const action = JSON.parse(raw.toString()) as ClientAction;
          await this.handleClientAction(client, action);
        } catch (err: any) {
          console.error('[WebSocketHub] Error handling message:', err.message);
          this.sendEvent(socket, {
            type: 'room:error',
            payload: { code: 'INVALID_PAYLOAD', message: err.message },
          });
        }
      });

      socket.on('close', () => {
        this.handleDisconnect(client);
      });

      socket.on('error', (err: any) => {
        console.error('[WebSocketHub] Socket error:', err);
      });
    });

    // Heartbeat ping interval
    setInterval(() => {
      for (const [socket, client] of this.clients.entries()) {
        if (!client.isAlive) {
          socket.terminate();
          this.clients.delete(socket);
          continue;
        }
        client.isAlive = false;
        socket.ping();
      }
    }, 30000);
  }

  private async handleClientAction(client: ClientConnection, action: ClientAction): Promise<void> {
    const socket = client.socket;

    switch (action.type) {
      case 'auth': {
        const { token, user: providedUser } = action.payload;
        let authenticatedUser: User | null = null;

        if (token) {
          const payload = AuthService.verifyToken(token);
          if (payload && providedUser && providedUser.id === payload.userId) {
            authenticatedUser = providedUser as User;
          }
        }

        if (!authenticatedUser) {
          const res = await AuthService.createGuestUser(providedUser?.nickname, providedUser?.avatarUrl);
          authenticatedUser = res.user;
          this.sendEvent(socket, {
            type: 'auth:success',
            payload: { user: authenticatedUser, token: res.token },
          });
        } else {
          this.sendEvent(socket, {
            type: 'auth:success',
            payload: { user: authenticatedUser, token },
          });
        }

        client.user = authenticatedUser;
        break;
      }

      case 'room:join': {
        if (!client.user) {
          return this.sendError(socket, 'UNAUTHORIZED', '请先完成身份授权');
        }
        try {
          const room = this.roomManager.joinRoom(action.payload.roomCode, client.user);
          this.bindClientToRoom(client, room.roomId);
          this.broadcastToRoom(room.roomId, {
            type: 'room:state',
            payload: { room },
          });
        } catch (err: any) {
          this.sendError(socket, 'ROOM_JOIN_ERROR', err.message);
        }
        break;
      }

      case 'room:take_seat': {
        if (!client.user || !client.roomId) return;
        try {
          const room = this.roomManager.takeSeat(client.roomId, client.user, action.payload.seatIndex);
          this.broadcastToRoom(room.roomId, {
            type: 'room:state',
            payload: { room },
          });
        } catch (err: any) {
          this.sendError(socket, 'TAKE_SEAT_ERROR', err.message);
        }
        break;
      }

      case 'room:leave_seat': {
        if (!client.user || !client.roomId) return;
        try {
          const room = this.roomManager.leaveSeat(client.roomId, client.user.id);
          this.broadcastToRoom(room.roomId, {
            type: 'room:state',
            payload: { room },
          });
        } catch (err: any) {
          this.sendError(socket, 'LEAVE_SEAT_ERROR', err.message);
        }
        break;
      }

      case 'room:update_seat_count': {
        if (!client.user || !client.roomId) return;
        try {
          const room = this.roomManager.updateSeatCount(client.roomId, client.user.id, action.payload.seatCount);
          this.broadcastToRoom(room.roomId, {
            type: 'room:state',
            payload: { room },
          });
        } catch (err: any) {
          this.sendError(socket, 'UPDATE_SEATS_ERROR', err.message);
        }
        break;
      }

      case 'room:start_game': {
        if (!client.user || !client.roomId) return;
        try {
          const { room, seatedPlayers } = this.roomManager.startGame(client.roomId, client.user.id);
          this.broadcastToRoom(room.roomId, {
            type: 'room:state',
            payload: { room },
          });

          // Dispatch start event to Card High-Low microservice via Redis
          this.dispatchGameAction({
            action: 'start',
            roomId: room.roomId,
            players: seatedPlayers.map(p => ({
              id: p.id,
              nickname: p.nickname,
              avatarUrl: p.avatarUrl,
            })),
          });
        } catch (err: any) {
          this.sendError(socket, 'START_GAME_ERROR', err.message);
        }
        break;
      }

      case 'game:highlow:select_target': {
        if (!client.user || !client.roomId) return;
        this.dispatchGameAction({
          action: 'select_target',
          roomId: client.roomId,
          playerId: client.user.id,
          cardIndex: action.payload.cardIndex,
        });
        break;
      }

      case 'game:highlow:make_guess': {
        if (!client.user || !client.roomId) return;
        this.dispatchGameAction({
          action: 'make_guess',
          roomId: client.roomId,
          playerId: client.user.id,
          guess: action.payload.guess,
        });
        break;
      }

      case 'game:highlow:rematch': {
        if (!client.user || !client.roomId) return;
        this.dispatchGameAction({
          action: 'rematch',
          roomId: client.roomId,
          playerId: client.user.id,
        });
        break;
      }

      case 'room:leave': {
        if (client.roomId && client.user) {
          const updatedRoom = this.roomManager.leaveRoom(client.roomId, client.user.id);
          if (updatedRoom) {
            this.broadcastToRoom(updatedRoom.roomId, {
              type: 'room:state',
              payload: { room: updatedRoom },
            });
          }
          this.unbindClientFromRoom(client);
        }
        break;
      }
    }
  }

  private dispatchGameAction(eventData: any): void {
    if (this.pubClient && this.pubClient.status === 'ready') {
      this.pubClient.publish('game:highlow:actions', JSON.stringify(eventData));
    }
  }

  public bindClientToRoom(client: ClientConnection, roomId: string): void {
    this.unbindClientFromRoom(client);
    client.roomId = roomId;

    let set = this.roomSockets.get(roomId);
    if (!set) {
      set = new Set();
      this.roomSockets.set(roomId, set);
      if (this.subClient && this.subClient.status === 'ready') {
        this.subClient.subscribe(`room:broadcast:${roomId}`);
      }
    }
    set.add(client.socket);
  }

  public unbindClientFromRoom(client: ClientConnection): void {
    if (!client.roomId) return;
    const set = this.roomSockets.get(client.roomId);
    if (set) {
      set.delete(client.socket);
      if (set.size === 0) {
        this.roomSockets.delete(client.roomId);
      }
    }
    client.roomId = null;
  }

  private handleDisconnect(client: ClientConnection): void {
    if (client.roomId && client.user) {
      const room = this.roomManager.leaveRoom(client.roomId, client.user.id);
      if (room) {
        this.broadcastToRoom(room.roomId, {
          type: 'room:state',
          payload: { room },
        });
      }
    }
    this.unbindClientFromRoom(client);
    this.clients.delete(client.socket);
  }

  public broadcastToRoom(roomId: string, event: ServerEvent): void {
    const sockets = this.roomSockets.get(roomId);
    if (!sockets) return;
    const msg = JSON.stringify(event);
    for (const socket of sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(msg);
      }
    }
  }

  public sendEvent(socket: WebSocket, event: ServerEvent): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(event));
    }
  }

  public sendError(socket: WebSocket, code: string, message: string): void {
    this.sendEvent(socket, {
      type: 'room:error',
      payload: { code, message },
    });
  }
}
