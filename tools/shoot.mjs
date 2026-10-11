// Plays through the game at iPhone size with real touch input and saves screenshots.
// Usage: node tools/shoot.mjs [outDir] [--levels]   (serve the repo root on :8080 first,
// or URL=https://.../zombie-conga/?debug to test the live site). --levels loads all 42 levels.
import { chromium } from 'playwright-core';
import fs from 'fs';
const out = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'shots';
const ALL = process.argv.includes('--levels');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(process.env.URL || 'http://localhost:8080/?debug');
await page.evaluate(() => localStorage.clear()); await page.reload();
await page.waitForTimeout(1500);
const cdp = await page.context().newCDPSession(page);
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
const tap = async (x, y) => { await touch('touchStart', x, y); await page.waitForTimeout(40); await touch('touchEnd'); await page.waitForTimeout(200); };
const button = id => page.evaluate(id => { const r = window.__ui.prevRects.find(r => r.id === id), s = window.__screen, k = s.scale / devicePixelRatio; if (!r) throw new Error('no button ' + id + ': ' + window.__ui.prevRects.map(r => r.id)); return [(r.x + r.w / 2) * k, (r.y + r.h / 2) * k]; }, id);
const press = async id => tap(...await button(id));
const shot = name => page.screenshot({ path: `${out}/${name}.png` });
const info = () => page.evaluate(() => { const g = window.__game; return { state: g.state, kills: g.kills, line: g.line.length, hearts: g.leader.hearts, z: g.zombies.count, obj: g.obj.type, t: Math.round(g.time) }; });

await shot('01-title');
await press('play'); await shot('02-map');
await press('lv1-1'); await shot('03-card');
await press('go'); await page.waitForTimeout(500);
await page.evaluate(() => { const g = window.__game; g.others.filter(s => s.state === 'stranded').slice(0, 4).forEach((s, i) => { s.x = s.px = g.leader.x + 0.5 + i * 0.1; s.y = s.py = g.leader.y; }); });
await touch('touchStart', 200, 650);
for (let i = 1; i <= 10; i++) { await touch('touchMove', 200 + i * 4, 650 - i * 4); await page.waitForTimeout(16); }
await page.waitForTimeout(2000); await shot('04-play');
for (let k = 0; k < 60; k++) { const a = k / 12; await touch('touchMove', 200 + Math.cos(a) * 30, 650 + Math.sin(a) * 30); await page.waitForTimeout(80); }
await touch('touchEnd');
console.log('play', JSON.stringify(await info()));
await page.evaluate(() => { const g = window.__game; g.xp = g.xpNeed - 0.1; g.rerolls = 1; });
await page.evaluate(() => { const g = window.__game; g.cards = window.__UPGRADES.slice(6, 9); g.state = 'levelup'; });
await page.waitForTimeout(300); await shot('05-levelup');
await press('card1'); await page.waitForTimeout(300);
await press('pause'); await shot('06-paused');
await press('SETTINGS'); await shot('07-settings');
await press('back'); await press('RESUME');
await page.evaluate(() => window.__game.end(true)); await page.waitForTimeout(2800); await shot('08-results');
await press('camp'); await page.evaluate(() => { window.__data.cans += 400; }); await page.waitForTimeout(200); await shot('09-camp');
await press('buyhearts'); await press('tabS'); await shot('10-camp-survivors');
await press('back'); await page.waitForTimeout(200); await shot('11-map-after');
await press('back'); await press('awards'); await shot('12-awards');
await press('back'); await press('daily'); await shot('13-daily');
await press('go'); await page.waitForTimeout(3000); await shot('14-daily-play');
console.log('daily', JSON.stringify(await info()));

// Every level loads and runs a few seconds; screenshot each boss and night level.
if (ALL) {
  for (let i = 0; i < 42; i++) {
    const r = await page.evaluate(async i => {
      const { LEVELS } = await import('./src/data/levels.js');
      return LEVELS[i].id;
    }, i);
    await page.evaluate(() => { const g = window.__game; if (g.state === 'play') g.end(false, 'next'); });
    await page.waitForTimeout(1200);
    await page.evaluate(() => { for (const id of ['menu', 'MENU']) { } });
    // Jump straight in via the map card.
    await page.evaluate(id => { window.__data.cleared = Object.fromEntries((window.__allIds || []).map(x => [x, true])); }, r);
    await page.evaluate(async i => { const { LEVELS } = await import('./src/data/levels.js'); window.__allIds = LEVELS.map(l => l.id); window.__play(LEVELS[i]); }, i);
    await page.evaluate(() => { const g = window.__game; g.debug.god = true; });
    await page.waitForTimeout(i % 6 === 5 ? 9000 : 2500);
    const s = await info(); console.log(r, JSON.stringify(s));
    if (i % 6 === 5 || i % 3 === 1) await shot(`L${r}`);
  }
}
console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].join('\n') : 'no errors');
await browser.close();
