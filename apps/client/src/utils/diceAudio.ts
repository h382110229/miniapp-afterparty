/**
 * Realistic procedural dice sound synthesizer for AfterParty
 * Zero network dependencies, zero asset loading delay, supports H5 & WeChat Mini Program.
 */

class DiceSoundManager {
  private ctx: any = null;
  private isMuted: boolean = false;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    try {
      // 1. WeChat Mini Program WebAudio
      // @ts-ignore
      if (typeof wx !== 'undefined' && wx.createWebAudioContext) {
        // @ts-ignore
        this.ctx = wx.createWebAudioContext();
      } else if (typeof window !== 'undefined') {
        // 2. Standard Web Audio API for H5 / browsers
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      }
    } catch (e) {
      console.warn('[DiceSound] Failed to initialize Web Audio Context:', e);
    }
  }

  private ensureContext(): boolean {
    if (!this.ctx) {
      this.initAudioContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return !!this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Synthesize a single plastic dice collision click
   */
  private playClick(timeOffset: number = 0, pitchFactor: number = 1, volume: number = 0.5) {
    if (!this.ensureContext() || this.isMuted) return;

    try {
      const now = this.ctx.currentTime + timeOffset;

      // Noise burst for sharp plastic impact
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.025); // 25ms
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      // Bandpass filter to model dice resin/acrylic material resonance (2800Hz - 4200Hz)
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime((3200 + Math.random() * 1200) * pitchFactor, now);
      filter.Q.setValueAtTime(4.5, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume * 0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.03);

      // Low wooden/leather cup resonance thud
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180 + Math.random() * 80, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.03);

      oscGain.gain.setValueAtTime(volume * 0.25, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {
      // Audio autoplay restrictions or context error
    }
  }

  /**
   * Play continuous dice rolling rattle in cup (lasts ~700ms - 1000ms)
   */
  public playShakeSequence(durationMs: number = 800) {
    if (!this.ensureContext() || this.isMuted) return;

    const count = Math.floor(durationMs / 45); // ~15-20 collision clicks
    for (let i = 0; i < count; i++) {
      const delay = (i * 0.045) + (Math.random() * 0.02 - 0.01);
      const intensity = 0.3 + Math.random() * 0.6;
      const pitch = 0.85 + Math.random() * 0.35;
      this.playClick(Math.max(0, delay), pitch, intensity);
    }

    // End with a distinctive landing cup slam
    setTimeout(() => {
      this.playSlam();
    }, durationMs - 50);
  }

  /**
   * Play final cup slam on the table
   */
  public playSlam() {
    if (!this.ensureContext() || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      // Heavy low thud
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);

      // Micro dice clack upon slamming
      this.playClick(0.01, 1.1, 0.7);
      this.playClick(0.025, 0.95, 0.5);
    } catch (e) {}
  }
}

export const diceSound = new DiceSoundManager();
