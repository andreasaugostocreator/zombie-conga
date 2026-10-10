/** Uniform spatial hash for fast neighbour and nearest-target queries (world units = tiles). */
export class SpatialHash {
  constructor(cell = 2) { this.cell = cell; this.map = new Map(); }
  clear() { this.map.clear(); }
  key(cx, cy) { return (cx + 4096) * 8192 + (cy + 4096); }
  insert(e) {
    const k = this.key(Math.floor(e.x / this.cell), Math.floor(e.y / this.cell));
    let b = this.map.get(k); if (!b) { b = []; this.map.set(k, b); } b.push(e);
  }
  /** Calls fn(e) for every entity in cells overlapping the circle (x, y, r). */
  query(x, y, r, fn) {
    const c = this.cell, x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c), y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const b = this.map.get(this.key(cx, cy)); if (!b) continue;
      for (let i = 0; i < b.length; i++) fn(b[i]);
    }
  }
  nearest(x, y, r, accept) {
    let best = null, bd = r * r;
    this.query(x, y, r, e => { const dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy; if (d < bd && (!accept || accept(e))) { bd = d; best = e; } });
    return best;
  }
}
