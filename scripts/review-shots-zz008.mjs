/**
 * ZZ-008 R2 — intro con arte + composiciones distintas → D1.
 * Requiere: npx --yes serve -l 8765 .
 * Uso: node scripts/review-shots-zz008.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, rmSync, existsSync, writeFileSync, readdirSync, copyFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs', 'review');
const drive = 'G:\\Mi unidad\\Juegos\\Zona Zero\\Review';
const BASE = 'http://127.0.0.1:8765';
console.log('BASE', BASE);

mkdirSync(out, { recursive: true });
mkdirSync(drive, { recursive: true });
for (const f of readdirSync(out)) {
  try {
    rmSync(join(out, f), { force: true });
  } catch {
    /* ignore */
  }
}

const gallery = [];
const addShot = (file, title, note) => gallery.push({ file, title, note });

async function shot(page, file, title, note) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(out, file), fullPage: false });
  addShot(file, title, note);
}

async function openHub(page, mode) {
  const path = mode === 'continue' ? '/dev/hub-continue.html' : '/dev/hub-empty.html';
  const url = `${BASE}${path}?t=${Date.now()}`;
  const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  console.log('goto', mode, res?.status(), page.url());
  await page.waitForFunction(() => window.__hubOk === true || window.__hubErr, { timeout: 60000 });
  const err = await page.evaluate(() => window.__hubErr || null);
  if (err) throw new Error(err);
  await page.waitForSelector('#zz-hub-actions .zz-btn, #zz-hub-actions a.zz-btn', { timeout: 10000 });
  await page.waitForTimeout(350);
}

async function waitCine(page, layout) {
  await page.waitForSelector('#zz-cine.is-open', { timeout: 10000 });
  if (layout) {
    await page.waitForSelector(`#zz-cine.zz-cine--${layout}`, { timeout: 5000 });
  }
  await page.waitForFunction(() => {
    const art = document.getElementById('zz-cine-art');
    if (!art) return true;
    const bg = getComputedStyle(art).backgroundImage;
    if (!bg || bg === 'none') return true;
    return art.classList.contains('is-kenburns');
  });
  await page.waitForTimeout(400);
}

async function clickNewGame(page) {
  await page.locator('#zz-hub-actions button', { hasText: 'Nueva partida' }).click();
  await waitCine(page);
}

async function advanceIntro(page) {
  await page.locator('#zz-cine-next').click({ force: true });
  await page.waitForTimeout(450);
}

async function waitDay1(page) {
  await page.waitForFunction(() => window.__zzOk === true || window.__zzErr, { timeout: 60000 });
  const err = await page.evaluate(() => window.__zzErr || null);
  if (err) throw new Error(err);
  await page.waitForSelector('#zz-app:not([hidden])', { timeout: 15000 });
  await page.waitForTimeout(900);
}

const browser = await chromium.launch({ headless: true });

{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'es-ES',
  });
  const page = await context.newPage();

  await openHub(page, 'continue');
  await shot(page, '01-mobile-portada.png', '01 · Móvil portada', 'Con partida');

  await clickNewGame(page);
  await waitCine(page, 'confirm');
  await shot(page, '02-mobile-confirm.png', '02 · Móvil confirmación', 'Sobrescribir colonia');

  await page.locator('#zz-cine-actions .zz-btn--primary').click();
  await waitCine(page, 'collapse');
  await shot(page, '03-mobile-intro-1.png', '03 · Móvil intro 1', 'Colapso · arte');

  await advanceIntro(page);
  await waitCine(page, 'refuge');
  await shot(page, '04-mobile-intro-2.png', '04 · Móvil intro 2', 'Refugio · supervivientes');

  await advanceIntro(page);
  await waitCine(page, 'mission');
  await shot(page, '05-mobile-intro-3.png', '05 · Móvil intro 3', 'Misión · Entrar en Zona Zero');
  await shot(page, '05b-mobile-pre-d1.png', '05b · Móvil pre-D1', 'Puente visual a la colonia');

  await Promise.all([
    page.waitForURL(/\/dev\/harness/, { timeout: 30000 }),
    page.locator('#zz-cine-next').click(),
  ]);
  await waitDay1(page);
  await shot(page, '06-mobile-d1.png', '06 · Móvil Día 1', 'Tras fade desde intro');

  await openHub(page, 'empty');
  await clickNewGame(page);
  await waitCine(page, 'collapse');
  await shot(page, '11-mobile-skip.png', '11 · Móvil Saltar', 'Skip discreto');
  await Promise.all([
    page.waitForURL(/\/dev\/harness/, { timeout: 30000 }),
    page.locator('#zz-cine-skip').click(),
  ]);
  await waitDay1(page);
  await shot(page, '12-mobile-skip-d1.png', '12 · Móvil D1 tras skip', 'Entrada directa');

  await context.close();
}

{
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    locale: 'es-ES',
  });
  const page = await context.newPage();

  await openHub(page, 'empty');
  await clickNewGame(page);
  await waitCine(page, 'collapse');
  await shot(page, '07-desktop-intro-1.png', '07 · Desktop intro 1', 'Colapso');

  await advanceIntro(page);
  await waitCine(page, 'refuge');
  await shot(page, '08-desktop-intro-2.png', '08 · Desktop intro 2', 'Refugio');

  await advanceIntro(page);
  await waitCine(page, 'mission');
  await shot(page, '09-desktop-intro-3.png', '09 · Desktop intro 3', 'Misión + CTA');

  await Promise.all([
    page.waitForURL(/\/dev\/harness/, { timeout: 30000 }),
    page.locator('#zz-cine-next').click(),
  ]);
  await waitDay1(page);
  await shot(page, '10-desktop-d1.png', '10 · Desktop Día 1', 'Continuidad visual');

  await openHub(page, 'continue');
  await clickNewGame(page);
  await waitCine(page, 'confirm');
  await shot(page, '13-desktop-confirm.png', '13 · Desktop confirmación', 'Overwrite');

  await context.close();
}

await browser.close();

const index = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Zona Zero — Review ZZ-008 R2</title>
<style>
body{margin:0;font-family:system-ui,sans-serif;background:#12100e;color:#e8e0d4}
header{padding:1.2rem 1.5rem;border-bottom:1px solid #2a2620}
h1{margin:0;font-size:1.25rem}
p{margin:.4rem 0 0;opacity:.75;font-size:.9rem}
.grid{display:grid;gap:1.25rem;padding:1.25rem;grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}
figure{margin:0;background:#1a1714;border:1px solid #2e2a24;border-radius:8px;overflow:hidden}
img{display:block;width:100%;height:auto}
figcaption{padding:.75rem 1rem;font-size:.9rem}
</style>
</head>
<body>
<header>
  <h1>Zona Zero — Review ZZ-008 R2 Intro</h1>
  <p>HUMAN_GATE · Arte propio + composiciones · GAME_MASTER 2.6 §31.6</p>
</header>
<div class="grid">
${gallery
  .map(
    (g) =>
      `<figure><img src="${g.file}" alt="${g.title}"/><figcaption><strong>${g.title}</strong><br/>${g.note || ''}</figcaption></figure>`
  )
  .join('\n')}
</div>
</body>
</html>`;
writeFileSync(join(out, 'index.html'), index);

const contact = join(out, 'review-contact-sheet.jpg');
{
  const b2 = await chromium.launch({ headless: true });
  const p = await b2.newPage({ viewport: { width: 1800, height: 2400 } });
  const cards = gallery
    .map((g) => {
      const buf = readFileSync(join(out, g.file));
      const data = `data:image/png;base64,${buf.toString('base64')}`;
      return `<figure><img src="${data}" alt="${g.title}"/><figcaption><strong>${g.title}</strong><span>${g.note || ''}</span></figcaption></figure>`;
    })
    .join('\n');
  await p.setContent(`<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
body{margin:0;background:#12100e;color:#e8e0d4;font-family:system-ui,sans-serif}
header{padding:1rem 1.25rem;border-bottom:1px solid #2a2620}
h1{margin:0;font-size:1.2rem}
p{margin:.35rem 0 0;opacity:.7;font-size:.85rem}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:10px}
figure{margin:0;background:#1a1714;border:1px solid #2e2a24;border-radius:8px;overflow:hidden}
img{display:block;width:100%;height:auto;background:#0a0908}
figcaption{padding:.45rem .6rem;font-size:.75rem}
figcaption strong{display:block}
figcaption span{opacity:.65;font-size:.68rem}
</style></head><body>
<header><h1>ZZ-008 R2 — Intro cinemática → Día 1</h1>
<p>HUMAN_GATE · PENDIENTE DE REVISIÓN · GAME_MASTER 2.6 §31.6</p></header>
<div class="grid">${cards}</div></body></html>`);
  await p.waitForTimeout(600);
  await p.screenshot({ path: contact, type: 'jpeg', quality: 88, fullPage: true });
  await b2.close();
}

for (const f of readdirSync(out)) {
  copyFileSync(join(out, f), join(drive, f));
}
for (const f of readdirSync(drive)) {
  if (!existsSync(join(out, f))) {
    try {
      rmSync(join(drive, f), { force: true });
    } catch {
      /* ignore */
    }
  }
}

console.log('ZZ-008 R2 review shots OK →', out);
gallery.forEach((g) => console.log(' -', g.file));
