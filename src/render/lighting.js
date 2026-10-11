import { makeCanvas } from './screen.js';
import { toScreen } from './iso.js';

/**
 * Night levels: a dark layer with light pools punched out of it. Light edges are dithered in
 * pixel steps (solid core, checkerboard rim, sparse outer dots) instead of smooth gradients.
 */
const cache = new Map();
function lightSprite(r) {
  r = Math.max(4, Math.round(r));
  if (cache.has(r)) return cache.get(r);
  const w = r * 2 + 1, h = r + 1, [c, x] = makeCanvas(w, h);
  x.fillStyle = '#000';
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
    const dx = (xx - r) / r, dy = (y - h / 2) / (h / 2), d = Math.sqrt(dx * dx + dy * dy);
    const solid = d < 0.62, mid = d < 0.82 && (xx + y) % 2 === 0, outer = d < 1 && (xx % 2 === 0 && y % 2 === 0);
    if (solid || mid || outer) x.fillRect(xx, y, 1, 1);
  }
  cache.set(r, c);
  return c;
}

export function createLighting(screen) {
  let layer = null, lctx = null;
  return function drawNight(g, ox, oy, world, alpha, lights) {
    const W = screen.w, H = screen.h;
    if (!layer || layer.width !== W || layer.height !== H) { [layer, lctx] = makeCanvas(W, H); }
    lctx.globalCompositeOperation = 'source-over';
    lctx.clearRect(0, 0, W, H);
    lctx.fillStyle = 'rgba(10,8,30,0.8)'; lctx.fillRect(0, 0, W, H);
    lctx.globalCompositeOperation = 'destination-out';
    const punch = (wx, wy, r, lift = 0) => {
      const [sx, sy] = toScreen(wx, wy); const x = Math.round(ox + sx), y = Math.round(oy + sy - lift);
      if (x < -r * 2 || y < -r * 2 || x > W + r * 2 || y > H + r * 2) return;
      const s = lightSprite(r); lctx.drawImage(s, x - (s.width >> 1), y - (s.height >> 1));
    };
    for (const l of lights) punch(l.x, l.y, l.r, l.lift || 0);
    lctx.globalCompositeOperation = 'source-over';
    screen.ctx.drawImage(layer, 0, 0);
  };
}
