import * as S from '../render/sprites.js';
import { bakeGround, makeShadowMask } from '../render/ground.js';

/**
 * Turns a map definition into a playable world: solid/tall grids for collision and bullets,
 * static renderables (one per tile column, prop or tree) and the baked ground.
 * Static renderable: { key (depth), sprite, wx, wy, wz, tall, x0, y0, x1, y1 (footprint) }.
 */
export function buildWorld(def, pal) {
  const h = def.ground.length, w = def.ground[0].length;
  const world = { w, h, def, ground: def.ground.map(r => [...r]), roads: def.roads, statics: [], solid: new Uint8Array(w * h), tall: new Uint8Array(w * h) };
  const at = (x, y) => y * w + x;
  const block = (x0, y0, x1, y1, tall) => {
    for (let y = Math.floor(y0); y < Math.ceil(y1); y++) for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      world.solid[at(x, y)] = 1; if (tall) world.tall[at(x, y)] = 1;
    }
  };
  const casters = [];
  const add = (sprite, wx, wy, wz, key, foot, tall) => world.statics.push({ sprite, wx, wy, wz, key, tall, ...foot });
  const spriteCache = new Map();
  const cached = (k, make) => { if (!spriteCache.has(k)) spriteCache.set(k, make()); return spriteCache.get(k); };

  def.buildings.forEach((b, bi) => {
    for (let ty = b.y; ty < b.y + b.d; ty++) for (let tx = b.x; tx < b.x + b.w; tx++) {
      add(S.houseColumn(b, tx, ty, b.style, pal), tx, ty, 0, tx + ty + 1, { x0: tx, y0: ty, x1: tx + 1, y1: ty + 1 }, true);
    }
    block(b.x, b.y, b.x + b.w, b.y + b.d, true);
    casters.push({ x: b.x, y: b.y, lx: b.w, ly: b.d, h: b.h });
    world.buildings = world.buildings || []; world.buildings.push(b);
  });
  const roofZ = (x, y) => { const b = def.buildings.find(b => x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.d); return b ? b.h : 0; };

  def.objects.forEach((o, i) => {
    const [type, x, y] = o, tx = Math.floor(x), ty = Math.floor(y);
    const foot = { x0: tx, y0: ty, x1: tx + 1, y1: ty + 1 };
    switch (type) {
      case 'tree': add(cached('tree' + (i % 4), () => S.makeTree(pal, 31 + (i % 4) * 7)), tx + 0.5, ty + 0.5, 0, tx + ty + 1, foot, true); block(tx, ty, tx + 1, ty + 1, true); casters.push({ x: tx + 0.15, y: ty + 0.15, lx: 0.7, ly: 0.7, h: 3.2 }); break;
      case 'pine': add(cached('pine' + (i % 3), () => S.makePine(pal, 77 + (i % 3) * 5)), tx + 0.5, ty + 0.5, 0, tx + ty + 1, foot, true); block(tx, ty, tx + 1, ty + 1, true); casters.push({ x: tx + 0.25, y: ty + 0.25, lx: 0.5, ly: 0.5, h: 3.6 }); break;
      case 'hedge': add(cached('hedge' + (i % 3), () => S.makeHedge(pal, i % 3)), tx, ty, 0, tx + ty + 1, foot, false); block(tx, ty, tx + 1, ty + 1, false); casters.push({ x: tx, y: ty, lx: 1, ly: 1, h: 0.7 }); break;
      case 'fence': {
        const [, x0, y0, x1, y1] = o, axis = y0 === y1 ? 'x' : 'y';
        for (let fx = x0; fx <= x1; fx++) for (let fy = y0; fy <= y1; fy++) {
          add(cached('fence' + axis, () => S.makeFence(pal, axis)), fx, fy, 0, fx + fy + 1, { x0: fx, y0: fy, x1: fx + 1, y1: fy + 1 }, false);
          block(fx, fy, fx + 1, fy + 1, false);
        }
        break;
      }
      case 'car': {
        const axis = o[3], lx = axis === 'x' ? 1.9 : 0.86, ly = axis === 'x' ? 0.86 : 1.9;
        add(cached('car' + axis + o[4], () => S.makeCar(pal, o[4], axis)), x, y, 0, x + y + (lx + ly) / 2, { x0: x, y0: y, x1: x + lx, y1: y + ly }, false);
        block(x + 0.05, y + 0.05, x + lx - 0.05, y + ly - 0.05, false);
        casters.push({ x, y, lx, ly, h: 0.9 });
        break;
      }
      case 'lamp': add(cached('lamp', () => S.makeLamp(pal)), tx, ty, 0, tx + ty + 1, foot, true); break;
      case 'mailbox': add(cached('mail' + (i % 3), () => S.makeMailbox(i)), tx, ty, 0, tx + ty + 1, foot, false); break;
      case 'crate': add(cached('crate', () => S.makeCrate()), tx, ty, 0, tx + ty + 1, foot, false); block(tx, ty, tx + 1, ty + 1, false); casters.push({ x: tx + 0.12, y: ty + 0.12, lx: 0.76, ly: 0.76, h: 0.7 }); break;
      case 'bin': add(cached('bin', () => S.makeBin()), tx, ty, 0, tx + ty + 1, foot, false); block(tx + 0.2, ty + 0.2, tx + 0.8, ty + 0.8, false); break;
      case 'ac': case 'chimney': case 'antenna': {
        const make = { ac: () => S.makeAC(pal), chimney: () => S.makeChimney(), antenna: () => S.makeAntenna(pal) }[type];
        const off = { ac: [0.2, 0.25], chimney: [0.35, 0.3], antenna: [0.45, 0.45] }[type];
        add(cached(type, make), tx + off[0], ty + off[1], roofZ(tx, ty), tx + ty + 1.02, foot, true);
        break;
      }
    }
  });
  world.groundSprite = bakeGround({ w, h, ground: def.ground, roads: def.roads }, pal, makeShadowMask({ w, h }, casters));
  world.isSolid = (x, y) => x < 0 || y < 0 || x >= w || y >= h || world.solid[at(x, y)] === 1;
  world.isTall = (x, y) => x >= 0 && y >= 0 && x < w && y < h && world.tall[at(x, y)] === 1;
  world.spawn = def.spawn;
  return world;
}
