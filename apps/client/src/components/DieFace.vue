<template>
  <view 
    class="die-box"
    :class="{ 'die-highlight': highlight }"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      transform: `rotate(${rotation}deg)`
    }"
  >
    <!-- Dot 1: Large Red Center Dot -->
    <view v-if="value === 1" class="pip-layout layout-1">
      <view class="pip pip-large pip-red"></view>
    </view>

    <!-- Dot 2: Two Black Dots Diagonally -->
    <view v-else-if="value === 2" class="pip-layout layout-2">
      <view class="pip pip-black top-left"></view>
      <view class="pip pip-black bottom-right"></view>
    </view>

    <!-- Dot 3: Three Black Dots Diagonally -->
    <view v-else-if="value === 3" class="pip-layout layout-3">
      <view class="pip pip-black top-left"></view>
      <view class="pip pip-black center"></view>
      <view class="pip pip-black bottom-right"></view>
    </view>

    <!-- Dot 4: Four Red Dots (Bar Dice Standard) -->
    <view v-else-if="value === 4" class="pip-layout layout-4">
      <view class="pip pip-red top-left"></view>
      <view class="pip pip-red top-right"></view>
      <view class="pip pip-red bottom-left"></view>
      <view class="pip pip-red bottom-right"></view>
    </view>

    <!-- Dot 5: Four Black Dots + 1 Center Red Dot -->
    <view v-else-if="value === 5" class="pip-layout layout-5">
      <view class="pip pip-black top-left"></view>
      <view class="pip pip-black top-right"></view>
      <view class="pip pip-red center"></view>
      <view class="pip pip-black bottom-left"></view>
      <view class="pip pip-black bottom-right"></view>
    </view>

    <!-- Dot 6: Six Black Dots (2x3) -->
    <view v-else-if="value === 6" class="pip-layout layout-6">
      <view class="col">
        <view class="pip pip-black"></view>
        <view class="pip pip-black"></view>
        <view class="pip pip-black"></view>
      </view>
      <view class="col">
        <view class="pip pip-black"></view>
        <view class="pip pip-black"></view>
        <view class="pip pip-black"></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    value: number;
    size?: number;
    rotation?: number;
    highlight?: boolean;
  }>(),
  {
    size: 56,
    rotation: 0,
    highlight: false,
  }
);
</script>

<style scoped>
.die-box {
  background: linear-gradient(155deg, #FFFFFF 0%, #F5F7FA 55%, #E2E6EE 100%);
  border-radius: 10px;
  box-shadow: 
    0 6px 14px rgba(0, 0, 0, 0.65),
    0 2px 4px rgba(0, 0, 0, 0.4),
    inset 0 1.5px 2px rgba(255, 255, 255, 1),
    inset 0 -2px 3px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  user-select: none;
  border: 1px solid rgba(210, 218, 230, 0.95);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
}

.die-highlight {
  box-shadow: 
    0 0 15px rgba(0, 245, 160, 0.8),
    0 4px 10px rgba(0, 0, 0, 0.4),
    inset 0 1px 2px rgba(255, 255, 255, 0.9);
  border-color: #00F5A0;
}

.pip-layout {
  width: 100%;
  height: 100%;
  padding: 18%;
  position: relative;
  box-sizing: border-box;
}

/* Pips */
.pip {
  width: 22%;
  height: 22%;
  border-radius: 50%;
  position: absolute;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
}

.pip-large {
  width: 38%;
  height: 38%;
}

.pip-red {
  background: radial-gradient(circle at 35% 35%, #FF3B30 0%, #D70015 100%);
}

.pip-black {
  background: radial-gradient(circle at 35% 35%, #333338 0%, #111113 100%);
}

/* Specific Positions */
.layout-1 {
  display: flex;
  align-items: center;
  justify-content: center;
}
.layout-1 .pip-large {
  position: static;
}

.top-left {
  top: 18%;
  left: 18%;
}
.top-right {
  top: 18%;
  right: 18%;
}
.center {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.bottom-left {
  bottom: 18%;
  left: 18%;
}
.bottom-right {
  bottom: 18%;
  right: 18%;
}

/* 6 Dots layout */
.layout-6 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16% 20%;
}
.layout-6 .col {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}
.layout-6 .col .pip {
  position: static;
  width: 12px;
  height: 12px;
}
</style>
