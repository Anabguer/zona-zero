/**
 * Capturas comparativa 3 estilos colonia.
 * Uso: npx serve -l 8765 . && node scripts/review-colony-styles.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs', 'review');
const drive = 'G:\\Mi unidad\\Juegos\\Zona Zero\\Review';
const BASE = process.env.ZZ_REVIEW_URL?.replace(/\/dev\/.*$/, '') || 'http://127.0.0.1:8765';
mkdirSync(out, { recursive: true });
mkdirSync(drive, { recursive: true });

const styles = [
  {
    id: 'yard',
    file: 'colony-style-a-yard.png',
    title: 'A · Patio ilustrado',
    note: 'Suelo colony-yard + WebP',
  },
  {
    id: 'dirt',
    file: 'colony-style-b-dirt.png',
    title: 'B · Tierra continua',
    note: 'Procedural v48',
  },
  {
    id: 'iso',
    file: 'colony-style-c-iso.png',
    title: 'C · Bloques isométricos',
    note: 'SVG + iconos',
  },
];

async function bootStyle(page, style) {
  const url = `${BASE}/dev/harness-zz#new=1&demo=1&colonyStyle=${style}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => window.__zzOk === true || window.__zzErr, { timeout: 30000 });
  const err = await page.evaluate(() => window.__zzErr || null);
  if (err) throw new Error(`${style}: ${err}`);
  await page.evaluate((styleId) => {
    document.body.classList.add('zz-body--demo');
    window.__zz?.setColonyStyle?.(styleId);
  }, style);
  await page.waitForTimeout(200);
    await page.evaluate((styleId) => {
      document.body.classList.add('zz-body--demo');
      const brief = document.getElementById('zz-day-brief');
      if (brief) brief.hidden = true;
      window.__zz?.setColonyStyle?.(styleId);
      window.__zz?.place('farm');
      window.__zz?.place('well');
      window.__zz?.place('house');
      const s = window.__zz.getState();
      s.base.buildings.forEach((b) => {
        if (['farm', 'well'].includes(b.type)) b.workers = 1;
      });
      window.__zz.recenter();
      window.__zz.zoomBy?.(1.15);
      window.__zz.paint();
    }, style);
  await page.waitForTimeout(450);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 960, height: 540 },
  deviceScaleFactor: 2,
  locale: 'es-ES',
});

for (const st of styles) {
  const page = await context.newPage();
  await bootStyle(page, st.id);
  await page.screenshot({ path: join(out, st.file), fullPage: false });
  copyFileSync(join(out, st.file), join(drive, st.file));
  await page.close();
  console.log('OK', st.file);
}

await browser.close();

const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/><title>Colonia · 3 estilos</title>
<style>
body{margin:0;background:#12100c;color:#e8e0d4;font-family:system-ui,sans-serif;padding:1.25rem}
h1{font-size:1.35rem;margin:0 0 .5rem}
p{color:#9a9080;max-width:52rem;line-height:1.45}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem;margin-top:1rem}
figure{margin:0;background:#1a1612;border-radius:10px;overflow:hidden;border:1px solid #2a241c}
img{width:100%;display:block;aspect-ratio:16/10;object-fit:cover;background:#000}
figcaption{padding:.65rem .75rem;font-size:.85rem}
figcaption strong{display:block;color:#c4a060;margin-bottom:.2rem}
figcaption span{color:#9a9080;font-size:.78rem}
</style></head><body>
<h1>Colonia · elige A, B o C</h1>
<p>Misma partida de ejemplo (HQ + huerto + pozo + casa). Abre también <code>dev/colony-styles.html</code> para verlos en vivo.</p>
<div class="grid">
${styles
  .map(
    (g) =>
      `<figure><img src="${g.file}" alt="${g.title}"/><figcaption><strong>${g.title}</strong><span>${g.note}</span></figcaption></figure>`
  )
  .join('\n')}
</div>
</body></html>`;
writeFileSync(join(out, 'colony-styles.html'), html, 'utf8');
copyFileSync(join(out, 'colony-styles.html'), join(drive, 'colony-styles.html'));

const shots = styles.map((s) => join(out, s.file));
const contact = join(out, 'review-contact-sheet.jpg');
const magick = spawnSync(
  'magick',
  ['montage', ...shots, '-tile', '3x', '-geometry', '640x360+12+12', '-background', '#12100c', contact],
  { encoding: 'utf8' }
);
if (magick.status !== 0) {
  const b2 = await chromium.launch({ headless: true });
  const p = await b2.newPage({ viewport: { width: 1600, height: 900 } });
  const fileUrl = join(out, 'colony-styles.html').replace(/\\/g, '/');
  await p.goto('file:///' + fileUrl);
  await p.screenshot({ path: contact, type: 'jpeg', quality: 82, fullPage: true });
  await b2.close();
  copyFileSync(contact, join(drive, 'review-contact-sheet.jpg'));
}

console.log('Galería:', join(out, 'colony-styles.html'));
