import { PixBuf, boxSprite, shadeHex } from './iso.js';
import { makeCanvas } from './screen.js';
import { OUTLINE, CHAR } from './palette.js';
import { hash2, mulberry32 } from '../engine/rng.js';

/* ------------------------------------------------------------------------------------------
   Characters: 16×16 body painted from parts, then a 1px dark outline (18×18 canvas).
   Facings: S (towards camera), N (away), E (right); W is E mirrored. 4-frame walk cycle.
   ------------------------------------------------------------------------------------------ */
const FRAMES = 4;
const frac = v => v - Math.floor(v);
const clear = (g, x, y) => { const i = (y * g.w + x) * 4; g.data[i + 3] = 0; };
const WOOD = '#7a5236', STEEL = '#c9ccd3', PAN = '#2b2b33';
function hatFront(R, g, p, hx, dir) {
  switch (p.hat) {
    case 'cap': R(hx - 1, 2, 8, 1, p.hatColor); R(hx, 1, 6, 1, p.hatColor); if (dir === 'S') g.set(hx + 2, 1, p.badge); return true;
    case 'straw': R(hx - 2, 2, 10, 1, p.hatColor); R(hx, 0, 6, 2, p.hatColor); R(hx, 1, 6, 1, p.hatBand); return true;
    case 'chef': R(hx, 0, 6, 3, '#f4f1ea'); R(hx + 5, 0, 1, 3, '#d9d4c8'); R(hx - 1, 0, 1, 2, '#f4f1ea'); return true;
    case 'nurse': R(hx + 1, 1, 4, 2, '#f4f1ea'); g.set(hx + 2, 1, '#e2384a'); return false;
    case 'bun': R(hx + 2, 0, 2, 2, p.hair); return false;
    case 'helmet': R(hx - 1, 1, 8, 3, p.hatColor); if (dir === 'S') R(hx, 4, 6, 1, '#7fb6d6'); return true;
    case 'fire': R(hx - 1, 2, 8, 1, p.hatColor); R(hx, 0, 6, 2, p.hatColor); if (dir === 'S') g.set(hx + 2, 1, '#f4c542'); return true;
    case 'beanie': R(hx, 1, 6, 2, p.hatColor); R(hx, 2, 6, 1, shadeHex(p.hatColor, -0.2)); return true;
    case 'elf': R(hx, 1, 6, 2, '#d6453d'); R(hx + 2, 0, 3, 1, '#d6453d'); g.set(hx + 5, 0, '#ffffff'); return true;
    case 'santa': R(hx, 1, 6, 2, '#c8363c'); R(hx - 1, 2, 8, 1, '#ffffff'); g.set(hx + 5, 0, '#ffffff'); return true;
    case 'captain': R(hx - 1, 2, 8, 1, '#1c1424'); R(hx, 0, 6, 2, '#f4f1ea'); if (dir === 'S') g.set(hx + 2, 1, '#f4c542'); return true;
    case 'bald': return false;
  }
  return false;
}
function hatSide(R, g, p, hx) {
  switch (p.hat) {
    case 'cap': R(hx - 1, 2, 7, 1, p.hatColor); R(hx, 1, 5, 1, p.hatColor); return true;
    case 'straw': R(hx - 2, 2, 9, 1, p.hatColor); R(hx, 0, 5, 2, p.hatColor); R(hx, 1, 5, 1, p.hatBand); return true;
    case 'chef': R(hx, 0, 5, 3, '#f4f1ea'); R(hx + 4, 0, 1, 3, '#d9d4c8'); return true;
    case 'nurse': R(hx, 1, 4, 2, '#f4f1ea'); g.set(hx + 1, 1, '#e2384a'); return false;
    case 'bun': R(hx - 1, 1, 2, 2, p.hair); return false;
    case 'helmet': R(hx - 1, 1, 7, 3, p.hatColor); R(hx + 3, 4, 2, 1, '#7fb6d6'); return true;
    case 'fire': R(hx - 2, 2, 8, 1, p.hatColor); R(hx, 0, 5, 2, p.hatColor); return true;
    case 'beanie': R(hx, 1, 5, 2, p.hatColor); return true;
    case 'elf': R(hx, 1, 5, 2, '#d6453d'); R(hx - 2, 0, 3, 1, '#d6453d'); g.set(hx - 3, 1, '#ffffff'); return true;
    case 'santa': R(hx, 1, 5, 2, '#c8363c'); R(hx - 1, 2, 7, 1, '#ffffff'); g.set(hx - 2, 2, '#ffffff'); return true;
    case 'captain': R(hx - 1, 2, 8, 1, '#1c1424'); R(hx, 0, 5, 2, '#f4f1ea'); return true;
  }
  return false;
}
function weaponFront(R, g, w, ra) {
  if (w === 'pistol') R(11, 11 + ra, 1, 1, CHAR.gun);
  else if (w === 'shotgun') { R(11, 10 + ra, 1, 3, CHAR.gun); g.set(11, 13 + ra, WOOD); }
  else if (w === 'knife') R(11, 11 + ra, 1, 2, STEEL);
  else if (w === 'pan') { R(11, 11 + ra, 1, 1, WOOD); R(11, 12 + ra, 2, 2, PAN); }
  else if (w === 'axe') { R(11, 9 + ra, 1, 4, WOOD); R(12, 9 + ra, 2, 2, '#d6453d'); }
  else if (w === 'wrench') R(11, 11 + ra, 1, 3, STEEL);
  else if (w === 'slingshot') { R(11, 11 + ra, 1, 2, WOOD); g.set(10, 10 + ra, WOOD); g.set(12, 10 + ra, WOOD); }
  else if (w === 'rifle') { R(11, 9 + ra, 1, 5, CHAR.gun); g.set(11, 14 + ra, '#556b2f'); }
}
function weaponSide(R, g, p) {
  R(8, 9, 2, 1, p.shirt); R(10, 9, 1, 1, p.skin);
  if (p.weapon === 'pistol') { R(11, 9, 2, 1, CHAR.gun); g.set(11, 10, CHAR.gun); }
  else if (p.weapon === 'shotgun') { R(11, 9, 4, 1, CHAR.gun); R(8, 10, 3, 1, WOOD); }
  else if (p.weapon === 'knife') { R(11, 8, 1, 2, STEEL); g.set(12, 8, STEEL); }
  else if (p.weapon === 'pan') { R(11, 9, 1, 1, WOOD); R(12, 8, 2, 3, PAN); }
  else if (p.weapon === 'axe') { R(11, 8, 1, 3, WOOD); R(12, 7, 2, 2, '#d6453d'); g.set(12, 9, STEEL); }
  else if (p.weapon === 'wrench') { R(11, 8, 1, 2, STEEL); g.set(12, 8, STEEL); }
  else if (p.weapon === 'slingshot') { R(11, 9, 1, 1, WOOD); g.set(12, 8, WOOD); g.set(12, 10, WOOD); }
  else if (p.weapon === 'rifle') { R(11, 9, 5, 1, CHAR.gun); R(8, 10, 3, 1, '#556b2f'); g.set(12, 10, CHAR.gun); }
}

function paintHuman(p, dir, f) {
  const g = new PixBuf(16, 16);
  const R = (x, y, w, h, c) => g.rect(x, y, w, h, c);
  const stride = f === 1 ? 1 : f === 3 ? -1 : 0; // which leg is forward
  const z = p.zombie;
  if (dir === 'S' || dir === 'N') {
    // Legs and shoes. A forward leg reaches the ground; the other is lifted one pixel.
    const lLift = stride < 0 ? 1 : 0, rLift = stride > 0 ? 1 : 0;
    R(6, 12, 2, 3 - lLift, p.pants); R(6, 15 - lLift, 2, 1, CHAR.shoes);
    R(8, 12, 2, 3 - rLift, shadeHex(p.pants, -0.15)); R(8, 15 - rLift, 2, 1, CHAR.shoes);
    // Torso with the right side in shade (light comes from the top-left).
    R(5, 8, 6, 4, p.shirt); R(10, 8, 1, 4, p.shirt2); R(5, 11, 6, 1, p.belt || shadeHex(p.pants, 0.1));
    if (z) { for (let i = 0; i < 5; i++) { const hx = 5 + Math.floor(p.rnd() * 6), hy = 8 + Math.floor(p.rnd() * 4); g.set(hx, hy, p.rnd() < 0.5 ? p.skin2 : CHAR.mouth); } }
    // Arms. Zombies reach forward (hands raised); survivors swing.
    if (dir === 'S' && z) { R(4, 8, 1, 1, p.shirt); R(3, 9, 2, 1, p.skin); R(11, 8, 1, 1, p.shirt2); R(11, 9, 2, 1, p.skin2); }
    else {
      const la = stride > 0 ? 1 : 0, ra = stride < 0 ? 1 : 0;
      R(4, 8 + la, 1, 1, p.shirt); R(4, 9 + la, 1, 2, p.skin);
      R(11, 8 + ra, 1, 1, p.shirt2); R(11, 9 + ra, 1, 2, p.skin2);
      if (dir === 'S') weaponFront(R, g, p.weapon, ra);
    }
    // Head
    const hx = z ? 5 + (dir === 'S' ? 0 : 0) : 5;
    R(hx, 3, 6, 5, p.skin); R(hx + 5, 3, 1, 5, p.skin2);
    if (dir === 'S') {
      g.set(hx + 1, 5, z ? CHAR.zeye : '#2a2230'); g.set(hx + 4, 5, z ? CHAR.zeye : '#2a2230');
      if (z) R(hx + 2, 7, 2, 1, CHAR.mouth);
      R(hx, 2, 6, 2, p.hair); g.set(hx, 4, p.hair); g.set(hx + 5, 4, p.hair);
      if (z) { g.set(hx + 2, 3, p.skin); }
    } else {
      R(hx, 2, 6, 5, p.hair); R(hx + 1, 7, 4, 1, p.skin2);
    }
    if (p.pattern) for (let yy = 8; yy < 11; yy++) for (let xx = 5; xx < 10; xx++) if ((xx + yy) % 2 === 0) g.set(xx, yy, p.pattern);
    if (!hatFront(R, g, p, hx, dir)) { clear(g, hx, 2); clear(g, hx + 5, 2); }        // rounded head
    if (dir === 'N') {
      g.set(hx - 1, 5, p.skin2); g.set(hx + 6, 5, p.skin2);                            // ears
      R(4, 8, 1, 2, p.shirt2); R(11, 8, 1, 2, p.shirt2);                               // shoulders
      R(6, 9, 4, 1, shadeHex(p.shirt, -0.1));                                          // shirt fold
      if (z) { R(4, 8, 1, 1, p.skin2); R(11, 8, 1, 1, p.skin2); }
    }
  } else {
    // Facing right (E).
    const back = shadeHex(p.pants, -0.2);
    if (stride === 0) { R(7, 12, 2, 3, p.pants); R(7, 15, 3, 1, CHAR.shoes); }
    else {
      // Far leg darker, near leg in front.
      const near = stride > 0 ? 9 : 5, far = stride > 0 ? 5 : 9;
      R(far, 12, 2, 3, back); R(far, 15, 2, 1, CHAR.shoes);
      R(near, 12, 2, 3, p.pants); R(near, 15, 3, 1, CHAR.shoes);
      R(7, 12, 2, 1, p.pants);
    }
    R(6, 8, 4, 4, p.shirt); R(6, 8, 1, 4, shadeHex(p.shirt, 0.08)); R(6, 11, 4, 1, p.belt || shadeHex(p.pants, 0.1));
    if (z) { for (let i = 0; i < 3; i++) g.set(6 + Math.floor(p.rnd() * 4), 8 + Math.floor(p.rnd() * 4), p.rnd() < 0.5 ? p.skin2 : CHAR.mouth); }
    const hx = z ? 7 : 6;
    R(hx, 3, 5, 5, p.skin); g.set(hx + 5, 6, p.skin); // nose
    R(hx, 2, 5, 2, p.hair); R(hx, 4, 2, 2, p.hair);
    g.set(hx + 3, 5, z ? CHAR.zeye : '#2a2230');
    if (z) g.set(hx + 4, 7, CHAR.mouth);
    if (!hatSide(R, g, p, hx)) { clear(g, hx, 2); clear(g, hx + 4, 2); }
    if (z) { R(8, 9, 2, 1, p.shirt); R(10, 9, 3, 1, p.skin); }               // arms out in front
    else if (p.weapon) weaponSide(R, g, p);
    else { const a = stride > 0 ? 1 : stride < 0 ? -1 : 0; R(7 + a, 8, 2, 1, p.shirt); R(7 + a, 9, 2, 2, p.skin); }
  }
  if (p.longHair && dir !== 'N') { const hx2 = dir === 'E' ? 6 : 5; R(dir === 'E' ? hx2 : hx2 - 1, 3, 1, 5, p.hair); if (dir !== 'E') R(hx2 + 6, 3, 1, 5, p.hair); }
  if (p.beard && dir !== 'N') { if (dir === 'S') { R(5, 6, 6, 3, p.beard); g.set(7, 6, CHAR.mouth); g.set(8, 6, CHAR.mouth); } else R(8, 6, 4, 3, p.beard); }
  if (p.scream && dir === 'S') R(7, 6, 2, 2, '#1c1424');
  if (p.belly) { const cx = dir === 'E' ? 9 : 8, cy = 10; for (let y = -3; y <= 3; y++) for (let x = -4; x <= 4; x++) if ((x / 4.4) ** 2 + (y / 3.3) ** 2 <= 1) g.set(cx + x, cy + y, (x + y) % 5 === 0 ? '#e0d26a' : x > 1 ? shadeHex(p.belly, -0.18) : p.belly); }
  if (p.shield) { if (dir === 'S') { R(4, 7, 8, 7, '#7b7f8a'); R(4, 7, 8, 1, '#c9ccd3'); R(5, 9, 6, 1, '#7fb6d6'); } else if (dir === 'E') { R(12, 5, 2, 9, '#7b7f8a'); R(12, 5, 1, 9, '#c9ccd3'); } }
  if (p.bag && dir !== 'N') { for (let i = 0; i < 5; i++) g.set(6 + i, 8 + i, '#7a4a2e'); R(dir === 'E' ? 5 : 9, 11, 3, 3, '#a0703f'); }
  if (p.kid) {
    // Shorter body, same big head.
    const k = new PixBuf(16, 16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const sy = y >= 11 ? y : y >= 2 ? y - 2 : -1; if (sy < 0) continue;
      const i = (sy * 16 + x) * 4; if (g.data[i + 3] < 100) continue;
      const o = (y * 16 + x) * 4; for (let c = 0; c < 4; c++) k.data[o + c] = g.data[i + c];
    }
    return k;
  }
  return g;
}

/** Re-paints a 16×16 body into an 18×18 outlined sprite; also returns a white hit-flash copy. */
function finish(g, mirror) {
  const out = new PixBuf(18, 18), flash = new PixBuf(18, 18);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const sx = mirror ? 15 - x : x, i = (y * 16 + sx) * 4;
    if (g.data[i + 3] < 100) continue;
    const c = '#' + [0, 1, 2].map(k => g.data[i + k].toString(16).padStart(2, '0')).join('');
    out.set(x + 1, y + 1, c); flash.set(x + 1, y + 1, '#ffffff');
  }
  out.outline(OUTLINE); flash.outline(OUTLINE);
  return [out.toCanvas(), flash.toCanvas()];
}

/** All frames for one character look. Returns { S: [frames], N, E, W, flash: {...}, corpse }. */
export function makeCharacter(p) {
  const sheet = { flash: {} };
  for (const dir of ['S', 'N', 'E']) {
    sheet[dir] = []; sheet.flash[dir] = [];
    for (let f = 0; f < FRAMES; f++) {
      p.rnd = mulberry32(p.seed || 1); // same tears/stains on every frame
      const [c, fl] = finish(paintHuman(p, dir, f), false);
      sheet[dir].push(c); sheet.flash[dir].push(fl);
    }
  }
  sheet.W = []; sheet.flash.W = [];
  for (let f = 0; f < FRAMES; f++) {
    p.rnd = mulberry32(p.seed || 1);
    const [c, fl] = finish(paintHuman(p, 'E', f), true);
    sheet.W.push(c); sheet.flash.W.push(fl);
  }
  // Lying down: the side frame turned 90°, a little darker.
  const [cc, cx] = makeCanvas(18, 18);
  cx.translate(9, 9); cx.rotate(-Math.PI / 2); cx.translate(-9, -9); cx.drawImage(sheet.E[0], 0, 2);
  cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalCompositeOperation = 'source-atop'; cx.fillStyle = 'rgba(40,20,30,0.25)'; cx.fillRect(0, 0, 18, 18);
  sheet.corpse = cc;
  // "X-ray" copy: flat light silhouette with the outline, used when something tall hides the character.
  sheet.ghost = {};
  for (const dir of ['S', 'N', 'E', 'W']) sheet.ghost[dir] = sheet[dir].map(fr => {
    const [c, x] = makeCanvas(18, 18); x.drawImage(fr, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#ffe9a8'; x.globalAlpha = 0.7; x.fillRect(0, 0, 18, 18); return c;
  });
  return sheet;
}

export function copLook(variant = 0) {
  const skin = [CHAR.skin[0], CHAR.skin[3], CHAR.skin[1]][variant % 3];
  return { skin, skin2: shadeHex(skin, -0.12), hair: [CHAR.hair[0], CHAR.hair[4], CHAR.hair[2]][variant % 3], shirt: CHAR.cop.shirt, shirt2: CHAR.cop.shirt2,
    pants: CHAR.cop.pants, hat: 'cap', hatColor: CHAR.cop.hat, badge: CHAR.cop.badge, weapon: 'pistol', belt: '#1d2440' };
}
/** Survivor looks by class: warm, saturated colours so they read against zombies. */
export function survivorLook(cls) {
  const sk = (i) => ({ skin: CHAR.skin[i], skin2: shadeHex(CHAR.skin[i], -0.12) });
  switch (cls) {
    case 'cop': return copLook(1);
    case 'farmer': return { ...sk(1), hair: CHAR.hair[1], shirt: '#d0473c', shirt2: '#a8362e', pattern: '#a8362e', pants: '#3d5a8a', belt: '#2c4268', hat: 'straw', hatColor: '#e3c26b', hatBand: '#a8462e', weapon: 'shotgun' };
    case 'chef': return { ...sk(0), hair: CHAR.hair[0], shirt: '#f2efe6', shirt2: '#d6d0c2', pants: '#3a3a44', belt: '#d6d0c2', hat: 'chef', weapon: 'knife' };
    case 'grandma': return { ...sk(0), hair: '#d9d4cf', shirt: '#9a6bb8', shirt2: '#7d5498', pants: '#8a5aa6', belt: '#7d5498', hat: 'bun', weapon: 'pan' };
    case 'nurse': return { ...sk(2), hair: CHAR.hair[0], shirt: '#f2a7bb', shirt2: '#d9879d', pants: '#f2a7bb', belt: '#d9879d', hat: 'nurse', weapon: null };
    case 'kid': return { ...sk(1), hair: CHAR.hair[2], shirt: '#5cc0c6', shirt2: '#3f9aa0', pants: '#3d5a8a', belt: '#2c4268', hat: 'beanie', hatColor: '#e2384a', weapon: 'slingshot', kid: true };
    case 'firefighter': return { ...sk(3), hair: CHAR.hair[4], shirt: '#e3b23c', shirt2: '#bf9128', pants: '#3a3a44', belt: '#d6d0c2', hat: 'fire', hatColor: '#d6453d', weapon: 'axe' };
    case 'mechanic': return { ...sk(0), hair: CHAR.hair[1], shirt: '#e8803a', shirt2: '#c4642a', pants: '#e8803a', belt: '#5b5f6b', hat: 'cap', hatColor: '#3d7bd6', badge: '#3d7bd6', weapon: 'wrench' };
    case 'soldier': return { ...sk(2), hair: CHAR.hair[4], shirt: '#6c7a45', shirt2: '#56613a', pattern: '#4f5a32', pants: '#56613a', belt: '#3a3a2e', hat: 'helmet', hatColor: '#56613a', weapon: 'rifle' };
  }
  return copLook(2);
}
export function zombieLook(i) {
  const r = mulberry32(100 + i * 17);
  const skin = CHAR.zskin[i % CHAR.zskin.length];
  return { zombie: true, seed: 200 + i, skin, skin2: shadeHex(skin, -0.18), hair: [CHAR.hair[0], CHAR.hair[3], CHAR.hair[4], CHAR.hair[1]][i % 4],
    shirt: CHAR.zcloth[i % CHAR.zcloth.length], shirt2: shadeHex(CHAR.zcloth[i % CHAR.zcloth.length], -0.2),
    pants: CHAR.zpants[Math.floor(r() * CHAR.zpants.length)] };
}

/* ------------------------------------------------------------------------------------------
   Trees: shaded leaf clusters (round suburban trees) and layered pines.
   ------------------------------------------------------------------------------------------ */
export function makeTree(pal, seed) {
  const r = mulberry32(seed), W = 30, H = 38, g = new PixBuf(W, H);
  const L = pal.leaf, T = pal.trunk;
  // Trunk, lit on the left.
  g.rect(13, 25, 2, 11, T[0]); g.rect(15, 25, 2, 11, T[1]); g.set(12, 35, T[1]); g.set(17, 35, T[1]);
  const blobs = [[15, 14, 9], [9, 18, 6], [21, 18, 6], [15, 8, 6], [11, 11, 5], [19, 11, 5]].map(([x, y, rad]) => [x + (r() - 0.5) * 2, y + (r() - 0.5) * 2, rad + r() * 1.2]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let best = null;
    for (const [bx, by, br] of blobs) {
      const dx = (x + 0.5 - bx) / br, dy = (y + 0.5 - by) / br, d = dx * dx + dy * dy;
      if (d <= 1 && (!best || by > best[1])) best = [dx, by, d, dy];
    }
    if (!best) continue;
    const [nx, , d, ny] = best;
    if (d > 0.82 && hash2(x, y, seed) < 0.45) continue; // ragged leafy edge
    const lit = -nx * 0.55 - ny * 0.8 + (hash2(x, y, seed + 1) - 0.5) * 0.5;
    g.set(x, y, lit > 0.55 ? L[4] : lit > 0.15 ? L[0] : lit > -0.3 ? L[1] : lit > -0.7 ? L[2] : L[3]);
  }
  g.outline(OUTLINE);
  return { canvas: g.toCanvas(), ax: 15, ay: 35 };
}
export function makePine(pal, seed) {
  const r = mulberry32(seed), W = 22, H = 42, g = new PixBuf(W, H), P = pal.pine;
  g.rect(10, 34, 1, 6, pal.trunk[0]); g.rect(11, 34, 1, 6, pal.trunk[1]);
  const tiers = [[33, 10, 9], [27, 9, 8], [21, 7, 7], [15, 5, 6], [9, 3, 6]];
  for (const [bottom, half, tall] of tiers) {
    for (let y = bottom - tall; y <= bottom; y++) {
      const t = (y - (bottom - tall)) / tall, w = Math.round(half * t + 0.6 + (r() - 0.5));
      for (let x = 11 - w; x <= 10 + w; x++) {
        const side = (x - 10.5) / Math.max(1, w), edge = y === bottom || hash2(x, y, seed) < 0.12 && Math.abs(side) > 0.6;
        const c = edge ? P[2] : side < -0.35 ? (hash2(x, y, seed + 3) < 0.3 ? P[3] : P[0]) : side < 0.3 ? P[1] : P[2];
        g.set(x, y, c);
      }
    }
  }
  g.set(10, 2, P[3]); g.set(11, 2, P[0]);
  g.outline(OUTLINE);
  return { canvas: g.toCanvas(), ax: 11, ay: 39 };
}

/* ------------------------------------------------------------------------------------------
   Buildings: each tile column of a house is its own box sprite (so characters sort correctly
   around it), shaded in world coordinates so windows, siding and shingles line up.
   ------------------------------------------------------------------------------------------ */
const STOREY = 1.5; // blocks per storey

export function houseShader(b, style, pal) {
  const S = pal.houses[style], W = S.wall, Rf = S.roof;
  return (face, wx, wy, z) => {
    if (face === 'top') {
      const inX = wx - b.x, inY = wy - b.y, edge = Math.min(inX, inY, b.x + b.w - wx, b.y + b.d - wy);
      if (edge < 0.09) return shadeHex(Rf[0], 0.18);                  // parapet trim
      if (edge < 0.16) return shadeHex(Rf[0], -0.12);
      return frac(wy * 4) < 0.22 ? Rf[1] : (hash2(Math.floor(wx * 8), Math.floor(wy * 4), 7) < 0.08 ? shadeHex(Rf[0], 0.08) : Rf[0]);
    }
    const along = face === 'left' ? wx : wy, start = face === 'left' ? b.x : b.y, len = face === 'left' ? b.w : b.d;
    const base = face === 'left' ? W[1] : W[2];
    const cornerDist = Math.min(along - start, start + len - along);
    if (z > b.h - 0.12) return shadeHex(Rf[0], face === 'left' ? -0.05 : -0.22);   // roof edge band
    if (cornerDist < 0.07) return shadeHex(S.trim, face === 'left' ? -0.06 : -0.2);
    if (z < 0.12) return shadeHex(base, -0.25);                                        // foundation
    const k = Math.floor(z / STOREY), zf = (z - k * STOREY) / STOREY, u = frac(along);
    const tile = [Math.floor(face === 'left' ? wx : b.x + b.w - 1), Math.floor(face === 'left' ? b.y + b.d - 1 : wy)];
    const isDoor = k === 0 && b.door && b.door[0] === tile[0] && b.door[1] === tile[1] && b.door[2] === face;
    if (isDoor && u > 0.28 && u < 0.72 && zf < 0.72) {
      if (u < 0.33 || u > 0.67 || zf > 0.66) return shadeHex(S.trim, face === 'left' ? -0.05 : -0.2);
      return (u > 0.58 && zf > 0.3 && zf < 0.38) ? '#f4c542' : (face === 'left' ? pal.door[0] : pal.door[1]);
    }
    if (!isDoor && u > 0.24 && u < 0.76 && zf > 0.3 && zf < 0.78) {
      if (u < 0.3 || u > 0.7 || zf < 0.36 || zf > 0.72) return shadeHex(S.trim, face === 'left' ? -0.04 : -0.18);
      if (Math.abs(u - 0.5) < 0.03) return shadeHex(S.trim, -0.1);                 // window mullion
      return zf > 0.58 ? pal.glass[0] : zf > 0.5 && u < 0.45 ? pal.glass[0] : pal.glass[face === 'left' ? 1 : 2];
    }
    return frac(z * 4) < 0.14 ? shadeHex(base, -0.08) : base;                       // siding boards
  };
}

export function houseColumn(b, tx, ty, style, pal) {
  const sh = houseShader(b, style, pal);
  return boxSprite([{ x: 0, y: 0, z: 0, lx: 1, ly: 1, h: b.h, shade: (f, wx, wy, z) => sh(f, wx + tx, wy + ty, z) }]);
}

/* Rooftop clutter. */
export function makeAC(pal) {
  const M = pal.metal;
  return boxSprite([{ x: 0, y: 0, z: 0, lx: 0.55, ly: 0.45, h: 0.32, shade: (f, wx, wy, z) =>
    f === 'top' ? (frac(wx * 6) < 0.3 ? M[1] : M[0]) : f === 'left' ? (frac(wx * 7) < 0.35 ? M[2] : M[1]) : M[2] }], { outline: OUTLINE });
}
export function makeChimney() {
  const B = ['#a8584a', '#8a4639', '#6b362c'];
  return boxSprite([{ x: 0, y: 0, z: 0, lx: 0.32, ly: 0.32, h: 0.75, shade: (f, wx, wy, z) =>
    f === 'top' ? (z > 0 && Math.min(wx, wy, 0.32 - wx, 0.32 - wy) > 0.07 ? '#2a2026' : B[0]) : (frac(z * 6) < 0.18 ? '#6b5a50' : f === 'left' ? B[1] : B[2]) }], { outline: OUTLINE });
}
export function makeAntenna(pal) {
  const M = pal.metal;
  return boxSprite([
    { x: 0, y: 0, z: 0, lx: 0.08, ly: 0.08, h: 1.3, shade: (f) => f === 'right' ? M[2] : M[1] },
    { x: -0.3, y: 0, z: 1.0, lx: 0.68, ly: 0.06, h: 0.06, shade: () => M[1] },
    { x: -0.2, y: 0, z: 1.2, lx: 0.48, ly: 0.06, h: 0.06, shade: () => M[0] },
  ]);
}

/* ------------------------------------------------------------------------------------------
   Street props.
   ------------------------------------------------------------------------------------------ */
export function makeHedge(pal, seed) {
  const H = pal.hedge;
  return boxSprite([{ x: 0.06, y: 0.06, z: 0, lx: 0.88, ly: 0.88, h: 0.7, shade: (f, wx, wy, z) => {
    const n = hash2(Math.floor(wx * 9), Math.floor((f === 'top' ? wy : z) * 9), seed);
    if (f === 'top') return n < 0.2 ? H[3] : n < 0.75 ? H[0] : H[1];
    return f === 'left' ? (n < 0.3 ? H[0] : H[1]) : (n < 0.3 ? H[1] : H[2]);
  } }], { outline: OUTLINE });
}

export function makeFence(pal, axis) {
  const F = pal.fence;
  const along = axis === 'x';
  const shade = (f, wx, wy, z) => {
    const a = along ? wx : wy, p = frac(a * 4);
    const rail = (z > 0.22 && z < 0.3) || (z > 0.48 && z < 0.55);
    const picket = p < 0.6 && z < 0.62 - (p < 0.15 || p > 0.45 ? 0.06 : 0);
    if (f === 'top') return picket ? F[0] : null;
    const faceAlong = along ? f === 'left' : f === 'right';
    if (!faceAlong) return picket || rail ? F[2] : null;
    if (picket) return p < 0.18 ? F[0] : F[1];
    return rail ? F[2] : null;
  };
  const b = along ? { x: 0, y: 0.44, lx: 1, ly: 0.12 } : { x: 0.44, y: 0, lx: 0.12, ly: 1 };
  return boxSprite([{ ...b, z: 0, h: 0.68, shade }]);
}

export function makeCar(pal, colorIdx, axis) {
  const C = pal.car[colorIdx], G = pal.glass, M = pal.metal;
  const X = axis === 'x';
  const dims = (lx, ly) => X ? [lx, ly] : [ly, lx];
  const pos = (x, y) => X ? [x, y] : [y, x];
  const boxes = [];
  // Tyres peeking out under the body.
  for (const [tx, ty] of [[0.25, 0.05], [1.35, 0.05], [0.25, 0.68], [1.35, 0.68]]) {
    const [x, y] = pos(tx, ty), [lx, ly] = dims(0.32, 0.18);
    boxes.push({ x, y, z: 0, lx, ly, h: 0.22, shade: (f) => f === 'top' ? '#3a3742' : pal.tire });
  }
  const along = (wx, wy) => X ? wx : wy, across = (wx, wy) => X ? wy : wx;
  const sideFace = X ? 'left' : 'right', endFace = X ? 'right' : 'left';
  {
    const [x, y] = pos(0, 0), [lx, ly] = dims(1.9, 0.86);
    boxes.push({ x, y, z: 0.12, lx, ly, h: 0.4, shade: (f, wx, wy, z) => {
      const a = along(wx, wy);
      if (f === 'top') return Math.abs(across(wx, wy) - 0.43) < 0.06 ? shadeHex(C[0], 0.15) : C[0];
      if (z < 0.2) return M[2];                                                     // bumper/skirt
      if (f === sideFace) {
        if (Math.abs(a - 0.95) < 0.025 && z < 0.46) return C[2];                    // door seam
        if (a > 1.82 && z > 0.36) return '#f6e7a1';                                 // headlight
        if (a < 0.08 && z > 0.36) return '#e2483f';                                 // tail light
        return C[1];
      }
      if (f === endFace) return z > 0.36 && (frac(across(wx, wy) * 2.3) < 0.3) ? '#f6e7a1' : C[2];
      return C[1];
    } });
  }
  {
    const [x, y] = pos(0.45, 0.06), [lx, ly] = dims(1.0, 0.74);
    boxes.push({ x, y, z: 0.52, lx, ly, h: 0.34, shade: (f, wx, wy, z) => {
      if (f === 'top') return C[0];
      const a = along(wx, wy) - 0.45;
      if (z > 0.6 && z < 0.82 && a > 0.06 && a < 0.94 && Math.abs(a - 0.5) > 0.04) return f === sideFace ? G[1] : G[2];
      return f === 'left' ? C[1] : C[2];
    } });
  }
  return boxSprite(boxes, { outline: OUTLINE });
}

export function makeMailbox(seed) {
  const col = ['#d6453d', '#3d7bd6', '#4f8a3c'][seed % 3];
  return boxSprite([
    { x: 0.46, y: 0.46, z: 0, lx: 0.08, ly: 0.08, h: 0.5, shade: f => f === 'right' ? '#5c3d28' : '#7a5236' },
    { x: 0.32, y: 0.4, z: 0.5, lx: 0.36, ly: 0.2, h: 0.22, shade: (f, wx, wy, z) => f === 'top' ? shadeHex(col, 0.15) : f === 'left' ? col : shadeHex(col, -0.25) },
    { x: 0.62, y: 0.4, z: 0.62, lx: 0.04, ly: 0.04, h: 0.16, shade: () => '#f4c542' },
  ], { outline: OUTLINE });
}
export function makeLamp(pal) {
  const M = pal.metal;
  return boxSprite([
    { x: 0.44, y: 0.44, z: 0, lx: 0.14, ly: 0.14, h: 0.18, shade: f => f === 'right' ? M[2] : M[1] },
    { x: 0.47, y: 0.47, z: 0.18, lx: 0.07, ly: 0.07, h: 2.2, shade: f => f === 'right' ? '#4e5260' : '#6b707d' },
    { x: 0.34, y: 0.4, z: 2.3, lx: 0.34, ly: 0.2, h: 0.14, shade: (f, wx, wy, z) => f === 'top' ? '#6b707d' : z < 2.33 ? '#fff4c2' : '#4e5260' },
  ], { outline: OUTLINE });
}
export function makeCrate() {
  const Wd = ['#c99a5b', '#a87c45', '#86602f'];
  return boxSprite([{ x: 0.12, y: 0.12, z: 0, lx: 0.76, ly: 0.76, h: 0.7, shade: (f, wx, wy, z) => {
    const a = f === 'left' ? wx : wy;
    if (f === 'top') return frac(wx * 4) < 0.12 ? Wd[1] : Wd[0];
    const edge = Math.min(a - 0.12, 0.88 - a, z, 0.7 - z) < 0.07;
    if (edge || Math.abs((a - 0.12) / 0.76 - z / 0.7) < 0.06) return Wd[2];      // frame + diagonal brace
    return f === 'left' ? Wd[1] : shadeHex(Wd[2], 0.1);
  } }], { outline: OUTLINE });
}
export function makeBin() {
  return boxSprite([
    { x: 0.28, y: 0.28, z: 0, lx: 0.44, ly: 0.44, h: 0.55, shade: (f, wx, wy, z) => f === 'top' ? '#5c7a5a' : (frac(z * 5) < 0.2 ? '#3d523c' : f === 'left' ? '#4e6a4c' : '#3d523c') },
    { x: 0.25, y: 0.25, z: 0.55, lx: 0.5, ly: 0.5, h: 0.08, shade: f => f === 'top' ? '#6c8c69' : '#3d523c' },
  ], { outline: OUTLINE });
}

/* ------------------------------------------------------------------------------------------
   Small UI and effect sprites.
   ------------------------------------------------------------------------------------------ */
export function makeShadow(w, h) {
  // Soft dithered oval: solid core, checker-dithered rim.
  const g = new PixBuf(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (x + 0.5 - w / 2) / (w / 2), dy = (y + 0.5 - h / 2) / (h / 2), d = dx * dx + dy * dy;
    if (d <= 0.55) g.set(x, y, 'rgba(28,20,44,0.36)');
    else if (d <= 1 && (x + y) % 2 === 0) g.set(x, y, 'rgba(28,20,44,0.36)');
  }
  return g.toCanvas();
}
export function makeHeart(full) {
  const rows = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
  const g = new PixBuf(9, 8);
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') g.set(x + 1, y + 1, full ? (y < 2 && x < 3 ? '#ff9a9a' : '#e2384a') : '#4a3a4e'); }));
  g.outline(OUTLINE);
  return g.toCanvas();
}
export function makeSkull() {
  const rows = ['.###.', '#####', '#.#.#', '#####', '.#.#.'];
  const g = new PixBuf(7, 7);
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') g.set(x + 1, y + 1, '#e9e3d6'); }));
  g.outline(OUTLINE);
  return g.toCanvas();
}
export function makeMuzzle() {
  const rows = ['..#..', '.#O#.', '#OWO#', '.#O#.', '..#..'];
  const g = new PixBuf(5, 5), col = { '#': '#ffb347', O: '#ffe680', W: '#ffffff' };
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (col[ch]) g.set(x, y, col[ch]); }));
  return g.toCanvas();
}

/** A soft pixel cloud: white puffs, shaded underneath, dithered rim. */
export function makeCloud(seed) {
  const r = mulberry32(seed), W = 46, H = 18, g = new PixBuf(W, H);
  const puffs = Array.from({ length: 5 }, (_, i) => [8 + i * 7 + r() * 4, 10 - Math.sin(i / 4 * Math.PI) * 4 + r() * 2, 5 + r() * 3]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let inside = false, shade = 0;
    for (const [cx, cy, rad] of puffs) { const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.3) / rad; if (d <= 1) { inside = true; shade = Math.max(shade, y - cy + rad * 0.2); } }
    if (!inside || y > 13) continue;
    const c = y > 11 ? '#cfe7ea' : shade > 2.5 ? '#e4f2f2' : '#ffffff';
    if (y > 12 && (x + y) % 2) continue;
    g.set(x, y, c);
  }
  return g.toCanvas();
}

/* ------------------------------------------------------------------------------------------
   Pickups, hazards, UI icons.
   ------------------------------------------------------------------------------------------ */
function fromRows(rows, colors, outline = OUTLINE) {
  const h = rows.length, w = rows[0].length, g = new PixBuf(w + 2, h + 2);
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (colors[ch]) g.set(x + 1, y + 1, colors[ch]); }));
  if (outline) g.outline(outline);
  return g.toCanvas();
}
export function makeBrain() {
  return fromRows(['.aaab.', 'abaaab', 'aabaab', 'abaaba', '.bbbb.'], { a: '#f7a6c4', b: '#d9718f' });
}
export function makeBrainGlow() {
  const g = new PixBuf(13, 13);
  for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) { const d = Math.hypot(x - 6, y - 6); if (d < 6.2 && (d < 3.5 || (x + y) % 2 === 0)) g.set(x, y, 'rgba(255,170,210,0.35)'); }
  return g.toCanvas();
}
export function makeHelpBubble(color = '#e2384a') {
  return fromRows(['.wwwww.', 'wwwrwww', 'wwwrwww', 'wwwrwww', 'wwwwwww', 'wwwrwww', '.wwwww.', '...w...'], { w: '#ffffff', r: color });
}
export function makeBarrel() {
  const R = ['#d6453d', '#b5372f', '#8e2b25'];
  return boxSprite([{ x: 0.24, y: 0.24, z: 0, lx: 0.52, ly: 0.52, h: 0.78, shade: (f, wx, wy, z) => {
    if (f === 'top') return Math.hypot(wx - 0.5, wy - 0.5) < 0.12 ? '#5b2420' : R[0];
    if (z > 0.3 && z < 0.48) return ((f === 'left' ? wx : wy) * 10 | 0) % 2 ? '#f4c542' : '#1c1424';   // hazard band
    if (frac(z * 4) < 0.1) return R[2];
    return f === 'left' ? R[1] : R[2];
  } }], { outline: OUTLINE });
}
export function makeSaw(frame) {
  const g = new PixBuf(11, 11), a0 = frame * Math.PI / 8;
  for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) {
    const dx = x + 0.5 - 5.5, dy = y + 0.5 - 5.5, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx) - a0;
    const tooth = Math.cos(a * 8) > 0.2;
    if (d < 1.2) g.set(x, y, '#5b5f6b');
    else if (d < 3.6) g.set(x, y, (dx < 0 && dy < 0) ? '#e8ebf0' : '#b8bcc6');
    else if (d < 5.2 && tooth) g.set(x, y, '#d0d4dc');
  }
  g.outline(OUTLINE);
  return g.toCanvas();
}
export function makeKnife(frame) {
  const g = new PixBuf(7, 7), a = frame * Math.PI / 4, c = Math.cos(a), s2 = Math.sin(a);
  for (let t = -2.5; t <= 2.5; t += 0.5) g.set(Math.round(3 + c * t), Math.round(3 + s2 * t), t > 0.8 ? WOOD : STEEL);
  return g.toCanvas();
}
const ICONS = {
  rate: [['....yy.....', '...yyyy....', '...yyyy.ll.', '...oooo....', '...oooo.ll.', '...oooo....', '...oooo.ll.', '...oooo....', '...oooo....'], { y: '#f4d35e', o: '#d99a2b', l: '#ffffff' }],
  damage: [['....rr....', '...rrrr...', '..rrrrrr..', '..rrrrrr..', '..ffffff..', '..ffffff..', '..ffffff..', '..ffffff..', '..ffffff..'], { r: '#e2384a', f: '#d99a2b' }],
  pierce: [['.........', 'zz.zz....', 'zz.zz....', '.........', 'aaaaaaaa>', '.........', 'zz.zz....', 'zz.zz....'], { z: '#7d9670', a: '#f4d35e', '>': '#ffffff' }],
  speed: [['....bbb..', '....bbbb.', '....bbbb.', 'll..bbbb.', '....bbbbb', 'll.bbbbbb', '...ssssss'], { b: '#7a4a2e', s: '#2a2230', l: '#ffffff' }],
  magnet: [['rr...rr', 'rr...rr', 'rr...rr', 'rr...rr', 'rrr.rrr', '.rrrrr.', '..rrr..'], { r: '#e2384a' }],
  heart: [['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], { r: '#e2384a' }],
  tough: [['ggggggg', 'gwwgggg', 'gwggggg', 'ggggggg', '.ggggg.', '..ggg..', '...g...'], { g: '#5aa9cf', w: '#ffffff' }],
  saw: [['..s.s..', '.sssss.', 'sssdsss', '.ssdss.', 'sssdsss', '.sssss.', '..s.s..'], { s: '#c9ccd3', d: '#5b5f6b' }],
  molotov: [['...f...', '..fyf..', '...w...', '..ggg..', '.ggggg.', '.ggggg.', '.ggggg.'], { f: '#ff8a3d', y: '#f4d35e', w: '#f4f1ea', g: '#5c9a42' }],
  radar: [['...y...', '..yyy..', '.yyyyy.', '...y...', '...y...', '...y...'], { y: '#9bd068' }],
  ricochet: [['y......', '.y.....', '..y...y', '...y.y.', '....y..'], { y: '#f4d35e' }],
  medic: [['.www.', 'wwrww', 'wrrrw', 'wwrww', '.www.'], { w: '#f4f1ea', r: '#e2384a' }],
  barbed: [['g.g.g.g', '.g.g.g.', 'ggggggg', '.g.g.g.', 'g.g.g.g'], { g: '#a3a7b1' }],
  grenade: [['..mm.', '.gggg', 'ggggg', 'ggwgg', 'ggggg', '.ggg.'], { g: '#5c7a52', m: '#a3a7b1', w: '#9bd068' }],
  recruits: [['..y..', '.yyy.', 'yyyyy', '.yyy.', '.y.y.'], { y: '#f4d35e' }],
  star: [['..y..', '..y..', 'yyyyy', '.yyy.', '.y.y.'], { y: '#f4d35e' }],
  skull: [['.www.', 'wwwww', 'w.w.w', 'wwwww', '.w.w.'], { w: '#e9e3d6' }],
  flame: [['..r..', '.ry..', '.ryr.', 'ryyyr', '.rrr.'], { r: '#ff6a3d', y: '#f4d35e' }],
  can: [['sss', 'rrr', 'rwr', 'rrr'], { s: '#c9ccd3', r: '#e2384a', w: '#ffffff' }],
  lock: [['.ggg.', 'g...g', 'ggggg', 'gg.gg', 'ggggg'], { g: '#a3a7b1' }],
  map: [['ggbbb', 'gggbb', 'ygggb', 'yyggg'], { g: '#6caa4c', b: '#4ea3c6', y: '#f4d35e' }],
  camp: [['..r..', '.rrr.', 'rrrrr', 'wwbww', 'wwbww'], { r: '#e2384a', w: '#efe6d6', b: '#7a4a2e' }],
  conga: [['.h..h..h.', 'sss.sss.s', 'sss.sss.s', '.l..l..l.'], { h: '#f2c7a2', s: '#3a5fb5', l: '#2a2230' }],
  back: [['..w..', '.ww..', 'wwwww', '.ww..', '..w..'], { w: '#ffffff' }],
  pause: [['ww.ww', 'ww.ww', 'ww.ww', 'ww.ww', 'ww.ww'], { w: '#ffffff' }],
  gear: [['..w.w..', '.wwwww.', 'www.www', 'ww...ww', 'www.www', '.wwwww.', '..w.w..'], { w: '#ffffff' }],
  dash: [['..ww...', '...ww..', 'wwwwww.', 'wwwwwww', 'wwwwww.', '...ww..', '..ww...'], { w: '#ffffff' }],
};
export function makeIcon(name) { const [rows, colors] = ICONS[name]; return fromRows(rows, colors); }

/* ------------------------------------------------------------------------------------------
   Zombie types and bosses.
   ------------------------------------------------------------------------------------------ */
export function zombieTypeLook(type, i = 0) {
  const base = zombieLook(i);
  const tint = (o) => ({ ...base, ...o, skin2: shadeHex(o.skin || base.skin, -0.18), shirt2: shadeHex(o.shirt || base.shirt, -0.2) });
  switch (type) {
    case 'runner': return tint({ shirt: '#a8463c', pants: '#3a3340', skin: '#b8c79c' });
    case 'spitter': return tint({ shirt: '#6b4a7a', skin: '#a3b96a', scream: true });
    case 'screamer': return tint({ skin: '#d8d8c8', hair: '#e9e3d6', shirt: '#8a7d8f', longHair: true, scream: true });
    case 'riot': return tint({ shirt: '#2f3a5a', pants: '#222a40', hat: 'helmet', hatColor: '#26304a', shield: true });
    case 'fish': return tint({ skin: '#6fa8a0', hair: '#3f7f78', shirt: '#4a6a7a', pants: '#2f4a55' });
    case 'elf': return tint({ skin: '#a8c890', shirt: '#3f8f4a', pants: '#3f8f4a', hat: 'elf' });
    case 'bloater': return tint({ shirt: '#7d8f5a', skin: '#a9b86a', belly: '#b8c46a' });
    case 'brute': return tint({ shirt: '#5c4a3a', pants: '#3a3340', skin: '#7d9670', hair: '#1f1a1a' });
    case 'mailman': return tint({ shirt: '#4a6aa8', pants: '#2a3a6a', hat: 'cap', hatColor: '#2a3a6a', badge: '#f4c542', bag: true, skin: '#8fae7a' });
    case 'santa': return tint({ shirt: '#c8363c', pants: '#c8363c', belt: '#1c1424', hat: 'santa', beard: '#f4f1ea', skin: '#a9c08f' });
    case 'pz': return tint({ shirt: '#a9c8d8', pants: '#a9c8d8', hat: 'bald', hair: '#9fd07a', skin: '#9fd07a' });
    case 'captain': return tint({ shirt: '#26345a', pants: '#1c2440', hat: 'captain', beard: '#bdb6af', skin: '#8fae7a' });
  }
  return base;
}
/** Zombie dog: a side-view quadruped, used for every facing. */
export function makeDog() {
  const sheet = { flash: {} }, frames = [], flashes = [];
  for (let f = 0; f < 4; f++) {
    const g = new PixBuf(16, 16), R = (x, y, w, h, c) => g.rect(x, y, w, h, c);
    const fur = '#6a5a4a', dark = '#4a3e33', leg = f % 2 ? 1 : 0;
    R(3, 9, 9, 3, fur); R(3, 11, 9, 1, dark);
    R(11, 6, 4, 4, fur); g.set(14, 7, CHAR.zeye); R(15, 8, 1, 2, dark); g.set(12, 5, dark); g.set(11, 5, dark);
    g.set(2, 8, fur); g.set(1, 7, fur);                                    // tail
    R(4 + leg, 12, 1, 3, dark); R(6 - leg, 12, 1, 3, fur); R(9 + leg, 12, 1, 3, dark); R(11 - leg, 12, 1, 3, fur);
    for (const [x, y] of [[5, 9], [8, 10], [6, 10]]) g.set(x, y, '#9a2a2c');
    const [c, fl] = finish(g, false), [cw, flw] = finish(g, true);
    frames.push([c, cw]); flashes.push([fl, flw]);
  }
  for (const d of ['E', 'S']) { sheet[d] = frames.map(f => f[0]); sheet.flash[d] = flashes.map(f => f[0]); }
  for (const d of ['W', 'N']) { sheet[d] = frames.map(f => f[1]); sheet.flash[d] = flashes.map(f => f[1]); }
  sheet.corpse = sheet.E[0];
  return sheet;
}
/** Crawler: a walker turned on its belly, dragging itself with its arms. */
export function makeCrawler(i) {
  const base = makeCharacter(zombieLook(i));
  const turn = (src, flip) => { const [c, x] = makeCanvas(18, 18); x.translate(9, 9); x.rotate(flip ? Math.PI / 2 : -Math.PI / 2); x.translate(-9, -9); x.drawImage(src, 0, 3); return c; };
  const sheet = { flash: {} };
  for (const d of ['E', 'W', 'S', 'N']) {
    const flip = d === 'W' || d === 'N';
    sheet[d] = base.E.map(fr => turn(fr, flip)); sheet.flash[d] = base.flash.E.map(fr => turn(fr, flip));
  }
  sheet.corpse = base.corpse;
  return sheet;
}
/** Draws a canvas sheet scaled by a whole number (pixel art stays crisp). */
export function scaleSheet(sheet, k) {
  const up = c => { const [o, x] = makeCanvas(c.width * k, c.height * k); x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, c.width * k, c.height * k); return o; };
  const out = { flash: {}, scale: k };
  for (const d of ['S', 'N', 'E', 'W']) { out[d] = sheet[d].map(up); out.flash[d] = sheet.flash[d].map(up); }
  out.corpse = up(sheet.corpse);
  return out;
}
/** General Rot: a zombie in a walking mech suit. Two frames (legs). */
export function makeMech(frame) {
  const O = ['#6c7a45', '#5a6639', '#46502c'], G = ['#8a8f9a', '#6b707d', '#4e5260'];
  const spr = boxSprite([
    { x: 0.1 + frame * 0.1, y: 0.2, z: 0, lx: 0.3, ly: 0.3, h: 0.8, shade: (f) => f === 'top' ? G[0] : f === 'left' ? G[1] : G[2] },
    { x: 0.6 - frame * 0.1, y: 0.5, z: 0, lx: 0.3, ly: 0.3, h: 0.8, shade: (f) => f === 'top' ? G[0] : f === 'left' ? G[1] : G[2] },
    { x: 0, y: 0, z: 0.8, lx: 1, ly: 1, h: 0.9, shade: (f, wx, wy, z) => f !== 'top' && z > 1.4 && z < 1.55 ? '#ff4a4a' : f === 'top' ? O[0] : f === 'left' ? O[1] : O[2] },
    { x: -0.35, y: 0.3, z: 1.1, lx: 0.35, ly: 0.4, h: 0.4, shade: (f) => f === 'top' ? G[0] : G[2] },
    { x: 1, y: 0.3, z: 1.1, lx: 0.5, ly: 0.18, h: 0.18, shade: () => '#2b2b33' },
  ], { outline: OUTLINE, post: (buf, ox, oy) => {
    // Zombie head poking out of the hatch.
    const hx = ox, hy = oy - 15;
    buf.rect(hx - 2, hy - 2, 5, 4, '#8fae7a'); buf.set(hx - 1, hy - 1, CHAR.zeye); buf.set(hx + 1, hy - 1, CHAR.zeye); buf.rect(hx - 2, hy - 3, 5, 1, '#556b2f');
  } });
  return spr;
}
/** The Hive: a pulsing mound of zombie bodies with faces and reaching arms. */
export function makeHive(frame) {
  const W = 56, H = 46, g = new PixBuf(W, H), r = mulberry32(5);
  const sq = frame ? 1.04 : 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x - W / 2) / (W / 2 - 2) / sq, dy = (y - H + 6) / (H - 8) * sq;
    if (dx * dx + dy * dy > 1 || y > H - 4) continue;
    const n = hash2(x >> 1, y >> 1, 77), lit = -dx * 0.5 - dy * 0.6 + n * 0.4;
    g.set(x, y, lit > 0.6 ? '#9a7aa0' : lit > 0.2 ? '#7a5a82' : lit > -0.2 ? '#5e4266' : '#432e4a');
  }
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI, rad = 0.35 + r() * 0.55, x = Math.round(W / 2 + Math.cos(a) * rad * (W / 2 - 6)), y = Math.round(H - 6 - Math.sin(a) * rad * (H - 12));
    g.rect(x - 2, y - 2, 5, 4, '#8fae7a'); g.set(x - 1, y - 1, CHAR.zeye); g.set(x + 1, y - 1, CHAR.zeye); g.set(x, y + 1, CHAR.mouth);
  }
  for (let i = 0; i < 8; i++) { const x = 6 + Math.floor(r() * (W - 12)), y = 4 + Math.floor(r() * 12) + (frame && i % 2 ? -1 : 0); g.rect(x, y, 1, 5, '#8fae7a'); g.set(x - 1, y, '#8fae7a'); g.set(x + 1, y, '#8fae7a'); }
  g.outline(OUTLINE);
  return g.toCanvas();
}
export function makeHelicopter() {
  const C = ['#5c7a52', '#4a6642', '#384f33'];
  return boxSprite([
    { x: -0.6, y: 0.15, z: 0, lx: 1.4, ly: 0.06, h: 0.06, shade: () => '#2b2b33' }, { x: -0.6, y: 0.85, z: 0, lx: 1.4, ly: 0.06, h: 0.06, shade: () => '#2b2b33' },
    { x: -0.8, y: 0.1, z: 0.25, lx: 1.7, ly: 0.9, h: 0.75, shade: (f, wx, wy, z) => f !== 'top' && z > 0.6 && wx > 0.4 ? '#8fd3ee' : f === 'top' ? C[0] : f === 'left' ? C[1] : C[2] },
    { x: -2.6, y: 0.45, z: 0.6, lx: 1.8, ly: 0.2, h: 0.2, shade: (f) => f === 'top' ? C[0] : C[2] },
    { x: -2.7, y: 0.4, z: 0.8, lx: 0.2, ly: 0.3, h: 0.45, shade: () => C[1] },
    { x: 0, y: 0.5, z: 1.0, lx: 0.1, ly: 0.1, h: 0.2, shade: () => '#2b2b33' },
  ], { outline: OUTLINE });
}
export function makeCan() { return fromRows(['sss', 'rrr', 'rwr', 'rrr', 'rrr'], { s: '#c9ccd3', r: '#e2384a', w: '#ffffff' }); }
export function makeMedkit() { return fromRows(['wwwww', 'wwrww', 'wrrrw', 'wwrww'], { w: '#f4f1ea', r: '#e2384a' }); }
export function makeParcel() { return fromRows(['bbbbb', 'bybbb', 'yyyyy', 'bybbb', 'bbbbb'], { b: '#a0703f', y: '#f4d35e' }); }
export function makeAnchor() { return fromRows(['..g..', '.ggg.', '..g..', '..g..', 'g.g.g', '.ggg.'], { g: '#7b7f8a' }); }
export function makeTurret() {
  return boxSprite([
    { x: 0.3, y: 0.3, z: 0, lx: 0.4, ly: 0.4, h: 0.3, shade: (f) => f === 'top' ? '#a3a7b1' : f === 'left' ? '#7b7f8a' : '#5b5f6b' },
    { x: 0.38, y: 0.38, z: 0.3, lx: 0.24, ly: 0.24, h: 0.18, shade: (f) => f === 'top' ? '#e8803a' : '#c4642a' },
  ], { outline: OUTLINE });
}
export function makeSupplyCrate() {
  return boxSprite([{ x: 0.15, y: 0.15, z: 0, lx: 0.7, ly: 0.7, h: 0.6, shade: (f, wx, wy, z) => {
    if (f === 'top') return Math.abs(wx - 0.5) < 0.08 || Math.abs(wy - 0.5) < 0.08 ? '#f4d35e' : '#5c7a52';
    return Math.abs((f === 'left' ? wx : wy) - 0.5) < 0.08 ? '#f4d35e' : f === 'left' ? '#4a6642' : '#384f33';
  } }], { outline: OUTLINE });
}

/** A white silhouette of a canvas (hit flash for one-piece sprites). */
export function flashCopy(c) {
  const [o, x] = makeCanvas(c.width, c.height);
  x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height);
  return o;
}
export function makePuddle() {
  const [c, x] = makeCanvas(17, 9);
  for (let y = 0; y < 9; y++) for (let xx = 0; xx < 17; xx++) { const dx = (xx - 8) / 8, dy = (y - 4) / 4, d = dx * dx + dy * dy + hash2(xx, y, 3) * 0.3; if (d < 1) { x.fillStyle = d < 0.35 ? '#c7ec8a' : d < 0.75 ? '#9bd068' : '#6f9e3c'; x.fillRect(xx, y, 1, 1); } }
  return c;
}
