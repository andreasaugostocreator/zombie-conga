/** Fixed-size object pool: no allocations during play. `items` holds live objects in [0, count). */
export class Pool {
  constructor(size, make) { this.items = Array.from({ length: size }, make); this.count = 0; }
  spawn() { if (this.count >= this.items.length) return null; return this.items[this.count++]; }
  /** Removes item i by swapping in the last live one. Iterate backwards when killing in a loop. */
  kill(i) { const last = --this.count; const t = this.items[i]; this.items[i] = this.items[last]; this.items[last] = t; }
  clear() { this.count = 0; }
}
