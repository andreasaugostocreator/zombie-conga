import { toScreen } from './iso.js';
import { makeCanvas } from './screen.js';
import { text } from './font.js';
import { makeCloud } from './sprites.js';

const lerp = (a, b, t) => a + (b - a) * t;
const FRAME_RATE = 8; // walk frames per second at full speed

/**
 * Draws one frame: sky → baked ground → decals/corpses → shadows → depth-sorted statics,
 * characters and bullets → particles and numbers. All positions are rounded to whole pixels.
 */
export function createRenderer(screen, world, sheets, pal) {
  // Static sprites: pre-compute their screen rectangle relative to the world origin.
  for (const s of world.statics) {
    const [sx, sy] = toScreen(s.wx, s.wy, s.wz);
    s.rx = Math.round(sx - s.sprite.ax); s.ry = Math.round(sy - s.sprite.ay);
    s.rw = s.sprite.canvas.width; s.rh = s.sprite.canvas.height;
  }
  // Pixel-exact occlusion: does this sprite have a solid pixel at (x, y)?
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
    // Banded sky with dithered seams.
    for (let y = 0; y < screen.h; y++) for (let xx = 0; xx < screen.w; xx++) {
      const t = y / band, i = Math.floor(t), f = t - i;
      const pick = f > 0.75 && ((xx + y) % 2 === 0) ? Math.min(S.length - 1, i + 1) : Math.min(S.length - 1, i);
      x.fillStyle = S[pick]; x.fillRect(xx, y, 1, 1);
    }
    sky = c; skyKey = key;
    return c;
  }

  const clouds = [0, 1, 2, 3, 4].map(i => ({ c: makeCloud(900 + i * 13), x: i * 97 % 300, y: 18 + (i * 53) % 150, v: 2 + (i % 3) }));
  const items = []; // reused render list
  /** Survivors: in the line, waiting (help bubble), panicking (red !), or turning into a zombie. */
  function drawPerson(ctx, p, x, y, time) {
    const sheet = sheets.survivors[p.cls];
    let frame = (p.state === 'stranded' || p.state === 'panic') ? 0 : Math.floor(p.anim * 4) % 4;
    let img = sheet[p.face][frame], jx = 0;
    if (p.state === 'turning') { img = Math.floor(p.t * 8) % 2 ? sheets.zombies[1].S[0] : sheet.flash.S[0]; jx = Math.round(Math.sin(time * 40)); }
    else if (p.flash > 0) img = sheet.flash[p.face][frame];
    if (p.state === 'panic') jx = Math.round(Math.sin(time * 50));
    if (p.state === 'stranded') { img = sheet.S[Math.floor(time * 3 + p.bob) % 2 ? 1 : 3]; }
    ctx.drawImage(img, x - 9 + jx, y - 16);
    if (p.state === 'line' && p.muzzle > 0) { const off = { E: [7, -9], W: [-11, -9], S: [2, -6], N: [-2, -10] }[p.face]; ctx.drawImage(sheets.muzzle, x + off[0], y + off[1]); }
    if (p.state === 'stranded') ctx.drawImage(sheets.help, x - 4, y - 28 + Math.round(Math.sin(p.bob) * 1.5));
    if (p.state === 'panic' && Math.floor(time * 6) % 2) ctx.drawImage(sheets.panic, x - 4, y - 28);
    if (p.tough > 0 && p.state === 'line') { ctx.fillStyle = '#1c1424'; ctx.fillRect(x + 3, y - 18, 5, 5); ctx.fillStyle = '#5aa9cf'; ctx.fillRect(x + 4, y - 17, 3, 3); }
  }
  const item = (i) => items[i] || (items[i] = { key: 0, kind: 0, ref: null, x: 0, y: 0, alpha: 1 });

  return function render(g, alpha, input, fps) {
    const ctx = screen.ctx, W = screen.w, H = screen.h;
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.drawImage(skyCanvas(), 0, 0);
    const L = g.leader;
    const lx = lerp(L.px, L.x, alpha), ly = lerp(L.py, L.y, alpha);
    const camX = lerp(g.cam.px, g.cam.x, alpha), camY = lerp(g.cam.py, g.cam.y, alpha);
    const sh = g.shake > 0 ? g.shake : 0;
    const ox = Math.round(W / 2 - camX + (Math.random() - 0.5) * sh), oy = Math.round(H * 0.56 - camY + (Math.random() - 0.5) * sh);
    const S = (wx, wy, wz = 0) => { const [x, y] = toScreen(wx, wy, wz); return [Math.round(ox + x), Math.round(oy + y)]; };

    // Clouds drift slowly with a little parallax.
    for (const cl of clouds) {
      const span = W + 120, x = ((cl.x + g.time * cl.v - camX * 0.25) % span + span) % span - 60, y = Math.round(cl.y - camY * 0.15 + 40);
      ctx.drawImage(cl.c, Math.round(x), y);
    }
    // Ground
    const gr = world.groundSprite;
    ctx.drawImage(gr.canvas, ox - gr.ax, oy - gr.ay);
    // Decals (blood, casings) and corpses lie flat on the ground.
    const E = g.effects;
    for (let i = 0; i < E.decals.count; i++) {
      const d = E.decals.items[i], [x, y] = S(d.x, d.y);
      if (x < -2 || y < -2 || x > W || y > H) continue;
      ctx.globalAlpha = Math.min(1, d.life / 4); ctx.fillStyle = d.color; ctx.fillRect(x, y, d.size, 1);
    }
    for (let i = 0; i < E.corpses.count; i++) {
      const c = E.corpses.items[i], [x, y] = S(c.x, c.y), spr = sheets.zombies[c.sprite].corpse;
      ctx.globalAlpha = Math.min(1, c.life / 3);
      if (c.flip) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(spr, -9, y - 11); ctx.restore(); } else ctx.drawImage(spr, x - 9, y - 11);
    }
    ctx.globalAlpha = 1;

    // Collect everything that needs depth sorting.
    let n = 0;
    const leaderKey = lx + ly;
    const [lsx, lsy] = S(lx, ly);
    for (const s of world.statics) {
      const x = ox + s.rx, y = oy + s.ry;
      if (x > W || y > H || x + s.rw < 0 || y + s.rh < 0) continue;
      const it = item(n++); it.key = s.key; it.kind = 0; it.ref = s; it.x = x; it.y = y;
      // See-through when it stands in front of the leader and covers them.
      // See-through only when its pixels actually cover the leader's body.
      it.alpha = s.tall && s.key > leaderKey + 0.25 && (solidAt(s.sprite, lsx - x, lsy - 8 - y) || solidAt(s.sprite, lsx - x, lsy - 3 - y)) ? 0.45 : 1;
    }
    for (let i = 0; i < g.zombies.count; i++) {
      const z = g.zombies.items[i], zx = lerp(z.px, z.x, alpha), zy = lerp(z.py, z.y, alpha), [x, y] = S(zx, zy);
      if (x < -20 || x > W + 20 || y < -10 || y > H + 30) continue;
      const it = item(n++); it.key = zx + zy; it.kind = 1; it.ref = z; it.x = x; it.y = y;
    }
    if (g.state !== 'title') { const it = item(n++); it.key = leaderKey; it.kind = 2; it.ref = L; it.x = lsx; it.y = lsy; }
    const people = g.line.concat(g.others);
    for (const p of people) {
      const px = lerp(p.px, p.x, alpha), py = lerp(p.py, p.y, alpha), [x, y] = S(px, py);
      if (x < -20 || x > W + 20 || y < -10 || y > H + 40) continue;
      const it = item(n++); it.key = px + py; it.kind = 4; it.ref = p; it.x = x; it.y = y;
    }
    for (let i = 0; i < g.brains.count; i++) {
      const b = g.brains.items[i], bx = lerp(b.px, b.x, alpha), by = lerp(b.py, b.y, alpha), [x, y] = S(bx, by);
      if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
      const it = item(n++); it.key = bx + by; it.kind = 5; it.ref = b; it.x = x; it.y = y;
    }
    for (const b of g.barrels) {
      if (!b.alive) continue; const [x, y] = S(b.x, b.y);
      if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
      const it = item(n++); it.key = b.x + b.y; it.kind = 6; it.ref = b; it.x = x; it.y = y;
    }
    if (g.state === 'play' || g.state === 'paused' || g.state === 'levelup') for (let k = 0; k < g.up.saw; k++) {
      const a = g.sawAngle + k * Math.PI * 2 / g.up.saw, sx = lx + Math.cos(a) * 1.15, sy = ly + Math.sin(a) * 1.15, [x, y] = S(sx, sy, 0.45);
      const it = item(n++); it.key = sx + sy; it.kind = 7; it.ref = null; it.x = x; it.y = y;
    }
    for (let i = 0; i < g.bullets.count; i++) {
      const b = g.bullets.items[i], bx = lerp(b.px, b.x, alpha), by = lerp(b.py, b.y, alpha);
      const it = item(n++); it.key = bx + by; it.kind = 3; it.ref = b; it.x = bx; it.y = by;
    }
    // Shadows first, so nothing gets a shadow painted on top of it.
    for (let i = 0; i < n; i++) {
      const it = items[i];
      if (it.kind === 1 || it.kind === 2 || it.kind === 4) ctx.drawImage(sheets.shadow, it.x - 6, it.y - 2);
      else if (it.kind === 6) ctx.drawImage(sheets.shadow, it.x - 5, it.y - 2);
    }
    const list = items.slice(0, n).sort((a, b) => a.key - b.key || a.kind - b.kind);
    let leaderHidden = false;
    for (const it of list) {
      if (it.kind === 0) {
        if (it.alpha < 1) leaderHidden = true;
        ctx.globalAlpha = it.alpha; ctx.drawImage(it.ref.sprite.canvas, it.x, it.y); ctx.globalAlpha = 1;
      } else if (it.kind === 1) {
        const z = it.ref, sheet = sheets.zombies[z.look], f = Math.floor(z.anim * FRAME_RATE * 0.6) % 4;
        ctx.drawImage((z.flash > 0 ? sheet.flash : sheet)[z.face][f], it.x - 9, it.y - 16);
      } else if (it.kind === 2) {
        if (L.invuln > 0 && Math.floor(L.invuln * 14) % 2 === 0) continue;
        const sheet = sheets.leader, f = L.moving ? Math.floor(L.anim * FRAME_RATE) % 4 : 0;
        ctx.drawImage(sheet[L.face][f], it.x - 9, it.y - 16);
        if (L.muzzle > 0) {
          const off = { E: [7, -9], W: [-11, -9], S: [2, -6], N: [-2, -10] }[L.face];
          ctx.drawImage(sheets.muzzle, it.x + off[0], it.y + off[1]);
        }
      } else if (it.kind === 3) {
        const b = it.ref, [hx, hy] = S(it.x, it.y, b.z);
        if (b.kind === 2) { ctx.drawImage(sheets.knife[Math.floor(b.spin) % 8], hx - 3, hy - 3); continue; }
        if (b.kind === 1) { ctx.fillStyle = '#ffe680'; ctx.fillRect(hx, hy, 1, 1); continue; }
        const [tx, ty] = S(it.x - b.vx * 0.022, it.y - b.vy * 0.022, b.z);
        ctx.fillStyle = '#ffb347'; ctx.fillRect(Math.round((hx + tx) / 2), Math.round((hy + ty) / 2), 1, 1); ctx.fillRect(tx, ty, 1, 1);
        ctx.fillStyle = '#fff6c8'; ctx.fillRect(hx, hy, 1, 1);
      } else if (it.kind === 4) {
        drawPerson(ctx, it.ref, it.x, it.y, g.time);
      } else if (it.kind === 5) {
        const b = it.ref, bob = Math.round(Math.sin(b.t * 5) * 1.2) - Math.round(b.z * 8);
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(g.time * 6 + b.t); ctx.drawImage(sheets.brainGlow, it.x - 6, it.y - 10 + bob); ctx.globalAlpha = 1;
        ctx.drawImage(sheets.brain, it.x - 4, it.y - 7 + bob);
      } else if (it.kind === 6) {
        const spr = sheets.barrel; ctx.drawImage(spr.canvas, it.x - spr.ax + 0 - 0, it.y - spr.ay);
        if (it.ref.flash > 0) { ctx.globalAlpha = 0.6; ctx.fillStyle = '#ffffff'; ctx.fillRect(it.x - 3, it.y - 9, 7, 8); ctx.globalAlpha = 1; }
      } else if (it.kind === 7) {
        ctx.drawImage(sheets.saw[Math.floor(g.time * 20) % 4], it.x - 5, it.y - 5);
      }
    }
    // Explosion flash: a dithered pixel disc.
    if (E.flash) {
      const [cx, cy] = S(E.flash.x, E.flash.y, 0.3), r = Math.round(10 + (0.12 - E.flash.t) * 120);
      ctx.fillStyle = E.flash.t > 0.06 ? '#ffffff' : '#ffe680';
      for (let yy = -r; yy <= r; yy++) for (let xx = -r * 2; xx <= r * 2; xx++) if ((xx / 2) ** 2 + yy * yy <= r * r && (E.flash.t > 0.07 || (xx + yy) % 2 === 0)) ctx.fillRect(cx + xx, cy + yy, 1, 1);
    }
    // Hidden behind something tall: draw the leader again as a faint "x-ray" on top.
    if (leaderHidden) { ctx.globalAlpha = 0.6; ctx.drawImage(sheets.leaderGhost[L.face][L.moving ? Math.floor(L.anim * FRAME_RATE) % 4 : 0], lsx - 9, lsy - 16); ctx.globalAlpha = 1; }
    // Airborne particles and damage numbers on top.
    for (let i = 0; i < E.parts.count; i++) {
      const p = E.parts.items[i], [x, y] = S(p.x, p.y, p.z);
      ctx.globalAlpha = p.kind === 3 ? Math.min(0.8, p.life / p.max) : 1;
      ctx.fillStyle = p.color; ctx.fillRect(x, y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < E.numbers.count; i++) {
      const nmb = E.numbers.items[i], [x, y] = S(nmb.x, nmb.y, nmb.z);
      text(ctx, nmb.val, x, y, { color: nmb.color, align: 'center' });
    }
    if (g.debug.hitbox) {
      ctx.fillStyle = 'rgba(255,0,0,0.6)';
      const dot = (wx, wy) => { const [x, y] = S(wx, wy); ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); };
      dot(lx, ly); for (let i = 0; i < g.zombies.count; i++) dot(g.zombies.items[i].x, g.zombies.items[i].y);
      ctx.fillStyle = 'rgba(255,255,0,0.25)';
      for (let y = 0; y < world.h; y++) for (let x = 0; x < world.w; x++) if (world.isSolid(x, y)) { const [a, b] = S(x + 0.5, y + 0.5); ctx.fillRect(a - 1, b - 1, 3, 3); }
    }
  };
}
