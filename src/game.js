import { TUNING } from './config.js';
import { SpatialHash } from './engine/spatial.js';
import { Pool } from './engine/pool.js';
import { screenDirToWorld, toScreen } from './render/iso.js';
import { move, lineOfSight, FlowField, blocked } from './entities/physics.js';
import { Effects } from './entities/effects.js';
import { sfx, vibrate } from './audio/sfx.js';

const T = TUNING;
/** Screen-space speed of the leader (px/s). Vertical is a bit slower, which reads right in iso. */
const LEADER_PX = { x: 46, y: 36 };
export const faceFrom = (sx, sy) => Math.abs(sx) > Math.abs(sy) * 1.1 ? (sx > 0 ? 'E' : 'W') : (sy > 0 ? 'S' : 'N');

/** Survivor classes you can rescue. Each one fires on its own. */
export const CLASSES = {
  cop: { label: 'COP', color: '#7fa6ff', range: 5.2, rate: 2.2, dmg: 2, pellets: 1, spread: 0.05, speed: 15, kind: 0 },
  farmer: { label: 'FARMER', color: '#ff8a6a', range: 3.4, rate: 0.85, dmg: 1.6, pellets: 5, spread: 0.32, speed: 13, kind: 1 },
  chef: { label: 'CHEF', color: '#ffffff', range: 4.6, rate: 1.25, dmg: 2.6, pellets: 1, spread: 0.02, speed: 8, kind: 2, pierce: 2 },
  grandma: { label: 'GRANDMA', color: '#d7a6ff', melee: true, range: 1.15, rate: 1.2, dmg: 3, knock: 8 },
  nurse: { label: 'NURSE', color: '#ffb3c6', heal: true },
};
const CLASS_ODDS = [['cop', 0.25], ['farmer', 0.2], ['chef', 0.2], ['grandma', 0.2], ['nurse', 0.15]];
const pickClass = () => { let r = Math.random(); for (const [c, p] of CLASS_ODDS) { if ((r -= p) <= 0) return c; } return 'cop'; };

/** Level-up cards. Each stacks up to level 5 (radar: 1). */
export const UPGRADES = [
  { id: 'rate', name: 'RAPID FIRE', desc: ['EVERYONE SHOOTS', '15% FASTER'], icon: 'rate' },
  { id: 'damage', name: 'HOLLOW POINTS', desc: ['+25% DAMAGE', 'FOR THE WHOLE LINE'], icon: 'damage' },
  { id: 'pierce', name: 'PIERCING', desc: ['SHOTS GO THROUGH', 'ONE MORE ZOMBIE'], icon: 'pierce' },
  { id: 'speed', name: 'SNEAKERS', desc: ['LEADER MOVES', '10% FASTER'], icon: 'speed' },
  { id: 'magnet', name: 'MAGNET', desc: ['GRAB BRAINS FROM', 'FARTHER AWAY'], icon: 'magnet' },
  { id: 'heart', name: 'FIRST AID', desc: ['+1 HEART', '(UP TO 5)'], icon: 'heart' },
  { id: 'tough', name: 'TOUGH SKIN', desc: ['SURVIVORS SHRUG', 'OFF ONE BITE'], icon: 'tough' },
  { id: 'saw', name: 'CHAINSAW', desc: ['A SAW BLADE', 'CIRCLES YOU'], icon: 'saw' },
  { id: 'molotov', name: 'MOLOTOV', desc: ['THE LINE DROPS', 'FIRE BOMBS'], icon: 'molotov' },
  { id: 'radar', name: 'RESCUE RADAR', desc: ['ARROW TO THE', 'NEAREST SURVIVOR'], icon: 'radar', max: 1 },
];

const SPACING = 0.62, MAX_LINE = 20, MAX_HEARTS = 5;

export function createGame(world, pal, zombieLooks) {
  const g = {
    world, effects: new Effects(pal, { tink: () => sfx.tink() }), hash: new SpatialHash(2), flow: new FlowField(world),
    zombies: new Pool(T.maxZombies, () => ({ x: 0, y: 0, px: 0, py: 0, hp: 0, speed: 0, look: 0, face: 'S', anim: 0, flash: 0, kx: 0, ky: 0, dead: false, wob: 0, sawT: 0, wx: 0, wy: 0 })),
    bullets: new Pool(400, () => ({ x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, z: 0.75, life: 0, dmg: 0, kind: 0, pierce: 0, last: null, spin: 0 })),
    brains: new Pool(300, () => ({ x: 0, y: 0, px: 0, py: 0, z: 0, vx: 0, vy: 0, vz: 0, mag: false, t: 0 })),
    cam: { x: 0, y: 0, px: 0, py: 0 }, debug: { god: false, hitbox: false }, settings: { shake: 1 }, state: 'title',
  };
  const fx = () => g.effects;

  /* ---------------- setup ---------------- */
  g.reset = (state = 'play') => {
    let [sx, sy] = world.spawn;
    for (let r = 0; r < 8 && blocked(world, sx, sy, T.leaderRadius); r += 0.5)
      for (let a = 0; a < 8; a++) { const x = world.spawn[0] + Math.cos(a * Math.PI / 4) * r, y = world.spawn[1] + Math.sin(a * Math.PI / 4) * r; if (!blocked(world, x, y, T.leaderRadius)) { sx = x; sy = y; break; } }
    g.leader = { x: sx, y: sy, px: sx, py: sy, hearts: T.hearts, invuln: 0, face: 'S', anim: 0, moving: false, fireT: 0.3, aimT: 0, muzzle: 0, step: 0, dashT: 0, dashCd: 0, dx: 0, dy: 1, ddx: 0, ddy: 0 };
    g.zombies.clear(); g.bullets.clear(); g.brains.clear(); g.effects.clear();
    g.line = []; g.others = []; g.path = [{ x: sx, y: sy }];
    g.fires = []; g.sawAngle = 0; g.molotovT = 4;
    g.up = Object.fromEntries(UPGRADES.map(u => [u.id, 0]));
    g.xp = 0; g.level = 1; g.xpNeed = 6; g.cards = null; g.pickStreak = 0; g.lastPick = -9;
    g.time = 0; g.kills = 0; g.rescued = 0; g.bestLine = 0; g.state = state; g.shake = 0; g.hitstop = 0; g.flowT = 0; g.spawnT = 0; g.rescueT = 0;
    g.moved = false; g.hurtFlash = 0; g.combo = 0; g.lastKill = -9; g.titleT = 0;
    // Barrels come back each run.
    for (const b of g.barrels || []) world.solid[Math.floor(b.y) * world.w + Math.floor(b.x)] = 0;
    g.barrels = (world.barrels || []).map(([x, y]) => ({ x: x + 0.5, y: y + 0.5, hp: 3, alive: true, flash: 0 }));
    for (const b of g.barrels) world.solid[Math.floor(b.y) * world.w + Math.floor(b.x)] = 1;
    const [cx, cy] = toScreen(sx, sy); g.cam.x = g.cam.px = cx; g.cam.y = g.cam.py = cy;
    for (let i = 0; i < T.testZombies; i++) spawnZombie(8, 30);
    for (let i = 0; i < 6; i++) spawnSurvivor(4, 26);
    g.flow.build(Math.floor(sx), Math.floor(sy));
  };

  function offscreen(x, y) {
    if (!g.view) return true;
    const L = g.leader, [sx, sy] = toScreen(x - L.x, y - L.y);
    return Math.abs(sx) > g.view.w / 2 + 12 || Math.abs(sy) > g.view.h / 2 + 20;
  }
  function freeSpot(minD, maxD, needOffscreen) {
    const L = g.leader;
    for (let tries = 0; tries < 120; tries++) {
      const x = 0.5 + Math.floor(Math.random() * world.w), y = 0.5 + Math.floor(Math.random() * world.h);
      const d = Math.hypot(x - L.x, y - L.y);
      if (d < minD || d > maxD || blocked(world, x, y, 0.3)) continue;
      if (needOffscreen && !offscreen(x, y)) continue;
      return [x, y];
    }
    return null;
  }
  function spawnZombie(minD, maxD, at) {
    const p = at || freeSpot(minD, maxD, true); if (!p) return null;
    const z = g.zombies.spawn(); if (!z) return null;
    Object.assign(z, { x: p[0], y: p[1], px: p[0], py: p[1], hp: T.walker.hp, speed: T.walker.speed * (0.82 + Math.random() * 0.36), look: Math.floor(Math.random() * zombieLooks), face: 'S', anim: Math.random(), flash: 0, kx: 0, ky: 0, dead: false, wob: Math.random() * 6, sawT: 0, wx: Math.random() - 0.5, wy: Math.random() - 0.5 });
    return z;
  }
  function spawnSurvivor(minD, maxD) {
    const p = freeSpot(minD, maxD, false); if (!p) return;
    g.others.push(makeSurvivor(pickClass(), p[0], p[1], 'stranded'));
  }
  function makeSurvivor(cls, x, y, state) {
    return { cls, x, y, px: x, py: y, state, t: 0, face: 'S', anim: 0, fireT: Math.random(), tough: g.up?.tough || 0, flash: 0, swing: 0, muzzle: 0, aimT: 0, bob: Math.random() * 6, healT: 0 };
  }
  g.spawnZombie = spawnZombie;

  /* ---------------- conga path ---------------- */
  function recordPath(L) {
    const last = g.path[g.path.length - 1];
    if (Math.hypot(L.x - last.x, L.y - last.y) >= 0.06) { g.path.push({ x: L.x, y: L.y }); if (g.path.length > 600) g.path.splice(0, 100); }
  }
  /** The point `dist` tiles back along the leader's trail. */
  function pathPoint(dist) {
    const L = g.leader; let px = L.x, py = L.y, acc = 0;
    for (let i = g.path.length - 1; i >= 0; i--) {
      const p = g.path[i], seg = Math.hypot(px - p.x, py - p.y);
      if (acc + seg >= dist && seg > 0) { const t = (dist - acc) / seg; return [px + (p.x - px) * t, py + (p.y - py) * t]; }
      acc += seg; px = p.x; py = p.y;
    }
    return [px, py];
  }

  /* ---------------- damage and events ---------------- */
  const shake = v => { g.shake = Math.max(g.shake, v * g.settings.shake); };
  function hurtLeader() {
    const L = g.leader;
    if (L.invuln > 0 || g.debug.god || g.state !== 'play') return;
    L.hearts--; L.invuln = T.hurtInvuln; shake(6); g.hurtFlash = 0.25;
    sfx.hurt(); vibrate(90);
    fx().blood(L.x, L.y, 6, 0.8);
    g.hash.query(L.x, L.y, 1.6, z => { const dx = z.x - L.x, dy = z.y - L.y, d = Math.hypot(dx, dy) || 1; z.kx += dx / d * 5; z.ky += dy / d * 5; });
    if (L.hearts <= 0) { g.state = 'dead'; g.deadAt = g.time; shake(9); sfx.die(); g.onDeath && g.onDeath(); }
  }
  function damageZombie(z, dmg, kx, ky, quiet) {
    if (z.dead) return;
    z.hp -= dmg; z.flash = 0.08; z.kx += kx; z.ky += ky;
    if (!quiet) { fx().blood(z.x, z.y, 2, 0.6); fx().number(z.x, z.y, Math.max(1, Math.round(dmg))); }
    if (z.hp <= 0) killZombie(z);
  }
  function killZombie(z) {
    z.dead = true; g.kills++;
    fx().blood(z.x, z.y, 12, 1.2);
    fx().corpse(z.x, z.y, z.look, z.face === 'W');
    shake(1.6);
    g.combo = g.time - g.lastKill < 1.4 ? g.combo + 1 : 1; g.lastKill = g.time;
    sfx.kill(g.combo);
    const b = g.brains.spawn();
    if (b) Object.assign(b, { x: z.x, y: z.y, px: z.x, py: z.y, z: 0.3, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, vz: 2.5, mag: false, t: 0 });
  }
  /** A zombie reaches someone in the conga line. */
  function bite(i, z) {
    const f = g.line[i];
    if (f.tough > 0) { f.tough--; f.flash = 0.15; z.kx -= (f.x - z.x) * 8; z.ky -= (f.y - z.y) * 8; sfx.block(); return; }
    f.state = 'turning'; f.t = 0.9;
    const behind = g.line.splice(i);
    behind.shift();
    g.others.push(f);
    for (const b of behind) { b.state = 'panic'; b.t = 3; g.others.push(b); }
    fx().blood(f.x, f.y, 10, 1); shake(4); sfx.bite(); vibrate(60);
    fx().number(f.x, f.y, 'BITTEN!', '#e2384a');
  }
  function explode(b) {
    if (!b.alive) return;
    b.alive = false; world.solid[Math.floor(b.y) * world.w + Math.floor(b.x)] = 0;
    const R = 2.1, L = g.leader;
    g.hash.query(b.x, b.y, R, z => { const dx = z.x - b.x, dy = z.y - b.y, d = Math.hypot(dx, dy); if (d < R) damageZombie(z, 14 * (1 - d / R * 0.4), dx / (d || 1) * 9, dy / (d || 1) * 9, true); });
    if (Math.hypot(L.x - b.x, L.y - b.y) < 1.4) hurtLeader();
    for (let i = g.line.length - 1; i >= 0; i--) {
      const f = g.line[i];
      if (Math.hypot(f.x - b.x, f.y - b.y) < 1.1) { const out = g.line.splice(i); for (const o of out) { o.state = 'panic'; o.t = 3; g.others.push(o); } }
    }
    fx().explosion(b.x, b.y); shake(9); g.hitstop = 0.05; sfx.explode(); vibrate(120);
    for (const o of g.barrels) if (o.alive && Math.hypot(o.x - b.x, o.y - b.y) < R) setTimeout(() => explode(o), 120);
  }
  function join(s) {
    if (g.line.length >= MAX_LINE) return;
    s.state = 'line'; s.tough = Math.max(s.tough, g.up.tough);
    g.others.splice(g.others.indexOf(s), 1);
    g.line.push(s); g.rescued++; g.bestLine = Math.max(g.bestLine, g.line.length);
    fx().number(s.x, s.y, CLASSES[s.cls].label + '!', CLASSES[s.cls].color);
    fx().sparkle(s.x, s.y); sfx.join(g.line.length);
  }

  /* ---------------- weapons ---------------- */
  const rateMul = () => 1 + 0.15 * g.up.rate, dmgMul = () => 1 + 0.25 * g.up.damage;
  function shoot(from, target, w) {
    let dx = target.x - from.x, dy = target.y - from.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    for (let p = 0; p < w.pellets; p++) {
      const a = (Math.random() - 0.5) * w.spread * (w.pellets > 1 ? 0.6 : 2) + (w.pellets > 1 ? (p / (w.pellets - 1) - 0.5) * w.spread * 2 : 0), c = Math.cos(a), s = Math.sin(a);
      const b = g.bullets.spawn(); if (!b) return;
      const sp = w.speed * (w.pellets > 1 ? 0.85 + Math.random() * 0.3 : 1);
      Object.assign(b, { x: from.x + dx * 0.3, y: from.y + dy * 0.3, px: from.x, py: from.y, vx: (dx * c - dy * s) * sp, vy: (dx * s + dy * c) * sp, z: 0.78, life: w.range / w.speed * 1.05, dmg: w.dmg * dmgMul(), kind: w.kind, pierce: (w.pierce || 0) + g.up.pierce, last: null, spin: 0 });
    }
    from.muzzle = 0.06; from.aimT = 0.35;
    const [sx, sy] = toScreen(dx, dy); from.face = faceFrom(sx, sy);
    if (w.kind === 0) { sfx.shot(); fx().casing(from.x, from.y, dx, dy); fx().smoke(from.x + dx * 0.45, from.y + dy * 0.45, 0.8, 1); }
    else if (w.kind === 1) { sfx.shotgun(); fx().casing(from.x, from.y, dx, dy); fx().smoke(from.x + dx * 0.5, from.y + dy * 0.5, 0.8, 3); }
    else sfx.throw();
  }
  const canSee = (a, z) => !z.dead && lineOfSight(world, a.x, a.y, z.x, z.y);
  function followerAct(f, dt) {
    const C = CLASSES[f.cls];
    if (C.heal) {
      // Nurse: patches up the leader now and then, and toughens the survivor in front of her.
      f.healT += dt;
      if (f.healT > 20) {
        f.healT = 0; const L = g.leader;
        if (L.hearts < MAX_HEARTS) { L.hearts++; fx().heal(L.x, L.y); fx().number(L.x, L.y, '+1', '#9bd068'); sfx.heal(); }
        const i = g.line.indexOf(f); if (i > 0 && g.line[i - 1].tough < 1) { g.line[i - 1].tough = 1; fx().heal(g.line[i - 1].x, g.line[i - 1].y); }
      }
      return;
    }
    f.fireT -= dt * rateMul();
    if (f.fireT > 0) return;
    const target = g.hash.nearest(f.x, f.y, C.range, z => canSee(f, z));
    if (!target) { f.fireT = 0.1; return; }
    f.fireT = 1 / C.rate;
    if (C.melee) {
      const dx = target.x - f.x, dy = target.y - f.y, d = Math.hypot(dx, dy) || 1;
      damageZombie(target, C.dmg * dmgMul(), dx / d * C.knock, dy / d * C.knock);
      f.swing = 0.2; fx().swing(f.x, f.y, dx / d, dy / d); sfx.pan();
      const [sx, sy] = toScreen(dx, dy); f.face = faceFrom(sx, sy); f.aimT = 0.3;
    } else shoot(f, target, C);
  }

  /* ---------------- update ---------------- */
  g.update = (dt, input) => {
    const L = g.leader, E = g.effects;
    g.cam.px = g.cam.x; g.cam.py = g.cam.y;
    L.px = L.x; L.py = L.y;
    for (let i = 0; i < g.zombies.count; i++) { const z = g.zombies.items[i]; z.px = z.x; z.py = z.y; }
    for (let i = 0; i < g.bullets.count; i++) { const b = g.bullets.items[i]; b.px = b.x; b.py = b.y; }
    for (let i = 0; i < g.brains.count; i++) { const b = g.brains.items[i]; b.px = b.x; b.py = b.y; }
    for (const s of g.line) { s.px = s.x; s.py = s.y; }
    for (const s of g.others) { s.px = s.x; s.py = s.y; }
    if (g.state === 'paused' || g.state === 'levelup') return;
    g.shake = Math.max(0, g.shake - dt * 18);
    g.hurtFlash = Math.max(0, g.hurtFlash - dt);
    E.update(dt);
    if (g.state === 'title') return titleUpdate(dt);
    if (g.state === 'dead') { g.time += dt; return; }
    if (g.hitstop > 0) { g.hitstop -= dt; return; }
    g.time += dt;

    // Leader: joystick (screen space) → world; dash on request.
    const m = input.move;
    L.moving = Math.hypot(m.x, m.y) > 0.05;
    L.dashCd = Math.max(0, L.dashCd - dt);
    if (L.moving) { const l = Math.hypot(m.x, m.y); L.dx = m.x / l; L.dy = m.y / l; }
    if (input.takeDash() && L.dashCd <= 0) {
      const [sx, sy] = L.moving ? [L.dx, L.dy] : ({ E: [1, 0.5], W: [-1, -0.5], S: [-1, 0.5], N: [1, -0.5] }[L.face]);
      L.dashT = 0.18; L.dashCd = 2.2; L.invuln = Math.max(L.invuln, 0.25);
      const [wx, wy] = screenDirToWorld(sx, sy), l = Math.hypot(wx, wy) || 1; L.ddx = wx / l; L.ddy = wy / l;
      sfx.dash(); E.dust(L.x, L.y, 6);
    }
    if (L.dashT > 0) {
      L.dashT -= dt; move(world, L, L.ddx * 13 * dt, L.ddy * 13 * dt, T.leaderRadius); E.dust(L.x, L.y, 1); g.moved = true; L.anim += dt * 2;
    } else if (L.moving) {
      g.moved = true;
      const sp = 1 + 0.1 * g.up.speed;
      const [wx, wy] = screenDirToWorld(m.x * LEADER_PX.x * sp, m.y * LEADER_PX.y * sp);
      move(world, L, wx * dt, wy * dt, T.leaderRadius);
      L.anim += dt * (0.6 + Math.hypot(m.x, m.y) * 0.6);
      if (L.aimT <= 0) L.face = faceFrom(m.x, m.y);
      L.step -= dt; if (L.step <= 0) { L.step = 0.28; sfx.step(); }
    } else L.anim = 0;
    recordPath(L);
    L.invuln = Math.max(0, L.invuln - dt); L.muzzle = Math.max(0, L.muzzle - dt); L.aimT = Math.max(0, L.aimT - dt);

    // Leader's pistol.
    L.fireT -= dt * rateMul();
    if (L.fireT <= 0) {
      const target = g.hash.nearest(L.x, L.y, T.pistol.range, z => canSee(L, z));
      if (target) { shoot(L, target, { ...T.pistol, dmg: T.pistol.damage, pellets: 1, kind: 0 }); L.fireT = 1 / T.pistol.rate; } else L.fireT = 0.05;
    }

    // Conga line: each survivor walks to their spot on the leader's trail and fights.
    g.line.forEach((f, i) => {
      const [tx, ty] = pathPoint(SPACING * (i + 1));
      const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy);
      if (d > 0.01) {
        const step = d > 0.8 ? Math.min(d, 7 * dt) : d * Math.min(1, dt * 16);
        f.x += dx / d * step; f.y += dy / d * step;
        if (f.aimT <= 0 && d > 0.02) { const [sx, sy] = toScreen(dx, dy); f.face = faceFrom(sx, sy); }
        f.anim += step * 2.4;
      }
      f.muzzle = Math.max(0, f.muzzle - dt); f.aimT = Math.max(0, f.aimT - dt); f.flash = Math.max(0, f.flash - dt); f.swing = Math.max(0, f.swing - dt);
      followerAct(f, dt);
    });
    // Survivors not in the line: waiting for rescue, panicking, fleeing or turning.
    for (let i = g.others.length - 1; i >= 0; i--) {
      const s = g.others[i];
      s.t -= dt; s.bob += dt * 6; s.flash = Math.max(0, s.flash - dt);
      if (s.state === 'turning') {
        if (s.t <= 0) { g.others.splice(i, 1); const z = spawnZombie(0, 0, [s.x, s.y]); if (z) z.flash = 0.2; E.puff(s.x, s.y); sfx.groan(); }
        continue;
      }
      if (s.state === 'panic' && s.t <= 0) { s.state = 'flee'; s.t = 1.6; }
      if (s.state === 'flee') {
        if (s.t <= 0) s.state = 'stranded';
        else {
          const z = g.hash.nearest(s.x, s.y, 6); const dx = s.x - (z ? z.x : L.x), dy = s.y - (z ? z.y : L.y), d = Math.hypot(dx, dy) || 1;
          move(world, s, dx / d * 2.4 * dt, dy / d * 2.4 * dt, 0.22); const [sx, sy] = toScreen(dx, dy); s.face = faceFrom(sx, sy); s.anim += dt * 1.2;
        }
      }
      if (Math.hypot(s.x - L.x, s.y - L.y) < 0.7) join(s);
    }
    // Keep a few people to rescue around the map.
    g.rescueT -= dt;
    if (g.rescueT <= 0) { g.rescueT = 6; if (g.others.filter(s => s.state === 'stranded').length < 5) spawnSurvivor(8, 30); }

    // Zombies: chase the nearest person close by, otherwise follow the flow field to the leader.
    g.flowT -= dt;
    if (g.flowT <= 0) { g.flowT = 0.25; g.flow.build(Math.floor(L.x), Math.floor(L.y)); }
    const Z = g.zombies;
    for (let i = 0; i < Z.count; i++) {
      const z = Z.items[i];
      z.flash = Math.max(0, z.flash - dt); z.sawT = Math.max(0, z.sawT - dt);
      let tx = L.x, ty = L.y, best = Math.hypot(L.x - z.x, L.y - z.y);
      for (const f of g.line) { const d = Math.hypot(f.x - z.x, f.y - z.y); if (d < best && d < 2.2) { best = d; tx = f.x; ty = f.y; } }
      const dx = tx - z.x, dy = ty - z.y, d = Math.hypot(dx, dy) || 1;
      const dir = d < 2.2 ? [dx / d, dy / d] : g.flow.dirAt(z.x, z.y) || [dx / d, dy / d];
      let sx = 0, sy = 0;
      g.hash.query(z.x, z.y, 0.55, o => { if (o === z) return; const ox = z.x - o.x, oy = z.y - o.y, od = Math.hypot(ox, oy); if (od > 0 && od < 0.5) { sx += ox / od * (0.5 - od); sy += oy / od * (0.5 - od); } });
      z.wob += dt * 2.3;
      const wob = Math.sin(z.wob) * 0.25;
      const vx = (dir[0] - dir[1] * wob) * z.speed + sx * 3 + z.kx, vy = (dir[1] + dir[0] * wob) * z.speed + sy * 3 + z.ky;
      move(world, z, vx * dt, vy * dt, T.walker.radius);
      z.kx *= Math.pow(0.02, dt); z.ky *= Math.pow(0.02, dt);
      const [fx2, fy2] = toScreen(vx, vy); if (Math.abs(fx2) + Math.abs(fy2) > 0.5) z.face = faceFrom(fx2, fy2);
      z.anim += dt * z.speed * 0.9;
      if (Math.hypot(L.x - z.x, L.y - z.y) < T.walker.contact) hurtLeader();
      for (let j = 0; j < g.line.length; j++) { const f = g.line[j]; if (Math.hypot(f.x - z.x, f.y - z.y) < 0.36) { bite(j, z); break; } }
      if (Math.random() < dt * 0.012 && best < 9) sfx.groan();
    }
    g.hash.clear();
    for (let i = 0; i < Z.count; i++) g.hash.insert(Z.items[i]);

    // Chainsaw blades circle the leader.
    if (g.up.saw > 0) {
      g.sawAngle += dt * 3.4;
      for (let k = 0; k < g.up.saw; k++) {
        const a = g.sawAngle + k * Math.PI * 2 / g.up.saw, x = L.x + Math.cos(a) * 1.15, y = L.y + Math.sin(a) * 1.15;
        g.hash.query(x, y, 0.45, z => { if (z.sawT <= 0 && Math.hypot(z.x - x, z.y - y) < 0.42) { z.sawT = 0.3; damageZombie(z, 2.5 * dmgMul(), (z.x - L.x) * 2, (z.y - L.y) * 2); sfx.saw(); } });
      }
    }
    // Molotovs from the back of the line.
    if (g.up.molotov > 0) {
      g.molotovT -= dt;
      if (g.molotovT <= 0) {
        g.molotovT = 7.5 - g.up.molotov; const from = g.line.length ? g.line[g.line.length - 1] : L;
        g.fires.push({ x: from.x, y: from.y, t: 3.5, tick: 0 }); sfx.fire(); E.burst(from.x, from.y, '#ff8a3d', 10);
      }
    }
    for (let i = g.fires.length - 1; i >= 0; i--) {
      const f = g.fires[i]; f.t -= dt; f.tick -= dt;
      E.flame(f.x, f.y, 0.95);
      if (f.tick <= 0) { f.tick = 0.25; g.hash.query(f.x, f.y, 1, z => { if (Math.hypot(z.x - f.x, z.y - f.y) < 0.95) damageZombie(z, 0.9 * dmgMul(), 0, 0, true); }); }
      if (f.t <= 0) { g.fires.splice(i, 1); E.scorch(f.x, f.y); }
    }

    // Bullets, pellets and knives.
    const B = g.bullets;
    for (let i = B.count - 1; i >= 0; i--) {
      const b = B.items[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; b.spin += dt * 20;
      if (world.isTall(Math.floor(b.x), Math.floor(b.y))) { E.spark(b.x, b.y, b.z); B.kill(i); continue; }
      let gone = false;
      for (const br of g.barrels) if (br.alive && Math.hypot(br.x - b.x, br.y - b.y) < 0.4) { br.hp -= 1; br.flash = 0.1; E.spark(b.x, b.y, 0.4); if (br.hp <= 0) explode(br); B.kill(i); gone = true; break; }
      if (gone) continue;
      const hit = g.hash.nearest(b.x, b.y, 0.34, z => !z.dead && z !== b.last);
      if (hit) {
        const s = Math.hypot(b.vx, b.vy);
        damageZombie(hit, b.dmg, b.vx / s * (b.kind === 1 ? 1.5 : 2.2), b.vy / s * (b.kind === 1 ? 1.5 : 2.2));
        sfx.hit();
        if (b.pierce > 0) { b.pierce--; b.last = hit; } else { B.kill(i); continue; }
      }
      if (b.life <= 0) B.kill(i);
    }
    for (let i = Z.count - 1; i >= 0; i--) if (Z.items[i].dead) Z.kill(i);
    for (const br of g.barrels) br.flash = Math.max(0, br.flash - dt);

    // Brains: pop out, then fly to the leader when close (magnet).
    const mag = 1.5 * (1 + 0.45 * g.up.magnet);
    for (let i = g.brains.count - 1; i >= 0; i--) {
      const b = g.brains.items[i]; b.t += dt;
      if (b.z > 0 || b.vz > 0) { b.vz -= 9.8 * dt; b.z = Math.max(0, b.z + b.vz * dt); b.x += b.vx * dt; b.y += b.vy * dt; if (b.z === 0) { b.vz = 0; b.vx = b.vy = 0; } }
      const dx = L.x - b.x, dy = L.y - b.y, d = Math.hypot(dx, dy);
      if (d < mag || b.mag) { b.mag = true; const sp = 3 + b.t * 4; b.x += dx / (d || 1) * Math.min(d, sp * dt); b.y += dy / (d || 1) * Math.min(d, sp * dt); }
      if (d < 0.35) { g.brains.kill(i); gainXP(); if (g.state === 'levelup') break; }
    }

    g.spawnT -= dt;
    if (g.spawnT <= 0 && Z.count < T.testZombies + Math.floor(g.time / 20) * 4) { g.spawnT = 0.45; spawnZombie(7, 24); }

    const [lsx, lsy] = toScreen(L.x, L.y);
    g.cam.x += (lsx - g.cam.x) * Math.min(1, dt * 7);
    g.cam.y += (lsy - g.cam.y) * Math.min(1, dt * 7);
  };

  function gainXP() {
    g.pickStreak = g.time - g.lastPick < 0.6 ? g.pickStreak + 1 : 0; g.lastPick = g.time;
    sfx.pick(g.pickStreak);
    g.xp++;
    if (g.xp >= g.xpNeed) {
      g.xp -= g.xpNeed; g.level++; g.xpNeed = Math.round(6 + g.level * 3.5);
      const pool = UPGRADES.filter(u => g.up[u.id] < (u.max || 5) && !(u.id === 'heart' && g.leader.hearts >= MAX_HEARTS));
      g.cards = pool.sort(() => Math.random() - 0.5).slice(0, 3);
      g.state = 'levelup'; sfx.levelup();
    }
  }
  g.pickCard = (u) => {
    g.up[u.id]++;
    if (u.id === 'heart') g.leader.hearts = Math.min(MAX_HEARTS, g.leader.hearts + 1);
    if (u.id === 'tough') for (const f of g.line) f.tough = Math.max(f.tough, g.up.tough);
    g.cards = null; g.state = 'play'; g.leader.invuln = Math.max(g.leader.invuln, 0.8);
  };
  g.maxHearts = MAX_HEARTS; g.maxLine = MAX_LINE;

  /* ---------------- title screen demo ---------------- */
  function titleUpdate(dt) {
    g.time += dt; g.titleT += dt;
    // Slow camera drift around the middle of the town.
    const cx = world.w / 2 + Math.cos(g.titleT * 0.05) * 8, cy = world.h / 2 + Math.sin(g.titleT * 0.05) * 8, [sx, sy] = toScreen(cx, cy);
    g.cam.x += (sx - g.cam.x) * Math.min(1, dt * 2); g.cam.y += (sy - g.cam.y) * Math.min(1, dt * 2);
    const Z = g.zombies;
    for (let i = 0; i < Z.count; i++) {
      const z = Z.items[i]; z.wob += dt;
      if (Math.random() < dt * 0.3) { z.wx = Math.random() - 0.5; z.wy = Math.random() - 0.5; }
      const l = Math.hypot(z.wx, z.wy) || 1, vx = z.wx / l * z.speed * 0.6, vy = z.wy / l * z.speed * 0.6;
      move(world, z, vx * dt, vy * dt, T.walker.radius);
      const [fx2, fy2] = toScreen(vx, vy); z.face = faceFrom(fx2, fy2); z.anim += dt * z.speed * 0.6;
    }
    for (const s of g.others) s.bob += dt * 6;
  }

  g.reset('title');
  return g;
}
