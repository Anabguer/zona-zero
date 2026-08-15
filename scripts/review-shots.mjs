/**
 * Capturas Bloque 1 — experiencia D1→D5 (sin ocultar coach ni fijar cámara artificial).
 * Requiere: npx serve -l 8765 .
 * Uso: node scripts/review-shots.mjs
 */
import { chromium, devices } from 'playwright';
import { mkdirSync, rmSync, existsSync, writeFileSync, readdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs', 'review');
const drive = 'G:\\Mi unidad\\Juegos\\Zona Zero\\Review';
const BASE = process.env.ZZ_REVIEW_URL || 'http://127.0.0.1:8765/dev/harness.html';

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
mkdirSync(drive, { recursive: true });

const gallery = [];
function addShot(file, title, note) {
  gallery.push({ file, title, note });
}

async function boot(page) {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => window.__zzOk === true || window.__zzErr, { timeout: 30000 });
  const err = await page.evaluate(() => window.__zzErr || null);
  if (err) throw new Error(err);
  await page.waitForTimeout(500);
}

async function dismissBrief(page) {
  await page.evaluate(() => {
    const ok = document.getElementById('zz-brief-ok');
    if (ok) ok.click();
    const brief = document.getElementById('zz-day-brief');
    if (brief) brief.hidden = true;
  });
  await page.waitForTimeout(200);
}

async function closeSheet(page) {
  await page.evaluate(() => {
    const s = document.getElementById('zz-sheet');
    if (s) s.hidden = true;
  });
}

function freeNear(s) {
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
}

async function coachContinue(page) {
  const visible = await page.evaluate(() => {
    const c = document.getElementById('zz-coach-next');
    return c && !c.hidden && c.offsetParent !== null;
  });
  if (visible) {
    await page.click('#zz-coach-next');
    await page.waitForTimeout(350);
  }
}

async function shot(page, file, title, note) {
  await page.waitForTimeout(280);
  await page.screenshot({ path: join(out, file), fullPage: false });
  addShot(file, title, note);
}

const browser = await chromium.launch({ headless: true });

{
  const context = await browser.newContext({ ...devices['iPhone 12'], locale: 'es-ES' });
  const page = await context.newPage();
  await boot(page);

  // —— D1 inicial (guía visible, cámara natural) ——
  await shot(page, 'b1-d1-inicial.png', 'D1 inicial', 'colonia + guía welcome');

  await coachContinue(page); // needs
  await coachContinue(page); // build_farm CTA
  await shot(page, 'b1-construir.png', 'Construir', 'sheet / modo construir');

  // Colocar huerto vía API de juego (misma ruta que UI) cerca del cluster
  await page.evaluate(() => {
    const s = window.__zz.getState();
    const cell = (() => {
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
    })();
    window.__zz.place('farm', cell[0], cell[1]);
  });
  await page.waitForTimeout(400);

  // Asignar trabajador (force: sheet bajo guía)
  await page.evaluate(() => {
    const s = window.__zz.getState();
    const farm = s.base.buildings.find((b) => b.type === 'farm');
    if (!farm) return;
    const g = document.querySelector(`[data-id="${farm.id}"]`);
    if (g) g.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(350);
  await page.click('[data-bworkers][data-delta="1"]', { force: true });
  await page.waitForTimeout(300);
  await shot(page, 'b1-asignar.png', 'Asignar trabajador', 'ficha huerto');

  // Pozo + personal
  await coachContinue(page);
  await page.evaluate(() => {
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
    const cell = cells[0];
    window.__zz.place('well', cell[0], cell[1]);
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const s = window.__zz.getState();
    const well = s.base.buildings.find((b) => b.type === 'well');
    if (!well) return;
    const g = document.querySelector(`[data-id="${well.id}"]`);
    if (g) g.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(250);
  await page.click('[data-bworkers][data-delta="1"]', { force: true });
  await page.waitForTimeout(250);
  await closeSheet(page);

  // Avanzar → brief D2
  await coachContinue(page); // puede disparar advanceDay
  await page.waitForTimeout(400);
  const briefVisible = await page.evaluate(() => !document.getElementById('zz-day-brief')?.hidden);
  if (!briefVisible) {
    await page.click('#zz-advance');
    await page.waitForTimeout(500);
  }
  await shot(page, 'b1-brief-d2.png', 'Brief D2', 'comida / agua / hechos');
  await dismissBrief(page);

  // D3 antes de explorar
  await coachContinue(page);
  await page.waitForTimeout(300);
  let day = await page.evaluate(() => window.__zz.getState().day);
  if (day < 3) {
    await page.click('#zz-advance');
    await page.waitForTimeout(400);
  }
  await dismissBrief(page);
  await closeSheet(page);
  await page.evaluate(() => {
    window.__zz.paint();
  });
  await page.waitForTimeout(350);
  await shot(page, 'b1-d3-antes.png', 'D3 antes de explorar', 'landmark revelado');

  // Ficha de lugar (sin brief encima)
  await dismissBrief(page);
  await coachContinue(page);
  await page.waitForTimeout(400);
  const sheetOpen = await page.evaluate(() => !document.getElementById('zz-sheet')?.hidden);
  if (!sheetOpen) {
    await page.evaluate(() => {
      const s = window.__zz.getState();
      const z = s.zones.find((x) => x.id === 'market') || s.zones.find((x) => x.state === 'discovered' && x.type !== 'camp');
      if (z) {
        if (z.state === 'unknown') z.state = 'discovered';
        s.selectedZoneId = z.id;
        window.__zz.paint();
        const g = document.querySelector(`.zz-zone[data-id="${z.id}"]`);
        if (g) g.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });
    await page.waitForTimeout(400);
  }
  await dismissBrief(page);
  await shot(page, 'b1-ficha-lugar.png', 'Ficha de lugar', 'distancia / tiempo / riesgo / botín');

  // Expedición en curso
  await dismissBrief(page);
  await page.click('[data-action="send-exp"]', { force: true });
  await page.waitForTimeout(450);
  await dismissBrief(page);
  await closeSheet(page);
  await shot(page, 'b1-expedicion.png', 'Expedición en curso', 'ruta en mapa');

  // Avanzar hasta retorno
  for (let i = 0; i < 4; i++) {
    const away = await page.evaluate(() => (window.__zz.getState().expeditions || []).length > 0);
    if (!away) break;
    await page.click('#zz-advance');
    await page.waitForTimeout(400);
    await dismissBrief(page);
  }
  await closeSheet(page);
  await shot(page, 'b1-retorno.png', 'Retorno', 'explorador de vuelta');

  // D5
  day = await page.evaluate(() => window.__zz.getState().day);
  while (day < 5) {
    await page.click('#zz-advance');
    await page.waitForTimeout(350);
    await dismissBrief(page);
    day = await page.evaluate(() => window.__zz.getState().day);
  }
  await dismissBrief(page);
  await closeSheet(page);
  // Limpiar selección para no mostrar número de workers gigante
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.selectedBuildingId = null;
    s.selectedZoneId = null;
    window.__zz.paint();
  });
  await shot(page, 'b1-d5.png', 'D5', 'colonia crecida');

  await context.close();
}

{
  // Desktop 1920×1080 — D1 y D5
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    locale: 'es-ES',
  });
  const page = await context.newPage();
  await boot(page);
  await shot(page, 'b1-desktop-d1.png', 'Desktop D1', '1920×1080');

  // Acelerar a colonia D5 jugable
  await page.evaluate(() => {
    const s = window.__zz.getState();
    const free = () => {
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
    };
    for (const type of ['farm', 'well', 'house']) {
      const c = free();
      if (c) window.__zz.place(type, c[0], c[1]);
    }
    s.base.buildings.forEach((b) => {
      if (['farm', 'well'].includes(b.type)) b.workers = Math.max(1, b.workers || 0);
    });
    s.flags.onboardingDone = true;
    s.flags.onboardingActive = false;
    const market = s.zones.find((z) => z.id === 'market');
    if (market) market.state = 'discovered';
    s.day = 5;
    window.__zz.recenter();
    window.__zz.paint();
  });
  await page.waitForTimeout(450);
  await shot(page, 'b1-desktop-d5.png', 'Desktop D5', 'panel lateral / ancho');

  await context.close();
}

await browser.close();

// Galería + contact sheet
const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/><title>Review Bloque 1 · Zona Zero</title>
<style>
body{margin:0;background:#12100c;color:#e8e0d4;font-family:system-ui,sans-serif;padding:1.5rem}
h1{font-size:1.4rem;margin:0 0 1rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem}
figure{margin:0;background:#1a1612;border-radius:10px;overflow:hidden;border:1px solid #333}
img{width:100%;display:block;aspect-ratio:9/16;object-fit:cover;background:#000}
figure.desk img{aspect-ratio:16/9}
figcaption{padding:.55rem .7rem;font-size:.85rem}
figcaption strong{display:block}
figcaption span{color:#9a9080;font-size:.75rem}
</style></head><body>
<h1>Zona Zero · Bloque 1 (D1–D5)</h1>
<div class="grid">
${gallery
  .map(
    (g) =>
      `<figure class="${g.file.includes('desktop') ? 'desk' : ''}"><img src="${g.file}" alt="${g.title}"/><figcaption><strong>${g.title}</strong><span>${g.note || ''}</span></figcaption></figure>`
  )
  .join('\n')}
</div>
</body></html>`;
writeFileSync(join(out, 'index.html'), html, 'utf8');

// Contact sheet con magick o sharp-less: usar playwright collage via spawn convert
const shots = gallery.map((g) => join(out, g.file));
const contact = join(out, 'review-contact-sheet.jpg');
const labels = gallery.map((g) => g.title).join('\n');

const magick = spawnSync(
  'magick',
  [
    'montage',
    ...shots,
    '-tile',
    '4x',
    '-geometry',
    '480x640+12+12',
    '-background',
    '#12100c',
    '-title',
    'Zona Zero Bloque 1 D1-D5',
    contact,
  ],
  { encoding: 'utf8' }
);

if (magick.status !== 0) {
  // fallback: copy first shot as placeholder name so pipeline continues
  console.warn('magick montage falló, generando contact sheet con playwright…');
  const b2 = await chromium.launch({ headless: true });
  const p = await b2.newPage({ viewport: { width: 1600, height: 2200 } });
  await p.setContent(html.replace(/src="/g, `src="file://${out.replace(/\\/g, '/')}/`));
  await p.screenshot({ path: contact, type: 'jpeg', quality: 82, fullPage: true });
  await b2.close();
}

for (const f of readdirSync(out)) {
  copyFileSync(join(out, f), join(drive, f));
}

console.log('Capturas:', gallery.map((g) => g.file).join(', '));
console.log('Contact sheet:', contact);
console.log('Drive:', drive);
console.log('labels:\n' + labels);
