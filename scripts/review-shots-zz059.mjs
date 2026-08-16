/**
 * ZZ-059 HUMAN_GATE — QA crisis sanitaria
 * Requires: http-server :8765
 * node scripts/review-shots-zz059.mjs
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
    s.resources.wood = 80;
    s.resources.metal = 40;
    s.resources.medicine = 12;
    s.resources.food = 80;
    s.resources.water = 80;
    if (s.population?.labor) s.population.labor.idle = 8;
    s.flags.onboardingDone = true;
    s.flags.onboardingActive = false;
    s.era = 1;
    s.day = 12;
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

  await place(page, 'farm');
  await place(page, 'well');
  await place(page, 'medkit');
  await place(page, 'infirmary');
  await page.evaluate(() => {
    const inf = window.__zz.getState().base.buildings.find((x) => x.type === 'infirmary');
    if (inf) window.__zz.adjustWorkers(inf.id, 2);
  });
  await dismiss(page);

  await page.evaluate(() => {
    const b = window.__zz.getState().base.buildings.find((x) => x.type === 'infirmary');
    if (b) window.__zz.selectBuilding?.(b.id);
  });
  await page.waitForTimeout(300);
  await shot(page, '01-infirmary-beds.png', '01 · Enfermería', 'Camas + staffing sanitario');
  await dismiss(page);

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.population.sick = 4;
    s.population.injured = 2;
    window.__zz.paint?.();
  });
  await shot(page, '02-need-beds.png', '02 · Camas X/Y', 'Alerta capacidad médica');

  await page.evaluate(async () => {
    const { startOutbreak } = await import('/js/outbreaks.js');
    const s = window.__zz.getState();
    const c = window.__zz.getContent();
    startOutbreak(s, c, 'fever_wave');
    window.__zz.paint?.();
  });
  await page.waitForTimeout(350);
  await shot(page, '03-outbreak-seed.png', '03 · Germen', 'Brote fase inicial');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    if (s.outbreak) {
      s.outbreak.phase = 'peak';
      s.outbreak.severity = 2;
      s.population.sick = 6;
    }
    window.__zz.paint?.();
  });
  await shot(page, '04-outbreak-peak.png', '04 · Pico', 'Presión máxima');

  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(300);
  await shot(page, '05-health-panel.png', '05 · Salud en Más', 'Semáforo + camas + brote');
  await dismiss(page);

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.research.unlocked = [
      ...(s.research.unlocked || []),
      'rationing',
      'field_medicine',
      'quarantine_protocol',
    ];
    if (s.outbreak) {
      s.outbreak.phase = 'resolve';
      s.population.sick = 3;
    }
    window.__zz.paint?.();
  });
  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(300);
  await shot(page, '06-quarantine.png', '06 · Cuarentena', 'Tech pasiva desbloqueada');
  await dismiss(page);

  await page.click('#zz-advance', { force: true });
  await page.waitForTimeout(400);
  await shot(page, '07-brief-health.png', '07 · Brief', 'Día con brote activo');
  await dismiss(page);

  await shot(page, '08-colony-health.png', '08 · Colonia', 'Cadena médica visible');
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await boot(page);
  await place(page, 'medkit');
  await place(page, 'infirmary');
  await page.evaluate(async () => {
    const { startOutbreak } = await import('/js/outbreaks.js');
    startOutbreak(window.__zz.getState(), window.__zz.getContent(), 'winter_cough');
    window.__zz.paint?.();
  });
  await dismiss(page);
  await shot(page, '09-desktop-outbreak.png', '09 · Desktop', 'Panel + brote');
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
  await shot(page, '10-740-health.png', '10 · 740×360', 'Landscape compacto');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-059 Review · QA crisis sanitaria (HUMAN_GATE)</title>
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
  <h1>ZZ-059 · QA crisis sanitaria (HUMAN_GATE)</h1>
  <p>ZZ-050…058 hechas · camas · brotes sin calendario · cuarentena pasiva · PENDIENTE DE REVISIÓN · no ZZ-060 · deudas arte NO BLOQUEANTES</p>
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
console.log('ZZ-059 review OK', gallery.map((g) => g.file).join(', '));
