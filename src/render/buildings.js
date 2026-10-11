import { shadeHex } from './iso.js';
import { hash2 } from '../engine/rng.js';

const frac = v => v - Math.floor(v);
const STOREY = 1.5;

/**
 * Shader for a building column, in world coordinates so patterns line up across columns.
 * b: { x, y, w, d, h, style, kind, door }. kinds: house, shop, office, hospital, container, tent,
 * bunker, terminal, wall, hangar. S = the region's style entry (walls, roof, trim, glass, …).
 */
export function buildingShader(b, S, pal) {
  const W = S.wall, Rf = S.roof, kind = b.kind || 'house';
  const glass = S.glass || pal.glass[1];
  const lightGlass = shadeHex(glass, 0.35), darkGlass = shadeHex(glass, -0.35);
  return (face, wx, wy, z) => {
    if (face === 'top') {
      const inX = wx - b.x, inY = wy - b.y, edge = Math.min(inX, inY, b.x + b.w - wx, b.y + b.d - wy);
      if (kind === 'container') return frac((b.w >= b.d ? wx : wy) * 6) < 0.25 ? Rf[1] : Rf[0];
      if (kind === 'tent') return Math.abs((b.w >= b.d ? wy - b.y - b.d / 2 : wx - b.x - b.w / 2)) < 0.08 ? Rf[2] : (frac((b.w >= b.d ? wx : wy) * 2) < 0.06 ? Rf[1] : Rf[0]);
      if (edge < 0.09) return shadeHex(Rf[0], 0.18);
      if (edge < 0.16) return shadeHex(Rf[0], -0.12);
      if (kind === 'house') return frac(wy * 4) < 0.22 ? Rf[1] : (hash2(Math.floor(wx * 8), Math.floor(wy * 4), 7) < 0.08 ? shadeHex(Rf[0], 0.08) : Rf[0]);
      if (kind === 'hospital' && Math.abs(inX - b.w / 2) < 0.9 && Math.abs(inY - b.d / 2) < 0.9 && (Math.abs(inX - b.w / 2) < 0.28 || Math.abs(inY - b.d / 2) < 0.28)) return S.cross;   // helipad cross
      const n = hash2(Math.floor(wx * 8), Math.floor(wy * 8), 13);
      return n < 0.12 ? Rf[1] : n > 0.95 ? Rf[2] : Rf[0];                                   // gravel roof
    }
    const along = face === 'left' ? wx : wy, start = face === 'left' ? b.x : b.y, len = face === 'left' ? b.w : b.d;
    const lit = face === 'left';
    const base = lit ? W[1] : W[2], trim = shadeHex(S.trim || '#ffffff', lit ? -0.05 : -0.2);
    const u = frac(along), cornerDist = Math.min(along - start, start + len - along);
    const tile = [Math.floor(face === 'left' ? wx : b.x + b.w - 1), Math.floor(face === 'left' ? b.y + b.d - 1 : wy)];
    const isDoor = b.door && b.door[0] === tile[0] && b.door[1] === tile[1] && b.door[2] === face;
    switch (kind) {
      case 'container': {
        if (Math.abs(z - 1.1) < 0.05) return shadeHex(base, -0.3);
        return frac(along * 8) < 0.3 ? shadeHex(base, -0.15) : (z < 0.08 || z > b.h - 0.08 ? shadeHex(base, -0.25) : base);
      }
      case 'tent': return frac(along * 2) < 0.05 ? shadeHex(base, -0.2) : (isDoor && u > 0.3 && u < 0.7 && z < 0.8 ? '#2a2a20' : base);
      case 'bunker': {
        if (z > 0.55 && z < 0.72 && u > 0.2 && u < 0.8) return '#1c1424';
        return frac(z * 3) < 0.06 ? shadeHex(base, -0.12) : base;
      }
      case 'wall': return frac(z * 2) < 0.06 || frac(along) < 0.03 ? shadeHex(base, -0.1) : base;
    }
    if (z > b.h - 0.12) return shadeHex(Rf[0], lit ? -0.05 : -0.22);                     // roof edge band
    if (cornerDist < 0.07) return trim;
    if (z < 0.1) return shadeHex(base, -0.25);                                              // foundation
    if (kind === 'office' || kind === 'hospital' || kind === 'terminal' || kind === 'hangar') {
      if (isDoor && z < 0.9 && u > 0.25 && u < 0.75) return u < 0.3 || u > 0.7 || z > 0.84 ? trim : darkGlass;
      if (kind === 'hangar') return z < 1.6 && u > 0.08 && u < 0.92 && cornerDist > 0.5 ? (frac(z * 6) < 0.15 ? shadeHex(base, -0.3) : shadeHex(base, -0.15)) : (frac(along * 4) < 0.15 ? shadeHex(base, -0.1) : base);
      if (kind === 'terminal') { if (frac(along * 2) < 0.08 || frac(z * 1.25) < 0.08) return trim; return z % 1.6 > 1.1 ? lightGlass : glass; }
      if (kind === 'hospital' && z > b.h - 1 && Math.abs(along - (start + len / 2)) < 0.45) {
        const cxu = Math.abs(along - (start + len / 2)), cz = Math.abs(z - (b.h - 0.55));
        if ((cxu < 0.12 && cz < 0.32) || (cz < 0.12 && cxu < 0.32)) return S.cross;
        return '#ffffff';
      }
      const fu = frac(along * 2), fz = frac(z * 1.6);
      if (fu > 0.18 && fu < 0.82 && fz > 0.3 && fz < 0.82) return fz > 0.66 ? lightGlass : (lit ? glass : darkGlass);
      return frac(z * 1.6) < 0.08 ? shadeHex(base, -0.1) : base;
    }
    if (kind === 'shop') {
      if (z < 1.25) {                                                                     // storefront
        if (isDoor && u > 0.3 && u < 0.7) return u < 0.35 || u > 0.65 || z > 1.0 ? trim : darkGlass;
        if (u < 0.06 || u > 0.94 || z > 1.18 || z < 0.18) return trim;
        return z > 0.85 ? lightGlass : (hash2(Math.floor(along * 6), Math.floor(z * 6), 5) < 0.12 ? S.sign : glass);
      }
      if (z < 1.45) return frac(along * 4) < 0.5 ? S.awning[0] : S.awning[1];          // striped awning
      if (z > 1.6 && z < 2.05) return frac(along * 3) < 0.15 ? shadeHex(S.sign, 0.5) : S.sign;   // sign band
      return base;
    }
    // House
    const k = Math.floor(z / STOREY), zf = (z - k * STOREY) / STOREY;
    if (isDoor && k === 0 && u > 0.28 && u < 0.72 && zf < 0.72) {
      if (u < 0.33 || u > 0.67 || zf > 0.66) return trim;
      return (u > 0.58 && zf > 0.3 && zf < 0.38) ? '#f4c542' : (lit ? pal.door[0] : pal.door[1]);
    }
    if (!isDoor && u > 0.24 && u < 0.76 && zf > 0.3 && zf < 0.78) {
      if (u < 0.3 || u > 0.7 || zf < 0.36 || zf > 0.72) return shadeHex(S.trim, lit ? -0.04 : -0.18);
      if (Math.abs(u - 0.5) < 0.03) return shadeHex(S.trim, -0.1);
      return zf > 0.58 ? pal.glass[0] : zf > 0.5 && u < 0.45 ? pal.glass[0] : pal.glass[lit ? 1 : 2];
    }
    return frac(z * 4) < 0.14 ? shadeHex(base, -0.08) : base;
  };
}
