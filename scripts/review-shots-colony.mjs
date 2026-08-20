/**
 * Capturas colonia (suelo + casas). Uso: npx serve -l 8765 . && node scripts/review-shots-colony.mjs
 */
import { chromium } from 'playwright';
import {
  mkdirSync,
  rmSync,
  existsSync,
  writeFileSync,
  readdirSync,
  copyFileSync,
  unlinkSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs', 'review');
const drive = 'G:\\Mi unidad\\Juegos\\Zona Zero\\Review';
const BASE = process.env.ZZ_REVIEW_URL || 'http://127.0.0.1:8765/dev/harness-zz.html?new=1';

if (existsSync(out)) {
  for (const f of readdirSync(out)) {
    if (/\.(png|jpe?g|webp|html)$/i.test(f)) unlinkSync(join(out, f));
  }
} else mkdirSync(out, { recursive: true });
mkdirSync(drive, { recursive: true });
for (const f of readdirSync(drive)) {
  if (/\.(png|jpe?g|webp|html)$/i.test(f)) {
    try {
      unlinkSync(join(drive, f));
    } catch {
      /* ignore */
    }
  }
}

const gallery = [];
function addShot(file, title, note) {
  gallery.push({ file, title, note });
}

async function boot(page) {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => window.__zzOk === true || window.__zzErr, { timeout: 30000 });
  const err = await page.evaluate(() => window.__zzErr || null);
  if (err) throw new Error(err);
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const brief = document.getElementById('zz-day-brief');
    if (brief) brief.hidden = true;
    const sheet = document.getElementById('zz-sheet');
    if (sheet) sheet.hidden = true;
    window.__zz?.recenter?.();
  });
  await page.waitForTimeout(250);
}

async function shot(page, file, title, note) {
  await page.screenshot({ path: join(out, file), fullPage: false });
  addShot(file, title, note);
}

const browser = await chromium.launch({ headless: true });

{
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'es-ES',
  });
  const page = await context.newPage();
  await boot(page);
  await shot(page, 'mobile.png', 'Móvil landscape', '844×390 · barrio D1');
  await page.evaluate(() => {
    window.__zz.place('farm');
    window.__zz.place('well');
    const s = window.__zz.getState();
    s.base.buildings.forEach((b) => {
      if (['farm', 'well'].includes(b.type)) b.workers = 1;
    });
    window.__zz.paint();
  });
  await page.waitForTimeout(300);
  await shot(page, 'gameplay.png', 'Gameplay', 'huerto + pozo en solares');
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
  await page.evaluate(() => {
    window.__zz.place('farm');
    window.__zz.place('well');
    window.__zz.place('house');
    const s = window.__zz.getState();
    s.base.buildings.forEach((b) => {
      if (['farm', 'well'].includes(b.type)) b.workers = 1;
    });
    window.__zz.recenter();
    window.__zz.paint();
  });
  await page.waitForTimeout(350);
  await shot(page, 'desktop.png', 'Escritorio', '1920×1080 · suelo + casas');
  await context.close();
}

await browser.close();

const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/><title>Review colonia · Zona Zero</title>
<style>
body{margin:0;background:#12100c;color:#e8e0d4;font-family:system-ui,sans-serif;padding:1.5rem}
h1{font-size:1.4rem;margin:0 0 1rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1rem}
figure{margin:0;background:#1a1612;border-radius:10px;overflow:hidden;border:1px solid #333}
img{width:100%;display:block;aspect-ratio:16/9;object-fit:cover;background:#000}
figcaption{padding:.55rem .7rem;font-size:.85rem}
figcaption strong{display:block}
figcaption span{color:#9a9080;font-size:.75rem}
</style></head><body>
<h1>Zona Zero · colonia suelo + casas</h1>
<div class="grid">
${gallery
  .map(
    (g) =>
      `<figure><img src="${g.file}" alt="${g.title}"/><figcaption><strong>${g.title}</strong><span>${g.note || ''}</span></figcaption></figure>`
  )
  .join('\n')}
</div>
</body></html>`;
writeFileSync(join(out, 'index.html'), html, 'utf8');

const shots = gallery.map((g) => join(out, g.file));
const contact = join(out, 'review-contact-sheet.jpg');
const magick = spawnSync(
  'magick',
  ['montage', ...shots, '-tile', '3x', '-geometry', '640x360+16+16', '-background', '#12100c', '-title', 'Zona Zero colonia', contact],
  { encoding: 'utf8' }
);
if (magick.status !== 0) {
  console.warn('magick montage falló:', magick.stderr || magick.error);
  const b2 = await chromium.launch({ headless: true });
  const p = await b2.newPage({ viewport: { width: 1600, height: 900 } });
  const fileUrl = join(out, 'index.html').replace(/\\/g, '/');
  await p.goto('file:///' + fileUrl);
  await p.screenshot({ path: contact, type: 'jpeg', quality: 82, fullPage: true });
  await b2.close();
}

for (const f of readdirSync(out)) {
  copyFileSync(join(out, f), join(drive, f));
}
console.log('OK', gallery.map((g) => g.file).join(', '));
