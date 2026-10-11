/**
 * Sound effects synthesised with Web Audio (no files), 8-bit flavoured but layered for punch:
 * every effect mixes a transient, a body and a low end, with small random pitch changes so
 * repeats don't get tiring. iOS needs a tap first: call unlock().
 */
let ac = null, out = null, verb = null, noiseBuf = null;
export const audio = { enabled: true, vibration: true };

import { music } from './music.js';
export function unlock() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC();
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.002; comp.release.value = 0.12;
    out = ac.createGain(); out.gain.value = 0.9; out.connect(comp).connect(ac.destination);
    // Short room reverb from decaying noise.
    const len = Math.floor(ac.sampleRate * 0.7), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    verb = ac.createConvolver(); verb.buffer = ir; const vg = ac.createGain(); vg.gain.value = 0.35; verb.connect(vg).connect(out);
    music.attach(ac, comp);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state !== 'running') ac.resume().catch(() => {});
}
export function suspend(on) { if (ac) on ? ac.suspend() : ac.resume(); }

const rnd = (a, b) => a + Math.random() * (b - a);
function env(g, t, attack, decay, vol) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay); }
function send(node, wet) { node.connect(out); if (wet) { const w = ac.createGain(); w.gain.value = wet; node.connect(w); w.connect(verb); } }
function tone(type, f0, f1, dur, vol, { delay = 0, wet = 0, attack = 0.003 } = {}) {
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  env(g, t, attack, dur, vol); o.connect(g); send(g, wet); o.start(t); o.stop(t + attack + dur + 0.05);
}
function noise(dur, vol, { type = 'lowpass', f0 = 1200, f1 = 0, q = 0.8, delay = 0, wet = 0, attack = 0.002 } = {}) {
  const t = ac.currentTime + delay, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, attack, dur, vol); s.connect(f).connect(g); send(g, wet); s.start(t, Math.random() * 0.5); s.stop(t + attack + dur + 0.05);
}
const ok = () => ac && audio.enabled && ac.state === 'running';
// Combo chime climbs a pentatonic scale.
const PENTA = [0, 2, 4, 7, 9];
const note = i => 523.25 * Math.pow(2, (12 * Math.floor(i / 5) + PENTA[i % 5]) / 12);

let lastShot = 0, lastHit = 0, lastTink = 0;
export const sfx = {
  /** Pistol: click + bright crack + low thump + a little room. */
  shot() {
    if (!ok()) return; const n = ac.currentTime; if (n - lastShot < 0.045) return; lastShot = n;
    const p = rnd(0.92, 1.08);
    tone('square', 2400 * p, 1400 * p, 0.012, 0.09);
    noise(0.07, 0.32, { type: 'bandpass', f0: 2600 * p, f1: 900, q: 0.9, wet: 0.25 });
    tone('sine', 170 * p, 48, 0.11, 0.42);
    noise(0.14, 0.08, { type: 'lowpass', f0: 900, f1: 300, delay: 0.02, wet: 0.5 });
  },
  /** Bullet into a zombie: wet thwack. */
  hit() {
    if (!ok()) return; const n = ac.currentTime; if (n - lastHit < 0.03) return; lastHit = n;
    noise(0.08, 0.34, { type: 'lowpass', f0: 1800, f1: 350 });
    tone('sine', 120 * rnd(0.9, 1.1), 55, 0.07, 0.3);
    noise(0.05, 0.12, { type: 'bandpass', f0: 700, f1: 1400, q: 3, delay: 0.015 });
  },
  /** Kill: crunch + splat + a rising chime for quick chains. */
  kill(combo = 1) {
    if (!ok()) return;
    noise(0.22, 0.42, { type: 'bandpass', f0: 520, f1: 140, q: 1.2, wet: 0.3 });
    tone('square', 110, 38, 0.2, 0.14);
    tone('sine', 95, 40, 0.18, 0.4);
    noise(0.06, 0.22, { type: 'highpass', f0: 2500, delay: 0.03 });
    const i = Math.min(14, combo - 1);
    tone('triangle', note(i), note(i) * 1.01, 0.12, 0.11, { delay: 0.04, wet: 0.4 });
    if (combo >= 3) tone('triangle', note(i + 2), note(i + 2), 0.1, 0.07, { delay: 0.1, wet: 0.5 });
  },
  /** Leader gets bitten: heavy body hit with a growl. */
  hurt() {
    if (!ok()) return;
    tone('sine', 220, 45, 0.32, 0.6);
    noise(0.18, 0.4, { type: 'lowpass', f0: 1200, f1: 200, wet: 0.3 });
    tone('sawtooth', 140, 70, 0.3, 0.12, { delay: 0.02 });
  },
  /** Shell casing lands. */
  tink() {
    if (!ok()) return; const n = ac.currentTime; if (n - lastTink < 0.06) return; lastTink = n;
    const f = rnd(3600, 5200); tone('triangle', f, f * 0.94, 0.04, 0.035, { wet: 0.3 });
  },
  /** A low vowel-ish "uhhh" groan. */
  groan() {
    if (!ok()) return; const t = ac.currentTime, base = rnd(80, 115);
    const o = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), f1 = ac.createBiquadFilter(), f2 = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(base, t); o.frequency.linearRampToValueAtTime(base * 0.78, t + 0.9);
    lfo.frequency.value = rnd(4, 6); lg.gain.value = base * 0.04; lfo.connect(lg).connect(o.frequency);
    f1.type = 'bandpass'; f1.frequency.value = 620; f1.Q.value = 6; f2.type = 'bandpass'; f2.frequency.value = 1050; f2.Q.value = 7;
    env(g, t, 0.18, 0.8, 0.09); o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); send(g, 0.4);
    o.start(t); lfo.start(t); o.stop(t + 1.05); lfo.stop(t + 1.05);
  },
  shotgun() { if (!ok()) return; const p = rnd(0.94, 1.06); noise(0.16, 0.5, { type: 'lowpass', f0: 3200 * p, f1: 500, wet: 0.35 }); tone('sine', 120 * p, 38, 0.18, 0.55); tone('square', 1500, 600, 0.02, 0.08); noise(0.06, 0.12, { type: 'highpass', f0: 3000, delay: 0.26 }); },
  throw() { if (!ok()) return; noise(0.1, 0.12, { type: 'bandpass', f0: 1200, f1: 3500, q: 2 }); },
  pan() { if (!ok()) return; const f = rnd(420, 520); tone('triangle', f, f * 0.97, 0.35, 0.22, { wet: 0.4 }); tone('square', f * 2.76, f * 2.7, 0.08, 0.05); noise(0.04, 0.25, { type: 'lowpass', f0: 2000 }); },
  block() { if (!ok()) return; tone('triangle', 900, 700, 0.12, 0.12, { wet: 0.3 }); noise(0.05, 0.15, { type: 'highpass', f0: 2000 }); },
  bite() { if (!ok()) return; noise(0.12, 0.45, { type: 'bandpass', f0: 900, f1: 300, q: 2 }); tone('sawtooth', 620, 200, 0.4, 0.12, { delay: 0.05, wet: 0.4 }); tone('sine', 140, 50, 0.2, 0.4); },
  explode() { if (!ok()) return; tone('sine', 90, 28, 0.7, 0.9); noise(0.9, 0.7, { type: 'lowpass', f0: 2600, f1: 120, wet: 0.6 }); noise(0.1, 0.4, { type: 'highpass', f0: 1500 }); tone('square', 60, 30, 0.4, 0.15, { delay: 0.05 }); },
  join(n = 1) { if (!ok()) return; const b = Math.min(10, n - 1); [0, 2, 4].forEach((k, i) => tone('triangle', note(b + k), note(b + k), 0.14, 0.1, { delay: i * 0.06, wet: 0.4 })); },
  pick(streak = 0) { if (!ok()) return; const i = Math.min(14, streak); tone('square', note(i + 5), note(i + 5) * 1.5, 0.06, 0.05); tone('sine', note(i + 5) * 2, note(i + 5) * 2, 0.08, 0.05, { delay: 0.03 }); },
  levelup() { if (!ok()) return; [0, 2, 4, 7, 9].forEach((k, i) => tone('square', note(k + 5), note(k + 5), 0.12, 0.08, { delay: i * 0.07, wet: 0.4 })); tone('triangle', note(14), note(14), 0.5, 0.1, { delay: 0.35, wet: 0.6 }); },
  dash() { if (!ok()) return; noise(0.2, 0.25, { type: 'bandpass', f0: 600, f1: 2400, q: 1.5 }); },
  saw() { if (!ok()) return; tone('sawtooth', rnd(180, 220), 140, 0.08, 0.08); noise(0.06, 0.2, { type: 'bandpass', f0: 1800, q: 3 }); },
  fire() { if (!ok()) return; noise(0.4, 0.3, { type: 'lowpass', f0: 600, f1: 2000, wet: 0.3 }); tone('triangle', 1800, 1700, 0.05, 0.05); },
  heal() { if (!ok()) return; [0, 4, 7].forEach((k, i) => tone('sine', note(k + 10), note(k + 10), 0.25, 0.08, { delay: i * 0.08, wet: 0.5 })); },
  click() { if (!ok()) return; tone('square', 1200, 900, 0.03, 0.06); },
  spit() { if (!ok()) return; noise(0.12, 0.2, { type: 'bandpass', f0: 600, f1: 1800, q: 4 }); },
  splat() { if (!ok()) return; noise(0.15, 0.25, { type: 'lowpass', f0: 900, f1: 200 }); tone('sine', 220, 90, 0.1, 0.15); },
  scream() { if (!ok()) return; tone('sawtooth', 900, 1300, 0.5, 0.12, { wet: 0.5 }); tone('square', 1400, 1100, 0.45, 0.05, { delay: 0.05 }); },
  jingle() { if (!ok()) return; [12, 14, 12, 9].forEach((k, i) => tone('triangle', note(k), note(k), 0.12, 0.08, { delay: i * 0.09, wet: 0.5 })); noise(0.3, 0.05, { type: 'highpass', f0: 6000 }); },
  rev() { if (!ok()) return; tone('sawtooth', 60, 140, 0.8, 0.18); noise(0.8, 0.15, { type: 'lowpass', f0: 300, f1: 900 }); },
  siren() { if (!ok()) return; for (let i = 0; i < 3; i++) tone('square', 700, 1100, 0.25, 0.05, { delay: i * 0.28 }); },
  chopper() { if (!ok()) return; for (let i = 0; i < 14; i++) noise(0.05, 0.25, { type: 'lowpass', f0: 400, delay: i * 0.09 }); },
  coin() { if (!ok()) return; tone('square', 988, 988, 0.05, 0.06); tone('square', 1319, 1319, 0.12, 0.06, { delay: 0.05 }); },
  bossIntro() { if (!ok()) return; tone('sawtooth', 55, 40, 1.4, 0.3, { wet: 0.6 }); tone('square', 110, 80, 1.2, 0.1, { wet: 0.5 }); noise(1, 0.2, { type: 'lowpass', f0: 300, wet: 0.5 }); },
  win() { if (!ok()) return; [0, 4, 7, 12, 16].forEach((k, i) => tone('square', note(k + 5), note(k + 5), 0.16, 0.08, { delay: i * 0.1, wet: 0.4 })); tone('triangle', note(19), note(19), 0.8, 0.12, { delay: 0.5, wet: 0.6 }); },
  step() { if (!ok()) return; noise(0.025, 0.035, { type: 'lowpass', f0: 900 }); },
  die() { if (!ok()) return; tone('sawtooth', 300, 40, 0.9, 0.18, { wet: 0.5 }); noise(0.5, 0.3, { type: 'lowpass', f0: 800, f1: 100, wet: 0.5 }); },
};
export function vibrate(ms) { if (!audio.vibration) return; try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }
