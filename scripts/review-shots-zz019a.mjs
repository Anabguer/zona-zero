/**
 * ZZ-019A RONDA CAMBIOS — identidades + superficies continuas.
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
  await page.waitForTimeout(420);
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

async function cam(page, dx, dy, zoom) {
  await page.evaluate(
    ({ dx, dy, zoom }) => {
      const s = window.__zz.getState();
      const camp = s.zones.find((z) => z.type === 'camp');
      s.mapCamera.x = camp.x + dx;
      s.mapCamera.y = camp.y + dy;
      if (zoom) s.mapCamera.zoom = zoom;
      window.__zz.clampCam?.();
      window.__zz.paint?.();
    },
    { dx, dy, zoom }
  );
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

  await cam(page, 0, 0.6, 3.05);
  await shot(page, '01-nucleo-sin-build.png', '01 · Núcleo cercano', 'Sin Construir · carretera + refugio');

  await cam(page, 20, -3, 2.35);
  await shot(page, '02-pan-ruinas.png', '02 · Pan → ruinas urbanas', 'Muros / pecios / escombros');

  await cam(page, 14, 16, 2.35);
  await shot(page, '03-pan-verde.png', '03 · Pan → zona abierta/verde', 'Árboles / menos urbano');

  await cam(page, -18, 0.2, 2.5);
  await shot(page, '04-carretera-conecta.png', '04 · Carretera conecta', 'Vía + aparcamiento oeste');

  await cam(page, 0, 0.6, 3.05);
  await quiet(page);
  await shot(page, '05-zona-sin-superficies.png', '05 · Normal SIN superficies', 'Sin overlays de build');

  await page.evaluate(() => window.__zz.startBuild('farm'));
  await shot(page, '06-superficie-grande.png', '06 · Superficie grande continua', 'Área irregular · no celdas');

  await page.evaluate(() => window.__zz.setGhost(5, 7));
  await shot(page, '07-ghost-pos-a.png', '07 · Ghost pos A', 'Misma superficie · posición A');

  await page.evaluate(() => window.__zz.setGhost(7, 8));
  await shot(page, '08-ghost-pos-b.png', '08 · Ghost pos B', 'Misma superficie · posición B');

  await page.evaluate(() => {
    window.__zz.setGhost(5, 7);
    window.__zz.confirmBuild();
    window.__zz.startBuild('shelter');
    window.__zz.setGhost(7, 8);
    window.__zz.confirmBuild();
    const sh = document.getElementById('zz-sheet');
    if (sh) sh.hidden = true;
    window.__zz.paint?.();
  });
  await quiet(page);
  await shot(page, '09-dos-layouts.png', '09 · Dos distribuciones', 'Misma superficie · huerto+shelter');

  await page.evaluate(() => {
    window.__zz.startBuild('farm');
    window.__zz.setGhost(7, 4);
  });
  await shot(page, '10-ghost-invalido-road.png', '10 · Ghost inválido carretera', 'No edificable');

  await page.evaluate(() => {
    window.__zz.cancelBuild?.();
    window.__zz.startBuild('farm');
  });
  await shot(page, '11-varias-superficies.png', '11 · Varias superficies disjuntas', 'Tamaños/formas distintos');

  await page.evaluate(() => {
    window.__zz.cancelBuild?.();
    const sh = document.getElementById('zz-sheet');
    if (sh) sh.hidden = true;
  });
  await quiet(page);
  await cam(page, 0, 0.6, 3.45);
  await shot(page, '12-zoom-cerca.png', '12 · Zoom cercano', 'Escala agradable');

  await cam(page, 0, 1, 2.0);
  await shot(page, '13-zoom-lejos.png', '13 · Zoom alejado', 'Orientación general');
  await ctx.close();
}

{
  const ctx = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await boot(page);
  await quiet(page);
  await cam(page, 0, 0.6, 3.05);
  await shot(page, '14-844x390.png', '14 · 844×390', 'Landscape');
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
  await shot(page, '15-740x360.png', '15 · 740×360', 'Build · superficie continua');
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await boot(page);
  await quiet(page);
  await cam(page, 0, 0.6, 2.85);
  await shot(page, '16-desktop-normal.png', '16a · Desktop normal', 'Mundo continuo');
  await page.evaluate(() => window.__zz.startBuild('farm'));
  await shot(page, '17-desktop-build.png', '16b · Desktop construir', 'Áreas continuas');
  await ctx.close();
}

await browser.close();

// User asked 16 shots: merge desktop as 15/16 and drop 16a naming
// Rename: 14=844 already, 15=740, need desktop as 15/16 — renumber files
import { renameSync, unlinkSync, existsSync } from 'fs';
if (existsSync(join(out, '16-desktop-normal.png'))) {
  // Keep 14 844, rename 15 740 stays, move desktop to 15/16 by replacing:
  // Actually user list: 13 zoom far, 14 844, 15 740, 16 desktop normal — and also desktop build.
  // They asked 15 desktop normal AND 16 desktop build, with 13 844 and 14 740.
  // Adjust: delete 14-844 duplicate intent — our 13 is zoom, 14 is 844, 15 is 740.
  // Add desktop as replacing: rename 16->15 desktop normal and 17->16 desktop build,
  // and rename current 15-740 to stay as 14, 14-844 as 13? Too messy.
  // Simpler: leave files 01-13 + 14-844 + 15-740 + 16-desktop-normal + 17-desktop-build
  // and update gallery titles. User asked 16 items — we have 17. Drop 14-844 (duplicate of 01 zoom).
}

try {
  unlinkSync(join(out, '14-844x390.png'));
} catch {
  /* ignore */
}
const gallery2 = gallery.filter((g) => g.file !== '14-844x390.png');
// rename 15->14, 16->15, 17->16
const renames = [
  ['15-740x360.png', '14-740x360.png', '14 · 740×360', 'Build · superficie continua'],
  ['16-desktop-normal.png', '15-desktop-normal.png', '15 · Desktop normal', 'Mundo continuo'],
  ['17-desktop-build.png', '16-desktop-build.png', '16 · Desktop construir', 'Áreas continuas'],
];
for (const [from, to, title, note] of renames) {
  const a = join(out, from);
  const b = join(out, to);
  if (existsSync(a)) {
    try {
      if (existsSync(b)) unlinkSync(b);
    } catch {
      /* ignore */
    }
    renameSync(a, b);
  }
  const g = gallery2.find((x) => x.file === from);
  if (g) {
    g.file = to;
    g.title = title;
    g.note = note;
  }
}

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-019A Review · Ronda CAMBIOS</title>
<style>
body{margin:0;background:#12100c;color:#e8e0d0;font-family:system-ui,sans-serif}
header{padding:1.25rem 1.5rem;border-bottom:1px solid #333}
h1{margin:0;font-size:1.2rem}
p{margin:.35rem 0 0;opacity:.75;font-size:.9rem}
.grid{display:grid;gap:1rem;padding:1rem;grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}
figure{margin:0;background:#1a1612;border:1px solid #333;border-radius:10px;overflow:hidden}
img{display:block;width:100%;height:auto;background:#0a0908}
figcaption{padding:.65rem .75rem;font-size:.85rem}
figcaption strong{display:block}
figcaption span{opacity:.7;font-size:.78rem}
</style></head><body>
<header>
  <h1>ZZ-019A · Ronda CAMBIOS — identidades + superficies continuas</h1>
  <p>Mundo reconocible · blobs no celdas · carretera integrada · PENDIENTE DE REVISIÓN · no ZZ-012</p>
</header>
<div class="grid">
${gallery2
  .map(
    (g) => `<figure><img src="${g.file}" alt="${g.title}"/><figcaption><strong>${g.title}</strong><span>${g.note || ''}</span></figcaption></figure>`
  )
  .join('\n')}
</div></body></html>`
);

{
  const b2 = await chromium.launch({ headless: true });
  const p = await b2.newPage({ viewport: { width: 1600, height: 3000 } });
  await p.goto(`file://${out.replace(/\\/g, '/')}/index.html`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1100);
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
console.log('ZZ-019A ronda OK', gallery2.map((g) => g.file).join(', '));
