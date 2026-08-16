/**
 * ZZ-015 HUMAN_GATE — QA D1 + contact sheet (cierre Experiencia D1 / 2.8).
 * Requires: http server :8765
 * node scripts/review-shots-zz015.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, rmSync, writeFileSync, readdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs', 'review');
const drive = 'G:\\Mi unidad\\Juegos\\Zona Zero\\Review';
const BASE = 'http://127.0.0.1:8765';
const HARNESS = `${BASE}/dev/harness-zz.html`;

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
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, file), fullPage: false });
  gallery.push({ file, title, note });
}

async function boot(page, { coach = true } = {}) {
  await page.goto(`${HARNESS}#new=1&clear=1&name=Refugio%20Norte`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  await page.waitForFunction(() => window.__zzOk === true || window.__zzErr, { timeout: 60000 });
  const err = await page.evaluate(() => window.__zzErr || null);
  if (err) throw new Error(err);
  await page.waitForSelector('#zz-app:not([hidden])', { timeout: 15000 });
  await page.waitForTimeout(450);
  await page.evaluate((keepCoach) => {
    const s = window.__zz.getState();
    s.resources.wood = Math.max(40, s.resources.wood || 0);
    s.resources.water = Math.max(30, s.resources.water || 0);
    if (s.population?.labor) s.population.labor.idle = Math.max(4, s.population.labor.idle || 0);
    if (keepCoach) {
      s.flags.onboardingDone = false;
      s.flags.onboardingActive = true;
      s.flags.onboardingStep = 0;
    } else {
      s.flags.onboardingDone = true;
      s.flags.onboardingActive = false;
    }
    window.__zz.paint?.();
  }, coach);
}

async function placeViaGhost(page, type) {
  await page.evaluate((t) => {
    window.__zz.startBuild(t);
    const free = window.__zz.freeCells();
    const cell = free[1] || free[0];
    window.__zz.setGhost(cell[0], cell[1]);
    window.__zz.confirmBuild();
    const sh = document.getElementById('zz-sheet');
    if (sh) sh.hidden = true;
  }, type);
  await page.waitForTimeout(320);
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
  await boot(page, { coach: true });

  await shot(page, '01-d1-coach-hud.png', '01 · Coach + HUD', 'Comida/Agua/Madera · tip superficies');

  await page.evaluate(() => window.__zz.startBuild('farm'));
  await page.waitForTimeout(350);
  await shot(page, '02-d1-surfaces-ghost.png', '02 · Superficies + ghost', 'Áreas edificables · ✓/✕');

  await placeViaGhost(page, 'farm');
  await page.evaluate(() => {
    const s = window.__zz.getState();
    const b = s.base.buildings.find((x) => x.type === 'farm');
    if (b) window.__zz.adjustWorkers(b.id, 1);
    const sh = document.getElementById('zz-sheet');
    if (sh) sh.hidden = true;
    window.__zz.paint?.();
  });
  await shot(page, '03-d1-staff-farm.png', '03 · Huerto staffed', 'Avance tutorial natural');

  await placeViaGhost(page, 'well');
  await page.evaluate(() => {
    const s = window.__zz.getState();
    const b = s.base.buildings.find((x) => x.type === 'well');
    if (b) window.__zz.adjustWorkers(b.id, 1);
    const sh = document.getElementById('zz-sheet');
    if (sh) sh.hidden = true;
  });
  await shot(page, '04-d1-ready.png', '04 · Listo avanzar', 'Pozo + tip final');

  await page.evaluate(() => {
    window.__zz.panBy?.(24, -14);
  });
  await shot(page, '05-d1-pan-world.png', '05 · Pan mundo', 'Mundo > viewport');

  await page.evaluate(() => window.__zz.recenter?.());
  await page.click('#zz-help', { force: true });
  await page.waitForTimeout(300);
  await shot(page, '06-d1-help.png', '06 · Ayuda', 'Superficies · ghost · recuperar');
  await page.evaluate(() => {
    const sh = document.getElementById('zz-sheet');
    if (sh) sh.hidden = true;
  });
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
  await boot(page, { coach: true });
  await shot(page, '07-d1-740.png', '07 · 740×360', 'Coach + HUD legibles');
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await boot(page, { coach: false });

  const layout = await page.evaluate(() => ({
    desk: document.body.classList.contains('zz-desk-layout'),
    panelHidden: document.getElementById('zz-desk-panel')?.hidden,
    stageW: document.querySelector('.zz-world-stage')?.getBoundingClientRect().width || 0,
  }));
  if (!layout.desk || layout.panelHidden) throw new Error('ZZ-015 expects desktop panel: ' + JSON.stringify(layout));
  if (layout.stageW > 1700) throw new Error('World full-bleed unexpectedly: ' + layout.stageW);

  await shot(page, '08-d1-desktop-panel.png', '08 · Desktop panel+mundo', 'Columna info · mundo jugable');

  await page.evaluate(() => window.__zz.startBuild('farm'));
  await page.waitForTimeout(350);
  await shot(page, '09-d1-desktop-build.png', '09 · Desktop construir', 'Superficies + panel');

  await page.evaluate(() => {
    window.__zz.cancelBuild?.();
    document.getElementById('zz-desk-pop')?.click();
  });
  await page.waitForTimeout(350);
  await shot(page, '10-d1-desktop-sheet.png', '10 · Desktop ficha', 'Sheet en columna panel');
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await boot(page, { coach: true });
  await shot(page, '11-d1-desktop-coach.png', '11 · Desktop + coach', 'Tutorial en composición panel');
  await ctx.close();
}

{
  const ctx = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await boot(page, { coach: false });
  const mobile = await page.evaluate(() => ({
    desk: document.body.classList.contains('zz-desk-layout'),
    panelHidden: document.getElementById('zz-desk-panel')?.hidden,
  }));
  if (mobile.desk || !mobile.panelHidden) throw new Error('Mobile must not use desk panel');
  await shot(page, '12-d1-mobile-clean.png', '12 · Móvil limpio', 'Sin panel desktop · D1 HQ');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-015 Review · QA D1 (HUMAN_GATE)</title>
<style>
body{margin:0;background:#12100c;color:#e8e0d0;font-family:system-ui,sans-serif}
header{padding:1.25rem 1.5rem;border-bottom:1px solid #333}
h1{margin:0;font-size:1.25rem}
p{margin:.35rem 0 0;opacity:.75;font-size:.9rem}
.grid{display:grid;gap:1rem;padding:1rem;grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}
figure{margin:0;background:#1a1612;border:1px solid #333;border-radius:10px;overflow:hidden}
img{display:block;width:100%;height:auto;background:#0a0908}
figcaption{padding:.65rem .75rem;font-size:.85rem}
figcaption strong{display:block}
figcaption span{opacity:.7;font-size:.78rem}
</style></head><body>
<header>
  <h1>ZZ-015 · QA Día 1 + contact sheet (HUMAN_GATE)</h1>
  <p>Cierre bloque Experiencia D1 · 2.8 · PENDIENTE DE REVISIÓN · no ZZ-020 · deuda artística D1 no bloqueante (post ZZ-019B)</p>
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
  const p = await b2.newPage({ viewport: { width: 1600, height: 2800 } });
  await p.goto(`file://${out.replace(/\\/g, '/')}/index.html`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
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
console.log('ZZ-015 review OK', gallery.map((g) => g.file).join(', '));
