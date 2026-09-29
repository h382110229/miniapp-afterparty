<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';
import { useUserStore } from './stores/user';

onLaunch(() => {
  console.log('[AfterParty] App launched');
  const userStore = useUserStore();
  userStore.initUser();
});
</script>

<style>
/* Global Cyber Lounge & Stitch UI Theme */
page {
  background-color: #0B0E17;
  color: #E2E8F0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  min-height: 100vh;
  box-sizing: border-box;
}

view, text, button, input {
  box-sizing: border-box;
}

/* Glassmorphism panel */
.glass-panel {
  background: rgba(22, 27, 46, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
}

/* Neon Glow Accents */
.neon-glow-emerald {
  box-shadow: 0 0 20px rgba(0, 245, 160, 0.35);
  border-color: rgba(0, 245, 160, 0.6) !important;
}

.neon-glow-magenta {
  box-shadow: 0 0 20px rgba(255, 0, 127, 0.35);
  border-color: rgba(255, 0, 127, 0.6) !important;
}

.neon-glow-gold {
  box-shadow: 0 0 25px rgba(255, 215, 0, 0.6);
  border-color: rgba(255, 215, 0, 0.8) !important;
}

/* Buttons */
.btn-primary {
  background: linear-gradient(135deg, #00F5A0 0%, #00D9F5 100%);
  color: #0B0E17;
  font-weight: 700;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(0, 245, 160, 0.25);
  border: none;
}

.btn-primary:active {
  transform: scale(0.97);
  opacity: 0.9;
}

.btn-danger {
  background: linear-gradient(135deg, #FF007F 0%, #7928CA 100%);
  color: #FFFFFF;
  font-weight: 700;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(255, 0, 127, 0.25);
  border: none;
}

.btn-danger:active {
  transform: scale(0.97);
  opacity: 0.9;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #FFFFFF;
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-weight: 600;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-secondary:active {
  background: rgba(255, 255, 255, 0.14);
}
</style>
