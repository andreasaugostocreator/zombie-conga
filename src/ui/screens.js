import { text } from '../render/font.js';

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

/** Title: bouncing logo over the live town, PLAY and SETTINGS. */
export function titleScreen(screen, ui, t, best) {
  const ctx = screen.ctx, W = screen.w, H = screen.h, s = screen.safe, out = {};
  // Soft dark band behind the logo, dithered at the bottom edge.
  const bandH = s.top + 64;
  ctx.fillStyle = 'rgba(28,20,44,0.55)'; ctx.fillRect(0, 0, W, bandH);
  ctx.fillStyle = 'rgba(28,20,44,0.55)'; for (let x = 0; x < W; x += 2) ctx.fillRect(x + (bandH % 2), bandH, 1, 1);
  const word = (w, y, color, phase) => {
    const total = w.length * 12 - 3; let x = cx(W) - total / 2;
    [...w].forEach((ch, i) => { text(ctx, ch, x + i * 12, y + Math.round(Math.sin(t * 3 + i * 0.7 + phase) * 1.5), { scale: 3, color }); });
  };
  word('ZOMBIE', s.top + 10, '#9bd068', 0);
  word('CONGA', s.top + 30, '#ff8a6a', 2);
  text(ctx, 'LEAD THE LINE. SAVE THEM ALL.', cx(W), s.top + 52, { align: 'center', color: '#f4d35e' });
  const bw = Math.min(96, W - 24), bx = cx(W) - bw / 2, by = H - s.bottom - 78;
  if (ui.button('PLAY', bx, by, bw, 22, { primary: true, scale: 2 }) || ui.takeKey('enter')) out.play = true;
  if (ui.button('SETTINGS', bx, by + 28, bw, 15)) out.settings = true;
  if (best.kills) text(ctx, `BEST: ${best.kills} KILLS, LINE OF ${best.line}`, cx(W), by + 50, { align: 'center', color: '#efe6d6' });
  return out;
}

/** Settings panel. Mutates `settings`; returns { back, changed }. */
export function settingsScreen(screen, ui, settings) {
  const ctx = screen.ctx, W = screen.w, H = screen.h, out = { changed: false };
  dim(ctx, W, H, 0.7);
  const pw = Math.min(118, W - 10), px = cx(W) - pw / 2, py = Math.round(H * 0.2);
  ui.panel(px, py, pw, 112);
  text(ctx, 'SETTINGS', cx(W), py + 6, { align: 'center', scale: 2, color: '#f4d35e' });
  const rows = [['sfx', 'SOUND EFFECTS'], ['vibration', 'VIBRATION'], ['reduceFx', 'REDUCE EFFECTS'], ['fps', 'SHOW FPS']];
  rows.forEach(([k, label], i) => {
    const v = ui.toggle(label, settings[k], px + 4, py + 24 + i * 16, pw - 8);
    if (v !== settings[k]) { settings[k] = v; out.changed = true; }
  });
  text(ctx, 'VIBRATION: ANDROID ONLY', cx(W), py + 89, { align: 'center', color: '#8a7f99' });
  if (ui.button('BACK', px + 8, py + 96 + 2, pw - 16, 12, { primary: true }) || ui.takeKey('enter')) out.back = true;
  return out;
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
  return picked;
}

export function deadScreen(screen, ui, g, best, newBest) {
  const ctx = screen.ctx, W = screen.w, H = screen.h, out = {};
  dim(ctx, W, H, 0.65);
  text(ctx, 'OVERRUN!', cx(W), H * 0.22, { align: 'center', scale: 3, color: '#e2384a' });
  const m = Math.floor(g.time / 60), sec = String(Math.floor(g.time % 60)).padStart(2, '0');
  const rows = [['TIME', `${m}:${sec}`], ['ZOMBIES', g.kills], ['RESCUED', g.rescued], ['LONGEST LINE', g.bestLine], ['LEVEL', g.level]];
  const y0 = Math.round(H * 0.34);
  rows.forEach(([k, v], i) => { text(ctx, k, cx(W) - 44, y0 + i * 9, { color: '#efe6d6' }); text(ctx, v, cx(W) + 44, y0 + i * 9, { align: 'right', color: '#f4d35e' }); });
  if (newBest) text(ctx, 'NEW BEST!', cx(W), y0 + 50, { align: 'center', color: '#9bd068' });
  const bw = Math.min(96, W - 24), bx = cx(W) - bw / 2, by = y0 + 62;
  if (g.time - g.deadAt > 0.6) {
    if (ui.button('TRY AGAIN', bx, by, bw, 18, { primary: true, scale: 1 }) || ui.takeKey('enter')) out.retry = true;
    if (ui.button('MENU', bx, by + 24, bw, 14)) out.menu = true;
  }
  return out;
}
