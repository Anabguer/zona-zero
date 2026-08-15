/**
 * ZZ-012 — tutorial contextual en mundo (HUMAN_GATE).
 * Requiere: npx --yes serve -l 8765 .
 * Uso: node scripts/review-shots-zz012.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, rmSync, existsSync, writeFileSync, readdirSync, copyFileSync, readFileSync } from 'fs';
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

const gallery = [];
const addShot = (file, title, note) => gallery.push({ file, title, note });

async function shot(page, file, title, note) {
  await page.waitForTimeout(450);
  await page.screenshot({ path: join(out, file), fullPage: false });
  addShot(file, title, note);
}

async function boot(page, hash = 'new=1&intro=1&clear=1&name=Refugio%20Norte') {
  await page.goto(`${BASE}/dev/harness.html#${hash}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => window.__zzOk === true || window.__zzErr, { timeout: 60000 });
  const err = await page.evaluate(() => window.__zzErr || null);
  if (err) throw new Error(err);
  await page.waitForSelector('#zz-app:not([hidden])', { timeout: 15000 });
  await page.waitForTimeout(600);
}

async function waitCoach(page, includes) {
  await page.waitForFunction(
    (t) => {
      const c = document.getElementById('zz-coach');
      const p = document.getElementById('zz-coach-text');
      return c && !c.hidden && p && p.textContent.includes(t);
    },
    includes,
    { timeout: 10000 }
  );
}

async function placeNear(page, type) {
  await page.evaluate((t) => {
    const s = window.__zz.getState();
    const cx = Math.floor(s.base.w / 2);
    const cy = Math.floor(s.base.h / 2);
    const cells = [];
    for (let y = 0; y < s.base.h; y++) {
      for (let x = 0; x < s.base.w; x++) {
        if (!s.base.buildings.some((b) => b.x === x && b.y === y && b.hp > 0)) {
          cells.push([x, y, Math.abs(x - cx) + Math.abs(y - cy)]);
        }
      }
    }
    cells.sort((a, b) => a[2] - b[2]);
    window.__zz.place(t, cells[0][0], cells[0][1]);
  }, type);
  await page.waitForTimeout(400);
}

async function staffType(page, type) {
  await page.evaluate((t) => {
    const s = window.__zz.getState();
    const b = s.base.buildings.find((x) => x.type === t && x.hp > 0);
    if (!b) throw new Error('no building ' + t);
    const r = window.__zz.adjustWorkers(b.id, 1);
    if (!r.ok) throw new Error(r.error || 'staff fail');
  }, type);
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
  await boot(page);
  await waitCoach(page, 'comida');
  await shot(page, '01-mobile-coach-food.png', '01 · Móvil tip comida', 'Pista contextual + Construir pulse');

  await page.locator('#zz-coach-next').click({ force: true });
  await page.waitForTimeout(400);
  await shot(page, '02-mobile-build-suggest.png', '02 · Móvil construir', 'Huerto sugerido');

  await page.locator('#zz-sheet-close').click({ force: true }).catch(() => {});
  await placeNear(page, 'farm');
  await waitCoach(page, 'asignad');
  await shot(page, '03-mobile-coach-staff.png', '03 · Móvil tip staffing', 'Avance por acción');

  await staffType(page, 'farm');
  await waitCoach(page, 'agua');
  await shot(page, '04-mobile-coach-water.png', '04 · Móvil tip agua', 'Siguiente necesidad');

  await placeNear(page, 'well');
  await staffType(page, 'well');
  await waitCoach(page, 'avanzad');
  await shot(page, '05-mobile-coach-ready.png', '05 · Móvil tip avanzar', 'Sin Continuar');

  await page.locator('#zz-help').click();
  await page.waitForTimeout(350);
  await shot(page, '06-mobile-help.png', '06 · Móvil ayuda', '§21.3 consultable');

  await context.close();
}

{
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    locale: 'es-ES',
  });
  const page = await context.newPage();
  await boot(page);
  await waitCoach(page, 'comida');
  await shot(page, '07-desktop-coach-food.png', '07 · Desktop tip comida', 'Coach en mundo');

  await placeNear(page, 'farm');
  await staffType(page, 'farm');
  await placeNear(page, 'well');
  await staffType(page, 'well');
  await waitCoach(page, 'avanzad');
  await shot(page, '08-desktop-ready.png', '08 · Desktop listo', 'Guía sin cascada');

  await page.locator('#zz-help').click();
  await page.waitForTimeout(350);
  await shot(page, '09-desktop-help.png', '09 · Desktop ayuda', 'Ayuda filtrada');

  await context.close();
}

await browser.close();

const index = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Zona Zero — Review ZZ-012</title>
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
  <h1>Zona Zero — Review ZZ-012 Tutorial contextual</h1>
  <p>HUMAN_GATE · Una pista · avance por acción · GAME_MASTER 2.6 §31.4</p>
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
  const p = await b2.newPage({ viewport: { width: 1800, height: 2000 } });
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
<header><h1>ZZ-012 — Tutorial contextual D1</h1>
<p>HUMAN_GATE · PENDIENTE DE REVISIÓN · GAME_MASTER 2.6 §31.4</p></header>
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

console.log('ZZ-012 review OK →', out);
gallery.forEach((g) => console.log(' -', g.file));
