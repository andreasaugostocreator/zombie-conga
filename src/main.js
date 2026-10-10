import { STEP } from './config.js';
import { createScreen } from './render/screen.js';
import { createInput } from './engine/input.js';
import { SUBURBS } from './render/palette.js';
import * as S from './render/sprites.js';
import { buildWorld } from './world/map.js';
import suburbsTest from './world/maps/suburbs-test.js';
import { createGame } from './game.js';
import { createRenderer } from './render/renderer.js';
import { createHud } from './ui/hud.js';
import { unlock, suspend } from './audio/sfx.js';

const DEBUG = new URLSearchParams(location.search).has('debug');
const screen = createScreen(document.getElementById('game'));
const input = createInput(screen);
const pal = SUBURBS;

// Build every sprite once, up front. Nothing is redrawn pixel by pixel during play.
const ZOMBIE_LOOKS = 6;
const sheets = {
  leader: S.makeCharacter(S.copLook()),
  zombies: Array.from({ length: ZOMBIE_LOOKS }, (_, i) => S.makeCharacter(S.zombieLook(i))),
  shadow: S.makeShadow(12, 5), heart: S.makeHeart(true), heartEmpty: S.makeHeart(false), skull: S.makeSkull(), muzzle: S.makeMuzzle(),
};
sheets.leaderGhost = sheets.leader.ghost;
const world = buildWorld(suburbsTest, pal);
const game = createGame(world, pal, ZOMBIE_LOOKS);
game.view = { get w() { return screen.w; }, get h() { return screen.h; } };
game.reset(); // re-spawn now that the view size is known
const render = createRenderer(screen, world, sheets, pal);
const hud = createHud(screen, sheets);
window.__game = game; // handy for the screenshot tool and debugging

// First touch or key unlocks audio (iOS requirement).
const unlockOnce = () => unlock();
addEventListener('pointerdown', unlockOnce); addEventListener('keydown', unlockOnce);

// Debug keys (?debug): H hitboxes, G god mode, Z spawn ten walkers.
if (DEBUG) addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'h') game.debug.hitbox = !game.debug.hitbox;
  if (k === 'g') game.debug.god = !game.debug.god;
  if (k === 'z') for (let i = 0; i < 10; i++) game.spawnZombie(6, 14);
});

// Fixed 60 Hz updates, interpolated rendering, paused while the app is in the background.
let acc = 0, last = performance.now(), paused = false, frames = 0, fpsT = last, fps = 0;
document.addEventListener('visibilitychange', () => { paused = document.hidden; suspend(paused); last = performance.now(); acc = 0; });
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000); last = now;
  if (!paused) {
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 5) { input.update(); game.update(STEP, input); acc -= STEP; steps++; }
    if (steps === 5) acc = 0;
  }
  render(game, acc / STEP, input);
  frames++; if (now - fpsT > 500) { fps = Math.round(frames * 1000 / (now - fpsT)); frames = 0; fpsT = now; }
  hud(game, input, DEBUG ? fps : null);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
