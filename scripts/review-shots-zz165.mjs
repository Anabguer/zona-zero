/**
 * ZZ-165 HUMAN_GATE — review visual por era + landmarks/props/SFX lean
 * Requires: http-server :8765
 * node scripts/review-shots-zz165.mjs
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
  await page.waitForTimeout(260);
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
}

async function prepColony(page, era) {
  await page.evaluate((eraN) => {
    const s = window.__zz.getState();
    s.resources.wood = 140;
    s.resources.metal = 70;
    s.resources.fuel = 10;
    s.resources.food = 90;
    s.resources.water = 90;
    if (s.population?.labor) {
      s.population.labor.idle = 10;
      s.population.labor.build = 1;
    }
    s.flags.onboardingDone = true;
    s.flags.onboardingActive = false;
    s.era = eraN;
    s.day = eraN === 0 ? 4 : eraN === 1 ? 14 : eraN === 2 ? 28 : 48;
    s.pendingChoice = null;
    s.director = s.director || {};
    s.director.tension = 0;
    s.director.protectionUntil = 99;
    s.research = s.research || { unlocked: [], current: null };
    if (!s.research.unlocked.includes('insulation')) s.research.unlocked.push('insulation');
    if (!s.research.unlocked.includes('basic_carpentry')) s.research.unlocked.push('basic_carpentry');
    (s.zones || []).forEach((z) => {
      if (z.type === 'camp') return;
      if (eraN === 0) {
        if (['supermarket', 'park', 'pharmacy'].includes(z.type)) z.state = 'discovered';
      } else if (eraN === 1) {
        z.state = z.state === 'unknown' ? 'discovered' : z.state;
        if (['supermarket', 'hospital', 'station'].includes(z.type)) z.state = 'controlled';
      } else {
        z.state = 'discovered';
        if (['supermarket', 'hospital', 'station', 'police', 'warehouse'].includes(z.type)) z.state = 'controlled';
      }
    });
    window.__zz.paint?.();
  }, era);
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
  await page.waitForTimeout(120);
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
  await prepColony(page, 1);
  await place(page, 'shelter');
  await place(page, 'house');
  await place(page, 'insulated_house');
  await place(page, 'farm');
  await place(page, 'well');
  await dismiss(page);

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.mapCamera = s.mapCamera || {};
    s.mapCamera.zoom = 1.55;
    const farm = s.base.buildings.find((b) => b.type === 'farm');
    if (farm) farm.hp = 50;
    const well = s.base.buildings.find((b) => b.type === 'well');
    if (well) well.hp = 18;
    window.__zz.paint?.();
  });
  await shot(page, '01-era1-colony.png', '01 · Era 1 colonia', 'Props + daño en mundo');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.mapCamera.zoom = 1.25;
    const z = s.zones.find((x) => x.type === 'police') || s.zones.find((x) => x.type === 'pharmacy');
    if (z) {
      s.mapCamera.x = z.x;
      s.mapCamera.y = z.y;
      s.selectedZoneId = z.id;
    }
    window.__zz.paint?.();
  });
  await shot(page, '02-landmarks-sil.png', '02 · Landmarks silueta', 'Tipos reconocibles SVG');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    const z = s.zones.find((x) => x.type === 'supermarket');
    if (z) {
      s.mapCamera.x = z.x;
      s.mapCamera.y = z.y;
      s.mapCamera.zoom = 1.6;
      s.selectedZoneId = z.id;
    }
    window.__zz.paint?.();
  });
  await shot(page, '03-landmark-webp.png', '03 · Landmark WebP', 'supermarket asset');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    const camp = s.zones.find((z) => z.type === 'camp');
    s.mapCamera.x = camp?.x || 50;
    s.mapCamera.y = camp?.y || 48;
    s.mapCamera.zoom = 2.7;
    s.selectedZoneId = null;
    window.__zz.paint?.();
  });
  await shot(page, '04-props-closeup.png', '04 · Props close-up', 'Restos/valla/detalles');

  await page.evaluate(() => {
    localStorage.setItem('zz-sound', '0');
    window.__zz.paint?.();
    document.getElementById('zz-sound')?.click();
  });
  await shot(page, '05-mute.png', '05 · Mute', 'Botón sonido OFF');

  for (const era of [0, 2, 3]) {
    await prepColony(page, era);
    await dismiss(page);
    await page.evaluate((eraN) => {
      const s = window.__zz.getState();
      const camp = s.zones.find((z) => z.type === 'camp');
      s.mapCamera = s.mapCamera || {};
      s.mapCamera.x = camp?.x || 50;
      s.mapCamera.y = camp?.y || 48;
      s.mapCamera.zoom = eraN === 0 ? 2.4 : 1.45;
      window.__zz.paint?.();
    }, era);
    await shot(page, `0${6 + era}-era${era}.png`, `0${6 + era} · Era ${era}`, 'Contact sheet por era');
  }

  await shot(page, 'mobile.png', 'Mobile · landscape', '844×390');
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
  await prepColony(page, 2);
  await place(page, 'shelter');
  await place(page, 'house');
  await place(page, 'farm');
  await place(page, 'barricade');
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.mapCamera = s.mapCamera || {};
    s.mapCamera.zoom = 1.5;
    const farm = s.base.buildings.find((b) => b.type === 'farm');
    if (farm) farm.hp = 0;
    window.__zz.paint?.();
  });
  await dismiss(page);
  await shot(page, 'desktop.png', 'Desktop · era 2', 'Landmarks + destroyed legible');
  await shot(page, 'gameplay.png', 'Gameplay', 'Mundo primero · arte lean Q');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-165 Review · Arte lean por era (HUMAN_GATE)</title>
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
  <h1>ZZ-165 · Review visual por era (HUMAN_GATE)</h1>
  <p>ZZ-162…164 hechas · landmarks tipados · props colonia · SFX §34+mute · sin city.webp · sin solar/generator · PENDIENTE DE REVISIÓN · no ZZ-166 · deudas arte NO BLOQUEANTES</p>
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
  const p = await b2.newPage({ viewport: { width: 1500, height: 3200 } });
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
console.log('ZZ-165 review OK', gallery.map((g) => g.file).join(', '));
