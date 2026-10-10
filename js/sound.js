/* Soft typewriter sounds, synthesised with the Web Audio API (no audio files to load).
   Every hit is a tiny filtered noise burst plus a low "thock", randomised slightly so
   fast typing never sounds mechanical. Everything runs through a low-pass for a mellow tone. */
(() => {
  const Sound = {
    ctx: null,
    master: null,
    noise: null,
    enabled: true,
    volume: 0.5,
    profile: 'typewriter',

    configure({ enabled, volume, profile }) {
      if (enabled !== undefined) this.enabled = enabled;
      if (volume !== undefined) this.volume = volume;
      if (profile !== undefined) this.profile = profile;
      if (this.master) this.master.gain.value = this.volume * 0.55;
    },

    // Browsers only allow audio after a user gesture, so this is called from key/click handlers.
    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
        // Band-limit the output: cut the rumble below 300 Hz and the hiss above 7 kHz.
        const thin = this.ctx.createBiquadFilter();
        thin.type = 'highpass';
        thin.frequency.value = 300;
        const soften = this.ctx.createBiquadFilter();
        soften.type = 'lowpass';
        soften.frequency.value = 7000;
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume * 0.55;
        this.master.connect(thin).connect(soften).connect(this.ctx.destination);

        const length = this.ctx.sampleRate;
        this.noise = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    },

    _burst(t, { freq, q = 1, gain, dur, type = 'bandpass' }) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      const filter = this.ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = q;
      const amp = this.ctx.createGain();
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.exponentialRampToValueAtTime(gain, t + 0.003);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filter).connect(amp).connect(this.master);
      src.start(t, Math.random() * 0.8, dur + 0.02);
    },

    _tone(t, { from, to = from, gain, dur, type = 'sine', attack = 0.003 }) {
      const osc = this.ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(from, t);
      if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
      const amp = this.ctx.createGain();
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.exponentialRampToValueAtTime(gain, t + attack);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(amp).connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },

    play(kind) {
      if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
      const t = this.ctx.currentTime;
      const r = 0.92 + Math.random() * 0.16;   // per-hit pitch jitter
      const v = 0.9 + Math.random() * 0.2;     // per-hit loudness jitter
      const typewriter = this.profile === 'typewriter';

      switch (kind) {
        case 'key': // a bright, light "tik" with a small woody "tok" underneath
          this._burst(t, { freq: (typewriter ? 3400 : 2400) * r, q: 1.4, gain: (typewriter ? 0.4 : 0.26) * v, dur: typewriter ? 0.03 : 0.04 });
          this._tone(t, { from: (typewriter ? 900 : 650) * r, to: typewriter ? 560 : 420, gain: 0.12 * v, dur: 0.045 });
          if (typewriter) this._tone(t, { from: 4300 * r, to: 3700, gain: 0.025 * v, dur: 0.015, type: 'triangle' });
          break;
        case 'space': // a slightly rounder, still mid-range tap
          this._burst(t, { freq: 1700 * r, q: 0.9, gain: 0.3 * v, dur: 0.05 });
          this._tone(t, { from: 480 * r, to: 300, gain: 0.16 * v, dur: 0.07 });
          break;
        case 'error': // a dull little tap, clearly different but not harsh
          this._burst(t, { freq: 1100, q: 0.7, gain: 0.2, dur: 0.05, type: 'lowpass' });
          this._tone(t, { from: 340 * r, to: 240, gain: 0.12, dur: 0.06, type: 'triangle' });
          break;
        case 'back':
          this._burst(t, { freq: 4200, q: 2, gain: 0.12 * v, dur: 0.018 });
          break;
        case 'return': // paragraph break: carriage slide and a faint bell
          this._burst(t, { freq: 2600, q: 0.6, gain: 0.26, dur: 0.12 });
          this._tone(t, { from: 560, to: 340, gain: 0.16, dur: 0.09 });
          this._tone(t + 0.04, { from: 1318, gain: 0.025, dur: 0.6, attack: 0.005 });
          break;
        case 'page':
          this._tone(t, { from: 1318, gain: 0.035, dur: 0.7, attack: 0.005 });
          this._tone(t, { from: 1976, gain: 0.012, dur: 0.45, attack: 0.005 });
          break;
        case 'done':
          [1046, 1318, 1568].forEach((f, i) => this._tone(t + i * 0.16, { from: f, gain: 0.045, dur: 1.1, attack: 0.01 }));
          break;
      }
    }
  };

  window.TX = window.TX || {};
  window.TX.Sound = Sound;
})();
