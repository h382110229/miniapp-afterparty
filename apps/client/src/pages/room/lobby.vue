<template>
  <view class="lobby-container">
    <!-- Room Code & Sharing Card -->
    <view class="room-card glass-panel neon-glow-emerald">
      <view class="room-header">
        <text class="game-badge">猜扑克大小</text>
        <text class="host-tag" v-if="roomStore.isHost">你是房主 👑</text>
      </view>

      <view class="code-display">
        <text class="code-label">房间号 (6位数字)</text>
        <text class="code-number">{{ roomStore.currentRoom?.roomCode || '------' }}</text>
      </view>

      <view class="share-actions">
        <!-- #ifdef MP-WEIXIN -->
        <button class="btn-primary share-btn" open-type="share">
          <text class="btn-text">微信分享好友开黑</text>
        </button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <button class="btn-primary share-btn" @tap="copyShareLink">
          <text class="btn-text">复制酒桌邀请链接</text>
        </button>
        <!-- #endif -->
        <button class="btn-secondary copy-btn" @tap="copyRoomCode">
          <text class="btn-text">复制房间号</text>
        </button>
      </view>
    </view>

    <!-- Seats Wheel Table Area -->
    <view class="table-section glass-panel">
      <view class="table-header">
        <text class="table-title">酒桌座位 (点击空座入座)</text>
        <view class="host-seat-controls" v-if="roomStore.isHost">
          <text class="seat-adjust-label">总席位:</text>
          <button class="mini-btn" @tap="adjustSeats(-1)">-</button>
          <text class="seats-num">{{ roomStore.currentRoom?.seatCount }}</text>
          <button class="mini-btn" @tap="adjustSeats(1)">+</button>
        </view>
      </view>

      <view class="seats-grid">
        <view
          v-for="seat in roomStore.currentRoom?.seats"
          :key="seat.seatIndex"
          class="seat-item"
          :class="{
            'is-occupied': seat.user,
            'is-mine': seat.user && seat.user.id === userStore.user?.id
          }"
          @tap="onSeatTap(seat)"
        >
          <template v-if="seat.user">
            <image class="seat-avatar" :src="seat.user.avatarUrl" mode="aspectFill" />
            <text class="seat-name">{{ seat.user.nickname }}</text>
            <text v-if="seat.user.id === roomStore.currentRoom?.hostId" class="crown">👑</text>
          </template>
          <template v-else>
            <view class="empty-seat-slot">
              <text class="plus">+</text>
            </view>
            <text class="seat-idx">{{ seat.seatIndex + 1 }}号位</text>
          </template>
        </view>
      </view>

      <view class="seat-actions" v-if="roomStore.isSeated">
        <button class="btn-secondary leave-seat-btn" @tap="roomStore.leaveSeat">
          离开座位旁观
        </button>
      </view>
    </view>

    <!-- Bottom Start Bar -->
    <view class="bottom-bar">
      <template v-if="roomStore.isHost">
        <button class="btn-primary start-btn" @tap="startGame">
          开始游戏 (洗牌发牌)
        </button>
      </template>
      <template v-else>
        <view class="waiting-box glass-panel">
          <text class="waiting-text">等待房主点击开始游戏...</text>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { useRoomStore } from '../../stores/room';
import { useUserStore } from '../../stores/user';
import { useHighLowStore } from '../../stores/highlow';
import { socketService } from '../../utils/socket';
import { Seat } from '@afterparty/shared-types';

const roomStore = useRoomStore();
const userStore = useUserStore();
const highLowStore = useHighLowStore();

onLoad((query) => {
  const code = query?.code as string;
  socketService.connect();

  if (code && (!roomStore.currentRoom || roomStore.currentRoom.roomCode !== code)) {
    roomStore.joinRoom(code);
  }

  // Listen to room and game events
  socketService.on((event) => {
    if (event.type === 'room:state') {
      roomStore.setRoom(event.payload.room);
      if (event.payload.room.status === 'playing') {
        uni.navigateTo({ url: `/pages/game/highlow?roomId=${event.payload.room.roomId}` });
      }
    } else if (event.type === 'game:state') {
      highLowStore.setGameState(event.payload.gameState);
      uni.navigateTo({ url: `/pages/game/highlow?roomId=${event.payload.gameState.roomId}` });
    } else if (event.type === 'room:error') {
      uni.showToast({ title: event.payload.message, icon: 'none' });
    }
  });
});

onShareAppMessage(() => {
  const code = roomStore.currentRoom?.roomCode || '';
  return {
    title: `🍻 来喝酒！加入房间【${code}】玩猜扑克大小！`,
    path: `/pages/room/lobby?code=${code}`,
  };
});

function copyRoomCode() {
  const code = roomStore.currentRoom?.roomCode;
  if (!code) return;
  uni.setClipboardData({
    data: code,
    success: () => uni.showToast({ title: '房间号已复制', icon: 'success' }),
  });
}

function copyShareLink() {
  const code = roomStore.currentRoom?.roomCode;
  if (!code) return;
  // #ifdef H5
  const link = `${window.location.origin}/#/pages/room/lobby?code=${code}`;
  // #endif
  // #ifndef H5
  const link = `https://afterparty.miniapp.hawkren.online/#/pages/room/lobby?code=${code}`;
  // #endif

  uni.setClipboardData({
    data: link,
    success: () => uni.showToast({ title: '邀请链接已复制', icon: 'success' }),
  });
}

function onSeatTap(seat: Seat) {
  if (!seat.user) {
    roomStore.takeSeat(seat.seatIndex);
  }
}

function adjustSeats(delta: number) {
  if (!roomStore.currentRoom) return;
  const current = roomStore.currentRoom.seatCount;
  const next = Math.max(2, Math.min(12, current + delta));
  if (next !== current) {
    roomStore.updateSeatCount(next);
  }
}

function startGame() {
  roomStore.startGame();
}
</script>

<style scoped>
.lobby-container {
  padding: 16px;
  min-height: 100vh;
  box-sizing: border-box;
}

.room-card {
  padding: 20px;
  margin-bottom: 16px;
  text-align: center;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.game-badge {
  background: rgba(0, 245, 160, 0.15);
  color: #00F5A0;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
}

.host-tag {
  color: #FFB400;
  font-size: 12px;
  font-weight: 700;
}

.code-display {
  margin: 10px 0 16px;
}

.code-label {
  font-size: 12px;
  color: #94A3B8;
  display: block;
}

.code-number {
  font-size: 40px;
  font-weight: 900;
  letter-spacing: 6px;
  color: #FFFFFF;
  text-shadow: 0 0 20px rgba(0, 245, 160, 0.5);
  display: block;
  margin-top: 4px;
}

.share-actions {
  display: flex;
  gap: 10px;
}

.share-btn {
  flex: 2;
  height: 42px;
}

.copy-btn {
  flex: 1;
  height: 42px;
}

.btn-text {
  font-size: 14px;
}

.table-section {
  padding: 16px;
  margin-bottom: 90px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.table-title {
  font-size: 15px;
  font-weight: 700;
  color: #F8FAFC;
}

.host-seat-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.seat-adjust-label {
  font-size: 11px;
  color: #94A3B8;
}

.mini-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: #FFFFFF;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}

.seats-num {
  font-size: 13px;
  font-weight: 700;
  color: #00F5A0;
}

.seats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.seat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  position: relative;
  transition: all 0.2s ease;
}

.seat-item.is-mine {
  border-color: #00E5FF;
  background: rgba(0, 229, 255, 0.08);
}

.seat-item.is-occupied {
  border-color: rgba(0, 245, 160, 0.4);
}

.seat-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid #00F5A0;
  background: #1A2035;
}

.seat-name {
  font-size: 12px;
  color: #FFFFFF;
  margin-top: 6px;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.crown {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 12px;
}

.empty-seat-slot {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px dashed rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}

.plus {
  font-size: 24px;
  color: rgba(255, 255, 255, 0.4);
}

.seat-idx {
  font-size: 11px;
  color: #94A3B8;
  margin-top: 6px;
}

.seat-actions {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.leave-seat-btn {
  height: 36px;
  padding: 0 16px;
  font-size: 12px;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: rgba(11, 14, 23, 0.95);
  backdrop-filter: blur(16px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.start-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
}

.waiting-box {
  padding: 12px;
  text-align: center;
}

.waiting-text {
  font-size: 14px;
  color: #00F5A0;
  font-weight: 600;
  animation: pulse 1.5s infinite alternate;
}

@keyframes pulse {
  0% { opacity: 0.6; }
  100% { opacity: 1; }
}
</style>
