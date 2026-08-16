/**
 * Copia capturas PT1-A a docs/review + Drive + contact sheet.
 * node scripts/review-shots-pt1a.mjs
 */
import { chromium } from 'playwright';
import {
  mkdirSync,
  writeFileSync,
  copyFileSync,
  readdirSync,
  existsSync,
  unlinkSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'docs', 'review-mobile-pt1a');
const out = join(root, 'docs', 'review');
const drive = 'G:\\Mi unidad\\Juegos\\Zona Zero\\Review';

mkdirSync(out, { recursive: true });
mkdirSync(drive, { recursive: true });

function clearImages(dir) {
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir)) {
    if (/\.(png|jpe?g|webp)$/i.test(f) || f === 'index.html') {
      try {
        unlinkSync(join(dir, f));
      } catch {
        /* ignore */
      }
    }
  }
}

clearImages(out);
clearImages(drive);

const shots = [
  { file: '02-before-hud-800x360.png', title: 'BEFORE · 800×360 browser' },
  { file: '01-before-hud-844x390.png', title: 'BEFORE · 844×390' },
  { file: '10-after-world-800x360.png', title: 'AFTER · 800×360 compact B' },
  { file: '10-after-world-740x360.png', title: 'AFTER · 740×360' },
  { file: '11-after-coach-800x360.png', title: 'AFTER · coach compacto' },
  { file: '12-hub-logo-first.png', title: 'Portada logo-first' },
];

const gallery = [];
for (const s of shots) {
  const from = join(src, s.file);
  if (!existsSync(from)) {
    console.warn('missing', s.file);
    continue;
  }
  copyFileSync(from, join(out, s.file));
  copyFileSync(from, join(drive, s.file));
  gallery.push(s);
}

const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/><title>Review PT1-A · Zona Zero</title>
<style>
body{margin:0;background:#12100c;color:#e8e0d4;font-family:system-ui,sans-serif;padding:1.5rem}
h1{font-size:1.35rem;margin:0 0 .35rem}
p{color:#9a9080;margin:0 0 1rem;font-size:.9rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem}
figure{margin:0;background:#1a1612;border-radius:10px;overflow:hidden;border:1px solid #333}
img{width:100%;display:block;aspect-ratio:16/9;object-fit:cover;background:#000}
figcaption{padding:.55rem .7rem;font-size:.85rem}
</style></head><body>
<h1>Zona Zero · PT1-A (PWA / HUD / portada)</h1>
<p>Chrome propio 800×360: 36.3% → 21.6%. PWA recomendada; browser también jugable.</p>
<div class="grid">
${gallery
  .map(
    (g) =>
      `<figure><img src="${g.file}" alt="${g.title}"/><figcaption><strong>${g.title}</strong></figcaption></figure>`
  )
  .join('\n')}
</div>
</body></html>`;

writeFileSync(join(out, 'index.html'), html);
writeFileSync(join(drive, 'index.html'), html);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
const files = gallery.map((g) => pathToFileURL(join(out, g.file)).href);
const labels = gallery.map((g) => g.title);
await page.setContent(`<!DOCTYPE html><html><body style="margin:0;background:#0e0c0a;color:#e8e0d4;font-family:system-ui">
<div id="c" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:16px"></div>
<script>
const files = ${JSON.stringify(files)};
const labels = ${JSON.stringify(labels)};
const c = document.getElementById('c');
files.forEach((src, i) => {
  const fig = document.createElement('div');
  fig.style.cssText = 'background:#1a1612;border:1px solid #333;border-radius:8px;overflow:hidden';
  const img = document.createElement('img');
  img.src = src;
  img.style.cssText = 'width:100%;aspect-ratio:16/9;object-fit:cover;display:block;background:#000';
  const cap = document.createElement('div');
  cap.textContent = labels[i];
  cap.style.cssText = 'padding:8px 10px;font-size:13px;font-weight:600';
  fig.append(img, cap);
  c.append(fig);
});
</script></body></html>`);
await page.waitForTimeout(900);
const sheet = join(out, 'review-contact-sheet.jpg');
await page.locator('#c').screenshot({ path: sheet, type: 'jpeg', quality: 88 });
copyFileSync(sheet, join(drive, 'review-contact-sheet.jpg'));
await browser.close();
console.log('OK review', gallery.length, 'shots + contact sheet →', out, 'y Drive');
