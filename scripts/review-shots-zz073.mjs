/**
 * ZZ-073 HUMAN_GATE — Fog/discovered polish + territorio
 * Requires: http-server :8765
 * node scripts/review-shots-zz073.mjs
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
    s.resources.wood = 60;
    s.resources.metal = 30;
    s.resources.food = 80;
    s.resources.water = 80;
    s.flags.onboardingDone = true;
    s.flags.onboardingActive = false;
    s.era = 1;
    s.day = 12;
    s.pendingChoice = null;
    s.director = s.director || {};
    s.director.tension = 0;
    s.director.protectionUntil = 99;
    // Reveal map variety
    (s.zones || []).forEach((z, i) => {
      if (z.type === 'camp') return;
      if (i % 5 === 1) {
        z.state = 'discovered';
        z.infectedLeft = 2;
      } else if (i % 5 === 2) {
        z.state = 'controlled';
        z.controlProgress = 1;
        z.infectedLeft = 0;
      } else if (i % 5 === 3) {
        z.state = 'hostile';
        z.infectedLeft = 4;
      } else if (i % 5 === 4) {
        z.state = 'contested';
        z.controlProgress = 0.4;
        z.infectedLeft = 3;
      }
    });
    s.stats.zonesControlled = s.zones.filter((z) => z.state === 'controlled').length;
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
  await dismiss(page);
  await shot(page, '01-map-states.png', '01 · Estados mapa', 'fog / discovered / controlled / contested');

  await page.evaluate(() => {
    const z = window.__zz.getState().zones.find((x) => x.state === 'unknown');
    // pan not needed; fog visible in overview
    window.__zz.paint?.();
  });
  await shot(page, '02-fog-unknown.png', '02 · Fog', 'Unknown sin GIS');

  await page.evaluate(() => {
    const z = window.__zz.getState().zones.find((x) => x.state === 'discovered');
    if (z) {
      window.__zz.getState().selectedZoneId = z.id;
      window.__zz.paint?.();
    }
  });
  await page.waitForTimeout(200);
  await shot(page, '03-discovered.png', '03 · Descubierta', 'Borde + landmark');

  await page.evaluate(() => {
    const z = window.__zz.getState().zones.find((x) => x.state === 'controlled' && x.type !== 'camp');
    if (z) window.__zz.selectZone(z.id);
  });
  await page.waitForTimeout(350);
  await shot(page, '04-controlled-sheet.png', '04 · Controlada', 'Beneficios + loot residual');
  await dismiss(page);

  await page.evaluate(() => {
    const z = window.__zz.getState().zones.find((x) => x.state === 'contested');
    if (z) window.__zz.selectZone(z.id);
  });
  await page.waitForTimeout(350);
  await shot(page, '05-contested.png', '05 · En disputa', 'Anillo contested');
  await dismiss(page);

  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(350);
  await shot(page, '06-territory-panel.png', '06 · Panel territorio', 'Beneficios reales legibles');
  await dismiss(page);

  await page.evaluate(() => {
    const s = window.__zz.getState();
    const z = s.zones.find((x) => x.type === 'police') || s.zones.find((x) => x.state === 'discovered');
    if (z) {
      z.state = 'discovered';
      window.__zz.selectZone(z.id);
    }
  });
  await page.waitForTimeout(350);
  await shot(page, '07-loot-hint.png', '07 · Loot por tipo', 'Hints policía/farmacia');
  await dismiss(page);

  await shot(page, '08-owned-ring.png', '08 · Owned ring', 'Control ≠ relleno verde');
  await shot(page, '09-colony-map.png', '09 · Colonia+mapa', 'Contrato espacial 2.8');
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await boot(page);
  await dismiss(page);
  await shot(page, '10-desktop-territory.png', '10 · Desktop', 'Estados + fog');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-073 Review · Territorio + fog (HUMAN_GATE)</title>
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
  <h1>ZZ-073 · Territorio + fog (HUMAN_GATE)</h1>
  <p>ZZ-070…072 hechas · control real · contested · loot tables · fog polish · PENDIENTE DE REVISIÓN · no ZZ-080 · deudas arte NO BLOQUEANTES · contrato 2.8</p>
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
console.log('ZZ-073 review OK', gallery.map((g) => g.file).join(', '));
