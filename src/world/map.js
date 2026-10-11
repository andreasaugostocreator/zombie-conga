import * as S from '../render/sprites.js';
import * as P from '../render/props.js';
import { boxSprite } from '../render/iso.js';
import { buildingShader } from '../render/buildings.js';
import { bakeGround, makeShadowMask } from '../render/ground.js';

/**
 * Turns a map definition into a playable world: solid/tall grids for collision and bullets,
 * static renderables (one per building tile column, prop or tree) and the baked ground.
 * Static renderable: { key (depth), sprite, wx, wy, wz, tall, x0, y0, x1, y1 (footprint) }.
 */
export function buildWorld(def, pal) {
  const h = def.ground.length, w = def.ground[0].length;
  const world = { w, h, def, pal, ground: def.ground.map(r => [...r]), roads: def.roads, statics: [], solid: new Uint8Array(w * h), tall: new Uint8Array(w * h), barrels: [], buildings: [] };
  const at = (x, y) => y * w + x;
  const block = (x0, y0, x1, y1, tall) => {
    for (let y = Math.floor(y0); y < Math.ceil(y1); y++) for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      world.solid[at(x, y)] = 1; if (tall) world.tall[at(x, y)] = 1;
    }
  };
  // Water can't be walked on (bullets still fly over it).
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (def.ground[y][x] === 'w') world.solid[at(x, y)] = 1;
  const casters = [];
  const add = (sprite, wx, wy, wz, key, foot, tall) => world.statics.push({ sprite, wx, wy, wz, key, tall, ...foot });
  const spriteCache = new Map();
  const cached = (k, make) => { if (!spriteCache.has(k)) spriteCache.set(k, make()); return spriteCache.get(k); };
  const houses = pal.houses;

  for (const b of def.buildings) {
    const style = houses[b.style % houses.length];
    const shade = buildingShader(b, style, pal);
    for (let ty = b.y; ty < b.y + b.d; ty++) for (let tx = b.x; tx < b.x + b.w; tx++) {
      const spr = boxSprite([{ x: 0, y: 0, z: 0, lx: 1, ly: 1, h: b.h, shade: (f, wx, wy, z) => shade(f, wx + tx, wy + ty, z) }]);
      add(spr, tx, ty, 0, tx + ty + 1, { x0: tx, y0: ty, x1: tx + 1, y1: ty + 1 }, b.h > 1.2);
    }
    block(b.x, b.y, b.x + b.w, b.y + b.d, b.h > 1.2);
    casters.push({ x: b.x, y: b.y, lx: b.w, ly: b.d, h: b.h });
    world.buildings.push(b);
  }
  const roofZ = (x, y) => { const b = def.buildings.find(b => x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.d); return b ? b.h : 0; };

  // Simple props: [sprite factory, solid?, tall?, shadow height]
  const SIMPLE = {
    lamp: [() => S.makeLamp(pal), false, true, 0], mailbox: [() => S.makeMailbox(1), false, false, 0], crate: [() => S.makeCrate(), true, false, 0.7],
    bin: [() => S.makeBin(), true, false, 0], cart: [() => P.makeCart(), false, false, 0], bench: [() => P.makeBench(), true, false, 0],
    plant: [() => P.makePlant(3), true, false, 0.6], kiosk: [() => P.makeKiosk(), true, true, 1], bed: [() => P.makeBed(), true, false, 0],
    wheelchair: [() => P.makeWheelchair(), false, false, 0], cabinet: [() => P.makeCabinet(), true, false, 0.8], hydrant: [() => P.makeHydrant(), false, false, 0],
    busstop: [() => P.makeBusStop(), false, true, 0], sandbags: [() => P.makeSandbags(), true, false, 0.5], watchtower: [() => P.makeWatchtower(), true, true, 3],
    crane: [() => P.makeCrane(), true, true, 4], bollard: [() => P.makeBollard(), true, false, 0], luggage: [() => P.makeLuggageCart(), true, false, 0],
    cone: [() => P.makeCone(), false, false, 0],
  };
  const VANS = { ambulance: [['#f2efe6', '#d6d2c6', '#aea99c'], '#e2384a'], bus: [['#f2b632', '#d39a22', '#a87818'], '#2a2230'], jeep: [['#6c7a45', '#5a6639', '#46502c'], null] };

  def.objects.forEach((o, i) => {
    const [type, x, y] = o, tx = Math.floor(x), ty = Math.floor(y);
    const foot = { x0: tx, y0: ty, x1: tx + 1, y1: ty + 1 };
    if (type === 'lamp') (world.lights = world.lights || []).push([tx + 0.5, ty + 0.5]);
    if (SIMPLE[type]) {
      const [make, solid, tall, sh] = SIMPLE[type];
      add(cached(type, make), tx, ty, 0, tx + ty + 1, foot, tall);
      if (solid) block(tx + 0.15, ty + 0.15, tx + 0.85, ty + 0.85, tall);
      if (sh) casters.push({ x: tx + 0.2, y: ty + 0.2, lx: 0.6, ly: 0.6, h: sh });
      return;
    }
    switch (type) {
      case 'tree': add(cached('tree' + (i % 4), () => S.makeTree(pal, 31 + (i % 4) * 7)), tx + 0.5, ty + 0.5, 0, tx + ty + 1, foot, true); block(tx, ty, tx + 1, ty + 1, true); casters.push({ x: tx + 0.15, y: ty + 0.15, lx: 0.7, ly: 0.7, h: 3.2 }); break;
      case 'pine': add(cached('pine' + (i % 3), () => S.makePine(pal, 77 + (i % 3) * 5)), tx + 0.5, ty + 0.5, 0, tx + ty + 1, foot, true); block(tx, ty, tx + 1, ty + 1, true); casters.push({ x: tx + 0.25, y: ty + 0.25, lx: 0.5, ly: 0.5, h: 3.6 }); break;
      case 'hedge': add(cached('hedge' + (i % 3), () => S.makeHedge(pal, i % 3)), tx, ty, 0, tx + ty + 1, foot, false); block(tx, ty, tx + 1, ty + 1, false); casters.push({ x: tx, y: ty, lx: 1, ly: 1, h: 0.7 }); break;
      case 'fence': case 'wire': {
        let x0, y0, x1, y1, axis;
        if (type === 'fence') { [, x0, y0, x1, y1] = o; axis = y0 === y1 ? 'x' : 'y'; } else { x0 = x1 = tx; y0 = y1 = ty; axis = o[3]; }
        for (let fx = x0; fx <= x1; fx++) for (let fy = y0; fy <= y1; fy++) {
          add(cached(type + axis, () => type === 'fence' ? S.makeFence(pal, axis) : P.makeBarbedWire(axis)), fx, fy, 0, fx + fy + 1, { x0: fx, y0: fy, x1: fx + 1, y1: fy + 1 }, false);
          block(fx, fy, fx + 1, fy + 1, false);
        }
        break;
      }
      case 'car': case 'van': {
        const axis = o[3], long = type === 'van' && o[4] === 'bus' ? 2.6 : 1.9, lx = axis === 'x' ? long : 0.86, ly = axis === 'x' ? 0.86 : long;
        const spr = type === 'car' ? cached('car' + axis + o[4], () => S.makeCar(pal, o[4] % pal.car.length, axis))
          : cached('van' + axis + o[4], () => P.makeVan(VANS[o[4]][0], axis, long, VANS[o[4]][1], o[4] === 'jeep' ? 0.5 : 0.75));
        add(spr, x, y, 0, x + y + (lx + ly) / 2, { x0: x, y0: y, x1: x + lx, y1: y + ly }, false);
        block(x + 0.05, y + 0.05, x + lx - 0.05, y + ly - 0.05, false);
        casters.push({ x, y, lx, ly, h: 0.9 });
        break;
      }
      case 'fountain': add(cached('fountain', () => P.makeFountain()), tx, ty, 0, tx + ty + 2, { x0: tx, y0: ty, x1: tx + 2, y1: ty + 2 }, false); block(tx, ty, tx + 2, ty + 2, false); break;
      case 'escalator': add(cached('escalator', () => P.makeEscalator()), tx, ty, 0, tx + ty + 1.5, { x0: tx, y0: ty, x1: tx + 1, y1: ty + 2 }, false); block(tx, ty, tx + 1, ty + 2, false); break;
      case 'boat': add(cached('boat', () => P.makeBoat()), x, y, 0, x + y + 1.8, { x0: tx, y0: ty, x1: tx + 3, y1: ty + 1 }, false); break;
      case 'plane': add(cached('plane', () => P.makePlane()), tx, ty, 0, tx + ty + 3.6, { x0: tx, y0: ty - 2, x1: tx + 6, y1: ty + 3 }, true); block(tx, ty + 0.2, tx + 6, ty + 1.3, true); block(tx + 2.4, ty - 1.6, tx + 3.8, ty + 2.8, false); break;
      case 'barrel': world.barrels.push([tx, ty]); break;
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
  world.isGrass = (x, y) => { const c = def.ground[Math.floor(y)]?.[Math.floor(x)]; return c === '.' || c === 'l'; };
  world.lights = world.lights || []; world.spawn = def.spawn; world.route = def.route; world.tower = def.tower; world.extract = def.extract; world.mines = def.mines || [];
  return world;
}
