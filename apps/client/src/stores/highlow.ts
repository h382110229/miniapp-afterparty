import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { CardHighLowState, GuessType } from '@afterparty/shared-types';
import { socketService } from '../utils/socket';
import { useUserStore } from './user';

export const useHighLowStore = defineStore('highlow', () => {
  const gameState = ref<CardHighLowState | null>(null);
  const userStore = useUserStore();

  const isMyTurn = computed(() => {
    if (!gameState.value || !userStore.user) return false;
    return gameState.value.currentTurnPlayerId === userStore.user.id;
  });

  const activeTargetCard = computed(() => {
    if (!gameState.value || gameState.value.activeTargetIndex === null) return null;
    return gameState.value.publicCards[gameState.value.activeTargetIndex] || null;
  });

  function setGameState(state: CardHighLowState) {
    gameState.value = state;
  }

  function selectTarget(cardIndex: number) {
    if (!isMyTurn.value) return;
    socketService.send({
      type: 'game:highlow:select_target',
      payload: { cardIndex },
    });
  }

  function makeGuess(guess: GuessType) {
    if (!isMyTurn.value) return;
    socketService.send({
      type: 'game:highlow:make_guess',
      payload: { guess },
    });
  }

  function requestRematch() {
    socketService.send({
      type: 'game:highlow:rematch',
    });
  }

  return {
    gameState,
    isMyTurn,
    activeTargetCard,
    setGameState,
    selectTarget,
    makeGuess,
    requestRematch,
  };
});
