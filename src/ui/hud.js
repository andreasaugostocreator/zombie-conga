import { text } from '../render/font.js';
import { makeCanvas } from '../render/screen.js';
import { toScreen } from '../render/iso.js';
import { BOSSES } from '../data/enemies.js';

function ring(r, color, thick = 1) {
  const size = r * 2 + 3, [c, x] = makeCanvas(size, size), m = r + 1;
  x.fillStyle = color;
  for (let y = 0; y < size; y++) for (let xx = 0; xx < size; xx++) { const d = Math.hypot(xx - m, y - m); if (d <= r + 0.5 && d >= r + 0.5 - thick) x.fillRect(xx, y, 1, 1); }
  return c;
}
function disc(r, color, edge) {
  const size = r * 2 + 1, [c, x] = makeCanvas(size, size);
  for (let y = 0; y < size; y++) for (let xx = 0; xx < size; xx++) { const d = Math.hypot(xx - r, y - r); if (d <= r + 0.3) { x.fillStyle = d > r - 1 ? edge : color; x.fillRect(xx, y, 1, 1); } }
  return c;
}
const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
/** A framed bar: dark outline, empty track, fill with a light top edge. */
function bar(ctx, x, y, w, h, frac, col, hi) {
  ctx.fillStyle = '#1c1424'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#3a2f4f'; ctx.fillRect(x, y, w, h);
  const fw = Math.round(w * Math.max(0, Math.min(1, frac)));
  ctx.fillStyle = col; ctx.fillRect(x, y, fw, h);
  ctx.fillStyle = hi; ctx.fillRect(x, y, fw, 1);
}
/** Rounded pixel "chip" with text, sized to the text. */
function chip(ctx, label, cx, y, col = '#ffffff', bg = 'rgba(28,20,44,0.72)') {
  const w = label.length * 4 + 7, x = Math.round(cx - w / 2);
  ctx.fillStyle = bg; ctx.fillRect(x + 1, y, w - 2, 9); ctx.fillRect(x, y + 1, w, 7);
  text(ctx, label, x + 4, y + 2, { color: col, outline: null });
}

/** In-game HUD. Returns { pause, dash } when those buttons are tapped. */
export function createHud(screen, sheets, ui) {
  let rr = 0, outer, inner, knob;
  const rings = r => { if (r === rr) return; rr = r; outer = ring(r, 'rgba(255,255,255,0.55)', 2); inner = ring(r - 2, 'rgba(28,20,44,0.35)', 1); knob = disc(Math.max(4, Math.round(r * 0.35)), 'rgba(255,255,255,0.8)', 'rgba(28,20,44,0.6)'); };
  const dashDisc = disc(11, 'rgba(28,20,44,0.35)', 'rgba(255,255,255,0.75)');
  return function hud(g, input, fps) {
    const ctx = screen.ctx, s = screen.safe, W = screen.w, H = screen.h, out = { pause: false, dash: false };
    if (g.hurtFlash > 0) { ctx.fillStyle = `rgba(200,30,40,${(g.hurtFlash * 1.2).toFixed(2)})`; ctx.fillRect(0, 0, W, H); }
    const top = s.top + 4, left = s.left + 4, right = W - s.right - 4;
    // Row 1: hearts │ cans + pause
    const slots = Math.max(3, g.leader.hearts);
    for (let i = 0; i < slots; i++) ctx.drawImage(i < g.leader.hearts ? sheets.heart : sheets.heartEmpty, left + i * 9, top);
    if (ui.button('', right - 13, top - 1, 14, 12, { icon: sheets.icons.pause, color: '#5c4a78', id: 'pause' })) out.pause = true;
    const cw = text(ctx, String(g.cansEarned), right - 18, top + 2, { align: 'right' });
    ctx.drawImage(sheets.icons.can, right - 18 - cw - 7, top);
    // Row 2: level badge, then the XP bar after it (never overlapping)
    const by = top + 13, lvTxt = 'LV' + g.level, lvW = lvTxt.length * 4 + 5;
    ctx.fillStyle = '#1c1424'; ctx.fillRect(left, by - 2, lvW, 9);
    ctx.fillStyle = '#7a3e5c'; ctx.fillRect(left + 1, by - 1, lvW - 2, 7);
    text(ctx, lvTxt, left + 3, by, { color: '#ffd6e6', outline: null });
    bar(ctx, left + lvW + 3, by + 1, right - (left + lvW + 3), 3, g.xp / g.xpNeed, '#f7a6c4', '#ffd6e6');
    // Row 3: objective
    const oy = by + 10, o = g.obj;
    let label = '';
    if (o.type === 'survive') label = g.heli ? 'THE CHOPPER IS HERE!' : 'SURVIVE ' + clock(o.left);
    else if (o.type === 'defend') label = `TOWER ${Math.max(0, Math.round(g.tower.hp / g.tower.max * 100))}%  ${clock(o.left)}`;
    else if (o.type === 'rescue') label = g.extractOn ? 'REACH THE FLARE!' : `RESCUED ${Math.min(g.rescued, o.count)}/${o.count}`;
    else if (o.type === 'escort') label = `BUS ${Math.max(0, Math.round(g.bus.hp))}%`;
    else if (o.type === 'escape') label = 'RUN TO THE PLANE!';
    else if (o.type === 'endless') label = 'ENDLESS ' + clock(g.time);
    if (o.type === 'boss' && g.boss) {
      let hp = 0, max = 0; for (let i = 0; i < g.zombies.count; i++) { const z = g.zombies.items[i]; if (z.boss && !z.dead) { hp += Math.max(0, z.hp); max += z.maxHp; } }
      text(ctx, BOSSES[g.boss.type].name, W / 2, oy, { align: 'center', color: '#ff8a6a' });
      bar(ctx, left + 10, oy + 8, right - left - 20, 3, max ? hp / max : 0, '#e2384a', '#ff9a9a');
    } else if (o.type === 'boss') label = 'SOMETHING BIG IS COMING';
    if (label) chip(ctx, label, W / 2, oy, (o.type === 'rescue' && g.extractOn) || g.heli || o.type === 'escape' ? '#f4d35e' : '#ffffff');
    // Arrows to off-screen objectives (and survivors with the radar).
    const arrows = [];
    if (g.extractOn && g.world.extract) arrows.push({ x: g.world.extract[0], y: g.world.extract[1], col: '#ff6a6a' });
    else if (g.bus) arrows.push({ x: g.bus.x + 1, y: g.bus.y + 0.4, col: '#f4d35e' });
    else if (g.tower) arrows.push({ x: g.tower.x, y: g.tower.y, col: '#ff6a6a' });
    if (g.up.radar) { let best = null, bd = 1e9; for (const p of g.others) if (p.state === 'stranded') { const d = Math.hypot(p.x - g.leader.x, p.y - g.leader.y); if (d < bd) { bd = d; best = p; } } if (best) arrows.push({ x: best.x, y: best.y, col: '#9bd068' }); }
    for (const t of arrows) {
      const [sx, sy] = toScreen(t.x - g.leader.x, t.y - g.leader.y), cx = W / 2, cy = H * 0.56 - 8;
      if (Math.abs(sx) < W / 2 - 10 && Math.abs(sy) < H * 0.36) continue;
      const a = Math.atan2(sy, sx), k = Math.min((W / 2 - 12) / Math.abs(Math.cos(a) || 1e-3), (H * 0.34) / Math.abs(Math.sin(a) || 1e-3));
      const ax = Math.round(cx + Math.cos(a) * k), ay = Math.round(cy + Math.sin(a) * k);
      ctx.fillStyle = Math.floor(g.time * 4) % 2 ? t.col : '#ffffff';
      for (let i = 0; i < 6; i++) for (let w = -i; w <= i; w++) ctx.fillRect(Math.round(ax + Math.cos(a) * (6 - i) - Math.sin(a) * w * 0.6), Math.round(ay + Math.sin(a) * (6 - i) + Math.cos(a) * w * 0.6), 1, 1);
    }
    // Bottom corners: line size and dash, low down in the space that used to be unused.
    const bottom = H - s.bottom - 4;
    ctx.drawImage(sheets.icons.conga, left, bottom - 7);
    text(ctx, `${g.line.length}/${g.maxLine}`, left + 13, bottom - 6);
    const dx = right - 23, dy = bottom - 31;
    if (ui.button('', dx, dy, 24, 31, { invisible: true, id: 'dash' })) out.dash = true;
    ctx.drawImage(dashDisc, dx + 1, dy + 1);
    const cd = g.leader.dashCd / 2.2;
    if (cd > 0) {
      ctx.fillStyle = 'rgba(28,20,44,0.6)';
      for (let yy = 0; yy < 23; yy++) for (let xx = 0; xx < 23; xx++) { const a = (Math.atan2(xx - 11, -(yy - 11)) / (Math.PI * 2) + 1) % 1; if (Math.hypot(xx - 11, yy - 11) <= 11 && a < cd) ctx.fillRect(dx + 1 + xx, dy + 1 + yy, 1, 1); }
    }
    ctx.globalAlpha = cd > 0 ? 0.45 : 1; ctx.drawImage(sheets.icons.dash, dx + 8, dy + 8); ctx.globalAlpha = 1;
    text(ctx, 'DASH', dx + 12, dy + 26, { align: 'center', color: cd > 0 ? '#8a7f99' : '#ffffff' });
    if (input.stick) {
      const st = input.stick; rings(st.r);
      ctx.drawImage(inner, Math.round(st.ox - st.r + 1), Math.round(st.oy - st.r + 1));
      ctx.drawImage(outer, Math.round(st.ox - st.r - 1), Math.round(st.oy - st.r - 1));
      let jx = st.x - st.ox, jy = st.y - st.oy; const d = Math.hypot(jx, jy);
      if (d > st.r) { jx = jx / d * st.r; jy = jy / d * st.r; }
      const kr = (knob.width - 1) / 2; ctx.drawImage(knob, Math.round(st.ox + jx - kr), Math.round(st.oy + jy - kr));
    }
    const blink = Math.floor(g.time * 2) % 3 !== 0;
    if (g.intro > 0 && g.opts.level && g.state === 'play') text(ctx, g.opts.level.id + ' ' + g.opts.level.name, W / 2, H * 0.3, { align: 'center', color: '#f4d35e' });
    if (g.banner) text(ctx, g.banner.text, W / 2, H * 0.34, { align: 'center', color: g.banner.boss ? '#ff6a6a' : '#ffffff', scale: g.banner.boss && g.banner.text.length * 8 < W - 8 ? 2 : 1 });
    else if (!g.moved && blink) { text(ctx, 'DRAG ANYWHERE', W / 2, H * 0.72, { align: 'center' }); text(ctx, 'TO MOVE', W / 2, H * 0.72 + 8, { align: 'center' }); }
    else if (g.moved && g.rescued === 0 && g.time < 25 && blink) { text(ctx, 'TOUCH SURVIVORS', W / 2, H * 0.72, { align: 'center', color: '#f4d35e' }); text(ctx, 'TO JOIN YOUR LINE', W / 2, H * 0.72 + 8, { align: 'center', color: '#f4d35e' }); }
    if (fps !== null) text(ctx, `${fps}FPS Z${g.zombies.count}${g.debug.god ? ' GOD' : ''}`, left, oy + 14, { color: '#9fe870' });
    return out;
  };
}
