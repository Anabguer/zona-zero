/**
 * ZZ-007 — capturas portada HUMAN_GATE.
 * Requiere: npx --yes serve -l 8765 .
 * Uso: node scripts/review-shots-zz007.mjs
 */
import { chromium, devices } from 'playwright';
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
// Limpia capturas previas (no borrar carpeta entera bajo serve)
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
  await page.waitForTimeout(400);
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
  await page.waitForTimeout(400);
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
  await openHub(page, 'empty');
  await shot(page, '01-mobile-hub-empty.png', '01 · Móvil sin partida', 'Nueva partida principal');
  await openHub(page, 'continue');
  await shot(page, '02-mobile-hub-continue.png', '02 · Móvil con partida', 'Continuar primario + Nueva');
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
  await shot(page, '03-desktop-hub-empty.png', '03 · Desktop sin partida', 'Brand + Nueva');
  await openHub(page, 'continue');
  await shot(page, '04-desktop-hub-continue.png', '04 · Desktop con partida', 'Continuar + meta');
  await context.close();
}

await browser.close();

const index = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Zona Zero — Review ZZ-007</title>
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
  <h1>Zona Zero — Review ZZ-007 Portada</h1>
  <p>HUMAN_GATE · Continuar / Nueva sin slots · GAME_MASTER 2.6 §31.5</p>
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
  const p = await b2.newPage({ viewport: { width: 1600, height: 1400 } });
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
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px}
figure{margin:0;background:#1a1714;border:1px solid #2e2a24;border-radius:8px;overflow:hidden}
img{display:block;width:100%;height:auto;background:#0a0908}
figcaption{padding:.5rem .65rem;font-size:.8rem}
figcaption strong{display:block}
figcaption span{opacity:.65;font-size:.72rem}
</style></head><body>
<header><h1>ZZ-007 — Portada Continuar / Nueva</h1>
<p>HUMAN_GATE · PENDIENTE DE REVISIÓN · GAME_MASTER 2.6 §31.5</p></header>
<div class="grid">${cards}</div></body></html>`);
  await p.waitForTimeout(500);
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

console.log('ZZ-007 review shots OK →', out);
console.log('Contact sheet →', contact);
console.log('Drive copy →', drive);
gallery.forEach((g) => console.log(' -', g.file));
