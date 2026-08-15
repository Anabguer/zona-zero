/**
 * Genera capturas de revisión en docs/review/ (móvil + escritorio + gameplay).
 * Sustituye el contenido previo de docs/review/.
 * Uso: node scripts/review-shots.mjs
 * Requiere: servidor local en :8765 (npx serve -l 8765 .)
 */
import { chromium, devices } from 'playwright';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs', 'review');
if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const BASE = process.env.ZZ_REVIEW_URL || 'http://127.0.0.1:8765/dev/harness.html';

async function boot(page) {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => window.__zzOk === true || window.__zzErr, { timeout: 30000 });
  const err = await page.evaluate(() => window.__zzErr || null);
  if (err) throw new Error(err);
  await page.waitForTimeout(500);
}

async function setupGameplay(page) {
  await page.evaluate(() => {
    const s = window.__zz.getState();
    const c = window.__zz.getContent();
    s.population.manual = { build: 1 };
    if (s.population.labor) {
      s.population.labor.build = 1;
      s.population.labor.idle = Math.max(0, (s.population.labor.idle || 3) - 1);
    }
    // Colocar huerto + pozo y asignar trabajadores
    const free = () => {
      for (let y = 0; y < s.base.h; y++) {
        for (let x = 0; x < s.base.w; x++) {
          if (!s.base.buildings.some((b) => b.x === x && b.y === y && b.hp > 0)) return [x, y];
        }
      }
      return null;
    };
    let cell = free();
    if (cell) window.__zz.place('farm', cell[0], cell[1]);
    cell = free();
    if (cell) window.__zz.place('well', cell[0], cell[1]);
    const farm = s.base.buildings.find((b) => b.type === 'farm');
    const well = s.base.buildings.find((b) => b.type === 'well');
    if (farm) farm.workers = 1;
    if (well) well.workers = 1;
    s.population.manual.build = 0;
    window.__zz.paint();
  });
  await page.waitForTimeout(400);
}

const browser = await chromium.launch({ headless: true });

// —— Móvil ——
{
  const context = await browser.newContext({ ...devices['iPhone 12'], locale: 'es-ES' });
  const page = await context.newPage();
  await boot(page);
  await page.screenshot({ path: join(out, 'mobile.png') });

  await page.click('#zz-open-pop', { force: true });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, 'poblacion.png') });
  await page.evaluate(() => {
    document.getElementById('zz-sheet').hidden = true;
  });

  await page.click('#zz-open-build', { force: true });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(out, 'construir.png') });
  await page.evaluate(() => {
    document.getElementById('zz-sheet').hidden = true;
  });

  await page.locator('.zz-ex-card').first().click({ force: true });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, 'explorador.png') });
  await page.evaluate(() => {
    document.getElementById('zz-sheet').hidden = true;
  });

  await setupGameplay(page);
  await page.click('#zz-zoom-out', { force: true });
  await page.click('#zz-zoom-out', { force: true });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(out, 'gameplay.png') });
  await context.close();
}

// —— Escritorio ——
{
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: 'es-ES',
  });
  const page = await context.newPage();
  await boot(page);
  await setupGameplay(page);
  await page.click('#zz-zoom-out', { force: true });
  await page.click('#zz-zoom-out', { force: true });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(out, 'desktop.png') });

  await page.click('#zz-open-pop', { force: true });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, 'desktop-poblacion.png') });
  await context.close();
}

writeFileSync(
  join(out, 'README.md'),
  `# Revisión visual — Zona Zero

Capturas de la **revisión actual** (se sustituyen en cada entrega).

| Archivo | Contenido |
|---------|-----------|
| \`mobile.png\` | Pantalla principal móvil |
| \`desktop.png\` | Vista escritorio 16:9 |
| \`gameplay.png\` | Móvil tras construir/asignar (huerto+pozo) |
| \`poblacion.png\` | Panel de asignación numérica |
| \`construir.png\` | Sheet visual de construcción |
| \`explorador.png\` | Ficha explorador + Mandar a explorar |
| \`desktop-poblacion.png\` | Panel población en escritorio |

Generadas con \`node scripts/review-shots.mjs\` (servidor local \`serve -l 8765\`).
`,
  'utf8'
);

console.log('Review shots written to', out);
await browser.close();
