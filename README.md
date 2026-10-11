# Zombie Conga

Top-down survival in a zombie apocalypse: lead a conga line of survivors who all shoot on their own.
Isometric pixel art, all drawn in code. Plain HTML + JavaScript modules, no build step.

**Status: all 5 phases done.**
- **Campaign:** 7 regions × 6 levels (Suburbs, Mall, Hospital, Downtown, Harbor, Military Base, Airport) on
  a world map. Objectives: survive until the chopper, rescue N then reach the flare, escort the bus, defend
  the radio tower, beat the boss. 3 stars per level (clear + two goals), cans as currency.
- **Enemies:** walker, runner, brute, bloater, spitter, crawler, screamer, riot shield, dogs, fish-men, elves,
  plus 7 bosses (Mailman, Mall Santa, Patient Zero, the Tank, the Captain, General Rot, the Hive).
- **Survivors:** 9 classes (cop, farmer, grandma, nurse, then chef, kid, firefighter, mechanic, soldier
  unlocked in Base Camp). Survivors level up the longer they stay in the line.
- **Progression:** Base Camp permanent upgrades, 15 run upgrades with rerolls, supply drops, 19 awards,
  a daily challenge with a modifier and streak, endless mode (after 3-6).
- **Feel:** night levels with dithered lighting, chiptune music per region, layered SFX, iPhone haptics
  (iOS 18+ via the system switch tick, Android via vibration), full-height layout including the home-bar area.
- **PWA:** manifest + service worker (network first, cache when offline), progress saved in localStorage.

## Play locally

```sh
cd zombie-conga
python3 -m http.server 8080
```
Open http://localhost:8080. Move with WASD / arrow keys, or click and drag. **Space** dashes
(on a phone: the DASH button or a second finger), **Esc / P** pauses.
Add `?debug` to the URL for an FPS counter, all levels unlocked, and debug keys: **H** hitboxes, **G** god mode,
**Z** ten walkers, **1-9** zombie types, **X** almost level up, **C** +500 cans, **W** / **L** win / lose the level,
**N** mark every level cleared. `preview.html?debug` shows the generated map of every region.

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
| `src/game.js` | One run: leader, conga line, zombie types, bosses, objectives, upgrades, pickups, scoring |
| `src/progress.js` | Save data (versioned, migrates v1), stars, Base Camp, unlocks, daily challenge, awards |
| `src/data/` | Levels, enemies, survivor classes, upgrades / camp / awards / daily modifiers |
| `src/world/gen.js` | Seeded map generator per region |
| `src/render/lighting.js` | Night darkness with dithered light pools |
| `src/audio/` | Synthesised SFX and the chiptune sequencer |
| `src/engine/haptics.js` | iPhone / Android haptics |
| `src/ui/` | HUD, title, world map, level card, results, Base Camp, awards, settings |
| `src/render/iso.js` | Iso projection and the box rasteriser (top / left / right faces, shaded in world space) |
| `src/render/sprites.js` | Every sprite, generated once at startup: characters, houses, trees, cars, props |
| `src/render/ground.js` | Bakes the whole map's ground (and static shadows) into one canvas |
| `src/render/renderer.js` | Depth-sorted drawing, see-through occluders, effects |
| `src/world/maps/*.js` | Hand-editable maps (ASCII ground + buildings + objects), format documented at the top |
| `src/engine/` | Input (floating joystick), spatial hash, object pools, RNG |
| `tools/shoot.mjs` | Headless playthrough at iPhone size with screenshots; `--levels` loads all 42 levels |
| `tools/make-icons.mjs` | Renders the app icons from the game's own sprites |
