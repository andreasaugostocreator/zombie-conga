import { toScreen } from './iso.js';
import { makeCanvas } from './screen.js';
import { text } from './font.js';
import { makeCloud } from './sprites.js';
import { createLighting } from './lighting.js';

const lerp = (a, b, t) => a + (b - a) * t;
const FRAME_RATE = 8;

/**
 * Draws one frame of a world: sky → baked ground → ground decals → shadows → depth-sorted statics,
 * characters, pickups and projectiles → particles → night lighting. Positions rounded to pixels.
 */
export function createRenderer(screen, world, sheets, pal) {
  for (const s of world.statics) {
    const [sx, sy] = toScreen(s.wx, s.wy, s.wz);
    s.rx = Math.round(sx - s.sprite.ax); s.ry = Math.round(sy - s.sprite.ay);
    s.rw = s.sprite.canvas.width; s.rh = s.sprite.canvas.height;
  }
  const solidAt = (spr, x, y) => {
    if (!spr.alphaMap) { const c = spr.canvas, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; spr.alphaMap = new Uint8Array(c.width * c.height); for (let i = 0; i < spr.alphaMap.length; i++) spr.alphaMap[i] = d[i * 4 + 3]; }
    x = Math.floor(x); y = Math.floor(y);
    return x >= 0 && y >= 0 && x < spr.canvas.width && y < spr.canvas.height && spr.alphaMap[y * spr.canvas.width + x] > 128;
  };
  let sky = null, skyKey = '';
  function skyCanvas() {
    const key = screen.w + 'x' + screen.h;
    if (key === skyKey) return sky;
    const [c, x] = makeCanvas(screen.w, screen.h);
    const S = pal.sky, band = Math.ceil(screen.h / S.length);
    for (let y = 0; y < screen.h; y++) for (let xx = 0; xx < screen.w; xx++) {
      const t = y / band, i = Math.floor(t), f = t - i;
      const pick = f > 0.75 && ((xx + y) % 2 === 0) ? Math.min(S.length - 1, i + 1) : Math.min(S.length - 1, i);
      x.fillStyle = S[pick]; x.fillRect(xx, y, 1, 1);
    }
    sky = c; skyKey = key;
    return c;
  }
  const clouds = [0, 1, 2, 3, 4].map(i => ({ c: makeCloud(900 + i * 13), x: i * 97 % 300, y: 18 + (i * 53) % 150, v: 2 + (i % 3) }));
  const night = createLighting(screen);
  const items = [];
  const item = (i) => items[i] || (items[i] = { key: 0, kind: 0, ref: null, x: 0, y: 0, alpha: 1 });
  const zsheet = z => z.boss ? sheets.boss[z.type + (z.type === 'pz' ? z.scale : '')] : z.type === 'walker' ? sheets.zombies[z.look % sheets.zombies.length] : sheets.zt[z.type];

  function drawPerson(ctx, p, x, y, time) {
    const sheet = sheets.survivors[p.cls];
    const frame = (p.state === 'stranded' || p.state === 'panic') ? 0 : Math.floor(p.anim * 4) % 4;
    let img = sheet[p.face][frame], jx = 0;
    if (p.state === 'turning') { img = Math.floor(p.t * 8) % 2 ? sheets.zombies[1].S[0] : sheet.flash.S[0]; jx = Math.round(Math.sin(time * 40)); }
    else if (p.flash > 0) img = sheet.flash[p.face][frame];
    if (p.state === 'panic') jx = Math.round(Math.sin(time * 50));
    if (p.state === 'stranded') img = sheet.S[Math.floor(time * 3 + p.bob) % 2 ? 1 : 3];
    ctx.drawImage(img, x - 9 + jx, y - 16);
    if (p.state === 'line' && p.muzzle > 0) { const off = { E: [7, -9], W: [-11, -9], S: [2, -6], N: [-2, -10] }[p.face]; ctx.drawImage(sheets.muzzle, x + off[0], y + off[1]); }
    if (p.state === 'stranded') ctx.drawImage(sheets.help, x - 4, y - 28 + Math.round(Math.sin(p.bob) * 1.5));
    if (p.state === 'panic' && Math.floor(time * 6) % 2) ctx.drawImage(sheets.panic, x - 4, y - 28);
    if (p.state === 'line') {
      if (p.tough > 0) { ctx.fillStyle = '#1c1424'; ctx.fillRect(x + 3, y - 18, 5, 5); ctx.fillStyle = '#5aa9cf'; ctx.fillRect(x + 4, y - 17, 3, 3); }
      for (let k = 0; k < p.lvl; k++) { ctx.fillStyle = '#1c1424'; ctx.fillRect(x - 5 + k * 4, y - 19, 3, 3); ctx.fillStyle = '#f4d35e'; ctx.fillRect(x - 4 + k * 4, y - 18, 1, 1); }
    }
  }

  return function render(g, alpha) {
    const ctx = screen.ctx, W = screen.w, H = screen.h;
    ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1;
    ctx.drawImage(skyCanvas(), 0, 0);
    const L = g.leader;
    const lx = lerp(L.px, L.x, alpha), ly = lerp(L.py, L.y, alpha);
    const camX = lerp(g.cam.px, g.cam.x, alpha), camY = lerp(g.cam.py, g.cam.y, alpha);
    const sh = g.shake > 0 ? g.shake : 0;
    const ox = Math.round(W / 2 - camX + (Math.random() - 0.5) * sh), oy = Math.round(H * 0.56 - camY + (Math.random() - 0.5) * sh);
    const S = (wx, wy, wz = 0) => { const [x, y] = toScreen(wx, wy, wz); return [Math.round(ox + x), Math.round(oy + y)]; };
    const inView = (x, y, m = 30) => x > -m && x < W + m && y > -m && y < H + m * 2;
    for (const cl of clouds) { const span = W + 120, x = ((cl.x + g.time * cl.v - camX * 0.25) % span + span) % span - 60; ctx.drawImage(cl.c, Math.round(x), Math.round(cl.y - camY * 0.15 + 40)); }
    const gr = world.groundSprite;
    ctx.drawImage(gr.canvas, ox - gr.ax, oy - gr.ay);
    const E = g.effects;
    for (let i = 0; i < E.decals.count; i++) {
      const d = E.decals.items[i], [x, y] = S(d.x, d.y);
      if (x < -2 || y < -2 || x > W || y > H) continue;
      ctx.globalAlpha = Math.min(1, d.life / 4); ctx.fillStyle = d.color; ctx.fillRect(x, y, d.size, 1);
    }
    ctx.globalAlpha = 1;
    for (const p of g.puddles) { const [x, y] = S(p.x, p.y); ctx.globalAlpha = Math.min(1, p.t); ctx.drawImage(sheets.puddle, x - 8, y - 4); ctx.globalAlpha = 1; }
    for (const mn of g.mines) if (mn.alive) { const [x, y] = S(mn.x, mn.y); ctx.fillStyle = '#3a3742'; ctx.fillRect(x - 2, y - 1, 5, 2); if (Math.floor(g.time * 3) % 2) { ctx.fillStyle = '#ff4a4a'; ctx.fillRect(x, y - 1, 1, 1); } }
    for (const mk of g.markers) { const [x, y] = S(mk.x, mk.y); ctx.fillStyle = Math.floor(mk.t * 10) % 2 ? '#ff4a4a' : '#ffffff'; for (let a = 0; a < 16; a++) ctx.fillRect(Math.round(x + Math.cos(a / 16 * 6.28) * 10), Math.round(y + Math.sin(a / 16 * 6.28) * 5), 1, 1); }
    if (g.extractOn && world.extract) { const [x, y] = S(world.extract[0], world.extract[1]); ctx.fillStyle = Math.floor(g.time * 4) % 2 ? '#ff6a6a' : '#f4d35e'; for (let a = 0; a < 24; a++) ctx.fillRect(Math.round(x + Math.cos(a / 24 * 6.28) * 14), Math.round(y + Math.sin(a / 24 * 6.28) * 7), 1, 1); }
    for (let i = 0; i < E.corpses.count; i++) {
      const c = E.corpses.items[i], [x, y] = S(c.x, c.y);
      const [type, look, scale] = String(c.sprite).split(':'), k = +scale || 1;
      const sht = type === 'pz' ? sheets.boss['pz' + k] : type === 'walker' ? sheets.zombies[+look % sheets.zombies.length] : sheets.zt[type] || sheets.zombies[0];
      if (!sht) continue;
      ctx.globalAlpha = Math.min(1, c.life / 3);
      const spr = sht.corpse, w = spr.width;
      if (c.flip) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(spr, -w / 2, y - spr.height * 0.6); ctx.restore(); } else ctx.drawImage(spr, x - w / 2, y - spr.height * 0.6);
    }
    ctx.globalAlpha = 1;

    let n = 0;
    const leaderKey = lx + ly;
    const [lsx, lsy] = S(lx, ly);
    for (const s of world.statics) {
      const x = ox + s.rx, y = oy + s.ry;
      if (x > W || y > H || x + s.rw < 0 || y + s.rh < 0) continue;
      const it = item(n++); it.key = s.key; it.kind = 0; it.ref = s; it.x = x; it.y = y;
      it.alpha = s.tall && g.state !== 'title' && s.key > leaderKey + 0.25 && (solidAt(s.sprite, lsx - x, lsy - 8 - y) || solidAt(s.sprite, lsx - x, lsy - 3 - y)) ? 0.45 : 1;
    }
    for (let i = 0; i < g.zombies.count; i++) {
      const z = g.zombies.items[i], zx = lerp(z.px, z.x, alpha), zy = lerp(z.py, z.y, alpha), [x, y] = S(zx, zy);
      if (!inView(x, y, 60)) continue;
      const it = item(n++); it.key = zx + zy; it.kind = 1; it.ref = z; it.x = x; it.y = y;
    }
    if (g.state !== 'title') { const it = item(n++); it.key = leaderKey; it.kind = 2; it.ref = L; it.x = lsx; it.y = lsy; }
    for (const p of g.line.concat(g.others)) {
      const px = lerp(p.px, p.x, alpha), py = lerp(p.py, p.y, alpha), [x, y] = S(px, py);
      if (!inView(x, y)) continue;
      const it = item(n++); it.key = px + py; it.kind = 4; it.ref = p; it.x = x; it.y = y;
    }
    for (let i = 0; i < g.pickups.count; i++) {
      const b = g.pickups.items[i], bx = lerp(b.px, b.x, alpha), by = lerp(b.py, b.y, alpha), [x, y] = S(bx, by);
      if (!inView(x, y, 10)) continue;
      const it = item(n++); it.key = bx + by; it.kind = 5; it.ref = b; it.x = x; it.y = y;
    }
    for (const b of g.barrels) { if (!b.alive) continue; const [x, y] = S(b.x, b.y); if (!inView(x, y)) continue; const it = item(n++); it.key = b.x + b.y; it.kind = 6; it.ref = b; it.x = x; it.y = y; }
    if (g.up && g.up.saw && g.state !== 'title') for (let k = 0; k < g.up.saw; k++) {
      const a = g.sawAngle + k * Math.PI * 2 / g.up.saw, sx = lx + Math.cos(a) * 1.15, sy = ly + Math.sin(a) * 1.15, [x, y] = S(sx, sy, 0.45);
      const it = item(n++); it.key = sx + sy; it.kind = 7; it.ref = null; it.x = x; it.y = y;
    }
    for (let i = 0; i < g.bullets.count; i++) { const b = g.bullets.items[i], bx = lerp(b.px, b.x, alpha), by = lerp(b.py, b.y, alpha); const it = item(n++); it.key = bx + by; it.kind = 3; it.ref = b; it.x = bx; it.y = by; }
    for (let i = 0; i < g.shots.count; i++) { const b = g.shots.items[i], bx = lerp(b.px, b.x, alpha), by = lerp(b.py, b.y, alpha); const it = item(n++); it.key = bx + by + 0.5; it.kind = 8; it.ref = b; it.x = bx; it.y = by; }
    for (const tr of g.turrets) { const [x, y] = S(tr.x, tr.y); const it = item(n++); it.key = tr.x + tr.y; it.kind = 9; it.ref = tr; it.x = x; it.y = y; }
    if (g.bus) { const bx = lerp(g.bus.px, g.bus.x, alpha), by = lerp(g.bus.py, g.bus.y, alpha), [x, y] = S(bx, by); const it = item(n++); it.key = bx + by + 1.7; it.kind = 10; it.ref = g.bus; it.x = x; it.y = y; }
    if (g.tower) { const [x, y] = S(g.tower.x - 0.5, g.tower.y - 0.5); const it = item(n++); it.key = g.tower.x + g.tower.y; it.kind = 11; it.ref = g.tower; it.x = x; it.y = y; }
    for (let i = 0; i < n; i++) {
      const it = items[i];
      if (it.kind === 2 || it.kind === 4) ctx.drawImage(sheets.shadow, it.x - 6, it.y - 2);
      else if (it.kind === 1) { const k = it.ref.boss ? (it.ref.scale || 1) * 1.2 : it.ref.scale || 1; ctx.drawImage(sheets.shadow, it.x - 6 * k, it.y - 2 * k, 12 * k, 5 * k); }
      else if (it.kind === 6) ctx.drawImage(sheets.shadow, it.x - 5, it.y - 2);
    }
    const list = items.slice(0, n).sort((a, b) => a.key - b.key || a.kind - b.kind);
    let leaderHidden = false;
    for (const it of list) {
      switch (it.kind) {
        case 0: if (it.alpha < 1) leaderHidden = true; ctx.globalAlpha = it.alpha; ctx.drawImage(it.ref.sprite.canvas, it.x, it.y); ctx.globalAlpha = 1; break;
        case 1: {
          const z = it.ref;
          if (z.type === 'tank') { const v = sheets.tank[z.face === 'E' || z.face === 'W' ? 'x' : 'y']; ctx.drawImage(z.flash > 0 ? v.flash : v.canvas, it.x - v.cx, it.y - v.cy); break; }
          if (z.type === 'general') { const m = sheets.mech[Math.floor(z.anim * 4) % 2]; ctx.drawImage(m.canvas, it.x - m.ax - 8, it.y - m.ay - 8); if (z.flash > 0) { ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff'; ctx.fillRect(it.x - 10, it.y - 30, 20, 26); ctx.globalAlpha = 1; } break; }
          if (z.type === 'hive') { const h = sheets.hive[Math.floor(g.time * 2) % 2]; ctx.drawImage(h, it.x - h.width / 2, it.y - h.height + 6); if (z.flash > 0) { ctx.globalAlpha = 0.4; ctx.fillStyle = '#fff'; ctx.fillRect(it.x - 26, it.y - 38, 52, 40); ctx.globalAlpha = 1; } break; }
          const sht = zsheet(z); if (!sht) break;
          const k = sht.scale || 1, f = Math.floor(z.anim * FRAME_RATE * 0.6) % 4;
          if (z.type === 'crawler' && world.isGrass(z.x, z.y)) ctx.globalAlpha = 0.5;
          ctx.drawImage((z.flash > 0 ? sht.flash : sht)[z.face][f], it.x - 9 * k, it.y - 16 * k);
          ctx.globalAlpha = 1;
          break;
        }
        case 2: {
          if (L.invuln > 0 && Math.floor(L.invuln * 14) % 2 === 0) break;
          const f = L.moving ? Math.floor(L.anim * FRAME_RATE) % 4 : 0;
          ctx.drawImage(sheets.leader[L.face][f], it.x - 9, it.y - 16);
          if (L.muzzle > 0) { const off = { E: [7, -9], W: [-11, -9], S: [2, -6], N: [-2, -10] }[L.face]; ctx.drawImage(sheets.muzzle, it.x + off[0], it.y + off[1]); }
          break;
        }
        case 3: {
          const b = it.ref, [hx, hy] = S(it.x, it.y, b.z);
          if (b.kind === 2) { ctx.drawImage(sheets.knife[Math.floor(b.spin) % 8], hx - 3, hy - 3); break; }
          if (b.kind === 1 || b.kind === 3) { ctx.fillStyle = b.kind === 3 ? '#c9b78a' : '#ffe680'; ctx.fillRect(hx, hy, 1, 1); break; }
          const [tx, ty] = S(it.x - b.vx * 0.022, it.y - b.vy * 0.022, b.z);
          ctx.fillStyle = '#ffb347'; ctx.fillRect(Math.round((hx + tx) / 2), Math.round((hy + ty) / 2), 1, 1); ctx.fillRect(tx, ty, 1, 1);
          ctx.fillStyle = '#fff6c8'; ctx.fillRect(hx, hy, 1, 1);
          break;
        }
        case 4: drawPerson(ctx, it.ref, it.x, it.y, g.time); break;
        case 5: {
          const b = it.ref, bob = Math.round(Math.sin(b.t * 5) * 1.2) - Math.round(b.z * 8);
          if (b.kind === 'brain') { ctx.globalAlpha = 0.6 + 0.4 * Math.sin(g.time * 6 + b.t); ctx.drawImage(sheets.brainGlow, it.x - 6, it.y - 10 + bob); ctx.globalAlpha = 1; ctx.drawImage(sheets.brain, it.x - 4, it.y - 7 + bob); }
          else if (b.kind === 'can') ctx.drawImage(sheets.can, it.x - 2, it.y - 8 + bob);
          else if (b.kind === 'medkit') ctx.drawImage(sheets.medkit, it.x - 3, it.y - 7 + bob);
          else if (b.kind === 'crate') { const c = sheets.crate; ctx.drawImage(c.canvas, it.x - c.ax, it.y - 8 - c.ay); if (Math.floor(g.time * 3) % 2) { ctx.fillStyle = '#f4d35e'; ctx.fillRect(it.x - 1, it.y - 16, 2, 2); } }
          break;
        }
        case 6: { const spr = sheets.barrel; ctx.drawImage(spr.canvas, it.x - spr.ax, it.y - 8 - spr.ay); if (it.ref.flash > 0) { ctx.globalAlpha = 0.6; ctx.fillStyle = '#ffffff'; ctx.fillRect(it.x - 3, it.y - 13, 7, 8); ctx.globalAlpha = 1; } break; }
        case 7: ctx.drawImage(sheets.saw[Math.floor(g.time * 20) % 4], it.x - 5, it.y - 5); break;
        case 8: {
          const s = it.ref, [x, y] = S(it.x, it.y, s.z);
          if (s.kind === 'spit') { ctx.fillStyle = '#9bd068'; ctx.fillRect(x - 1, y - 1, 3, 3); ctx.fillStyle = '#d6f0a0'; ctx.fillRect(x, y - 1, 1, 1); }
          else if (s.kind === 'parcel') ctx.drawImage(sheets.parcel, x - 3, y - 3);
          else if (s.kind === 'grenade') { ctx.fillStyle = '#3a4a32'; ctx.fillRect(x - 1, y - 1, 3, 3); }
          else if (s.kind === 'anchor') { ctx.save(); ctx.translate(x, y); ctx.rotate(Math.round(s.spin * 2) * Math.PI / 4); ctx.drawImage(sheets.anchor, -3, -4); ctx.restore(); }
          else { ctx.fillStyle = '#ff6a3d'; ctx.fillRect(x - 1, y, 2, 2); ctx.fillStyle = '#ffe680'; ctx.fillRect(x, y, 1, 1); }
          break;
        }
        case 9: { const t = sheets.turret; ctx.drawImage(t.canvas, it.x - t.ax, it.y - 8 - t.ay); break; }
        case 10: { const v = sheets.bus; ctx.drawImage(it.ref.flash > 0 && Math.floor(g.time * 20) % 2 ? v.flash : v.canvas, it.x - v.ax, it.y - v.ay); break; }
        case 11: { const tw = sheets.tower; ctx.drawImage(tw.canvas, it.x - tw.ax, it.y - tw.ay); if (it.ref.flash > 0 && Math.floor(g.time * 20) % 2) { ctx.globalAlpha = 0.4; ctx.fillStyle = '#ff4a4a'; ctx.fillRect(it.x + 2, it.y - 36, 7, 34); ctx.globalAlpha = 1; } break; }
      }
    }
    if (leaderHidden) { ctx.globalAlpha = 0.6; ctx.drawImage(sheets.leaderGhost[L.face][L.moving ? Math.floor(L.anim * FRAME_RATE) % 4 : 0], lsx - 9, lsy - 16); ctx.globalAlpha = 1; }
    if (g.heli) {
      const [x, y] = S(g.heli.x, g.heli.y, g.heli.z), [gx, gy] = S(g.heli.x, g.heli.y), h = sheets.heli;
      ctx.drawImage(sheets.shadow, gx - 12, gy - 3, 24, 8);
      ctx.drawImage(h.canvas, x - h.ax, y - h.ay);
      const rl = 18, a = g.time * 30; ctx.fillStyle = '#2b2b33';
      for (let k = -rl; k <= rl; k++) ctx.fillRect(Math.round(x + Math.cos(a) * k), Math.round(y - 15 + Math.sin(a) * k * 0.4), 1, 1);
    }
    for (let i = 0; i < E.parts.count; i++) {
      const p = E.parts.items[i], [x, y] = S(p.x, p.y, p.z);
      ctx.globalAlpha = p.kind === 3 ? Math.min(0.8, p.life / p.max) : 1;
      ctx.fillStyle = p.color; ctx.fillRect(x, y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    if (E.flash) {
      const [cx, cy] = S(E.flash.x, E.flash.y, 0.3), r = Math.round(6 + (0.12 - E.flash.t) * 70);
      ctx.fillStyle = E.flash.t > 0.06 ? '#ffffff' : '#ffe680';
      for (let yy = -r; yy <= r; yy++) for (let xx = -r * 2; xx <= r * 2; xx++) if ((xx / 2) ** 2 + yy * yy <= r * r && (E.flash.t > 0.07 || (xx + yy) % 2 === 0)) ctx.fillRect(cx + xx, cy + yy, 1, 1);
    }
    if (g.night) {
      const lights = [{ x: lx, y: ly, r: 46 }];
      for (const f of g.line) lights.push({ x: f.x, y: f.y, r: 15 });
      for (const [x, y] of world.lights) lights.push({ x, y, r: 22 });
      for (const f of g.fires) lights.push({ x: f.x, y: f.y, r: 20 + Math.round(Math.random() * 3) });
      if (L.muzzle > 0) lights.push({ x: lx, y: ly, r: 44 });
      if (E.flash) lights.push({ x: E.flash.x, y: E.flash.y, r: 60 });
      if (g.extractOn && world.extract) lights.push({ x: world.extract[0], y: world.extract[1], r: 26 });
      for (const s of g.others) if (s.state === 'stranded') lights.push({ x: s.x, y: s.y, r: 9 });
      if (g.tower) lights.push({ x: g.tower.x, y: g.tower.y, r: 20 });
      if (g.bus) lights.push({ x: g.bus.x + 2, y: g.bus.y + 0.4, r: 22 });
      night(g, ox, oy, world, alpha, lights);
    }
    for (let i = 0; i < E.numbers.count; i++) {
      const nmb = E.numbers.items[i], [x, y] = S(nmb.x, nmb.y, nmb.z);
      text(ctx, nmb.val, x, y, { color: nmb.color, align: 'center' });
    }
    if (g.debug.hitbox) {
      ctx.fillStyle = 'rgba(255,0,0,0.6)';
      const dot = (wx, wy) => { const [x, y] = S(wx, wy); ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); };
      dot(lx, ly); for (let i = 0; i < g.zombies.count; i++) dot(g.zombies.items[i].x, g.zombies.items[i].y);
    }
    return { ox, oy };
  };
}
