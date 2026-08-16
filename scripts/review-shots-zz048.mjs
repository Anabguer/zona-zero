/**
 * ZZ-048 HUMAN_GATE — QA invierno forzado
 * Requires: http-server :8765
 * node scripts/review-shots-zz048.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, rmSync, writeFileSync, readdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs', 'review');
const drive = 'G:\\Mi unidad\\Juegos\\Zona Zero\\Review';
const HARNESS = 'http://127.0.0.1:8765/dev/harness-zz.html';

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
  await page.waitForTimeout(280);
  await page.screenshot({ path: join(out, file), fullPage: false });
  gallery.push({ file, title, note });
}

async function dismiss(page) {
  await page.evaluate(() => {
    const s = window.__zz.getState();
    if (s) {
      s.pendingChoice = null;
      if (s.director) {
        s.director.tension = 0;
        s.director.protectionUntil = 99;
      }
    }
    document.getElementById('zz-brief-ok')?.click();
    const sh = document.getElementById('zz-sheet');
    if (sh) sh.hidden = true;
    ['zz-coach', 'zz-day-brief', 'zz-event-card', 'zz-attack-card', 'zz-choice-modal', 'zz-toast'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.hidden = true;
    });
  });
}

async function boot(page) {
  await page.goto(`${HARNESS}#new=1&clear=1&name=Refugio%20Norte`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForFunction(() => window.__zzOk === true || window.__zzErr, { timeout: 60000 });
  if (await page.evaluate(() => window.__zzErr)) throw new Error(await page.evaluate(() => window.__zzErr));
  await page.waitForSelector('#zz-app:not([hidden])', { timeout: 15000 });
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.resources.wood = 20;
    s.resources.metal = 40;
    s.resources.food = 80;
    s.resources.water = 80;
    if (s.population?.labor) s.population.labor.idle = 6;
    s.flags.onboardingDone = true;
    s.flags.onboardingActive = false;
    s.era = 1;
    s.season = 'winter';
    s.seasonDay = 5;
    s.pendingChoice = null;
    s.director = s.director || {};
    s.director.tension = 0;
    s.director.protectionUntil = 99;
    window.__zz.paint?.();
  });
}

async function place(page, type) {
  await page.evaluate((t) => {
    window.__zz.startBuild(t);
    const free = window.__zz.freeCells();
    if (!free?.length) return;
    window.__zz.setGhost(free[0][0], free[0][1]);
    window.__zz.confirmBuild();
    const sh = document.getElementById('zz-sheet');
    if (sh) sh.hidden = true;
  }, type);
  await page.waitForTimeout(180);
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
  await dismiss(page);

  await place(page, 'farm');
  await place(page, 'well');
  await place(page, 'shelter');
  await place(page, 'house');
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.research.unlocked = ['basic_carpentry', 'insulation'];
  });
  await place(page, 'insulated_house');
  await place(page, 'cistern');
  await dismiss(page);

  // Pending cold warning
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.pendingWeather = {
      type: 'cold',
      startsOnDay: s.day + 2,
      duration: 3,
      woodPerDay: 4,
      announced: true,
    };
    s.resources.wood = 12;
    window.__zz.paint?.();
  });
  await shot(page, '01-cold-warn.png', '01 · Aviso frío', 'Alertas cobertura / madera');

  // Force cold + heating
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.pendingWeather = null;
    s.weather = 'cold';
    s.weatherDaysLeft = 3;
    s.resources.wood = 8;
    window.__zz.paint?.();
  });
  await shot(page, '02-cold-map.png', '02 · Mapa frío', 'FX clima + chimeneas si hay calor');

  await page.click('#zz-advance', { force: true });
  await page.waitForTimeout(420);
  await shot(page, '03-brief-heating.png', '03 · Brief calefacción', 'Madera + cobertura');
  await dismiss(page);

  // Exposure
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.weather = 'blizzard';
    s.weatherDaysLeft = 2;
    s.resources.wood = 0;
    s.coldExposure = 3;
    window.__zz.paint?.();
  });
  await shot(page, '04-exposure.png', '04 · Exposición', 'Semáforo frío acumulado');

  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(300);
  await shot(page, '05-stability-factors.png', '05 · Estabilidad', 'Factores UI secundaria');
  await dismiss(page);

  await page.evaluate(() => {
    const c = window.__zz.getState().base.buildings.find((x) => x.type === 'cistern');
    if (c) window.__zz.selectBuilding?.(c.id);
  });
  await page.waitForTimeout(300);
  await shot(page, '06-cistern-sheet.png', '06 · Cisterna', 'Reserva ≠ pozo');
  await dismiss(page);

  await page.evaluate(() => {
    const h = window.__zz.getState().base.buildings.find((x) => x.type === 'insulated_house');
    if (h) window.__zz.selectBuilding?.(h.id);
  });
  await page.waitForTimeout(300);
  await shot(page, '07-insulated.png', '07 · Casa aislada', 'Prot. 2 (lógica OK; arte deuda)');
  await dismiss(page);

  await shot(page, '08-winter-colony.png', '08 · Colonia invierno', 'Loop estable');
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await boot(page);
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.weather = 'cold';
    s.season = 'winter';
    window.__zz.paint?.();
  });
  await dismiss(page);
  await shot(page, '09-desktop-winter.png', '09 · Desktop', 'Panel + clima');
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
  await page.evaluate(() => {
    window.__zz.getState().weather = 'cold';
    window.__zz.paint?.();
  });
  await dismiss(page);
  await shot(page, '10-740-winter.png', '10 · 740×360', 'Landscape compacto');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-048 Review · QA invierno (HUMAN_GATE)</title>
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
  <h1>ZZ-048 · QA invierno forzado (HUMAN_GATE)</h1>
  <p>ZZ-033…047 hechas · aviso→calefacción→exposición · pozo≠cisterna · PENDIENTE DE REVISIÓN · no ZZ-050 · deudas arte NO BLOQUEANTES</p>
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
  const p = await b2.newPage({ viewport: { width: 1500, height: 2400 } });
  await p.goto(`file://${out.replace(/\\/g, '/')}/index.html`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(700);
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
console.log('ZZ-048 review OK', gallery.map((g) => g.file).join(', '));
