import { webkit } from 'playwright-core';
const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', e => errors.push(e.message + '\n' + e.stack)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:8080/?debug');
await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(1200);
const tp = page.touchscreen;
const touch = async () => {};
const button = id => page.evaluate(id => { const r = window.__ui.prevRects.find(r => r.id === id), s = window.__screen, k = s.scale / devicePixelRatio; if (!r) throw new Error('no button ' + id + ': ' + window.__ui.prevRects.map(r => r.id)); return [(r.x + r.w / 2) * k, (r.y + r.h / 2) * k]; }, id);
const press = async id => { const [x, y] = await button(id); await page.touchscreen.tap(x, y); await page.waitForTimeout(300); };
for (const i of [5, 11, 17]) {
  await page.evaluate(async i => { const { LEVELS } = await import('./src/data/levels.js'); window.__play(LEVELS[i]); }, i);
  await page.evaluate(() => { const g = window.__game; g.debug.god = true; g.others.filter(s => s.state === 'stranded').forEach(s => { s.x = s.px = g.leader.x + 0.4; s.y = s.py = g.leader.y; }); });
  await page.waitForFunction(() => window.__game.boss, null, { timeout: 15000 });
  // bring the boss close with low hp so the line shoots it dead
  for (let k = 0; k < 120; k++) {
    const st = await page.evaluate(() => { const g = window.__game; if (g.state === 'levelup') g.pickCard(g.cards[0]); for (let i = 0; i < g.zombies.count; i++) { const z = g.zombies.items[i]; if (z.boss && !z.dead) { z.hp = Math.min(z.hp, 3); z.x = g.leader.x + 2; z.y = g.leader.y + 1; } } return g.state + ' ' + g.line.length; });
    if (st.startsWith('won') || st.startsWith('failed')) { console.log(i, st, k); break; }
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(2500);
  await press('nextlv'); await page.waitForTimeout(2500);
  console.log(' after next:', await page.evaluate(() => window.__game.state + ' ' + window.__game.level?.id));
  await page.screenshot({ path: process.env.TMPDIR + '/zc/next-' + i + '.png' });
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
