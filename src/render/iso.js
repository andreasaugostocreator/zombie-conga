import { HW, HH, ZH } from '../config.js';
import { makeCanvas } from './screen.js';

/** World (tiles; z in blocks) → screen pixels relative to the world origin. */
export const toScreen = (wx, wy, wz = 0) => [(wx - wy) * HW, (wx + wy) * HH - wz * ZH];
/** Screen pixels (on the ground plane) → world tiles. */
export const toWorld = (sx, sy) => [(sx / HW + sy / HH) / 2, (sy / HH - sx / HW) / 2];
/** A screen-space direction → the world-space direction that moves that way on screen. */
export const screenDirToWorld = (dx, dy) => [(dx / HW + dy / HH) / 2, (dy / HH - dx / HW) / 2];

const colorCache = new Map();
/** '#rrggbb' or 'rgba(r,g,b,a)' → [r, g, b, a(0-255)] */
export function rgba(c) {
  let v = colorCache.get(c);
  if (v) return v;
  if (c[0] === '#') v = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255];
  else { const m = c.match(/[\d.]+/g).map(Number); v = [m[0], m[1], m[2], Math.round((m[3] ?? 1) * 255)]; }
  colorCache.set(c, v);
  return v;
}
/** Mixes a colour towards black (k<0) or white (k>0). */
export function shadeHex(c, k) {
  const [r, g, b] = rgba(c), t = k < 0 ? 0 : 255, a = Math.abs(k);
  const h = x => Math.round(x + (t - x) * a).toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}

/** A small RGBA pixel buffer we paint into before turning it into a canvas. */
export class PixBuf {
  constructor(w, h) { this.w = w; this.h = h; this.data = new Uint8ClampedArray(w * h * 4); }
  set(x, y, c) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c) return;
    const [r, g, b, a] = rgba(c), i = (y * this.w + x) * 4;
    if (a === 255) { this.data[i] = r; this.data[i + 1] = g; this.data[i + 2] = b; this.data[i + 3] = 255; return; }
    const d = this.data, k = a / 255, ka = d[i + 3] / 255, out = k + ka * (1 - k);
    if (out <= 0) return;
    d[i] = (r * k + d[i] * ka * (1 - k)) / out; d[i + 1] = (g * k + d[i + 1] * ka * (1 - k)) / out; d[i + 2] = (b * k + d[i + 2] * ka * (1 - k)) / out; d[i + 3] = out * 255;
  }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  alpha(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.data[(y * this.w + x) * 4 + 3]; }
  /** Adds a 1px outline around opaque pixels (4-neighbourhood). */
  outline(c) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.alpha(x, y) > 100) continue;
      if (this.alpha(x - 1, y) > 100 || this.alpha(x + 1, y) > 100 || this.alpha(x, y - 1) > 100 || this.alpha(x, y + 1) > 100) add.push(x, y);
    }
    for (let i = 0; i < add.length; i += 2) this.set(add[i], add[i + 1], c);
    return this;
  }
  toCanvas() {
    const [c, x] = makeCanvas(this.w, this.h);
    const img = x.createImageData(this.w, this.h); img.data.set(this.data); x.putImageData(img, 0, 0);
    return c;
  }
}

/**
 * Rasterises an axis-aligned box into `buf`. The box spans world [bx, bx+lx] × [by, by+ly] × [bz, bz+h]
 * and the world origin (0,0,0) sits at buffer pixel (ox, oy).
 * shade(face, wx, wy, z) returns a colour or null (transparent) for each pixel, in absolute world
 * coordinates, so patterns (windows, siding, shingles) line up across neighbouring boxes.
 * Faces: 'top' (light), 'left' = the +y face (medium), 'right' = the +x face (dark): light from top-left.
 */
export function rasterBox(buf, ox, oy, bx, by, bz, lx, ly, h, shade) {
  const [sx0] = toScreen(bx, by + ly), [sx1] = toScreen(bx + lx, by);
  const [, syT] = toScreen(bx, by, bz + h), [, syB] = toScreen(bx + lx, by + ly, bz);
  for (let py = Math.floor(oy + syT) - 1; py <= Math.ceil(oy + syB) + 1; py++) {
    for (let px = Math.floor(ox + sx0) - 1; px <= Math.ceil(ox + sx1) + 1; px++) {
      // Pixel centre relative to the box's own origin corner (bx, by, bz).
      const [cx, cy] = toScreen(bx, by, bz);
      const sx = px + 0.5 - ox - cx, sy = py + 0.5 - oy - cy;
      let col = null;
      // Top face: the ground-plane point under this pixel, lifted by h.
      const [tx, ty] = toWorld(sx, sy + h * ZH);
      if (tx >= 0 && tx < lx && ty >= 0 && ty < ly) col = shade('top', bx + tx, by + ty, bz + h);
      else {
        // Left (+y) face: plane y = ly.
        const fx = sx / HW + ly, fz = ((fx + ly) * HH - sy) / ZH;
        if (fx >= 0 && fx < lx && fz >= 0 && fz < h) col = shade('left', bx + fx, by + ly, bz + fz);
        else {
          // Right (+x) face: plane x = lx.
          const fy = lx - sx / HW, gz = ((lx + fy) * HH - sy) / ZH;
          if (fy >= 0 && fy < ly && gz >= 0 && gz < h) col = shade('right', bx + lx, by + fy, bz + gz);
        }
      }
      if (col) buf.set(px, py, col);
    }
  }
}

/** Screen-space bounding box of a set of world boxes [{x,y,z,lx,ly,h}]. */
export function boxBounds(boxes) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, toScreen(b.x, b.y + b.ly)[0]); maxX = Math.max(maxX, toScreen(b.x + b.lx, b.y)[0]);
    minY = Math.min(minY, toScreen(b.x, b.y, b.z + b.h)[1]); maxY = Math.max(maxY, toScreen(b.x + b.lx, b.y + b.ly, b.z)[1]);
  }
  return { minX: Math.floor(minX) - 1, maxX: Math.ceil(maxX) + 1, minY: Math.floor(minY) - 1, maxY: Math.ceil(maxY) + 1 };
}

/**
 * Builds a sprite from boxes drawn in order (later boxes paint over earlier ones).
 * Returns { canvas, ax, ay }: draw at (screenX - ax, screenY - ay) where screenX/Y is the
 * projection of the sprite's world anchor (0,0,0 in box coordinates).
 */
export function boxSprite(boxes, opts = {}) {
  const bb = boxBounds(boxes);
  const pad = opts.outline ? 1 : 0;
  const buf = new PixBuf(bb.maxX - bb.minX + pad * 2, bb.maxY - bb.minY + pad * 2);
  const ox = -bb.minX + pad, oy = -bb.minY + pad;
  for (const b of boxes) rasterBox(buf, ox, oy, b.x, b.y, b.z, b.lx, b.ly, b.h, b.shade);
  if (opts.post) opts.post(buf, ox, oy);
  if (opts.outline) buf.outline(opts.outline);
  return { canvas: buf.toCanvas(), ax: ox, ay: oy, w: buf.w, h: buf.h };
}
