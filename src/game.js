import { TUNING } from './config.js';
import { SpatialHash } from './engine/spatial.js';
import { Pool } from './engine/pool.js';
import { screenDirToWorld, toScreen } from './render/iso.js';
import { move, lineOfSight, FlowField, blocked } from './entities/physics.js';
import { Effects } from './entities/effects.js';
import { sfx } from './audio/sfx.js';
import { feel } from './engine/haptics.js';
import { ZOMBIES, BOSSES } from './data/enemies.js';
import { CLASSES, STARTER_CLASSES } from './data/classes.js';
import { UPGRADES } from './data/upgrades.js';

const T = TUNING;
const LEADER_PX = { x: 46, y: 36 };
export const faceFrom = (sx, sy) => Math.abs(sx) > Math.abs(sy) * 1.1 ? (sx > 0 ? 'E' : 'W') : (sy > 0 ? 'S' : 'N');
export { CLASSES, UPGRADES };
const SPACING = 0.62, MAX_LINE = 20, MAX_HEARTS = 5;
const SPECIAL = new Set(Object.keys(BOSSES));

/**
 * One run on one map. opts: { pal, level (data/levels.js entry or null), mode: 'level' | 'daily' | 'endless' | 'title',
 * mods: Set of daily modifier ids, camp: Base Camp levels, classes: unlocked class ids, zombieLooks }.
 */
export function createGame(world, opts) {
  const level = opts.level, mods = opts.mods || new Set(), camp = opts.camp || {};
  const g = {
    world, opts, level, mode: opts.mode, effects: new Effects(opts.pal, { tink: () => sfx.tink() }), hash: new SpatialHash(2), flow: new FlowField(world),
    zombies: new Pool(T.maxZombies, () => ({})),
    bullets: new Pool(500, () => ({})), shots: new Pool(120, () => ({})), pickups: new Pool(400, () => ({})),
    cam: { x: 0, y: 0, px: 0, py: 0 }, debug: { god: false, hitbox: false }, settings: { shake: 1 },
    night: !!(level && level.night) || mods.has('night'),
  };
  const fx = () => g.effects;
  const classes = mods.has('grandmas') ? ['grandma'] : (opts.classes && opts.classes.length ? opts.classes : STARTER_CLASSES);
  const zcfg = level ? level.z : { start: 14, max: 300, grow: 8, mix: { walker: 0.3, runner: 0.2, dog: 0.1, bloater: 0.1, spitter: 0.08, riot: 0.08, brute: 0.06, crawler: 0.04, screamer: 0.04 } };
  const dmgMul = () => (1 + 0.25 * g.up.damage) * (1 + 0.1 * (camp.damage || 0)) * (mods.has('glass') ? 2 : 1);
  const rateMul = () => 1 + 0.15 * g.up.rate;

  /* ---------------- setup ---------------- */
  g.reset = (state = 'play') => {
    let [sx, sy] = world.spawn;
    for (let r = 0; r < 8 && blocked(world, sx, sy, T.leaderRadius); r += 0.5)
      for (let a = 0; a < 8; a++) { const x = world.spawn[0] + Math.cos(a * Math.PI / 4) * r, y = world.spawn[1] + Math.sin(a * Math.PI / 4) * r; if (!blocked(world, x, y, T.leaderRadius)) { sx = x; sy = y; break; } }
    const hearts = mods.has('glass') ? 1 : T.hearts + (camp.hearts || 0);
    g.leader = { x: sx, y: sy, px: sx, py: sy, hearts, invuln: 0, face: 'S', anim: 0, moving: false, fireT: 0.3, aimT: 0, muzzle: 0, step: 0, dashT: 0, dashCd: 0, dx: 0, dy: 1, ddx: 0, ddy: 0 };
    g.zombies.clear(); g.bullets.clear(); g.shots.clear(); g.pickups.clear(); g.effects.clear();
    g.line = []; g.others = []; g.path = [{ x: sx, y: sy }];
    g.fires = []; g.puddles = []; g.markers = []; g.turrets = []; g.sawAngle = 0; g.molotovT = 4; g.grenadeT = 8; g.medicT = 0; g.crateT = 45;
    g.up = Object.fromEntries(UPGRADES.map(u => [u.id, 0]));
    g.xp = 0; g.level = 1; g.xpNeed = 6; g.cards = null; g.rerolls = camp.reroll || 0; g.pickStreak = 0; g.lastPick = -9;
    g.time = 0; g.kills = 0; g.rescued = 0; g.bitten = 0; g.hits = 0; g.bestLine = 0; g.cansEarned = 0; g.chain = 0; g.maxChain = 0;
    g.state = state; g.shake = 0; g.hitstop = 0; g.flowT = 0; g.spawnT = 0; g.rescueT = 0; g.moved = false; g.hurtFlash = 0; g.combo = 0; g.lastKill = -9; g.titleT = 0;
    g.boss = null; g.banner = null; g.result = null; g.heli = null; g.extractOn = false; g.bus = null; g.tower = null;
    for (const b of g.barrels || []) world.solid[Math.floor(b.y) * world.w + Math.floor(b.x)] = 0;
    g.barrels = (world.barrels || []).map(([x, y]) => ({ x: x + 0.5, y: y + 0.5, hp: 3, alive: true, flash: 0 }));
    for (const b of g.barrels) world.solid[Math.floor(b.y) * world.w + Math.floor(b.x)] = 1;
    g.mines = (world.mines || []).map(([x, y]) => ({ x, y, alive: true }));
    const [cx, cy] = toScreen(sx, sy); g.cam.x = g.cam.px = cx; g.cam.y = g.cam.py = cy;
    const obj = level ? level.obj : { type: opts.mode === 'daily' ? 'survive' : 'endless', time: 150 };
    g.obj = { type: obj.type, time: obj.time || 0, count: obj.count || 0, boss: obj.boss, left: obj.time || 0 };
    if (obj.type === 'escort' && world.route) { const [a, b] = world.route; g.bus = { x: a[0] + 0.5, y: a[1] - 0.5, px: a[0] + 0.5, py: a[1] - 0.5, tx: b[0] + 0.5, ty: b[1] - 0.5, hp: 100, max: 100, flash: 0 }; }
    if (obj.type === 'defend' && world.tower) g.tower = { x: world.tower[0], y: world.tower[1], hp: 160, max: 160, flash: 0 };
    if (g.tower) world.solid[Math.floor(g.tower.y) * world.w + Math.floor(g.tower.x)] = 1;
    g.intro = state === 'play' ? 2.2 : 0;
    const startZ = state === 'title' ? 30 : Math.round(zcfg.start * (mods.has('double') ? 2 : 1));
    for (let i = 0; i < startZ; i++) spawnZombie(9, 30);
    for (let i = 0; i < (level ? Math.min(level.survivors, 6) : 6); i++) spawnSurvivor(4, 26);
    if (state === 'play') for (let i = 0; i < (camp.start || 0); i++) { const s = makeSurvivor(pickClass(), sx, sy, 'stranded'); g.others.push(s); join(s, true); }
    g.flow.build(Math.floor(sx), Math.floor(sy));
  };
  const pickClass = () => classes[Math.floor(Math.random() * classes.length)];
  const pickType = () => {
    if (mods.has('runners')) return 'runner';
    const mix = { ...zcfg.mix }; if (mods.has('brutes')) mix.brute = (mix.brute || 0) + 0.35;
    if (g.mode === 'endless') { const t = g.time; for (const k in mix) mix[k] *= k === 'walker' ? Math.max(0.2, 1 - t / 400) : Math.min(2, 0.4 + t / 200); }
    let tot = 0; for (const k in mix) tot += mix[k];
    let r = Math.random() * tot; for (const k in mix) { if ((r -= mix[k]) <= 0) return k; } return 'walker';
  };

  function offscreen(x, y) {
    if (!g.view) return true;
    const L = g.leader, [sx, sy] = toScreen(x - L.x, y - L.y);
    return Math.abs(sx) > g.view.w / 2 + 12 || Math.abs(sy) > g.view.h / 2 + 24;
  }
  function freeSpot(minD, maxD, needOffscreen, r = 0.3) {
    const L = g.leader;
    for (let tries = 0; tries < 140; tries++) {
      const x = 0.5 + Math.floor(Math.random() * world.w), y = 0.5 + Math.floor(Math.random() * world.h);
      const d = Math.hypot(x - L.x, y - L.y);
      if (d < minD || d > maxD || blocked(world, x, y, r)) continue;
      if (needOffscreen && !offscreen(x, y)) continue;
      return [x, y];
    }
    return null;
  }
  function spawnZombie(minD, maxD, at, type) {
    type = type || pickType();
    const Z = ZOMBIES[type] || BOSSES[type];
    const p = at || freeSpot(minD, maxD, true, Z.r); if (!p) return null;
    const z = g.zombies.spawn(); if (!z) return null;
    for (const k in z) delete z[k];
    Object.assign(z, { type, x: p[0], y: p[1], px: p[0], py: p[1], hp: Z.hp, maxHp: Z.hp, speed: Z.speed * (SPECIAL.has(type) ? 1 : 0.85 + Math.random() * 0.3), r: Z.r, look: Math.floor(Math.random() * opts.zombieLooks),
      face: 'S', anim: Math.random(), flash: 0, kx: 0, ky: 0, dead: false, wob: Math.random() * 6, sawT: 0, atk: 2 + Math.random() * 2, atk2: 5, tdx: 0, tdy: 1, gen: 0, scale: Z.scale || 1, mode: 'chase', wx: Math.random() - 0.5, wy: Math.random() - 0.5, barbT: 0 });
    if (type === 'dog' && !at) for (let i = 0; i < 2; i++) spawnZombie(0, 0, [p[0] + (Math.random() - 0.5), p[1] + (Math.random() - 0.5)], 'dog');
    return z;
  }
  function spawnSurvivor(minD, maxD) {
    const p = freeSpot(minD, maxD, false); if (!p) return;
    g.others.push(makeSurvivor(pickClass(), p[0], p[1], 'stranded'));
  }
  function makeSurvivor(cls, x, y, state) {
    return { cls, x, y, px: x, py: y, state, t: 0, face: 'S', anim: 0, fireT: Math.random(), tough: 0, flash: 0, swing: 0, muzzle: 0, aimT: 0, bob: Math.random() * 6, healT: 0, turretT: 6, inLine: 0, lvl: 0, saved: false };
  }
  g.spawnZombie = spawnZombie;

  /* ---------------- conga path ---------------- */
  function recordPath(L) {
    const last = g.path[g.path.length - 1];
    if (Math.hypot(L.x - last.x, L.y - last.y) >= 0.06) { g.path.push({ x: L.x, y: L.y }); if (g.path.length > 700) g.path.splice(0, 100); }
  }
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
    L.hearts--; L.invuln = T.hurtInvuln; shake(6); g.hurtFlash = 0.25; g.hits++;
    sfx.hurt(); feel.hurt();
    fx().blood(L.x, L.y, 6, 0.8);
    g.hash.query(L.x, L.y, 1.6, z => { if (z.boss) return; const dx = z.x - L.x, dy = z.y - L.y, d = Math.hypot(dx, dy) || 1; z.kx += dx / d * 5; z.ky += dy / d * 5; });
    if (L.hearts <= 0) end(false, 'YOU WERE OVERRUN');
  }
  function damageZombie(z, dmg, kx, ky, quiet, fromX, fromY) {
    if (z.dead) return;
    const Z = ZOMBIES[z.type] || BOSSES[z.type];
    if (Z.shield && fromX !== undefined) {
      const ax = fromX - z.x, ay = fromY - z.y, al = Math.hypot(ax, ay) || 1;
      if ((ax * z.tdx + ay * z.tdy) / al > 0.45) { dmg *= 0.12; if (!quiet) fx().spark(z.x, z.y, 0.7); }
    }
    z.hp -= dmg; z.flash = 0.08;
    if (!z.boss) { z.kx += kx; z.ky += ky; } else { z.kx += kx * 0.1; z.ky += ky * 0.1; feel.boss(); }
    if (!quiet) { fx().blood(z.x, z.y, 2, 0.6); fx().number(z.x, z.y, Math.max(1, Math.round(dmg))); }
    if (z.hp <= 0) killZombie(z);
  }
  function drop(kind, x, y, value = 1) {
    const p = g.pickups.spawn(); if (!p) return;
    Object.assign(p, { kind, x, y, px: x, py: y, z: 0.3, vx: (Math.random() - 0.5) * 1.6, vy: (Math.random() - 0.5) * 1.6, vz: 2.5, mag: false, t: 0, value });
  }
  function killZombie(z) {
    z.dead = true; g.kills++;
    const Z = ZOMBIES[z.type] || BOSSES[z.type];
    fx().blood(z.x, z.y, z.scale > 1 ? 24 : 12, 1.2);
    if (!z.boss || z.type === 'pz') fx().corpse(z.x, z.y, z.type + ':' + z.look + ':' + z.scale, z.face === 'W');
    shake(z.scale > 1 ? 5 : 1.6);
    if (z.scale > 1 || z.boss) g.hitstop = 0.04;
    g.combo = g.time - g.lastKill < 1.4 ? g.combo + 1 : 1; g.lastKill = g.time;
    sfx.kill(g.combo); feel.kill();
    const xpMul = 1 + 0.15 * (camp.xp || 0);
    drop('brain', z.x, z.y, (Z.xp || 1) * xpMul);
    if (Math.random() < (Z.cans || 0)) drop('can', z.x + 0.2, z.y, z.scale > 1 ? 3 : 1);
    if (Math.random() < 0.012) drop('medkit', z.x - 0.2, z.y);
    if (z.type === 'bloater') blast(z.x, z.y, 1.6, 7, 'bloat');
    if (z.boss) bossDown(z);
  }
  function bossDown(z) {
    if (z.type === 'pz' && z.gen < 2) {
      for (let i = 0; i < 2; i++) {
        const c = spawnZombie(0, 0, [z.x + (i ? 0.5 : -0.5), z.y], 'pz');
        if (c) { c.boss = true; c.gen = z.gen + 1; c.scale = 3 - c.gen; c.hp = c.maxHp = z.maxHp * 0.45; c.r = 0.55 - 0.15 * c.gen; c.speed = 0.8 + 0.35 * c.gen; }
      }
      g.banner = { text: 'IT SPLITS!', t: 1.5 };
      return;
    }
    for (let i = 0; i < 8; i++) drop('can', z.x + (Math.random() - 0.5) * 2, z.y + (Math.random() - 0.5) * 2, 3);
    for (let i = 0; i < g.zombies.count; i++) { const o = g.zombies.items[i]; if (o.boss && !o.dead) return; }
    if (z.type === 'hive') { g.obj.type = 'escape'; g.extractOn = true; g.banner = { text: 'RUN TO THE PLANE!', t: 2.5 }; sfx.levelup(); return; }
    end(true);
  }
  /** Explosion: barrels, bloaters, mines, grenades, missiles. */
  function blast(x, y, R, dmg, source) {
    const L = g.leader;
    g.hash.query(x, y, R + 1, z => { const dx = z.x - x, dy = z.y - y, d = Math.hypot(dx, dy); if (d < R) damageZombie(z, dmg * (1 - d / R * 0.4), dx / (d || 1) * 7, dy / (d || 1) * 7, true); });
    if (source !== 'grenade' && Math.hypot(L.x - x, L.y - y) < R * 0.7) hurtLeader();
    if (source !== 'grenade') for (let i = g.line.length - 1; i >= 0; i--) {
      const f = g.line[i];
      if (CLASSES[f.cls].fireproof) continue;
      if (Math.hypot(f.x - x, f.y - y) < R * 0.55) { breakLine(i, 'panic'); break; }
    }
    fx().explosion(x, y); shake(source === 'bloat' ? 5 : 9); g.hitstop = Math.max(g.hitstop, 0.04); sfx.explode(); feel.explode();
  }
  function explodeBarrel(b) {
    if (!b.alive) return;
    b.alive = false; world.solid[Math.floor(b.y) * world.w + Math.floor(b.x)] = 0;
    g.chain++; g.maxChain = Math.max(g.maxChain, g.chain); setTimeout(() => { g.chain = Math.max(0, g.chain - 1); }, 600);
    blast(b.x, b.y, 2.1, 14, 'barrel');
    for (const o of g.barrels) if (o.alive && Math.hypot(o.x - b.x, o.y - b.y) < 2.1) setTimeout(() => explodeBarrel(o), 120);
  }
  /** Removes line member i and everyone behind: 'bite' turns i into a zombie, 'panic' just knocks them out. */
  function breakLine(i, how, z) {
    const f = g.line[i];
    if (how === 'bite' && f.tough > 0) { f.tough--; f.flash = 0.15; if (z) { z.kx -= (f.x - z.x) * 8; z.ky -= (f.y - z.y) * 8; } sfx.block(); return; }
    if (how === 'bite' && g.up.medic && g.medicT <= 0) { g.medicT = 75 - 10 * g.up.medic; f.flash = 0.3; fx().heal(f.x, f.y); fx().number(f.x, f.y, 'SAVED!', '#9bd068'); if (z) { z.kx -= (f.x - z.x) * 10; z.ky -= (f.y - z.y) * 10; } sfx.heal(); return; }
    const out = g.line.splice(i);
    if (how === 'bite') { const v = out.shift(); v.state = 'turning'; v.t = 0.9; g.others.push(v); g.bitten++; fx().blood(v.x, v.y, 10, 1); fx().number(v.x, v.y, 'BITTEN!', '#e2384a'); sfx.bite(); feel.bite(); shake(4); }
    else { fx().number(f.x, f.y, 'SCATTERED!', '#f4d35e'); sfx.block(); feel.bite(); shake(3); }
    for (const b of out) { b.state = 'panic'; b.t = 3; g.others.push(b); }
  }
  function join(s, quiet) {
    if (g.line.length >= MAX_LINE) return;
    s.state = 'line'; s.tough = Math.max(s.tough, g.up.tough);
    if (!s.saved) { s.saved = true; g.rescued++; s.lvl = Math.min(2, g.up.recruits > 0 ? 1 + (g.up.recruits > 2 ? 1 : 0) : 0); }
    const i = g.others.indexOf(s); if (i >= 0) g.others.splice(i, 1);
    g.line.push(s); g.bestLine = Math.max(g.bestLine, g.line.length);
    if (!quiet) { fx().number(s.x, s.y, CLASSES[s.cls].label + '!', CLASSES[s.cls].color); fx().sparkle(s.x, s.y); sfx.join(g.line.length); feel.join(); }
  }

  /* ---------------- weapons ---------------- */
  function shoot(from, target, w, lvlMul = 1) {
    let dx = target.x - from.x, dy = target.y - from.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    for (let p = 0; p < w.pellets; p++) {
      const a = (Math.random() - 0.5) * w.spread * (w.pellets > 1 ? 0.6 : 2) + (w.pellets > 1 ? (p / (w.pellets - 1) - 0.5) * w.spread * 2 : 0), c = Math.cos(a), s = Math.sin(a);
      const b = g.bullets.spawn(); if (!b) return;
      const sp = w.speed * (w.pellets > 1 ? 0.85 + Math.random() * 0.3 : 1);
      Object.assign(b, { x: from.x + dx * 0.3, y: from.y + dy * 0.3, px: from.x, py: from.y, vx: (dx * c - dy * s) * sp, vy: (dx * s + dy * c) * sp, z: 0.78, life: w.range / w.speed * 1.05, dmg: w.dmg * dmgMul() * lvlMul, kind: w.kind, pierce: (w.pierce || 0) + g.up.pierce, bounce: g.up.ricochet, last: null, spin: 0 });
    }
    from.muzzle = 0.06; from.aimT = 0.35;
    const [sx, sy] = toScreen(dx, dy); from.face = faceFrom(sx, sy);
    if (w.kind === 0) { sfx.shot(); fx().casing(from.x, from.y, dx, dy); fx().smoke(from.x + dx * 0.45, from.y + dy * 0.45, 0.8, 1); }
    else if (w.kind === 1) { sfx.shotgun(); feel.shotgun(); fx().casing(from.x, from.y, dx, dy); fx().smoke(from.x + dx * 0.5, from.y + dy * 0.5, 0.8, 3); }
    else sfx.throw();
  }
  const canSee = (a, z) => !z.dead && lineOfSight(world, a.x, a.y, z.x, z.y);
  function followerAct(f, dt) {
    const C = CLASSES[f.cls], lvlMul = 1 + 0.25 * f.lvl;
    if (C.heal) {
      f.healT += dt * lvlMul;
      if (f.healT > 20) {
        f.healT = 0; const L = g.leader;
        if (L.hearts < MAX_HEARTS) { L.hearts++; fx().heal(L.x, L.y); fx().number(L.x, L.y, '+1', '#9bd068'); sfx.heal(); }
        const i = g.line.indexOf(f); if (i > 0 && g.line[i - 1].tough < 1) { g.line[i - 1].tough = 1; fx().heal(g.line[i - 1].x, g.line[i - 1].y); }
      }
      return;
    }
    if (C.turret) {
      f.turretT -= dt * lvlMul;
      if (f.turretT <= 0) { f.turretT = C.turret; g.turrets.push({ x: f.x, y: f.y, t: 12, fireT: 0, face: 'S', muzzle: 0 }); sfx.block(); fx().sparkle(f.x, f.y); }
    }
    f.fireT -= dt * rateMul() * (f.lvl ? 1 + 0.15 * f.lvl : 1);
    if (f.fireT > 0) return;
    const target = g.hash.nearest(f.x, f.y, C.range, z => canSee(f, z));
    if (!target) { f.fireT = 0.1; return; }
    f.fireT = 1 / C.rate;
    if (C.melee) {
      const dx = target.x - f.x, dy = target.y - f.y, d = Math.hypot(dx, dy) || 1;
      damageZombie(target, C.dmg * dmgMul() * lvlMul, dx / d * C.knock, dy / d * C.knock, false, f.x, f.y);
      f.swing = 0.2; fx().swing(f.x, f.y, dx / d, dy / d); sfx.pan();
      const [sx, sy] = toScreen(dx, dy); f.face = faceFrom(sx, sy); f.aimT = 0.3;
    } else shoot(f, target, C, lvlMul);
  }
  function enemyShot(kind, x, y, tx, ty, o2 = {}) {
    const s = g.shots.spawn(); if (!s) return;
    const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1, sp = o2.speed || 4;
    Object.assign(s, { kind, x, y, px: x, py: y, sx: x, sy: y, tx, ty, vx: dx / d * sp, vy: dy / d * sp, t: 0, dur: o2.dur || d / sp, life: o2.life || 3, z: 0.7, spin: 0 });
  }

  /* ---------------- the end of a run ---------------- */
  function end(won, reason) {
    if (g.state !== 'play') return;
    g.state = won ? 'won' : 'failed'; g.endAt = g.time;
    g.banner = null;
    const stars = [];
    if (won && level) {
      stars.push(true);
      const [s2, s3] = level.stars;
      const check = s => s.line ? g.line.length >= s.line : s.nobite ? g.bitten === 0 : s.nohit ? g.hits === 0 : s.time ? g.time <= s.time : s.kills ? g.kills >= s.kills : false;
      stars.push(check(s2)); stars.push(check(s3));
    }
    const nStars = stars.filter(Boolean).length;
    const bonus = won ? (opts.mode === 'daily' ? 40 : level ? level.cans + nStars * 5 : 0) : 0;
    const endlessBonus = opts.mode === 'endless' ? Math.floor(g.time / 10) : 0;
    g.result = { won, reason, stars, nStars, cans: g.cansEarned + bonus + endlessBonus, bonus: bonus + endlessBonus };
    if (won) { sfx.win(); feel.win(); } else { sfx.die(); feel.hurt(); shake(9); }
    g.onEnd && g.onEnd(g.result);
  }
  g.end = end; g.damageZombie = damageZombie;

  /* ---------------- update ---------------- */
  g.update = (dt, input) => {
    const L = g.leader, E = g.effects;
    g.cam.px = g.cam.x; g.cam.py = g.cam.y;
    L.px = L.x; L.py = L.y;
    for (let i = 0; i < g.zombies.count; i++) { const z = g.zombies.items[i]; z.px = z.x; z.py = z.y; }
    for (let i = 0; i < g.bullets.count; i++) { const b = g.bullets.items[i]; b.px = b.x; b.py = b.y; }
    for (let i = 0; i < g.shots.count; i++) { const b = g.shots.items[i]; b.px = b.x; b.py = b.y; }
    for (let i = 0; i < g.pickups.count; i++) { const b = g.pickups.items[i]; b.px = b.x; b.py = b.y; }
    for (const s of g.line) { s.px = s.x; s.py = s.y; }
    for (const s of g.others) { s.px = s.x; s.py = s.y; }
    if (g.bus) { g.bus.px = g.bus.x; g.bus.py = g.bus.y; }
    if (g.state === 'paused' || g.state === 'levelup') return;
    g.shake = Math.max(0, g.shake - dt * 18);
    g.hurtFlash = Math.max(0, g.hurtFlash - dt);
    if (g.banner) { g.banner.t -= dt; if (g.banner.t <= 0) g.banner = null; }
    E.update(dt);
    if (g.state === 'title') return titleUpdate(dt);
    if (g.state !== 'play') { g.time += dt; return; }
    if (g.hitstop > 0) { g.hitstop -= dt; return; }
    g.time += dt; g.intro = Math.max(0, g.intro - dt);

    const m = input.move;
    L.moving = Math.hypot(m.x, m.y) > 0.05;
    L.dashCd = Math.max(0, L.dashCd - dt);
    if (L.moving) { const l = Math.hypot(m.x, m.y); L.dx = m.x / l; L.dy = m.y / l; }
    if (input.takeDash() && L.dashCd <= 0) {
      const [sx, sy] = L.moving ? [L.dx, L.dy] : ({ E: [1, 0.5], W: [-1, -0.5], S: [-1, 0.5], N: [1, -0.5] }[L.face]);
      L.dashT = 0.18; L.dashCd = 2.2; L.invuln = Math.max(L.invuln, 0.25);
      const [wx, wy] = screenDirToWorld(sx, sy), l = Math.hypot(wx, wy) || 1; L.ddx = wx / l; L.ddy = wy / l;
      sfx.dash(); feel.dash(); E.dust(L.x, L.y, 6);
    }
    if (L.dashT > 0) { L.dashT -= dt; move(world, L, L.ddx * 13 * dt, L.ddy * 13 * dt, T.leaderRadius); E.dust(L.x, L.y, 1); g.moved = true; L.anim += dt * 2; }
    else if (L.moving) {
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
    L.fireT -= dt * rateMul();
    if (L.fireT <= 0) {
      const target = g.hash.nearest(L.x, L.y, T.pistol.range, z => canSee(L, z));
      if (target) { shoot(L, target, { ...T.pistol, dmg: T.pistol.damage, pellets: 1, kind: 0 }); L.fireT = 1 / T.pistol.rate; } else L.fireT = 0.05;
    }

    // Conga line
    let distBack = 0;
    g.line.forEach((f) => {
      distBack += CLASSES[f.cls].spacing || SPACING;
      const [tx, ty] = pathPoint(distBack);
      const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy);
      if (d > 0.01) {
        const step = d > 0.8 ? Math.min(d, 7 * dt) : d * Math.min(1, dt * 16);
        f.x += dx / d * step; f.y += dy / d * step;
        if (f.aimT <= 0 && d > 0.02) { const [sx, sy] = toScreen(dx, dy); f.face = faceFrom(sx, sy); }
        f.anim += step * 2.4;
      }
      f.muzzle = Math.max(0, f.muzzle - dt); f.aimT = Math.max(0, f.aimT - dt); f.flash = Math.max(0, f.flash - dt); f.swing = Math.max(0, f.swing - dt);
      f.inLine += dt; const lv = f.inLine > 120 ? 2 : f.inLine > 45 ? 1 : 0;
      if (lv > f.lvl) { f.lvl = lv; fx().number(f.x, f.y, 'LEVEL UP!', '#f4d35e'); fx().sparkle(f.x, f.y); }
      followerAct(f, dt);
    });
    g.medicT = Math.max(0, g.medicT - dt);
    for (let i = g.others.length - 1; i >= 0; i--) {
      const s = g.others[i];
      s.t -= dt; s.bob += dt * 6; s.flash = Math.max(0, s.flash - dt);
      if (s.state === 'turning') {
        if (s.t <= 0) { g.others.splice(i, 1); const z = spawnZombie(0, 0, [s.x, s.y], 'walker'); if (z) z.flash = 0.2; E.puff(s.x, s.y); sfx.groan(); }
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
    g.rescueT -= dt;
    if (g.rescueT <= 0) { g.rescueT = 6; if (g.others.filter(s => s.state === 'stranded').length < (level ? Math.min(level.survivors, 6) : 5)) spawnSurvivor(8, 30); }

    if (g.obj.type === 'boss' && !g.boss && g.time > 5) spawnBoss();

    // Zombies
    g.flowT -= dt;
    if (g.flowT <= 0) { g.flowT = 0.25; g.flow.build(Math.floor(L.x), Math.floor(L.y)); }
    const Z = g.zombies;
    for (let i = 0; i < Z.count; i++) {
      const z = Z.items[i];
      z.flash = Math.max(0, z.flash - dt); z.sawT = Math.max(0, z.sawT - dt); z.barbT = Math.max(0, z.barbT - dt);
      if (z.boss) { bossUpdate(z, dt); continue; }
      const Zd = ZOMBIES[z.type];
      let tx = L.x, ty = L.y, best = Math.hypot(L.x - z.x, L.y - z.y), target = 'leader';
      for (const f of g.line) { const d = Math.hypot(f.x - z.x, f.y - z.y); if (d < best && d < 2.2) { best = d; tx = f.x; ty = f.y; target = 'line'; } }
      if (g.tower && Math.hypot(g.tower.x - z.x, g.tower.y - z.y) < (z.look % 2 ? 9 : 4)) { tx = g.tower.x; ty = g.tower.y; target = 'tower'; best = Math.hypot(tx - z.x, ty - z.y); }
      if (g.bus && Math.hypot(g.bus.x - z.x, g.bus.y - z.y) < (z.look % 2 ? 8 : 3)) { tx = g.bus.x + 0.9; ty = g.bus.y + 0.4; target = 'bus'; best = Math.hypot(tx - z.x, ty - z.y); }
      const dx = tx - z.x, dy = ty - z.y, d = Math.hypot(dx, dy) || 1;
      z.tdx = dx / d; z.tdy = dy / d;
      let speed = z.speed;
      if (Zd.spit) {
        z.atk -= dt;
        if (d < Zd.spit && canSee(z, L)) { speed = 0; if (z.atk <= 0) { z.atk = 3.2; enemyShot('spit', z.x, z.y, tx + (Math.random() - 0.5), ty + (Math.random() - 0.5), { dur: 0.9 }); sfx.spit(); } }
      }
      if (Zd.scream) {
        z.atk -= dt;
        if (z.atk <= 0 && best < 10) { z.atk = Zd.scream; for (let k = 0; k < 4; k++) spawnZombie(0, 0, [z.x + (Math.random() - 0.5) * 3, z.y + (Math.random() - 0.5) * 3], 'walker'); fx().ring(z.x, z.y); sfx.scream(); g.banner = g.banner || { text: 'A SCREAMER CALLS FOR HELP!', t: 1.4 }; }
      }
      const dir = d < 2.2 || target === 'tower' || target === 'bus' ? [dx / d, dy / d] : g.flow.dirAt(z.x, z.y) || [dx / d, dy / d];
      let sx = 0, sy = 0;
      g.hash.query(z.x, z.y, 0.8, o => { if (o === z) return; const ox = z.x - o.x, oy = z.y - o.y, od = Math.hypot(ox, oy), want = (z.r + o.r) * 1.05; if (od > 0 && od < want) { sx += ox / od * (want - od); sy += oy / od * (want - od); } });
      z.wob += dt * 2.3;
      const wob = Math.sin(z.wob) * 0.25;
      const vx = (dir[0] - dir[1] * wob) * speed + sx * 3 + z.kx, vy = (dir[1] + dir[0] * wob) * speed + sy * 3 + z.ky;
      move(world, z, vx * dt, vy * dt, z.r);
      z.kx *= Math.pow(0.02, dt); z.ky *= Math.pow(0.02, dt);
      const [fx2, fy2] = toScreen(vx, vy); if (Math.abs(fx2) + Math.abs(fy2) > 0.5) z.face = faceFrom(fx2, fy2);
      z.anim += dt * Math.max(0.3, speed) * 0.9;
      contact(z, Zd, dt);
      if (Math.random() < dt * 0.01 && best < 9) sfx.groan();
    }
    g.hash.clear();
    for (let i = 0; i < Z.count; i++) g.hash.insert(Z.items[i]);

    upgradesUpdate(dt);
    projectilesUpdate(dt);
    for (let i = Z.count - 1; i >= 0; i--) if (Z.items[i].dead) Z.kill(i);
    for (const br of g.barrels) br.flash = Math.max(0, br.flash - dt);
    pickupsUpdate(dt);
    hazardsUpdate(dt);
    objectiveUpdate(dt);
    director(dt);

    const [lsx, lsy] = toScreen(L.x, L.y);
    g.cam.x += (lsx - g.cam.x) * Math.min(1, dt * 7);
    g.cam.y += (lsy - g.cam.y) * Math.min(1, dt * 7);
  };

  function contact(z, Zd, dt) {
    const L = g.leader, reach = Zd.contact;
    if (Math.hypot(L.x - z.x, L.y - z.y) < reach) hurtLeader();
    for (let j = 0; j < g.line.length; j++) {
      const f = g.line[j], d = Math.hypot(f.x - z.x, f.y - z.y);
      if (g.up.barbed && d < reach + 0.25 && z.barbT <= 0) { z.barbT = 0.5; damageZombie(z, 1.2 * g.up.barbed, (z.x - f.x) * 3, (z.y - f.y) * 3, true); fx().spark(z.x, z.y, 0.5); }
      if (z.dead) return;
      if (d < reach * 0.86) { breakLine(j, Zd.shove || z.boss ? 'panic' : 'bite', z); break; }
    }
    if (g.bus && Math.hypot(g.bus.x + 0.9 - z.x, g.bus.y + 0.4 - z.y) < 1.4) { g.bus.hp -= 2.6 * dt * (z.scale || 1); g.bus.flash = 0.1; }
    if (g.tower && Math.hypot(g.tower.x - z.x, g.tower.y - z.y) < 0.9) { g.tower.hp -= 3 * dt * (z.scale || 1); g.tower.flash = 0.1; }
  }

  /* ---------------- bosses ---------------- */
  function spawnBoss() {
    const type = g.obj.boss, B = BOSSES[type];
    let p = type === 'hive' ? [Math.floor(world.w / 2) + 6.5, Math.floor(world.h / 2) - 5.5] : freeSpot(9, 16, true, B.r);
    if (type === 'hive') for (let r = 0; r < 12 && blocked(world, p[0], p[1], 0.6); r++) p = [p[0] + 1, p[1] + (r % 2)];
    if (!p) p = [world.spawn[0] + 8, world.spawn[1]];
    const z = spawnZombie(0, 0, p, type);
    if (!z) return;
    z.boss = true; z.scale = B.scale; z.r = B.r; z.atk = 3;
    g.boss = z; g.banner = { text: B.name, t: 2.4, boss: true };
    sfx.bossIntro(); feel.explode(); shake(6);
  }
  function bossUpdate(z, dt) {
    const L = g.leader, B = BOSSES[z.type];
    z.atk -= dt; z.atk2 -= dt;
    const dx = L.x - z.x, dy = L.y - z.y, d = Math.hypot(dx, dy) || 1;
    let speed = z.speed, dirx = dx / d, diry = dy / d;
    z.tdx = dirx; z.tdy = diry;
    switch (z.type) {
      case 'mailman':
        if (z.atk <= 0 && d < 9) { z.atk = 3.2; for (let k = -1; k <= 1; k++) enemyShot('parcel', z.x, z.y, L.x + k * 0.9 + (Math.random() - 0.5), L.y - k * 0.6, { dur: 1.1 }); sfx.throw(); }
        break;
      case 'santa':
        if (z.atk <= 0) { z.atk = 5.5; for (let k = 0; k < 5; k++) spawnZombie(0, 0, [z.x + Math.cos(k * 1.26) * 1.2, z.y + Math.sin(k * 1.26) * 1.2], 'elf'); fx().sparkle(z.x, z.y); sfx.jingle(); }
        break;
      case 'tank':
        if (z.mode === 'chase' && z.atk <= 0 && d < 10) { z.mode = 'aim'; z.modeT = 0.9; z.cdx = dirx; z.cdy = diry; sfx.rev(); }
        else if (z.mode === 'aim') { speed = 0; z.flash = Math.floor(z.modeT * 10) % 2 ? 0.05 : 0; z.modeT -= dt; if (z.modeT <= 0) { z.mode = 'charge'; z.modeT = 1.3; } }
        else if (z.mode === 'charge') { speed = 6.5; dirx = z.cdx; diry = z.cdy; z.modeT -= dt; fx().dust(z.x, z.y, 2); if (z.modeT <= 0) { z.mode = 'chase'; z.atk = 5.5; } }
        break;
      case 'captain':
        if (z.atk <= 0 && d < 10) { z.atk = 3.6; enemyShot('anchor', z.x, z.y, L.x, L.y, { speed: 7, life: 2 }); sfx.throw(); }
        if (z.atk2 <= 0) { z.atk2 = 8; for (let k = 0; k < 4; k++) spawnZombie(8, 16, null, 'fish'); }
        break;
      case 'general':
        if (z.atk <= 0 && d < 11) { z.atk = 2.4; for (let k = -2; k <= 2; k++) { const a = Math.atan2(dy, dx) + k * 0.16; enemyShot('bullet', z.x, z.y, z.x + Math.cos(a) * 12, z.y + Math.sin(a) * 12, { speed: 4.6, life: 2.6 }); } sfx.shot(); }
        if (z.atk2 <= 0) { z.atk2 = 7; for (let k = 0; k < 3; k++) g.markers.push({ x: L.x + (Math.random() - 0.5) * 3, y: L.y + (Math.random() - 0.5) * 3, t: 1.2 }); sfx.siren(); }
        break;
      case 'hive':
        speed = 0;
        if (z.atk <= 0) { z.atk = 3.6; const n = 3 + Math.floor(g.time / 60); for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2; spawnZombie(0, 0, [z.x + Math.cos(a) * 1.8, z.y + Math.sin(a) * 1.8], Math.random() < 0.5 ? 'walker' : Math.random() < 0.5 ? 'runner' : 'dog'); } fx().puff(z.x, z.y); }
        break;
    }
    if (speed > 0) {
      const flow = d > 2.5 && z.mode !== 'charge' ? g.flow.dirAt(z.x, z.y) : null;
      const [mx, my] = flow || [dirx, diry];
      const hit = move(world, z, (mx * speed + z.kx) * dt, (my * speed + z.ky) * dt, z.r);
      if (hit && z.mode === 'charge') { z.mode = 'chase'; z.atk = 4; shake(7); sfx.explode(); fx().dust(z.x, z.y, 10); }
      const [fx2, fy2] = toScreen(mx, my); z.face = faceFrom(fx2, fy2); z.anim += dt * speed * 0.6;
    }
    z.kx *= Math.pow(0.02, dt); z.ky *= Math.pow(0.02, dt);
    contact(z, B, dt);
  }

  /* ---------------- upgrades that act on their own, bullets ---------------- */
  function upgradesUpdate(dt) {
    const L = g.leader, E = g.effects;
    if (g.up.saw > 0) {
      g.sawAngle += dt * 3.4;
      for (let k = 0; k < g.up.saw; k++) {
        const a = g.sawAngle + k * Math.PI * 2 / g.up.saw, x = L.x + Math.cos(a) * 1.15, y = L.y + Math.sin(a) * 1.15;
        g.hash.query(x, y, 1, z => { if (z.sawT <= 0 && Math.hypot(z.x - x, z.y - y) < 0.42 + z.r * 0.5) { z.sawT = 0.3; damageZombie(z, 2.5 * dmgMul(), (z.x - L.x) * 2, (z.y - L.y) * 2); sfx.saw(); } });
      }
    }
    if (g.up.molotov > 0) {
      g.molotovT -= dt;
      if (g.molotovT <= 0) { g.molotovT = 7.5 - g.up.molotov; const from = g.line.length ? g.line[g.line.length - 1] : L; g.fires.push({ x: from.x, y: from.y, t: 3.5, tick: 0 }); sfx.fire(); E.burst(from.x, from.y, '#ff8a3d', 10); }
    }
    if (g.up.grenade > 0) {
      g.grenadeT -= dt;
      if (g.grenadeT <= 0) {
        const from = g.line.length ? g.line[g.line.length - 1] : L, tgt = g.hash.nearest(from.x, from.y, 6);
        if (tgt) { g.grenadeT = 11 - g.up.grenade * 1.4; enemyShot('grenade', from.x, from.y, tgt.x, tgt.y, { dur: 0.8 }); sfx.throw(); } else g.grenadeT = 1;
      }
    }
    for (let i = g.fires.length - 1; i >= 0; i--) {
      const f = g.fires[i]; f.t -= dt; f.tick -= dt;
      E.flame(f.x, f.y, 0.95);
      if (f.tick <= 0) { f.tick = 0.25; g.hash.query(f.x, f.y, 1.6, z => { if (Math.hypot(z.x - f.x, z.y - f.y) < 0.95 + z.r * 0.5) damageZombie(z, 0.9 * dmgMul(), 0, 0, true); }); }
      if (f.t <= 0) { g.fires.splice(i, 1); E.scorch(f.x, f.y); }
    }
    for (let i = g.turrets.length - 1; i >= 0; i--) {
      const tr = g.turrets[i]; tr.t -= dt; tr.fireT -= dt; tr.muzzle = Math.max(0, tr.muzzle - dt);
      if (tr.fireT <= 0) { const z = g.hash.nearest(tr.x, tr.y, 4.5, z => canSee(tr, z)); if (z) { tr.fireT = 0.25; shoot(tr, z, { range: 4.5, speed: 15, dmg: 1, pellets: 1, spread: 0.06, kind: 0 }); } else tr.fireT = 0.1; }
      if (tr.t <= 0) { g.turrets.splice(i, 1); E.puff(tr.x, tr.y); }
    }
    const B = g.bullets;
    for (let i = B.count - 1; i >= 0; i--) {
      const b = B.items[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; b.spin += dt * 20;
      if (world.isTall(Math.floor(b.x), Math.floor(b.y))) { E.spark(b.x, b.y, b.z); B.kill(i); continue; }
      let gone = false;
      for (const br of g.barrels) if (br.alive && Math.hypot(br.x - b.x, br.y - b.y) < 0.4) { br.hp -= 1; br.flash = 0.1; E.spark(b.x, b.y, 0.4); if (br.hp <= 0) explodeBarrel(br); B.kill(i); gone = true; break; }
      if (gone) continue;
      const hit = g.hash.nearest(b.x, b.y, 1.4, z => !z.dead && z !== b.last && Math.hypot(z.x - b.x, z.y - b.y) < 0.3 + z.r * 0.4);
      if (hit) {
        const s = Math.hypot(b.vx, b.vy);
        damageZombie(hit, b.dmg, b.vx / s * (b.kind === 1 ? 1.5 : 2.2), b.vy / s * (b.kind === 1 ? 1.5 : 2.2), false, b.x - b.vx * 0.1, b.y - b.vy * 0.1);
        sfx.hit();
        if (b.bounce > 0) {
          const next = g.hash.nearest(b.x, b.y, 2.6, z => !z.dead && z !== hit);
          if (next) { b.bounce--; b.last = hit; const dx = next.x - b.x, dy = next.y - b.y, dd = Math.hypot(dx, dy) || 1; b.vx = dx / dd * s; b.vy = dy / dd * s; b.life = 0.5; continue; }
        }
        if (b.pierce > 0) { b.pierce--; b.last = hit; } else { B.kill(i); continue; }
      }
      if (b.life <= 0) B.kill(i);
    }
  }

  /* ---------------- enemy projectiles and hazards ---------------- */
  function projectilesUpdate(dt) {
    const L = g.leader, S = g.shots;
    for (let i = S.count - 1; i >= 0; i--) {
      const s = S.items[i]; s.t += dt; s.spin += dt * 12;
      if (s.kind === 'spit' || s.kind === 'parcel' || s.kind === 'grenade') {
        const k = Math.min(1, s.t / s.dur);
        s.x = s.sx + (s.tx - s.sx) * k; s.y = s.sy + (s.ty - s.sy) * k; s.z = 0.6 + Math.sin(k * Math.PI) * 2.2;
        if (k >= 1) {
          S.kill(i);
          if (s.kind === 'spit') { g.puddles.push({ x: s.x, y: s.y, t: 5, hit: new Set() }); g.effects.burst(s.x, s.y, '#9bd068', 6); sfx.splat(); }
          else if (s.kind === 'parcel') blast(s.x, s.y, 1, 4, 'parcel');
          else blast(s.x, s.y, 1.5, 9, 'grenade');
        }
        continue;
      }
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; s.z = 0.7;
      if (world.isTall(Math.floor(s.x), Math.floor(s.y)) || s.life <= 0) { S.kill(i); continue; }
      if (Math.hypot(L.x - s.x, L.y - s.y) < 0.4) { hurtLeader(); if (s.kind === 'bullet') { S.kill(i); continue; } }
      for (let j = 0; j < g.line.length; j++) if (Math.hypot(g.line[j].x - s.x, g.line[j].y - s.y) < 0.35) { breakLine(j, 'panic'); if (s.kind === 'bullet') S.kill(i); break; }
    }
  }
  function hazardsUpdate(dt) {
    const L = g.leader;
    for (let i = g.puddles.length - 1; i >= 0; i--) {
      const p = g.puddles[i]; p.t -= dt;
      if (Math.hypot(L.x - p.x, L.y - p.y) < 0.6) hurtLeader();
      for (let j = 0; j < g.line.length; j++) { const f = g.line[j]; if (!p.hit.has(f) && Math.hypot(f.x - p.x, f.y - p.y) < 0.55) { p.hit.add(f); breakLine(j, 'panic'); break; } }
      if (p.t <= 0) g.puddles.splice(i, 1);
    }
    for (let i = g.markers.length - 1; i >= 0; i--) { const mk = g.markers[i]; mk.t -= dt; if (mk.t <= 0) { g.markers.splice(i, 1); blast(mk.x, mk.y, 1.4, 8, 'missile'); } }
    for (const mn of g.mines) {
      if (!mn.alive) continue;
      let boom = Math.hypot(L.x - mn.x, L.y - mn.y) < 0.4;
      if (!boom) g.hash.query(mn.x, mn.y, 0.6, z => { if (Math.hypot(z.x - mn.x, z.y - mn.y) < 0.4) boom = true; });
      if (boom) { mn.alive = false; blast(mn.x, mn.y, 1.6, 12, 'mine'); }
    }
  }
  function pickupsUpdate(dt) {
    const L = g.leader, mag = 1.5 * (1 + 0.45 * g.up.magnet) * (1 + 0.4 * (camp.magnet || 0));
    const P = g.pickups;
    for (let i = P.count - 1; i >= 0; i--) {
      const b = P.items[i]; b.t += dt;
      if (b.z > 0 || b.vz > 0) { b.vz -= 9.8 * dt; b.z = Math.max(0, b.z + b.vz * dt); b.x += b.vx * dt; b.y += b.vy * dt; if (b.z === 0) { b.vz = 0; b.vx = b.vy = 0; } }
      if (b.kind === 'crate') { if (Math.hypot(L.x - b.x, L.y - b.y) < 0.7) { P.kill(i); openCrate(b); } continue; }
      const dx = L.x - b.x, dy = L.y - b.y, d = Math.hypot(dx, dy);
      if (d < mag || b.mag) { b.mag = true; const sp = 3 + b.t * 4; b.x += dx / (d || 1) * Math.min(d, sp * dt); b.y += dy / (d || 1) * Math.min(d, sp * dt); }
      if (d < 0.35) {
        P.kill(i);
        if (b.kind === 'brain') { gainXP(b.value); if (g.state === 'levelup') break; }
        else if (b.kind === 'can') { g.cansEarned += b.value; sfx.coin(); feel.pick(); g.effects.number(L.x, L.y, '+' + b.value, '#c9ccd3'); }
        else if (b.kind === 'medkit') { if (L.hearts < MAX_HEARTS) L.hearts++; sfx.heal(); feel.join(); g.effects.heal(L.x, L.y); }
      }
    }
    g.crateT -= dt;
    if (g.crateT <= 0) { g.crateT = 55; const p = freeSpot(5, 14, false); if (p) { drop('crate', p[0], p[1]); g.banner = { text: 'SUPPLY DROP NEARBY', t: 1.6 }; } }
  }
  function openCrate(b) {
    const pool = UPGRADES.filter(u => g.up[u.id] < (u.max || 5) && !(u.id === 'heart' && g.leader.hearts >= MAX_HEARTS));
    if (!pool.length) return;
    const u = pool[Math.floor(Math.random() * pool.length)];
    g.pickCard(u, true);
    g.effects.number(b.x, b.y, u.name + '!', '#f4d35e'); g.effects.sparkle(b.x, b.y); sfx.levelup(); feel.levelup();
  }

  /* ---------------- objectives ---------------- */
  function objectiveUpdate(dt) {
    const L = g.leader, o = g.obj;
    if (o.type === 'survive' || o.type === 'defend') {
      if (o.left > 0) { o.left = Math.max(0, o.left - dt); if (o.left === 0) { if (o.type === 'survive') { g.heli = { x: L.x + 6, y: L.y - 6, z: 9, t: 0 }; g.banner = { text: 'THE CHOPPER IS HERE!', t: 2 }; sfx.chopper(); } else end(true); } }
      if (g.heli) { g.heli.t += dt; g.heli.x += (L.x - g.heli.x) * dt * 2; g.heli.y += (L.y - g.heli.y) * dt * 2; g.heli.z = Math.max(1.2, 9 - g.heli.t * 4); if (g.heli.t > 2.4) end(true); }
      if (g.tower && g.tower.hp <= 0) end(false, 'THE RADIO TOWER FELL');
      if (g.tower) g.tower.flash = Math.max(0, g.tower.flash - dt);
    }
    if (o.type === 'rescue' && !g.extractOn && g.rescued >= o.count) { g.extractOn = true; g.banner = { text: 'GET TO THE FLARE!', t: 2 }; sfx.levelup(); }
    if ((o.type === 'rescue' || o.type === 'escape') && g.extractOn && world.extract) {
      g.effects.flare(world.extract[0], world.extract[1]);
      if (Math.hypot(L.x - world.extract[0], L.y - world.extract[1]) < 1.4) end(true);
    }
    if (g.bus) {
      const b = g.bus, dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy);
      let blockedAhead = false;
      g.hash.query(b.x + 2.2, b.y + 0.4, 0.8, z => { if (Math.hypot(z.x - b.x - 2.2, z.y - b.y - 0.4) < 0.8) blockedAhead = true; });
      const sp = blockedAhead ? 0.12 : 0.55;
      if (d > 0.1) { b.x += dx / d * sp * dt; b.y += dy / d * sp * dt; }
      b.flash = Math.max(0, b.flash - dt);
      if (d < 0.4) end(true);
      if (b.hp <= 0) end(false, 'THE BUS WAS OVERRUN');
    }
  }
  function director(dt) {
    g.spawnT -= dt;
    const mul = mods.has('double') ? 2 : 1;
    const target = g.mode === 'endless' ? Math.min(260, 14 + g.time / 4) : Math.min(zcfg.max * mul, (zcfg.start + Math.floor(g.time / 20) * zcfg.grow) * mul);
    if (g.spawnT <= 0 && g.zombies.count < target) { g.spawnT = Math.max(0.12, 0.5 - g.time / 600); spawnZombie(7, 24); }
  }

  function gainXP(v = 1) {
    g.pickStreak = g.time - g.lastPick < 0.6 ? g.pickStreak + 1 : 0; g.lastPick = g.time;
    sfx.pick(g.pickStreak); feel.pick();
    g.xp += v;
    if (g.xp >= g.xpNeed) {
      g.xp -= g.xpNeed; g.level++; g.xpNeed = Math.round(6 + g.level * 3.5);
      g.rollCards();
      g.state = 'levelup'; sfx.levelup(); feel.levelup();
    }
  }
  g.reroll = () => { if (g.rerolls <= 0) return; g.rerolls--; g.rollCards(); };
  g.rollCards = () => {
    const pool = UPGRADES.filter(u => g.up[u.id] < (u.max || 5) && !(u.id === 'heart' && g.leader.hearts >= MAX_HEARTS));
    g.cards = pool.sort(() => Math.random() - 0.5).slice(0, 3);
  };
  g.pickCard = (u, fromCrate) => {
    g.up[u.id]++;
    if (u.id === 'heart') g.leader.hearts = Math.min(MAX_HEARTS, g.leader.hearts + 1);
    if (u.id === 'tough') for (const f of g.line) f.tough = Math.max(f.tough, g.up.tough);
    if (!fromCrate) { g.cards = null; g.state = 'play'; g.leader.invuln = Math.max(g.leader.invuln, 0.8); }
  };
  g.maxHearts = MAX_HEARTS; g.maxLine = MAX_LINE;

  /* ---------------- title screen demo ---------------- */
  function titleUpdate(dt) {
    g.time += dt; g.titleT += dt;
    const cx = world.w / 2 + Math.cos(g.titleT * 0.05) * 8, cy = world.h / 2 + Math.sin(g.titleT * 0.05) * 8, [sx, sy] = toScreen(cx, cy);
    g.cam.x += (sx - g.cam.x) * Math.min(1, dt * 2); g.cam.y += (sy - g.cam.y) * Math.min(1, dt * 2);
    const Z = g.zombies;
    for (let i = 0; i < Z.count; i++) {
      const z = Z.items[i]; z.px = z.x; z.py = z.y; z.wob += dt;
      if (Math.random() < dt * 0.3) { z.wx = Math.random() - 0.5; z.wy = Math.random() - 0.5; }
      const l = Math.hypot(z.wx, z.wy) || 1, vx = z.wx / l * z.speed * 0.6, vy = z.wy / l * z.speed * 0.6;
      move(world, z, vx * dt, vy * dt, z.r);
      const [fx2, fy2] = toScreen(vx, vy); z.face = faceFrom(fx2, fy2); z.anim += dt * z.speed * 0.6;
    }
    for (const s of g.others) s.bob += dt * 6;
  }

  g.reset(opts.mode === 'title' ? 'title' : 'play');
  return g;
}
