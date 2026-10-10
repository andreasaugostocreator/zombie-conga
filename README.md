# Zombie Conga

Top-down survival in a zombie apocalypse: lead a conga line of survivors who all shoot on their own.
Isometric pixel art, all drawn in code. Plain HTML + JavaScript modules, no build step.

**Status: Phase 1** (engine and look): isometric renderer, Suburbs test map, leader with floating
joystick, auto-firing pistol, walkers.

## Play locally

```sh
cd zombie-conga
python3 -m http.server 8080
```
Open http://localhost:8080. Move with WASD / arrow keys, or click and drag.
Add `?debug` to the URL for an FPS counter and debug keys: **H** hitboxes, **G** god mode, **Z** spawn ten walkers.

## Deploy to GitHub Pages

1. Create a repository on GitHub (for example `zombie-conga`) and push this folder to it.
2. On GitHub: **Settings › Pages › Build and deployment**: Source **Deploy from a branch**, branch **main**, folder **/ (root)**. Save.
3. After a minute the game is live at `https://<your-username>.github.io/zombie-conga/`.
   All paths are relative, so it works from that sub-folder.

## Add it to your iPhone home screen

1. Open the link in **Safari**.
2. Tap **Share**, then **Add to Home Screen**, then **Add**.
3. Start it from the new icon: it runs full-screen in portrait.

## Code layout

| Path | What |
|---|---|
| `src/main.js` | Boot, fixed 60 Hz update loop with interpolated rendering, pause in background |
| `src/game.js` | Game state: leader, zombies, bullets, spawning, damage |
| `src/render/iso.js` | Iso projection and the box rasteriser (top / left / right faces, shaded in world space) |
| `src/render/sprites.js` | Every sprite, generated once at startup: characters, houses, trees, cars, props |
| `src/render/ground.js` | Bakes the whole map's ground (and static shadows) into one canvas |
| `src/render/renderer.js` | Depth-sorted drawing, see-through occluders, effects |
| `src/world/maps/*.js` | Hand-editable maps (ASCII ground + buildings + objects), format documented at the top |
| `src/engine/` | Input (floating joystick), spatial hash, object pools, RNG |
| `tools/shoot.mjs` | Headless screenshots at iPhone size (`npm install`, then `npm run shots`) |
| `tools/make-icons.mjs` | Renders the app icons from the game's own sprites |
