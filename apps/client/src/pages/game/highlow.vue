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

    <!-- Main 3D Luxury Casino Poker Table -->
    <view class="casino-poker-table">
      <view class="table-armrest-rim">
        <view class="table-emerald-felt">
          <!-- Subtle Gold Watermark Betting Boundary Line -->
          <view class="table-stitch-decor"></view>

          <!-- Dealing & VS Duel Stage -->
          <view class="dealing-stage">
            <!-- 3D Card Deck Stack -->
            <view class="deck-3d-stack">
              <view class="deck-layers">
                <view class="deck-layer layer-deep"></view>
                <view class="deck-layer layer-mid"></view>
                <view class="deck-layer layer-top">
                  <view class="deck-top-pattern">
                    <text class="deck-crown-icon">⚜</text>
                    <text class="deck-count-num">{{ highLowStore.gameState?.deckRemainingCount ?? 46 }}</text>
                    <text class="deck-sub-text">REMAINING</text>
                  </view>
                </view>
              </view>
              <text class="deck-label">牌堆 (52张)</text>
            </view>

            <!-- VS Duel Arena: Target Card vs Drawn Secret Card -->
            <view class="vs-arena">
              <!-- Target Slot (基准牌) -->
              <view class="felt-slot target-slot">
                <view class="slot-badge">
                  <text class="slot-badge-text">比对基准牌</text>
                </view>
                <PokerCard 
                  v-if="highLowStore.activeTargetCard" 
                  :card="highLowStore.activeTargetCard" 
                  :isFlipped="true" 
                  isTarget 
                />
                <view v-else class="empty-felt-placeholder">
                  <text class="placeholder-icon">🎯</text>
                  <text class="placeholder-text">待选公共牌</text>
                </view>
              </view>

              <!-- VS Metallic Bevel Medallion -->
              <view class="vs-medallion-box">
                <view class="vs-medallion" :class="{ 'is-dueling': highLowStore.gameState?.phase === 'guessing' }">
                  <text class="vs-title">VS</text>
                </view>
              </view>

              <!-- Drawn Card Slot (摸出的暗牌) -->
              <view class="felt-slot drawn-slot">
                <view class="slot-badge">
                  <text class="slot-badge-text">摸出暗牌</text>
                </view>
                <view
                  v-if="highLowStore.gameState?.drawnCard || revealedDrawnCard"
                  class="drawn-anim-wrapper"
                  :class="{
                    'animate-flip-reveal': isRevealing,
                    'animate-fly-to-cover': isCovering
                  }"
                >
                  <PokerCard
                    :card="revealedDrawnCard || highLowStore.gameState?.drawnCard"
                    :isFlipped="isRevealing || isCovering || highLowStore.gameState?.drawnCardRevealed"
                    :isBoundary="(revealedDrawnCard || highLowStore.gameState?.drawnCard)?.rank === 1 || (revealedDrawnCard || highLowStore.gameState?.drawnCard)?.rank === 13"
                  />
                </view>
                <view v-else class="empty-felt-placeholder">
                  <text class="placeholder-icon">🎴</text>
                  <text class="placeholder-text">待摸暗牌</text>
                </view>
              </view>
            </view>
          </view>

          <!-- Public 6 Cards Board Section -->
          <view class="public-board-section">
            <view class="board-header">
              <view class="title-with-pill">
                <text class="board-title">♠ 公共牌展示区 (共 6 张) ♥</text>
              </view>
              <view class="turn-hint-tag" v-if="highLowStore.isMyTurn && highLowStore.gameState?.phase === 'selecting_target'">
                <text class="hint-blink">👉 请点选 1 张作为基准</text>
              </view>
            </view>

            <view class="public-cards-grid">
              <view
                v-for="(card, idx) in highLowStore.gameState?.publicCards || []"
                :key="card ? `${card.suit}_${card.rank}_${idx}` : `slot_${idx}`"
                class="card-cell-wrapper"
                :class="{
                  'is-selectable': highLowStore.isMyTurn && highLowStore.gameState?.phase === 'selecting_target',
                  'is-active-target': highLowStore.gameState?.activeTargetIndex === idx,
                  'is-being-covered': isCovering && coveringTargetIndex === idx
                }"
                @tap="onSelectPublicCard(idx)"
              >
                <view class="recessed-pocket">
                  <PokerCard
                    v-if="card"
                    :card="card"
                    :isFlipped="true"
                  />
                  <view v-else class="empty-pocket-placeholder">
                    <text class="pocket-text">空位</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- Bottom Controls & Turn Guidance -->
      <view class="controls-panel">
        <template v-if="highLowStore.isMyTurn">
          <view v-if="highLowStore.gameState?.phase === 'selecting_target'" class="turn-prompt-banner neon-glow-emerald">
            <text class="prompt-icon">🎯</text>
            <text class="prompt-text">轮到你行动！请从上方公共牌中点选 1 张作为比对基准</text>
          </view>

          <view v-else-if="highLowStore.gameState?.phase === 'guessing'" class="guess-actions">
            <button class="guess-btn guess-high" hover-class="btn-hover-high" @tap="submitGuess('high')">
              <text class="arrow-icon">▲</text>
              <view class="btn-text-col">
                <text class="guess-label">猜更 大</text>
                <text class="guess-sub">HIGH (A~K)</text>
              </view>
            </button>
            <button class="guess-btn guess-low" hover-class="btn-hover-low" @tap="submitGuess('low')">
              <text class="arrow-icon">▼</text>
              <view class="btn-text-col">
                <text class="guess-label">猜更 小</text>
                <text class="guess-sub">LOW (A~K)</text>
              </view>
            </button>
          </view>
        </template>

        <template v-else>
          <view class="other-turn-box glass-panel">
            <text class="pulsing-dot">●</text>
            <text class="other-turn-text">
              等待【{{ currentTurnNickname }}】比对暗牌中 · 准备观战罚酒...
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
import { cardAudio } from '../../utils/cardAudio';

const roomStore = useRoomStore();
const userStore = useUserStore();
const highLowStore = useHighLowStore();

const showResultModal = ref(false);
const lastResult = ref<ActionResult | null>(null);

// Staged Animation States
const isRevealing = ref(false);       // Whether the drawn card is flipping
const isCovering = ref(false);        // Whether the revealed card is flying to cover the public card
const coveringTargetIndex = ref<number | null>(null);
const revealedDrawnCard = ref<any>(null);

onLoad((query) => {
  socketService.connect();

  socketService.on((event) => {
    if (event.type === 'game:state') {
      // If we are currently playing the reveal animation sequence, defer state override
      if (isRevealing.value || isCovering.value) {
        setTimeout(() => {
          highLowStore.setGameState(event.payload.gameState);
        }, 1800);
      } else {
        highLowStore.setGameState(event.payload.gameState);
      }
    } else if (event.type === 'game:animation') {
      if (event.payload.data) {
        const animData = event.payload.data as ActionResult;
        lastResult.value = animData;
        revealedDrawnCard.value = animData.drawnCard;
        coveringTargetIndex.value = highLowStore.gameState?.activeTargetIndex ?? null;

        // Stage 1: Flip & Reveal the drawn card with 3D animation (0ms ~ 800ms)
        isRevealing.value = true;
        isCovering.value = false;
        showResultModal.value = false;
        cardAudio.playFlip();
        try {
          uni.vibrateShort({ success: () => {}, fail: () => {} });
        } catch (e) {}

        // Stage 2: Card flies & covers the target public card (800ms ~ 1500ms)
        setTimeout(() => {
          isCovering.value = true;
          cardAudio.playDraw();
        }, 800);

        // Stage 3: Show outcome modal after visual animation finishes (1600ms)
        setTimeout(() => {
          isRevealing.value = false;
          isCovering.value = false;
          showResultModal.value = true;

          if (animData.outcome === 'bonus_turn') {
            cardAudio.playBonus();
            try {
              uni.vibrateLong({ success: () => {}, fail: () => {} });
            } catch (e) {}
          } else if (animData.outcome === 'wrong' || animData.outcome === 'tie') {
            cardAudio.playPenalty();
            try {
              uni.vibrateLong({ success: () => {}, fail: () => {} });
            } catch (e) {}
          }
        }, 1600);
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
  if (highLowStore.gameState?.activeTargetIndex === idx) return; // Prevent duplicate selection jitter
  
  cardAudio.playDraw();
  try {
    uni.vibrateShort({ success: () => {}, fail: () => {} });
  } catch (e) {}

  highLowStore.selectTarget(idx);
}

function submitGuess(guess: 'high' | 'low') {
  if (!highLowStore.isMyTurn || highLowStore.gameState?.phase !== 'guessing') return;
  
  try {
    uni.vibrateShort({ success: () => {}, fail: () => {} });
  } catch (e) {}

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
  padding: 10px 10px 36px;
  min-height: 100vh;
  box-sizing: border-box;
}

/* ================= Top Nav ================= */
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
  color: #FFDF73;
}

.exit-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #94A3B8;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  line-height: 1.5;
}

/* ================= 3D Casino Poker Table ================= */
.casino-poker-table {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 4px;
}

/* Outer Walnut & Leather Padded Armrest Bezel */
.table-armrest-rim {
  width: 100%;
  border-radius: 26px;
  background: linear-gradient(180deg, #422D16 0%, #1F1409 45%, #0D0803 100%);
  border: 3.5px solid #C5A059;
  box-shadow: 
    0 22px 48px rgba(0, 0, 0, 0.95),
    0 4px 10px rgba(0, 0, 0, 0.8),
    inset 0 2px 4px rgba(255, 230, 150, 0.55),
    inset 0 -4px 8px rgba(0, 0, 0, 0.85);
  padding: 7px;
  box-sizing: border-box;
}

/* Monte Carlo Casino Emerald Velvet Surface */
.table-emerald-felt {
  width: 100%;
  border-radius: 20px;
  background: radial-gradient(ellipse at 50% 30%, #0A533E 0%, #043023 60%, #011812 100%);
  box-shadow: 
    inset 0 10px 24px rgba(0, 0, 0, 0.92),
    inset 0 0 16px rgba(0, 245, 160, 0.12);
  border: 1px solid rgba(0, 245, 160, 0.3);
  padding: 12px 10px;
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Dashed Gold Watermark Betting Boundary Line */
.table-stitch-decor {
  position: absolute;
  top: 6px;
  left: 6px;
  right: 6px;
  bottom: 6px;
  border-radius: 16px;
  border: 1px dashed rgba(212, 175, 55, 0.28);
  pointer-events: none;
}

/* ================= Dealing & VS Stage ================= */
.dealing-stage {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px 8px;
  border-bottom: 1px solid rgba(212, 175, 55, 0.15);
  position: relative;
  z-index: 2;
}

/* 3D Stack of Cards in the Dealing Pile */
.deck-3d-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.deck-layers {
  position: relative;
  width: 62px;
  height: 88px;
}

.deck-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  box-sizing: border-box;
}

.layer-deep {
  top: -4px;
  left: -4px;
  background: #0A0E18;
  border: 1px solid rgba(212, 175, 55, 0.3);
  opacity: 0.5;
}

.layer-mid {
  top: -2px;
  left: -2px;
  background: #141B2B;
  border: 1px solid rgba(212, 175, 55, 0.5);
  opacity: 0.8;
}

.layer-top {
  top: 0;
  left: 0;
  background: linear-gradient(145deg, #182030 0%, #0C1019 100%);
  border: 1.5px solid #FFDF73;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
}

.deck-top-pattern {
  width: 90%;
  height: 90%;
  border-radius: 5px;
  border: 1px solid rgba(212, 175, 55, 0.45);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle, rgba(25, 34, 52, 0.9) 0%, rgba(9, 13, 20, 0.95) 100%);
}

.deck-crown-icon {
  font-size: 11px;
  color: #FFDF73;
}

.deck-count-num {
  font-size: 17px;
  font-weight: 900;
  color: #FFDF73;
  line-height: 1.1;
  text-shadow: 0 0 8px rgba(255, 223, 115, 0.6);
}

.deck-sub-text {
  font-size: 6px;
  font-weight: 700;
  color: #CAA132;
  letter-spacing: 0.5px;
}

.deck-label {
  font-size: 10px;
  color: #CBD5E0;
  font-weight: 600;
}

/* VS Arena */
.vs-arena {
  display: flex;
  align-items: center;
  gap: 8px;
}

.felt-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.slot-badge {
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(212, 175, 55, 0.35);
}

.slot-badge-text {
  font-size: 9px;
  font-weight: 700;
  color: #FFDF73;
  letter-spacing: 0.5px;
}

.empty-felt-placeholder {
  width: 86px;
  height: 122px;
  border-radius: 9px;
  border: 1.5px dashed rgba(212, 175, 55, 0.4);
  background: rgba(0, 20, 15, 0.45);
  box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.placeholder-icon {
  font-size: 22px;
  opacity: 0.7;
}

.placeholder-text {
  font-size: 11px;
  color: rgba(255, 223, 115, 0.6);
  font-weight: 600;
}

/* VS Medallion */
.vs-medallion-box {
  display: flex;
  align-items: center;
  justify-content: center;
}

.vs-medallion {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFDF73 0%, #D4AF37 50%, #8A6818 100%);
  border: 2px solid #FFF0A8;
  box-shadow: 
    0 6px 14px rgba(0, 0, 0, 0.85),
    0 0 10px rgba(212, 175, 55, 0.4),
    inset 0 1px 2px rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.vs-medallion.is-dueling {
  animation: pulse-vs-glow 1.4s infinite alternate;
}

@keyframes pulse-vs-glow {
  0% {
    transform: scale(1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.8), 0 0 8px rgba(255, 223, 115, 0.5);
  }
  100% {
    transform: scale(1.12);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.9), 0 0 20px rgba(255, 215, 0, 0.95);
  }
}

.vs-title {
  font-size: 14px;
  font-weight: 900;
  font-family: 'Arial Black', sans-serif;
  color: #1A1204;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
}

/* ================= Public 6 Cards Board ================= */
.public-board-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  z-index: 2;
}

.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px;
}

.board-title {
  font-size: 12px;
  font-weight: 700;
  color: #FFDF73;
  letter-spacing: 0.5px;
}

.turn-hint-tag {
  padding: 3px 10px;
  border-radius: 12px;
  background: rgba(0, 245, 160, 0.2);
  border: 1px solid rgba(0, 245, 160, 0.5);
  box-shadow: 0 0 10px rgba(0, 245, 160, 0.3);
}

.hint-blink {
  font-size: 11px;
  font-weight: 800;
  color: #00F5A0;
  animation: blink-soft 1.2s infinite;
}

@keyframes blink-soft {
  0% { opacity: 0.5; }
  100% { opacity: 1; }
}

.public-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 9px;
  justify-items: center;
}

.card-cell-wrapper {
  position: relative;
  border-radius: 10px;
  transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
  will-change: transform;
}

.recessed-pocket {
  position: relative;
  border-radius: 9px;
}

.empty-pocket-placeholder {
  width: 86px;
  height: 122px;
  border-radius: 9px;
  border: 1px dashed rgba(212, 175, 55, 0.2);
  background: rgba(0, 20, 15, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pocket-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.2);
}

.card-cell-wrapper.is-selectable {
  cursor: pointer;
  animation: table-card-hover 2s ease-in-out infinite alternate;
}

@keyframes table-card-hover {
  0% { transform: translateY(0); }
  100% { transform: translateY(-4px); }
}

.card-cell-wrapper.is-selectable:active {
  transform: scale(0.95) !important;
}

.card-cell-wrapper.is-active-target {
  animation: none !important;
  transform: translateY(-8px) scale(1.04);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.95);
  filter: drop-shadow(0 0 16px rgba(255, 215, 0, 0.9));
  z-index: 10;
}

.card-cell-wrapper.is-being-covered {
  animation: target-covered-burst 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  z-index: 20;
}

@keyframes target-covered-burst {
  0% {
    transform: scale(1);
    filter: brightness(1);
  }
  50% {
    transform: scale(1.15) translateY(-8px);
    filter: brightness(1.5) drop-shadow(0 0 24px #FFDF73);
  }
  100% {
    transform: scale(1);
    filter: brightness(1);
  }
}

/* ================= Drawn Card Animation Wrapper ================= */
.drawn-anim-wrapper {
  position: relative;
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.animate-flip-reveal {
  animation: flip-dramatic 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes flip-dramatic {
  0% {
    transform: scale(0.9) rotateY(180deg);
    filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.2));
  }
  50% {
    transform: scale(1.16) rotateY(90deg);
    filter: drop-shadow(0 0 28px rgba(255, 215, 0, 0.95));
  }
  100% {
    transform: scale(1.04) rotateY(0deg);
    filter: drop-shadow(0 0 20px rgba(0, 245, 160, 0.85));
  }
}

.animate-fly-to-cover {
  animation: fly-cover 0.7s cubic-bezier(0.25, 1, 0.5, 1) forwards;
}

@keyframes fly-cover {
  0% {
    transform: scale(1.04) translateY(0);
    opacity: 1;
  }
  60% {
    transform: scale(1.1) translateY(45px);
    opacity: 0.92;
  }
  100% {
    transform: scale(0.96) translateY(85px);
    opacity: 0;
  }
}

/* ================= Bottom Controls Section ================= */
.controls-panel {
  margin-top: 6px;
  min-height: 58px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.turn-prompt-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 14px;
  background: rgba(6, 78, 59, 0.45);
  border: 1px solid rgba(0, 245, 160, 0.5);
  border-radius: 16px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6), 0 0 12px rgba(0, 245, 160, 0.2);
}

.prompt-icon {
  font-size: 16px;
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
  height: 56px;
  border-radius: 16px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 2px solid rgba(255, 223, 115, 0.7);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.7);
  transition: transform 0.15s ease, filter 0.15s ease;
}

.guess-high {
  background: linear-gradient(180deg, #10B981 0%, #059669 50%, #047857 100%);
  border-color: #A7F3D0;
  box-shadow: 0 8px 20px rgba(5, 150, 105, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.6);
}

.guess-low {
  background: linear-gradient(180deg, #F43F5E 0%, #E11D48 50%, #BE123C 100%);
  border-color: #FECDD3;
  box-shadow: 0 8px 20px rgba(225, 29, 72, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.6);
}

.btn-hover-high {
  transform: scale(0.97);
  filter: brightness(1.15);
}

.btn-hover-low {
  transform: scale(0.97);
  filter: brightness(1.15);
}

.arrow-icon {
  font-size: 18px;
  color: #FFFFFF;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.btn-text-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.1;
}

.guess-label {
  font-size: 15px;
  font-weight: 900;
  color: #FFFFFF;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
}

.guess-sub {
  font-size: 9px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 0.5px;
}

.other-turn-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 14px;
}

.pulsing-dot {
  color: #FFDF73;
  animation: pulse-dot 1s infinite alternate;
}

@keyframes pulse-dot {
  0% { opacity: 0.2; }
  100% { opacity: 1; }
}

.other-turn-text {
  font-size: 12px;
  color: #CBD5E0;
  font-weight: 600;
}

/* ================= Modals ================= */
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
