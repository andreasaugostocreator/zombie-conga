// Exports icons/icon-{1024,512,192,180}.png from tools/icon.html (pixel-art, nearest-neighbour scaled).
// Needs a local server on :8080 from the repo root.
import { chromium } from 'playwright-core';
import fs from 'fs';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage();
await page.goto('http://localhost:8080/tools/icon.html');
await page.waitForFunction(() => window.done);
for (const size of [1024, 512, 192, 180]) {
  const data = await page.evaluate(size => {
    const src = document.getElementById('c'), c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, size, size);
    return c.toDataURL('image/png').split(',')[1];
  }, size);
  fs.writeFileSync(`icons/icon-${size}.png`, Buffer.from(data, 'base64'));
}
console.log('icons written');
await browser.close();
