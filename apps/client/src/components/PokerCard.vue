<template>
  <view 
    class="poker-card-container" 
    :class="{ 
      'is-flipped': isFlipped,
      'is-selected': isSelected,
      'is-target': isTarget,
      'is-boundary': isBoundary,
      'is-dealing': isDealing
    }"
    @tap="$emit('click')"
  >
    <view class="card-inner">
      <!-- Card Front (Rank & Suit - Ivory Luxury Paper) -->
      <view class="card-face card-front" :class="[suitClass, { 'is-court': isCourtCard, 'is-ace': card?.rank === 1 }]">
        <view class="front-inner-frame">
          <view class="corner top-left">
            <text class="rank">{{ displayRank }}</text>
            <text class="suit-icon">{{ suitSymbol }}</text>
          </view>

          <view class="center-emblem">
            <view v-if="card?.rank === 1" class="ace-ornament">
              <text class="ace-crown">♠</text>
            </view>
            <view v-else-if="isCourtCard" class="court-ornament">
              <text class="court-glyph">{{ card?.rank === 13 ? '♔' : (card?.rank === 12 ? '♕' : '♘') }}</text>
            </view>
            <text class="large-suit">{{ suitSymbol }}</text>
          </view>

          <view class="corner bottom-right">
            <text class="rank">{{ displayRank }}</text>
            <text class="suit-icon">{{ suitSymbol }}</text>
          </view>
        </view>
        
        <!-- Subtle Holographic Foil Stripe -->
        <view class="hologram-overlay"></view>
      </view>

      <!-- Card Back (Stitch Luxury Obsidian & Champagne Gold Filigree) -->
      <view class="card-face card-back">
        <view class="back-outer-border">
          <view class="back-inner-frame">
            <view class="back-corner-accent c-tl">✦</view>
            <view class="back-corner-accent c-tr">✦</view>
            <view class="back-corner-accent c-bl">✦</view>
            <view class="back-corner-accent c-br">✦</view>
            <view class="back-pattern-mesh">
              <view class="back-crest-medallion">
                <text class="crest-crown">⚜</text>
                <text class="crest-text">AFTERPARTY</text>
                <view class="crest-divider"></view>
                <text class="crest-sub">ROYAL CLUB</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Card } from '@afterparty/shared-types';

const props = withDefaults(
  defineProps<{
    card?: Card | null;
    isFlipped?: boolean; // false = back, true = front
    isSelected?: boolean;
    isTarget?: boolean;
    isBoundary?: boolean;
    isDealing?: boolean;
  }>(),
  {
    card: null,
    isFlipped: true,
    isSelected: false,
    isTarget: false,
    isBoundary: false,
    isDealing: false,
  }
);

defineEmits<{
  (e: 'click'): void;
}>();

const suitSymbol = computed(() => {
  if (!props.card) return '';
  switch (props.card.suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
    default: return '';
  }
});

const suitClass = computed(() => {
  if (!props.card) return '';
  return props.card.suit === 'hearts' || props.card.suit === 'diamonds' ? 'red-suit' : 'black-suit';
});

const displayRank = computed(() => {
  if (!props.card) return '';
  const r = props.card.rank;
  if (r === 1) return 'A';
  if (r === 11) return 'J';
  if (r === 12) return 'Q';
  if (r === 13) return 'K';
  return r.toString();
});

const isCourtCard = computed(() => {
  if (!props.card) return false;
  return props.card.rank === 11 || props.card.rank === 12 || props.card.rank === 13;
});
</script>

<style scoped>
.poker-card-container {
  width: 86px;
  height: 122px;
  perspective: 1000px;
  cursor: pointer;
  user-select: none;
  transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
  position: relative;
}

.poker-card-container:active {
  transform: scale(0.96);
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  transition: transform 0.65s cubic-bezier(0.25, 1, 0.35, 1);
  transform-style: preserve-3d;
  border-radius: 9px;
}

.is-flipped .card-inner {
  transform: rotateY(0deg);
}

.poker-card-container:not(.is-flipped) .card-inner {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  width: 100%;
  height: 100%;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  border-radius: 9px;
  overflow: hidden;
  box-shadow: 
    0 10px 22px rgba(0, 0, 0, 0.75),
    0 2px 6px rgba(0, 0, 0, 0.5);
  box-sizing: border-box;
}

/* ================= Front Face (Ivory Silk Paper) ================= */
.card-front {
  background: linear-gradient(155deg, #FFFFFF 0%, #FAF8F5 50%, #ECEAE4 100%);
  display: flex;
  flex-direction: column;
  padding: 4px;
  border: 1px solid rgba(220, 215, 205, 0.95);
  box-shadow: 
    0 8px 20px rgba(0, 0, 0, 0.65),
    inset 0 1px 2px rgba(255, 255, 255, 1),
    inset 0 -1.5px 2px rgba(0, 0, 0, 0.08);
}

.front-inner-frame {
  width: 100%;
  height: 100%;
  border: 1px solid rgba(180, 160, 130, 0.25);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 5px 6px;
  box-sizing: border-box;
  position: relative;
}

.card-front.red-suit {
  color: #D81E3D;
}

.card-front.black-suit {
  color: #151820;
}

.corner {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
}

.top-left {
  align-self: flex-start;
}

.bottom-right {
  align-self: flex-end;
  transform: rotate(180deg);
}

.rank {
  font-size: 16px;
  font-weight: 900;
  font-family: 'Helvetica Neue', 'Arial Black', sans-serif;
  letter-spacing: -0.5px;
}

.suit-icon {
  font-size: 13px;
  margin-top: 2px;
}

.center-emblem {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.ace-ornament .ace-crown {
  font-size: 16px;
  color: #D4AF37;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  margin-bottom: -4px;
}

.court-ornament .court-glyph {
  font-size: 18px;
  color: #CAA132;
  margin-bottom: -4px;
}

.large-suit {
  font-size: 34px;
  line-height: 1;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.15));
}

.hologram-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    120deg,
    transparent 0%,
    rgba(255, 255, 255, 0.35) 25%,
    transparent 50%
  );
  pointer-events: none;
}

/* ================= Card Back (Obsidian & Champagne Gold) ================= */
.card-back {
  background: linear-gradient(145deg, #161D2A 0%, #0C1019 50%, #060910 100%);
  border: 1.5px solid #D4AF37;
  transform: rotateY(180deg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
}

.back-outer-border {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  border: 1px solid rgba(255, 223, 115, 0.6);
  padding: 3px;
  box-sizing: border-box;
}

.back-inner-frame {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  border: 1px solid rgba(212, 175, 55, 0.45);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.back-corner-accent {
  position: absolute;
  font-size: 8px;
  color: #FFDF73;
  line-height: 1;
}

.c-tl { top: 2px; left: 3px; }
.c-tr { top: 2px; right: 3px; }
.c-bl { bottom: 2px; left: 3px; }
.c-br { bottom: 2px; right: 3px; }

.back-pattern-mesh {
  width: 100%;
  height: 100%;
  background: 
    repeating-linear-gradient(45deg, rgba(212, 175, 55, 0.08) 0, rgba(212, 175, 55, 0.08) 1px, transparent 0, transparent 6px),
    repeating-linear-gradient(-45deg, rgba(212, 175, 55, 0.08) 0, rgba(212, 175, 55, 0.08) 1px, transparent 0, transparent 6px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-crest-medallion {
  width: 58px;
  height: 74px;
  border: 1px solid rgba(255, 223, 115, 0.7);
  border-radius: 4px;
  background: radial-gradient(circle, rgba(20, 27, 40, 0.95) 0%, rgba(9, 12, 18, 0.98) 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.8), inset 0 0 8px rgba(212, 175, 55, 0.2);
}

.crest-crown {
  font-size: 13px;
  color: #FFDF73;
  margin-bottom: 2px;
}

.crest-text {
  font-size: 7px;
  font-weight: 900;
  letter-spacing: 0.5px;
  background: linear-gradient(90deg, #FFDF73, #D4AF37);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.crest-divider {
  width: 32px;
  height: 1px;
  background: linear-gradient(90deg, transparent, #FFDF73, transparent);
  margin: 3px 0;
}

.crest-sub {
  font-size: 6px;
  font-weight: 700;
  color: #CAA132;
  letter-spacing: 0.8px;
}

/* ================= States & Animations ================= */
.is-selected {
  transform: translateY(-8px) scale(1.05);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.85);
  filter: drop-shadow(0 0 14px rgba(0, 245, 160, 0.9));
}

.is-target {
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.85), 0 8px 24px rgba(0, 0, 0, 0.9);
  border-radius: 9px;
}

.is-boundary {
  animation: pulse-gold-glory 1.6s infinite alternate;
}

@keyframes pulse-gold-glory {
  0% {
    filter: drop-shadow(0 0 6px rgba(255, 215, 0, 0.5));
  }
  100% {
    filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.95)) drop-shadow(0 0 35px rgba(255, 184, 0, 0.5));
  }
}

.is-dealing {
  animation: card-deal-physics 0.45s cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
}

@keyframes card-deal-physics {
  0% {
    opacity: 0;
    transform: translateY(-24px) scale(0.85) rotate(-6deg);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1) rotate(0deg);
  }
}
</style>
