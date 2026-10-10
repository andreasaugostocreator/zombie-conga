// Plays through the game at iPhone size with real touch input and saves screenshots.
// Usage: node tools/shoot.mjs [outDir]   (needs: python3 -m http.server 8080 from the repo root,
// or URL=https://.../zombie-conga/?debug to test the live site)
import { chromium } from 'playwright-core';
import fs from 'fs';
const out = process.argv[2] || 'shots';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(process.env.URL || 'http://localhost:8080/?debug');
await page.waitForTimeout(1500);
const cdp = await page.context().newCDPSession(page);
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
const tap = async (x, y) => { await touch('touchStart', x, y); await page.waitForTimeout(40); await touch('touchEnd'); await page.waitForTimeout(150); };
// Centre of the n-th UI button drawn last frame, in CSS pixels.
const button = id => page.evaluate(id => { const r = window.__ui.prevRects.find(r => r.id === id), s = window.__screen, k = s.scale / devicePixelRatio; if (!r) throw new Error('no button ' + id + ': ' + window.__ui.prevRects.map(r => r.id)); return [(r.x + r.w / 2) * k, (r.y + r.h / 2) * k]; }, id);
const shot = name => page.screenshot({ path: `${out}/${name}.png` });

await shot('1-title');
await tap(...await button('PLAY'));
await page.waitForTimeout(400);
// Bring three waiting survivors next to the leader to see the conga line form.
await page.evaluate(() => { const g = window.__game; g.others.filter(s => s.state === 'stranded').slice(0, 4).forEach((s, i) => { s.x = s.px = g.leader.x + 0.5 + i * 0.1; s.y = s.py = g.leader.y; }); });
await touch('touchStart', 200, 650);
for (let i = 1; i <= 10; i++) { await touch('touchMove', 200 + i * 4, 650 - i * 4); await page.waitForTimeout(16); }
await page.waitForTimeout(1800);
await shot('2-conga');
for (let i = 1; i <= 10; i++) { await touch('touchMove', 240 - i * 9, 610 + i * 2); await page.waitForTimeout(16); }
await page.waitForTimeout(2200);
await shot('3-fighting');
for (let k = 0; k < 120; k++) { const a = k / 12; await touch('touchMove', 200 + Math.cos(a) * 30, 650 + Math.sin(a) * 30); await page.waitForTimeout(80); }
await shot('3b-later');
console.log(JSON.stringify(await page.evaluate(() => { const g = window.__game; return { afterFight: true, kills: g.kills, xp: g.xp, level: g.level, line: g.line.length, hearts: g.leader.hearts, state: g.state }; })));
await touch('touchEnd');
// Level-up cards
await page.evaluate(() => { const g = window.__game; g.cards = window.__UPGRADES.slice(6, 9); g.state = 'levelup'; });
await page.waitForTimeout(300);
await shot('4-levelup');
await tap(...await button('card1'));
await page.waitForTimeout(800);
// Pause → settings
await tap(...await button('pause'));
await page.waitForTimeout(300);
await shot('5-paused');
await tap(...await button('SETTINGS'));
await page.waitForTimeout(300);
await shot('6-settings');
await tap(...await button('BACK'));
await page.waitForTimeout(200);
await page.evaluate(() => { const g = window.__game; g.state = 'play'; g.leader.hearts = 0; g.state = 'dead'; g.deadAt = g.time - 1; g.onDeath && g.onDeath(); });
await page.waitForTimeout(400);
await shot('7-dead');
const state = await page.evaluate(() => { const g = window.__game; return { kills: g.kills, line: g.line.length, rescued: g.rescued, up: Object.entries(g.up).filter(e => e[1]).map(e => e.join(':')).join(','), state: g.state }; });
console.log(JSON.stringify(state));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
