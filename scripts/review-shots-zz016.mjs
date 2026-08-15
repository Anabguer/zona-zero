/**
 * ZZ-016 — review landscape + rotate gate (HUMAN_GATE).
 * Requires: npx --yes serve -l 8765 .
 * Uso: node scripts/review-shots-zz016.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, rmSync, existsSync, writeFileSync, readdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs', 'review');
const drive = 'G:\\Mi unidad\\Juegos\\Zona Zero\\Review';
const BASE = 'http://127.0.0.1:8765';

mkdirSync(out, { recursive: true });
mkdirSync(drive, { recursive: true });
for (const f of readdirSync(out)) {
  try {
    rmSync(join(out, f), { force: true });
  } catch {
    /* ignore */
  }
}
if (existsSync(drive)) {
  for (const f of readdirSync(drive)) {
    try {
      rmSync(join(drive, f), { force: true });
    } catch {
      /* ignore */
    }
  }
}

const gallery = [];
const addShot = (file, title, note) => gallery.push({ file, title, note });

async function shot(page, file, title, note) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: join(out, file), fullPage: false });
  addShot(file, title, note);
}

async function boot(page, hash = 'new=1&clear=1&name=Refugio%20Norte') {
  await page.goto(`${BASE}/dev/harness.html#${hash}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => window.__zzOk === true || window.__zzErr, { timeout: 60000 });
  const err = await page.evaluate(() => window.__zzErr || null);
  if (err) throw new Error(err);
  await page.waitForSelector('#zz-app:not([hidden])', { timeout: 15000 });
  await page.waitForTimeout(500);
}

async function quietUi(page) {
  await page.evaluate(() => {
    const coach = document.getElementById('zz-coach');
    if (coach) coach.hidden = true;
    const brief = document.getElementById('zz-day-brief');
    if (brief) brief.hidden = true;
    const sheet = document.getElementById('zz-sheet');
    if (sheet) sheet.hidden = true;
  });
}

async function selectHq(page) {
  await page.evaluate(() => {
    const s = window.__zz.getState();
    const hq = s.base.buildings.find((b) => String(b.type).startsWith('hq_') && b.hp > 0);
    if (!hq) throw new Error('no HQ');
    window.__zz.selectBuilding(hq.id);
    const coach = document.getElementById('zz-coach');
    if (coach) coach.hidden = true;
  });
  await page.waitForFunction(() => {
    const s = document.getElementById('zz-sheet');
    return s && !s.hidden;
  }, { timeout: 5000 });
}

const browser = await chromium.launch({ headless: true });

/* —— 844×390 landscape —— */
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
  await quietUi(page);
  await shot(page, '01-mobile-landscape-d1.png', '01 · Landscape D1 (844×390)', 'Mundo protagonista + HUD compacto');

  await selectHq(page);
  await shot(page, '02-mobile-landscape-hq-selected.png', '02 · HQ seleccionado', 'Ficha lateral compacta');

  await page.locator('#zz-sheet-close').click({ force: true }).catch(() => {});
  await quietUi(page);
  await page.evaluate(() => {
    window.__zz.zoomBy(1.35);
    const coach = document.getElementById('zz-coach');
    if (coach) coach.hidden = true;
  });
  await shot(page, '03-mobile-landscape-zoom.png', '03 · Zoom in', 'Cámara landscape');

  await page.evaluate(() => {
    window.__zz.panBy(28, -12);
    const coach = document.getElementById('zz-coach');
    if (coach) coach.hidden = true;
  });
  await shot(page, '04-mobile-landscape-pan.png', '04 · Pan', 'Mundo continúa hacia los lados');
  await ctx.close();
}

/* —— portrait rotate gate —— */
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'es-ES',
  });
  const page = await ctx.newPage();
  await boot(page);
  await page.waitForFunction(() => {
    const g = document.getElementById('zz-rotate-gate');
    return g && !g.hidden;
  }, { timeout: 5000 });
  await shot(page, '05-mobile-portrait-rotate-gate.png', '05 · Rotate gate', 'Portrait gameplay bloqueado con marca ZZ');

  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(250);
  await page.evaluate(() => window.__zz.refreshOrientation());
  await quietUi(page);
  await shot(page, '06-mobile-after-rotation.png', '06 · Tras girar', 'Vuelve al gameplay; estado intacto');
  await ctx.close();
}

/* —— small landscape risk —— */
{
  const ctx = await browser.newContext({
    viewport: { width: 740, height: 360 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'es-ES',
  });
  const page = await ctx.newPage();
  await boot(page);
  await quietUi(page);
  await shot(page, '07-mobile-landscape-small.png', '07 · Landscape pequeño (740×360)', 'Chrome comprimido; mundo visible');
  await ctx.close();
}

/* —— 932×430 —— */
{
  const ctx = await browser.newContext({
    viewport: { width: 932, height: 430 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'es-ES',
  });
  const page = await ctx.newPage();
  await boot(page);
  await quietUi(page);
  await shot(page, '10-mobile-landscape-932.png', '10 · Landscape 932×430', 'Viewport representativo grande');
  await page.locator('#zz-help').click({ force: true });
  await page.waitForTimeout(300);
  await shot(page, '11-mobile-landscape-help.png', '11 · Ayuda landscape', 'Sheet lateral');
  await ctx.close();
}

/* —— desktop —— */
{
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    locale: 'es-ES',
  });
  const page = await ctx.newPage();
  await boot(page);
  await quietUi(page);
  await shot(page, '08-desktop-d1.png', '08 · Desktop D1', 'Panorámico sin rotate gate');
  await selectHq(page);
  await shot(page, '09-desktop-hq-selected.png', '09 · Desktop HQ', 'Panel lateral desktop');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-016 Review · Landscape</title>
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
  <h1>ZZ-016 · Landscape móvil + rotate gate</h1>
  <p>HUMAN_GATE · GAME_MASTER 2.7 · No deploy · ZZ-017 no iniciado</p>
</header>
<div class="grid">
${gallery
  .map(
    (g) => `<figure><img src="${g.file}" alt="${g.title}"/><figcaption><strong>${g.title}</strong><span>${g.note || ''}</span></figcaption></figure>`
  )
  .join('\n')}
</div></body></html>`
);

/* contact sheet */
const contact = join(out, 'review-contact-sheet.jpg');
{
  const b2 = await chromium.launch({ headless: true });
  const p = await b2.newPage({ viewport: { width: 1800, height: 2200 } });
  await p.goto(`file://${out.replace(/\\/g, '/')}/index.html`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  await p.screenshot({ path: contact, type: 'jpeg', quality: 82, fullPage: true });
  await b2.close();
}

for (const f of readdirSync(out)) {
  copyFileSync(join(out, f), join(drive, f));
}
console.log('ZZ-016 review OK →', out, '+ Drive');
console.log('shots:', gallery.map((g) => g.file).join(', '));
