/**
 * ZZ-013 — HUD recursos D1 (comida/agua/madera legibles; sin Au/Gu).
 * Requires: serve :8765
 * node scripts/review-shots-zz013.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, rmSync, writeFileSync, readdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs', 'review');
const drive = 'G:\\Mi unidad\\Juegos\\Zona Zero\\Review';
const BASE = 'http://127.0.0.1:8765';
const HARNESS = `${BASE}/dev/harness-zz.html`;

mkdirSync(out, { recursive: true });
mkdirSync(drive, { recursive: true });
for (const dir of [out, drive]) {
  for (const f of readdirSync(dir)) {
    try {
      rmSync(join(dir, f), { force: true });
    } catch {
      /* ignore */
    }
  }
}

const gallery = [];
async function shot(page, file, title, note) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, file), fullPage: false });
  gallery.push({ file, title, note });
}

async function boot(page) {
  await page.goto(`${HARNESS}#new=1&clear=1&name=Refugio%20Norte`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  await page.waitForFunction(() => window.__zzOk === true || window.__zzErr, { timeout: 60000 });
  const err = await page.evaluate(() => window.__zzErr || null);
  if (err) throw new Error(err);
  await page.waitForSelector('#zz-app:not([hidden])', { timeout: 15000 });
  await page.waitForTimeout(450);
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.flags.onboardingDone = true;
    s.flags.onboardingActive = false;
    window.__zz.paint?.();
  });
}

const browser = await chromium.launch({ headless: true });

{
  const ctx = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'es-ES',
  });
  const page = await ctx.newPage();
  await boot(page);

  await shot(page, '01-hud-844.png', '01 · HUD 844×390', 'Comida · Agua · Madera con nombre');

  const labels = await page.evaluate(() =>
    [...document.querySelectorAll('#zz-resources .zz-hud__res-name')].map((el) => el.textContent.trim())
  );
  const keys = await page.evaluate(() =>
    [...document.querySelectorAll('#zz-resources li')].map((el) => el.dataset.res)
  );
  if (!labels.includes('Comida') || !labels.includes('Agua') || !labels.includes('Madera')) {
    throw new Error('HUD labels missing: ' + labels.join(','));
  }
  if (keys.includes('fuel') || keys.includes('ammo') || keys.includes('gold')) {
    throw new Error('HUD has forbidden keys: ' + keys.join(','));
  }

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.resources.food = 4;
    s.resources.water = 5;
    window.__zz.paint?.();
  });
  await shot(page, '02-hud-low.png', '02 · HUD bajo', 'Crit/low legible');

  await page.evaluate(() => window.__zz.startBuild('farm'));
  await page.waitForTimeout(300);
  await shot(page, '03-hud-build.png', '03 · HUD + construir', 'Madera visible al construir');

  await shot(page, '04-844-world.png', '04 · Mundo + HUD', 'Landscape completo');
  await ctx.close();
}

{
  const ctx = await browser.newContext({
    viewport: { width: 740, height: 360 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await boot(page);
  await shot(page, '05-740x360.png', '05 · 740×360', 'Nombres visibles');
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await boot(page);
  await shot(page, '06-desktop-hud.png', '06 · Desktop HUD', 'Comida/Agua/Madera');
  await page.evaluate(() => window.__zz.startBuild('well'));
  await page.waitForTimeout(300);
  await shot(page, '07-desktop-build.png', '07 · Desktop construir', 'Recursos + mundo');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-013 Review · HUD recursos D1</title>
<style>
body{margin:0;background:#12100c;color:#e8e0d0;font-family:system-ui,sans-serif}
header{padding:1.25rem 1.5rem;border-bottom:1px solid #333}
h1{margin:0;font-size:1.25rem}
p{margin:.35rem 0 0;opacity:.75;font-size:.9rem}
.grid{display:grid;gap:1rem;padding:1rem;grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}
figure{margin:0;background:#1a1612;border:1px solid #333;border-radius:10px;overflow:hidden}
img{display:block;width:100%;height:auto;background:#0a0908}
figcaption{padding:.65rem .75rem;font-size:.85rem}
figcaption strong{display:block}
figcaption span{opacity:.7;font-size:.78rem}
</style></head><body>
<header>
  <h1>ZZ-013 · HUD recursos D1</h1>
  <p>Comida / Agua / Madera legibles · sin Au/Gu · PENDIENTE DE REVISIÓN</p>
</header>
<div class="grid">
${gallery
  .map(
    (g) => `<figure><img src="${g.file}" alt="${g.title}"/><figcaption><strong>${g.title}</strong><span>${g.note || ''}</span></figcaption></figure>`
  )
  .join('\n')}
</div></body></html>`
);

{
  const b2 = await chromium.launch({ headless: true });
  const p = await b2.newPage({ viewport: { width: 1400, height: 1800 } });
  await p.goto(`file://${out.replace(/\\/g, '/')}/index.html`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  await p.screenshot({
    path: join(out, 'review-contact-sheet.jpg'),
    type: 'jpeg',
    quality: 82,
    fullPage: true,
  });
  await b2.close();
}

for (const f of readdirSync(out)) {
  copyFileSync(join(out, f), join(drive, f));
}
console.log('ZZ-013 review OK', gallery.map((g) => g.file).join(', '));
