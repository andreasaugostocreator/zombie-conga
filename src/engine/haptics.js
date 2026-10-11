/**
 * Haptics. Android: the Vibration API. iPhone (iOS 18+): Safari has no vibration API, but toggling a
 * native switch control plays the system haptic tick. Newer iOS (26.5+) only does that for a *real* tap,
 * so the game canvas sits inside a <label> wired to a hidden switch: a finger tap on a button reaches
 * the switch as a trusted click. `armTap` decides per touch whether that tap should tick.
 * Older iOS also accepts script clicks during input, so ticks are queued and played from touch events.
 */
const queue = [];          // due times (ms)
let enabled = true, last = 0, label = null, touching = false;
const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

function ensureSwitch() {
  if (label || canVibrate) return;
  label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.cssText = 'position:fixed;left:-100px;top:-100px;width:1px;height:1px;opacity:0;pointer-events:none';
  const input = document.createElement('input');
  input.type = 'checkbox'; input.setAttribute('switch', ''); input.tabIndex = -1;
  label.appendChild(input); document.body.appendChild(label);
}
function tick() {
  if (canVibrate) { try { navigator.vibrate(14); } catch (e) {} return; }
  ensureSwitch(); try { label.click(); } catch (e) {}
}
function flush() {
  const now = performance.now();
  while (queue.length && queue[0] <= now) {
    queue.shift();
    if (now - last >= 40) { last = now; tick(); }
  }
}
let tapSwitch = null;
/** Wraps the canvas in a label tied to a hidden switch, so real taps can play the native tick. */
export function attachTapHaptics(canvas) {
  if (canVibrate || tapSwitch) return;
  const wrap = document.createElement('label');
  tapSwitch = document.createElement('input');
  tapSwitch.type = 'checkbox'; tapSwitch.setAttribute('switch', ''); tapSwitch.tabIndex = -1; tapSwitch.disabled = true;
  tapSwitch.setAttribute('aria-hidden', 'true');
  tapSwitch.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;margin:0;opacity:0;visibility:hidden;pointer-events:none';
  canvas.parentNode.insertBefore(wrap, canvas);
  wrap.appendChild(canvas); wrap.appendChild(tapSwitch);
}
export const haptics = {
  /** Called on touch down: should the upcoming tap (if it stays a tap) play the native tick? */
  armTap(on) { if (tapSwitch) tapSwitch.disabled = !(on && enabled); },
  get tapSwitch() { return tapSwitch; },
  set enabled(v) { enabled = v; if (!v) queue.length = 0; },
  get enabled() { return enabled; },
  /** Play a pattern of ticks: delays in ms from now, e.g. [0, 80, 160]. */
  play(pattern = [0]) {
    if (!enabled) return;
    const now = performance.now();
    for (const d of pattern) queue.push(now + d);
    queue.sort((a, b) => a - b);
    if (queue.length > 12) queue.splice(0, queue.length - 12);
  },
  /** Called from input handlers (inside user gestures). */
  fromInput() { touching = true; flush(); },
  /** Called every frame: plays queued ticks directly when no touch is in progress (desktop, Android). */
  frame(pointerDown) { if (!pointerDown || canVibrate) flush(); touching = pointerDown; },
};
// Named feels used around the game.
const throttle = {};
const once = (key, ms, pattern) => { const n = performance.now(); if (n - (throttle[key] || 0) < ms) return; throttle[key] = n; haptics.play(pattern); };
export const feel = {
  ui: () => once('ui', 60, [0]),
  kill: () => once('kill', 90, [0]),
  pick: () => once('pick', 130, [0]),
  shotgun: () => once('shotgun', 200, [0]),
  dash: () => haptics.play([0]),
  join: () => haptics.play([0, 70]),
  bite: () => haptics.play([0, 60, 120]),
  hurt: () => haptics.play([0, 90, 180]),
  explode: () => haptics.play([0, 50, 100, 150, 220]),
  levelup: () => haptics.play([0, 80, 160, 280]),
  win: () => haptics.play([0, 100, 200, 300, 450]),
  boss: () => once('boss', 120, [0, 50]),
};
