/**
 * ZZ-125 HUMAN_GATE — logros + Director auditoría
 * Requires: http-server :8765
 * node scripts/review-shots-zz125.mjs
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
  await page.goto(`${HARNESS}#new=1&clear=1&name=Zona%20Zero`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForFunction(() => window.__zzOk === true || window.__zzErr, { timeout: 60000 });
  if (await page.evaluate(() => window.__zzErr)) throw new Error(await page.evaluate(() => window.__zzErr));
  await page.waitForSelector('#zz-app:not([hidden])', { timeout: 15000 });
  await page.evaluate(async () => {
    const s = window.__zz.getState();
    s.resources.wood = 100;
    s.resources.metal = 60;
    s.resources.food = 50;
    s.resources.water = 50;
    if (s.population?.labor) {
      s.population.labor.idle = 8;
      s.population.labor.build = 1;
    }
    s.flags.onboardingDone = true;
    s.era = 1;
    s.day = 8;
    s.pendingChoice = null;
    s.director.tension = 0;
    s.director.protectionUntil = 99;
    const { tickAchievements } = await import('/js/achievements.js');
    tickAchievements(s, window.__zz.getContent());
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

  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(400);
  await shot(page, '01-achievements-panel.png', '01 · Logros', 'Badge + estabilidad · sin power creep');
  await dismiss(page);

  await place(page, 'farm');
  await place(page, 'well');
  await page.evaluate(async () => {
    const { tickAchievements } = await import('/js/achievements.js');
    tickAchievements(window.__zz.getState(), window.__zz.getContent());
    window.__zz.paint?.();
  });
  await page.waitForTimeout(200);
  await shot(page, '02-badge-toast.png', '02 · Badge toast', 'Feedback no invasivo');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.pendingCatastrophe = {
      eventId: 'cat_demo',
      name: 'Tormenta negra',
      dueDay: s.day + 1,
      prepared: false,
    };
    window.__zz.paint?.();
  });
  await page.waitForTimeout(250);
  await shot(page, '03-catastrophe-warn.png', '03 · Catástrofe avisada', 'Aviso previo · banner');

  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(350);
  await shot(page, '04-prep-catastrophe.png', '04 · Preparar', 'Botón prep ante aviso');
  await dismiss(page);

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.director.protectionUntil = s.day + 3;
    s.pendingCatastrophe = null;
    window.__zz.paint?.();
  });
  await shot(page, '05-post-disaster.png', '05 · Post-desastre', 'Protección / quiet nights');

  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(300);
  await shot(page, '06-more-achievements.png', '06 · Lista badges', 'Recientes en Más');
  await dismiss(page);

  await shot(page, '07-colony.png', '07 · Colonia', 'Mundo primero');
  await shot(page, '08-map.png', '08 · Mapa', 'Contrato 2.8');
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await boot(page);
  await dismiss(page);
  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(400);
  await shot(page, '09-desktop-achievements.png', '09 · Desktop', 'Panel logros');
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
  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(350);
  await shot(page, '10-740-achievements.png', '10 · 740×360', 'Landscape');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-125 Review · Logros + Director (HUMAN_GATE)</title>
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
  <h1>ZZ-125 · Logros + Director (HUMAN_GATE)</h1>
  <p>ZZ-110…124 hechas · ≥60 logros · quiet nights · catástrofe con aviso · auditoría familias · PENDIENTE DE REVISIÓN · sin cadencia fija · contrato 2.8</p>
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
console.log('ZZ-125 review OK', gallery.map((g) => g.file).join(', '));
