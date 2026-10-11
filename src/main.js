import { STEP } from './config.js';
import { createScreen } from './render/screen.js';
import { createInput } from './engine/input.js';
import { REGIONS } from './render/palette.js';
import * as S from './render/sprites.js';
import * as P from './render/props.js';
import { toScreen } from './render/iso.js';
import { buildWorld } from './world/map.js';
import { generateMap } from './world/gen.js';
import suburbsTest from './world/maps/suburbs-test.js';
import { createGame, UPGRADES } from './game.js';
import { createRenderer } from './render/renderer.js';
import { createHud } from './ui/hud.js';
import { createUI } from './ui/ui.js';
import { titleScreen, settingsScreen, pauseScreen, levelUpScreen, mapScreen, levelCard, resultsScreen, campScreen, awardsScreen, dailyCard } from './ui/screens.js';
import { unlock, suspend, sfx, audio } from './audio/sfx.js';
import { music } from './audio/music.js';
import { haptics, feel } from './engine/haptics.js';
import { load, save, applyResult, buyCamp, buyClass, dailyInfo, nextLevelIndex, endlessUnlocked } from './progress.js';
import { LEVELS, levelIndex } from './data/levels.js';
import { CLASSES } from './data/classes.js';
import { BOSSES } from './data/enemies.js';

const DEBUG = new URLSearchParams(location.search).has('debug');
const screen = createScreen(document.getElementById('game'));
const ui = createUI(screen, () => { sfx.click(); feel.ui(); });
const input = createInput(screen, ui);
const data = load();

/* ---------------- sprites, built once ---------------- */
const ZOMBIE_LOOKS = 6;
const ICONS = ['rate', 'damage', 'pierce', 'speed', 'magnet', 'heart', 'tough', 'saw', 'molotov', 'radar', 'ricochet', 'medic', 'barbed', 'grenade', 'recruits',
  'star', 'skull', 'flame', 'can', 'lock', 'map', 'camp', 'conga', 'pause', 'gear', 'dash', 'back'];
const icons = Object.fromEntries(ICONS.map(k => [k, S.makeIcon(k)]));
const withFlash = spr => ({ ...spr, flash: S.flashCopy(spr.canvas) });
const centred = (spr, lx, ly) => { const [sx, sy] = toScreen(lx / 2, ly / 2); return { ...withFlash(spr), cx: spr.ax - sx, cy: spr.ay - sy }; };
const TANK = ['#4a4f5a', '#3a3e48', '#2b2e36'];
const sheets = {
  leader: S.makeCharacter(S.copLook()),
  zombies: Array.from({ length: ZOMBIE_LOOKS }, (_, i) => S.makeCharacter(S.zombieLook(i))),
  survivors: Object.fromEntries(Object.keys(CLASSES).map(c => [c, S.makeCharacter(S.survivorLook(c))])),
  zt: {
    ...Object.fromEntries(['runner', 'spitter', 'screamer', 'riot', 'fish', 'elf', 'bloater'].map((t, i) => [t, S.makeCharacter(S.zombieTypeLook(t, i))])),
    brute: S.scaleSheet(S.makeCharacter(S.zombieTypeLook('brute', 2)), 2), dog: S.makeDog(), crawler: S.makeCrawler(3),
  },
  boss: {
    ...Object.fromEntries(['mailman', 'santa', 'captain'].map(t => [t, S.scaleSheet(S.makeCharacter(S.zombieTypeLook(t)), BOSSES[t].scale)])),
    pz3: S.scaleSheet(S.makeCharacter(S.zombieTypeLook('pz')), 3), pz2: S.scaleSheet(S.makeCharacter(S.zombieTypeLook('pz')), 2), pz1: S.makeCharacter(S.zombieTypeLook('pz')),
  },
  tank: { x: centred(P.makeVan(TANK, 'x', 1.9, '#e2384a', 0.8), 1.9, 0.86), y: centred(P.makeVan(TANK, 'y', 1.9, '#e2384a', 0.8), 0.86, 1.9) },
  mech: [0, 1].map(S.makeMech), hive: [0, 1].map(S.makeHive),
  busX: withFlash(P.makeVan(['#f2b632', '#d39a22', '#a87818'], 'x', 2.6, '#2a2230', 0.75)), busY: withFlash(P.makeVan(['#f2b632', '#d39a22', '#a87818'], 'y', 2.6, '#2a2230', 0.75)),
  tower: P.makeRadioTower(), heli: S.makeHelicopter(), turret: S.makeTurret(), crate: S.makeSupplyCrate(),
  can: S.makeCan(), medkit: S.makeMedkit(), parcel: S.makeParcel(), anchor: S.makeAnchor(), puddle: S.makePuddle(),
  shadow: S.makeShadow(12, 5), heart: S.makeHeart(true), heartEmpty: S.makeHeart(false), skull: S.makeSkull(), muzzle: S.makeMuzzle(),
  brain: S.makeBrain(), brainGlow: S.makeBrainGlow(), help: S.makeHelpBubble('#e2384a'), panic: S.makeHelpBubble('#f4d35e'),
  barrel: S.makeBarrel(), saw: [0, 1, 2, 3].map(S.makeSaw), knife: [0, 1, 2, 3, 4, 5, 6, 7].map(S.makeKnife), icons,
};
sheets.leaderGhost = sheets.leader.ghost;
sheets.bus = sheets.busX;
const hud = createHud(screen, sheets, ui);

/* ---------------- worlds ---------------- */
const worldCache = new Map();
function worldFor(region, seed, map) {
  const key = map || region + ':' + seed;
  if (!worldCache.has(key)) {
    if (worldCache.size > 3) worldCache.delete(worldCache.keys().next().value);
    const pal = REGIONS[region];
    worldCache.set(key, { world: buildWorld(map === 'suburbs-test' ? suburbsTest : generateMap(region, seed), pal), pal });
  }
  const w = worldCache.get(key);
  // Barrels and the tower mark tiles solid at runtime; start from a clean copy each run.
  if (!w.solid0) w.solid0 = w.world.solid.slice(); else w.world.solid.set(w.solid0);
  return w;
}
let game = null, render = null;
const view = { get w() { return screen.w; }, get h() { return screen.h; } };
function startGame(mode, level, mods) {
  const region = level ? level.region : mode === 'endless' ? run.endlessRegion : 0;
  const { world, pal } = mode === 'title' ? worldFor(0, 0, 'suburbs-test') : worldFor(region, level ? level.seed : run.endlessSeed, level && level.map);
  game = createGame(world, { pal, level, mode, mods: mods || new Set(), camp: mode === 'title' ? {} : data.camp, classes: data.classes, zombieLooks: ZOMBIE_LOOKS });
  game.view = view;
  if (game.bus) sheets.bus = Math.abs(game.bus.tx - game.bus.x) >= Math.abs(game.bus.ty - game.bus.y) ? sheets.busX : sheets.busY;
  render = createRenderer(screen, world, sheets, pal);
  game.onEnd = res => {
    run.ach = applyResult(data, mode, level, game, res); run.starSfx = [];
    if (run.ach.length) setTimeout(() => sfx.levelup(), 900);
  };
  applySettings(); input.release();
  music.play(mode === 'title' ? 7 : region);
  window.__game = game;
}
const run = { mode: 'title', level: null, mods: null, ach: [], starSfx: [], endlessRegion: 0, endlessSeed: 1 };
function play(mode, level, mods) { run.mode = mode; run.level = level; run.mods = mods; scene = 'game'; overlay = null; startGame(mode, level, mods); }
function toMenu(next) { scene = next; overlay = null; if (!game || game.mode !== 'title') startGame('title'); }

function applySettings() {
  const st = data.settings;
  audio.enabled = st.sfx; audio.vibration = false; music.enabled = st.music; haptics.enabled = st.haptics;
  if (game) { game.effects.reduced = st.reduceFx; game.settings.shake = st.reduceFx ? 0.35 : 1; }
}
let scene = 'title', overlay = null, card = null;
const mapState = { region: Math.floor(nextLevelIndex(data) / 6) }, campState = { tab: 0 }, awardState = { page: 0 };
startGame('title');
if (DEBUG) window.__play = l => play('level', l);
window.__ui = ui; window.__UPGRADES = UPGRADES; window.__screen = screen; window.__data = data;

const unlockOnce = () => unlock();
addEventListener('pointerdown', unlockOnce); addEventListener('keydown', unlockOnce);

// Debug keys (?debug): H hitboxes, G god mode, Z ten zombies, X fill XP, C +500 cans, W win, L lose, N clear all levels, 1-9 spawn types.
if (DEBUG) addEventListener('keydown', e => {
  const k = e.key.toLowerCase(), g = game;
  if (k === 'h') g.debug.hitbox = !g.debug.hitbox;
  if (k === 'g') g.debug.god = !g.debug.god;
  if (k === 'z') for (let i = 0; i < 10; i++) g.spawnZombie(6, 14);
  if (k === 'x') { g.xp = g.xpNeed - 0.5; }
  if (k === 'c') { data.cans += 500; save(data); }
  if (k === 'w') g.end(true);
  if (k === 'l') g.end(false, 'DEBUG');
  if (k === 'n') { for (const l of LEVELS) data.cleared[l.id] = true; save(data); }
  const types = ['runner', 'brute', 'bloater', 'spitter', 'crawler', 'screamer', 'riot', 'dog', 'fish'];
  if (k >= '1' && k <= '9') for (let i = 0; i < 3; i++) g.spawnZombie(5, 10, null, types[+k - 1]);
});

/* ---------------- frame loop: fixed 60 Hz updates, interpolated rendering ---------------- */
let acc = 0, last = performance.now(), hidden = false, frames = 0, fpsT = last, fps = 0, t = 0;
document.addEventListener('visibilitychange', () => {
  hidden = document.hidden; suspend(hidden); last = performance.now(); acc = 0;
  if (hidden && game.state === 'play' && scene === 'game') { game.state = 'paused'; input.release(); }
});
function frame(now) {
  requestAnimationFrame(frame); // first, so one bad frame can never freeze the game
  const dt = Math.min(0.25, (now - last) / 1000); last = now; t += dt;
  const inGame = scene === 'game';
  input.joystickEnabled = inGame && game.state === 'play' && !overlay;
  if (input.takePause()) {
    if (overlay) overlay = null;
    else if (card) card = null;
    else if (inGame && game.state === 'play') { game.state = 'paused'; input.release(); }
    else if (inGame && game.state === 'paused') game.state = 'play';
    else if (!inGame && scene !== 'title') scene = scene === 'map' ? 'title' : scene === 'camp' && run.back ? run.back : 'title';
  }
  if (!hidden) {
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 5) { input.update(); game.update(STEP, input); acc -= STEP; steps++; }
    if (steps === 5) acc = 0;
  }
  haptics.frame(input.pointerDown);
  render(game, acc / STEP, input);
  ui.begin();
  if (scene === 'title' && !overlay && !card) {
    const r = titleScreen(screen, ui, t, data, icons);
    if (r.play) { mapState.region = Math.floor(nextLevelIndex(data) / 6); scene = 'map'; }
    if (r.daily) card = { daily: true };
    if (r.endless) { run.endlessRegion = Math.floor(Math.random() * 7); run.endlessSeed = 500 + Math.floor(Math.random() * 400); play('endless', null); }
    if (r.camp) { run.back = 'title'; scene = 'camp'; }
    if (r.awards) scene = 'awards';
    if (r.settings) overlay = 'settings';
  } else if (scene === 'map') {
    const r = mapScreen(screen, ui, t, data, mapState, icons, DEBUG);
    if (!card) {
      if (r.back) scene = 'title';
      if (r.region !== undefined) mapState.region = r.region;
      if (r.pick) card = { level: r.pick };
    }
  } else if (scene === 'camp') {
    const r = campScreen(screen, ui, data, campState, icons, sheets, t);
    if (r.back) scene = run.back || 'title';
    if (r.buy) { if (buyCamp(data, r.buy)) { sfx.levelup(); feel.levelup(); } else sfx.block(); }
    if (r.cls) { if (buyClass(data, r.cls)) { sfx.join(5); feel.join(); } else sfx.block(); }
  } else if (scene === 'awards') {
    if (awardsScreen(screen, ui, data, awardState, icons).back) scene = 'title';
  } else if (inGame) {
    const h = hud(game, input, data.settings.fps || DEBUG ? fps : null);
    if (h.pause && game.state === 'play') { game.state = 'paused'; input.release(); }
    if (h.dash) input.dash = true;
    if (game.state === 'paused' && !overlay) {
      const r = pauseScreen(screen, ui);
      if (r.resume) game.state = 'play';
      if (r.settings) overlay = 'settings';
      if (r.quit) toMenu(run.mode === 'level' ? 'map' : 'title');
    }
    if (game.state === 'levelup') {
      input.release();
      const c = levelUpScreen(screen, ui, game, icons, t);
      if (c && c.id === 'none') { game.cards = null; game.state = 'play'; } else if (c) game.pickCard(c);
    }
    if (game.state === 'won' || game.state === 'failed') {
      const idx = run.level && run.mode === 'level' ? levelIndex(run.level.id) : -1;
      const next = idx >= 0 && idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
      const r = resultsScreen(screen, ui, game, data, t, { icons, ach: run.ach, next, starSfx: run.starSfx, onStar: i => { sfx.join(3 + i * 3); feel.join(); } });
      if (r.next) { mapState.region = next.region; play('level', next); }
      if (r.retry) {
        if (run.mode === 'daily') { const d = dailyInfo(); play('daily', d.level, new Set([d.mod.id])); }
        else if (run.mode === 'endless') play('endless', null);
        else play(run.mode, run.level, run.mods);
      }
      if (r.menu) toMenu(run.mode === 'level' ? 'map' : 'title');
      if (r.camp) { toMenu('camp'); run.back = run.mode === 'level' ? 'map' : 'title'; }
    }
  }
  if (card && !overlay) {
    const r = card.daily ? dailyCard(screen, ui, data, icons) : levelCard(screen, ui, card.level, data, icons);
    if (r.back) card = null;
    if (r.play) {
      const c = card; card = null;
      if (c.daily) { const d = dailyInfo(); play('daily', d.level, new Set([d.mod.id])); }
      else play('level', c.level);
    }
  }
  if (overlay === 'settings') {
    const r = settingsScreen(screen, ui, data.settings);
    if (r.changed) { applySettings(); save(data); }
    if (r.back) overlay = null;
  }
  ui.end();
  frames++; if (now - fpsT > 500) { fps = Math.round(frames * 1000 / (now - fpsT)); frames = 0; fpsT = now; }
}
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => {});
export { endlessUnlocked };
