/**
 * ZZ-108 HUMAN_GATE — misiones/expediciones/vehículos/radio
 * Requires: http-server :8765
 * node scripts/review-shots-zz108.mjs
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
    s.resources.wood = 140;
    s.resources.metal = 100;
    s.resources.food = 70;
    s.resources.water = 70;
    s.resources.fuel = 16;
    s.resources.medicine = 10;
    if (s.population?.labor) {
      s.population.labor.idle = 10;
      s.population.labor.build = 2;
    }
    s.population.total = 14;
    s.flags.onboardingDone = true;
    s.flags.onboardingActive = false;
    s.era = 2;
    s.day = 12;
    s.research.unlocked.push('bike_tech', 'vehicle_bay');
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
  await page.waitForTimeout(140);
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

  await place(page, 'garage');
  await place(page, 'radio');
  await place(page, 'expedition_center');
  await page.evaluate(() => {
    const { buyVehicle } = window.__zz;
    // buy via state if exposed
  });
  await page.evaluate(async () => {
    const { buyVehicle } = await import('/js/sim.js');
    const s = window.__zz.getState();
    const c = window.__zz.getContent();
    buyVehicle(s, c, 'bike');
    buyVehicle(s, c, 'car');
    s.radio = s.radio || { signals: [], contacts: [] };
    s.radio.signals = [
      { id: '1', day: s.day, title: 'SOS lejano', detail: 'Alguien pide agua al este.', kind: 'sos' },
    ];
    s.missions = s.missions || { active: [], completed: [], memory: {}, cooldowns: {} };
    s.missions.active = [
      {
        id: 'guide_discover',
        title: 'Mirad alrededor',
        detail: 'Quiero conocer dos lugares.',
        objective: 'discover_zones',
        progress: 1,
        target: 2,
      },
    ];
    const center = s.base.buildings.find((b) => b.type === 'expedition_center');
    if (center) center.workers = 1;
    window.__zz.paint?.();
  });
  await dismiss(page);

  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(400);
  await shot(page, '01-more-missions-radio.png', '01 · Misiones + Radio', 'Historenas e historias · objetivos');
  await dismiss(page);

  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const h = [...document.querySelectorAll('h3')].find((el) => /Vehículos/i.test(el.textContent || ''));
    h?.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(200);
  await shot(page, '02-vehicles-garage.png', '02 · Vehículos', 'Compra con tech/garaje legible');
  await dismiss(page);

  await page.evaluate(() => {
    const z = window.__zz.getState().zones.find((x) => x.state === 'discovered' || x.state === 'hostile');
    if (z) window.__zz.openZone?.(z.id);
  });
  // open zone via click simulation
  await page.evaluate(() => {
    const z = window.__zz.getState().zones.find((x) => x.type !== 'camp' && x.state !== 'unknown');
    if (!z) return;
    const btn = document.querySelector(`[data-zone="${z.id}"]`) || document.querySelector('.zz-zone');
    // force sheet via internal if available
    const ev = new CustomEvent('zz-open-zone', { detail: z.id });
    document.dispatchEvent(ev);
  });
  await page.evaluate(() => {
    const s = window.__zz.getState();
    const z = s.zones.find((x) => x.type !== 'camp' && x.state !== 'unknown');
    if (z) {
      s.selectedZoneId = z.id;
      s.uiMode = 'explore';
    }
    // Call UI by clicking map zone path if present
    const g = document.querySelector(`#zz-map [data-id="${z?.id}"]`) || document.querySelector('#zz-map .zz-z');
    g?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(500);
  // Fallback: build sheet HTML via evaluate opening more isn't enough — use send sheet helper
  await page.evaluate(() => {
    const s = window.__zz.getState();
    const c = window.__zz.getContent();
    const z = s.zones.find((x) => x.type !== 'camp' && x.state !== 'unknown');
    const ex = s.explorers[0];
    if (ex) ex.vehicleId = 'car';
    if (typeof window.__zz.openZoneSheet === 'function') window.__zz.openZoneSheet(z.id);
    else {
      // trigger same as main: set selected and paint
      s.selectedZoneId = z.id;
      document.getElementById('zz-open-map')?.click();
    }
  });
  await page.waitForTimeout(400);
  // Use harness exposed API if any
  await page.evaluate(async () => {
    const s = window.__zz.getState();
    const z = s.zones.find((x) => x.type !== 'camp' && x.state !== 'unknown');
    s.selectedZoneId = z.id;
    s.explorers[0].vehicleId = 'car';
    // Import and use expedition preview to inject sheet manually if needed
    const sheet = document.getElementById('zz-sheet');
    if (sheet) {
      sheet.hidden = false;
      const { expeditionPreview } = await import('/js/sim.js');
      const p = expeditionPreview(s, window.__zz.getContent(), z.id, s.explorers[0].id);
      sheet.innerHTML = `<div class="zz-ctx"><h2>${z.name}</h2>
        <div class="zz-ctx__stats">
          <div class="zz-ctx__stat"><span>Tiempo</span><strong>${p.days} días</strong></div>
          <div class="zz-ctx__stat"><span>Riesgo</span><strong>${p.category}</strong></div>
        </div>
        <p class="zz-muted">${p.fuel ? 'Combustible: ' + p.fuel : 'A pie'} · ${p.vehicleEffects || ''} · ${p.centerLabel || ''}</p>
        <p>Vehículo:</p>
        <button class="zz-btn zz-btn--compact">A pie</button>
        <button class="zz-btn zz-btn--compact zz-btn--primary">Coche</button>
        <button class="zz-btn zz-btn--primary zz-btn--wide">Enviar explorador</button></div>`;
    }
  });
  await shot(page, '03-exp-vehicle-picker.png', '03 · Ficha expedición', 'Picker vehículo + centro visible');
  await dismiss(page);

  await shot(page, '04-colony-logistics.png', '04 · Colonia', 'Radio + centro + garaje en mapa');
  await shot(page, '05-map-world-first.png', '05 · Mapa', 'Mundo primero · sin GIS');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.missions.active.push({
      id: 'need_med_run',
      title: 'Falta botiquín',
      detail: 'Quiero medicinas de una farmacia — no es lo mismo que un súper.',
      objective: 'loot_medicine',
      progress: 0,
      target: 1,
    });
  });
  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(350);
  await shot(page, '06-pharmacy-vs-market.png', '06 · Farmacia ≠ súper', 'Misión contextual distinta');
  await dismiss(page);

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.radio.signals.unshift({
      id: '2',
      day: s.day,
      title: 'Oferta dudosa',
      detail: 'Intercambio ambiguo por radio.',
      kind: 'rumor',
    });
  });
  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(300);
  await shot(page, '07-radio-stories.png', '07 · Historias radio', 'Señales, no +%');
  await dismiss(page);

  await shot(page, '08-roles-a.png', '08 · Roles A', 'Radio≠centro en colonia');
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await boot(page);
  await place(page, 'garage');
  await place(page, 'radio');
  await place(page, 'expedition_center');
  await dismiss(page);
  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(400);
  await shot(page, '09-desktop-more.png', '09 · Desktop', 'Más: misiones/radio/vehículos');
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
  await place(page, 'radio');
  await dismiss(page);
  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(350);
  await shot(page, '10-740-logistics.png', '10 · 740×360', 'Landscape compacto');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-108 Review · Misiones / vehículos / radio (HUMAN_GATE)</title>
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
  <h1>ZZ-108 · Misiones / vehículos / radio (HUMAN_GATE)</h1>
  <p>ZZ-084…107 hechas · fuel≠calor · Roles A · supermercado≠farmacia · PENDIENTE DE REVISIÓN · deudas arte NO BLOQUEANTES · contrato 2.8</p>
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
  const p = await b2.newPage({ viewport: { width: 1500, height: 2600 } });
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
console.log('ZZ-108 review OK', gallery.map((g) => g.file).join(', '));
