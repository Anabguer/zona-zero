/**
 * Capturas revisión 1.2.5 — UX + representación del mundo.
 * Sustituye docs/review/. Uso: node scripts/review-shots.mjs
 * Requiere: npx serve -l 8765 .
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

async function boot(page) {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => window.__zzOk === true || window.__zzErr, { timeout: 30000 });
  const err = await page.evaluate(() => window.__zzErr || null);
  if (err) throw new Error(err);
  await page.waitForTimeout(400);
}

function closeSheet(page) {
  return page.evaluate(() => {
    const s = document.getElementById('zz-sheet');
    if (s) s.hidden = true;
  });
}

/** Recursos ilimitados + colocación en celdas libres */
async function enrichColony(page, { day, buildings, pop, controlled = 0, vehicles = false }) {
  await page.evaluate(
    ({ day, buildings, pop, controlled, vehicles }) => {
      const s = window.__zz.getState();
      s.day = day;
      s.era = Math.max(s.era || 0, day >= 25 ? 2 : day >= 8 ? 1 : 0);
      Object.keys(s.resources).forEach((k) => {
        s.resources[k] = Math.max(s.resources[k] || 0, 800);
      });
      s.population.manual = s.population.manual || {};
      s.population.manual.build = 2;
      if (pop != null) {
        s.population.total = pop;
        s.population.labor = s.population.labor || {};
        s.population.labor.build = Math.max(2, Math.floor(pop * 0.15));
        s.population.labor.idle = Math.max(2, Math.floor(pop * 0.2));
        s.population.labor.food = Math.floor(pop * 0.2);
        s.population.labor.water = Math.floor(pop * 0.15);
        s.population.labor.produce = Math.floor(pop * 0.1);
        s.population.labor.defense = Math.floor(pop * 0.1);
        s.population.labor.medicine = Math.max(0, Math.floor(pop * 0.05));
      } else {
        s.population.labor = s.population.labor || {};
        s.population.labor.build = Math.max(2, s.population.labor.build || 0);
        s.population.labor.idle = Math.max(1, s.population.labor.idle || 0);
      }
      const free = () => {
        for (let y = 0; y < s.base.h; y++) {
          for (let x = 0; x < s.base.w; x++) {
            if (!s.base.buildings.some((b) => b.x === x && b.y === y && b.hp > 0)) return [x, y];
          }
        }
        return null;
      };
      for (const type of buildings) {
        const cell = free();
        if (!cell) break;
        window.__zz.place(type, cell[0], cell[1]);
        const b = s.base.buildings.find((x) => x.type === type && x.x === cell[0] && x.y === cell[1]);
        if (b && ['farm', 'well', 'workshop', 'sawmill', 'greenhouse'].includes(type)) {
          b.workers = Math.min(3, b.workers || 2);
        }
      }
      if (controlled > 0) {
        let n = 0;
        for (const z of s.zones) {
          if (z.type === 'camp') continue;
          if (n >= controlled) break;
          z.state = 'controlled';
          z.controlProgress = 1;
          n++;
        }
      }
      if (vehicles) {
        s.vehiclesOwned = s.vehiclesOwned || [];
        if (!s.vehiclesOwned.includes('bike')) s.vehiclesOwned.push('bike');
      }
      // Centrar cámara en campamento
      const camp = s.zones.find((z) => z.type === 'camp');
      if (camp && s.mapCamera) {
        s.mapCamera.x = camp.x;
        s.mapCamera.y = camp.y;
        s.mapCamera.zoom = day <= 2 ? 1.35 : day < 25 ? 1.2 : 1.05;
      }
      window.__zz.paint();
    },
    { day, buildings, pop, controlled, vehicles }
  );
  await page.waitForTimeout(350);
}

const gallery = [];

function addShot(file, title, note) {
  gallery.push({ file, title, note });
}

const browser = await chromium.launch({ headless: true });

// —— Móvil ——
{
  const context = await browser.newContext({ ...devices['iPhone 12'], locale: 'es-ES' });
  const page = await context.newPage();
  await boot(page);

  await page.screenshot({ path: join(out, 'dia1.png') });
  addShot('dia1.png', 'Día 1', 'colonia inicial');
  await page.screenshot({ path: join(out, 'mobile.png') });
  addShot('mobile.png', 'Móvil', 'HUD denso + mundo');

  await page.click('#zz-open-pop', { force: true });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, 'poblacion.png') });
  addShot('poblacion.png', 'Población', 'impacto esperado por asignación');
  await closeSheet(page);

  await page.click('#zz-open-build', { force: true });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(out, 'construir.png') });
  addShot('construir.png', 'Construcción', 'catálogo visual');
  await closeSheet(page);

  await page.locator('.zz-ex-card').first().click({ force: true });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, 'explorador.png') });
  addShot('explorador.png', 'Explorador', 'retrato · nivel · XP · skills');
  await page.evaluate(() => {
    const s = window.__zz.getState();
    const ex = (s.explorers || []).find((e) => e.status === 'ready');
    if (ex) {
      s.selectedExplorerId = ex.id;
      s.uiMode = 'explore';
      const sheet = document.getElementById('zz-sheet');
      if (sheet) sheet.hidden = true;
      window.__zz.paint();
    }
  });
  await page.click('#zz-zoom-out', { force: true });
  await page.click('#zz-zoom-out', { force: true });
  await page.waitForTimeout(350);
  await page.screenshot({ path: join(out, 'mapa-explorando.png') });
  addShot('mapa-explorando.png', 'Mapa explorando', 'destinos resaltados');
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.uiMode = null;
    window.__zz.paint();
  });
  await closeSheet(page);

  // Colonia media (~día 18)
  await enrichColony(page, {
    day: 18,
    pop: 14,
    controlled: 2,
    buildings: ['farm', 'well', 'house', 'workshop', 'barricade', 'storage', 'medkit'],
  });
  await page.click('#zz-zoom-out', { force: true });
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(out, 'colonia-media.png') });
  addShot('colonia-media.png', 'Colonia media', 'día ~18 · más edificios/luces');

  // Colonia avanzada (~día 40)
  await enrichColony(page, {
    day: 40,
    pop: 28,
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
  });
  await page.click('#zz-zoom-out', { force: true });
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(out, 'colonia-avanzada.png') });
  addShot('colonia-avanzada.png', 'Colonia avanzada', 'día ~40 · densamente ocupada');
  await page.screenshot({ path: join(out, 'gameplay.png') });
  addShot('gameplay.png', 'Gameplay', 'colonia avanzada en móvil');

  await context.close();
}

// —— Escritorio panorámico ——
{
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: 'es-ES',
  });
  const page = await context.newPage();
  await boot(page);
  await enrichColony(page, {
    day: 40,
    pop: 28,
    controlled: 5,
    vehicles: true,
    buildings: [
      'farm',
      'greenhouse',
      'well',
      'house',
      'workshop',
      'storage',
      'medkit',
      'infirmary',
      'watchtower',
      'fence',
      'sawmill',
    ],
  });
  await page.click('#zz-zoom-out', { force: true });
  await page.click('#zz-zoom-out', { force: true });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(out, 'desktop-panoramico.png') });
  addShot('desktop-panoramico.png', 'Desktop panorámico', 'ciudad amplia 1440×900');
  await page.screenshot({ path: join(out, 'desktop.png') });
  addShot('desktop.png', 'Escritorio', 'mismo estado');

  await page.click('#zz-open-pop', { force: true });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, 'desktop-poblacion.png') });
  addShot('desktop-poblacion.png', 'Escritorio · Población', 'panel flotante');

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
  <title>Revisión visual · Zona Zero 1.2.5</title>
  <style>
    :root { color-scheme: dark; --bg:#12100e; --card:#1a1612; --line:#3a342c; --text:#e8e0d4; --muted:#9a9080; }
    * { box-sizing: border-box; }
    body { margin:0; font-family:"Segoe UI",system-ui,sans-serif; background:var(--bg); color:var(--text); line-height:1.4; padding:1.25rem 1rem 2.5rem; }
    header { max-width:1100px; margin:0 auto 1.5rem; }
    h1 { font-size:1.35rem; font-weight:650; margin:0 0 0.35rem; }
    header p { margin:0; color:var(--muted); font-size:0.92rem; }
    .gallery { max-width:1100px; margin:0 auto; display:grid; gap:1.25rem; grid-template-columns:1fr; }
    @media (min-width:720px) { .gallery { grid-template-columns:repeat(2,minmax(0,1fr)); } }
    figure { margin:0; background:var(--card); border:1px solid var(--line); border-radius:12px; overflow:hidden; }
    a.shot { display:block; color:inherit; text-decoration:none; }
    img { display:block; width:100%; height:auto; background:#0a0908; }
    figcaption { padding:0.65rem 0.85rem 0.8rem; font-size:0.95rem; font-weight:600; border-top:1px solid var(--line); }
    figcaption span { display:block; margin-top:0.15rem; font-size:0.78rem; font-weight:400; color:var(--muted); }
  </style>
</head>
<body>
  <header>
    <h1>Revisión visual · Zona Zero 1.2.5</h1>
    <p>Capturas de la revisión actual (UX + representación del mundo). Se sustituyen en cada entrega.</p>
  </header>
  <main class="gallery">
${figures}
  </main>
</body>
</html>
`,
  'utf8'
);

writeFileSync(
  join(out, 'README.md'),
  `# Revisión visual — Zona Zero 1.2.5

Capturas UX + representación del mundo. Galería: [index.html](./index.html)

Generadas con \`node scripts/review-shots.mjs\`.
`,
  'utf8'
);

// Copiar a Drive (limpiar png/jpg antiguos de revisión)
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

// Contact sheet vía Python/Pillow
const shotsJson = JSON.stringify(gallery.map((g) => [g.file, g.title]));
const py = `
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json

SRC = Path(r'''${out.replace(/\\/g, '\\\\')}''')
DRIVE = Path(r'''${drive.replace(/\\/g, '\\\\')}''')
SHOTS = json.loads(r'''${shotsJson.replace(/'/g, "\\'")}''')
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
draw.text((pad, 12), 'Zona Zero 1.2.5 — revisión visual', fill=(232, 212, 180), font=title_font)
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
out_path = SRC / 'review-contact-sheet.jpg'
canvas.save(out_path, 'JPEG', quality=88, optimize=True)
canvas.save(DRIVE / 'review-contact-sheet.jpg', 'JPEG', quality=88, optimize=True)
print('contact sheet', out_path)
`;
writeFileSync(join(out, '_make_contact.py'), py, 'utf8');
const r = spawnSync('python', [join(out, '_make_contact.py')], { encoding: 'utf8' });
if (r.status !== 0) {
  console.error('contact sheet failed', r.stderr || r.stdout);
  process.exit(1);
}
try {
  rmSync(join(out, '_make_contact.py'), { force: true });
} catch {
  /* ignore */
}

console.log('Review shots:', gallery.map((g) => g.file).join(', '));
console.log('Copied to Drive + contact sheet OK');
