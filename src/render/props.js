import { boxSprite, shadeHex } from './iso.js';
import { OUTLINE } from './palette.js';
import { hash2 } from '../engine/rng.js';

/* Region props, all built from shaded iso boxes. Each returns { canvas, ax, ay } anchored at the
   tile's (0,0,0) corner. A box: { x, y, z, lx, ly, h, shade(face, wx, wy, z) }. */
const frac = v => v - Math.floor(v);
const solid = (top, left, right) => f => f === 'top' ? top : f === 'left' ? left : right;
const tri = c => solid(shadeHex(c, 0.12), c, shadeHex(c, -0.22));
const M = ['#c9ccd3', '#a3a7b1', '#7b7f8a'];

export function makeCart() {
  const wire = (f, wx, wy, z) => (frac(wx * 10) < 0.35 || frac(wy * 10) < 0.35 || frac(z * 10) < 0.35) ? (f === 'right' ? M[2] : M[0]) : null;
  return boxSprite([
    { x: 0.3, y: 0.32, z: 0, lx: 0.08, ly: 0.08, h: 0.1, shade: () => '#24222b' }, { x: 0.68, y: 0.6, z: 0, lx: 0.08, ly: 0.08, h: 0.1, shade: () => '#24222b' },
    { x: 0.25, y: 0.3, z: 0.12, lx: 0.55, ly: 0.4, h: 0.32, shade: wire },
    { x: 0.2, y: 0.3, z: 0.4, lx: 0.05, ly: 0.4, h: 0.12, shade: () => '#e2384a' },
  ], { outline: OUTLINE });
}
export function makeBench(c = '#a0703f') {
  return boxSprite([
    { x: 0.15, y: 0.4, z: 0, lx: 0.06, ly: 0.25, h: 0.28, shade: tri('#3a3742') }, { x: 0.79, y: 0.4, z: 0, lx: 0.06, ly: 0.25, h: 0.28, shade: tri('#3a3742') },
    { x: 0.1, y: 0.35, z: 0.28, lx: 0.8, ly: 0.32, h: 0.06, shade: (f, wx) => frac(wx * 6) < 0.12 ? shadeHex(c, -0.3) : tri(c)(f) },
    { x: 0.1, y: 0.33, z: 0.34, lx: 0.8, ly: 0.05, h: 0.28, shade: tri(c) },
  ], { outline: OUTLINE });
}
export function makePlant(seed = 1) {
  return boxSprite([{ x: 0.32, y: 0.32, z: 0, lx: 0.36, ly: 0.36, h: 0.32, shade: tri('#c0654a') }], {
    outline: OUTLINE,
    post: (buf, ox, oy) => {
      // A round leafy crown on top of the pot.
      const cx = ox, cy = oy - 6;
      for (let y = -6; y <= 3; y++) for (let x = -6; x <= 6; x++) {
        const d = Math.hypot(x, y * 1.2); if (d > 5.6 || (d > 4.6 && hash2(x, y, seed) < 0.5)) continue;
        const lit = -x * 0.5 - y * 0.8 + hash2(x + 9, y, seed) * 2;
        buf.set(cx + x, cy + y, lit > 2.5 ? '#9bd068' : lit > 0 ? '#5a9e46' : lit > -3 ? '#3e7d3a' : '#2c5c2e');
      }
    },
  });
}
export function makeEscalator() {
  return boxSprite([
    { x: 0.05, y: 0, z: 0, lx: 0.9, ly: 2, h: 1.1, shade: (f, wx, wy, z) => {
      if (f === 'top') return frac(wy * 5) < 0.3 ? '#5b5f6b' : '#8a8f9a';
      if (f === 'right') return z > 0.9 ? '#2a2230' : frac(z * 4) < 0.1 ? '#6b707d' : '#9aa0aa';
      return z > 0.95 ? '#1c1424' : '#b8bcc6';
    } },
  ], { outline: OUTLINE });
}
export function makeFountain() {
  const stone = ['#d8d2c6', '#bdb6a8', '#9a9384'];
  return boxSprite([
    { x: 0, y: 0, z: 0, lx: 2, ly: 2, h: 0.4, shade: (f, wx, wy) => f === 'top' ? (Math.min(wx, wy, 2 - wx, 2 - wy) < 0.18 ? stone[0] : (frac((wx + wy) * 2) < 0.15 ? '#8fd3ee' : '#4ea3c6')) : f === 'left' ? stone[1] : stone[2] },
    { x: 0.82, y: 0.82, z: 0.4, lx: 0.36, ly: 0.36, h: 0.7, shade: tri(stone[1]) },
    { x: 0.62, y: 0.62, z: 1.1, lx: 0.76, ly: 0.76, h: 0.14, shade: (f, wx, wy) => f === 'top' ? '#8fd3ee' : tri(stone[0])(f) },
  ], { outline: OUTLINE });
}
export function makeKiosk(c = '#e2384a') {
  return boxSprite([
    { x: 0.1, y: 0.1, z: 0, lx: 0.8, ly: 0.8, h: 0.75, shade: (f, wx, wy, z) => f === 'top' ? '#efe6d6' : z > 0.55 ? '#2a2230' : tri('#efe6d6')(f) },
    { x: 0.02, y: 0.02, z: 0.75, lx: 0.96, ly: 0.96, h: 0.18, shade: (f, wx, wy) => frac((f === 'top' ? wx + wy : (f === 'left' ? wx : wy)) * 4) < 0.5 ? c : '#ffffff' },
  ], { outline: OUTLINE });
}
export function makeBed() {
  return boxSprite([
    { x: 0.12, y: 0.25, z: 0, lx: 0.06, ly: 0.5, h: 0.32, shade: tri('#8a8f9a') },
    { x: 0.15, y: 0.25, z: 0.18, lx: 0.75, ly: 0.5, h: 0.16, shade: (f, wx) => f === 'top' ? (wx < 0.35 ? '#ffffff' : '#9fc6e6') : tri('#dfe6ec')(f) },
    { x: 0.18, y: 0.3, z: 0.34, lx: 0.16, ly: 0.4, h: 0.06, shade: tri('#ffffff') },
  ], { outline: OUTLINE });
}
export function makeWheelchair() {
  return boxSprite([
    { x: 0.3, y: 0.3, z: 0, lx: 0.4, ly: 0.06, h: 0.32, shade: () => '#24222b' }, { x: 0.3, y: 0.64, z: 0, lx: 0.4, ly: 0.06, h: 0.32, shade: () => '#24222b' },
    { x: 0.32, y: 0.36, z: 0.2, lx: 0.36, ly: 0.28, h: 0.06, shade: tri('#3d7bd6') },
    { x: 0.3, y: 0.36, z: 0.26, lx: 0.06, ly: 0.28, h: 0.3, shade: tri('#3d7bd6') },
  ], { outline: OUTLINE });
}
export function makeCabinet() {
  return boxSprite([{ x: 0.25, y: 0.3, z: 0, lx: 0.5, ly: 0.4, h: 0.9, shade: (f, wx, wy, z) => f === 'top' ? '#e8ecef' : frac(z * 3.3) < 0.08 ? '#7b7f8a' : f === 'left' ? '#d5dbe0' : '#aeb5bb' }], { outline: OUTLINE });
}
export function makeHydrant() {
  return boxSprite([
    { x: 0.38, y: 0.38, z: 0, lx: 0.24, ly: 0.24, h: 0.42, shade: tri('#d6453d') },
    { x: 0.32, y: 0.44, z: 0.22, lx: 0.36, ly: 0.12, h: 0.1, shade: tri('#b5372f') },
    { x: 0.4, y: 0.4, z: 0.42, lx: 0.2, ly: 0.2, h: 0.08, shade: tri('#f4c542') },
  ], { outline: OUTLINE });
}
export function makeBusStop() {
  return boxSprite([
    { x: 0.1, y: 0.15, z: 0, lx: 0.06, ly: 0.06, h: 1.6, shade: tri('#5b5f6b') }, { x: 0.84, y: 0.15, z: 0, lx: 0.06, ly: 0.06, h: 1.6, shade: tri('#5b5f6b') },
    { x: 0.1, y: 0.15, z: 0.3, lx: 0.8, ly: 0.04, h: 1.2, shade: () => 'rgba(160,210,235,0.55)' },
    { x: 0.05, y: 0.1, z: 1.6, lx: 0.9, ly: 0.7, h: 0.1, shade: tri('#3d7bd6') },
  ], { outline: OUTLINE });
}
export function makeSandbags() {
  return boxSprite([{ x: 0, y: 0.15, z: 0, lx: 1, ly: 0.7, h: 0.5, shade: (f, wx, wy, z) => {
    const row = Math.floor(z * 6), off = row % 2 ? 0.17 : 0;
    const seamA = f === 'top' ? frac((wx + off) * 3) < 0.12 : frac(((f === 'left' ? wx : wy) + off) * 3) < 0.1 || frac(z * 6) < 0.15;
    const c = seamA ? '#8a7c5a' : '#c9b78a';
    return f === 'top' ? shadeHex(c, 0.1) : f === 'left' ? c : shadeHex(c, -0.2);
  } }], { outline: OUTLINE });
}
export function makeWatchtower() {
  const W = '#7a5a3a';
  return boxSprite([
    { x: 0.1, y: 0.1, z: 0, lx: 0.1, ly: 0.1, h: 2.2, shade: tri(W) }, { x: 0.8, y: 0.1, z: 0, lx: 0.1, ly: 0.1, h: 2.2, shade: tri(W) },
    { x: 0.1, y: 0.8, z: 0, lx: 0.1, ly: 0.1, h: 2.2, shade: tri(W) }, { x: 0.8, y: 0.8, z: 0, lx: 0.1, ly: 0.1, h: 2.2, shade: tri(W) },
    { x: 0, y: 0, z: 2.2, lx: 1, ly: 1, h: 0.5, shade: (f, wx, wy, z) => f === 'top' ? '#8a6a48' : frac((f === 'left' ? wx : wy) * 5) < 0.15 ? '#5a4128' : tri('#9a7a52')(f) },
    { x: 0.45, y: 0.45, z: 2.7, lx: 0.1, ly: 0.1, h: 0.6, shade: tri(W) },
    { x: -0.05, y: -0.05, z: 3.3, lx: 1.1, ly: 1.1, h: 0.12, shade: tri('#6c7a45') },
  ], { outline: OUTLINE });
}
export function makeCrane() {
  const Y = '#f2b632';
  const lattice = (f, wx, wy, z) => (frac(z * 2) < 0.15 || frac((f === 'left' ? wx : wy) * 4) < 0.25 || Math.abs(frac(z * 2) - frac((f === 'left' ? wx : wy) * 2)) < 0.12) ? (f === 'right' ? shadeHex(Y, -0.3) : Y) : null;
  return boxSprite([
    { x: 0.25, y: 0.25, z: 0, lx: 0.5, ly: 0.5, h: 5, shade: (f, wx, wy, z) => f === 'top' ? Y : lattice(f, wx, wy, z) },
    { x: -2, y: 0.35, z: 4.6, lx: 4.2, ly: 0.3, h: 0.3, shade: (f, wx, wy, z) => f === 'top' ? Y : frac(wx * 3) < 0.3 ? shadeHex(Y, -0.2) : null },
    { x: 0.2, y: 0.2, z: 5, lx: 0.6, ly: 0.6, h: 0.5, shade: tri('#3a3742') },
  ], { outline: OUTLINE });
}
export function makeBoat(c = '#e9e3d6') {
  return boxSprite([
    { x: 0, y: 0, z: 0, lx: 2.6, ly: 1, h: 0.55, shade: (f, wx, wy, z) => f === 'top' ? '#a07448' : z < 0.18 ? '#d6453d' : tri(c)(f) },
    { x: 0.5, y: 0.15, z: 0.55, lx: 1, ly: 0.7, h: 0.5, shade: (f, wx, wy, z) => f !== 'top' && z > 0.75 ? '#2e3a4f' : tri(c)(f) },
  ], { outline: OUTLINE });
}
export function makeBollard() {
  return boxSprite([{ x: 0.38, y: 0.38, z: 0, lx: 0.24, ly: 0.24, h: 0.3, shade: tri('#3a3742') }], { outline: OUTLINE });
}
export function makeRadioTower() {
  const R = '#d6453d', Wt = '#e9e3d6';
  return boxSprite([
    { x: 0.2, y: 0.2, z: 0, lx: 0.6, ly: 0.6, h: 0.4, shade: tri('#8a8f9a') },
    { x: 0.35, y: 0.35, z: 0.4, lx: 0.3, ly: 0.3, h: 4, shade: (f, wx, wy, z) => (Math.floor(z * 1.5) % 2 ? R : Wt) && (frac((f === 'left' ? wx : wy) * 6) < 0.4 || frac(z * 3) < 0.2) ? (Math.floor(z * 1.5) % 2 ? R : Wt) : null },
    { x: 0.42, y: 0.42, z: 4.4, lx: 0.16, ly: 0.16, h: 0.16, shade: () => '#ff4a4a' },
  ], { outline: OUTLINE });
}
export function makePlane() {
  const Wt = ['#f2efe6', '#d6d2c6', '#aea99c'], B = '#3d7bd6';
  const body = (f, wx, wy, z) => {
    if (f === 'top') return Wt[0];
    if (z > 0.55 && z < 0.72 && frac(wx * 3) < 0.4 && wx > 0.8 && wx < 5.4) return '#2e3a4f';   // window row
    if (z < 0.3) return B;
    return f === 'left' ? Wt[1] : Wt[2];
  };
  return boxSprite([
    { x: 2.4, y: -1.6, z: 0.45, lx: 1.4, ly: 4.4, h: 0.14, shade: tri('#d6d2c6') },              // wings
    { x: 2.7, y: -0.9, z: 0.1, lx: 0.7, ly: 0.4, h: 0.35, shade: tri('#8a8f9a') }, { x: 2.7, y: 1.7, z: 0.1, lx: 0.7, ly: 0.4, h: 0.35, shade: tri('#8a8f9a') },
    { x: 0, y: 0.2, z: 0.15, lx: 6.2, ly: 1.1, h: 1.05, shade: body },                              // fuselage
    { x: 0.1, y: 0.6, z: 1.2, lx: 0.9, ly: 0.14, h: 1.3, shade: tri(B) },                          // tail fin
    { x: 0.1, y: -0.4, z: 1.0, lx: 0.7, ly: 2.3, h: 0.1, shade: tri(Wt[1]) },
  ], { outline: OUTLINE });
}
export function makeLuggageCart() {
  const bags = ['#d6453d', '#3d7bd6', '#f2b632', '#4f8a3c'];
  return boxSprite([
    { x: 0.1, y: 0.25, z: 0.1, lx: 0.85, ly: 0.5, h: 0.08, shade: tri('#5b5f6b') },
    ...bags.map((c, i) => ({ x: 0.14 + i * 0.2, y: 0.3, z: 0.18, lx: 0.17, ly: 0.4, h: 0.22 + (i % 2) * 0.1, shade: tri(c) })),
  ], { outline: OUTLINE });
}
export function makeCone() {
  return boxSprite([
    { x: 0.3, y: 0.3, z: 0, lx: 0.4, ly: 0.4, h: 0.06, shade: tri('#ff8a3d') },
    { x: 0.4, y: 0.4, z: 0.06, lx: 0.2, ly: 0.2, h: 0.4, shade: (f, wx, wy, z) => z > 0.2 && z < 0.3 ? '#ffffff' : tri('#ff8a3d')(f) },
  ], { outline: OUTLINE });
}
/** Box van / bus / ambulance / jeep. axis 'x' or 'y'. */
export function makeVan(colors, axis = 'x', len = 1.9, stripe = null, tall = 0.75) {
  const X = axis === 'x', C = colors;
  const dims = (lx, ly) => X ? [lx, ly] : [ly, lx], pos = (x, y) => X ? [x, y] : [y, x];
  const along = (wx, wy) => X ? wx : wy, sideFace = X ? 'left' : 'right';
  const boxes = [];
  for (const [tx, ty] of [[0.25, 0.05], [len - 0.55, 0.05], [0.25, 0.68], [len - 0.55, 0.68]]) { const [x, y] = pos(tx, ty), [lx, ly] = dims(0.32, 0.18); boxes.push({ x, y, z: 0, lx, ly, h: 0.22, shade: () => '#24222b' }); }
  const [x, y] = pos(0, 0), [lx, ly] = dims(len, 0.86);
  boxes.push({ x, y, z: 0.12, lx, ly, h: tall, shade: (f, wx, wy, z) => {
    const a = along(wx, wy);
    if (f === 'top') return C[0];
    if (z < 0.2) return '#5b5f6b';
    if (stripe && z > 0.35 && z < 0.45) return stripe;
    if (f === sideFace && z > tall - 0.25 && z < tall && frac(a * 2.2) < 0.6 && a > 0.2 && a < len - 0.2) return '#2e3a4f';
    if (f !== sideFace && z > tall - 0.3 && z < tall) return '#2e3a4f';
    if (f === sideFace && a > len - 0.12 && z > 0.3 && z < 0.4) return '#f6e7a1';
    return f === 'left' ? C[1] : C[2];
  } });
  return boxSprite(boxes, { outline: OUTLINE });
}
export function makeBarbedWire(axis) {
  const along = axis === 'x';
  const shade = (f, wx, wy, z) => {
    const a = along ? wx : wy;
    if (frac(a * 2) < 0.12 && z < 0.7) return f === 'right' ? '#5b5f6b' : '#8a8f9a';               // posts
    const wire = Math.abs(z - (0.35 + 0.08 * Math.sin(a * 25))) < 0.05 || Math.abs(z - (0.6 + 0.08 * Math.cos(a * 25))) < 0.05;
    return wire ? '#a3a7b1' : null;
  };
  const b = along ? { x: 0, y: 0.45, lx: 1, ly: 0.1 } : { x: 0.45, y: 0, lx: 0.1, ly: 1 };
  return boxSprite([{ ...b, z: 0, h: 0.72, shade }]);
}
