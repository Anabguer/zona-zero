/**
 * ZZ-017 — mundo base limpio + colonia > viewport.
 * Requires: npx --yes serve -l 8765 .
 * Uso: node scripts/review-shots-zz017.mjs
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
const addShot = (file, title, note) => gallery.push({ file, title, note });

async function shot(page, file, title, note) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: join(out, file), fullPage: false });
  addShot(file, title, note);
}

async function boot(page) {
  await page.goto(`${BASE}/dev/harness.html#new=1&clear=1&name=Refugio%20Norte`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
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
  await quietUi(page);

  const scenery = await page.evaluate(() => document.querySelectorAll('.zz-settle-scenery').length);
  if (scenery > 0) throw new Error('props scenery falsos presentes: ' + scenery);

  await shot(page, '01-mobile-landscape-world-clean.png', '01 · Mundo base limpio', 'Solo HQ construido; sin huerto/pozo falsos');
  await page.evaluate(() => {
    const s = window.__zz.getState();
    const hq = s.base.buildings.find((b) => String(b.type).startsWith('hq_'));
    window.__zz.selectBuilding(hq.id);
    const coach = document.getElementById('zz-coach');
    if (coach) coach.hidden = true;
  });
  await shot(page, '02-mobile-landscape-hq-in-world.png', '02 · HQ en el mundo', 'Colonia del jugador vs terreno');

  await page.evaluate(() => {
    document.getElementById('zz-sheet').hidden = true;
    window.__zz.zoomBy(1 / 1.25);
    const coach = document.getElementById('zz-coach');
    if (coach) coach.hidden = true;
  });
  await shot(page, '03-mobile-landscape-zoom-out.png', '03 · Zoom out', 'Mundo > viewport');

  await page.evaluate(() => {
    window.__zz.panBy(22, -10);
    const coach = document.getElementById('zz-coach');
    if (coach) coach.hidden = true;
  });
  await shot(page, '04-mobile-landscape-pan-east.png', '04 · Pan este', 'Terreno/ruinas alrededor');

  await page.evaluate(() => {
    window.__zz.panBy(-40, 18);
    const coach = document.getElementById('zz-coach');
    if (coach) coach.hidden = true;
  });
  await shot(page, '05-mobile-landscape-pan-west.png', '05 · Pan oeste', 'Espacio recuperable futuro');

  await page.evaluate(() => {
    window.__zz.recenter();
    const coach = document.getElementById('zz-coach');
    if (coach) coach.hidden = true;
  });
  await shot(page, '06-mobile-landscape-terrain-read.png', '06 · Lectura terreno', 'Escombros/vallas ≠ edificios');
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
  await quietUi(page);
  await shot(page, '07-mobile-landscape-small.png', '07 · 740×360', 'Composición baja');
  await ctx.close();
}

{
  const ctx = await browser.newContext({
    viewport: { width: 932, height: 430 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await boot(page);
  await quietUi(page);
  await shot(page, '08-mobile-landscape-932.png', '08 · 932×430', 'Viewport grande');
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await boot(page);
  await quietUi(page);
  await shot(page, '09-desktop-world-clean.png', '09 · Desktop limpio', 'Panorámico');
  await page.evaluate(() => {
    window.__zz.panBy(20, -8);
    const coach = document.getElementById('zz-coach');
    if (coach) coach.hidden = true;
  });
  await shot(page, '10-desktop-pan.png', '10 · Desktop pan', 'Mundo amplio');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-017 Review · Mundo base</title>
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
  <h1>ZZ-017 · Arte base limpio + colonia &gt; viewport</h1>
  <p>B0 · ZZ-018 NO iniciada · No deploy</p>
</header>
<div class="grid">
${gallery
  .map(
    (g) => `<figure><img src="${g.file}" alt="${g.title}"/><figcaption><strong>${g.title}</strong><span>${g.note || ''}</span></figcaption></figure>`
  )
  .join('\n')}
</div></body></html>`
);

const contact = join(out, 'review-contact-sheet.jpg');
{
  const b2 = await chromium.launch({ headless: true });
  const p = await b2.newPage({ viewport: { width: 1800, height: 2000 } });
  await p.goto(`file://${out.replace(/\\/g, '/')}/index.html`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  await p.screenshot({ path: contact, type: 'jpeg', quality: 82, fullPage: true });
  await b2.close();
}

for (const f of readdirSync(out)) {
  copyFileSync(join(out, f), join(drive, f));
}
console.log('ZZ-017 review OK', gallery.map((g) => g.file).join(', '));
