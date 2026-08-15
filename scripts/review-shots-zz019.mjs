/**
 * ZZ-019 HUMAN_GATE — construcción semilibre landscape.
 * Requires: serve :8765
 * node scripts/review-shots-zz019.mjs
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
    s.resources.wood = Math.max(60, s.resources.wood || 0);
    s.resources.water = Math.max(40, s.resources.water || 0);
    s.resources.metal = Math.max(20, s.resources.metal || 0);
    if (s.population?.labor) s.population.labor.idle = Math.max(6, s.population.labor.idle || 0);
    s.flags.onboardingDone = true;
    s.flags.onboardingActive = false;
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

  await shot(page, '01-d1-before-build.png', '01 · D1 antes', 'Mundo sin modo construcción');

  await page.evaluate(() => {
    window.__zz.startBuild('farm');
  });
  await quiet(page);
  await shot(page, '02-ghost-valid.png', '02 · Ghost válido', 'Tint válido · dock ✓/✕ · sin grid');

  await page.evaluate(() => {
    const free = window.__zz.freeCells();
    const edge = free[free.length - 1] || free[0];
    window.__zz.setGhost(edge[0], edge[1]);
  });
  await quiet(page);
  await shot(page, '03-ghost-moved.png', '03 · Ghost movido', 'Snap invisible a otra celda');

  await page.evaluate(() => {
    window.__zz.setGhost(1, 4);
  });
  await quiet(page);
  await shot(page, '04-ghost-invalid.png', '04 · Ghost inválido', 'Fuera de recuperado · ✓ deshabilitado');

  await page.evaluate(() => {
    const free = window.__zz.freeCells();
    window.__zz.setGhost(free[1][0], free[1][1]);
  });
  await quiet(page);
  await shot(page, '05-dock-confirm.png', '05 · Dock ✓/✕', 'Confirmación explícita landscape');

  await page.evaluate(() => {
    window.__zz.panBy(-12, 4);
  });
  await quiet(page);
  await shot(page, '06-pan-while-build.png', '06 · Pan en build', 'Pan fuera del ghost; ghost no construye');

  await page.evaluate(() => {
    window.__zz.recenter();
    const free = window.__zz.freeCells();
    window.__zz.setGhost(free[0][0], free[0][1]);
    window.__zz.confirmBuild();
  });
  await page.evaluate(() => {
    document.getElementById('zz-sheet').hidden = true;
    window.__zz.getState().flags.onboardingDone = true;
  });
  await quiet(page);
  await shot(page, '07-farm-placed.png', '07 · Huerto colocado', 'Tras ✓ — edificio real');

  await page.evaluate(() => {
    const free = window.__zz.freeCells();
    for (let i = 0; i < 2 && free[i + 1]; i++) {
      window.__zz.startBuild('farm');
      window.__zz.setGhost(free[i + 1][0], free[i + 1][1]);
      window.__zz.confirmBuild();
    }
    document.getElementById('zz-sheet').hidden = true;
  });
  await quiet(page);
  await shot(page, '08-three-farms.png', '08 · 3 huertos', 'Repetibles donde quepan · posiciones distintas');

  await page.evaluate(() => {
    const farms = window.__zz.getState().base.buildings.filter((b) => b.type === 'farm');
    if (farms[1]) window.__zz.focusBuilding(farms[1].id);
    document.getElementById('zz-sheet').hidden = true;
  });
  await quiet(page);
  await shot(page, '09-lista-centrar.png', '09 · Lista→centrar', 'Cámara al edificio seleccionado');

  await page.evaluate(() => window.__zz.cancelBuild?.());
  await quiet(page);
  await shot(page, '10-844x390.png', '10 · 844×390', 'Landscape fantasía B0');
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
  await page.evaluate(() => window.__zz.startBuild('farm'));
  await quiet(page);
  await shot(page, '11-740x360-build.png', '11 · 740×360', 'Ghost + dock manejable');
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await boot(page);
  await page.evaluate(() => {
    window.__zz.startBuild('well');
    const free = window.__zz.freeCells();
    if (free[2]) window.__zz.setGhost(free[2][0], free[2][1]);
  });
  await quiet(page);
  await shot(page, '12-desktop-build.png', '12 · Desktop', 'Colocación semilibre');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-019 Review · Construcción semilibre (HUMAN_GATE)</title>
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
  <h1>ZZ-019 · Construcción semilibre landscape (HUMAN_GATE)</h1>
  <p>Ghost + snap invisible + ✓/✕ · pan vs ghost · sin segundo-tap · PENDIENTE DE REVISIÓN</p>
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
console.log('ZZ-019 review OK', gallery.map((g) => g.file).join(', '));
