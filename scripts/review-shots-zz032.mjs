/**
 * ZZ-032 HUMAN_GATE — vivienda aislada + insulation + clima por tipo
 * Requires: http-server :8765
 * node scripts/review-shots-zz032.mjs
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
    s.resources.wood = 120;
    s.resources.metal = 80;
    s.resources.fuel = 8;
    s.resources.food = 80;
    s.resources.water = 80;
    if (s.population?.labor) s.population.labor.idle = 6;
    s.flags.onboardingDone = true;
    s.flags.onboardingActive = false;
    s.era = 1;
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
    const cell = free[0];
    window.__zz.setGhost(cell[0], cell[1]);
    window.__zz.confirmBuild();
    const sh = document.getElementById('zz-sheet');
    if (sh) sh.hidden = true;
  }, type);
  await page.waitForTimeout(200);
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

  // Build mode surfaces (ZZ-024)
  await page.evaluate(() => {
    window.__zz.startBuild('farm');
    window.__zz.paint?.();
  });
  await shot(page, '01-build-preview.png', '01 · Preview build', 'Superficies solo en build');
  await page.evaluate(() => window.__zz.cancelBuild?.());
  await dismiss(page);

  await place(page, 'farm');
  await page.evaluate(() => {
    const farm = window.__zz.getState().base.buildings.find((x) => x.type === 'farm');
    if (farm) window.__zz.adjustWorkers(farm.id, 1);
  });
  await place(page, 'shelter');
  await place(page, 'house');
  await dismiss(page);

  // House sheet climate
  await page.evaluate(() => {
    const h = window.__zz.getState().base.buildings.find((x) => x.type === 'house');
    if (h) window.__zz.selectBuilding?.(h.id);
  });
  await page.waitForTimeout(300);
  await shot(page, '02-house-climate.png', '02 · Casa clima', 'Protección básica (1)');
  await dismiss(page);

  // Unlock insulation + place insulated
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.research.unlocked = [...new Set([...(s.research.unlocked || []), 'basic_carpentry', 'insulation'])];
    window.__zz.paint?.();
  });
  await place(page, 'insulated_house');
  await page.evaluate(() => {
    const h = window.__zz.getState().base.buildings.find((x) => x.type === 'insulated_house');
    if (h) window.__zz.selectBuilding?.(h.id);
  });
  await page.waitForTimeout(300);
  await shot(page, '03-insulated-sheet.png', '03 · Casa aislada', 'Prot. aislado (2) · tech insulation');
  await dismiss(page);

  // Overflow pop
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.population.total = 40;
    document.getElementById('zz-open-pop')?.click();
  });
  await page.waitForTimeout(350);
  await shot(page, '04-pop-overflow.png', '04 · Overflow vivienda', 'Aviso hacinamiento');
  await dismiss(page);

  // Dead explorer rail
  await page.evaluate(() => {
    const s = window.__zz.getState();
    const ex = s.explorers?.[0];
    if (ex) ex.status = 'dead';
    window.__zz.paint?.();
  });
  await shot(page, '05-explorer-dead.png', '05 · Explorador caído', 'Dolor visible en rail');
  await dismiss(page);

  // Cold brief wood
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.weather = 'cold';
    s.population.total = 8;
    s.resources.wood = 30;
  });
  await page.click('#zz-advance', { force: true });
  await page.waitForTimeout(400);
  await shot(page, '06-brief-cold-housing.png', '06 · Brief frío', 'Madera × cobertura climática');
  await dismiss(page);

  await shot(page, '07-colony-overview.png', '07 · Colonia', 'Shelter+house+aislada');
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await boot(page);
  await place(page, 'shelter');
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.research.unlocked = ['basic_carpentry', 'insulation'];
  });
  await place(page, 'house');
  await place(page, 'insulated_house');
  await dismiss(page);
  await shot(page, '08-desktop-housing.png', '08 · Desktop', 'Panel + viviendas');
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
  await dismiss(page);
  await shot(page, '09-740-overview.png', '09 · 740×360', 'Landscape compacto');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-032 Review · Vivienda aislada (HUMAN_GATE)</title>
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
  <h1>ZZ-032 · Vivienda aislada + insulation (HUMAN_GATE)</h1>
  <p>ZZ-024…031 hechas · PENDIENTE DE REVISIÓN · no ZZ-033 · deuda arte post-019B no bloqueante</p>
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
console.log('ZZ-032 review OK', gallery.map((g) => g.file).join(', '));
