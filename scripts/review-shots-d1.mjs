/**
 * Capturas Bloque 1B — solo Día 1.
 * npx serve -l 8765 . && node scripts/review-shots-d1.mjs
 */
import { chromium, devices } from 'playwright';
import { mkdirSync, rmSync, existsSync, writeFileSync, readdirSync, copyFileSync } from 'fs';
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
  await page.waitForTimeout(500);
}

async function closeSheet(page) {
  await page.evaluate(() => {
    const s = document.getElementById('zz-sheet');
    if (s) s.hidden = true;
  });
}

async function shot(page, file, title, note) {
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(out, file), fullPage: false });
  addShot(file, title, note);
}

function freeNearEval() {
  return `(() => {
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
    return cells[0];
  })()`;
}

const browser = await chromium.launch({ headless: true });

{
  const context = await browser.newContext({ ...devices['iPhone 12'], locale: 'es-ES' });
  const page = await context.newPage();
  await boot(page);

  // A — D1 nada más entrar
  await shot(page, 'd1b-a-entrar.png', 'A · Entrar', 'intro + colonia');

  // B — tras cerrar intro
  await page.click('#zz-coach-next');
  await page.waitForTimeout(400);
  await shot(page, 'd1b-b-tras-intro.png', 'B · Tras intro', 'pulso Construir');

  // C — selector construir
  await page.click('#zz-open-build', { force: true });
  await page.waitForTimeout(450);
  await shot(page, 'd1b-c-construir.png', 'C · Construir', 'lista edificios');

  // D — preview huerto
  await page.click('[data-action="build-pick"][data-build="farm"]', { force: true });
  await page.waitForTimeout(450);
  await page.evaluate(() => {
    const slot = document.querySelector('.zz-settle-slot');
    if (slot) slot.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
  });
  await page.waitForTimeout(250);
  await shot(page, 'd1b-d-preview.png', 'D · Preview huerto', 'colocación');

  // E — huerto construido
  await page.evaluate((freeExpr) => {
    const cell = eval(freeExpr);
    window.__zz.place('farm', cell[0], cell[1]);
  }, freeNearEval());
  await closeSheet(page);
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.buildMode = null;
    s.uiMode = null;
    s.selectedBuildingId = null;
    window.__zz.recenter();
    window.__zz.paint();
  });
  await shot(page, 'd1b-e-huerto.png', 'E · Huerto construido', 'aparece en colonia');

  // F — ficha con trabajador
  await page.evaluate(() => {
    const s = window.__zz.getState();
    const farm = s.base.buildings.find((b) => b.type === 'farm');
    if (!farm) return;
    const g = document.querySelector(`[data-id="${farm.id}"]`);
    if (g) g.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(350);
  await page.click('[data-bworkers][data-delta="1"]', { force: true });
  await page.waitForTimeout(350);
  await shot(page, 'd1b-f-ficha.png', 'F · Ficha huerto', 'trabajador asignado');

  // H — móvil (mismo viewport, vista limpia)
  await closeSheet(page);
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.selectedBuildingId = null;
    window.__zz.recenter();
    window.__zz.paint();
  });
  await page.waitForTimeout(350);
  await shot(page, 'd1b-h-movil.png', 'H · Móvil', 'colonia D1');

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
  await page.click('#zz-coach-next');
  await page.waitForTimeout(300);
  await page.evaluate((freeExpr) => {
    const cell = eval(freeExpr);
    window.__zz.place('farm', cell[0], cell[1]);
    const s = window.__zz.getState();
    const farm = s.base.buildings.find((b) => b.type === 'farm');
    if (farm) farm.workers = 1;
    s.flags.onboardingStep = 2;
    window.__zz.recenter();
    window.__zz.paint();
  }, freeNearEval());
  await page.waitForTimeout(400);
  await shot(page, 'd1b-g-desktop.png', 'G · Desktop 1920', 'colonia legible');

  await context.close();
}

await browser.close();

const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/><title>Review Bloque 1B · Día 1</title>
<style>
body{margin:0;background:#12100c;color:#e8e0d4;font-family:system-ui,sans-serif;padding:1.5rem}
h1{font-size:1.35rem;margin:0 0 1rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem}
figure{margin:0;background:#1a1612;border-radius:10px;overflow:hidden;border:1px solid #333}
img{width:100%;display:block;aspect-ratio:9/16;object-fit:cover;background:#000}
figure.desk img{aspect-ratio:16/9}
figcaption{padding:.55rem .7rem;font-size:.85rem}
figcaption strong{display:block}
figcaption span{color:#9a9080;font-size:.75rem}
</style></head><body>
<h1>Zona Zero · Bloque 1B (solo Día 1)</h1>
<div class="grid">
${gallery
  .map(
    (g) =>
      `<figure class="${g.file.includes('desktop') ? 'desk' : ''}"><img src="${g.file}" alt="${g.title}"/><figcaption><strong>${g.title}</strong><span>${g.note || ''}</span></figcaption></figure>`
  )
  .join('\\n')}
</div>
</body></html>`;
writeFileSync(join(out, 'index.html'), html, 'utf8');

const contact = join(out, 'review-contact-sheet.jpg');
const b2 = await chromium.launch({ headless: true });
const p = await b2.newPage({ viewport: { width: 1600, height: 2000 } });
const fileBase = out.replace(/\\/g, '/');
await p.setContent(html.replace(/src="/g, `src="file://${fileBase}/`));
await p.screenshot({ path: contact, type: 'jpeg', quality: 84, fullPage: true });
await b2.close();

for (const f of readdirSync(out)) copyFileSync(join(out, f), join(drive, f));
console.log('Capturas:', gallery.map((g) => g.file).join(', '));
console.log('Contact:', contact);
