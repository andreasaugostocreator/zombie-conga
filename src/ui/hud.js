import { text } from '../render/font.js';
import { makeCanvas } from '../render/screen.js';

/** Pixel ring for the floating joystick. */
function ring(r, color, thick = 1) {
  const size = r * 2 + 3, [c, x] = makeCanvas(size, size), m = r + 1;
  x.fillStyle = color;
  for (let y = 0; y < size; y++) for (let xx = 0; xx < size; xx++) {
    const d = Math.hypot(xx + 0.5 - m - 0.5, y + 0.5 - m - 0.5);
    if (d <= r + 0.5 && d >= r + 0.5 - thick) x.fillRect(xx, y, 1, 1);
  }
  return c;
}
function disc(r, color, edge) {
  const size = r * 2 + 1, [c, x] = makeCanvas(size, size);
  for (let y = 0; y < size; y++) for (let xx = 0; xx < size; xx++) {
    const d = Math.hypot(xx - r, y - r);
    if (d <= r + 0.3) { x.fillStyle = d > r - 1 ? edge : color; x.fillRect(xx, y, 1, 1); }
  }
  return c;
}

export function createHud(screen, sheets) {
  let rr = 0, outer, inner, knob;
  const rings = r => { if (r === rr) return; rr = r; outer = ring(r, 'rgba(255,255,255,0.55)', 2); inner = ring(r - 2, 'rgba(28,20,44,0.35)', 1); knob = disc(Math.max(4, Math.round(r * 0.35)), 'rgba(255,255,255,0.8)', 'rgba(28,20,44,0.6)'); };
  return function hud(g, input, fps) {
    const ctx = screen.ctx, s = screen.safe, W = screen.w, H = screen.h;
    // Red flash when hurt.
    if (g.hurtFlash > 0) { ctx.fillStyle = `rgba(200,30,40,${(g.hurtFlash * 1.2).toFixed(2)})`; ctx.fillRect(0, 0, W, H); }
    // Hearts and kills.
    const top = s.top + 4, left = s.left + 4;
    for (let i = 0; i < 3; i++) ctx.drawImage(i < g.leader.hearts ? sheets.heart : sheets.heartEmpty, left + i * 10, top);
    ctx.drawImage(sheets.skull, W - s.right - 30, top + 1);
    text(ctx, g.kills, W - s.right - 21, top + 1, { color: '#ffffff' });
    // Floating joystick.
    if (input.stick) {
      const st = input.stick; rings(st.r);
      ctx.drawImage(inner, Math.round(st.ox - st.r + 1), Math.round(st.oy - st.r + 1));
      ctx.drawImage(outer, Math.round(st.ox - st.r - 1), Math.round(st.oy - st.r - 1));
      let dx = st.x - st.ox, dy = st.y - st.oy; const d = Math.hypot(dx, dy);
      if (d > st.r) { dx = dx / d * st.r; dy = dy / d * st.r; }
      const kr = (knob.width - 1) / 2; ctx.drawImage(knob, Math.round(st.ox + dx - kr), Math.round(st.oy + dy - kr));
    }
    if (!g.moved && g.state === 'play' && Math.floor(g.time * 2) % 3 !== 0) { text(ctx, 'DRAG ANYWHERE', W / 2, H - s.bottom - 30, { align: 'center' }); text(ctx, 'TO MOVE', W / 2, H - s.bottom - 22, { align: 'center' }); }
    if (g.state === 'dead') {
      ctx.fillStyle = 'rgba(28,20,44,0.55)'; ctx.fillRect(0, 0, W, H);
      text(ctx, 'OVERRUN!', W / 2, H * 0.4, { scale: 2, color: '#e2384a', align: 'center' });
      text(ctx, `${g.kills} ZOMBIES DOWN`, W / 2, H * 0.4 + 20, { align: 'center' });
      if (g.time - g.deadAt > 0.8 && Math.floor(g.time * 2.5) % 2 === 0) text(ctx, 'TAP TO TRY AGAIN', W / 2, H * 0.4 + 34, { align: 'center', color: '#f4d35e' });
    }
    if (fps !== null) text(ctx, `${fps}FPS Z${g.zombies.count}${g.debug.god ? ' GOD' : ''}`, left, top + 12, { color: '#9fe870' });
  };
}
