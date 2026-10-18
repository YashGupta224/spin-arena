/**
 * Tiny synthesized hits so the arena has feedback without audio files.
 * Audio starts after the first click (browser autoplay rule).
 */
const SFX = {
  ctx: null,

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  tone(freq, dur, type, gain) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    amp.gain.setValueAtTime(gain || 0.04, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(amp);
    amp.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  },

  slash() {
    this.tone(180, 0.08, 'sawtooth', 0.035);
  },

  shot() {
    this.tone(640, 0.05, 'square', 0.03);
  },

  hit() {
    this.tone(120, 0.09, 'triangle', 0.05);
  },

  boom() {
    this.tone(70, 0.28, 'sawtooth', 0.06);
  },
};
