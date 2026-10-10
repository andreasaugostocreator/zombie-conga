// Screenshots at iPhone size with real touch input. Usage: node tools/shoot.mjs [outDir]
// Needs a local server: python3 -m http.server 8080 (run from the repo root).
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
await page.screenshot({ path: `${out}/1-start.png` });
// Drag the joystick with CDP touch events: down at the bottom centre, then up-right.
const cdp = await page.context().newCDPSession(page);
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
await touch('touchStart', 200, 650);
for (let i = 1; i <= 10; i++) { await touch('touchMove', 200 + i * 4, 650 - i * 4); await page.waitForTimeout(16); }
await page.waitForTimeout(1600);
await page.screenshot({ path: `${out}/2-moving.png` });
for (let i = 1; i <= 10; i++) { await touch('touchMove', 240 - i * 9, 610 + i * 2); await page.waitForTimeout(16); }
await page.waitForTimeout(2200);
await page.screenshot({ path: `${out}/3-fighting.png` });
await touch('touchEnd');
const state = await page.evaluate(() => { const g = window.__game; return { kills: g.kills, hearts: g.leader.hearts, zombies: g.zombies.count, x: g.leader.x.toFixed(2), y: g.leader.y.toFixed(2), state: g.state }; });
console.log(JSON.stringify(state));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
