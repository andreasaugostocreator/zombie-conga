import { text } from '../render/font.js';

/**
 * Tiny immediate-mode UI drawn on the pixel canvas. Each frame, screens call button()/toggle();
 * taps queued by the input layer are matched against this frame's rectangles.
 * The rectangles of the previous frame tell the input layer which touches belong to the UI
 * (so they don't start the joystick).
 */
export function createUI(screen, sfxClick) {
  const ui = { rects: [], prevRects: [], taps: [], keys: [] };
  ui.begin = () => { ui.prevRects = ui.rects; ui.rects = []; };
  ui.end = () => { ui.taps.length = 0; ui.keys.length = 0; };
  ui.key = k => ui.keys.push(k);
  ui.takeKey = k => { const i = ui.keys.indexOf(k); if (i < 0) return false; ui.keys.splice(i, 1); return true; };
  ui.hit = (x, y) => ui.prevRects.some(r => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h);
  ui.tap = (x, y) => ui.taps.push({ x, y, used: false });
  function takeTap(x, y, w, h) {
    for (const t of ui.taps) if (!t.used && t.x >= x && t.y >= y && t.x < x + w && t.y < y + h) { t.used = true; return true; }
    return false;
  }
  /** A chunky pixel button. Returns true on the frame it is tapped. */
  ui.button = (label, x, y, w, h, { primary = false, icon = null, scale = 1, color, invisible = false, id } = {}) => {
    x = Math.round(x); y = Math.round(y);
    ui.rects.push({ x, y, w, h, id: id || label });
    if (invisible) { const hit = takeTap(x, y, w, h); return hit; }
    const ctx = screen.ctx, face = color || (primary ? '#f4d35e' : '#efe6d6'), edge = primary ? '#b8862a' : '#a89c88';
    ctx.fillStyle = '#1c1424'; ctx.fillRect(x + 1, y, w - 2, h + 2); ctx.fillRect(x, y + 1, w, h);
    ctx.fillStyle = edge; ctx.fillRect(x + 1, y + 1, w - 2, h);
    ctx.fillStyle = face; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x + 2, y + 2, w - 4, 1);
    let tx = x + w / 2;
    if (icon) { const iw = icon.width; ctx.drawImage(icon, Math.round(label ? x + 4 : x + (w - iw) / 2), Math.round(y + (h - icon.height) / 2)); if (label) tx += iw / 2 + 1; }
    if (label) text(ctx, label, tx, Math.round(y + (h - 5 * scale) / 2 - (scale > 1 ? 1 : 0)), { align: 'center', color: '#2a2230', outline: null, scale });
    const hit = takeTap(x, y, w, h);
    if (hit) sfxClick && sfxClick();
    return hit;
  };
  /** A labelled ON/OFF switch row. Returns the new value. */
  ui.toggle = (label, value, x, y, w) => {
    const ctx = screen.ctx, h = 13;
    ui.rects.push({ x, y, w, h });
    ctx.fillStyle = 'rgba(28,20,44,0.55)'; ctx.fillRect(x, y, w, h);
    text(ctx, label, x + 3, y + 4, { color: '#ffffff', outline: null });
    const sx = x + w - 20, sy = y + 3;
    ctx.fillStyle = value ? '#6caa4c' : '#4a3a4e'; ctx.fillRect(sx, sy, 17, 7);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(value ? sx + 10 : sx + 1, sy + 1, 6, 5);
    if (takeTap(x, y, w, h)) { sfxClick && sfxClick(); return !value; }
    return value;
  };
  ui.panel = (x, y, w, h) => {
    const ctx = screen.ctx;
    ctx.fillStyle = '#1c1424'; ctx.fillRect(x - 1, y, w + 2, h); ctx.fillRect(x, y - 1, w, h + 2);
    ctx.fillStyle = '#3a2f4f'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#4a3d63'; ctx.fillRect(x, y, w, 2);
  };
  return ui;
}
