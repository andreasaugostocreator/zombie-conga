/** Progress and settings in localStorage, with a version number for future migrations. */
const KEY = 'zombie-conga', VERSION = 1;
const defaults = () => ({ v: VERSION, settings: { sfx: true, vibration: true, reduceFx: false, fps: false }, best: { kills: 0, time: 0, line: 0 } });
export function load() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  if (!d || typeof d !== 'object') return defaults();
  const base = defaults();
  return { ...base, ...d, v: VERSION, settings: { ...base.settings, ...(d.settings || {}) }, best: { ...base.best, ...(d.best || {}) } };
}
export function save(data) { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
