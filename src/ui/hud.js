import { text } from '../render/font.js';
import { makeCanvas } from '../render/screen.js';
import { toScreen } from '../render/iso.js';

/** Pixel ring for the floating joystick. */
function ring(r, color, thick = 1) {
  const size = r * 2 + 3, [c, x] = makeCanvas(size, size), m = r + 1;
  x.fillStyle = color;
  for (let y = 0; y < size; y++) for (let xx = 0; xx < size; xx++) {
    const d = Math.hypot(xx - m, y - m);
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

/** In-game HUD. Returns { pause, dash } when those buttons are tapped. */
export function createHud(screen, sheets, ui) {
  let rr = 0, outer, inner, knob;
  const rings = r => { if (r === rr) return; rr = r; outer = ring(r, 'rgba(255,255,255,0.55)', 2); inner = ring(r - 2, 'rgba(28,20,44,0.35)', 1); knob = disc(Math.max(4, Math.round(r * 0.35)), 'rgba(255,255,255,0.8)', 'rgba(28,20,44,0.6)'); };
  const dashDisc = disc(11, 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0.75)');
  return function hud(g, input, fps) {
    const ctx = screen.ctx, s = screen.safe, W = screen.w, H = screen.h, out = { pause: false, dash: false };
    if (g.hurtFlash > 0) { ctx.fillStyle = `rgba(200,30,40,${(g.hurtFlash * 1.2).toFixed(2)})`; ctx.fillRect(0, 0, W, H); }
    const top = s.top + 4, left = s.left + 4, right = W - s.right - 4;
    // Hearts (3 slots, more when you have more).
    const slots = Math.max(3, g.leader.hearts);
    for (let i = 0; i < slots; i++) ctx.drawImage(i < g.leader.hearts ? sheets.heart : sheets.heartEmpty, left + i * 9, top);
    // Pause button, kills.
    if (ui.button('', right - 13, top - 1, 14, 12, { icon: sheets.icons.pause, color: '#5c4a78', id: 'pause' })) out.pause = true;
    ctx.drawImage(sheets.skull, right - 34, top + 2);
    text(ctx, g.kills, right - 25, top + 2);
    // XP bar with level.
    const by = top + 13, bx = left + 15, bw = right - bx;
    text(ctx, 'LV' + g.level, left, by - 1, { color: '#f7a6c4' });
    ctx.fillStyle = '#1c1424'; ctx.fillRect(bx - 1, by - 1, bw + 2, 5);
    ctx.fillStyle = '#4a3a4e'; ctx.fillRect(bx, by, bw, 3);
    ctx.fillStyle = '#f7a6c4'; ctx.fillRect(bx, by, Math.round(bw * g.xp / g.xpNeed), 3);
    ctx.fillStyle = '#ffd6e6'; ctx.fillRect(bx, by, Math.round(bw * g.xp / g.xpNeed), 1);
    // Conga line size, bottom left.
    const bottom = H - s.bottom - 6;
    ctx.drawImage(sheets.icons.conga, left, bottom - 6);
    text(ctx, `${g.line.length}/${g.maxLine}`, left + 13, bottom - 5);
    // Dash button, bottom right, with a cooldown sweep.
    const dx = right - 23, dy = bottom - 33;
    if (ui.button('', dx, dy, 24, 30, { invisible: true, id: 'dash' })) out.dash = true;
    ctx.drawImage(dashDisc, dx + 1, dy + 1);
    const cd = g.leader.dashCd / 2.2;
    if (cd > 0) {
      ctx.fillStyle = 'rgba(28,20,44,0.55)';
      for (let yy = 0; yy < 23; yy++) for (let xx = 0; xx < 23; xx++) {
        const a = (Math.atan2(xx - 11, -(yy - 11)) / (Math.PI * 2) + 1) % 1;
        if (Math.hypot(xx - 11, yy - 11) <= 11 && a < cd) ctx.fillRect(dx + 1 + xx, dy + 1 + yy, 1, 1);
      }
    }
    ctx.globalAlpha = cd > 0 ? 0.45 : 1; ctx.drawImage(sheets.icons.dash, dx + 8, dy + 7); ctx.globalAlpha = 1;
    text(ctx, 'DASH', dx + 12, dy + 26, { align: 'center', color: cd > 0 ? '#8a7f99' : '#ffffff' });
    // Rescue radar: arrow to the nearest waiting survivor when they are off screen.
    if (g.up.radar) {
      let best = null, bd = 1e9;
      for (const p of g.others) if (p.state === 'stranded') { const d = Math.hypot(p.x - g.leader.x, p.y - g.leader.y); if (d < bd) { bd = d; best = p; } }
      if (best) {
        const [sx, sy] = toScreen(best.x - g.leader.x, best.y - g.leader.y), cx = W / 2, cy = H * 0.56 - 8;
        if (Math.abs(sx) > W / 2 - 8 || Math.abs(sy) > H * 0.4) {
          const a = Math.atan2(sy, sx), k = Math.min((W / 2 - 10) / Math.abs(Math.cos(a) || 1e-3), (H * 0.4) / Math.abs(Math.sin(a) || 1e-3));
          const ax = Math.round(cx + Math.cos(a) * k), ay = Math.round(cy + Math.sin(a) * k);
          ctx.fillStyle = Math.floor(g.time * 4) % 2 ? '#9bd068' : '#ffffff';
          for (let i = 0; i < 6; i++) for (let w = -i; w <= i; w++) { const px = ax + Math.cos(a) * (6 - i) * 1 - Math.sin(a) * w * 0.6, py = ay + Math.sin(a) * (6 - i) + Math.cos(a) * w * 0.6; ctx.fillRect(Math.round(px), Math.round(py), 1, 1); }
        }
      }
    }
    // Floating joystick.
    if (input.stick) {
      const st = input.stick; rings(st.r);
      ctx.drawImage(inner, Math.round(st.ox - st.r + 1), Math.round(st.oy - st.r + 1));
      ctx.drawImage(outer, Math.round(st.ox - st.r - 1), Math.round(st.oy - st.r - 1));
      let jx = st.x - st.ox, jy = st.y - st.oy; const d = Math.hypot(jx, jy);
      if (d > st.r) { jx = jx / d * st.r; jy = jy / d * st.r; }
      const kr = (knob.width - 1) / 2; ctx.drawImage(knob, Math.round(st.ox + jx - kr), Math.round(st.oy + jy - kr));
    }
    // First-run tips.
    const blink = Math.floor(g.time * 2) % 3 !== 0;
    if (!g.moved && blink) { text(ctx, 'DRAG ANYWHERE', W / 2, H * 0.72, { align: 'center' }); text(ctx, 'TO MOVE', W / 2, H * 0.72 + 8, { align: 'center' }); }
    else if (g.moved && g.rescued === 0 && g.time < 30 && blink) { text(ctx, 'TOUCH SURVIVORS', W / 2, H * 0.72, { align: 'center', color: '#f4d35e' }); text(ctx, 'TO JOIN YOUR LINE', W / 2, H * 0.72 + 8, { align: 'center', color: '#f4d35e' }); }
    if (fps !== null) text(ctx, `${fps}FPS Z${g.zombies.count}${g.debug.god ? ' GOD' : ''}`, left, top + 20, { color: '#9fe870' });
    return out;
  };
}
