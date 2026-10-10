import { STEP } from './config.js';
import { createScreen } from './render/screen.js';
import { createInput } from './engine/input.js';
import { SUBURBS } from './render/palette.js';
import * as S from './render/sprites.js';
import { buildWorld } from './world/map.js';
import suburbsTest from './world/maps/suburbs-test.js';
import { createGame, UPGRADES } from './game.js';
import { createRenderer } from './render/renderer.js';
import { createHud } from './ui/hud.js';
import { createUI } from './ui/ui.js';
import { titleScreen, settingsScreen, pauseScreen, levelUpScreen, deadScreen } from './ui/screens.js';
import { unlock, suspend, sfx, audio } from './audio/sfx.js';
import { load, save } from './save.js';

const DEBUG = new URLSearchParams(location.search).has('debug');
const screen = createScreen(document.getElementById('game'));
const ui = createUI(screen, () => sfx.click());
const input = createInput(screen, ui);
const pal = SUBURBS;
const data = load();

// Build every sprite once, up front. Nothing is redrawn pixel by pixel during play.
const ZOMBIE_LOOKS = 6;
const icons = Object.fromEntries(['rate', 'damage', 'pierce', 'speed', 'magnet', 'heart', 'tough', 'saw', 'molotov', 'radar', 'conga', 'pause', 'gear', 'dash'].map(k => [k, S.makeIcon(k)]));
const sheets = {
  leader: S.makeCharacter(S.copLook()),
  zombies: Array.from({ length: ZOMBIE_LOOKS }, (_, i) => S.makeCharacter(S.zombieLook(i))),
  survivors: Object.fromEntries(['cop', 'farmer', 'chef', 'grandma', 'nurse'].map(c => [c, S.makeCharacter(S.survivorLook(c))])),
  shadow: S.makeShadow(12, 5), heart: S.makeHeart(true), heartEmpty: S.makeHeart(false), skull: S.makeSkull(), muzzle: S.makeMuzzle(),
  brain: S.makeBrain(), brainGlow: S.makeBrainGlow(), help: S.makeHelpBubble('#e2384a'), panic: S.makeHelpBubble('#f4d35e'),
  barrel: S.makeBarrel(), saw: [0, 1, 2, 3].map(S.makeSaw), knife: [0, 1, 2, 3, 4, 5, 6, 7].map(S.makeKnife), icons,
};
sheets.leaderGhost = sheets.leader.ghost;
const world = buildWorld(suburbsTest, pal);
const game = createGame(world, pal, ZOMBIE_LOOKS);
game.view = { get w() { return screen.w; }, get h() { return screen.h; } };
const render = createRenderer(screen, world, sheets, pal);
const hud = createHud(screen, sheets, ui);
window.__game = game; window.__ui = ui; window.__UPGRADES = UPGRADES; window.__screen = screen; // handy for the screenshot tool and debugging

function applySettings() {
  const st = data.settings;
  audio.enabled = st.sfx; audio.vibration = st.vibration;
  game.effects.reduced = st.reduceFx; game.settings.shake = st.reduceFx ? 0.35 : 1;
}
applySettings();
let overlay = null;      // 'settings' on top of title or pause
let newBest = false;
game.onDeath = () => {
  const b = data.best; newBest = game.kills > b.kills;
  data.best = { kills: Math.max(b.kills, game.kills), time: Math.max(b.time, game.time), line: Math.max(b.line, game.bestLine) };
  save(data);
};

// First touch or key unlocks audio (iOS requirement).
const unlockOnce = () => unlock();
addEventListener('pointerdown', unlockOnce); addEventListener('keydown', unlockOnce);

// Debug keys (?debug): H hitboxes, G god mode, Z spawn ten walkers, X fill the XP bar.
if (DEBUG) addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'h') game.debug.hitbox = !game.debug.hitbox;
  if (k === 'g') game.debug.god = !game.debug.god;
  if (k === 'z') for (let i = 0; i < 10; i++) game.spawnZombie(6, 14);
});

function startRun() { game.reset('play'); input.release(); }
function toTitle() { game.reset('title'); input.release(); }

// Fixed 60 Hz updates, interpolated rendering, paused while the app is in the background.
let acc = 0, last = performance.now(), hidden = false, frames = 0, fpsT = last, fps = 0, t = 0;
document.addEventListener('visibilitychange', () => {
  hidden = document.hidden; suspend(hidden); last = performance.now(); acc = 0;
  if (hidden && game.state === 'play') { game.state = 'paused'; input.release(); }
});
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000); last = now; t += dt;
  input.joystickEnabled = game.state === 'play' && !overlay;
  if (input.takePause()) {
    if (overlay) overlay = null;
    else if (game.state === 'play') { game.state = 'paused'; input.release(); }
    else if (game.state === 'paused') game.state = 'play';
  }
  if (!hidden) {
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 5) { input.update(); game.update(STEP, input); acc -= STEP; steps++; }
    if (steps === 5) acc = 0;
  }
  render(game, acc / STEP, input);
  ui.begin();
  if (game.state === 'title' && !overlay) {
    const r = titleScreen(screen, ui, t, data.best);
    if (r.play) startRun();
    if (r.settings) overlay = 'settings';
  } else if (game.state === 'play' || game.state === 'paused' || game.state === 'levelup' || game.state === 'dead') {
    const h = hud(game, input, data.settings.fps || DEBUG ? fps : null);
    if (h.pause && game.state === 'play') { game.state = 'paused'; input.release(); }
    if (h.dash) input.dash = true;
    if (game.state === 'paused' && !overlay) {
      const r = pauseScreen(screen, ui);
      if (r.resume) game.state = 'play';
      if (r.settings) overlay = 'settings';
      if (r.quit) toTitle();
    }
    if (game.state === 'levelup') { input.release(); const card = levelUpScreen(screen, ui, game, icons, t); if (card) game.pickCard(card); }
    if (game.state === 'dead') {
      const r = deadScreen(screen, ui, game, data.best, newBest);
      if (r.retry) startRun();
      if (r.menu) toTitle();
    }
  }
  if (overlay === 'settings') {
    const r = settingsScreen(screen, ui, data.settings);
    if (r.changed) { applySettings(); save(data); }
    if (r.back) overlay = null;
  }
  ui.end();
  frames++; if (now - fpsT > 500) { fps = Math.round(frames * 1000 / (now - fpsT)); frames = 0; fpsT = now; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
