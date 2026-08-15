import { chromium, devices } from 'playwright';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'scripts', 'screenshots-prod');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...devices['iPhone 12'],
  locale: 'es-ES',
});
const page = await context.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CON', m.text());
});

await page.goto('http://127.0.0.1:8765/dev/harness.html', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForFunction(() => window.__zzOk === true || window.__zzErr, { timeout: 30000 });
const err = await page.evaluate(() => window.__zzErr || null);
if (err) {
  console.log('BOOT FAIL', err);
  process.exit(1);
}
await page.waitForTimeout(800);
await page.screenshot({ path: join(out, 'colony-d1-map.png') });

await page.click('#zz-open-pop');
await page.waitForTimeout(400);
await page.screenshot({ path: join(out, 'colony-pop-panel.png') });
await page.evaluate(() => {
  const s = document.getElementById('zz-sheet');
  if (s) s.hidden = true;
});
await page.waitForTimeout(200);

await page.click('#zz-open-build');
await page.waitForTimeout(500);
await page.screenshot({ path: join(out, 'colony-build-sheet.png') });

const farmBtn = page.locator('[data-build="farm"]');
if (await farmBtn.count()) {
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.population.manual = s.population.manual || {};
    s.population.manual.build = 1;
    if (s.population.labor) {
      if ((s.population.labor.idle || 0) > 0) {
        s.population.labor.idle -= 1;
        s.population.labor.build = (s.population.labor.build || 0) + 1;
      }
    }
  });
  await farmBtn.click({ force: true });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(out, 'colony-build-place.png') });
  await page.evaluate(() => {
    const s = window.__zz.getState();
    const type = s.buildMode || 'farm';
    for (let y = 0; y < s.base.h; y++) {
      for (let x = 0; x < s.base.w; x++) {
        if (!s.base.buildings.some((b) => b.x === x && b.y === y && b.hp > 0)) {
          window.__zz.place(type, x, y);
          s.buildMode = null;
          s.uiMode = null;
          window.__zz.paint();
          return;
        }
      }
    }
  });
  await page.waitForTimeout(400);
}

await page.evaluate(() => {
  const s = document.getElementById('zz-sheet');
  if (s) s.hidden = true;
});
await page.locator('.zz-ex-card').first().click({ force: true });
await page.waitForTimeout(400);
await page.screenshot({ path: join(out, 'colony-explorer.png') });
const start = page.locator('[data-action="start-explore"]');
if (await start.count()) {
  await start.click({ force: true });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(out, 'colony-explore-mode.png') });
}

await page.click('#zz-zoom-out', { force: true });
await page.click('#zz-zoom-out', { force: true });
await page.click('#zz-zoom-out', { force: true });
await page.waitForTimeout(300);
await page.screenshot({ path: join(out, 'colony-zoom-out.png') });

console.log('OK screenshots in', out);
await browser.close();
