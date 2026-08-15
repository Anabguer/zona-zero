/**
 * Audio opcional Zona Zero — tonos generados (Web Audio API), sin assets externos.
 */
let ctx = null;
let enabled = true;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function beep(freq, dur, type = 'sine', gain = 0.04, slide = 0) {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  if (slide) o.frequency.linearRampToValueAtTime(freq + slide, c.currentTime + dur);
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur + 0.02);
}

export function setSoundEnabled(on) {
  enabled = !!on;
  try {
    localStorage.setItem('zz-sound', enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function isSoundEnabled() {
  try {
    const v = localStorage.getItem('zz-sound');
    if (v == null) return true;
    return v === '1';
  } catch {
    return true;
  }
}

export function initSound() {
  enabled = isSoundEnabled();
}

export const sfx = {
  click: () => beep(420, 0.05, 'triangle', 0.03),
  build: () => {
    beep(180, 0.08, 'square', 0.035);
    setTimeout(() => beep(260, 0.1, 'square', 0.03), 60);
  },
  expedition: () => beep(300, 0.12, 'sawtooth', 0.025, 80),
  discover: () => {
    beep(520, 0.1, 'sine', 0.04);
    setTimeout(() => beep(720, 0.15, 'sine', 0.035), 90);
  },
  alert: () => beep(160, 0.2, 'square', 0.04, -40),
  attack: () => {
    beep(90, 0.25, 'sawtooth', 0.05);
    setTimeout(() => beep(70, 0.2, 'square', 0.04), 100);
  },
  victory: () => {
    [400, 500, 600, 800].forEach((f, i) => setTimeout(() => beep(f, 0.18, 'sine', 0.045), i * 120));
  },
  good: () => beep(660, 0.1, 'sine', 0.035),
  bad: () => beep(140, 0.18, 'triangle', 0.04),
  era: () => {
    [330, 415, 523].forEach((f, i) => setTimeout(() => beep(f, 0.2, 'sine', 0.04), i * 140));
  },
};
