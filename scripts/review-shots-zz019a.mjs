/**
 * ZZ-019A REVIEW_STOP — escenario diseñado + superficies edificables.
 * Requires: serve :8765
 * node scripts/review-shots-zz019a.mjs
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
  await page.waitForTimeout(450);
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
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.resources.wood = Math.max(80, s.resources.wood || 0);
    s.resources.water = Math.max(40, s.resources.water || 0);
    s.resources.metal = Math.max(20, s.resources.metal || 0);
    if (s.population?.labor) s.population.labor.idle = Math.max(6, s.population.labor.idle || 0);
    s.flags.onboardingDone = true;
    s.flags.onboardingActive = false;
    window.__zz.paint?.();
  });
}

async function quiet(page) {
  await page.evaluate(() => {
    ['zz-coach', 'zz-day-brief', 'zz-sheet'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.hidden = true;
    });
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
  await quiet(page);

  await shot(page, '01-d1-normal.png', '01 · D1 normal cercano', 'Sin Construir · lugar postapocalíptico');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    const camp = s.zones.find((z) => z.type === 'camp');
    s.mapCamera.x = camp.x - 16;
    s.mapCamera.y = camp.y;
    window.__zz.clampCam?.();
    window.__zz.paint?.();
  });
  await shot(page, '02-pan-road-west.png', '02 · Pan carretera oeste', 'Aparcamiento / vía');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    const camp = s.zones.find((z) => z.type === 'camp');
    s.mapCamera.x = camp.x + 16;
    s.mapCamera.y = camp.y - 2;
    window.__zz.clampCam?.();
    window.__zz.paint?.();
  });
  await shot(page, '03-pan-ruins-east.png', '03 · Pan ruinas este', 'Zona urbana destruida');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    const camp = s.zones.find((z) => z.type === 'camp');
    s.mapCamera.x = camp.x + 4;
    s.mapCamera.y = camp.y + 12;
    window.__zz.clampCam?.();
    window.__zz.paint?.();
  });
  await shot(page, '04-pan-south-open.png', '04 · Pan sur / abierto', 'Identidad distinta');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    const camp = s.zones.find((z) => z.type === 'camp');
    s.mapCamera.x = camp.x;
    s.mapCamera.y = camp.y + 0.6;
    s.mapCamera.zoom = 3.05;
    window.__zz.clampCam?.();
    window.__zz.paint?.();
  });
  await quiet(page);
  await shot(page, '05-nucleo-integrated.png', '05 · Núcleo integrado', 'HQ en el mundo · sin modo build');

  await shot(page, '06-same-zone-no-build.png', '06 · Misma zona SIN construir', 'Sin parcelas visibles');

  await page.evaluate(() => {
    window.__zz.startBuild('farm');
  });
  await shot(page, '07-same-zone-build.png', '07 · Misma zona EN construir', 'Superficies reveladas · varias disjuntas');

  await page.evaluate(() => {
    // ghost válido en explanada oeste
    window.__zz.setGhost(5, 3);
  });
  await shot(page, '08-ghost-valid.png', '08 · Ghost válido', 'Sobre superficie edificable');

  await page.evaluate(() => {
    // carretera / estructura
    window.__zz.setGhost(7, 4);
  });
  await shot(page, '09-ghost-invalid-road.png', '09 · Ghost inválido', 'Sobre carretera/ruina');

  await page.evaluate(() => {
    window.__zz.setGhost(5, 3);
    window.__zz.confirmBuild();
    window.__zz.startBuild('farm');
    window.__zz.setGhost(6, 7);
    window.__zz.confirmBuild();
    window.__zz.startBuild('shelter');
    window.__zz.setGhost(8, 7);
    window.__zz.confirmBuild();
    document.getElementById('zz-sheet') && (document.getElementById('zz-sheet').hidden = true);
    window.__zz.paint?.();
  });
  await quiet(page);
  await shot(page, '10-multi-layout.png', '10 · Varias distribuciones', 'Misma superficie · layouts distintos');

  await page.evaluate(() => window.__zz.zoomBy(1.18));
  await shot(page, '11-zoom-in.png', '11 · Zoom cercano', 'Escala agradable');

  await page.evaluate(() => window.__zz.zoomBy(1 / 1.18 / 1.15));
  await shot(page, '12-zoom-out.png', '12 · Zoom alejado', 'Orientación general');

  await page.click('#zz-recenter', { force: true }).catch(() => {});
  await quiet(page);
  await shot(page, '13-844x390.png', '13 · 844×390', 'Landscape móvil');
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
  await quiet(page);
  await page.evaluate(() => window.__zz.startBuild('farm'));
  await shot(page, '14-740x360-build.png', '14 · 740×360 build', 'Superficies legibles');
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await boot(page);
  await quiet(page);
  await shot(page, '15-desktop-world.png', '15 · Desktop mundo', 'Escenario > viewport');
  await page.evaluate(() => window.__zz.startBuild('farm'));
  await shot(page, '16-desktop-build.png', '16 · Desktop construir', 'Superficies + ghost');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-019A Review · Superficies + escenario (REVIEW_STOP)</title>
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
  <h1>ZZ-019A · Escenario diseñado + superficies edificables (REVIEW_STOP)</h1>
  <p>Mundo primero · superficies disjuntas · ghost/✓ intacto · PENDIENTE DE REVISIÓN · no ZZ-012</p>
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
  const p = await b2.newPage({ viewport: { width: 1600, height: 2800 } });
  await p.goto(`file://${out.replace(/\\/g, '/')}/index.html`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1000);
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
console.log('ZZ-019A review OK', gallery.map((g) => g.file).join(', '));
