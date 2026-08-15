/**
 * ZZ-018 Ronda CAMBIOS SOLICITADOS — mundo físico > plano de sectores.
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
  await page.waitForTimeout(400);
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
}

async function quietUi(page) {
  await page.evaluate(() => {
    const s = window.__zz.getState?.();
    if (s?.flags) {
      s.flags.onboardingDone = true;
      s.flags.onboardingActive = false;
    }
    if (s) {
      s.selectedBuildingId = null;
      s.selectedSectorId = null;
      s.selectedZoneId = null;
    }
    ['zz-coach', 'zz-day-brief', 'zz-sheet'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.hidden = true;
    });
    window.__zz.setExpandMode?.(false);
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
  await quietUi(page);

  await shot(page, '01-d1-close-no-overlays.png', '01 · D1 cercano', 'HQ + entorno · sin overlays · es un lugar');

  await page.evaluate(() => {
    window.__zz.panBy(-18, 2);
  });
  await quietUi(page);
  await shot(page, '02-pan-west-place.png', '02 · Pan oeste', 'Aparcamiento / ruinas reales — no polígono vacío');

  await page.evaluate(() => {
    window.__zz.recenter();
    window.__zz.panBy(16, -4);
  });
  await quietUi(page);
  await shot(page, '03-pan-east-place.png', '03 · Pan este', 'Otra zona con identidad (ruinas)');

  await page.evaluate(() => {
    window.__zz.recenter();
    window.__zz.zoomBy(1.28);
  });
  await quietUi(page);
  await shot(page, '04-zoom-close.png', '04 · Zoom cercano', 'Detalle HQ / entorno');

  await page.evaluate(() => {
    window.__zz.zoomBy(1 / 1.55);
  });
  await quietUi(page);
  await shot(page, '05-zoom-out.png', '05 · Zoom alejado', 'Lectura más global · mundo continúa');

  await page.evaluate(() => {
    window.__zz.recenter();
  });
  await quietUi(page);
  await shot(page, '06-recenter.png', '06 · Recentrar', 'Vuelve a Núcleo/HQ');

  await page.evaluate(() => {
    window.__zz.setExpandMode(true);
    document.getElementById('zz-coach') && (document.getElementById('zz-coach').hidden = true);
  });
  await shot(page, '07-expand-mode.png', '07 · Modo expansión', 'Límites tenues · sin GIS de tablero');

  await page.evaluate(() => {
    window.__zz.selectSector('lot_west');
    document.getElementById('zz-coach') && (document.getElementById('zz-coach').hidden = true);
  });
  await shot(page, '08-sector-selected.png', '08 · Sector seleccionado', 'Remarcado claro; resto secundario');

  await page.evaluate(() => {
    document.getElementById('zz-sheet').hidden = true;
    window.__zz.setExpandMode(false);
    window.__zz.recenter();
  });
  await quietUi(page);
  await shot(page, '09-core-blended.png', '09 · Núcleo fundido', 'Sin isla · parte del mundo');

  await shot(page, '10-844x390.png', '10 · 844×390', 'Landscape');
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
  await shot(page, '11-740x360.png', '11 · 740×360', 'Manejable · mundo no empequeñecido');
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await boot(page);
  await quietUi(page);
  await shot(page, '12-desktop.png', '12 · Desktop', 'Mundo continuo sin overlays');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-018 Ronda · Mundo físico (no plano)</title>
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
  <h1>ZZ-018 · CAMBIOS SOLICITADOS — mundo físico recorrible</h1>
  <p>REVIEW_STOP · ZZ-019 NO · Sin overlays = lugar · Expand = qué recuperar</p>
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
  const p = await b2.newPage({ viewport: { width: 1800, height: 2400 } });
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
console.log('ZZ-018 ronda review OK', gallery.map((g) => g.file).join(', '));
