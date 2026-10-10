/**
 * One-thumb controls: touch (or click) anywhere and drag; a floating joystick appears under the thumb.
 * Keyboard (WASD / arrows) works too for desktop testing. `move` is a screen-space vector, length 0..1.
 */
export function createInput(screen) {
  const input = { move: { x: 0, y: 0 }, stick: null, tapped: false, keys: new Set(), anyPress: false };
  // About 60 CSS px across the rim, whatever the pixel scale.
  const radius = () => Math.max(8, Math.round(30 * (window.devicePixelRatio || 1) / screen.scale));
  let pointerId = null;
  const toInternal = e => screen.cssToInternal(e.clientX, e.clientY);
  const el = screen.canvas;
  el.addEventListener('pointerdown', e => {
    e.preventDefault();
    input.anyPress = true;
    input.tapped = true;
    if (pointerId !== null) return;
    pointerId = e.pointerId;
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    const [x, y] = toInternal(e);
    input.stick = { ox: x, oy: y, x, y, r: radius() };
  }, { passive: false });
  el.addEventListener('pointermove', e => {
    if (e.pointerId !== pointerId || !input.stick) return;
    e.preventDefault();
    const [x, y] = toInternal(e);
    const s = input.stick;
    let dx = x - s.ox, dy = y - s.oy;
    const d = Math.hypot(dx, dy);
    // Let the base trail the thumb when it goes past the rim, so direction changes stay easy.
    const R = s.r;
    if (d > R * 1.6) { const k = (d - R * 1.6) / d; s.ox += dx * k; s.oy += dy * k; dx = x - s.ox; dy = y - s.oy; }
    s.x = x; s.y = y;
  }, { passive: false });
  const end = e => { if (e.pointerId !== pointerId) return; pointerId = null; input.stick = null; };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  addEventListener('keydown', e => { input.keys.add(e.key.toLowerCase()); input.anyPress = true; if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault(); });
  addEventListener('keyup', e => input.keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => input.keys.clear());
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
  input.consumeTap = () => { const t = input.tapped; input.tapped = false; return t; };
  return input;
}
