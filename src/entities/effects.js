import { Pool } from '../engine/pool.js';

/** Particles, ground decals (blood stays a while), corpses and floating damage numbers. Pooled. */
export class Effects {
  constructor(pal, sounds = {}) {
    this.pal = pal; this.sounds = sounds;
    this.parts = new Pool(700, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, color: '#fff', kind: 0, size: 1 }));
    this.decals = new Pool(2000, () => ({ x: 0, y: 0, color: '#000', life: 0, max: 1, size: 1 }));
    this.numbers = new Pool(80, () => ({ x: 0, y: 0, z: 0, val: '', life: 0, color: '#fff' }));
    this.corpses = new Pool(120, () => ({ x: 0, y: 0, sprite: null, life: 0, flip: false }));
    this.reduced = false; this.flash = null;
  }
  part(x, y, z, vx, vy, vz, life, color, kind, size = 1) {
    const p = this.parts.spawn(); if (!p) return;
    Object.assign(p, { x, y, z, vx, vy, vz, life, max: life, color, kind, size });
  }
  decal(x, y, color, life, size = 1) {
    let d = this.decals.spawn();
    if (!d) { d = this.decals.items[Math.floor(Math.random() * this.decals.count)]; }
    Object.assign(d, { x, y, color, life, max: life, size });
  }
  blood(x, y, n, power = 1) {
    if (this.reduced) n = Math.ceil(n / 2);
    const B = this.pal.blood;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (0.6 + Math.random() * 1.8) * power;
      this.part(x, y, 0.6 + Math.random() * 0.3, Math.cos(a) * s, Math.sin(a) * s, 1.5 + Math.random() * 2.5, 2, B[i % B.length], 1);
    }
    for (let i = 0; i < n; i++) this.decal(x + (Math.random() - 0.5) * 0.5, y + (Math.random() - 0.5) * 0.5, B[i % 2], 20 + Math.random() * 10, Math.random() < 0.3 ? 2 : 1);
  }
  casing(x, y, dx, dy) {
    this.part(x, y, 0.75, -dy * 1.6 + (Math.random() - 0.5), dx * 1.6 + (Math.random() - 0.5), 2.2, 1.5, '#e8c15a', 2);
  }
  smoke(x, y, z, n = 2) {
    if (this.reduced) return;
    for (let i = 0; i < n; i++) this.part(x, y, z, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, 0.5 + Math.random() * 0.4, 0.5 + Math.random() * 0.3, Math.random() < 0.5 ? '#d8d4cc' : '#b8b2a8', 3, 2);
  }
  sparkle(x, y) { for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; this.part(x, y, 0.6, Math.cos(a) * 1.6, Math.sin(a) * 1.6, 1.2 + Math.random(), 0.6, i % 2 ? '#f4d35e' : '#ffffff', 4); } }
  swing(x, y, dx, dy) { for (let i = -2; i <= 2; i++) { const a = Math.atan2(dy, dx) + i * 0.35; this.part(x + Math.cos(a) * 0.55, y + Math.sin(a) * 0.55, 0.6, 0, 0, 0, 0.12, '#ffffff', 4); } }
  heal(x, y) { for (let i = 0; i < 8; i++) this.part(x + (Math.random() - 0.5) * 0.5, y + (Math.random() - 0.5) * 0.5, 0.4, 0, 0, 1.2, 0.8, i % 2 ? '#9bd068' : '#ffffff', 4); }
  puff(x, y) { for (let i = 0; i < 8; i++) this.part(x, y, 0.5, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, 0.6, 0.7, i % 2 ? '#9bb38a' : '#6a8261', 3, 2); }
  dust(x, y, n) { if (this.reduced) n = Math.min(n, 1); for (let i = 0; i < n; i++) this.part(x + (Math.random() - 0.5) * 0.3, y + (Math.random() - 0.5) * 0.3, 0.1, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, 0.3, 0.4, '#d8cdb8', 3, 1); }
  burst(x, y, color, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2; this.part(x, y, 0.3, Math.cos(a) * 2, Math.sin(a) * 2, 2 + Math.random() * 2, 0.6, color, 4); } }
  flame(x, y, r) {
    if (Math.random() < (this.reduced ? 0.3 : 0.8)) {
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r;
      this.part(x + Math.cos(a) * d, y + Math.sin(a) * d, 0, 0, 0, 0.8 + Math.random() * 0.8, 0.45, ['#ffe680', '#ffb347', '#ff6a3d', '#e2384a'][Math.floor(Math.random() * 4)], 3, 1);
    }
  }
  scorch(x, y) { for (let i = 0; i < 30; i++) { const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * 0.9; this.decal(x + Math.cos(a) * d, y + Math.sin(a) * d, i % 3 ? '#2a2230' : '#4a3a3e', 12); } }
  explosion(x, y) {
    const n = this.reduced ? 18 : 46;
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 4; this.part(x, y, 0.4, Math.cos(a) * s, Math.sin(a) * s, 1 + Math.random() * 3, 0.5 + Math.random() * 0.3, ['#ffffff', '#ffe680', '#ffb347', '#ff6a3d'][i % 4], 4, i % 5 === 0 ? 2 : 1); }
    for (let i = 0; i < (this.reduced ? 4 : 14); i++) this.part(x + (Math.random() - 0.5), y + (Math.random() - 0.5), 0.6, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, 0.7 + Math.random() * 0.6, 1 + Math.random() * 0.8, i % 2 ? '#5a5260' : '#8a8290', 3, 2);
    this.scorch(x, y);
    this.flash = { x, y, t: 0.12 };
  }
  spark(x, y, z) { for (let i = 0; i < 4; i++) this.part(x, y, z, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, Math.random() * 2, 0.25, '#ffe680', 4); }
  number(x, y, val, color = '#ffffff') { const n = this.numbers.spawn(); if (n) Object.assign(n, { x, y, z: 1.6, val, life: 0.7, color }); }
  corpse(x, y, sprite, flip) { const c = this.corpses.spawn(); if (c) Object.assign(c, { x, y, sprite, life: 14, flip }); }

  update(dt) {
    const P = this.parts;
    for (let i = P.count - 1; i >= 0; i--) {
      const p = P.items[i];
      p.life -= dt;
      if (p.kind === 3) { p.z += p.vz * dt; p.x += p.vx * dt; p.y += p.vy * dt; }       // smoke drifts up
      else if (p.kind === 4) { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; }  // sparks
      else {
        p.vz -= 9.8 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.z <= 0) {
          if (p.kind === 2 && p.vz < -1) { p.z = 0; p.vz *= -0.35; p.vx *= 0.5; p.vy *= 0.5; if (Math.random() < 0.5) this.sounds.tink?.(); }   // casing bounce
          else { this.decal(p.x, p.y, p.color, p.kind === 1 ? 22 : 5); p.life = 0; }
        }
      }
      if (p.life <= 0) P.kill(i);
    }
    const D = this.decals;
    for (let i = D.count - 1; i >= 0; i--) { const d = D.items[i]; d.life -= dt; if (d.life <= 0) D.kill(i); }
    const N = this.numbers;
    for (let i = N.count - 1; i >= 0; i--) { const n = N.items[i]; n.life -= dt; n.z += dt * 1.6; if (n.life <= 0) N.kill(i); }
    if (this.flash) { this.flash.t -= dt; if (this.flash.t <= 0) this.flash = null; }
    const Cp = this.corpses;
    for (let i = Cp.count - 1; i >= 0; i--) { const c = Cp.items[i]; c.life -= dt; if (c.life <= 0) Cp.kill(i); }
  }
  clear() { this.parts.clear(); this.decals.clear(); this.numbers.clear(); this.corpses.clear(); }
}
