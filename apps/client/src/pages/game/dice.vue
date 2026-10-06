<template>
  <view class="dice-arena">
    <!-- Top Navigation Bar -->
    <view class="top-nav glass-panel">
      <view class="nav-btn" hover-class="btn-hover" @tap="goBack">
        <text class="btn-icon">←</text>
        <text class="btn-text">返回</text>
      </view>

      <view class="title-box">
        <text class="title-main">酒吧大话骰</text>
        <text class="title-sub">实体替代 · 3D 拟真防偷窥摇盅</text>
      </view>

      <view class="nav-actions">
        <!-- Sound Mute Toggle -->
        <view class="icon-btn" :class="{ 'is-muted': isMuted }" hover-class="btn-hover" @tap="toggleMute">
          <text class="icon-text">{{ isMuted ? '🔇' : '🔊' }}</text>
        </view>
      </view>
    </view>

    <!-- Main 3D Dice Cup & Arena Section -->
    <view class="stage-section">
      <!-- 3D Table Shadow Underneath Tray -->
      <view class="table-shadow" :class="{ 'shadow-active': isShaking }"></view>

      <!-- Outer Felt Tray Base (Fixed on Table) -->
      <view class="felt-tray-base" @tap="handleTrayTap">
        <!-- Tray Outer Metallic Bezel Ring -->
        <view class="tray-bezel">
          <!-- Tray Green Velvet Felt Interior -->
          <view class="tray-velvet">
            <view class="felt-stitch-ring"></view>

            <!-- Dice Scatter Zone inside Velvet Tray -->
            <view class="dice-zone" :class="{ 'is-sorted': isSorted }">
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

            <!-- Tally Summary Overlay Pill -->
            <view v-if="lidProgress >= 0.6 || isSorted" class="tally-pill glass-panel">
              <text class="tally-text">{{ tallySummary }}</text>
            </view>
          </view>
        </view>

        <!-- 3D Realistic Dice Cup (Slides Up to Peek / Shake Animation) -->
        <view
          class="cup-3d"
          :class="{
            'is-shaking': isShaking,
            'is-animating': !isDragging && !isShaking
          }"
          :style="{ transform: cupTransformStyle }"
          @touchstart="onTouchStart"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
          @touchcancel="onTouchEnd"
        >
          <!-- Cup Top Grip Knob / Crown (金顶抓钮) -->
          <view class="cup-knob">
            <view class="knob-cap"></view>
            <view class="knob-ring"></view>
          </view>

          <!-- Cup Body (Realistic 3D Bell Silhouette with Shading & Metallic Trims) -->
          <view class="cup-body">
            <!-- Top Gold Collar Ring (顶口金箍) -->
            <view class="gold-collar"></view>

            <!-- Grip Ribs & Touch Peek Indicator -->
            <view class="cup-indicator-panel">
              <view class="grip-grooves">
                <view class="groove-line"></view>
                <view class="groove-line"></view>
                <view class="groove-line"></view>
              </view>

              <view class="peek-hint-box">
                <text class="hint-arrow-icon">{{ lidProgress > 0.5 ? '⬇️' : '⬆️' }}</text>
                <text class="hint-main-text">
                  {{ lidProgress > 0.5 ? '已掀开 (下滑重新盖严)' : '按住上推偷瞄' }}
                </text>
                <text class="hint-sub-text" v-if="lidProgress <= 0.5">
                  (松手自动落盖防偷窥)
                </text>
              </view>
            </view>

            <!-- Center Luxury Gold Foil Emblem (烫金品牌徽标) -->
            <view class="cup-emblem">
              <view class="emblem-crest">
                <text class="emblem-icon">🍸</text>
                <text class="emblem-title">AFTERPARTY</text>
              </view>
              <view class="gold-waist-ribbon"></view>
            </view>

            <!-- Bottom Brushed Gold Base Lip (底座金箍) -->
            <view class="gold-base-lip"></view>
          </view>

          <!-- Cup Interior Mouth Depth Shadow (Revealed when lifted) -->
          <view v-if="lidProgress > 0.05" class="cup-mouth-shadow"></view>
        </view>
      </view>

      <!-- Privacy Status Tag -->
      <view class="privacy-status-badge">
        <view class="badge-dot" :class="{ 'dot-safe': lidProgress === 0, 'dot-open': lidProgress > 0 }"></view>
        <text class="status-desc">
          {{ lidProgress === 0 ? '🔒 骰盅已盖严 · 旁人无法偷看' : (lidProgress >= 0.75 ? '🔓 骰盅已全开 · 公开对质' : '👀 偷瞄中 · 松手自动落盖') }}
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
            <view class="step-btn" :class="{ 'is-disabled': diceCount <= 1 }" hover-class="btn-hover" @tap="changeDiceCount(-1)">
              <text class="step-icon">-</text>
            </view>
            <text class="count-val">{{ diceCount }} 颗</text>
            <view class="step-btn" :class="{ 'is-disabled': diceCount >= 12 }" hover-class="btn-hover" @tap="changeDiceCount(1)">
              <text class="step-icon">+</text>
            </view>
          </view>
        </view>

        <!-- Sort / Scatter Toggle -->
        <view class="sort-toggle-btn" :class="{ 'is-active': isSorted }" hover-class="btn-hover" @tap="toggleSort">
          <text class="sort-icon">{{ isSorted ? '📐' : '🎲' }}</text>
          <text class="sort-text">{{ isSorted ? '已理骰子' : '一键理骰' }}</text>
        </view>
      </view>

      <!-- Row 2: Action Buttons (Peek / Shake / Open) -->
      <view class="action-row">
        <!-- Toggle Lid Button (Use view to completely eliminate WeChat button clipping) -->
        <view class="peek-action-btn" hover-class="btn-hover" @tap="toggleLid">
          <text class="peek-action-icon">{{ lidProgress > 0.5 ? '🔒' : '👁️' }}</text>
          <text class="peek-action-label">{{ lidProgress > 0.5 ? '盖上' : '开盅' }}</text>
        </view>

        <!-- Big Shake Button -->
        <view
          class="btn-primary shake-action-btn"
          :class="{ 'is-disabled': isShaking }"
          hover-class="btn-hover"
          @tap="rollDice"
        >
          <text class="shake-icon">🤹</text>
          <text class="shake-text">{{ isShaking ? '正在摇骰...' : '摇一摇 (或晃动手机)' }}</text>
        </view>
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
  if (diceCount.value <= 6) return 48;
  if (diceCount.value <= 9) return 42;
  return 36;
});

// Tally Summary (e.g. "3个4 · 2个1")
const tallySummary = computed(() => {
  const counts: Record<number, number> = {};
  dice.value.forEach(d => {
    counts[d.value] = (counts[d.value] || 0) + 1;
  });

  const parts = Object.entries(counts)
    .sort((a, b) => Number(b[1]) - Number(a[1]) || Number(a[0]) - Number(b[0]))
    .map(([val, count]) => `${count}个${val}`);

  return parts.join(' · ') || '暂无骰子';
});

// Cup Transform Style
const cupTransformStyle = computed(() => {
  if (isShaking.value) {
    return ''; // Keyframe animation handles transform during shake
  }
  return `translateY(-${lidProgress.value * 115}%)`;
});

// Generate fresh dice with random points, positions and rotations
function generateDiceValues(count: number): DieData[] {
  const newDice: DieData[] = [];
  
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI + (Math.random() * 0.6 - 0.3);
    const radius = 22 + Math.random() * 42;
    
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.72;

    newDice.push({
      value: Math.floor(Math.random() * 6) + 1,
      rotation: Math.floor(Math.random() * 50) - 25,
      xPercent: Math.max(-42, Math.min(42, x)),
      yPercent: Math.max(-38, Math.min(38, y)),
    });
  }
  return newDice;
}

// Position style for each die
function getDieStyle(die: DieData, index: number) {
  if (isSorted.value) {
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
  diceSound.playShakeSequence(800);

  // Native Haptic Vibration
  try {
    uni.vibrateShort({ success: () => {}, fail: () => {} });
    setTimeout(() => {
      uni.vibrateShort({ success: () => {}, fail: () => {} });
    }, 220);
    setTimeout(() => {
      uni.vibrateShort({ success: () => {}, fail: () => {} });
    }, 480);
  } catch (e) {}

  // If lid was open, smoothly close it upon shaking to maintain secrecy
  if (lidProgress.value > 0) {
    lidProgress.value = 0;
  }

  // Generate results after shake duration
  setTimeout(() => {
    dice.value = generateDiceValues(diceCount.value);
    isShaking.value = false;

    // Send quiet background stats telemetry
    recordStats('roll', diceCount.value);
  }, 750);
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
    dice.value.sort((a, b) => a.value - b.value);
  } else {
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
  if (lidProgress.value >= 0.75) {
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
  const dragSensitivity = 0.004;
  let newProgress = startLidProgress.value - (deltaY * dragSensitivity);
  newProgress = Math.max(0, Math.min(1, newProgress));

  lidProgress.value = newProgress;
}

function onTouchEnd() {
  if (!isDragging.value) return;
  isDragging.value = false;

  // Peek Threshold Decision:
  if (startLidProgress.value === 0) {
    if (lidProgress.value >= 0.55) {
      lidProgress.value = 1;
    } else {
      lidProgress.value = 0;
    }
  } else {
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
  background: radial-gradient(circle at 50% 15%, #161A2B 0%, #0A0D16 100%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: calc(var(--status-bar-height, 20px) + 8px) 16px 24px 16px;
  overflow: hidden;
  box-sizing: border-box;
}

/* Top Navigation Bar */
.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  margin-bottom: 8px;
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
  cursor: pointer;
}

.btn-hover {
  opacity: 0.8;
  transform: scale(0.97);
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
  cursor: pointer;
}

.icon-btn.is-muted {
  background: rgba(255, 59, 48, 0.2);
  border-color: rgba(255, 59, 48, 0.4);
}

.icon-text {
  font-size: 16px;
}

/* ================= 3D Dice Cup & Arena ================= */
.stage-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 6px 0;
  position: relative;
}

.table-shadow {
  position: absolute;
  width: 280px;
  height: 35px;
  background: radial-gradient(ellipse at 50% 50%, rgba(0, 0, 0, 0.85) 0%, transparent 75%);
  bottom: 45px;
  border-radius: 50%;
  pointer-events: none;
  transition: all 0.3s ease;
}

.table-shadow.shadow-active {
  transform: scale(1.15);
  opacity: 0.6;
}

/* Outer Felt Tray Base */
.felt-tray-base {
  width: 300px;
  height: 300px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Tray Outer Metallic Bezel Ring */
.tray-bezel {
  width: 100%;
  height: 100%;
  border-radius: 46px;
  background: linear-gradient(145deg, #2D2214 0%, #15110B 50%, #0A0805 100%);
  border: 5px solid #5A4323;
  box-shadow: 
    0 18px 45px rgba(0, 0, 0, 0.95),
    inset 0 2px 4px rgba(255, 215, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  box-sizing: border-box;
}

/* Tray Green Velvet Felt Interior */
.tray-velvet {
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 50% 45%, #064E3B 0%, #032E23 70%, #011C15 100%);
  border-radius: 38px;
  box-shadow: 
    inset 0 10px 28px rgba(0, 0, 0, 0.9),
    inset 0 0 15px rgba(0, 0, 0, 0.6);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0, 245, 160, 0.15);
}

.felt-stitch-ring {
  position: absolute;
  width: 86%;
  height: 86%;
  border-radius: 30px;
  border: 1px dashed rgba(255, 215, 0, 0.25);
  pointer-events: none;
}

/* Dice Zone */
.dice-zone {
  width: 82%;
  height: 82%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.dice-zone.is-sorted {
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

.dice-zone.is-sorted .die-wrapper {
  position: static;
  transform: none !important;
}

/* Tally Pill */
.tally-pill {
  position: absolute;
  bottom: 12px;
  padding: 5px 14px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.75);
  border: 1px solid rgba(0, 245, 160, 0.5);
}

.tally-text {
  font-size: 13px;
  font-weight: 800;
  color: #00F5A0;
}

/* ================= 3D Realistic Dice Cup Body ================= */
.cup-3d {
  position: absolute;
  top: -8px;
  left: 12px;
  right: 12px;
  height: 316px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  will-change: transform;
  filter: drop-shadow(0 20px 25px rgba(0, 0, 0, 0.9));
}

.cup-3d.is-animating {
  transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1);
}

/* Energetic 3D Cup Shake Animation */
.cup-3d.is-shaking {
  animation: realisticDiceShake 0.12s infinite alternate ease-in-out;
}

@keyframes realisticDiceShake {
  0% {
    transform: translateY(-22px) rotate(-14deg) scale(1.04);
  }
  30% {
    transform: translateY(-8px) rotate(12deg) scale(1.02);
  }
  60% {
    transform: translateY(-26px) rotate(-10deg) scale(1.05);
  }
  100% {
    transform: translateY(-12px) rotate(14deg) scale(1.03);
  }
}

/* Cup Top Grip Knob (金顶把手) */
.cup-knob {
  width: 64px;
  height: 20px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2;
}

.knob-cap {
  width: 50px;
  height: 14px;
  border-radius: 10px 10px 3px 3px;
  background: linear-gradient(135deg, #FFE57F 0%, #D4AF37 45%, #8C6D15 100%);
  box-shadow: 
    0 -2px 6px rgba(255, 215, 0, 0.4),
    inset 0 1px 2px rgba(255, 255, 255, 0.8);
}

.knob-ring {
  width: 36px;
  height: 6px;
  background: linear-gradient(90deg, #5A4323, #FFE57F, #5A4323);
  border-radius: 2px;
}

/* Cup Body (Tapered 3D Bell Silhouette) */
.cup-body {
  width: 100%;
  flex: 1;
  /* 3D Cylindrical leather & metallic lighting gradient */
  background: linear-gradient(
    90deg,
    #10131C 0%,
    #252C3D 14%,
    #424D68 32%,
    #222838 58%,
    #0E1118 84%,
    #191E2A 100%
  );
  border-radius: 36px 36px 20px 20px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0 0 0;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  box-shadow: 
    inset 0 3px 5px rgba(255, 255, 255, 0.25),
    inset 0 -5px 12px rgba(0, 0, 0, 0.9);
}

/* Top Gold Collar */
.gold-collar {
  width: 90%;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(90deg, #7A5C1B 0%, #FFE57F 30%, #D4AF37 60%, #7A5C1B 100%);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
}

/* Indicator & Grip Grooves */
.cup-indicator-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.grip-grooves {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: center;
}

.groove-line {
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
  border-radius: 2px;
}

.peek-hint-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0, 0, 0, 0.45);
  padding: 6px 14px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.hint-arrow-icon {
  font-size: 18px;
  line-height: 1;
}

.hint-main-text {
  font-size: 11px;
  font-weight: 700;
  color: #E2E8F0;
  margin-top: 3px;
}

.hint-sub-text {
  font-size: 9px;
  color: #00F5A0;
  margin-top: 1px;
}

/* Center Emblem */
.cup-emblem {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-bottom: 8px;
}

.emblem-crest {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 16px;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 12px;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.emblem-icon {
  font-size: 16px;
}

.emblem-title {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #FFE57F 0%, #D4AF37 50%, #FFB800 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.gold-waist-ribbon {
  width: 82%;
  height: 2px;
  margin-top: 8px;
  background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.5), transparent);
}

/* Bottom Brushed Gold Lip */
.gold-base-lip {
  width: 100%;
  height: 12px;
  background: linear-gradient(90deg, #664B14 0%, #FFE57F 25%, #D4AF37 50%, #FFE57F 75%, #664B14 100%);
  border-radius: 0 0 20px 20px;
  box-shadow: 
    0 -1px 3px rgba(0, 0, 0, 0.6),
    inset 0 1px 2px rgba(255, 255, 255, 0.7);
}

/* Cup Interior Mouth Shadow when lifted */
.cup-mouth-shadow {
  width: 96%;
  height: 18px;
  border-radius: 50%;
  background: radial-gradient(ellipse at 50% 50%, rgba(0, 0, 0, 0.95) 0%, transparent 80%);
  margin-top: -6px;
  pointer-events: none;
}

/* Privacy Status Tag */
.privacy-status-badge {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 18px;
  background: rgba(0, 0, 0, 0.5);
  padding: 6px 16px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
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

.status-desc {
  font-size: 12px;
  color: #CBD5E0;
  font-weight: 600;
}

/* ================= Bottom Controls Section ================= */
.controls-section {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  background: rgba(255, 255, 255, 0.12);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.step-btn.is-disabled {
  opacity: 0.3;
  pointer-events: none;
}

.step-icon {
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
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
  cursor: pointer;
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

/* Left Peek Action Button: Styled as a custom view, completely immune to WeChat button font-clipping */
.peek-action-btn {
  width: 86px;
  height: 52px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  box-sizing: border-box;
}

.peek-action-icon {
  font-size: 18px;
  line-height: 1;
}

.peek-action-label {
  font-size: 12px;
  font-weight: 700;
  color: #FFFFFF;
  line-height: 1.2;
}

/* Shake Action Button */
.shake-action-btn {
  flex: 1;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 14px;
  cursor: pointer;
}

.shake-action-btn.is-disabled {
  opacity: 0.65;
  pointer-events: none;
}

.shake-icon {
  font-size: 20px;
  line-height: 1;
}

.shake-text {
  font-size: 15px;
  font-weight: 800;
  line-height: 1;
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
