/**
 * Tiny chiptune sequencer: square lead, triangle bass, noise drums. Each region has its own key,
 * tempo and pattern, generated from a seed so the tune is stable. Starts after a tap (iOS).
 */
import { mulberry32 } from '../engine/rng.js';
let ac = null, out = null, timer = null, step = 0, nextT = 0, song = null, enabled = true;
const SCALES = { major: [0, 2, 4, 7, 9], minor: [0, 3, 5, 7, 10], blues: [0, 3, 5, 6, 7, 10] };
const REGION_SONGS = [
  { root: 60, scale: 'major', bpm: 116, seed: 1 }, { root: 62, scale: 'major', bpm: 124, seed: 2 }, { root: 57, scale: 'minor', bpm: 100, seed: 3 },
  { root: 58, scale: 'blues', bpm: 128, seed: 4 }, { root: 55, scale: 'minor', bpm: 110, seed: 5 }, { root: 53, scale: 'minor', bpm: 134, seed: 6 },
  { root: 57, scale: 'minor', bpm: 140, seed: 7 }, { root: 60, scale: 'major', bpm: 96, seed: 8 },   // [7] = menus
];
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
function makeSong(cfg) {
  const r = mulberry32(cfg.seed * 977), sc = SCALES[cfg.scale];
  const lead = Array.from({ length: 32 }, (_, i) => (i % 4 === 3 && r() < 0.5) || r() < 0.25 ? null : cfg.root + 12 + sc[Math.floor(r() * sc.length)] + (r() < 0.25 ? 12 : 0));
  const prog = [0, 3, 4, 2].map(i => sc[i % sc.length]);
  return { ...cfg, lead, prog };
}
export const music = {
  attach(ctx, dest) { ac = ctx; out = ac.createGain(); out.gain.value = 0.16; out.connect(dest); },
  set enabled(v) { enabled = v; if (out) out.gain.value = v ? 0.16 : 0; },
  play(index) {
    if (!ac) return;
    song = makeSong(REGION_SONGS[index] || REGION_SONGS[7]); step = 0; nextT = ac.currentTime + 0.1;
    if (!timer) timer = setInterval(tick, 50);
  },
  stop() { song = null; },
};
function note(type, f, t, dur, vol) {
  const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02);
}
let noiseBuf = null;
function drum(t, hi) {
  if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.2, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; f.type = hi ? 'highpass' : 'lowpass'; f.frequency.value = hi ? 6000 : 300;
  g.gain.setValueAtTime(hi ? 0.15 : 0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (hi ? 0.04 : 0.12));
  s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + 0.15);
}
function tick() {
  if (!ac || !song || !enabled || ac.state !== 'running') return;
  const sixteenth = 60 / song.bpm / 4;
  while (nextT < ac.currentTime + 0.2) {
    const s = step % 32, bar = Math.floor(step / 16) % 4, chord = song.prog[bar];
    const l = song.lead[s]; if (l && s % 2 === 0) note('square', hz(l + chord), nextT, sixteenth * 1.8, 0.07);
    if (s % 4 === 0) note('triangle', hz(song.root - 12 + chord), nextT, sixteenth * 3.5, 0.35);
    if (s % 8 === 4) drum(nextT, false); if (s % 2 === 0) drum(nextT, true);
    if (s % 16 === 0) drum(nextT, false);
    nextT += sixteenth; step++;
  }
}
