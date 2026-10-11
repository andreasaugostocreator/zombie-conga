import { text } from '../render/font.js';
import { LEVELS, OBJECTIVE_TEXT, starText } from '../data/levels.js';
import { REGIONS } from '../render/palette.js';
import { CAMP, ACHIEVEMENTS } from '../data/upgrades.js';
import { CLASSES } from '../data/classes.js';
import { BOSSES } from '../data/enemies.js';
import { totalStars, isUnlocked, endlessUnlocked, campCost, classAvailable, dailyInfo } from '../progress.js';

const cx = W => Math.round(W / 2);
function dim(ctx, W, H, a = 0.6) { ctx.fillStyle = `rgba(28,20,44,${a})`; ctx.fillRect(0, 0, W, H); }
/** Text that wraps to the given width (pixel font: 4 px per character). */
function wrap(ctx, str, x, y, width, opts) {
  const max = Math.floor(width / 4), lines = [];
  let line = '';
  for (const word of str.split(' ')) { if ((line + ' ' + word).trim().length > max) { lines.push(line); line = word; } else line = (line + ' ' + word).trim(); }
  if (line) lines.push(line);
  lines.forEach((l, i) => text(ctx, l, x, y + i * 7, opts));
  return lines.length * 7;
}

export function pauseScreen(screen, ui) {
  const ctx = screen.ctx, W = screen.w, H = screen.h, out = {};
  dim(ctx, W, H);
  text(ctx, 'PAUSED', cx(W), H * 0.3, { align: 'center', scale: 3, color: '#f4d35e' });
  const bw = Math.min(96, W - 24), bx = cx(W) - bw / 2, by = Math.round(H * 0.42);
  if (ui.button('RESUME', bx, by, bw, 18, { primary: true, scale: 2 }) || ui.takeKey('enter')) out.resume = true;
  if (ui.button('SETTINGS', bx, by + 24, bw, 14)) out.settings = true;
  if (ui.button('QUIT TO MENU', bx, by + 44, bw, 14)) out.quit = true;
  return out;
}

/** Three upgrade cards; returns the picked card. */
export function levelUpScreen(screen, ui, g, icons, t) {
  const ctx = screen.ctx, W = screen.w, H = screen.h, s = screen.safe;
  dim(ctx, W, H, 0.65);
  text(ctx, 'LEVEL UP!', cx(W), s.top + 24 + Math.round(Math.sin(t * 5)), { align: 'center', scale: 2, color: '#f7a6c4' });
  text(ctx, 'PICK ONE', cx(W), s.top + 40, { align: 'center', color: '#efe6d6' });
  const cw = Math.min(118, W - 10), x = cx(W) - cw / 2, ch = 38;
  if (!g.cards.length) return { id: 'none' };
  let picked = null;
  g.cards.forEach((u, i) => {
    const y = s.top + 52 + i * (ch + 6);
    if (ui.button('', x, y, cw, ch, { color: '#efe6d6', id: 'card' + i })) picked = u;
    ctx.drawImage(icons[u.icon], x + 5, y + 6);
    text(ctx, u.name, x + 20, y + 5, { color: '#2a2230', outline: null });
    u.desc.forEach((d, k) => text(ctx, d, x + 20, y + 14 + k * 7, { color: '#6b5a73', outline: null }));
    // Level pips
    const max = u.max || 5, lvl = g.up[u.id];
    for (let p = 0; p < max; p++) { ctx.fillStyle = p < lvl ? '#e2384a' : p === lvl ? '#f4d35e' : '#c9bda9'; ctx.fillRect(x + cw - 6 - (max - p) * 5, y + ch - 7, 4, 3); }
  });
  if (g.rerolls > 0 && ui.button('REROLL (' + g.rerolls + ')', x + 14, s.top + 52 + 3 * (ch + 6), cw - 28, 13, { id: 'reroll' })) g.reroll();
  return picked;
}

const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
/** Cans counter chip in the top-right corner. */
function cansChip(ctx, screen, icons, cans) {
  const s = screen.safe, right = screen.w - s.right - 4;
  const w = text(ctx, String(cans), right, s.top + 5, { align: 'right' });
  ctx.drawImage(icons.can, right - w - 7, s.top + 3);
}
function star(ctx, x, y, on, big) {
  const rows = big ? ['...y...', '..yyy..', 'yyyyyyy', '.yyyyy.', '.yy.yy.', 'y.....y'] : ['..y..', '.yyy.', 'yyyyy', '.y.y.'];
  ctx.fillStyle = '#1c1424';
  rows.forEach((r, j) => [...r].forEach((c, i) => { if (c === 'y') ctx.fillRect(x + i - 1, y + j, 3, 1), ctx.fillRect(x + i, y + j - 1, 1, 3); }));
  rows.forEach((r, j) => [...r].forEach((c, i) => { if (c === 'y') { ctx.fillStyle = on ? (j === 0 || j === 1 ? '#fff2a8' : '#f4d35e') : '#4a3d63'; ctx.fillRect(x + i, y + j, 1, 1); } }));
}

/** Title: logo over the live town, then the main menu. */
export function titleScreen(screen, ui, t, data, icons) {
  const ctx = screen.ctx, W = screen.w, H = screen.h, s = screen.safe, out = {};
  const bandH = s.top + 64;
  ctx.fillStyle = 'rgba(28,20,44,0.55)'; ctx.fillRect(0, 0, W, bandH);
  for (let x = 0; x < W; x += 2) ctx.fillRect(x + (bandH % 2), bandH, 1, 1);
  const word = (w, y, color, phase) => {
    const total = w.length * 12 - 3, x = cx(W) - total / 2;
    [...w].forEach((ch, i) => text(ctx, ch, x + i * 12, y + Math.round(Math.sin(t * 3 + i * 0.7 + phase) * 1.5), { scale: 3, color }));
  };
  word('ZOMBIE', s.top + 10, '#9bd068', 0);
  word('CONGA', s.top + 30, '#ff8a6a', 2);
  text(ctx, 'LEAD THE LINE. SAVE THEM ALL.', cx(W), s.top + 52, { align: 'center', color: '#f4d35e' });
  const bw = Math.min(104, W - 20), bx = cx(W) - bw / 2, bottom = H - s.bottom - 8;
  const daily = dailyInfo(), dailyDone = data.daily.last === daily.key;
  const endless = endlessUnlocked(data);
  let y = bottom - 128;
  if (ui.button('PLAY', bx, y, bw, 22, { primary: true, scale: 2, id: 'play' }) || ui.takeKey('enter')) out.play = true;
  text(ctx, `${totalStars(data)}/${LEVELS.length * 3}`, bx + bw - 4, y + 8, { align: 'right', color: '#7a5a1a', outline: null });
  y += 28;
  if (ui.button(dailyDone ? 'DAILY: DONE!' : 'DAILY CHALLENGE', bx, y, bw, 15, { id: 'daily', color: dailyDone ? '#b9e09a' : '#f7a6c4' })) out.daily = true;
  if (data.daily.streak > 1) text(ctx, data.daily.streak + 'X', bx + bw - 3, y - 3, { align: 'right', color: '#ff8a3d' });
  y += 20;
  if (ui.button(endless ? 'ENDLESS' : 'ENDLESS (CLEAR 3-6)', bx, y, bw, 15, { id: 'endless', color: endless ? '#efe6d6' : '#8a7f99' }) && endless) out.endless = true;
  y += 20;
  const hw = (bw - 4) / 2;
  if (ui.button('CAMP', bx, y, hw, 15, { icon: icons.camp, id: 'camp' })) out.camp = true;
  if (ui.button('AWARDS', bx + hw + 4, y, hw, 15, { icon: icons.star, id: 'awards' })) out.awards = true;
  y += 20;
  if (ui.button('SETTINGS', bx, y, bw, 15, { icon: icons.gear, id: 'settings' })) out.settings = true;
  cansChip(ctx, screen, icons, data.cans);
  return out;
}

/** Settings panel. Mutates `settings`; returns { back, changed, reset }. */
export function settingsScreen(screen, ui, settings) {
  const ctx = screen.ctx, W = screen.w, H = screen.h, out = { changed: false };
  dim(ctx, W, H, 0.7);
  const rows = [['sfx', 'SOUND EFFECTS'], ['music', 'MUSIC'], ['haptics', 'HAPTICS'], ['reduceFx', 'REDUCE EFFECTS'], ['fps', 'SHOW FPS']];
  const pw = Math.min(118, W - 10), ph = 34 + rows.length * 16 + 26, px = cx(W) - pw / 2, py = Math.round((H - ph) / 2);
  ui.panel(px, py, pw, ph);
  text(ctx, 'SETTINGS', cx(W), py + 6, { align: 'center', scale: 2, color: '#f4d35e' });
  rows.forEach(([k, label], i) => {
    const v = ui.toggle(label, settings[k], px + 4, py + 24 + i * 16, pw - 8);
    if (v !== settings[k]) { settings[k] = v; out.changed = true; }
  });
  const by = py + 24 + rows.length * 16;
  text(ctx, 'HAPTICS NEED IOS 18 OR ANDROID', cx(W), by + 1, { align: 'center', color: '#8a7f99' });
  if (ui.button('BACK', px + 8, by + 10, pw - 16, 12, { primary: true, id: 'back' }) || ui.takeKey('enter')) out.back = true;
  return out;
}

/** World map: one region per page (an island diorama with six level nodes). */
export function mapScreen(screen, ui, t, data, state, icons, debug) {
  const ctx = screen.ctx, W = screen.w, H = screen.h, s = screen.safe, out = {};
  const r = state.region, P = REGIONS[r], levels = LEVELS.filter(l => l.region === r);
  // Sea with drifting dithered wave lines.
  ctx.fillStyle = '#2d5d86'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#3a72a0';
  for (let y = 0; y < H; y += 6) for (let x = 0; x < W; x += 2) if (((x + Math.floor(t * 6) + y * 3) % 16) < 5) ctx.fillRect(x + (y % 12 ? 1 : 0), y, 1, 1);
  const regionOpen = isUnlocked(data, r * 6, debug);
  if (ui.button('', s.left + 4, s.top + 3, 14, 12, { icon: icons.back, id: 'back' })) out.back = true;
  cansChip(ctx, screen, icons, data.cans);
  text(ctx, `REGION ${r + 1}`, cx(W), s.top + 6, { align: 'center', color: '#c9dff0' });
  text(ctx, P.name, cx(W), s.top + 16, { align: 'center', scale: 2, color: regionOpen ? '#f4d35e' : '#8a9fb5' });
  const got = levels.reduce((a, l) => a + (data.stars[l.id] || 0), 0);
  star(ctx, cx(W) - 14, s.top + 33, true); text(ctx, `${got}/18`, cx(W) - 7, s.top + 33, { color: '#ffffff' });
  // Island: an isometric slab in the region's colours, with little buildings.
  const R = Math.floor((W - 10) / 2), V = Math.min(R * 0.95, (H - s.top - s.bottom - 110) / 2), icx = cx(W), icy = Math.round(s.top + 50 + (H - s.top - s.bottom - 86) / 2) - 8;
  const bob = Math.round(Math.sin(t * 1.4) * 1.5);
  const grass = P.grass || ['#7fb069'], side = P.dirt || ['#8f7558', '#76604a'], thick = 18;
  const D = (a, b) => [Math.round(icx + (a - b) * R / 2), Math.round(icy + (a + b) * V / 2 + bob)];
  ctx.fillStyle = 'rgba(20,40,70,0.5)';
  for (let x = -R; x <= R; x++) { const yb = Math.round(V * (1 - Math.abs(x) / R)); ctx.fillRect(icx + x + 4, icy + yb + thick + 2, 1, 3); }
  for (let x = -R; x <= R; x++) {
    const yb = Math.round(V * (1 - Math.abs(x) / R));
    for (let k = 0; k <= thick; k++) { ctx.fillStyle = k === thick ? '#1c1424' : (x < 0 ? side[0] : side[1] || side[0]); if (k > 3 && (x + k * 3) % 7 === 0) ctx.fillStyle = side[2] || '#5c4a3a'; ctx.fillRect(icx + x, icy + yb + bob + k, 1, 1); }
  }
  for (let y = -Math.round(V); y <= Math.round(V); y++) {
    const half = Math.round(R * (1 - Math.abs(y) / V));
    for (let x = -half; x <= half; x++) { ctx.fillStyle = grass[(((x >> 2) + (y >> 1)) & 3) % grass.length]; ctx.fillRect(icx + x, icy + y + bob, 1, 1); }
  }
  ctx.fillStyle = '#ffffff'; for (let x = -R; x <= R; x += 1) { const yb = Math.round(V * (1 - Math.abs(x) / R)); if ((x + Math.floor(t * 8)) % 9 < 3) ctx.fillRect(icx + x, icy + yb + bob + thick + 1, 1, 1); }
  // Six nodes snake down the island; a house or tree sits beside each.
  const nodes = [0, 1, 2, 3, 4, 5].map(i => { const dy = -0.72 + i * 0.288, half = R * (1 - Math.abs(dy)); return [Math.round(icx + (i % 2 ? 0.42 : -0.42) * half), Math.round(icy + dy * V + bob), half]; });
  nodes.forEach(([nx, y0, half], i) => {
    const x = Math.round(icx + (i % 2 ? -0.5 : 0.5) * half), y = y0 + 4, hs = P.houses ? P.houses[i % P.houses.length] : null;
    if (i % 3 === 1 || !hs) { ctx.fillStyle = '#1c1424'; ctx.fillRect(x - 3, y - 9, 7, 9); ctx.fillStyle = '#3f7a3a'; ctx.fillRect(x - 2, y - 8, 5, 6); ctx.fillStyle = '#6faa4c'; ctx.fillRect(x - 2, y - 8, 3, 3); ctx.fillStyle = '#6b4a2a'; ctx.fillRect(x, y - 2, 1, 2); return; }
    ctx.fillStyle = '#1c1424'; ctx.fillRect(x - 6, y - 10, 13, 12);
    ctx.fillStyle = hs.wall[1]; ctx.fillRect(x - 5, y - 5, 6, 6); ctx.fillStyle = hs.wall[2]; ctx.fillRect(x + 1, y - 5, 5, 6);
    ctx.fillStyle = hs.roof ? hs.roof[0] : '#c4bcae'; ctx.fillRect(x - 5, y - 9, 11, 4);
    ctx.fillStyle = '#8fd3ee'; ctx.fillRect(x - 3, y - 3, 2, 2); ctx.fillRect(x + 2, y - 3, 2, 2);
  });
  ctx.fillStyle = '#efe6d6';
  for (let i = 1; i < nodes.length; i++) { const [a, b] = nodes[i - 1], [c, d] = nodes[i], n = Math.round(Math.hypot(c - a, d - b) / 3); for (let k = 0; k <= n; k++) ctx.fillRect(Math.round(a + (c - a) * k / n), Math.round(b + (d - b) * k / n), 1, 1); }
  levels.forEach((l, i) => {
    const gi = r * 6 + i, open = isUnlocked(data, gi, debug), done = !!data.cleared[l.id], [x, y] = nodes[i];
    const boss = l.obj.type === 'boss', size = boss ? 8 : 6, next = open && !done;
    const face = done ? '#9bd068' : open ? '#f4d35e' : '#5c4a78';
    ctx.fillStyle = '#1c1424'; ctx.fillRect(x - size - 1, y - size + 1, size * 2 + 2, size * 2 - 2); ctx.fillRect(x - size + 1, y - size - 1, size * 2 - 2, size * 2 + 2);
    ctx.fillStyle = face; ctx.fillRect(x - size, y - size + 1, size * 2, size * 2 - 2); ctx.fillRect(x - size + 1, y - size, size * 2 - 2, size * 2);
    if (next && Math.floor(t * 3) % 2) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - size + 1, y - size, size * 2 - 2, 1); }
    if (!open) ctx.drawImage(icons.lock, x - 3, y - 3);
    else if (boss) ctx.drawImage(icons.skull, x - 3, y - 3);
    else text(ctx, String(i + 1), x, y - 2, { align: 'center', color: '#2a2230', outline: null });
    if (done) for (let k = 0; k < 3; k++) star(ctx, x - 7 + k * 5, y + size + 1, k < (data.stars[l.id] || 0));
    if (next) { const a = Math.round(Math.sin(t * 6) * 2); ctx.fillStyle = '#ffffff'; for (let k = 0; k < 3; k++) ctx.fillRect(x - k, y - size - 6 - k + a, k * 2 + 1, 1); }
    if (ui.button('', x - 10, y - 10, 20, 20, { invisible: true, id: 'lv' + l.id }) && open) out.pick = l;
  });
  // Region arrows
  const ay = H - s.bottom - 20;
  if (r > 0 && ui.button('< PREV', s.left + 4, ay, 46, 15, { id: 'prev' })) out.region = r - 1;
  if (r < REGIONS.length - 1 && ui.button('NEXT >', W - s.right - 50, ay, 46, 15, { id: 'next' })) out.region = r + 1;
  for (let i = 0; i < REGIONS.length; i++) { ctx.fillStyle = i === r ? '#f4d35e' : '#5c4a78'; ctx.fillRect(cx(W) - 13 + i * 4, ay + 6, 3, 3); }
  return out;
}

/** The card for one level: objective, star goals, PLAY. */
export function levelCard(screen, ui, level, data, icons) {
  const ctx = screen.ctx, W = screen.w, H = screen.h, out = {};
  dim(ctx, W, H, 0.6);
  const pw = Math.min(120, W - 8), ph = 128, px = cx(W) - pw / 2, py = Math.round((H - ph) / 2);
  ui.panel(px, py, pw, ph);
  text(ctx, level.id, cx(W), py + 5, { align: 'center', color: '#c9bda9' });
  text(ctx, level.name, cx(W), py + 14, { align: 'center', color: '#f4d35e', scale: level.name.length * 8 < pw - 6 ? 2 : 1 });
  let y = py + 30;
  if (level.night) { text(ctx, 'NIGHT LEVEL', cx(W), y, { align: 'center', color: '#9fb3ff' }); y += 8; }
  if (level.obj.type === 'boss') { text(ctx, 'BOSS: ' + BOSSES[level.obj.boss].name, cx(W), y, { align: 'center', color: '#ff6a6a' }); y += 8; }
  y += wrap(ctx, OBJECTIVE_TEXT[level.obj.type](level), px + 6, y, pw - 12, { color: '#ffffff' }) + 4;
  const have = data.stars[level.id] || 0;
  const goals = ['CLEAR THE LEVEL', starText(level.stars[0]), starText(level.stars[1])];
  goals.forEach((gl, i) => { star(ctx, px + 6, y + 1, i < have); y += wrap(ctx, gl, px + 14, y, pw - 18, { color: i < have ? '#f4d35e' : '#c9bda9' }) + 2; });
  text(ctx, `REWARD: ${level.cans}`, px + 6, y + 2, { color: '#c9ccd3' });
  const by = py + ph - 20;
  if (ui.button('BACK', px + 6, by, 38, 14, { id: 'cardback' })) out.back = true;
  if (ui.button('PLAY', px + 48, by, pw - 54, 14, { primary: true, id: 'go' }) || ui.takeKey('enter')) out.play = true;
  return out;
}

/** After a level / daily / endless run. */
export function resultsScreen(screen, ui, g, data, t, info) {
  const ctx = screen.ctx, W = screen.w, H = screen.h, s = screen.safe, out = {}, res = g.result, since = g.time - g.endAt;
  dim(ctx, W, H, Math.min(0.7, since));
  if (since < 0.8) return out;
  const k = since - 0.8;
  const won = res.won, endless = g.mode === 'endless';
  const title = endless ? 'GAME OVER' : won ? 'CLEARED!' : 'FAILED';
  text(ctx, title, cx(W), s.top + 26 + Math.round(Math.sin(t * 4) * (won ? 1 : 0)), { align: 'center', scale: 3, color: won ? '#9bd068' : '#e2384a' });
  let y = s.top + 52;
  if (!won && res.reason) { text(ctx, res.reason, cx(W), y, { align: 'center', color: '#ffb3b3' }); y += 10; }
  if (won && g.mode === 'level') {
    for (let i = 0; i < 3; i++) {
      const on = res.stars[i] && k > 0.3 + i * 0.35;
      if (on && !info.starSfx[i]) { info.starSfx[i] = true; info.onStar && info.onStar(i); }
      star(ctx, cx(W) - 18 + i * 14 - 3, y + (i === 1 ? -3 : 0), on, true);
    }
    y += 14;
  }
  const rows = [['TIME', clock(g.endAt)], ['ZOMBIES', g.kills], ['RESCUED', g.rescued], ['LONGEST LINE', g.bestLine]];
  if (endless) rows.push(['BEST', clock(data.endless.best)]);
  rows.forEach(([a, b], i) => { text(ctx, a, cx(W) - 46, y + i * 9, { color: '#efe6d6' }); text(ctx, String(b), cx(W) + 46, y + i * 9, { align: 'right', color: '#f4d35e' }); });
  y += rows.length * 9 + 4;
  const shown = Math.min(res.cans, Math.floor(res.cans * Math.min(1, k / 1.2)));
  ctx.drawImage(info.icons.can, cx(W) - 24, y); text(ctx, `+${shown}  CANS`, cx(W) - 16, y + 1, { color: '#ffffff' });
  y += 12;
  for (const a of info.ach) { text(ctx, 'AWARD: ' + a.name, cx(W), y, { align: 'center', color: '#f7a6c4' }); y += 8; }
  if (k < 0.6) return out;
  const bw = Math.min(100, W - 20), bx = cx(W) - bw / 2, by = H - s.bottom - 64;
  if (won && info.next) { if (ui.button('NEXT LEVEL', bx, by, bw, 18, { primary: true, id: 'nextlv' }) || ui.takeKey('enter')) out.next = true; }
  else if (ui.button(endless || g.mode === 'daily' ? 'PLAY AGAIN' : 'TRY AGAIN', bx, by, bw, 18, { primary: true, id: 'retry' }) || ui.takeKey('enter')) out.retry = true;
  if (won && info.next && ui.button('REPLAY', bx, by + 23, (bw - 4) / 2, 14, { id: 'retry' })) out.retry = true;
  if (ui.button(g.mode === 'level' ? 'MAP' : 'MENU', won && info.next ? bx + (bw + 4) / 2 : bx, by + 23, won && info.next ? (bw - 4) / 2 : bw, 14, { id: 'menu' })) out.menu = true;
  if (ui.button('BASE CAMP', bx, by + 41, bw, 14, { id: 'camp', icon: info.icons.camp })) out.camp = true;
  return out;
}

/** Base Camp: spend cans on permanent upgrades and new survivor types. */
export function campScreen(screen, ui, data, state, icons, sheets, t) {
  const ctx = screen.ctx, W = screen.w, H = screen.h, s = screen.safe, out = {};
  dim(ctx, W, H, 0.55);
  if (ui.button('', s.left + 4, s.top + 3, 14, 12, { icon: icons.back, id: 'back' })) out.back = true;
  cansChip(ctx, screen, icons, data.cans);
  text(ctx, 'BASE CAMP', cx(W), s.top + 16, { align: 'center', scale: 2, color: '#f4d35e' });
  const tw = (W - s.left - s.right - 12) / 2, ty = s.top + 32;
  if (ui.button('UPGRADES', s.left + 4, ty, tw, 13, { id: 'tabU', color: state.tab === 0 ? '#f4d35e' : '#8a7f99' })) state.tab = 0;
  if (ui.button('SURVIVORS', s.left + 8 + tw, ty, tw, 13, { id: 'tabS', color: state.tab === 1 ? '#f4d35e' : '#8a7f99' })) state.tab = 1;
  const x = s.left + 4, w = W - s.left - s.right - 8;
  let y = ty + 19;
  if (state.tab === 0) {
    const rh = Math.min(30, Math.floor((H - s.bottom - y - 6) / CAMP.length));
    CAMP.forEach(c => {
      const lv = data.camp[c.id] || 0, cost = campCost(data, c.id);
      ctx.fillStyle = 'rgba(28,20,44,0.7)'; ctx.fillRect(x, y, w, rh - 3);
      text(ctx, c.name, x + 3, y + 3, { color: '#f4d35e' });
      text(ctx, c.desc, x + 3, y + 11, { color: '#c9bda9' });
      for (let p = 0; p < c.costs.length; p++) { ctx.fillStyle = p < lv ? '#9bd068' : '#4a3d63'; ctx.fillRect(x + 3 + p * 6, y + rh - 9, 5, 3); }
      if (cost === null) text(ctx, 'MAX', x + w - 4, y + 7, { align: 'right', color: '#9bd068' });
      else if (ui.button(String(cost), x + w - 34, y + 3, 32, 13, { icon: icons.can, id: 'buy' + c.id, color: data.cans >= cost ? '#f4d35e' : '#8a7f99' })) out.buy = c.id;
      y += rh;
    });
  } else {
    const list = Object.keys(CLASSES), rh = Math.min(26, Math.floor((H - s.bottom - y - 6) / list.length));
    list.forEach(id => {
      const c = CLASSES[id], have = data.classes.includes(id), avail = classAvailable(data, id);
      ctx.fillStyle = 'rgba(28,20,44,0.7)'; ctx.fillRect(x, y, w, rh - 2);
      const sh = sheets.survivors[id]; if (sh) { if (!have) ctx.globalAlpha = 0.35; ctx.drawImage(sh.S[Math.floor(t * 4) % 4], x, y + (rh - 2) / 2 - 10); ctx.globalAlpha = 1; }
      text(ctx, c.label, x + 18, y + 3, { color: have ? c.color : '#8a7f99' });
      text(ctx, c.desc, x + 18, y + 11, { color: '#c9bda9' });
      if (have) text(ctx, c.cost ? 'OWNED' : 'START', x + w - 3, y + 3, { align: 'right', color: '#9bd068' });
      else if (!avail) text(ctx, 'CLEAR ' + c.need, x + w - 3, y + 3, { align: 'right', color: '#8a7f99' });
      else if (ui.button(String(c.cost), x + w - 34, y + 2, 32, 12, { icon: icons.can, id: 'cls' + id, color: data.cans >= c.cost ? '#f4d35e' : '#8a7f99' })) out.cls = id;
      y += rh;
    });
  }
  return out;
}

/** Achievements, ten per page. */
export function awardsScreen(screen, ui, data, state, icons) {
  const ctx = screen.ctx, W = screen.w, H = screen.h, s = screen.safe, out = {};
  dim(ctx, W, H, 0.6);
  if (ui.button('', s.left + 4, s.top + 3, 14, 12, { icon: icons.back, id: 'back' })) out.back = true;
  const have = ACHIEVEMENTS.filter(a => data.ach[a.id]).length;
  text(ctx, 'AWARDS', cx(W), s.top + 16, { align: 'center', scale: 2, color: '#f4d35e' });
  text(ctx, `${have}/${ACHIEVEMENTS.length}`, cx(W), s.top + 30, { align: 'center', color: '#c9bda9' });
  const per = Math.max(6, Math.floor((H - s.top - s.bottom - 70) / 18)), pages = Math.ceil(ACHIEVEMENTS.length / per);
  state.page = Math.min(state.page, pages - 1);
  const x = s.left + 4, w = W - s.left - s.right - 8;
  ACHIEVEMENTS.slice(state.page * per, state.page * per + per).forEach((a, i) => {
    const y = s.top + 40 + i * 18, on = !!data.ach[a.id];
    ctx.fillStyle = on ? 'rgba(80,60,20,0.8)' : 'rgba(28,20,44,0.7)'; ctx.fillRect(x, y, w, 16);
    ctx.globalAlpha = on ? 1 : 0.3; ctx.drawImage(icons[a.icon], x + 3, y + 4); ctx.globalAlpha = 1;
    text(ctx, a.name, x + 15, y + 2, { color: on ? '#f4d35e' : '#8a7f99' });
    text(ctx, a.desc, x + 15, y + 9, { color: on ? '#efe6d6' : '#6b5f7d' });
  });
  const ay = H - s.bottom - 22;
  if (state.page > 0 && ui.button('<', s.left + 4, ay, 24, 15, { id: 'prev' })) state.page--;
  if (state.page < pages - 1 && ui.button('>', W - s.right - 28, ay, 24, 15, { id: 'next' })) state.page++;
  text(ctx, `${state.page + 1}/${pages}`, cx(W), ay + 5, { align: 'center' });
  return out;
}

/** The daily challenge card. */
export function dailyCard(screen, ui, data, icons) {
  const ctx = screen.ctx, W = screen.w, H = screen.h, out = {}, info = dailyInfo();
  dim(ctx, W, H, 0.6);
  const pw = Math.min(120, W - 8), ph = 112, px = cx(W) - pw / 2, py = Math.round((H - ph) / 2);
  ui.panel(px, py, pw, ph);
  text(ctx, 'DAILY CHALLENGE', cx(W), py + 6, { align: 'center', color: '#f7a6c4' });
  text(ctx, info.key, cx(W), py + 14, { align: 'center', color: '#8a7f99' });
  text(ctx, info.mod.name, cx(W), py + 26, { align: 'center', scale: 2, color: '#f4d35e' });
  let y = py + 42;
  y += wrap(ctx, info.mod.desc, px + 6, y, pw - 12, { color: '#ffffff' }) + 3;
  y += wrap(ctx, `${REGIONS[info.region].name}. SURVIVE 2:30.`, px + 6, y, pw - 12, { color: '#c9bda9' }) + 3;
  text(ctx, `STREAK: ${data.daily.streak}   REWARD: 40`, px + 6, y, { color: '#c9ccd3' });
  const by = py + ph - 20;
  if (ui.button('BACK', px + 6, by, 38, 14, { id: 'cardback' })) out.back = true;
  if (ui.button('PLAY', px + 48, by, pw - 54, 14, { primary: true, id: 'go' }) || ui.takeKey('enter')) out.play = true;
  return out;
}
