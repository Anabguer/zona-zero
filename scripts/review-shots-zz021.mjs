/**
 * ZZ-021 HUMAN_GATE — staffing +/- canónico + resumen población + brief D2
 * Requires: http-server :8765
 * node scripts/review-shots-zz021.mjs
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
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.resources.wood = Math.max(50, s.resources.wood || 0);
    s.resources.water = Math.max(40, s.resources.water || 0);
    s.resources.food = Math.max(40, s.resources.food || 0);
    if (s.population?.labor) s.population.labor.idle = Math.max(4, s.population.labor.idle || 0);
    s.flags.onboardingDone = true;
    s.flags.onboardingActive = false;
    window.__zz.paint?.();
  });
}

async function place(page, type) {
  await page.evaluate((t) => {
    window.__zz.startBuild(t);
    const free = window.__zz.freeCells();
    const cell = free[0];
    window.__zz.setGhost(cell[0], cell[1]);
    window.__zz.confirmBuild();
    const sh = document.getElementById('zz-sheet');
    if (sh) sh.hidden = true;
  }, type);
  await page.waitForTimeout(280);
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
  await place(page, 'farm');
  await page.evaluate(() => {
    const farm = window.__zz.getState().base.buildings.find((x) => x.type === 'farm');
    if (farm) {
      window.__zz.adjustWorkers(farm.id, 1);
      window.__zz.selectBuilding(farm.id);
    }
  });
  await page.waitForTimeout(350);
  await shot(page, '01-staff-building-pm.png', '01 · Staff edificio +/−', 'Modelo canónico en ficha');

  await page.evaluate(() => {
    const sh = document.getElementById('zz-sheet');
    if (sh) sh.hidden = true;
  });
  await page.evaluate(() => {
    document.getElementById('zz-pop')?.click();
    document.getElementById('zz-desk-pop')?.click();
  });
  await page.waitForTimeout(400);
  await shot(page, '02-pop-summary-only.png', '02 · Población resumen', 'Sin +/− por categoría');

  await page.evaluate(() => {
    const sh = document.getElementById('zz-sheet');
    if (sh) sh.hidden = true;
    ['zz-coach', 'zz-day-brief'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.hidden = true;
    });
  });
  await place(page, 'well');
  await page.evaluate(() => {
    const well = window.__zz.getState().base.buildings.find((x) => x.type === 'well');
    if (well) window.__zz.adjustWorkers(well.id, 1);
  });
  await page.click('#zz-advance', { force: true });
  await page.waitForTimeout(500);
  await shot(page, '03-brief-d2-food-water.png', '03 · Brief D2', 'Comida/Agua ritual');

  await page.evaluate(() => {
    document.getElementById('zz-brief-ok')?.click();
    const s = window.__zz.getState();
    s.weather = 'cold';
    s.weatherDaysLeft = 2;
    window.__zz.paint?.();
  });
  await page.click('#zz-advance', { force: true });
  await page.waitForTimeout(500);
  await shot(page, '04-brief-cold-wood.png', '04 · Brief frío + madera', 'Calefacción en balance');
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await boot(page);
  await place(page, 'farm');
  await page.evaluate(() => {
    const farm = window.__zz.getState().base.buildings.find((x) => x.type === 'farm');
    if (farm) {
      window.__zz.adjustWorkers(farm.id, 1);
      window.__zz.selectBuilding(farm.id);
    }
  });
  await page.waitForTimeout(400);
  await shot(page, '05-desktop-staff.png', '05 · Desktop staff', 'Panel + ficha +/−');
  await page.evaluate(() => document.getElementById('zz-desk-pop')?.click());
  await page.waitForTimeout(350);
  await shot(page, '06-desktop-pop-summary.png', '06 · Desktop población', 'Resumen SO');
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
  await place(page, 'farm');
  await page.evaluate(() => {
    const farm = window.__zz.getState().base.buildings.find((x) => x.type === 'farm');
    if (farm) window.__zz.adjustWorkers(farm.id, 1);
  });
  await page.click('#zz-advance', { force: true });
  await page.waitForTimeout(450);
  await shot(page, '07-740-brief.png', '07 · 740×360 brief', 'Ritual legible');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-021 Review · Staffing + brief (HUMAN_GATE)</title>
<style>
body{margin:0;background:#12100c;color:#e8e0d0;font-family:system-ui,sans-serif}
header{padding:1.25rem 1.5rem;border-bottom:1px solid #333}
h1{margin:0;font-size:1.2rem}
p{margin:.35rem 0 0;opacity:.75;font-size:.9rem}
.grid{display:grid;gap:1rem;padding:1rem;grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}
figure{margin:0;background:#1a1612;border:1px solid #333;border-radius:10px;overflow:hidden}
img{display:block;width:100%;height:auto}
figcaption{padding:.65rem .75rem;font-size:.85rem}
figcaption strong{display:block}
figcaption span{opacity:.7;font-size:.78rem}
</style></head><body>
<header>
  <h1>ZZ-021 · Staffing canónico + brief (HUMAN_GATE)</h1>
  <p>ZZ-020 brief comida/agua/madera-frío incluido · PENDIENTE DE REVISIÓN · no ZZ-022</p>
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
  const p = await b2.newPage({ viewport: { width: 1500, height: 2200 } });
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
console.log('ZZ-021 review OK', gallery.map((g) => g.file).join(', '));
