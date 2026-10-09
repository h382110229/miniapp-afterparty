<template>
  <view class="seat-wheel-container">
    <view class="seats-row">
      <view
        v-for="seat in seats"
        :key="seat.seatIndex"
        class="seat-box"
        :class="{
          'is-active': seat.user && seat.user.id === currentTurnPlayerId,
          'is-empty': !seat.user,
          'is-me': seat.user && seat.user.id === myUserId,
        }"
        @tap="handleSeatClick(seat)"
      >
        <!-- Seated Player -->
        <template v-if="seat.user">
          <view class="avatar-wrap">
            <image class="avatar" :src="seat.user.avatarUrl" mode="aspectFill" />
            <view v-if="seat.user.id === currentTurnPlayerId" class="turn-badge">
              <text class="turn-text">出牌中</text>
            </view>
          </view>

          <text class="nickname">{{ seat.user.nickname }}</text>

          <!-- Stats: Drinks & Streak -->
          <view class="player-chips" v-if="stats && stats[seat.user.id]">
            <view class="chip beer-chip">
              <text class="chip-text">🍺 {{ stats[seat.user.id].drinksCount }}</text>
            </view>
            <view v-if="stats[seat.user.id].consecutiveWins > 1" class="chip streak-chip">
              <text class="chip-text">🔥 {{ stats[seat.user.id].consecutiveWins }}</text>
            </view>
          </view>
        </template>

        <!-- Empty Seat -->
        <template v-else>
          <view class="empty-seat-circle">
            <text class="plus-icon">+</text>
          </view>
          <text class="seat-num">{{ seat.seatIndex + 1 }}号位</text>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { Seat, PlayerStats } from '@afterparty/shared-types';

const props = defineProps<{
  seats: Seat[];
  currentTurnPlayerId?: string;
  myUserId?: string;
  stats?: Record<string, PlayerStats>;
}>();

const emit = defineEmits<{
  (e: 'takeSeat', seatIndex: number): void;
}>();

function handleSeatClick(seat: Seat) {
  if (!seat.user) {
    emit('takeSeat', seat.seatIndex);
  }
}
</script>

<style scoped>
.seat-wheel-container {
  width: 100%;
  padding: 8px 12px;
  box-sizing: border-box;
}

.seats-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  overflow-x: auto;
  padding: 4px 0;
  scrollbar-width: none;
}

.seats-row::-webkit-scrollbar {
  display: none;
}

.seat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 68px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 14px;
  padding: 8px 4px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.3s ease;
}

.seat-box.is-active {
  border-color: #FFDF73;
  box-shadow: 0 0 16px rgba(255, 223, 115, 0.45), 0 4px 12px rgba(0, 0, 0, 0.6);
  background: rgba(255, 223, 115, 0.12);
  transform: translateY(-2px);
}

.seat-box.is-me {
  border-color: #00F5A0;
}

.avatar-wrap {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  padding: 2px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.is-active .avatar-wrap {
  background: linear-gradient(135deg, #FFDF73, #D4AF37);
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #1A2035;
}

.turn-badge {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #FFDF73, #D4AF37);
  border-radius: 8px;
  padding: 1px 5px;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
}

.turn-text {
  font-size: 9px;
  font-weight: 900;
  color: #1A1204;
}

.nickname {
  font-size: 11px;
  color: #CBD5E1;
  margin-top: 6px;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

.empty-seat-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.plus-icon {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.4);
}

.seat-num {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 6px;
}

.player-chips {
  display: flex;
  flex-direction: row;
  gap: 4px;
  margin-top: 4px;
}

.chip {
  padding: 2px 4px;
  border-radius: 6px;
  font-size: 9px;
}

.beer-chip {
  background: rgba(255, 180, 0, 0.2);
  color: #FFB400;
}

.streak-chip {
  background: rgba(255, 0, 127, 0.2);
  color: #FF007F;
}

.chip-text {
  font-size: 9px;
  font-weight: 700;
}
</style>
