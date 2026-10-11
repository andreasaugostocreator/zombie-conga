import { LEVELS } from './data/levels.js';
import { CAMP, ACHIEVEMENTS, MODIFIERS } from './data/upgrades.js';
import { CLASSES, STARTER_CLASSES } from './data/classes.js';

/** Everything saved on the device, versioned for future migrations. */
const KEY = 'zombie-conga', VERSION = 2;
const defaults = () => ({
  v: VERSION,
  settings: { sfx: true, music: true, haptics: true, reduceFx: false, fps: false },
  cans: 0, stars: {}, cleared: {}, best: { kills: 0, time: 0, line: 0 },
  camp: Object.fromEntries(CAMP.map(c => [c.id, 0])), classes: [...STARTER_CLASSES], ach: {},
  totals: { kills: 0, rescued: 0 }, daily: { last: '', streak: 0, played: '' }, endless: { best: 0, kills: 0 },
});
export function load() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  const base = defaults();
  if (!d || typeof d !== 'object') return base;
  // v1 → v2: keep settings (vibration → haptics) and best scores.
  if (!d.v || d.v < 2) d.settings = { ...base.settings, ...(d.settings || {}), haptics: d.settings ? d.settings.vibration !== false : true };
  return { ...base, ...d, v: VERSION, settings: { ...base.settings, ...(d.settings || {}) }, camp: { ...base.camp, ...(d.camp || {}) },
    best: { ...base.best, ...(d.best || {}) }, totals: { ...base.totals, ...(d.totals || {}) }, daily: { ...base.daily, ...(d.daily || {}) }, endless: { ...base.endless, ...(d.endless || {}) },
    classes: Array.from(new Set([...(d.classes || []), ...STARTER_CLASSES])) };
}
export function save(data) { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
export function reset() { try { localStorage.removeItem(KEY); } catch (e) {} return defaults(); }

export const totalStars = d => Object.values(d.stars).reduce((a, b) => a + b, 0);
export const isUnlocked = (d, i, debug) => debug || i === 0 || !!d.cleared[LEVELS[i - 1].id];
export const endlessUnlocked = d => !!d.cleared['3-6'];
export const nextLevelIndex = d => { const i = LEVELS.findIndex(l => !d.cleared[l.id]); return i < 0 ? LEVELS.length - 1 : i; };

/** Base Camp purchases. */
export function campCost(d, id) { const c = CAMP.find(c => c.id === id), lv = d.camp[id] || 0; return lv < c.costs.length ? c.costs[lv] : null; }
export function buyCamp(d, id) { const cost = campCost(d, id); if (cost === null || d.cans < cost) return false; d.cans -= cost; d.camp[id] = (d.camp[id] || 0) + 1; save(d); return true; }
export const classAvailable = (d, cls) => !CLASSES[cls].need || !!d.cleared[CLASSES[cls].need];
export function buyClass(d, cls) { const c = CLASSES[cls]; if (d.classes.includes(cls) || !classAvailable(d, cls) || d.cans < c.cost) return false; d.cans -= c.cost; d.classes.push(cls); save(d); return true; }

/** Today's daily challenge: same for everyone on the same date. */
export function dailyInfo(now = new Date()) {
  const key = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5);
  const region = day % 7, mod = MODIFIERS[(day * 5 + 3) % MODIFIERS.length];
  const proto = LEVELS[region * 6 + 2];
  const level = { ...proto, id: 'daily', name: 'DAILY: ' + mod.name, seed: 1000 + day % 997, night: proto.night || mod.id === 'night', obj: { type: 'survive', time: 150 }, stars: [{ line: 99 }, { line: 99 }], cans: 0 };
  return { key, day, region, mod, level };
}
const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dailyInfo(d).key; };

/** Applies a finished run to the save. Returns newly unlocked achievements. */
export function applyResult(d, mode, level, g, res) {
  d.cans += res.cans;
  d.totals.kills += g.kills; d.totals.rescued += g.rescued;
  d.best = { kills: Math.max(d.best.kills, g.kills), time: Math.max(d.best.time, g.time), line: Math.max(d.best.line, g.bestLine) };
  if (mode === 'level' && res.won) { d.cleared[level.id] = true; d.stars[level.id] = Math.max(d.stars[level.id] || 0, res.nStars); }
  if (mode === 'daily' && res.won) {
    const info = dailyInfo();
    if (d.daily.last !== info.key) { d.daily.streak = d.daily.last === yesterdayKey() ? d.daily.streak + 1 : 1; d.daily.last = info.key; }
  }
  if (mode === 'daily') d.daily.played = dailyInfo().key;
  if (mode === 'endless') d.endless = { best: Math.max(d.endless.best, Math.floor(g.time)), kills: Math.max(d.endless.kills, g.kills) };
  const got = [];
  const unlock = id => { if (!d.ach[id]) { d.ach[id] = true; got.push(ACHIEVEMENTS.find(a => a.id === id)); } };
  if (d.totals.rescued >= 1) unlock('rescue1');
  if (g.bestLine >= 10) unlock('line10');
  if (g.bestLine >= 20) unlock('line20');
  if (d.totals.kills >= 500) unlock('kills500');
  if (d.totals.kills >= 5000) unlock('kills5000');
  if (res.won && mode === 'level' && g.hits === 0) unlock('nohit');
  if (res.won && mode === 'level' && g.bitten === 0 && g.rescued > 0) unlock('nobite');
  if (g.maxChain >= 3) unlock('boom');
  if (totalStars(d) >= 30) unlock('stars30');
  if (totalStars(d) >= LEVELS.length * 3) unlock('stars126');
  if (res.won && level && level.obj.type === 'boss') unlock('boss_' + level.obj.boss);
  if (d.daily.streak >= 3) unlock('daily3');
  if (mode === 'endless' && g.time >= 300) unlock('endless5');
  save(d);
  return got;
}
