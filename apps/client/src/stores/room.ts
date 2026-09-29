import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { Room, Seat } from '@afterparty/shared-types';
import { socketService } from '../utils/socket';
import { useUserStore } from './user';

export const useRoomStore = defineStore('room', () => {
  const currentRoom = ref<Room | null>(null);
  const userStore = useUserStore();

  const isHost = computed(() => {
    if (!currentRoom.value || !userStore.user) return false;
    return currentRoom.value.hostId === userStore.user.id;
  });

  const mySeat = computed(() => {
    if (!currentRoom.value || !userStore.user) return null;
    return currentRoom.value.seats.find(s => s.user?.id === userStore.user?.id) || null;
  });

  const isSeated = computed(() => mySeat.value !== null);

  function setRoom(room: Room) {
    currentRoom.value = room;
  }

  function joinRoom(roomCode: string) {
    if (!userStore.user) return;
    socketService.send({
      type: 'auth',
      payload: { token: userStore.token, user: userStore.user },
    });
    socketService.send({
      type: 'room:join',
      payload: { roomCode },
    });
  }

  function takeSeat(seatIndex: number) {
    socketService.send({
      type: 'room:take_seat',
      payload: { seatIndex },
    });
  }

  function leaveSeat() {
    socketService.send({
      type: 'room:leave_seat',
    });
  }

  function updateSeatCount(count: number) {
    socketService.send({
      type: 'room:update_seat_count',
      payload: { seatCount: count },
    });
  }

  function startGame() {
    socketService.send({
      type: 'room:start_game',
    });
  }

  function leaveRoom() {
    socketService.send({
      type: 'room:leave',
    });
    currentRoom.value = null;
  }

  return {
    currentRoom,
    isHost,
    mySeat,
    isSeated,
    setRoom,
    joinRoom,
    takeSeat,
    leaveSeat,
    updateSeatCount,
    startGame,
    leaveRoom,
  };
});
