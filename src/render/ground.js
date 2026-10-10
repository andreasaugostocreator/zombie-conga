import { PixBuf, rasterBox, shadeHex } from './iso.js';
import { hash2 } from '../engine/rng.js';

const frac = v => v - Math.floor(v);

/**
 * Bakes the whole map's ground into one canvas: a floating diorama slab whose top is the
 * ground (lawns, roads, sidewalks…) with static shadows, and whose sides are layered dirt.
 * Returns { canvas, ax, ay } like a box sprite (anchor = world origin).
 */
export function bakeGround(map, pal, shadowMask) {
  const W = map.w, H = map.h, DEPTH = 0.9;
  const ground = (wx, wy) => {
    const tx = Math.floor(wx), ty = Math.floor(wy);
    const t = map.ground[ty]?.[tx] ?? '.';
    const fx = frac(wx), fy = frac(wy);
    const n = hash2(Math.floor(wx * 8), Math.floor(wy * 8), 3), n2 = hash2(Math.floor(wx * 4), Math.floor(wy * 4), 9);
    let c;
    switch (t) {
      case 'r': {
        c = n < 0.18 ? pal.road[1] : n > 0.9 ? pal.road[2] : pal.road[0];
        for (const rd of map.roads) {
          const along = rd.axis === 'x' ? wx : wy, across = rd.axis === 'x' ? wy : wx;
          const crossing = map.roads.some(o => o !== rd && Math.abs((o.axis === 'x' ? wy : wx) - o.center) < o.half);
          if (!crossing && Math.abs(across - rd.center) < 0.07 && frac(along * 0.75) < 0.5) c = pal.roadLine;
          if (Math.abs(Math.abs(across - rd.center) - rd.half) < 0.07 && !crossing) c = shadeHex(pal.road[0], 0.12);
        }
        break;
      }
      case ':': c = (fx < 0.07 || fy < 0.07 || Math.abs(fx - 0.5) < 0.035) ? pal.walkSeam : (n < 0.25 ? pal.walk[1] : pal.walk[0]); break;
      case 'd': c = (Math.abs(fx - 0.5) < 0.03 && n2 < 0.5) ? pal.walkSeam : (n < 0.3 ? pal.drive[1] : pal.drive[0]); break;
      case 'l': c = (Math.floor((wx + wy) * 1.5) % 2 === 0) ? pal.lawn[0] : pal.lawn[1]; if (n > 0.96) c = pal.tuft; break;
      case 'b': c = n < 0.55 ? pal.dirt[1] : n < 0.7 ? pal.dirt[0] : pal.flower[Math.floor(n2 * 3)]; break;
      case 'o': c = n < 0.3 ? pal.dirt[1] : n > 0.92 ? pal.stone : pal.dirt[0]; break;
      default: {
        c = n < 0.22 ? pal.grass[1] : n < 0.3 ? pal.grass[2] : n > 0.93 ? pal.grass[3] : pal.grass[0];
        if (n2 > 0.97) c = pal.flower[Math.floor(hash2(tx, ty, 5) * 3)];
        else if (n2 < 0.05) c = pal.tuft;
      }
    }
    // Static shadows (cast to the lower right; light comes from the top-left).
    if (shadowMask && shadowMask(wx, wy)) c = shadeHex(c, -0.28);
    // Soft curb where sidewalk meets road.
    return c;
  };
  const side = (face, z, a) => {
    if (z > DEPTH - 0.14) return face === 'left' ? shadeHex(pal.grass[0], -0.12) : shadeHex(pal.grass[0], -0.32);
    const layer = z > DEPTH * 0.5 ? 0 : z > DEPTH * 0.22 ? 1 : 2;
    const n = hash2(Math.floor(a * 9), Math.floor(z * 9), 11);
    let c = pal.dirt[layer];
    if (n > 0.9) c = pal.stone;
    return face === 'left' ? c : shadeHex(c, -0.25);
  };
  const [x0] = [-H * 8], w = (W + H) * 8 + 4, h = (W + H) * 4 + DEPTH * 8 + 4;
  const buf = new PixBuf(Math.ceil(w), Math.ceil(h));
  const ox = H * 8 + 2, oy = 2;
  // The slab: top at z = 0, sides hanging down to -DEPTH.
  rasterBox(buf, ox, oy, 0, 0, -DEPTH, W, H, DEPTH, (face, wx, wy, z) => face === 'top' ? ground(wx, wy) : side(face, z + DEPTH, face === 'left' ? wx : wy));
  return { canvas: buf.toCanvas(), ax: ox, ay: oy, x0 };
}

/** Shadow mask from footprints of tall things, swept towards +x (screen lower-right). */
export function makeShadowMask(map, casters) {
  const R = 8, W = map.w * R, H = map.h * R, m = new Uint8Array(W * H);
  for (const c of casters) {
    const len = Math.min(2.2, c.h * 0.55);
    for (let s = 0; s <= len; s += 1 / R) {
      const x0 = Math.floor((c.x + s) * R), x1 = Math.ceil((c.x + c.lx + s) * R), y0 = Math.floor((c.y + s * 0.35) * R), y1 = Math.ceil((c.y + c.ly + s * 0.35) * R);
      for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) m[y * W + x] = 1;
    }
  }
  return (wx, wy) => { const x = Math.floor(wx * R), y = Math.floor(wy * R); return x >= 0 && y >= 0 && x < W && y < H && m[y * W + x] === 1; };
}
