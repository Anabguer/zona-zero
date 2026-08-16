/**
 * ZZ-019B REVIEW_STOP — limpieza visual escenario D1.
 * Requires: serve :8765
 * node scripts/review-shots-zz019b.mjs
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
  await shot(page, '01-d1-844x390.png', '01 · D1 normal 844×390', 'Mundo coherente · sin build');

  await cam(page, 18, -2.5, 2.4);
  await shot(page, '02-pan-urbana.png', '02 · Pan zona urbana', 'Ruinas / props · no polígonos negros');

  await cam(page, 12, 15, 2.35);
  await shot(page, '03-pan-abierta.png', '03 · Pan zona abierta', 'Verde / menos denso');

  await cam(page, -16, 0.3, 2.55);
  await shot(page, '04-carretera.png', '04 · Carretera', 'Bordes + suciedad + grietas');

  await cam(page, 0, 0.6, 3.2);
  await quiet(page);
  await shot(page, '05-hq-integrado.png', '05 · HQ integrado', 'Sombra contacto / asentamiento');

  await page.evaluate(() => window.__zz.startBuild('farm'));
  await shot(page, '06-build-mode.png', '06 · Build mode', 'Señal de superficie discreta');

  await page.evaluate(() => window.__zz.setGhost(5, 7));
  await shot(page, '07-superficie-valida.png', '07 · Superficie válida', 'Ghost ✓ · área integrada');

  await page.evaluate(() => window.__zz.setGhost(7, 4));
  await shot(page, '08-superficie-invalida.png', '08 · Superficie inválida', 'Ghost ✕ · no GIS dominante');

  await page.evaluate(() => {
    window.__zz.setGhost(5, 7);
    window.__zz.confirmBuild();
    const sh = document.getElementById('zz-sheet');
    if (sh) sh.hidden = true;
    window.__zz.cancelBuild?.();
    window.__zz.paint?.();
  });
  await quiet(page);
  await cam(page, 0, 0.6, 3.2);
  await shot(page, '09-huerto-colocado.png', '09 · Huerto colocado', 'Integración suelo · no pegatina');

  await ctx.close();
}

{
  const ctx = await browser.newContext({
    viewport: { width: 740, height: 360 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'es-ES',
  });
  const page = await ctx.newPage();
  await boot(page);
  await quiet(page);
  await cam(page, 0, 0.6, 3.0);
  await shot(page, '10-d1-740x360.png', '10 · D1 normal 740×360', 'Landscape compacto');
  await ctx.close();
}

{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: 'es-ES',
  });
  const page = await ctx.newPage();
  await boot(page);
  await quiet(page);
  await cam(page, 0, 0.6, 2.75);
  await shot(page, '11-desktop.png', '11 · Desktop', 'Arquitectura ZZ-014 intacta');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-019B Review · Integración visual D1</title>
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
  <h1>ZZ-019B · Integración visual escenario D1 (anti-debug / anti-GIS)</h1>
  <p>REVIEW_STOP · PENDIENTE DE REVISIÓN · contrato 2.8 intacto · ZZ-015 no iniciada</p>
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
console.log('ZZ-019B review OK', gallery.map((g) => g.file).join(', '));
