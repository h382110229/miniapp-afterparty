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
      <!-- Card Front (Rank & Suit) -->
      <view class="card-face card-front" :class="[suitClass]">
        <view class="corner top-left">
          <text class="rank">{{ displayRank }}</text>
          <text class="suit-icon">{{ suitSymbol }}</text>
        </view>

        <view class="center-emblem">
          <text class="large-suit">{{ suitSymbol }}</text>
        </view>

        <view class="corner bottom-right">
          <text class="rank">{{ displayRank }}</text>
          <text class="suit-icon">{{ suitSymbol }}</text>
        </view>
        
        <!-- Subtle Holographic Foil Stripe -->
        <view class="hologram-overlay"></view>
      </view>

      <!-- Card Back (Cyber Stitch Pattern) -->
      <view class="card-face card-back">
        <view class="pattern-mesh">
          <view class="inner-border">
            <text class="back-logo">♠ AP ♥</text>
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
</script>

<style scoped>
.poker-card-container {
  width: 90px;
  height: 126px;
  perspective: 1000px;
  cursor: pointer;
  user-select: none;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
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
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-style: preserve-3d;
  border-radius: 12px;
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
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
}

/* Front Face */
.card-front {
  background: linear-gradient(135deg, #FFFFFF 0%, #F1F5F9 100%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8px;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.card-front.red-suit {
  color: #FF0055;
}

.card-front.black-suit {
  color: #0F172A;
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
  font-size: 18px;
  font-weight: 800;
  font-family: 'Arial Black', sans-serif;
}

.suit-icon {
  font-size: 14px;
}

.center-emblem {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.large-suit {
  font-size: 38px;
  opacity: 0.95;
}

.hologram-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    115deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 30%,
    transparent 60%
  );
  pointer-events: none;
}

/* Card Back */
.card-back {
  background: linear-gradient(135deg, #131B2E 0%, #080B14 100%);
  border: 2px solid #00F5A0;
  box-sizing: border-box;
  transform: rotateY(180deg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
}

.pattern-mesh {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  border: 1px dashed rgba(0, 245, 160, 0.4);
  background: radial-gradient(circle, rgba(0, 245, 160, 0.15) 10%, transparent 20%);
  background-size: 10px 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.inner-border {
  width: 60px;
  height: 80px;
  border: 1px solid rgba(0, 229, 255, 0.6);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

.back-logo {
  font-size: 11px;
  font-weight: 800;
  color: #00F5A0;
  letter-spacing: 1px;
}

/* State highlights */
.is-selected {
  transform: translateY(-8px) scale(1.05);
  filter: drop-shadow(0 0 16px rgba(0, 245, 160, 0.8));
}

.is-target {
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.9);
  border-radius: 12px;
}

.is-boundary {
  animation: pulse-gold 1.5s infinite alternate;
}

@keyframes pulse-gold {
  0% {
    filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.6));
  }
  100% {
    filter: drop-shadow(0 0 25px rgba(255, 215, 0, 1));
  }
}
</style>
