import { mulberry32 } from '../engine/rng.js';

/**
 * Seeded map generators, one per region. Each returns a map definition in the same hand-editable
 * format as maps/suburbs-test.js ({ ground, roads, buildings, objects, spawn }) plus objective
 * anchors: route (escort bus path), tower (defend), extract (rescue pick-up).
 * Building/object/ground codes are documented in maps/suburbs-test.js.
 */
export function generateMap(region, seed, size = 48) {
  const G = GENERATORS[region] || GENERATORS[0];
  const r = mulberry32(seed * 7919 + region * 104729);
  const m = makeCanvas(size, r);
  G(m, r);
  return m.finish();
}

function makeCanvas(N, r) {
  const g = Array.from({ length: N }, () => Array(N).fill('.'));
  const used = new Set(), objects = [], buildings = [], roads = [];
  const key = (x, y) => y * N + x;
  const m = {
    N, r, g, objects, buildings, roads,
    rand: (a, b) => a + Math.floor(r() * (b - a + 1)),
    pick: a => a[Math.floor(r() * a.length)],
    inside: (x, y) => x >= 0 && y >= 0 && x < N && y < N,
    rect(x0, y0, x1, y1, c) { for (let y = Math.max(0, y0); y <= Math.min(N - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(N - 1, x1); x++) g[y][x] = c; },
    free(x0, y0, x1, y1) { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (!m.inside(x, y) || used.has(key(x, y)) || g[y][x] === 'w') return false; return true; },
    take(x0, y0, x1, y1) { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) used.add(key(x, y)); },
    reserve(x0, y0, x1, y1) { m.take(x0, y0, x1 + 1, y1 + 1); },
    obj(type, x, y, ...rest) { if (!m.free(Math.floor(x), Math.floor(y), Math.floor(x) + 1, Math.floor(y) + 1)) return false; objects.push([type, x, y, ...rest]); m.take(Math.floor(x), Math.floor(y), Math.floor(x) + 1, Math.floor(y) + 1); return true; },
    objAny(type, x, y, ...rest) { objects.push([type, x, y, ...rest]); },
    building(b) { if (!m.free(b.x, b.y, b.x + b.w, b.y + b.d)) return false; buildings.push(b); m.take(b.x, b.y, b.x + b.w, b.y + b.d); return true; },
    /** A two-lane road with sidewalks; returns its centre line. */
    road(axis, at, half = 1, kind = 'road', walk = ':') {
      for (let i = 0; i < N; i++) for (let k = -half; k < half; k++) { const [x, y] = axis === 'x' ? [i, at + k] : [at + k, i]; if (m.inside(x, y)) g[y][x] = kind === 'runway' ? 'R' : 'r'; }
      if (walk) for (let i = 0; i < N; i++) for (const k of [-half - 1, half]) { const [x, y] = axis === 'x' ? [i, at + k] : [at + k, i]; if (m.inside(x, y) && g[y][x] !== 'r' && g[y][x] !== 'R') g[y][x] = walk; }
      roads.push({ axis, center: at, half, kind });
    },
    scatter(type, n, ok = () => true, ...rest) {
      for (let i = 0, tries = 0; i < n && tries < n * 40; tries++) { const x = m.rand(1, N - 2), y = m.rand(1, N - 2); if (ok(g[y][x], x, y) && m.obj(type, x, y, ...rest)) i++; }
    },
    finish() {
      // Pines around the island edge make every map read as a little diorama.
      for (let i = 0; i < N; i += 2) for (const [x, y] of [[i, 0], [0, i], [N - 1, i], [i, N - 1]]) if ('.ls'.includes(g[y][x]) && r() < 0.5) m.obj(m.edgeTree || 'pine', x, y);
      return { ground: g.map(row => row.join('')), roads, buildings, objects, spawn: m.spawn, route: m.route, tower: m.tower, extract: m.extract, mines: m.mines || [], size: N };
    },
  };
  return m;
}

/** Shared skeleton: a start clearing in the middle, a long road along x for the escort bus, a pick-up corner. */
function anchors(m, roadRow) {
  const N = m.N, c = Math.floor(N / 2);
  m.spawn = [c + 0.5, roadRow + 0.5];
  m.route = [[1, roadRow], [N - 2, roadRow]];
  m.tower = [c - 4 + 0.5, roadRow - 4 + 0.5];
  m.reserve(c - 6, roadRow - 6, c - 2, roadRow - 2);
  m.extract = [N - 6 + 0.5, N - 6 + 0.5];
  m.reserve(N - 8, N - 8, N - 4, N - 4);
  m.reserve(c - 2, roadRow - 2, c + 2, roadRow + 2);
}

const GENERATORS = [
  /* 0 Suburbs: streets of houses with lawns, picket fences and trees. */
  (m, r) => {
    const N = m.N, roadsAt = [Math.floor(N / 3), Math.floor(2 * N / 3)];
    for (const at of roadsAt) { m.road('x', at); m.road('y', at); }
    anchors(m, roadsAt[0]);
    const blocks = [[1, roadsAt[0] - 3], [roadsAt[0] + 2, roadsAt[1] - 3], [roadsAt[1] + 2, N - 2]];
    for (const [bx0, bx1] of blocks) for (const [by0, by1] of blocks) {
      m.rect(bx0, by0, bx1, by1, 'l');
      for (let lx = bx0 + 1; lx + 4 <= bx1; lx += 6) for (let ly = by0 + 1; ly + 4 <= by1; ly += 6) {
        if (r() < 0.2) { for (let k = 0; k < 3; k++) m.obj(r() < 0.6 ? 'tree' : 'pine', m.rand(lx, lx + 4), m.rand(ly, ly + 4)); continue; }
        const w = m.rand(3, 4), d = m.rand(3, 4), h = m.pick([3, 3, 1.5]);
        const b = { x: lx, y: ly, w, d, h, style: m.rand(0, 3), door: [lx + m.rand(0, w - 1), ly + d - 1, 'left'] };
        if (m.building(b)) { m.objAny(m.pick(['ac', 'chimney', 'antenna']), lx + m.rand(0, w - 1), ly + m.rand(0, d - 1)); if (r() < 0.5) m.rect(lx, ly + d, lx + w - 1, ly + d, 'b'); m.obj('tree', lx + w, ly + m.rand(0, d - 1)); }
      }
      if (by1 < N - 3) { let run = null; for (let x = bx0; x <= bx1 + 1; x++) { const ok = x <= bx1 && m.free(x, by1, x + 1, by1 + 1) && (x - bx0) % 6 !== 3; if (ok && run === null) run = x; if (!ok && run !== null) { m.objects.push(['fence', run, by1, x - 1, by1]); m.take(run, by1, x, by1 + 1); run = null; } } }
      m.scatter('mailbox', 1, (c, x, y) => x >= bx0 && x <= bx1 && y >= by0 && y <= by1); m.scatter('bin', 1, (c, x, y) => x >= bx0 && x <= bx1 && y >= by0 && y <= by1);
    }
    carsAndLamps(m, r, [0, 1, 2, 3]);
  },
  /* 1 Mall: one big indoor hall, shops round the edge, escalators, kiosks and a fountain. */
  (m, r) => {
    const N = m.N;
    m.rect(0, 0, N - 1, N - 1, 'f');
    const row = Math.floor(N / 2) + 4;
    m.rect(0, row - 1, N - 1, row, ':');
    anchors(m, row);
    m.route = [[1, row - 0.5], [N - 2, row - 0.5]];
    m.roads.push({ axis: 'x', center: row, half: 0, kind: 'none' });
    // Outer wall with entrances
    for (let i = 0; i < N; i++) for (const [x, y] of [[i, 0], [0, i]]) if (i % 12 < 9) m.building({ x, y, w: 1, d: 1, h: 2.4, style: 0, kind: 'wall' });
    // Shops along the top and left edges (their fronts face the hall)
    for (let x = 2; x + 4 < N - 2; x += 6) { const w = m.rand(4, 5); m.building({ x, y: 2, w, d: 4, h: 2.6, style: m.rand(0, 3), kind: 'shop', door: [x + m.rand(1, w - 2), 5, 'left'] }); }
    for (let y = 8; y + 4 < N - 2; y += 6) { const d = m.rand(4, 5); if (Math.abs(y - row) < 6) continue; m.building({ x: 2, y, w: 4, d, h: 2.6, style: m.rand(0, 3), kind: 'shop', door: [5, y + m.rand(1, d - 2), 'right'] }); }
    // Island shops in the middle
    for (let x = 12; x + 4 < N - 6; x += 10) for (let y = 12; y + 4 < N - 6; y += 10) { if (Math.abs(y + 2 - row) < 5) continue; m.building({ x, y, w: m.rand(3, 5), d: m.rand(3, 4), h: 2.6, style: m.rand(0, 3), kind: 'shop', door: [x + 1, y + 2, 'left'] }); }
    m.objects.push(['fountain', Math.floor(N / 2) + 4, row - 6]); m.take(Math.floor(N / 2) + 4, row - 6, Math.floor(N / 2) + 6, row - 4);
    for (let i = 0; i < 4; i++) { const x = m.rand(8, N - 8), y = m.rand(8, N - 10); if (m.free(x, y, x + 1, y + 2)) { m.objects.push(['escalator', x, y]); m.take(x, y, x + 1, y + 2); } }
    m.scatter('kiosk', 5, c => c === 'f'); m.scatter('plant', 14, c => c === 'f'); m.scatter('bench', 10, c => c === 'f'); m.scatter('cart', 14, () => true); m.scatter('barrel', 8, c => c === 'f');
    m.edgeTree = 'plant';
  },
  /* 2 Hospital: a campus with wards, a car park full of ambulances and a triage area. */
  (m, r) => {
    const N = m.N, row = Math.floor(N / 2);
    m.rect(1, 1, N - 2, N - 2, 'l');
    m.road('x', row); m.road('y', Math.floor(N / 4));
    anchors(m, row);
    m.building({ x: Math.floor(N / 2) - 2, y: 4, w: 9, d: 7, h: 4.5, style: 0, kind: 'hospital', door: [Math.floor(N / 2) + 1, 10, 'left'] });
    m.building({ x: Math.floor(N / 2) + 9, y: 5, w: 5, d: 5, h: 3, style: 1, kind: 'hospital', door: [Math.floor(N / 2) + 10, 9, 'left'] });
    m.building({ x: 4, y: row + 6, w: 7, d: 6, h: 3.5, style: 1, kind: 'hospital', door: [7, row + 11, 'left'] });
    m.building({ x: N - 14, y: row + 8, w: 8, d: 5, h: 4, style: 0, kind: 'hospital', door: [N - 10, row + 12, 'left'] });
    // Car park
    const px = Math.floor(N / 4) + 3, py = row + 3;
    m.rect(px, py, px + 10, py + 6, 'c');
    for (let i = 0; i < 5; i++) { const x = px + i * 2, y = py + 1; if (m.free(x, y, x + 1, y + 2)) { m.objects.push(r() < 0.5 ? ['van', x + 0.07, y, 'y', 'ambulance'] : ['car', x + 0.07, y, 'y', m.rand(0, 3)]); m.take(x, y, x + 1, y + 2); } }
    // Triage area with beds and wheelchairs
    const tx = 6, ty = 6; m.rect(tx, ty, tx + 8, ty + 6, 't');
    for (let i = 0; i < 8; i++) m.obj(r() < 0.6 ? 'bed' : 'wheelchair', m.rand(tx, tx + 8), m.rand(ty, ty + 6));
    m.scatter('cabinet', 6, c => c === 't' || c === 'l'); m.scatter('tree', 16, c => c === 'l'); m.scatter('bench', 6, c => c === 'l'); m.scatter('barrel', 10, c => c === 'l');
    for (let i = 4; i < N; i += 7) { m.obj('lamp', i, row - 2); m.obj('lamp', i, row + 1); }
  },
  /* 3 Downtown: tall office blocks, a traffic jam, bus stops. */
  (m, r) => {
    const N = m.N, step = 14, roadsAt = [];
    for (let at = 10; at < N - 4; at += step) roadsAt.push(at);
    m.rect(0, 0, N - 1, N - 1, ':');
    for (const at of roadsAt) { m.road('x', at, 1, 'road', ':'); m.road('y', at, 1, 'road', ':'); }
    anchors(m, roadsAt[1] || roadsAt[0]);
    const edges = [0, ...roadsAt.map(a => a + 2), N];
    for (let i = 0; i + 1 < edges.length; i++) for (let j = 0; j + 1 < edges.length; j++) {
      const bx0 = edges[i] + 1, bx1 = (roadsAt[i] ?? N) - 3, by0 = edges[j] + 1, by1 = (roadsAt[j] ?? N) - 3;
      if (bx1 - bx0 < 3 || by1 - by0 < 3) continue;
      if (r() < 0.15) { m.rect(bx0, by0, bx1, by1, 'l'); m.scatter('tree', 4, (c, x, y) => x >= bx0 && x <= bx1 && y >= by0 && y <= by1); m.scatter('bench', 2, (c, x, y) => x >= bx0 && x <= bx1 && y >= by0 && y <= by1); continue; }
      for (let x = bx0; x + 2 <= bx1; x += 5) for (let y = by0; y + 2 <= by1; y += 5) {
        const w = Math.min(m.rand(3, 4), bx1 - x + 1), d = Math.min(m.rand(3, 4), by1 - y + 1), h = m.pick([4, 5, 5.5, 6.5, 7]);
        if (m.building({ x, y, w, d, h, style: m.rand(0, 3), kind: 'office', door: [x + m.rand(0, w - 1), y + d - 1, 'left'] }) && r() < 0.7) m.objAny(m.pick(['ac', 'antenna', 'ac']), x + m.rand(0, w - 1), y + m.rand(0, d - 1));
      }
    }
    // Traffic jam
    for (const rd of m.roads) for (let i = 2; i < N - 3; i += m.rand(2, 4)) {
      if (r() < 0.45) continue;
      const lane = rd.center - (r() < 0.5 ? 1 : 0);
      const [x, y] = rd.axis === 'x' ? [i + 0.05, lane + 0.08] : [lane + 0.08, i + 0.05];
      if (m.free(Math.floor(x), Math.floor(y), Math.floor(x) + (rd.axis === 'x' ? 2 : 1), Math.floor(y) + (rd.axis === 'x' ? 1 : 2)) && Math.abs(i - m.spawn[0]) > 4) {
        m.objects.push(r() < 0.15 ? ['van', x, y, rd.axis, 'bus'] : ['car', x, y, rd.axis, m.rand(0, 3)]);
        m.take(Math.floor(x), Math.floor(y), Math.floor(x) + (rd.axis === 'x' ? 2 : 1), Math.floor(y) + (rd.axis === 'x' ? 1 : 2));
      }
    }
    m.scatter('hydrant', 10, c => c === ':'); m.scatter('busstop', 5, c => c === ':'); m.scatter('bin', 10, c => c === ':'); m.scatter('barrel', 12, c => c === ':');
    for (const at of roadsAt) for (let i = 3; i < N; i += 7) { m.obj('lamp', i, at - 2); m.obj('lamp', at + 1, i); }
    m.edgeTree = 'tree';
  },
  /* 4 Harbor: water along one side, piers, container stacks, warehouses and cranes. */
  (m, r) => {
    const N = m.N, shore = 9;
    m.rect(0, 0, N - 1, N - 1, 'c');
    m.rect(0, 0, shore - 1, N - 1, 'w');
    for (let y = 4; y < N - 4; y += 9) m.rect(2, y, shore - 1, y + 2, 'p');                // piers
    m.rect(shore, 0, shore + 1, N - 1, 'p');                                                  // quay
    const row = Math.floor(N / 2);
    m.road('x', row, 1, 'road', null); m.road('y', shore + 5, 1, 'road', null);
    anchors(m, row);
    m.route = [[shore + 3, row], [N - 2, row]];
    for (let y = 2; y < N - 2; y += 6) { m.obj('crane', shore, y); m.obj('bollard', shore + 1, y + 3); }
    for (let y = 4; y < N - 4; y += 9) { if (r() < 0.8) { m.objects.push(['boat', 3, y + 0.05]); } }
    // Container yard: stacks in neat rows
    for (let y = 3; y < N - 4; y += 4) for (let x = shore + 9; x < N - 6; x += 5) {
      if (Math.abs(y - row) < 3 || r() < 0.2) continue;
      const len = m.rand(2, 3), h = r() < 0.5 ? 2.2 : 1.1;
      m.building({ x, y, w: len, d: 1, h, style: m.rand(0, 4), kind: 'container' });
      if (r() < 0.5) m.building({ x, y: y + 1, w: len, d: 1, h: r() < 0.5 ? 2.2 : 1.1, style: m.rand(0, 4), kind: 'container' });
    }
    m.building({ x: N - 12, y: 3, w: 8, d: 6, h: 3, style: 4, kind: 'hangar', door: [N - 9, 8, 'left'] });
    m.scatter('crate', 18, c => c === 'c' || c === 'p'); m.scatter('barrel', 14, c => c === 'c' || c === 'p'); m.scatter('bollard', 6, c => c === 'p');
    m.edgeTree = null;
  },
  /* 5 Military base: sand, sandbags, tents, bunkers, watchtowers and a minefield. */
  (m, r) => {
    const N = m.N, row = Math.floor(N / 2);
    m.rect(0, 0, N - 1, N - 1, 's');
    m.road('x', row, 1, 'road', null); m.road('y', Math.floor(N / 2) + 6, 1, 'road', null);
    anchors(m, row);
    for (let i = 0; i < 9; i++) { const x = m.rand(3, N - 8), y = m.rand(3, N - 6); m.building({ x, y, w: m.rand(3, 4), d: m.rand(2, 3), h: 1.3, style: 0, kind: 'tent', door: [x + 1, y + 1, 'left'] }); }
    for (let i = 0; i < 4; i++) { const x = m.rand(3, N - 8), y = m.rand(3, N - 6); m.building({ x, y, w: 4, d: 3, h: 1.4, style: 1, kind: 'bunker' }); }
    for (let i = 0; i < 6; i++) m.obj('watchtower', m.rand(2, N - 3), m.rand(2, N - 3));
    // Sandbag walls
    for (let i = 0; i < 10; i++) { const x = m.rand(3, N - 8), y = m.rand(3, N - 8), len = m.rand(3, 6), horiz = r() < 0.5; for (let k = 0; k < len; k++) m.obj('sandbags', horiz ? x + k : x, horiz ? y : y + k); }
    // Barbed wire around the edge
    for (let i = 2; i < N - 2; i++) { if (i % 9 < 2) continue; m.obj('wire', i, 2, 'x'); m.obj('wire', i, N - 3, 'x'); }
    for (let i = 0; i < 5; i++) m.obj('van', m.rand(4, N - 6) + 0.05, m.rand(4, N - 6) + 0.05, 'x', 'jeep');
    m.scatter('barrel', 20, c => c === 's'); m.scatter('crate', 14, c => c === 's');
    // Mines: hidden in the sand away from the start.
    m.mines = [];
    for (let i = 0; i < 18; i++) { const x = m.rand(3, N - 4), y = m.rand(3, N - 4); if (Math.hypot(x - m.spawn[0], y - m.spawn[1]) > 8 && m.free(x, y, x + 1, y + 1) && m.g[y][x] === 's') m.mines.push([x + 0.5, y + 0.5]); }
    m.edgeTree = 'pine';
  },
  /* 6 Airport: a runway, taxiway, terminal, parked planes and hangars. */
  (m, r) => {
    const N = m.N, run = N - 12;
    m.rect(1, 1, N - 2, N - 2, '.');
    m.road('x', run, 3, 'runway', null);
    m.rect(0, 14, N - 1, run - 5, 'c');                                                       // apron
    const row = Math.floor((14 + run - 5) / 2);
    m.road('x', row, 1, 'road', null);
    anchors(m, row);
    m.building({ x: 4, y: 3, w: N - 14, d: 5, h: 3.2, style: 0, kind: 'terminal', door: [Math.floor(N / 2), 7, 'left'] });
    m.building({ x: N - 9, y: 2, w: 6, d: 7, h: 3.5, style: 1, kind: 'hangar', door: [N - 6, 8, 'left'] });
    for (let i = 0; i < 3; i++) { const x = 5 + i * 13, y = 16; if (x + 7 < N) { m.objects.push(['plane', x, y + 1.6]); m.take(x, y, x + 7, y + 5); } }
    m.scatter('luggage', 12, c => c === 'c'); m.scatter('cone', 24, c => c === 'c' || c === 'R'); m.scatter('barrel', 10, c => c === 'c');
    for (let i = 3; i < N; i += 6) m.obj('lamp', i, 12);
    m.edgeTree = 'tree';
  },
];

function carsAndLamps(m, r, colors) {
  const N = m.N;
  for (const rd of m.roads) for (let i = 2; i < N - 3; i += 7) {
    if (r() < 0.5) continue;
    const [x, y] = rd.axis === 'x' ? [i + 0.05, rd.center - 1 + 0.08] : [rd.center + 0.08, i + 0.05];
    if (Math.hypot(x - m.spawn[0], y - m.spawn[1]) < 5) continue;
    if (m.free(Math.floor(x), Math.floor(y), Math.floor(x) + (rd.axis === 'x' ? 2 : 1), Math.floor(y) + (rd.axis === 'x' ? 1 : 2))) { m.objects.push(['car', x, y, rd.axis, m.pick(colors)]); m.take(Math.floor(x), Math.floor(y), Math.floor(x) + (rd.axis === 'x' ? 2 : 1), Math.floor(y) + (rd.axis === 'x' ? 1 : 2)); }
  }
  for (const rd of m.roads) for (let i = 4; i < N; i += 8) { if (rd.axis === 'x') m.obj('lamp', i, rd.center + 1 + rd.half - 1); else m.obj('lamp', rd.center - rd.half - 1, i); }
  m.scatter('barrel', 14, c => c === 'l' || c === '.');
}
