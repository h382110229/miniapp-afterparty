<template>
  <view class="dice-arena">
    <!-- Top Navigation Bar -->
    <view class="top-nav glass-panel">
      <button class="nav-btn back-btn" @tap="goBack">
        <text class="btn-icon">←</text>
        <text class="btn-text">返回</text>
      </button>

      <view class="title-box">
        <text class="title-main">酒吧大话骰</text>
        <text class="title-sub">实体替代 · 防偷窥摇盅</text>
      </view>

      <view class="nav-actions">
        <!-- Sound Mute Toggle -->
        <button class="icon-btn" :class="{ 'is-muted': isMuted }" @tap="toggleMute">
          <text class="icon-text">{{ isMuted ? '🔇' : '🔊' }}</text>
        </button>
      </view>
    </view>

    <!-- Main Dice Cup Container -->
    <view class="cup-section">
      <!-- Dice Tray & Velvet Arena -->
      <view class="dice-cup-box" :class="{ 'is-shaking': isShaking }">
        <!-- Base Felt Tray with Dice -->
        <view class="tray-felt" @tap="handleTrayTap">
          <!-- Subtle Felt Texture / Glow Ring -->
          <view class="felt-ring"></view>

          <!-- Dice Container -->
          <view class="dice-scatter-zone" :class="{ 'is-sorted': isSorted }">
            <view
              v-for="(die, index) in dice"
              :key="index"
              class="die-wrapper"
              :style="getDieStyle(die, index)"
            >
              <DieFace
                :value="die.value"
                :size="dieSize"
                :rotation="isSorted ? 0 : die.rotation"
                :highlight="isSorted && die.value === 1"
              />
            </view>
          </view>

          <!-- Tally Summary Pill (Shows in sorted mode or when lid is open) -->
          <view v-if="lidProgress >= 0.7 || isSorted" class="tally-pill glass-panel">
            <text class="tally-text">{{ tallySummary }}</text>
          </view>
        </view>

        <!-- Sliding Cup Lid (Touch & Drag to Peek / Lift) -->
        <view
          class="cup-lid"
          :class="{ 'is-animating': !isDragging }"
          :style="{ transform: `translateY(-${lidProgress * 105}%)` }"
          @touchstart="onTouchStart"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
          @touchcancel="onTouchEnd"
        >
          <!-- Cup Lid Luxury Texture & Cyber Rim -->
          <view class="lid-body">
            <view class="lid-rim"></view>
            <view class="lid-handle">
              <view class="grip-line"></view>
              <view class="grip-line"></view>
              <view class="grip-line"></view>
            </view>

            <view class="lid-indicator">
              <text class="hint-arrow">{{ lidProgress > 0.5 ? '⬇️' : '⬆️' }}</text>
              <text class="hint-label">
                {{ lidProgress > 0.5 ? '已掀开 (下滑盖回)' : '按住上推偷瞄 (松手自动盖回)' }}
              </text>
            </view>

            <view class="lid-logo">
              <text class="logo-emoji">🍸</text>
              <text class="logo-brand">AFTERPARTY</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Privacy Status Hint Tag -->
      <view class="privacy-badge">
        <text class="badge-dot" :class="{ 'dot-safe': lidProgress === 0, 'dot-open': lidProgress > 0 }"></text>
        <text class="badge-text">
          {{ lidProgress === 0 ? '🔒 骰盅已盖严 · 旁人无法偷看' : (lidProgress >= 0.8 ? '🔓 骰盅已全开 · 公开对质' : '👀 偷瞄中 · 松手自动落盖') }}
        </text>
      </view>
    </view>

    <!-- Bottom Controls & Operations -->
    <view class="controls-section glass-panel">
      <!-- Row 1: Dice Count Adjuster & Sort Toggle -->
      <view class="settings-row">
        <!-- Dice Count Selector -->
        <view class="counter-pill">
          <text class="pill-label">骰子数量</text>
          <view class="counter-actions">
            <button class="step-btn" @tap="changeDiceCount(-1)" :disabled="diceCount <= 1">-</button>
            <text class="count-val">{{ diceCount }} 颗</text>
            <button class="step-btn" @tap="changeDiceCount(1)" :disabled="diceCount >= 12">+</button>
          </view>
        </view>

        <!-- Sort / Scatter Toggle -->
        <button class="sort-toggle-btn" :class="{ 'is-active': isSorted }" @tap="toggleSort">
          <text class="sort-icon">{{ isSorted ? '📐' : '🎲' }}</text>
          <text class="sort-text">{{ isSorted ? '已理骰子' : '一键理骰' }}</text>
        </button>
      </view>

      <!-- Row 2: Action Buttons (Peek / Shake / Open) -->
      <view class="action-row">
        <!-- Toggle Lid Button -->
        <button class="btn-secondary peek-btn" @tap="toggleLid">
          <text class="action-icon">{{ lidProgress > 0.5 ? '🔒' : '👁️' }}</text>
          <text class="action-text">{{ lidProgress > 0.5 ? '盖上' : '开盅' }}</text>
        </button>

        <!-- Big Shake Button -->
        <button class="btn-primary shake-btn" :disabled="isShaking" @tap="rollDice">
          <text class="shake-icon">🤹</text>
          <text class="shake-text">{{ isShaking ? '正在摇骰...' : '摇一摇 (或晃动手机)' }}</text>
        </button>
      </view>

      <!-- Shake Motion Sensor Status Note -->
      <view class="accelerometer-tip">
        <text class="tip-icon">📱</text>
        <text class="tip-text">支持物理摇一摇：晃动手机即可自动摇骰并伴随震动</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import DieFace from '../../components/DieFace.vue';
import { diceSound } from '../../utils/diceAudio';

interface DieData {
  value: number;
  rotation: number;
  xPercent: number;
  yPercent: number;
}

// State
const diceCount = ref(5);
const dice = ref<DieData[]>([]);
const isSorted = ref(false);
const isShaking = ref(false);
const isMuted = ref(false);

// Lid Drag & Peek Gestures
const lidProgress = ref(0); // 0 (closed) to 1 (fully open)
const isDragging = ref(false);
const touchStartY = ref(0);
const startLidProgress = ref(0);

// Accelerometer Shake Detection
let lastX = 0;
let lastY = 0;
let lastZ = 0;
let lastShakeTimestamp = 0;

// Dynamic die sizing based on count
const dieSize = computed(() => {
  if (diceCount.value <= 4) return 56;
  if (diceCount.value <= 6) return 50;
  if (diceCount.value <= 9) return 44;
  return 38;
});

// Tally Summary (e.g. "3个4 · 2个1")
const tallySummary = computed(() => {
  const counts: Record<number, number> = {};
  dice.value.forEach(d => {
    counts[d.value] = (counts[d.value] || 0) + 1;
  });

  const parts = Object.entries(counts)
    .sort((a, b) => Number(b[1]) - Number(a[1]) || Number(b[0]) - Number(a[0]))
    .map(([val, count]) => `${count}个${val}`);

  return parts.join(' · ') || '暂无骰子';
});

// Generate fresh dice with random points, positions and rotations
function generateDiceValues(count: number): DieData[] {
  const newDice: DieData[] = [];
  
  // Arrange in varied positions inside circular/oval tray
  for (let i = 0; i < count; i++) {
    // Random angle & radius distribution for organic look
    const angle = (i / count) * 2 * Math.PI + (Math.random() * 0.5 - 0.25);
    const radius = 25 + Math.random() * 45; // percentage distance from center
    
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.75; // slightly squished Y for perspective

    newDice.push({
      value: Math.floor(Math.random() * 6) + 1,
      rotation: Math.floor(Math.random() * 50) - 25,
      xPercent: Math.max(-42, Math.min(42, x)),
      yPercent: Math.max(-40, Math.min(40, y)),
    });
  }
  return newDice;
}

// Position style for each die
function getDieStyle(die: DieData, index: number) {
  if (isSorted.value) {
    // Aligned neatly in a grid
    return {};
  }
  return {
    transform: `translate(${die.xPercent}px, ${die.yPercent}px)`,
  };
}

// Roll Dice Action
function rollDice() {
  if (isShaking.value) return;
  isShaking.value = true;

  // Sound effect
  diceSound.playShakeSequence(750);

  // Native Haptic Vibration
  try {
    uni.vibrateShort({
      success: () => {},
      fail: () => {},
    });
    setTimeout(() => {
      uni.vibrateShort({ success: () => {}, fail: () => {} });
    }, 200);
    setTimeout(() => {
      uni.vibrateShort({ success: () => {}, fail: () => {} });
    }, 450);
  } catch (e) {}

  // If lid was open, smoothly close it upon shaking to maintain secret
  if (lidProgress.value > 0) {
    lidProgress.value = 0;
  }

  // Generate results after shake duration
  setTimeout(() => {
    dice.value = generateDiceValues(diceCount.value);
    isShaking.value = false;

    // Send quiet background stats telemetry
    recordStats('roll', diceCount.value);
  }, 700);
}

// Change dice count
function changeDiceCount(delta: number) {
  const next = Math.max(1, Math.min(12, diceCount.value + delta));
  if (next !== diceCount.value) {
    diceCount.value = next;
    dice.value = generateDiceValues(next);
  }
}

// Toggle sort
function toggleSort() {
  isSorted.value = !isSorted.value;
  if (isSorted.value) {
    // Sort array by value ascending
    dice.value.sort((a, b) => a.value - b.value);
  } else {
    // Regenerate scatter positions
    dice.value = dice.value.map(d => ({
      ...d,
      rotation: Math.floor(Math.random() * 50) - 25,
      xPercent: Math.floor(Math.random() * 80) - 40,
      yPercent: Math.floor(Math.random() * 70) - 35,
    }));
  }
}

// Toggle Lid between closed and fully open
function toggleLid() {
  lidProgress.value = lidProgress.value > 0.5 ? 0 : 1;
}

// Handle tap on tray
function handleTrayTap() {
  if (lidProgress.value >= 0.8) {
    // Tap to close if open
    lidProgress.value = 0;
  }
}

// Touch Gestures on Cup Lid
function onTouchStart(e: TouchEvent) {
  if (isShaking.value) return;
  isDragging.value = true;
  touchStartY.value = e.touches[0].clientY;
  startLidProgress.value = lidProgress.value;
}

function onTouchMove(e: TouchEvent) {
  if (!isDragging.value) return;
  const currentY = e.touches[0].clientY;
  const deltaY = currentY - touchStartY.value;
  
  // Dragging upward (negative deltaY) increases lidProgress
  const dragSensitivity = 0.004; // 250px pull = 100%
  let newProgress = startLidProgress.value - (deltaY * dragSensitivity);
  newProgress = Math.max(0, Math.min(1, newProgress));

  lidProgress.value = newProgress;
}

function onTouchEnd() {
  if (!isDragging.value) return;
  isDragging.value = false;

  // Peek Threshold Decision:
  // If user was peeking (< 0.55), release springs back to 0 (Privacy Seal).
  // If user dragged high (>= 0.55), snap to 1.0 (Locked Open).
  if (startLidProgress.value === 0) {
    if (lidProgress.value >= 0.55) {
      lidProgress.value = 1;
    } else {
      lidProgress.value = 0;
    }
  } else {
    // Was open, dragging down
    if (lidProgress.value <= 0.45) {
      lidProgress.value = 0;
    } else {
      lidProgress.value = 1;
    }
  }
}

// Toggle Mute
function toggleMute() {
  isMuted.value = !isMuted.value;
  diceSound.setMuted(isMuted.value);
}

// Accelerometer Shake Handler
function initAccelerometer() {
  try {
    uni.startAccelerometer({
      interval: 'ui',
      success: () => {
        uni.onAccelerometerChange(handleAccelerometerData);
      },
      fail: () => {
        console.warn('[Dice] Accelerometer not supported on this device/platform');
      },
    });
  } catch (e) {}
}

function handleAccelerometerData(res: { x: number; y: number; z: number }) {
  const now = Date.now();
  if (now - lastShakeTimestamp < 1200 || isShaking.value) {
    return;
  }

  const deltaX = Math.abs(res.x - lastX);
  const deltaY = Math.abs(res.y - lastY);
  const deltaZ = Math.abs(res.z - lastZ);

  lastX = res.x;
  lastY = res.y;
  lastZ = res.z;

  const totalMovement = deltaX + deltaY + deltaZ;

  // Threshold for phone shake
  if (totalMovement > 2.4) {
    lastShakeTimestamp = now;
    rollDice();
  }
}

// Quiet background telemetry
function recordStats(action: string, count: number) {
  try {
    uni.request({
      url: '/api/stats/dice',
      method: 'POST',
      data: { action, count },
      fail: () => {},
    });
  } catch (e) {}
}

// Navigation Back
function goBack() {
  uni.navigateBack({
    fail: () => {
      uni.redirectTo({ url: '/pages/index/index' });
    },
  });
}

onMounted(() => {
  dice.value = generateDiceValues(diceCount.value);
  initAccelerometer();
  recordStats('session', 1);
});

onUnmounted(() => {
  try {
    uni.stopAccelerometer();
  } catch (e) {}
});
</script>

<style scoped>
.dice-arena {
  min-height: 100vh;
  background: radial-gradient(circle at 50% 20%, #151A2E 0%, #0B0E17 100%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: calc(var(--status-bar-height, 20px) + 12px) 16px 28px 16px;
  overflow: hidden;
}

/* Top Navigation Bar */
.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  margin-bottom: 12px;
}

.nav-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  color: #FFFFFF;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  line-height: 1.2;
}

.btn-icon {
  font-size: 16px;
  font-weight: 700;
}

.btn-text {
  font-size: 13px;
  font-weight: 600;
}

.title-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.title-main {
  font-size: 16px;
  font-weight: 800;
  color: #FFFFFF;
  letter-spacing: 0.5px;
}

.title-sub {
  font-size: 10px;
  color: #00F5A0;
  margin-top: 2px;
  letter-spacing: 0.2px;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
}

.icon-btn.is-muted {
  background: rgba(255, 59, 48, 0.2);
  border-color: rgba(255, 59, 48, 0.4);
}

.icon-text {
  font-size: 16px;
}

/* Main Dice Cup Section */
.cup-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 10px 0;
  position: relative;
}

.dice-cup-box {
  width: 310px;
  height: 310px;
  position: relative;
  border-radius: 40px;
  box-shadow: 
    0 20px 50px rgba(0, 0, 0, 0.8),
    0 0 30px rgba(0, 245, 160, 0.15);
  overflow: hidden;
}

/* Shaking Rumble Animation */
.is-shaking {
  animation: cupRumble 0.12s infinite alternate ease-in-out;
}

@keyframes cupRumble {
  0% { transform: translate(-3px, -2px) rotate(-1.5deg); }
  50% { transform: translate(3px, 2px) rotate(1.5deg); }
  100% { transform: translate(-2px, 3px) rotate(-0.5deg); }
}

/* Base Velvet Tray */
.tray-felt {
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 50% 50%, #0F382E 0%, #061B15 80%, #030E0B 100%);
  border: 6px solid #1A2621;
  border-radius: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: inset 0 6px 30px rgba(0, 0, 0, 0.9);
}

.felt-ring {
  position: absolute;
  width: 82%;
  height: 82%;
  border-radius: 50%;
  border: 1px dashed rgba(0, 245, 160, 0.2);
  pointer-events: none;
}

/* Dice Scatter Zone */
.dice-scatter-zone {
  width: 80%;
  height: 80%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.dice-scatter-zone.is-sorted {
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  gap: 12px;
}

.die-wrapper {
  position: absolute;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dice-scatter-zone.is-sorted .die-wrapper {
  position: static;
  transform: none !important;
}

/* Tally Pill */
.tally-pill {
  position: absolute;
  bottom: 12px;
  padding: 4px 14px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.65);
  border: 1px solid rgba(0, 245, 160, 0.4);
}

.tally-text {
  font-size: 12px;
  font-weight: 700;
  color: #00F5A0;
}

/* Sliding Cup Lid */
.cup-lid {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  will-change: transform;
}

.cup-lid.is-animating {
  transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1);
}

.lid-body {
  width: 100%;
  height: 100%;
  background: linear-gradient(160deg, #1E2333 0%, #111420 50%, #0A0C14 100%);
  border-radius: 40px;
  border: 3px solid rgba(255, 215, 0, 0.4);
  box-shadow: 
    0 15px 35px rgba(0, 0, 0, 0.9),
    inset 0 2px 4px rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 24px 16px 20px 16px;
  box-sizing: border-box;
}

.lid-rim {
  position: absolute;
  top: 8px;
  left: 14px;
  right: 14px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.6), transparent);
}

/* Handle Grips */
.lid-handle {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  margin-top: 6px;
}

.grip-line {
  width: 44px;
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.lid-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.hint-arrow {
  font-size: 20px;
  animation: bounceHint 1.2s infinite ease-in-out;
}

@keyframes bounceHint {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.hint-label {
  font-size: 11px;
  color: #A0AEC0;
  font-weight: 500;
  text-align: center;
}

.lid-logo {
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0.6;
}

.logo-emoji {
  font-size: 16px;
}

.logo-brand {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 2px;
  color: #E2E8F0;
}

/* Privacy Status Tag */
.privacy-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  background: rgba(0, 0, 0, 0.4);
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-safe {
  background-color: #00F5A0;
  box-shadow: 0 0 8px #00F5A0;
}

.dot-open {
  background-color: #FFB800;
  box-shadow: 0 0 8px #FFB800;
}

.badge-text {
  font-size: 12px;
  color: #CBD5E0;
  font-weight: 500;
}

/* Bottom Controls Section */
.controls-section {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Settings Row */
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.counter-pill {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pill-label {
  font-size: 12px;
  color: #A0AEC0;
  font-weight: 600;
}

.counter-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #FFFFFF;
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  line-height: 1;
}

.step-btn:disabled {
  opacity: 0.3;
}

.count-val {
  font-size: 14px;
  font-weight: 800;
  color: #00F5A0;
  min-width: 38px;
  text-align: center;
}

.sort-toggle-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 8px 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #E2E8F0;
  margin: 0;
  line-height: 1.2;
}

.sort-toggle-btn.is-active {
  background: rgba(0, 245, 160, 0.15);
  border-color: #00F5A0;
  color: #00F5A0;
}

.sort-icon {
  font-size: 15px;
}

.sort-text {
  font-size: 12px;
  font-weight: 700;
}

/* Action Row */
.action-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.peek-btn {
  width: 90px;
  height: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: 14px;
  margin: 0;
  padding: 0;
}

.action-icon {
  font-size: 18px;
}

.action-text {
  font-size: 12px;
  font-weight: 700;
}

.shake-btn {
  flex: 1;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 800;
  margin: 0;
  border-radius: 14px;
}

.shake-icon {
  font-size: 20px;
}

.shake-text {
  font-size: 15px;
  font-weight: 800;
}

/* Accelerometer tip */
.accelerometer-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  opacity: 0.65;
}

.tip-icon {
  font-size: 12px;
}

.tip-text {
  font-size: 11px;
  color: #A0AEC0;
}
</style>
