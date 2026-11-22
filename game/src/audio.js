// VEIL — all sound is synthesized with WebAudio: no audio files, no network.
// Footsteps, the alert sting, pickup chimes and a low ambient drone.

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.ambient = null;
  }

  ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.startAmbient();
      } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  startAmbient() {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 55;
    gain.gain.value = 0.035;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(); lfo.start();
    this.ambient = { osc, lfo, gain };
  }

  blip(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol || 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  step(kind) {
    if (kind === 'run') this.blip(140, 0.07, 'triangle', 0.10, 90);
    else if (kind === 'walk') this.blip(110, 0.06, 'triangle', 0.06, 80);
    // Sneak steps are silent on purpose.
  }

  pickup() {
    this.blip(660, 0.12, 'sine', 0.14);
    setTimeout(() => this.blip(990, 0.18, 'sine', 0.14), 90);
  }

  alert() {
    this.blip(220, 0.25, 'sawtooth', 0.12, 440);
    setTimeout(() => this.blip(330, 0.3, 'sawtooth', 0.10, 220), 120);
  }

  suspicious() {
    this.blip(440, 0.15, 'square', 0.05, 330);
  }

  caught() {
    this.blip(160, 0.5, 'sawtooth', 0.14, 60);
  }

  complete() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.22, 'sine', 0.13), i * 110));
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}
