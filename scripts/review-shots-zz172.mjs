/**
 * ZZ-172 HUMAN_GATE — vida ambiental + perf cap
 * Requires: http-server :8765
 * node scripts/review-shots-zz172.mjs
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
  await page.waitForTimeout(100);
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

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.resources.wood = 120;
    s.resources.metal = 50;
    s.resources.food = 90;
    s.resources.water = 90;
    if (s.population?.labor) {
      s.population.labor.idle = 10;
      s.population.labor.build = 1;
    }
    s.flags.onboardingDone = true;
    s.flags.onboardingActive = false;
    s.era = 1;
    s.day = 14;
    s.pendingChoice = null;
    s.director.protectionUntil = 99;
    window.__zz.paint?.();
  });

  await place(page, 'farm');
  await place(page, 'well');
  await place(page, 'workshop');
  await place(page, 'shelter');
  await dismiss(page);

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.population.total = 3;
    for (const b of s.base.buildings) {
      if (['farm', 'well', 'workshop'].includes(b.type)) b.workers = 1;
    }
    s.mapCamera = s.mapCamera || {};
    s.mapCamera.zoom = 2.5;
    window.__zz.paint?.();
  });
  await shot(page, '01-life-pop3.png', '01 · Pop 3', 'Cap bajo · figuras staffed');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.population.total = 48;
    s.population.sick = 0;
    for (const b of s.base.buildings) {
      if (['farm', 'well', 'workshop'].includes(b.type)) b.workers = 2;
    }
    window.__zz.paint?.();
  });
  const count48 = await page.evaluate(() => document.querySelectorAll('.zz-ambient-fig').length);
  await shot(page, '02-life-mid.png', '02 · Pop media', `Figuras ${count48} (cap)`);

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.population.total = 100;
    s.population.sick = 0;
    window.__zz.paint?.();
  });
  const count100 = await page.evaluate(() => document.querySelectorAll('.zz-ambient-fig').length);
  await shot(page, '03-life-pop100.png', '03 · Pop ~100', `Figuras ${count100} ≤16 · sin 100 NPCs`);

  await page.evaluate(() => {
    const s = window.__zz.getState();
    const farm = s.base.buildings.find((b) => b.type === 'farm');
    if (farm) {
      farm.hp = 40;
      farm.repair = { daysLeft: 2, maxHp: 100 };
      farm.workers = 1;
    }
    s.flags.justBuiltIds = s.base.buildings.filter((b) => b.type === 'well').map((b) => b.id);
    window.__zz.paint?.();
  });
  await shot(page, '04-repair-build.png', '04 · Repair + polvo', 'Andamiaje / dust lean');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.population.sick = 4;
    s.outbreak = { active: true, phase: 'spread', type: 'flu' };
    s.flags.justBuiltIds = [];
    s.pendingAttack = null;
    window.__zz.paint?.();
  });
  await shot(page, '05-semaphore-amber.png', '05 · Semáforo ámbar', 'Enfermos / brote');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.pendingAttack = { arrivesOnDay: s.day + 1, intensity: 3 };
    s.outbreak = { active: false };
    s.population.sick = 0;
    const camp = s.zones.find((z) => z.type === 'camp');
    if (camp) camp._attackFlash = true;
    window.__zz.paint?.();
  });
  await shot(page, '06-attack-shelter.png', '06 · Ataque → refugio', 'Flash perímetro · figuras HQ');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.pendingAttack = null;
    const camp = s.zones.find((z) => z.type === 'camp');
    if (camp) camp._attackFlash = false;
    s.weather = 'cold';
    window.__zz.paint?.();
  });
  await shot(page, '07-weather-cold.png', '07 · Clima frío', 'Haze + aliento');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.weather = 'clear';
    const dest = s.zones.find((z) => z.type === 'supermarket') || s.zones.find((z) => z.type !== 'camp');
    if (dest) dest.state = 'discovered';
    const ex = s.explorers?.[0];
    if (ex && dest) {
      s.expeditions = [
        {
          id: 'xp-rev',
          zoneId: dest.id,
          explorerId: ex.id,
          departDay: s.day - 1,
          returnDay: s.day + 2,
        },
      ];
      ex.status = 'away';
      ex.expeditionId = 'xp-rev';
      s.mapCamera.x = (dest.x + (s.zones.find((z) => z.type === 'camp')?.x || 50)) / 2;
      s.mapCamera.y = (dest.y + (s.zones.find((z) => z.type === 'camp')?.y || 50)) / 2;
      s.mapCamera.zoom = 1.4;
    }
    window.__zz.paint?.();
  });
  await shot(page, '08-explorer-route.png', '08 · Explorador ruta', 'Progreso ida/vuelta');

  await shot(page, 'mobile.png', 'Mobile · landscape', '844×390 ambient life');
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
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.resources.wood = 100;
    s.resources.metal = 40;
    s.flags.onboardingDone = true;
    s.day = 20;
    s.era = 2;
    s.population.total = 36;
    s.director.protectionUntil = 99;
    window.__zz.paint?.();
  });
  await place(page, 'farm');
  await place(page, 'well');
  await place(page, 'barricade');
  await page.evaluate(() => {
    const s = window.__zz.getState();
    for (const b of s.base.buildings) {
      if (b.type === 'farm' || b.type === 'well') b.workers = 2;
    }
    s.mapCamera.zoom = 1.7;
    window.__zz.paint?.();
  });
  await dismiss(page);
  await shot(page, 'desktop.png', 'Desktop · vida', 'Cap + trabajo visible');
  await shot(page, 'gameplay.png', 'Gameplay', 'Q2 ambient · no Sims');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-172 Review · Vida ambiental + perf (HUMAN_GATE)</title>
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
  <h1>ZZ-172 · Vida ambiental + perf (HUMAN_GATE)</h1>
  <p>ZZ-166…171 hechas · cap ≤16 · trabajo staffed · repair/polvo · semáforo · clima · explorador · ataque→refugio · PENDIENTE DE REVISIÓN · no ZZ-175 · deudas arte NO BLOQUEANTES</p>
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
  const p = await b2.newPage({ viewport: { width: 1500, height: 3400 } });
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
console.log('ZZ-172 review OK', gallery.map((g) => g.file).join(', '));
