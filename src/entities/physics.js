/** Circle vs solid-tile collision with sliding. Positions in tiles. */
export function blocked(world, x, y, r) {
  for (let ty = Math.floor(y - r); ty <= Math.floor(y + r); ty++) for (let tx = Math.floor(x - r); tx <= Math.floor(x + r); tx++) {
    if (!world.isSolid(tx, ty)) continue;
    const cx = Math.max(tx, Math.min(x, tx + 1)), cy = Math.max(ty, Math.min(y, ty + 1));
    if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true;
  }
  return false;
}
export function move(world, e, dx, dy, r) {
  let hit = false;
  if (dx) { e.x += dx; if (blocked(world, e.x, e.y, r)) { e.x -= dx; hit = true; } }
  if (dy) { e.y += dy; if (blocked(world, e.x, e.y, r)) { e.y -= dy; hit = true; } }
  return hit;
}
/** True if a straight line between two points crosses no tall tile (buildings, trees). */
export function lineOfSight(world, x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 0.25);
  for (let i = 1; i < n; i++) { const t = i / n; if (world.isTall(Math.floor(x0 + (x1 - x0) * t), Math.floor(y0 + (y1 - y0) * t))) return false; }
  return true;
}

/** Breadth-first distance field from the leader's tile, so zombies walk around houses. */
export class FlowField {
  constructor(world) { this.world = world; this.dist = new Int16Array(world.w * world.h); this.queue = new Int32Array(world.w * world.h); }
  build(tx, ty) {
    const { w, h } = this.world, dist = this.dist, q = this.queue;
    dist.fill(-1);
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) return;
    let head = 0, tail = 0; dist[ty * w + tx] = 0; q[tail++] = ty * w + tx;
    while (head < tail) {
      const i = q[head++], x = i % w, y = (i / w) | 0, d = dist[i] + 1;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx; if (dist[j] !== -1 || this.world.solid[j]) continue;
        dist[j] = d; q[tail++] = j;
      }
    }
  }
  /** Direction (unit vector) from (x, y) towards the leader along the field, or null. */
  dirAt(x, y) {
    const { w, h } = this.world, tx = Math.floor(x), ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) return null;
    const here = this.dist[ty * w + tx];
    let best = null, bd = here < 0 ? 1e9 : here;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = tx + dx, ny = ty + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const d = this.dist[ny * w + nx];
      if (d < 0 || d >= bd) continue;
      if (dx && dy && (this.world.solid[ty * w + nx] || this.world.solid[ny * w + tx])) continue; // no corner cutting
      bd = d; best = [nx + 0.5 - x, ny + 0.5 - y];
    }
    if (!best) return null;
    const l = Math.hypot(best[0], best[1]) || 1;
    return [best[0] / l, best[1] / l];
  }
}
