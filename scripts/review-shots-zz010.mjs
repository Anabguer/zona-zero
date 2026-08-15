/**
 * ZZ-010 — capturas colonia física D1 (HUMAN_GATE).
 * Requiere: npx --yes serve -l 8765 .
 * Uso: node scripts/review-shots-zz010.mjs
 */
import { chromium, devices } from 'playwright';
import { mkdirSync, rmSync, existsSync, writeFileSync, readdirSync, copyFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs', 'review');
const drive = 'G:\\Mi unidad\\Juegos\\Zona Zero\\Review';
const BASE = process.env.ZZ_REVIEW_URL || 'http://127.0.0.1:8765/dev/harness.html';

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
mkdirSync(drive, { recursive: true });

const gallery = [];
const addShot = (file, title, note) => gallery.push({ file, title, note });

async function boot(page) {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => window.__zzOk === true || window.__zzErr, { timeout: 30000 });
  const err = await page.evaluate(() => window.__zzErr || null);
  if (err) throw new Error(err);
  await page.waitForTimeout(600);
  // Cerrar intro para ver colonia limpia
  const next = await page.$('#zz-coach-next');
  if (next) {
    await next.click();
    await page.waitForTimeout(400);
  }
}

async function closeOverlays(page) {
  await page.evaluate(() => {
    document.querySelectorAll('#zz-coach, .zz-coach-card, #zz-sheet, #zz-day-brief').forEach((el) => {
      el.hidden = true;
    });
    const s = window.__zz?.getState?.();
    if (s) {
      s.selectedBuildingId = null;
      s.selectedZoneId = null;
      s.uiMode = null;
      s.buildMode = null;
    }
    window.__zz?.paint?.();
  });
}

async function cleanComposition(page, { keepCamera = false } = {}) {
  await page.evaluate((keep) => {
    document.querySelectorAll('#zz-coach, .zz-coach-card, #zz-sheet, #zz-day-brief').forEach((el) => {
      el.hidden = true;
    });
    const s = window.__zz.getState();
    s.flags = s.flags || {};
    s.flags.onboardingActive = false;
    s.selectedBuildingId = null;
    s.selectedZoneId = null;
    s.uiMode = null;
    s.buildMode = null;
    if (!keep) window.__zz.recenter();
    else window.__zz.paint();
  }, keepCamera);
  await page.waitForTimeout(350);
}

async function shot(page, file, title, note) {
  await page.waitForTimeout(280);
  await page.screenshot({ path: join(out, file), fullPage: false });
  addShot(file, title, note);
}

async function zoomOut(page, times = 3) {
  await page.evaluate((n) => {
    const s = window.__zz.getState();
    for (let i = 0; i < n; i++) s.mapCamera.zoom = (s.mapCamera.zoom || 3) / 1.12;
    window.__zz.paint?.();
  }, times);
  await page.waitForTimeout(200);
}

async function zoomIn(page, times = 2) {
  await page.evaluate((n) => {
    const s = window.__zz.getState();
    for (let i = 0; i < n; i++) s.mapCamera.zoom = Math.min(3.45, (s.mapCamera.zoom || 1) * 1.15);
    window.__zz.paint?.();
  }, times);
  await page.waitForTimeout(200);
}

async function panAway(page) {
  await page.evaluate(() => {
    const s = window.__zz.getState();
    const camp = s.zones.find((z) => z.type === 'camp');
    if (camp) {
      s.mapCamera.x = camp.x + 6;
      s.mapCamera.y = camp.y - 4;
    }
    window.__zz.paint?.();
  });
  await page.waitForTimeout(250);
}

async function recenter(page) {
  await page.click('#zz-recenter', { force: true });
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__zz.paint?.());
}

async function tapHq(page) {
  await page.evaluate(() => {
    const hq = document.querySelector('.zz-settle-bldg--hq, .zz-settle-bldg[data-type^="hq_"]');
    if (hq) hq.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(350);
}

const browser = await chromium.launch({ headless: true });

// ——— MÓVIL 390×844 ———
{
  const context = await browser.newContext({
    ...devices['iPhone 12'],
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: 'es-ES',
  });
  const page = await context.newPage();
  await boot(page);
  await cleanComposition(page);

  await shot(page, '01-mobile-d1.png', '01 · Móvil D1', 'colonia inicial 390×844');

  await zoomIn(page, 2);
  await cleanComposition(page, { keepCamera: true });
  await shot(page, '02-mobile-d1-zoom.png', '02 · Móvil zoom', 'acercar colonia');

  await panAway(page);
  await closeOverlays(page);
  await shot(page, '03-mobile-d1-pan.png', '03 · Móvil pan', 'desplazamiento limitado');

  await recenter(page);
  await cleanComposition(page);
  await shot(page, '04-mobile-d1-recenter.png', '04 · Móvil recentrar', 'vuelve al refugio');

  await tapHq(page);
  await page.evaluate(() => {
    document.querySelectorAll('#zz-coach, .zz-coach-card').forEach((el) => {
      el.hidden = true;
    });
  });
  await shot(page, '09-mobile-d1-hq-tap.png', '09 · Móvil tap HQ', 'feedback selección');
  await closeOverlays(page);

  await context.close();
}

// ——— DESKTOP 1920×1080 ———
{
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    locale: 'es-ES',
  });
  const page = await context.newPage();
  await boot(page);
  await cleanComposition(page);

  await shot(page, '05-desktop-d1.png', '05 · Desktop D1', 'colonia inicial 1920×1080');

  await zoomIn(page, 2);
  await cleanComposition(page, { keepCamera: true });
  await shot(page, '06-desktop-d1-zoom.png', '06 · Desktop zoom', 'acercar');

  await panAway(page);
  await closeOverlays(page);
  await shot(page, '07-desktop-d1-pan.png', '07 · Desktop pan', 'desplazamiento');

  await recenter(page);
  await cleanComposition(page);
  await shot(page, '08-desktop-d1-recenter.png', '08 · Desktop recentrar', 'vuelve al refugio');

  await tapHq(page);
  await page.evaluate(() => {
    document.querySelectorAll('#zz-coach, .zz-coach-card').forEach((el) => {
      el.hidden = true;
    });
  });
  await shot(page, '10-desktop-d1-hq-hover.png', '10 · Desktop HQ', 'hover/selección');

  await context.close();
}

await browser.close();

const index = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Zona Zero — Review ZZ-010</title>
<style>
body{margin:0;font-family:system-ui,sans-serif;background:#12100e;color:#e8e0d4}
header{padding:1.2rem 1.5rem;border-bottom:1px solid #2a2620}
h1{margin:0;font-size:1.25rem}
p{margin:.4rem 0 0;opacity:.75;font-size:.9rem}
.grid{display:grid;gap:1.25rem;padding:1.25rem;grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}
figure{margin:0;background:#1a1714;border:1px solid #2e2a24;border-radius:8px;overflow:hidden}
img{display:block;width:100%;height:auto}
figcaption{padding:.65rem .8rem;font-size:.85rem}
figcaption strong{display:block}
figcaption span{opacity:.65;font-size:.78rem}
</style>
</head>
<body>
<header>
  <h1>ZZ-010 — Colonia física D1 (sin GIS)</h1>
  <p>HUMAN_GATE · PENDIENTE DE REVISIÓN · GAME_MASTER 2.5</p>
</header>
<div class="grid">
${gallery
  .map(
    (g) => `<figure><img src="${g.file}" alt="${g.title}"/><figcaption><strong>${g.title}</strong><span>${g.note || ''}</span></figcaption></figure>`
  )
  .join('\n')}
</div>
</body>
</html>`;
writeFileSync(join(out, 'index.html'), index, 'utf8');

const contact = join(out, 'review-contact-sheet.jpg');
{
  // Contact sheet con imágenes embebidas (evita roturas file:// / cache serve)
  const b2 = await chromium.launch({ headless: true });
  const p = await b2.newPage({ viewport: { width: 1600, height: 2200 } });
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
<header><h1>ZZ-010 — Colonia física D1 (sin GIS)</h1>
<p>HUMAN_GATE · PENDIENTE DE REVISIÓN · GAME_MASTER 2.5</p></header>
<div class="grid">${cards}</div></body></html>`);
  await p.waitForTimeout(500);
  await p.screenshot({ path: contact, type: 'jpeg', quality: 88, fullPage: true });
  await b2.close();
}

// Copy to Drive (replace, no history)
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

console.log('ZZ-010 review shots OK →', out);
console.log('Contact sheet →', contact);
console.log('Drive copy →', drive);
gallery.forEach((g) => console.log(' -', g.file));
