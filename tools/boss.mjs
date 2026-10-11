// Kills each boss through normal damage and checks the results flow. Usage: node tools/boss.mjs [outDir]
import { chromium } from 'playwright-core';
import fs from 'fs';
const out = process.argv[2] || 'shots'; fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', e => errors.push(e.message + '\n' + e.stack)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(process.env.URL || 'http://localhost:8080/?debug');
await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(1200);
for (const idx of [5, 11, 17, 23, 29, 35, 41]) {
  await page.evaluate(async i => { const { LEVELS } = await import('./src/data/levels.js'); window.__play(LEVELS[i]); }, idx);
  await page.evaluate(() => { window.__game.debug.god = true; });
  await page.waitForFunction(() => window.__game.boss, null, { timeout: 15000 });
  for (let k = 0; k < 40; k++) {
    const st = await page.evaluate(() => { const g = window.__game; for (let i = 0; i < g.zombies.count; i++) { const z = g.zombies.items[i]; if (z.boss && !z.dead) g.damageZombie(z, 1e4, 0, 0); } if (g.extractOn) { g.leader.x = g.world.extract[0]; g.leader.y = g.world.extract[1]; } return g.state; });
    if (st !== 'play') break;
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1500);
  console.log(idx, await page.evaluate(() => window.__game.state));
  await page.screenshot({ path: `${out}/boss-${idx}.png` });
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
