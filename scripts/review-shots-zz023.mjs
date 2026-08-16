/**
 * ZZ-023 HUMAN_GATE — QA D1→D5 contact sheet
 * Requires: http-server :8765
 * node scripts/review-shots-zz023.mjs
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
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(out, file), fullPage: false });
  gallery.push({ file, title, note });
}

async function boot(page, { coach = false } = {}) {
  await page.goto(`${HARNESS}#new=1&clear=1&name=Refugio%20Norte`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForFunction(() => window.__zzOk === true || window.__zzErr, { timeout: 60000 });
  if (await page.evaluate(() => window.__zzErr)) throw new Error(await page.evaluate(() => window.__zzErr));
  await page.waitForSelector('#zz-app:not([hidden])', { timeout: 15000 });
  await page.waitForTimeout(300);
  await page.evaluate((keepCoach) => {
    const s = window.__zz.getState();
    s.resources.wood = Math.max(50, s.resources.wood || 0);
    s.resources.food = Math.max(50, s.resources.food || 0);
    s.resources.water = Math.max(50, s.resources.water || 0);
    if (s.population?.labor) s.population.labor.idle = Math.max(4, s.population.labor.idle || 0);
    s.pendingChoice = null;
    s.director = s.director || {};
    s.director.tension = 0;
    s.director.protectionUntil = 99;
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

async function place(page, type) {
  await page.evaluate((t) => {
    window.__zz.startBuild(t);
    const free = window.__zz.freeCells();
    const cell = free[0];
    window.__zz.setGhost(cell[0], cell[1]);
    window.__zz.confirmBuild();
    const sh = document.getElementById('zz-sheet');
    if (sh) sh.hidden = true;
  }, type);
  await page.waitForTimeout(200);
}

async function dismissOverlays(page) {
  await page.evaluate(() => {
    const s = window.__zz.getState();
    if (s) {
      s.pendingChoice = null;
      if (s.director) {
        s.director.tension = 0;
        s.director.protectionUntil = Math.max(s.director.protectionUntil || 0, (s.day || 1) + 20);
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

async function advanceQuiet(page) {
  await dismissOverlays(page);
  await page.click('#zz-advance', { force: true });
  await page.waitForTimeout(380);
  await dismissOverlays(page);
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
  await shot(page, '01-d1-coach.png', '01 · D1 coach', 'Tutorial contextual');

  await place(page, 'farm');
  await page.evaluate(() => {
    const farm = window.__zz.getState().base.buildings.find((x) => x.type === 'farm');
    if (farm) window.__zz.adjustWorkers(farm.id, 1);
  });
  await place(page, 'well');
  await page.evaluate(() => {
    const well = window.__zz.getState().base.buildings.find((x) => x.type === 'well');
    if (well) window.__zz.adjustWorkers(well.id, 1);
  });
  await dismissOverlays(page);
  await shot(page, '02-d1-colony.png', '02 · D1 colonia', 'Huerto+pozo staffed');

  await page.click('#zz-advance', { force: true });
  await page.waitForTimeout(400);
  await shot(page, '03-d2-brief.png', '03 · D2 brief', 'Comida/Agua ritual');
  await dismissOverlays(page);

  await advanceQuiet(page);

  await page.evaluate(() => {
    const s = window.__zz.getState();
    const m = s.zones.find((z) => z.id === 'market');
    if (m && m.state === 'unknown') m.state = 'discovered';
    s.flags.earlyLandmarksRevealed = true;
    s.pendingChoice = null;
    window.__zz.paint?.();
  });
  await dismissOverlays(page);
  await shot(page, '04-d3-reveal.png', '04 · D3 reveal', 'Landmark cercano visible');

  await dismissOverlays(page);
  await page.evaluate(() => window.__zz.selectZone?.('market'));
  await page.waitForTimeout(350);
  await shot(page, '05-d3-zone-sheet.png', '05 · Ficha zona', 'Riesgo/tiempo · a pie');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    const ex = (s.explorers || []).find((e) => e.status === 'ready');
    window.__zz.sendExpedition?.('market', ex?.id);
  });
  await dismissOverlays(page);
  await page.waitForTimeout(350);
  await shot(page, '06-d3-route.png', '06 · Ruta en mapa', 'Expedición en camino');

  let gotReport = false;
  for (let i = 0; i < 6; i++) {
    await dismissOverlays(page);
    await page.click('#zz-advance', { force: true });
    await page.waitForTimeout(400);
    const briefOpen = await page.evaluate(() => !document.getElementById('zz-day-brief')?.hidden);
    if (briefOpen && !gallery.some((g) => g.file === '07-return-brief.png')) {
      await shot(page, '07-return-brief.png', '07 · Brief con retorno', 'Día del regreso');
      await page.evaluate(() => document.getElementById('zz-brief-ok')?.click());
      await page.waitForTimeout(350);
    } else if (briefOpen) {
      await page.evaluate(() => document.getElementById('zz-brief-ok')?.click());
      await page.waitForTimeout(300);
    }
    const reportNow = await page.evaluate(() => {
      const body = document.getElementById('zz-sheet-body');
      const sheet = document.getElementById('zz-sheet');
      return sheet && !sheet.hidden && body && /Informe de expedición/.test(body.textContent || '');
    });
    if (reportNow) {
      await shot(page, '08-return-report.png', '08 · Informe retorno', 'Botín / heridas');
      await page.evaluate(() => document.querySelector('[data-action="close-sheet"]')?.click());
      gotReport = true;
      break;
    }
    await dismissOverlays(page);
  }

  if (!gotReport) {
    await page.evaluate(() => {
      const reps = window.__zz.getState().lastExpeditionReports || [];
      if (!reps.length) return;
      const r = reps[0];
      const lootTxt = Object.entries(r.loot || {})
        .map(([k, v]) => `${v} ${k}`)
        .join(', ');
      const body = document.getElementById('zz-sheet-body');
      const sheet = document.getElementById('zz-sheet');
      if (!body || !sheet) return;
      body.innerHTML = `<div class="zz-ctx"><h2>Informe de expedición</h2>
        <div class="zz-exp-report"><h3>${r.explorerName} · ${r.zoneName}</h3>
        ${(r.lines || []).map((l) => `<p>${l}</p>`).join('')}
        ${lootTxt ? `<p><strong>Botín:</strong> ${lootTxt}</p>` : ''}</div>
        <button type="button" class="zz-btn zz-btn--primary zz-btn--wide" data-action="close-sheet">Continuar</button></div>`;
      sheet.hidden = false;
    });
    await shot(page, '08-return-report.png', '08 · Informe retorno', 'Botín / heridas');
    await dismissOverlays(page);
  }

  if (!gallery.some((g) => g.file === '07-return-brief.png')) {
    await page.click('#zz-advance', { force: true });
    await page.waitForTimeout(400);
    if (await page.evaluate(() => !document.getElementById('zz-day-brief')?.hidden)) {
      await shot(page, '07-return-brief.png', '07 · Brief diario', 'Ritual comida/agua');
    }
    await dismissOverlays(page);
  }

  while ((await page.evaluate(() => window.__zz.getState().day)) < 5) {
    await advanceQuiet(page);
  }
  await dismissOverlays(page);
  await shot(page, '09-d5-overview.png', '09 · D5 overview', 'Loop estable');
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await boot(page, { coach: false });
  await place(page, 'farm');
  await page.evaluate(() => {
    const farm = window.__zz.getState().base.buildings.find((x) => x.type === 'farm');
    if (farm) window.__zz.adjustWorkers(farm.id, 1);
  });
  await dismissOverlays(page);
  await shot(page, '10-desktop-d1.png', '10 · Desktop D1', 'Panel+mundo');
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
  await boot(page, { coach: false });
  await dismissOverlays(page);
  await shot(page, '11-740-d1.png', '11 · 740×360', 'Landscape compacto');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-023 Review · QA D1→D5 (HUMAN_GATE)</title>
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
  <h1>ZZ-023 · QA D1→D5 (HUMAN_GATE)</h1>
  <p>Loop estable · exploración D3 · brief · staffing · PENDIENTE DE REVISIÓN · no ZZ-024 · deuda arte post-019B no bloqueante</p>
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
console.log('ZZ-023 review OK', gallery.map((g) => g.file).join(', '));
