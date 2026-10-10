/**
 * One-thumb controls: touch (or click) anywhere and drag; a floating joystick appears under the thumb.
 * Touches that land on a UI button go to the UI instead. A second finger (or Space) asks for a dash.
 * Keyboard: WASD / arrows move, Space dashes, Escape / P pauses. `move` is screen-space, length 0..1.
 */
export function createInput(screen, ui) {
  const input = { move: { x: 0, y: 0 }, stick: null, keys: new Set(), dash: false, pause: false, joystickEnabled: true };
  // About 60 CSS px across the rim, whatever the pixel scale.
  const radius = () => Math.max(8, Math.round(30 * (window.devicePixelRatio || 1) / screen.scale));
  let pointerId = null;
  const toInternal = e => screen.cssToInternal(e.clientX, e.clientY);
  const el = screen.canvas;
  el.addEventListener('pointerdown', e => {
    e.preventDefault();
    const [x, y] = toInternal(e);
    if (ui.hit(x, y)) { ui.tap(x, y); return; }
    if (!input.joystickEnabled) { ui.tap(x, y); return; }
    if (pointerId !== null) { input.dash = true; return; }   // second finger: dash
    pointerId = e.pointerId;
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    input.stick = { ox: x, oy: y, x, y, r: radius() };
  }, { passive: false });
  el.addEventListener('pointermove', e => {
    if (e.pointerId !== pointerId || !input.stick) return;
    e.preventDefault();
    const [x, y] = toInternal(e);
    const s = input.stick, R = s.r;
    let dx = x - s.ox, dy = y - s.oy;
    const d = Math.hypot(dx, dy);
    // Let the base trail the thumb when it goes past the rim, so direction changes stay easy.
    if (d > R * 1.6) { const k = (d - R * 1.6) / d; s.ox += dx * k; s.oy += dy * k; }
    s.x = x; s.y = y;
  }, { passive: false });
  const end = e => { if (e.pointerId !== pointerId) return; pointerId = null; input.stick = null; };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (!e.repeat) { if (k === ' ') input.dash = true; if (k === 'escape' || k === 'p') input.pause = true; if (k === 'enter') ui.key('enter'); }
    input.keys.add(k);
    if (k.startsWith('arrow') || k === ' ') e.preventDefault();
  });
  addEventListener('keyup', e => input.keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => { input.keys.clear(); pointerId = null; input.stick = null; });
  // No scrolling, pinch or double-tap zoom, selection or long-press callout.
  for (const t of ['gesturestart', 'gesturechange', 'dblclick', 'contextmenu']) document.addEventListener(t, e => e.preventDefault(), { passive: false });
  document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

  input.update = () => {
    let x = 0, y = 0;
    const k = input.keys;
    if (k.has('a') || k.has('arrowleft')) x -= 1;
    if (k.has('d') || k.has('arrowright')) x += 1;
    if (k.has('w') || k.has('arrowup')) y -= 1;
    if (k.has('s') || k.has('arrowdown')) y += 1;
    if (input.stick) {
      const s = input.stick, dx = s.x - s.ox, dy = s.y - s.oy, d = Math.hypot(dx, dy);
      if (d > 2.5) { const m = Math.min(1, d / s.r); x = dx / d * m; y = dy / d * m; }
    }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    input.move.x = x; input.move.y = y;
  };
  input.takeDash = () => { const d = input.dash; input.dash = false; return d; };
  input.takePause = () => { const p = input.pause; input.pause = false; return p; };
  input.release = () => { pointerId = null; input.stick = null; input.move.x = input.move.y = 0; };
  return input;
}
