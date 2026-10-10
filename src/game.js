import { TUNING } from './config.js';
import { SpatialHash } from './engine/spatial.js';
import { Pool } from './engine/pool.js';
import { screenDirToWorld, toScreen } from './render/iso.js';
import { move, lineOfSight, FlowField, blocked } from './entities/physics.js';
import { Effects } from './entities/effects.js';
import { sfx, vibrate } from './audio/sfx.js';

const T = TUNING;
/** Screen-space speed of the leader (px/s). Vertical is a bit slower, which reads right in iso. */
const LEADER_PX = { x: 54, y: 42 };
export const faceFrom = (sx, sy) => Math.abs(sx) > Math.abs(sy) * 1.1 ? (sx > 0 ? 'E' : 'W') : (sy > 0 ? 'S' : 'N');

export function createGame(world, pal, zombieLooks) {
  const g = {
    world, effects: new Effects(pal), hash: new SpatialHash(2), flow: new FlowField(world),
    zombies: new Pool(T.maxZombies, () => ({ x: 0, y: 0, px: 0, py: 0, hp: 0, speed: 0, look: 0, face: 'S', anim: 0, flash: 0, kx: 0, ky: 0, dead: false, wob: 0 })),
    bullets: new Pool(240, () => ({ x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, z: 0.75, life: 0, dmg: 0 })),
    cam: { x: 0, y: 0, px: 0, py: 0 }, debug: { god: false, hitbox: false },
  };

  g.reset = () => {
    const [sx, sy] = world.spawn;
    g.leader = { x: sx, y: sy, px: sx, py: sy, hearts: T.hearts, invuln: 0, face: 'S', anim: 0, moving: false, fireT: 0.3, aimT: 0, muzzle: 0, flash: 0, step: 0 };
    g.zombies.clear(); g.bullets.clear(); g.effects.clear();
    g.time = 0; g.kills = 0; g.state = 'play'; g.shake = 0; g.hitstop = 0; g.flowT = 0; g.spawnT = 0; g.moved = false; g.hurtFlash = 0;
    const [cx, cy] = toScreen(sx, sy); g.cam.x = g.cam.px = cx; g.cam.y = g.cam.py = cy;
    for (let i = 0; i < T.testZombies; i++) spawnZombie(10, 22);
    g.flow.build(Math.floor(sx), Math.floor(sy));
  };

  function spawnZombie(minD, maxD) {
    const L = g.leader;
    for (let tries = 0; tries < 40; tries++) {
      const x = 0.5 + Math.floor(Math.random() * world.w), y = 0.5 + Math.floor(Math.random() * world.h);
      const d = Math.hypot(x - L.x, y - L.y);
      if (d < minD || d > maxD || blocked(world, x, y, T.walker.radius)) continue;
      const z = g.zombies.spawn(); if (!z) return;
      Object.assign(z, { x, y, px: x, py: y, hp: T.walker.hp, speed: T.walker.speed * (0.82 + Math.random() * 0.36), look: Math.floor(Math.random() * zombieLooks), face: 'S', anim: Math.random(), flash: 0, kx: 0, ky: 0, dead: false, wob: Math.random() * 6 });
      return z;
    }
    return null;
  }
  g.spawnZombie = spawnZombie;

  function hurtLeader(from) {
    const L = g.leader;
    if (L.invuln > 0 || g.debug.god || g.state !== 'play') return;
    L.hearts--; L.invuln = T.hurtInvuln; g.shake = 6; g.hurtFlash = 0.25;
    sfx.hurt(); vibrate(90);
    g.effects.blood(L.x, L.y, 6, 0.8);
    // Shove nearby zombies back so the player has a moment.
    g.hash.query(L.x, L.y, 1.6, z => { const dx = z.x - L.x, dy = z.y - L.y, d = Math.hypot(dx, dy) || 1; z.kx += dx / d * 5; z.ky += dy / d * 5; });
    if (L.hearts <= 0) { g.state = 'dead'; g.deadAt = g.time; g.shake = 9; sfx.die(); }
  }

  function killZombie(z) {
    z.dead = true; g.kills++;
    g.effects.blood(z.x, z.y, 12, 1.2);
    g.effects.corpse(z.x, z.y, z.look, z.face === 'W');
    g.shake = Math.max(g.shake, 1.6);
    sfx.die();
  }

  function fire(L, target) {
    const P = T.pistol;
    let dx = target.x - L.x, dy = target.y - L.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const a = (Math.random() - 0.5) * P.spread * 2, c = Math.cos(a), s = Math.sin(a);
    const vx = (dx * c - dy * s) * P.speed, vy = (dx * s + dy * c) * P.speed;
    const b = g.bullets.spawn(); if (!b) return;
    Object.assign(b, { x: L.x + dx * 0.3, y: L.y + dy * 0.3, px: L.x, py: L.y, vx, vy, z: 0.78, life: P.range / P.speed, dmg: P.damage });
    L.muzzle = 0.06; L.aimT = 0.35;
    const [sx, sy] = toScreen(dx, dy); L.face = faceFrom(sx, sy);
    sfx.shot();
    g.effects.casing(L.x, L.y, dx, dy);
    g.effects.smoke(L.x + dx * 0.45, L.y + dy * 0.45, 0.8, 1);
  }

  g.update = (dt, input) => {
    const L = g.leader, E = g.effects;
    g.cam.px = g.cam.x; g.cam.py = g.cam.y;
    L.px = L.x; L.py = L.y;
    for (let i = 0; i < g.zombies.count; i++) { const z = g.zombies.items[i]; z.px = z.x; z.py = z.y; }
    for (let i = 0; i < g.bullets.count; i++) { const b = g.bullets.items[i]; b.px = b.x; b.py = b.y; }
    g.shake = Math.max(0, g.shake - dt * 18);
    g.hurtFlash = Math.max(0, g.hurtFlash - dt);
    E.update(dt);
    if (g.state === 'dead') {
      g.time += dt;
      if (input.consumeTap() && g.time - g.deadAt > 0.8) g.reset();
      return;
    }
    input.consumeTap();
    if (g.hitstop > 0) { g.hitstop -= dt; return; }
    g.time += dt;

    // Leader movement: joystick direction is screen-space; convert to world.
    const m = input.move;
    L.moving = Math.hypot(m.x, m.y) > 0.05;
    if (L.moving) {
      g.moved = true;
      const [wx, wy] = screenDirToWorld(m.x * LEADER_PX.x, m.y * LEADER_PX.y);
      move(world, L, wx * dt, wy * dt, T.leaderRadius);
      L.anim += dt * (0.6 + Math.hypot(m.x, m.y) * 0.6);
      if (L.aimT <= 0) L.face = faceFrom(m.x, m.y);
      L.step -= dt; if (L.step <= 0) { L.step = 0.28; sfx.step(); }
    } else L.anim = 0;
    L.invuln = Math.max(0, L.invuln - dt); L.muzzle = Math.max(0, L.muzzle - dt); L.aimT = Math.max(0, L.aimT - dt);

    // Auto-fire at the nearest zombie in range with a clear line.
    L.fireT -= dt;
    if (L.fireT <= 0) {
      const target = g.hash.nearest(L.x, L.y, T.pistol.range, z => !z.dead && lineOfSight(world, L.x, L.y, z.x, z.y));
      if (target) { fire(L, target); L.fireT = 1 / T.pistol.rate; } else L.fireT = 0.05;
    }

    // Zombies: follow the flow field around obstacles, keep apart, shuffle at the leader.
    g.flowT -= dt;
    if (g.flowT <= 0) { g.flowT = 0.25; g.flow.build(Math.floor(L.x), Math.floor(L.y)); }
    const Z = g.zombies;
    for (let i = 0; i < Z.count; i++) {
      const z = Z.items[i];
      z.flash = Math.max(0, z.flash - dt);
      let dx = L.x - z.x, dy = L.y - z.y; const d = Math.hypot(dx, dy) || 1;
      let dir = d < 2 ? [dx / d, dy / d] : g.flow.dirAt(z.x, z.y) || [dx / d, dy / d];
      let sx = 0, sy = 0;
      g.hash.query(z.x, z.y, 0.55, o => { if (o === z) return; const ox = z.x - o.x, oy = z.y - o.y, od = Math.hypot(ox, oy); if (od > 0 && od < 0.5) { sx += ox / od * (0.5 - od); sy += oy / od * (0.5 - od); } });
      z.wob += dt * 2.3;
      const wob = Math.sin(z.wob) * 0.25;
      const vx = (dir[0] - dir[1] * wob) * z.speed + sx * 3 + z.kx, vy = (dir[1] + dir[0] * wob) * z.speed + sy * 3 + z.ky;
      move(world, z, vx * dt, vy * dt, T.walker.radius);
      z.kx *= Math.pow(0.02, dt); z.ky *= Math.pow(0.02, dt);
      const [fx, fy] = toScreen(vx, vy); if (Math.abs(fx) + Math.abs(fy) > 0.5) z.face = faceFrom(fx, fy);
      z.anim += dt * z.speed * 0.9;
      if (d < T.walker.contact) hurtLeader(z);
      if (Math.random() < dt * 0.012 && d < 9) sfx.groan();
    }
    g.hash.clear();
    for (let i = 0; i < Z.count; i++) g.hash.insert(Z.items[i]);

    // Bullets
    const B = g.bullets;
    for (let i = B.count - 1; i >= 0; i--) {
      const b = B.items[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (world.isTall(Math.floor(b.x), Math.floor(b.y))) { E.spark(b.x, b.y, b.z); B.kill(i); continue; }
      const hit = g.hash.nearest(b.x, b.y, 0.34, z => !z.dead);
      if (hit) {
        hit.hp -= b.dmg; hit.flash = 0.08;
        const s = Math.hypot(b.vx, b.vy); hit.kx += b.vx / s * 2.2; hit.ky += b.vy / s * 2.2;
        E.blood(hit.x, hit.y, 3, 0.7); E.number(hit.x, hit.y, b.dmg);
        sfx.hit();
        if (hit.hp <= 0) killZombie(hit);
        B.kill(i); continue;
      }
      if (b.life <= 0) B.kill(i);
    }
    for (let i = Z.count - 1; i >= 0; i--) if (Z.items[i].dead) Z.kill(i);

    // Keep the test map busy.
    g.spawnT -= dt;
    if (g.spawnT <= 0 && Z.count < T.testZombies) { g.spawnT = 0.5; spawnZombie(10, 24); }

    // Camera eases after the leader (screen space).
    const [lsx, lsy] = toScreen(L.x, L.y);
    g.cam.x += (lsx - g.cam.x) * Math.min(1, dt * 7);
    g.cam.y += (lsy - g.cam.y) * Math.min(1, dt * 7);
  };

  g.reset();
  return g;
}
