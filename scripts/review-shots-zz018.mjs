/**
 * ZZ-018 REVIEW_STOP — sectores orgánicos + mundo > viewport.
 * Requires: npx --yes serve -l 8765 .
 * Uso: node scripts/review-shots-zz018.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, rmSync, writeFileSync, readdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs', 'review');
const drive = 'G:\\Mi unidad\\Juegos\\Zona Zero\\Review';
const BASE = 'http://127.0.0.1:8765';

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
const addShot = (file, title, note) => gallery.push({ file, title, note });

async function shot(page, file, title, note) {
  await page.waitForTimeout(380);
  await page.screenshot({ path: join(out, file), fullPage: false });
  addShot(file, title, note);
}

async function boot(page) {
  await page.goto(`${BASE}/dev/harness.html#new=1&clear=1&name=Refugio%20Norte`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  await page.waitForFunction(() => window.__zzOk === true || window.__zzErr, { timeout: 60000 });
  const err = await page.evaluate(() => window.__zzErr || null);
  if (err) throw new Error(err);
  await page.waitForSelector('#zz-app:not([hidden])', { timeout: 15000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.resources.wood = Math.max(40, s.resources.wood || 0);
    s.resources.metal = Math.max(40, s.resources.metal || 0);
    if (s.population?.labor) s.population.labor.idle = Math.max(5, s.population.labor.idle || 0);
  });
}

async function quietUi(page) {
  await page.evaluate(() => {
    ['zz-coach', 'zz-day-brief', 'zz-sheet'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.hidden = true;
    });
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
  await quietUi(page);

  await shot(page, '01-d1-normal-no-overlays.png', '01 · D1 normal', 'Núcleo + entorno; sin overlays');

  await page.evaluate(() => {
    window.__zz.selectSector('core');
    document.getElementById('zz-coach') && (document.getElementById('zz-coach').hidden = true);
  });
  await shot(page, '02-d1-core-selected.png', '02 · Sector Núcleo', 'Lectura del núcleo');

  await page.evaluate(() => {
    document.getElementById('zz-sheet').hidden = true;
    window.__zz.setExpandMode(true);
    document.getElementById('zz-coach') && (document.getElementById('zz-coach').hidden = true);
  });
  await shot(page, '03-expand-mode-partial.png', '03 · Modo expansión', 'No caben todos los sectores a la vez');

  await page.evaluate(() => {
    window.__zz.selectSector('lot_west');
    document.getElementById('zz-coach') && (document.getElementById('zz-coach').hidden = true);
  });
  await shot(page, '04-sector-selected-requirements.png', '04 · Sector + requisitos', 'Aparcamiento / componentes');

  await page.evaluate(() => {
    document.getElementById('zz-sheet').hidden = true;
    window.__zz.panBy(-20, 2);
    document.getElementById('zz-coach') && (document.getElementById('zz-coach').hidden = true);
  });
  await shot(page, '05-pan-west-continues.png', '05 · Pan oeste', 'El mundo continúa fuera del viewport');

  await page.evaluate(() => {
    window.__zz.recenter();
    window.__zz.panBy(18, -6);
    window.__zz.selectSector('ruins_east');
    document.getElementById('zz-coach') && (document.getElementById('zz-coach').hidden = true);
  });
  await shot(page, '06-pan-east-other-shape.png', '06 · Pan este', 'Otra geometría (ruinas)');

  await page.evaluate(() => {
    document.getElementById('zz-sheet').hidden = true;
    window.__zz.recenter();
    window.__zz.panBy(-8, 16);
    window.__zz.setExpandMode(true);
    document.getElementById('zz-coach') && (document.getElementById('zz-coach').hidden = true);
  });
  await shot(page, '07-pan-south-diagonal.png', '07 · Pan sur/diagonal', 'Callejón / scrap fuera del centro');

  await page.evaluate(() => {
    window.__zz.recenter();
    window.__zz.zoomBy(1.35);
    window.__zz.setExpandMode(false);
    document.getElementById('zz-coach') && (document.getElementById('zz-coach').hidden = true);
  });
  await shot(page, '08-zoom-close.png', '08 · Zoom cercano', 'Edificios legibles; no empequeñecidos');

  await page.evaluate(() => {
    window.__zz.zoomBy(1 / 1.55);
    window.__zz.setExpandMode(true);
    document.getElementById('zz-coach') && (document.getElementById('zz-coach').hidden = true);
  });
  await shot(page, '09-zoom-out-global.png', '09 · Zoom alejado', 'Lectura más global (sigue > viewport)');

  await page.evaluate(() => {
    window.__zz.recenter();
    window.__zz.setExpandMode(false);
    document.getElementById('zz-coach') && (document.getElementById('zz-coach').hidden = true);
  });
  await shot(page, '10-recenter-core.png', '10 · Recentrar', 'Vuelve al Núcleo/HQ');

  await shot(page, '11-844x390.png', '11 · 844×390', 'Composición landscape');
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
  await quietUi(page);
  await shot(page, '12-740x360-normal.png', '12 · 740×360', 'Manejable sin empequeñecer el mundo');
  await page.evaluate(() => {
    window.__zz.panBy(-16, 4);
    document.getElementById('zz-coach') && (document.getElementById('zz-coach').hidden = true);
  });
  await shot(page, '13-740x360-pan.png', '13 · 740×360 pan', 'Mismo mundo, cámara desplazada');
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await boot(page);
  await quietUi(page);
  await shot(page, '14-desktop-normal.png', '14 · Desktop normal', 'Sin overlays');
  await page.evaluate(() => {
    window.__zz.setExpandMode(true);
    document.getElementById('zz-coach') && (document.getElementById('zz-coach').hidden = true);
  });
  await shot(page, '15-desktop-expand.png', '15 · Desktop expansión', 'Sectores orgánicos');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-018 Review · Sectores + mundo &gt; viewport</title>
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
  <h1>ZZ-018 · Sectores orgánicos + mundo &gt; viewport (REVIEW_STOP)</h1>
  <p>ZZ-019 NO iniciada · No deploy · Viewport = ventana</p>
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
  const p = await b2.newPage({ viewport: { width: 1800, height: 2600 } });
  await p.goto(`file://${out.replace(/\\/g, '/')}/index.html`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
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
console.log('ZZ-018 review OK', gallery.map((g) => g.file).join(', '));
