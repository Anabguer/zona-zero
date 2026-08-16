/**
 * ZZ-161 HUMAN_GATE — insulated + damage + close-up terreno
 * Requires: http-server :8765
 * node scripts/review-shots-zz161.mjs
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
    ['zz-coach', 'zz-day-brief', 'zz-event-card', 'zz-attack-card', 'zz-choice-modal', 'zz-toast'].forEach(
      (id) => {
        const el = document.getElementById(id);
        if (el) el.hidden = true;
      }
    );
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
    s.resources.metal = 60;
    s.resources.fuel = 8;
    s.resources.food = 80;
    s.resources.water = 80;
    if (s.population?.labor) {
      s.population.labor.idle = 8;
      s.population.labor.build = 1;
    }
    s.flags.onboardingDone = true;
    s.flags.onboardingActive = false;
    s.era = 1;
    s.day = 12;
    s.pendingChoice = null;
    s.director = s.director || {};
    s.director.tension = 0;
    s.director.protectionUntil = 99;
    s.research = s.research || { unlocked: [], current: null };
    if (!s.research.unlocked.includes('insulation')) s.research.unlocked.push('insulation');
    if (!s.research.unlocked.includes('basic_carpentry')) s.research.unlocked.push('basic_carpentry');
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
  await page.waitForTimeout(160);
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

  await place(page, 'shelter');
  await place(page, 'house');
  await place(page, 'insulated_house');
  await place(page, 'farm');
  await dismiss(page);

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.mapCamera = s.mapCamera || {};
    s.mapCamera.zoom = 2.85;
    const iso = s.base.buildings.find((b) => b.type === 'insulated_house');
    if (iso) window.__zz.selectBuilding?.(iso.id);
    window.__zz.paint?.();
  });
  await page.waitForTimeout(350);
  await shot(page, '01-insulated-sheet.png', '01 · Casa aislada', 'Overlay + ficha Cubierta aislada');

  await dismiss(page);
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.mapCamera.zoom = 2.9;
    window.__zz.paint?.();
  });
  await shot(page, '02-closeup-terrain.png', '02 · Close-up terreno', 'LOD zoom · sin city.webp');

  await page.evaluate(() => {
    const farm = window.__zz.getState().base.buildings.find((x) => x.type === 'farm');
    if (farm) {
      farm.hp = 55;
      window.__zz.selectBuilding?.(farm.id);
    }
    window.__zz.paint?.();
  });
  await page.waitForTimeout(300);
  await shot(page, '03-damaged.png', '03 · Dañado', 'Filtro + grietas + barra HP');

  await page.evaluate(() => {
    const farm = window.__zz.getState().base.buildings.find((x) => x.type === 'farm');
    if (farm) farm.hp = 22;
    window.__zz.paint?.();
    if (farm) window.__zz.selectBuilding?.(farm.id);
  });
  await page.waitForTimeout(280);
  await shot(page, '04-critical.png', '04 · Crítico', 'Marcas pesadas + filtro');

  await dismiss(page);
  await page.evaluate(() => {
    const farm = window.__zz.getState().base.buildings.find((x) => x.type === 'farm');
    if (farm) {
      farm.hp = 0;
      farm.repair = null;
    }
    window.__zz.paint?.();
  });
  await shot(page, '05-destroyed.png', '05 · Destruido', 'Escombros sin sprite');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    const farm = s.base.buildings.find((x) => x.type === 'farm');
    if (farm) farm.hp = 100;
    s.mapCamera.zoom = 1.7;
    window.__zz.paint?.();
  });
  await shot(page, '06-zoom-out.png', '06 · Zoom medio', 'Terreno sin close-up forzado');
  await shot(page, 'mobile.png', 'Mobile · landscape', '844×390 · insulated/daño');

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
  await dismiss(page);
  await place(page, 'shelter');
  await place(page, 'house');
  await place(page, 'insulated_house');
  await place(page, 'farm');
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.mapCamera = s.mapCamera || {};
    s.mapCamera.zoom = 2.7;
    const farm = s.base.buildings.find((x) => x.type === 'farm');
    if (farm) farm.hp = 48;
    const iso = s.base.buildings.find((b) => b.type === 'insulated_house');
    if (iso) window.__zz.selectBuilding?.(iso.id);
    window.__zz.paint?.();
  });
  await dismiss(page);
  await shot(page, 'desktop.png', 'Desktop · colonia', 'Insulated + daño + close-up');
  await shot(page, 'gameplay.png', 'Gameplay', 'Mundo primero · arte lean');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-161 Review · Arte lean insulated/daño/close-up (HUMAN_GATE)</title>
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
  <h1>ZZ-161 · Terreno close-up + assets edificios (HUMAN_GATE)</h1>
  <p>ZZ-160 hecha · insulated overlays · estados daño · LOD zoom · sin city.webp · sin solar/generator · PENDIENTE DE REVISIÓN · no ZZ-162 · deudas arte NO BLOQUEANTES</p>
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
  const p = await b2.newPage({ viewport: { width: 1500, height: 2800 } });
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
console.log('ZZ-161 review OK', gallery.map((g) => g.file).join(', '));
