/**
 * Capturas: colonia a cero + una vivienda.
 * Uso: node scripts/review-shots-dwelling.mjs
 */
import { chromium } from 'playwright';
import {
  mkdirSync,
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
const BASE = 'http://127.0.0.1:8777/dev/harness-zz#new=1';

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
  page.setDefaultTimeout(90000);
  page.on('pageerror', (e) => console.warn('pageerror', e.message));
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  const st = await page.evaluate(() => ({ ok: !!window.__zzOk, err: window.__zzErr || null }));
  if (st.err) throw new Error(st.err);
  if (!st.ok) throw new Error('harness no arrancó (__zzOk) url=' + page.url());
  await page.evaluate(() => {
    const brief = document.getElementById('zz-day-brief');
    if (brief) brief.hidden = true;
    const sheet = document.getElementById('zz-sheet');
    if (sheet) sheet.hidden = true;
    const gate = document.getElementById('zz-rotate-gate');
    if (gate) gate.hidden = true;
    const bootEl = document.getElementById('zz-boot');
    if (bootEl) bootEl.hidden = true;
    window.__zz?.recenter?.();
    const s = window.__zz?.getState?.();
    if (s?.resources) {
      s.resources.wood = Math.max(s.resources.wood || 0, 20);
      s.resources.water = Math.max(s.resources.water || 0, 12);
      s.resources.metal = Math.max(s.resources.metal || 0, 12);
    }
    window.__zz?.place?.('farm');
    window.__zz?.place?.('well');
    window.__zz?.paint?.();
  });
  await page.waitForTimeout(800);
}

async function shot(page, file, title, note) {
  await page.screenshot({ path: join(out, file), fullPage: false });
  addShot(file, title, note);
}

const browser = await chromium.launch({ headless: true });

{
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    locale: 'es-ES',
  });
  const page = await context.newPage();
  await boot(page);
  await shot(page, 'desktop.png', 'Escritorio', '1920×1080 · casita, huerto, árboles y chatarra');
  await context.close();
}

{
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    locale: 'es-ES',
  });
  const page = await context.newPage();
  await boot(page);
  await shot(page, 'mobile.png', 'Móvil', '844×390 · colonia con props');
  await page.evaluate(() => window.__zz?.zoomBy?.(1.2));
  await page.waitForTimeout(250);
  await shot(page, 'gameplay.png', 'Gameplay', 'huerto, pozo y pecios de cerca');
  await context.close();
}

await browser.close();

const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/><title>Review vivienda · Zona Zero</title>
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
<h1>Zona Zero · colonia con props</h1>
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
  ['montage', ...shots, '-tile', '3x', '-geometry', '640x360+16+16', '-background', '#12100c', '-title', 'Zona Zero vivienda', contact],
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
