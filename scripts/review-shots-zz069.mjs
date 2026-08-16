/**
 * ZZ-069 HUMAN_GATE — QA daño → reparación → recuperación
 * Requires: http-server :8765
 * node scripts/review-shots-zz069.mjs
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
      if (s.director) s.director.tension = 0;
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
    s.resources.wood = 90;
    s.resources.metal = 50;
    s.resources.ammo = 6;
    s.resources.food = 90;
    s.resources.water = 90;
    if (s.population?.labor) {
      s.population.labor.idle = 8;
      s.population.labor.build = 1;
    }
    s.flags.onboardingDone = true;
    s.flags.onboardingActive = false;
    s.era = 1;
    s.day = 14;
    s.pendingChoice = null;
    s.director = s.director || {};
    s.director.tension = 0;
    s.director.protectionUntil = 0;
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
  await place(page, 'barricade');
  await place(page, 'watchtower');
  await dismiss(page);

  await page.evaluate(() => {
    const farm = window.__zz.getState().base.buildings.find((x) => x.type === 'farm');
    if (farm) {
      farm.hp = 55;
      window.__zz.selectBuilding?.(farm.id);
    }
    window.__zz.paint?.();
  });
  await page.waitForTimeout(350);
  await shot(page, '01-damaged-sheet.png', '01 · Dañado', 'Ficha HP + estado + Reparar');

  await page.evaluate(() => {
    const farm = window.__zz.getState().base.buildings.find((x) => x.type === 'farm');
    if (farm) farm.hp = 22;
    window.__zz.paint?.();
    if (farm) window.__zz.selectBuilding?.(farm.id);
  });
  await page.waitForTimeout(300);
  await shot(page, '02-critical-sheet.png', '02 · Crítico', 'Estado crítico legible');

  await dismiss(page);
  await shot(page, '03-map-hpbar.png', '03 · Mapa', 'Barra HP / filtro daño');

  await page.evaluate(async () => {
    const { startRepair } = await import('/js/sim.js');
    const s = window.__zz.getState();
    const farm = s.base.buildings.find((x) => x.type === 'farm');
    s.resources.wood = 80;
    s.resources.metal = 40;
    if (s.population?.labor) s.population.labor.idle = 4;
    startRepair(s, window.__zz.getContent(), farm.id);
    window.__zz.selectBuilding?.(farm.id);
    window.__zz.paint?.();
  });
  await page.waitForTimeout(300);
  await shot(page, '04-repairing.png', '04 · Reparando', 'Días restantes');

  await dismiss(page);
  await page.evaluate(() => {
    const s = window.__zz.getState();
    const tower = s.base.buildings.find((x) => x.type === 'watchtower');
    if (tower) tower.hp = 40;
    s.flags.highlightRepairIds = s.base.buildings.filter((b) => (b.hp ?? 100) < 70).map((b) => b.id);
    window.__zz.paint?.();
  });
  await shot(page, '05-alert-focus.png', '05 · Alerta localiza', 'Resalte edificios a reparar');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    const farm = s.base.buildings.find((x) => x.type === 'farm');
    if (farm) {
      farm.hp = 0;
      farm.repair = null;
    }
    window.__zz.selectBuilding?.(farm.id);
    window.__zz.paint?.();
  });
  await page.waitForTimeout(300);
  await shot(page, '06-destroyed.png', '06 · Destruido', 'Escombros / reconstruir');

  await dismiss(page);
  await page.evaluate(async () => {
    const { applyBuildingDamage, perimeterIntegrity } = await import('/js/buildings-damage.js');
    const { createRng } = await import('/js/rng.js');
    const s = window.__zz.getState();
    const c = window.__zz.getContent();
    const farm = s.base.buildings.find((x) => x.type === 'farm');
    if (farm) farm.hp = 100;
    // Perímetro dañado
    applyBuildingDamage(s, c, 50, { rng: createRng(3), forcePerimeter: true });
    s.weather = 'storm';
    window.__zz.paint?.();
    void perimeterIntegrity;
  });
  await shot(page, '07-perimeter-storm.png', '07 · Perímetro/tormenta', 'Daño en defensas');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.research.unlocked = [...(s.research.unlocked || []), 'watch_protocols', 'rapid_repair'];
    window.__zz.paint?.();
  });
  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(300);
  await shot(page, '08-rapid-repair-tech.png', '08 · Tech', 'Reparación rápida');
  await dismiss(page);

  await page.evaluate(async () => {
    const { startRepair } = await import('/js/sim.js');
    const s = window.__zz.getState();
    const dmg = s.base.buildings.find((b) => (b.hp ?? 100) < 100 && b.hp > 0) || s.base.buildings[0];
    if (dmg) {
      dmg.hp = Math.min(dmg.hp, 45);
      dmg.repair = null;
      s.resources.wood = 90;
      s.resources.metal = 40;
      if (s.population?.labor) s.population.labor.idle = 3;
      startRepair(s, window.__zz.getContent(), dmg.id);
      // completar
      dmg.hp = 100;
      dmg.repair = null;
      window.__zz.selectBuilding?.(dmg.id);
    }
    window.__zz.paint?.();
  });
  await page.waitForTimeout(300);
  await shot(page, '09-repaired.png', '09 · Reparado', 'HP restaurado');
  await dismiss(page);

  await shot(page, '10-colony-repair.png', '10 · Colonia', 'Flujo daño→repair cerrado');
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await boot(page);
  await place(page, 'farm');
  await place(page, 'barricade');
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.base.buildings.forEach((b, i) => {
      if (b.type !== 'hq_central' && i % 2 === 0) b.hp = 48;
    });
    s.flags.highlightRepairIds = s.base.buildings.filter((b) => (b.hp ?? 100) < 70).map((b) => b.id);
    window.__zz.paint?.();
  });
  await dismiss(page);
  await shot(page, '11-desktop-damage.png', '11 · Desktop', 'Daño + resalte');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-069 Review · QA daño y reparación (HUMAN_GATE)</title>
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
  <h1>ZZ-069 · QA daño → reparación (HUMAN_GATE)</h1>
  <p>ZZ-066…068 hechas · estados HP · perímetro · Reparar · PENDIENTE DE REVISIÓN · no ZZ-070 · deudas arte NO BLOQUEANTES</p>
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
console.log('ZZ-069 review OK', gallery.map((g) => g.file).join(', '));
