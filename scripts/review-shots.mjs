/**
 * Capturas revisión 1.3.1 — reforma visual del mapa.
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
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const c = document.getElementById('zz-coach');
    if (c) { c.hidden = true; c.innerHTML = ''; }
    const t = document.getElementById('zz-toast');
    if (t) t.hidden = true;
    const s = window.__zz?.getState?.();
    if (s?.flags) {
      s.flags.onboardingDone = true;
      s.flags.onboardingActive = false;
    }
  });
}

async function closeSheet(page) {
  await page.evaluate(() => {
    const s = document.getElementById('zz-sheet');
    if (s) s.hidden = true;
    const b = document.getElementById('zz-banner');
    if (b) b.hidden = true;
  });
}

/** Encuadre fijo sobre la colonia para comparar D1/D15/D30. */
async function frameColony(page, zoom = 1.75) {
  await page.evaluate((zoom) => {
    const s = window.__zz.getState();
    const camp = s.zones.find((z) => z.type === 'camp');
    s.mapCamera = s.mapCamera || {};
    if (camp) {
      s.mapCamera.x = camp.x;
      s.mapCamera.y = camp.y;
    }
    s.mapCamera.zoom = zoom;
    s.selectedZoneId = null;
    s.selectedBuildingId = null;
    s.uiMode = 'map';
    s.buildMode = null;
    window.__zz.paint();
  }, zoom);
  await page.waitForTimeout(350);
}

async function enrich(page, { day, buildings, pop, controlled = 0, vehicles = false, zoom = 1.75 }) {
  await page.evaluate(
    ({ day, buildings, pop, controlled, vehicles, zoom }) => {
      const s = window.__zz.getState();
      s.day = day;
      s.era = Math.max(s.era || 0, day >= 25 ? 2 : day >= 8 ? 1 : 0);
      Object.keys(s.resources).forEach((k) => {
        s.resources[k] = Math.max(s.resources[k] || 0, day >= 15 ? 420 : 180);
      });
      s.population.manual = s.population.manual || {};
      s.population.manual.build = 2;
      if (pop != null) {
        s.population.total = pop;
        s.population.labor = s.population.labor || {};
        s.population.labor.build = Math.max(2, Math.floor(pop * 0.12));
        s.population.labor.idle = Math.max(2, Math.floor(pop * 0.2));
        s.population.labor.food = Math.floor(pop * 0.2);
        s.population.labor.water = Math.floor(pop * 0.15);
        s.population.labor.produce = Math.floor(pop * 0.1);
        s.population.labor.defense = Math.floor(pop * 0.1);
      }
      const free = () => {
        // Preferir celdas cerca del centro para que la colonia se lea compacta
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
        return cells.length ? [cells[0][0], cells[0][1]] : null;
      };
      for (const type of buildings) {
        const cell = free();
        if (!cell) break;
        window.__zz.place(type, cell[0], cell[1]);
        const b = s.base.buildings.find((x) => x.type === type && x.x === cell[0] && x.y === cell[1]);
        if (b && ['farm', 'well', 'workshop', 'sawmill', 'greenhouse', 'cistern'].includes(type)) {
          b.workers = Math.min(3, 2);
        }
      }
      let n = 0;
      for (const z of s.zones) {
        if (z.type === 'camp') continue;
        if (n >= controlled) break;
        z.state = 'controlled';
        z.controlProgress = 1;
        n++;
      }
      // Descubrir un par de landmarks cercanos sin controlarlos todos
      let disc = 0;
      for (const z of s.zones) {
        if (z.type === 'camp' || z.state === 'controlled') continue;
        if (disc >= 3) break;
        if (z.state === 'unknown') z.state = 'discovered';
        disc++;
      }
      if (vehicles) {
        s.vehiclesOwned = s.vehiclesOwned || [];
        if (!s.vehiclesOwned.includes('bike')) s.vehiclesOwned.push('bike');
      }
      const camp = s.zones.find((z) => z.type === 'camp');
      s.mapCamera = s.mapCamera || {};
      if (camp) {
        s.mapCamera.x = camp.x;
        s.mapCamera.y = camp.y;
      }
      s.mapCamera.zoom = zoom;
      s.selectedZoneId = null;
      s.selectedBuildingId = null;
      window.__zz.paint();
    },
    { day, buildings, pop, controlled, vehicles, zoom }
  );
  await closeSheet(page);
  await page.waitForTimeout(400);
}

const browser = await chromium.launch({ headless: true });
const COLONY_ZOOM = 1.75;

{
  const context = await browser.newContext({ ...devices['iPhone 12'], locale: 'es-ES' });
  const page = await context.newPage();
  await boot(page);

  // D1 — campamento precario (mismo encuadre)
  await enrich(page, { day: 1, pop: 4, buildings: [], zoom: COLONY_ZOOM });
  await frameColony(page, COLONY_ZOOM);
  await page.screenshot({ path: join(out, '131-d1.png') });
  addShot('131-d1.png', 'Día 1', 'campamento precario');
  await page.screenshot({ path: join(out, '131-mobile.png') });
  addShot('131-mobile.png', 'Móvil', 'mundo full-bleed');

  // Sheets
  await page.click('#zz-open-pop', { force: true });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, '131-poblacion.png') });
  addShot('131-poblacion.png', 'Población', 'reparto trabajadores');
  await closeSheet(page);

  await page.click('#zz-open-build', { force: true });
  await page.waitForTimeout(450);
  await page.screenshot({ path: join(out, '131-construir.png') });
  addShot('131-construir.png', 'Construir', 'coste / beneficio / trabajo');
  await closeSheet(page);

  // Edificio
  await enrich(page, { day: 3, pop: 5, buildings: ['farm', 'well'], zoom: COLONY_ZOOM });
  await page.evaluate(() => {
    const s = window.__zz.getState();
    const farm = s.base.buildings.find((b) => b.type === 'farm');
    if (!farm) return;
    farm.workers = 0;
    window.__zz.paint();
    const g = document.querySelector(`[data-id="${farm.id}"]`);
    if (g) g.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, '131-edificio.png') });
  addShot('131-edificio.png', 'Edificio', 'ficha huerto');
  await closeSheet(page);

  // Explorar zona
  await page.evaluate(() => {
    const s = window.__zz.getState();
    const z =
      s.zones.find((x) => x.type === 'supermarket' || (x.name || '').toLowerCase().includes('super')) ||
      s.zones.find((x) => x.state === 'discovered' && x.type !== 'camp');
    if (z) {
      if (z.state === 'unknown') z.state = 'discovered';
      s.selectedZoneId = z.id;
      s.mapCamera.x = z.x;
      s.mapCamera.y = z.y;
      s.mapCamera.zoom = 1.35;
      window.__zz.paint();
      const g = document.querySelector(`.zz-zone[data-id="${z.id}"]`);
      if (g) g.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });
  await page.waitForTimeout(450);
  await page.screenshot({ path: join(out, '131-explorar.png') });
  addShot('131-explorar.png', 'Explorar', 'ficha de zona');
  await closeSheet(page);

  // D15 — asentamiento (mismo zoom/encuadre)
  await boot(page);
  await enrich(page, {
    day: 15,
    pop: 14,
    controlled: 2,
    buildings: ['farm', 'well', 'house', 'workshop', 'barricade', 'storage', 'medkit'],
    zoom: COLONY_ZOOM,
  });
  await frameColony(page, COLONY_ZOOM);
  await page.screenshot({ path: join(out, '131-d15.png') });
  addShot('131-d15.png', 'Día 15', 'asentamiento');

  // D30 — colonia
  await boot(page);
  await enrich(page, {
    day: 30,
    pop: 26,
    controlled: 5,
    vehicles: true,
    buildings: [
      'farm',
      'greenhouse',
      'well',
      'cistern',
      'house',
      'workshop',
      'sawmill',
      'storage',
      'medkit',
      'infirmary',
      'watchtower',
      'fence',
      'barricade',
    ],
    zoom: COLONY_ZOOM,
  });
  await frameColony(page, COLONY_ZOOM);
  await page.screenshot({ path: join(out, '131-d30.png') });
  addShot('131-d30.png', 'Día 30', 'colonia consolidada');

  await context.close();
}

{
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: 'es-ES',
  });
  const page = await context.newPage();
  await boot(page);
  await enrich(page, {
    day: 30,
    pop: 26,
    controlled: 5,
    vehicles: true,
    buildings: ['farm', 'greenhouse', 'well', 'house', 'workshop', 'storage', 'medkit', 'infirmary', 'watchtower', 'fence'],
    zoom: 1.25,
  });
  await frameColony(page, 1.25);
  await page.screenshot({ path: join(out, '131-desktop.png') });
  addShot('131-desktop.png', 'Escritorio', 'mapa protagonista');
  await context.close();
}

await browser.close();

const figures = gallery
  .map(
    (g) => `    <figure>
      <a class="shot" href="${g.file}" target="_blank" rel="noopener">
        <img src="${g.file}" alt="${g.title}" loading="lazy" />
      </a>
      <figcaption>${g.title}<span>${g.file}${g.note ? ` · ${g.note}` : ''}</span></figcaption>
    </figure>`
  )
  .join('\n');

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Revisión visual · Zona Zero 1.3.1</title>
  <style>
    :root { color-scheme: dark; --bg:#12100e; --card:#1a1612; --line:#3a342c; --text:#e8e0d4; --muted:#9a9080; }
    * { box-sizing: border-box; }
    body { margin:0; font-family:"Segoe UI",system-ui,sans-serif; background:var(--bg); color:var(--text); padding:1.25rem 1rem 2.5rem; }
    header { max-width:1100px; margin:0 auto 1.5rem; }
    h1 { font-size:1.35rem; margin:0 0 0.35rem; }
    header p { margin:0; color:var(--muted); font-size:0.92rem; }
    .gallery { max-width:1100px; margin:0 auto; display:grid; gap:1.25rem; grid-template-columns:1fr; }
    @media (min-width:720px) { .gallery { grid-template-columns:repeat(2,minmax(0,1fr)); } }
    figure { margin:0; background:var(--card); border:1px solid var(--line); border-radius:12px; overflow:hidden; }
    img { display:block; width:100%; height:auto; background:#0a0908; }
    figcaption { padding:0.65rem 0.85rem 0.8rem; font-weight:600; border-top:1px solid var(--line); }
    figcaption span { display:block; margin-top:0.15rem; font-size:0.78rem; font-weight:400; color:var(--muted); }
  </style>
</head>
<body>
  <header>
    <h1>Revisión visual · Zona Zero 1.3.1</h1>
    <p>Reforma visual del mapa. Se sustituyen en cada entrega.</p>
  </header>
  <main class="gallery">
${figures}
  </main>
</body>
</html>
`,
  'utf8'
);

writeFileSync(join(out, 'README.md'), `# Revisión 1.3.1 — mapa físico\n\nGalería: [index.html](./index.html)\n`, 'utf8');

for (const f of readdirSync(drive)) {
  if (/\.(png|jpg|jpeg|webp)$/i.test(f)) {
    try {
      rmSync(join(drive, f), { force: true });
    } catch {
      /* ignore */
    }
  }
}
for (const g of gallery) {
  copyFileSync(join(out, g.file), join(drive, g.file));
}

const shotsJson = JSON.stringify(gallery.map((g) => [g.file, g.title]));
const py = `
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json
SRC = Path(r'''${out.replace(/\\/g, '\\\\')}''')
DRIVE = Path(r'''${drive.replace(/\\/g, '\\\\')}''')
SHOTS = json.loads(r'''${shotsJson}''')
cols = 3
pad = 24
label_h = 36
cell_w = 420
cell_h = 280
rows = (len(SHOTS) + cols - 1) // cols
W = cols * cell_w + (cols + 1) * pad
H = rows * (cell_h + label_h) + (rows + 1) * pad + 40
canvas = Image.new('RGB', (W, H), (18, 16, 14))
draw = ImageDraw.Draw(canvas)
try:
    font = ImageFont.truetype('segoeui.ttf', 18)
    title_font = ImageFont.truetype('segoeuib.ttf', 22)
except Exception:
    font = ImageFont.load_default()
    title_font = font
draw.text((pad, 12), 'Zona Zero 1.3.1 — reforma visual mapa', fill=(232, 212, 180), font=title_font)
for i, (fname, title) in enumerate(SHOTS):
    r, c = divmod(i, cols)
    x = pad + c * (cell_w + pad)
    y = 48 + pad + r * (cell_h + label_h + pad)
    path = SRC / fname
    if not path.exists():
        continue
    im = Image.open(path).convert('RGB')
    im.thumbnail((cell_w - 8, cell_h - 8), Image.Resampling.LANCZOS)
    ox = x + (cell_w - im.width) // 2
    oy = y + (cell_h - im.height) // 2
    draw.rectangle([x, y, x + cell_w, y + cell_h], outline=(58, 52, 44), width=2)
    canvas.paste(im, (ox, oy))
    draw.text((x + 6, y + cell_h + 8), title, fill=(200, 190, 170), font=font)
out_path = SRC / '131-contact-sheet.jpg'
canvas.save(out_path, 'JPEG', quality=88, optimize=True)
# alias pedido por regla de review
canvas.save(SRC / 'review-contact-sheet.jpg', 'JPEG', quality=88, optimize=True)
canvas.save(DRIVE / '131-contact-sheet.jpg', 'JPEG', quality=88, optimize=True)
canvas.save(DRIVE / 'review-contact-sheet.jpg', 'JPEG', quality=88, optimize=True)
print('ok', out_path)
`;
writeFileSync(join(out, '_make_contact.py'), py, 'utf8');
const r = spawnSync('python', [join(out, '_make_contact.py')], { encoding: 'utf8' });
if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  process.exit(1);
}
rmSync(join(out, '_make_contact.py'), { force: true });
console.log('Review shots:', gallery.map((g) => g.file).join(', '));
