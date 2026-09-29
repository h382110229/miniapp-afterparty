<template>
  <view class="game-arena">
    <!-- Top Status Bar -->
    <view class="top-nav glass-panel">
      <view class="room-pill">
        <text class="room-pill-label">房号</text>
        <text class="room-pill-val">{{ roomStore.currentRoom?.roomCode }}</text>
      </view>

      <view class="deck-counter-pill">
        <text class="deck-icon">🎴</text>
        <text class="deck-text">剩余牌数: </text>
        <text class="deck-highlight">{{ highLowStore.gameState?.deckRemainingCount ?? 46 }} / 52</text>
      </view>

      <button class="exit-btn" @tap="confirmExit">退出</button>
    </view>

    <!-- Player Seat Carousel / Roulette -->
    <SeatWheel
      :seats="roomStore.currentRoom?.seats || []"
      :currentTurnPlayerId="highLowStore.gameState?.currentTurnPlayerId"
      :myUserId="userStore.user?.id"
      :stats="highLowStore.gameState?.stats"
    />

    <!-- Main Game Table -->
    <view class="poker-table">
      <!-- Top Dealing & Guessing Area -->
      <view class="drawn-area">
        <view class="draw-pile">
          <view class="deck-stack">
            <view class="card-layer layer-3"></view>
            <view class="card-layer layer-2"></view>
            <view class="card-layer layer-1">
              <text class="pile-text">{{ highLowStore.gameState?.deckRemainingCount ?? 46 }}</text>
            </view>
          </view>
          <text class="pile-label">牌堆</text>
        </view>

        <!-- Current Target vs Drawn Unknown Card -->
        <view class="vs-zone">
          <view v-if="highLowStore.activeTargetCard" class="card-slot target-slot">
            <text class="slot-title">比对基准牌</text>
            <PokerCard :card="highLowStore.activeTargetCard" :isFlipped="true" isTarget />
          </view>

          <view class="vs-divider" v-if="highLowStore.gameState?.phase === 'guessing' || highLowStore.gameState?.drawnCard">
            <text class="vs-text">VS</text>
          </view>

          <view v-if="highLowStore.gameState?.drawnCard" class="card-slot drawn-slot">
            <text class="slot-title">摸出的暗牌</text>
            <PokerCard
              :card="highLowStore.gameState.drawnCard"
              :isFlipped="highLowStore.gameState.drawnCardRevealed"
              :isBoundary="highLowStore.gameState.drawnCard.rank === 1 || highLowStore.gameState.drawnCard.rank === 13"
            />
          </view>
        </view>
      </view>

      <!-- Public 6 Cards Grid -->
      <view class="public-area glass-panel">
        <view class="public-header">
          <text class="public-title">公共牌区域 (共 6 张)</text>
          <text class="hint-text" v-if="highLowStore.isMyTurn && highLowStore.gameState?.phase === 'selecting_target'">
            👉 请选择 1 张公共牌作为基准
          </text>
        </view>

        <view class="cards-grid">
          <view
            v-for="(card, idx) in highLowStore.gameState?.publicCards || []"
            :key="idx"
            class="card-cell"
            :class="{
              'is-selectable': highLowStore.isMyTurn && highLowStore.gameState?.phase === 'selecting_target',
              'is-active-target': highLowStore.gameState?.activeTargetIndex === idx
            }"
            @tap="onSelectPublicCard(idx)"
          >
            <PokerCard
              v-if="card"
              :card="card"
              :isFlipped="true"
              :isSelected="highLowStore.gameState?.activeTargetIndex === idx"
            />
            <view v-else class="empty-card-placeholder">
              <text class="placeholder-text">空位</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Controls & Turn Guidance -->
      <view class="controls-panel">
        <template v-if="highLowStore.isMyTurn">
          <view v-if="highLowStore.gameState?.phase === 'selecting_target'" class="turn-prompt-banner neon-glow-emerald">
            <text class="prompt-icon">🎯</text>
            <text class="prompt-text">轮到你行动！请从上方公共牌中选 1 张比大小</text>
          </view>

          <view v-else-if="highLowStore.gameState?.phase === 'guessing'" class="guess-actions">
            <button class="btn-primary guess-btn guess-high" @tap="submitGuess('high')">
              <text class="arrow-icon">▲</text>
              <text class="guess-label">猜更 大 (HIGH)</text>
            </button>
            <button class="btn-danger guess-btn guess-low" @tap="submitGuess('low')">
              <text class="arrow-icon">▼</text>
              <text class="guess-label">猜更 小 (LOW)</text>
            </button>
          </view>
        </template>

        <template v-else>
          <view class="other-turn-box glass-panel">
            <text class="pulsing-dot">●</text>
            <text class="other-turn-text">
              等待【{{ currentTurnNickname }}】比大小中，准备观战罚酒...
            </text>
          </view>
        </template>
      </view>
    </view>

    <!-- Action Outcome Toast Alert Modal -->
    <view v-if="showResultModal" class="result-modal-mask" @tap="closeResultModal">
      <view
        class="result-card glass-panel"
        :class="{
          'neon-glow-gold': lastResult?.outcome === 'bonus_turn',
          'neon-glow-magenta': lastResult?.outcome === 'wrong' || lastResult?.outcome === 'tie',
          'neon-glow-emerald': lastResult?.outcome === 'correct'
        }"
      >
        <view class="result-icon-box">
          <text v-if="lastResult?.outcome === 'bonus_turn'" class="huge-icon">⚡</text>
          <text v-else-if="lastResult?.drinksPenalty" class="huge-icon">🍺</text>
          <text v-else class="huge-icon">🎉</text>
        </view>
        <text class="result-title">{{ resultTitle }}</text>
        <text class="result-desc">{{ lastResult?.message }}</text>
        <button class="btn-primary confirm-btn" @tap="closeResultModal">确认并继续</button>
      </view>
    </view>

    <!-- Game Over Summary Modal -->
    <view v-if="highLowStore.gameState?.phase === 'game_over'" class="result-modal-mask">
      <view class="gameover-card glass-panel neon-glow-gold">
        <text class="gameover-title">🏆 扑克牌全部抽尽 · 酒局结算</text>
        <view class="mvp-box">
          <text class="mvp-tag">👑 本局酒王 (罚酒最多)</text>
          <text class="mvp-name">{{ mvpNickname }}</text>
        </view>

        <view class="stats-list">
          <view class="stats-item" v-for="stat in highLowStore.gameState?.stats" :key="stat.userId">
            <image class="stat-avatar" :src="stat.avatarUrl" />
            <text class="stat-name">{{ stat.nickname }}</text>
            <text class="stat-drinks">喝了 {{ stat.drinksCount }} 杯 🍺</text>
            <text class="stat-wins">猜对 {{ stat.correctGuesses }} 次</text>
          </view>
        </view>

        <button v-if="roomStore.isHost" class="btn-primary rematch-btn" @tap="startRematch">
          再来一局 (重新洗牌)
        </button>
        <view v-else class="waiting-rematch">
          <text class="wait-text">等待房主重新开局...</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useRoomStore } from '../../stores/room';
import { useUserStore } from '../../stores/user';
import { useHighLowStore } from '../../stores/highlow';
import { socketService } from '../../utils/socket';
import { ActionResult } from '@afterparty/shared-types';
import PokerCard from '../../components/PokerCard.vue';
import SeatWheel from '../../components/SeatWheel.vue';

const roomStore = useRoomStore();
const userStore = useUserStore();
const highLowStore = useHighLowStore();

const showResultModal = ref(false);
const lastResult = ref<ActionResult | null>(null);

onLoad((query) => {
  socketService.connect();

  socketService.on((event) => {
    if (event.type === 'game:state') {
      highLowStore.setGameState(event.payload.gameState);
    } else if (event.type === 'game:animation') {
      if (event.payload.data) {
        lastResult.value = event.payload.data;
        showResultModal.value = true;
      }
    } else if (event.type === 'room:state') {
      roomStore.setRoom(event.payload.room);
    }
  });
});

const currentTurnNickname = computed(() => {
  const currentId = highLowStore.gameState?.currentTurnPlayerId;
  if (!currentId || !highLowStore.gameState?.stats) return '玩家';
  return highLowStore.gameState.stats[currentId]?.nickname || '玩家';
});

const mvpNickname = computed(() => {
  const mvpId = highLowStore.gameState?.mvpDrinkerId;
  if (!mvpId || !highLowStore.gameState?.stats) return '全员酒仙';
  return highLowStore.gameState.stats[mvpId]?.nickname || '全员酒仙';
});

const resultTitle = computed(() => {
  if (!lastResult.value) return '';
  switch (lastResult.value.outcome) {
    case 'bonus_turn': return '⚡ 暴击连击！';
    case 'tie': return '🍻 平局即输！罚酒！';
    case 'wrong': return '🍺 猜错了！罚酒！';
    case 'correct': return '🎉 猜对了！顺利交棒！';
    default: return '';
  }
});

function onSelectPublicCard(idx: number) {
  if (!highLowStore.isMyTurn || highLowStore.gameState?.phase !== 'selecting_target') return;
  highLowStore.selectTarget(idx);
}

function submitGuess(guess: 'high' | 'low') {
  if (!highLowStore.isMyTurn || highLowStore.gameState?.phase !== 'guessing') return;
  highLowStore.makeGuess(guess);
}

function closeResultModal() {
  showResultModal.value = false;
}

function startRematch() {
  highLowStore.requestRematch();
}

function confirmExit() {
  uni.showModal({
    title: '确认退出',
    content: '确定要离开牌桌返回大厅吗？',
    success: (res) => {
      if (res.confirm) {
        roomStore.leaveRoom();
        uni.reLaunch({ url: '/pages/index/index' });
      }
    },
  });
}
</script>

<style scoped>
.game-arena {
  padding: 12px 10px 40px;
  min-height: 100vh;
  box-sizing: border-box;
}

.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  margin-bottom: 8px;
}

.room-pill, .deck-counter-pill {
  display: flex;
  align-items: center;
  gap: 6px;
}

.room-pill-label, .deck-text {
  font-size: 11px;
  color: #94A3B8;
}

.room-pill-val {
  font-size: 14px;
  font-weight: 800;
  color: #00F5A0;
}

.deck-icon {
  font-size: 14px;
}

.deck-highlight {
  font-size: 13px;
  font-weight: 700;
  color: #00E5FF;
}

.exit-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #94A3B8;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 8px;
  border: none;
  line-height: 1.5;
}

/* Table Area */
.poker-table {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 6px;
}

.drawn-area {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 10px;
  background: radial-gradient(circle, rgba(0, 245, 160, 0.05) 0%, transparent 70%);
}

.draw-pile {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.deck-stack {
  position: relative;
  width: 60px;
  height: 84px;
}

.card-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  border: 1px solid #00F5A0;
  background: #131B2E;
}

.layer-3 { top: -4px; left: -4px; opacity: 0.4; }
.layer-2 { top: -2px; left: -2px; opacity: 0.7; }
.layer-1 {
  top: 0; left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.pile-text {
  font-size: 18px;
  font-weight: 900;
  color: #00F5A0;
}

.pile-label {
  font-size: 11px;
  color: #94A3B8;
  margin-top: 4px;
}

.vs-zone {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.slot-title {
  font-size: 10px;
  color: #00E5FF;
  font-weight: 700;
}

.vs-text {
  font-size: 18px;
  font-weight: 900;
  color: #FF007F;
  text-shadow: 0 0 10px rgba(255, 0, 127, 0.6);
}

/* Public Area */
.public-area {
  padding: 14px;
}

.public-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.public-title {
  font-size: 13px;
  font-weight: 700;
  color: #FFFFFF;
}

.hint-text {
  font-size: 11px;
  color: #00F5A0;
  animation: blink 1.2s infinite;
}

@keyframes blink {
  0% { opacity: 0.4; }
  100% { opacity: 1; }
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  justify-items: center;
}

.card-cell {
  position: relative;
  transition: transform 0.2s ease;
}

.card-cell.is-selectable {
  cursor: pointer;
}

.card-cell.is-selectable:active {
  transform: scale(0.95);
}

.empty-card-placeholder {
  width: 90px;
  height: 126px;
  border-radius: 12px;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
}

/* Controls */
.controls-panel {
  margin-top: 10px;
}

.turn-prompt-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: rgba(0, 245, 160, 0.1);
  border-radius: 14px;
}

.prompt-icon {
  font-size: 18px;
}

.prompt-text {
  font-size: 13px;
  font-weight: 700;
  color: #00F5A0;
}

.guess-actions {
  display: flex;
  gap: 14px;
}

.guess-btn {
  flex: 1;
  height: 54px;
  border-radius: 16px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.arrow-icon {
  font-size: 16px;
}

.guess-label {
  font-size: 15px;
  font-weight: 800;
}

.other-turn-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
}

.pulsing-dot {
  color: #00E5FF;
  animation: pulse-dot 1s infinite alternate;
}

@keyframes pulse-dot {
  0% { opacity: 0.2; }
  100% { opacity: 1; }
}

.other-turn-text {
  font-size: 12px;
  color: #94A3B8;
}

/* Modals */
.result-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.result-card, .gameover-card {
  width: 85%;
  max-width: 360px;
  padding: 24px;
  text-align: center;
  border-radius: 24px;
}

.result-icon-box {
  margin-bottom: 12px;
}

.huge-icon {
  font-size: 48px;
}

.result-title {
  font-size: 20px;
  font-weight: 800;
  color: #FFFFFF;
  display: block;
}

.result-desc {
  font-size: 14px;
  color: #CBD5E1;
  margin: 12px 0 20px;
  line-height: 1.5;
  display: block;
}

.confirm-btn, .rematch-btn {
  height: 46px;
}

.gameover-title {
  font-size: 18px;
  font-weight: 800;
  color: #FFB400;
  display: block;
}

.mvp-box {
  margin: 16px 0;
  background: rgba(255, 180, 0, 0.1);
  padding: 10px;
  border-radius: 12px;
}

.mvp-tag {
  font-size: 11px;
  color: #FFB400;
  display: block;
}

.mvp-name {
  font-size: 20px;
  font-weight: 800;
  color: #FFFFFF;
  margin-top: 4px;
  display: block;
}

.stats-list {
  max-height: 160px;
  overflow-y: auto;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stats-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
}

.stat-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}

.stat-name {
  font-size: 12px;
  color: #FFFFFF;
  flex: 1;
  text-align: left;
  margin-left: 8px;
}

.stat-drinks {
  font-size: 12px;
  color: #FF007F;
  font-weight: 700;
}

.stat-wins {
  font-size: 11px;
  color: #00F5A0;
  margin-left: 6px;
}

.waiting-rematch {
  font-size: 13px;
  color: #94A3B8;
  margin-top: 12px;
}
</style>
