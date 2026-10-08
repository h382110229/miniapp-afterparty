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
        <text class="title-sub">Stitch UI · 3D 拟真钟罩摇盅</text>
      </view>

      <view class="nav-actions">
        <!-- Sound Mute Toggle -->
        <view class="icon-btn" :class="{ 'is-muted': isMuted }" hover-class="btn-hover" @tap="toggleMute">
          <text class="icon-text">{{ isMuted ? '🔇' : '🔊' }}</text>
        </view>
      </view>
    </view>

    <!-- Main 3D Stage Section -->
    <view class="stage-section">
      <view class="table-stage-box">
        <!-- 3D Table Surface Contact Shadow -->
        <view
          class="table-contact-shadow"
          :class="{ 'shadow-shaking': isShaking, 'shadow-lifted': lidProgress > 0.1 }"
        ></view>

        <!-- 3D Perspective Velvet Base Tray (Fixed on table) -->
        <view class="perspective-tray" @tap="handleTrayTap">
          <view class="tray-outer-bezel">
            <view class="tray-velvet-surface">
              <view class="tray-stitch-ring"></view>

              <!-- Dice Scatter Zone inside Velvet -->
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

              <!-- Tally Summary Pill Overlay -->
              <view v-if="lidProgress >= 0.55 || isSorted" class="tally-pill glass-panel">
                <text class="tally-text">{{ tallySummary }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- ================= 3D Solid Luxury Bell Cup (Lifts off Tray) ================= -->
        <view
          class="bell-cup-container"
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
          <!-- Cup Top Finial Knob (金属抓钮) -->
          <view class="knob-assembly">
            <view class="knob-sphere"></view>
            <view class="knob-collar"></view>
          </view>

          <!-- Cup Top Dome (Round Elliptical Cap) -->
          <view class="cup-top-dome">
            <view class="dome-gold-band"></view>
          </view>

          <!-- Cup Solid Tapered Body (100% Solid Leather & Metallic Silhouette) -->
          <view class="cup-tapered-body">
            <!-- Mid-Body Champagne Gold Waist Band with Rivets -->
            <view class="gold-waist-belt">
              <view class="belt-rivet"></view>
              <view class="belt-rivet"></view>
              <view class="belt-rivet"></view>
            </view>

            <!-- Subtle Luxury Embossed Leather Seal (Clean, NO text boxes!) -->
            <view class="embossed-leather-crest">
              <view class="crest-inner-ring">
                <text class="crest-icon">🍸</text>
              </view>
            </view>

            <!-- Discreet Micro Peek Hint Chevron (Soft Breathing Indicator) -->
            <view class="micro-peek-hint" :class="{ 'is-hidden': lidProgress > 0.05 }">
              <text class="hint-chevron">▲</text>
            </view>
          </view>

          <!-- Bottom Flanged Gold Lip (底座厚实金圈) -->
          <view class="cup-bottom-lip"></view>

          <!-- Cup Interior Mouth Shadow (Visible when lifted off table) -->
          <view v-if="lidProgress > 0.05" class="cup-mouth-shadow"></view>
        </view>
      </view>

      <!-- Privacy Status Tag -->
      <view class="privacy-status-badge">
        <view class="badge-dot" :class="{ 'dot-safe': lidProgress === 0, 'dot-open': lidProgress > 0 }"></view>
        <text class="status-desc">
          {{ lidProgress === 0 ? '🔒 骰盅已盖严 · 向上滑动或点击开盅' : (lidProgress >= 0.7 ? '🔓 骰盅已全开 · 点击盖严' : '👀 偷瞄中 · 松手自动落盖') }}
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
        <!-- Toggle Lid Button (View container completely immune to WeChat clipping) -->
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
  if (diceCount.value <= 9) return 40;
  return 34;
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

// Cup Transform Style: lifts off the 3D perspective tray
const cupTransformStyle = computed(() => {
  if (isShaking.value) {
    return ''; // Keyframe handles violent shake & rock
  }
  return `translateY(-${lidProgress.value * 210}px)`;
});

// Generate fresh dice with random points inside 3D elliptical bounds
function generateDiceValues(count: number): DieData[] {
  const newDice: DieData[] = [];
  
  for (let i = 0; i < count; i++) {
    // Distribute naturally inside 3D perspective elliptical bounds
    const angle = (i / count) * 2 * Math.PI + (Math.random() * 0.8 - 0.4);
    const radius = 16 + Math.random() * 36;
    
    const x = Math.cos(angle) * radius * 1.25;
    const y = Math.sin(angle) * radius * 0.42;

    newDice.push({
      value: Math.floor(Math.random() * 6) + 1,
      rotation: Math.floor(Math.random() * 40) - 20,
      xPercent: Math.max(-56, Math.min(56, Math.round(x))),
      yPercent: Math.max(-18, Math.min(18, Math.round(y))),
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

  // Realistic Audio Sequence
  diceSound.playShakeSequence(820);

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
  }, 780);
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
    dice.value = dice.value.map((d, i) => {
      const angle = (i / dice.value.length) * 2 * Math.PI + (Math.random() * 0.8 - 0.4);
      const radius = 16 + Math.random() * 36;
      return {
        ...d,
        rotation: Math.floor(Math.random() * 40) - 20,
        xPercent: Math.max(-56, Math.min(56, Math.round(Math.cos(angle) * radius * 1.25))),
        yPercent: Math.max(-18, Math.min(18, Math.round(Math.sin(angle) * radius * 0.42))),
      };
    });
  }
}

// Toggle Lid between closed and fully open
function toggleLid() {
  lidProgress.value = lidProgress.value > 0.5 ? 0 : 1;
}

// Handle tap on tray
function handleTrayTap() {
  if (lidProgress.value >= 0.7) {
    lidProgress.value = 0;
  }
}

// Touch Gestures on Bell Cup Lid
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
    if (lidProgress.value >= 0.5) {
      lidProgress.value = 1;
    } else {
      lidProgress.value = 0;
    }
  } else {
    if (lidProgress.value <= 0.5) {
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
  background: radial-gradient(circle at 50% 12%, #141828 0%, #080B14 100%);
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
  margin-bottom: 6px;
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

/* ================= 3D Realistic Bar Stage ================= */
.stage-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 6px 0;
  position: relative;
  min-height: 350px;
}

.table-stage-box {
  width: 300px;
  height: 300px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end; /* Table elements rest on the surface */
}

/* Table Surface Contact Shadow */
.table-contact-shadow {
  position: absolute;
  bottom: 6px;
  width: 290px;
  height: 42px;
  background: radial-gradient(ellipse at 50% 50%, rgba(0, 0, 0, 0.95) 0%, transparent 75%);
  border-radius: 50%;
  pointer-events: none;
  transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
  z-index: 1;
}

.table-contact-shadow.shadow-shaking {
  transform: scale(1.22);
  opacity: 0.7;
}

.table-contact-shadow.shadow-lifted {
  opacity: 0.35;
  transform: scale(0.92);
}

/* 3D Perspective Elliptical Velvet Base Tray (Fixed flat on table) */
.perspective-tray {
  width: 280px;
  height: 104px;
  position: absolute;
  bottom: 12px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tray-outer-bezel {
  width: 100%;
  height: 100%;
  border-radius: 50%; /* 3D Ellipse via ratio */
  background: linear-gradient(180deg, #4E381A 0%, #241A0C 40%, #0D0904 100%);
  border: 3.5px solid #C5A059;
  box-shadow: 
    0 20px 42px rgba(0, 0, 0, 0.95),
    0 4px 10px rgba(0, 0, 0, 0.8),
    inset 0 2px 5px rgba(255, 230, 150, 0.65),
    inset 0 -5px 8px rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 14px;
  box-sizing: border-box;
  position: relative;
}

.tray-velvet-surface {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(ellipse at 50% 45%, #084D3B 0%, #032E23 65%, #011812 100%);
  box-shadow: 
    inset 0 8px 20px rgba(0, 0, 0, 0.92),
    inset 0 0 10px rgba(0, 0, 0, 0.8);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0, 245, 160, 0.25);
}

.tray-stitch-ring {
  position: absolute;
  width: 88%;
  height: 82%;
  border-radius: 50%;
  border: 1px dashed rgba(212, 175, 55, 0.35);
  pointer-events: none;
}

/* Dice Scatter Zone inside Velvet */
.dice-scatter-zone {
  width: 82%;
  height: 70%;
  border-radius: 50%;
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
  gap: 8px;
}

.die-wrapper {
  position: absolute;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.7));
}

.dice-scatter-zone.is-sorted .die-wrapper {
  position: static;
  transform: none !important;
}

/* Tally Pill */
.tally-pill {
  position: absolute;
  bottom: 4px;
  padding: 3px 14px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.85);
  border: 1px solid rgba(0, 245, 160, 0.55);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.7);
}

.tally-text {
  font-size: 13px;
  font-weight: 800;
  color: #00F5A0;
}

/* ================= 3D Solid Luxury Bell Cup ================= */
.bell-cup-container {
  position: absolute;
  bottom: 12px;
  width: 274px;
  height: 246px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  will-change: transform;
  filter: drop-shadow(0 22px 35px rgba(0, 0, 0, 0.98));
}

.bell-cup-container.is-animating {
  transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1);
}

/* Violent Bar Dice Cup Shaking Animation */
.bell-cup-container.is-shaking {
  animation: violentBellShake 0.11s infinite alternate ease-in-out;
}

@keyframes violentBellShake {
  0% {
    transform: translateY(-28px) rotate(-18deg) scale(1.06);
  }
  30% {
    transform: translateY(-8px) rotate(16deg) scale(1.02);
  }
  60% {
    transform: translateY(-34px) rotate(-14deg) scale(1.08);
  }
  100% {
    transform: translateY(-14px) rotate(18deg) scale(1.04);
  }
}

/* Top Finial Grip Knob */
.knob-assembly {
  width: 46px;
  height: 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 5;
  margin-bottom: -3px;
}

.knob-sphere {
  width: 36px;
  height: 16px;
  border-radius: 50% 50% 6px 6px;
  background: linear-gradient(135deg, #FFE57F 0%, #D4AF37 45%, #7D5C10 100%);
  box-shadow: 
    0 -2px 6px rgba(255, 215, 0, 0.5),
    inset 0 1px 2px rgba(255, 255, 255, 0.9);
}

.knob-collar {
  width: 24px;
  height: 5px;
  background: linear-gradient(90deg, #5A4323, #FFE57F, #5A4323);
  border-radius: 2px;
}

/* Cup Top Dome (Elliptical Cap) */
.cup-top-dome {
  width: 196px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(180deg, #3C4864 0%, #1A2130 75%, #0E121B 100%);
  border: 2px solid #C5A059;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.7);
  margin-bottom: -16px;
  z-index: 4;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dome-gold-band {
  width: 80%;
  height: 3px;
  background: linear-gradient(90deg, transparent, rgba(255, 224, 130, 0.8), transparent);
}

/* Cup Tapered Body (Solid 100% Opaque Material with 3D Shading) */
.cup-tapered-body {
  width: 272px;
  height: 192px;
  background: linear-gradient(
    90deg,
    #0A0D15 0%,
    #171E2D 14%,
    #323D57 35%,
    #4A587A 50%,
    #232C3E 65%,
    #0D111A 85%,
    #151B27 100%
  );
  clip-path: polygon(14% 0%, 86% 0%, 100% 100%, 0% 100%);
  -webkit-clip-path: polygon(14% 0%, 86% 0%, 100% 100%, 0% 100%);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 24px 0 16px 0;
  box-sizing: border-box;
  box-shadow: inset 0 0 25px rgba(0, 0, 0, 0.85);
  z-index: 3;
}

/* Golden Waist Belt with Rivets */
.gold-waist-belt {
  width: 86%;
  height: 7px;
  background: linear-gradient(90deg, #7A5A18 0%, #FFDF73 25%, #CAA132 50%, #FFF0A8 75%, #6F4F13 100%);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 24px;
  box-sizing: border-box;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
}

.belt-rivet {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #FFFFFF 0%, #FFE082 50%, #7A5A18 100%);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

/* Subtle Luxury Embossed Leather Seal */
.embossed-leather-crest {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
}

.crest-inner-ring {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 40%, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0.6) 80%);
  border: 1px solid rgba(212, 175, 55, 0.35);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.8), 0 2px 6px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.crest-icon {
  font-size: 20px;
  opacity: 0.9;
}

/* Discreet Micro Peek Hint Chevron */
.micro-peek-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.5;
  transition: opacity 0.25s ease;
  animation: gentleBreathe 2s ease-in-out infinite alternate;
}

.micro-peek-hint.is-hidden {
  opacity: 0;
}

.hint-chevron {
  font-size: 11px;
  color: #C5A059;
  letter-spacing: 1px;
}

@keyframes gentleBreathe {
  0% { transform: translateY(0); opacity: 0.3; }
  100% { transform: translateY(-4px); opacity: 0.7; }
}

/* Bottom Flanged Gold Lip */
.cup-bottom-lip {
  width: 274px;
  height: 24px;
  border-radius: 0 0 50% 50% / 0 0 20px 20px;
  background: linear-gradient(90deg, #7A5A18 0%, #FFDF73 22%, #CAA132 50%, #FFF0A8 78%, #6F4F13 100%);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.95), inset 0 2px 4px rgba(255, 255, 255, 0.8);
  margin-top: -8px;
  z-index: 2;
}

/* Cup Interior Mouth Shadow when lifted */
.cup-mouth-shadow {
  width: 265px;
  height: 26px;
  border-radius: 50%;
  background: radial-gradient(ellipse at 50% 50%, rgba(10, 13, 21, 0.98) 0%, rgba(4, 6, 10, 0.85) 60%, transparent 100%);
  margin-top: -13px;
  pointer-events: none;
}

/* Privacy Status Tag */
.privacy-status-badge {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 14px;
  background: rgba(0, 0, 0, 0.55);
  padding: 6px 16px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
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
