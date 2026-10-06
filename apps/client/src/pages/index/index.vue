<template>
  <view class="home-container">
    <!-- Top Hero Header -->
    <view class="hero-section">
      <view class="logo-box">
        <text class="logo-icon">🍸</text>
        <text class="logo-title">AfterParty</text>
      </view>
      <text class="logo-subtitle">酒吧微醺 · 聚会破冰 · 娱乐小游戏合集</text>
    </view>

    <!-- User Profile Bar -->
    <view class="user-card glass-panel" @tap="showEditProfile = true">
      <image class="user-avatar" :src="userStore.user?.avatarUrl" mode="aspectFill" />
      <view class="user-info">
        <text class="user-name">{{ userStore.user?.nickname || '未登录酒友' }}</text>
        <view class="tag-row">
          <text class="identity-tag">{{ userStore.user?.isGuest ? '酒客模式' : '微信认证' }}</text>
          <text class="edit-hint">点击编辑身份 ✍️</text>
        </view>
      </view>
    </view>

    <!-- Game Collection Section -->
    <view class="section-title">
      <text class="title-text">热门酒桌游戏</text>
    </view>

    <!-- Game Card: High-Low Poker (MVP) -->
    <view class="game-card glass-panel neon-glow-emerald">
      <view class="game-header">
        <view class="badge-active">首发 MVP</view>
        <text class="game-tag">2-12人对战</text>
      </view>
      <view class="game-body">
        <text class="game-name">猜扑克大小 (High/Low)</text>
        <text class="game-desc">
          一副52张纯扑克打乱，公共区域翻出6张基准牌。比大小、遇平局罚酒、摸中 A 或 K 触发暴击连击！
        </text>
      </view>
      <view class="action-buttons">
        <button class="btn-primary create-btn" @tap="openCreateModal('card_highlow')">
          <text class="btn-text">创建房间</text>
        </button>
        <button class="btn-secondary join-btn" @tap="showJoinModal = true">
          <text class="btn-text">输入房间号</text>
        </button>
      </view>
    </view>

    <!-- Coming Soon Games -->
    <view class="game-card glass-panel is-disabled">
      <view class="game-header">
        <view class="badge-pending">即将推出</view>
        <text class="game-tag">多人互动</text>
      </view>
      <view class="game-body">
        <text class="game-name">酒吧吹牛骰 (Liar's Dice)</text>
        <text class="game-desc">经典大话骰摇盅，心理博弈炸弹，酒吧包厢必备神器。</text>
      </view>
    </view>

    <!-- Create Room Modal -->
    <view v-if="showCreateModal" class="modal-overlay" @tap="showCreateModal = false">
      <view class="modal-content glass-panel" @tap.stop>
        <text class="modal-title">创建游戏房间</text>
        <view class="seat-picker">
          <text class="label">设置桌位人数 (2 ~ 12人):</text>
          <view class="counter-box">
            <button class="counter-btn" @tap="selectedSeats = Math.max(2, selectedSeats - 1)">-</button>
            <text class="seats-val">{{ selectedSeats }} 人桌</text>
            <button class="counter-btn" @tap="selectedSeats = Math.min(12, selectedSeats + 1)">+</button>
          </view>
        </view>
        <button class="btn-primary modal-action-btn" :loading="isCreating" @tap="confirmCreateRoom">
          立即开桌并生成房间号
        </button>
      </view>
    </view>

    <!-- Join Room Modal -->
    <view v-if="showJoinModal" class="modal-overlay" @tap="showJoinModal = false">
      <view class="modal-content glass-panel" @tap.stop>
        <text class="modal-title">输入 6 位房间号</text>
        <input
          class="code-input"
          type="number"
          maxlength="6"
          v-model="inputCode"
          placeholder="例如 688921"
          placeholder-style="color: rgba(255,255,255,0.3)"
        />
        <button class="btn-primary modal-action-btn" @tap="confirmJoinRoom">
          进入房间
        </button>
      </view>
    </view>

    <!-- Edit Profile Modal -->
    <view v-if="showEditProfile" class="modal-overlay" @tap="showEditProfile = false">
      <view class="modal-content glass-panel" @tap.stop>
        <text class="modal-title">自定义酒桌名号</text>
        <input
          class="nickname-input"
          maxlength="12"
          v-model="newNickname"
          placeholder="请输入酒友昵称"
        />
        <button class="btn-primary modal-action-btn" @tap="saveProfile">
          保存名号
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '../../stores/user';
import { useRoomStore } from '../../stores/room';
import { socketService } from '../../utils/socket';

const userStore = useUserStore();
const roomStore = useRoomStore();

const showCreateModal = ref(false);
const showJoinModal = ref(false);
const showEditProfile = ref(false);

const selectedSeats = ref(6);
const inputCode = ref('');
const newNickname = ref(userStore.user?.nickname || '');
const isCreating = ref(false);

function openCreateModal(gameType: string) {
  showCreateModal.value = true;
}

async function confirmCreateRoom() {
  if (isCreating.value) return;
  isCreating.value = true;

  try {
    socketService.connect();
    // Ensure valid server JWT token
    const token = await userStore.ensureAuth(getApiUrl(''));

    // Register message listener to navigate when room state arrives
    const unsubscribe = socketService.on((event) => {
      if (event.type === 'room:state') {
        roomStore.setRoom(event.payload.room);
        unsubscribe();
        showCreateModal.value = false;
        uni.navigateTo({ url: `/pages/room/lobby?code=${event.payload.room.roomCode}` });
      } else if (event.type === 'room:error') {
        uni.showToast({ title: event.payload.message, icon: 'none' });
      }
    });

    // Request create room via API or WebSocket
    // For universal H5 and WeChat, call REST endpoint
    const res = await uni.request({
      url: getApiUrl('/api/room/create'),
      method: 'POST',
      header: {
        Authorization: `Bearer ${token || userStore.token}`,
      },
      data: {
        gameType: 'card_highlow',
        seatCount: selectedSeats.value,
        user: userStore.user,
      },
    });

    const data = res.data as any;
    if (data.room) {
      roomStore.setRoom(data.room);
      roomStore.joinRoom(data.room.roomCode);
      showCreateModal.value = false;
      uni.navigateTo({ url: `/pages/room/lobby?code=${data.room.roomCode}` });
    }
  } catch (err: any) {
    uni.showToast({ title: '开房失败，请重试', icon: 'none' });
  } finally {
    isCreating.value = false;
  }
}

function confirmJoinRoom() {
  if (inputCode.value.length !== 6) {
    uni.showToast({ title: '请输入6位有效数字房间号', icon: 'none' });
    return;
  }

  socketService.connect();
  roomStore.joinRoom(inputCode.value);

  const unsubscribe = socketService.on((event) => {
    if (event.type === 'room:state') {
      roomStore.setRoom(event.payload.room);
      unsubscribe();
      showJoinModal.value = false;
      uni.navigateTo({ url: `/pages/room/lobby?code=${event.payload.room.roomCode}` });
    } else if (event.type === 'room:error') {
      uni.showToast({ title: event.payload.message, icon: 'none' });
      unsubscribe();
    }
  });
}

function saveProfile() {
  if (newNickname.value.trim()) {
    userStore.updateProfile(newNickname.value.trim());
    showEditProfile.value = false;
    uni.showToast({ title: '更新成功', icon: 'success' });
  }
}

function getApiUrl(path: string): string {
  // #ifdef H5
  return path;
  // #endif
  // #ifndef H5
  return `https://afterparty.miniapp.hawkren.online${path}`;
  // #endif
}
</script>

<style scoped>
.home-container {
  padding: 20px 16px 40px;
}

.hero-section {
  text-align: center;
  margin-bottom: 24px;
}

.logo-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.logo-icon {
  font-size: 32px;
}

.logo-title {
  font-size: 32px;
  font-weight: 900;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #00F5A0 0%, #00E5FF 50%, #FF007F 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.logo-subtitle {
  font-size: 13px;
  color: #94A3B8;
  margin-top: 6px;
  display: block;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  margin-bottom: 24px;
}

.user-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 2px solid #00F5A0;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 16px;
  font-weight: 700;
  color: #FFFFFF;
}

.tag-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.identity-tag {
  background: rgba(0, 245, 160, 0.15);
  color: #00F5A0;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 6px;
}

.edit-hint {
  font-size: 11px;
  color: #94A3B8;
}

.section-title {
  margin-bottom: 12px;
}

.title-text {
  font-size: 18px;
  font-weight: 800;
  color: #F8FAFC;
}

.game-card {
  padding: 18px;
  margin-bottom: 16px;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.badge-active {
  background: linear-gradient(135deg, #00F5A0, #00D9F5);
  color: #0B0E17;
  font-size: 11px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 8px;
}

.badge-pending {
  background: rgba(255, 255, 255, 0.1);
  color: #94A3B8;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 8px;
}

.game-tag {
  font-size: 12px;
  color: #94A3B8;
}

.game-name {
  font-size: 20px;
  font-weight: 800;
  color: #FFFFFF;
  display: block;
}

.game-desc {
  font-size: 13px;
  color: #94A3B8;
  line-height: 1.5;
  margin-top: 6px;
  display: block;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 18px;
}

.create-btn, .join-btn {
  flex: 1;
  height: 44px;
}

.btn-text {
  font-size: 15px;
}

.is-disabled {
  opacity: 0.6;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-content {
  width: 85%;
  max-width: 360px;
  padding: 24px;
  border-radius: 20px;
}

.modal-title {
  font-size: 18px;
  font-weight: 800;
  text-align: center;
  color: #FFFFFF;
  display: block;
  margin-bottom: 20px;
}

.seat-picker {
  margin-bottom: 20px;
}

.label {
  font-size: 13px;
  color: #94A3B8;
  display: block;
  margin-bottom: 10px;
}

.counter-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.counter-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: #FFFFFF;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}

.seats-val {
  font-size: 18px;
  font-weight: 700;
  color: #00F5A0;
}

.code-input, .nickname-input {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  height: 48px;
  padding: 0 16px;
  color: #FFFFFF;
  font-size: 18px;
  text-align: center;
  margin-bottom: 20px;
}

.modal-action-btn {
  height: 46px;
}
</style>
