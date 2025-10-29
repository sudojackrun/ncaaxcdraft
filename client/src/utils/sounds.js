// 🎮 Retro 8-bit Sound Effects Generator
// Uses Web Audio API to create retro game sounds

class SoundEffects {
  constructor() {
    this.context = null;
    this.enabled = true;
    this.volume = 0.3;
    this.initAudioContext();
  }

  initAudioContext() {
    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
      this.enabled = false;
    }
  }

  // Resume audio context (required for user interaction)
  resume() {
    if (this.context && this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  // Create oscillator with envelope
  createTone(frequency, duration, type = 'square', volume = this.volume) {
    if (!this.enabled || !this.context) return;

    this.resume();

    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    // Envelope for retro sound
    const now = this.context.currentTime;
    gainNode.gain.value = 0;
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  // 🎯 Button Click - Quick blip
  click() {
    this.createTone(800, 0.05, 'square', this.volume * 0.8);
  }

  // ✨ Button Hover - Soft beep
  hover() {
    this.createTone(600, 0.03, 'sine', this.volume * 0.5);
  }

  // ✅ Success - Rising tones
  success() {
    if (!this.enabled || !this.context) return;
    this.createTone(523, 0.1, 'square');
    setTimeout(() => this.createTone(659, 0.1, 'square'), 80);
    setTimeout(() => this.createTone(784, 0.15, 'square'), 160);
  }

  // ❌ Error - Descending buzz
  error() {
    if (!this.enabled || !this.context) return;
    this.createTone(400, 0.1, 'sawtooth');
    setTimeout(() => this.createTone(300, 0.1, 'sawtooth'), 80);
    setTimeout(() => this.createTone(200, 0.15, 'sawtooth'), 160);
  }

  // 🏃 Draft Pick - Coin collect sound
  draftPick() {
    if (!this.enabled || !this.context) return;
    this.createTone(988, 0.08, 'square');
    setTimeout(() => this.createTone(1319, 0.12, 'square'), 60);
  }

  // 🎮 Start Draft - Power up
  startDraft() {
    if (!this.enabled || !this.context) return;
    const frequencies = [262, 330, 392, 523];
    frequencies.forEach((freq, i) => {
      setTimeout(() => this.createTone(freq, 0.1, 'square'), i * 60);
    });
  }

  // 🏆 Complete Draft - Victory fanfare
  completeDraft() {
    if (!this.enabled || !this.context) return;
    const melody = [523, 523, 523, 659, 784, 784, 659, 523];
    const durations = [0.15, 0.15, 0.15, 0.3, 0.15, 0.15, 0.3, 0.4];

    melody.forEach((freq, i) => {
      const delay = durations.slice(0, i).reduce((a, b) => a + b, 0) * 1000;
      setTimeout(() => this.createTone(freq, durations[i], 'square'), delay);
    });
  }

  // 📊 Page Navigate - Whoosh
  navigate() {
    if (!this.enabled || !this.context) return;
    this.createTone(1200, 0.08, 'sine', this.volume * 0.6);
    setTimeout(() => this.createTone(800, 0.08, 'sine', this.volume * 0.4), 40);
  }

  // ⚠️ Warning - Alert beep
  warning() {
    if (!this.enabled || !this.context) return;
    this.createTone(880, 0.1, 'square');
    setTimeout(() => this.createTone(880, 0.1, 'square'), 150);
  }

  // 🔄 Refresh/Load - Spin sound
  refresh() {
    if (!this.enabled || !this.context) return;
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        this.createTone(600 + i * 50, 0.05, 'sine', this.volume * 0.5);
      }, i * 30);
    }
  }

  // 💾 Save - Quick confirmation
  save() {
    if (!this.enabled || !this.context) return;
    this.createTone(1047, 0.08, 'square');
    setTimeout(() => this.createTone(1319, 0.12, 'square'), 70);
  }

  // 🗑️ Delete - Descending whoosh
  delete() {
    if (!this.enabled || !this.context) return;
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        this.createTone(800 - i * 60, 0.03, 'sawtooth', this.volume * 0.6);
      }, i * 15);
    }
  }

  // ⌨️ Keyboard typing - Mechanical keyboard click
  keyPress() {
    if (!this.enabled || !this.context) return;
    // Vary the frequency slightly for each keypress (more realistic)
    const baseFreq = 800;
    const variation = Math.random() * 100 - 50; // +/- 50Hz
    this.createTone(baseFreq + variation, 0.02, 'square', this.volume * 0.3);
  }

  // ⏎ Enter key - Special satisfying sound
  keyEnter() {
    if (!this.enabled || !this.context) return;
    this.createTone(600, 0.05, 'square', this.volume * 0.4);
    setTimeout(() => this.createTone(800, 0.08, 'square', this.volume * 0.4), 30);
  }

  // ⌫ Backspace - Lower pitch delete sound
  keyBackspace() {
    if (!this.enabled || !this.context) return;
    this.createTone(400, 0.04, 'square', this.volume * 0.3);
  }

  // 🔤 Space bar - Deeper thunk sound
  keySpace() {
    if (!this.enabled || !this.context) return;
    this.createTone(300, 0.03, 'square', this.volume * 0.35);
  }

  // Toggle sound on/off
  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.success();
    }
    return this.enabled;
  }

  // Set volume (0-1)
  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }
}

// Create singleton instance
const sounds = new SoundEffects();

export default sounds;
