/**
 * ZZ-083 HUMAN_GATE — UI research legible
 * Requires: http-server :8765
 * node scripts/review-shots-zz083.mjs
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
    s.resources.wood = 100;
    s.resources.metal = 60;
    s.resources.food = 80;
    s.resources.water = 80;
    s.resources.medicine = 12;
    if (s.population?.labor) {
      s.population.labor.idle = 8;
      s.population.labor.build = 1;
    }
    s.flags.onboardingDone = true;
    s.flags.onboardingActive = false;
    s.era = 1;
    s.day = 10;
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

  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(350);
  await shot(page, '01-research-locked.png', '01 · Sin banco', 'Research oculta/bloqueada hasta banco');
  await dismiss(page);

  await place(page, 'farm');
  await place(page, 'well');
  await place(page, 'tech_bench');
  await page.evaluate(() => {
    const b = window.__zz.getState().base.buildings.find((x) => x.type === 'tech_bench');
    if (b) window.__zz.adjustWorkers(b.id, 1);
  });
  await dismiss(page);

  await page.evaluate(() => {
    const b = window.__zz.getState().base.buildings.find((x) => x.type === 'tech_bench');
    if (b) window.__zz.selectBuilding?.(b.id);
  });
  await page.waitForTimeout(300);
  await shot(page, '02-tech-bench.png', '02 · Banco técnico', 'Staff +/- acelera research');
  await dismiss(page);

  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(400);
  await shot(page, '03-research-desire.png', '03 · Deseo legible', 'Beneficio en lenguaje humano');

  // scroll tech list if needed - take another with quarantine visible
  await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.zz-tech-card')];
    const q = cards.find((c) => /cuarentena|quarantine/i.test(c.textContent || ''));
    q?.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(200);
  await shot(page, '04-quarantine-card.png', '04 · Cuarentena', 'Pasiva, no toggle/−prod');
  await dismiss(page);

  await page.evaluate(async () => {
    const { startResearch } = await import('/js/sim.js');
    const s = window.__zz.getState();
    const c = window.__zz.getContent();
    s.resources.food = 40;
    s.resources.wood = 40;
    startResearch(s, c, 'rationing');
    window.__zz.paint?.();
  });
  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(350);
  await shot(page, '05-research-active.png', '05 · 1 tech activa', 'Progreso en curso');
  await dismiss(page);

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.research.unlocked = ['rationing', 'water_filters', 'field_medicine', 'quarantine_protocol'];
    s.research.active = null;
    window.__zz.paint?.();
  });
  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(350);
  await shot(page, '06-tree-no-energy.png', '06 · Árbol', 'Sin rama Energía');
  await dismiss(page);

  await shot(page, '07-farm-d1.png', '07 · Huerto D1', 'Farm sin tech requerida');
  await shot(page, '08-colony-research.png', '08 · Colonia', 'Banco en asentamiento');
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await boot(page);
  await place(page, 'tech_bench');
  await dismiss(page);
  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(400);
  await shot(page, '09-desktop-research.png', '09 · Desktop', 'UI research legible');
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
  await place(page, 'tech_bench');
  await dismiss(page);
  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(350);
  await shot(page, '10-740-research.png', '10 · 740×360', 'Landscape compacto');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-083 Review · Research legible (HUMAN_GATE)</title>
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
  <h1>ZZ-083 · Research legible (HUMAN_GATE)</h1>
  <p>ZZ-080…082 hechas · banco · workers→progreso · efectos cableados · sin Energía · PENDIENTE DE REVISIÓN · no ZZ-084 · deudas arte NO BLOQUEANTES · contrato 2.8</p>
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
console.log('ZZ-083 review OK', gallery.map((g) => g.file).join(', '));
