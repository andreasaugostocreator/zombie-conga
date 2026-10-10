/** 8-bit style sound effects synthesised with Web Audio (no files). iOS needs a tap first: call unlock(). */
let ac = null, master = null, noiseBuf = null;
export const audio = { enabled: true };
export function unlock() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC(); master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state !== 'running') ac.resume().catch(() => {});
}
export function suspend(on) { if (ac) on ? ac.suspend() : ac.resume(); }
function env(g, t, a, d, v) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function tone(type, f0, f1, dur, vol, delay = 0) {
  if (!ac || !audio.enabled) return; const t = ac.currentTime + delay;
  const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  env(g, t, 0.004, dur, vol); o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, vol, type = 'lowpass', freq = 1200, delay = 0) {
  if (!ac || !audio.enabled) return; const t = ac.currentTime + delay;
  const s = ac.createBufferSource(); s.buffer = noiseBuf; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const g = ac.createGain(); env(g, t, 0.003, dur, vol); s.connect(f).connect(g).connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}
let lastShot = 0;
export const sfx = {
  shot() { if (!ac) return; const n = ac.currentTime; if (n - lastShot < 0.05) return; lastShot = n; tone('square', 980, 160, 0.07, 0.07); noise(0.05, 0.12, 'highpass', 2500); },
  hit() { noise(0.06, 0.16, 'lowpass', 900); tone('sine', 160, 80, 0.06, 0.12); },
  die() { noise(0.2, 0.2, 'bandpass', 420); tone('square', 170, 55, 0.22, 0.06); },
  hurt() { tone('sawtooth', 330, 70, 0.3, 0.12); noise(0.12, 0.18, 'lowpass', 700); },
  groan() { if (!ac || !audio.enabled) return; const t = ac.currentTime, o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(95 + Math.random() * 30, t); o.frequency.linearRampToValueAtTime(70, t + 0.7);
    f.type = 'lowpass'; f.frequency.value = 520; env(g, t, 0.12, 0.6, 0.035); o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + 0.85); },
  step() { noise(0.02, 0.025, 'highpass', 3000); },
};
export function vibrate(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }
