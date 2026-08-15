/**
 * Capturas finales producción 1.2.1
 * node scripts/screenshots-prod.mjs
 */
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'scripts', 'screenshots-prod');
mkdirSync(outDir, { recursive: true });

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

function serve() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      let path = decodeURIComponent(url.pathname);
      if (path === '/') path = '/dev/harness.html';
      const file = join(root, path.replace(/^\//, ''));
      if (!file.startsWith(root) || !existsSync(file)) {
        res.writeHead(404);
        res.end('missing');
        return;
      }
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
      res.end(readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

const { chromium } = await import('playwright');
const { server, port } = await serve();
const browser = await chromium.launch({ headless: true });
const shots = [];

async function shot(page, name) {
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: false });
  shots.push(name);
  console.log('SHOT', name);
}

async function dismiss(page) {
  await page.evaluate(() => {
    const m = document.getElementById('zz-choice-modal');
    if (m && !m.hidden) m.querySelector('#zz-choice-actions button')?.click();
    ['zz-event-card', 'zz-attack-card', 'zz-toast'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.hidden = true;
    });
    document.getElementById('zz-coach-dismiss')?.click();
    const sheet = document.getElementById('zz-sheet');
    if (sheet) sheet.hidden = true;
  });
}

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => console.error('PAGEERROR', e.message));
  await page.goto(`http://127.0.0.1:${port}/dev/harness.html`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => window.__zzOk === true, null, { timeout: 30000 });
  await page.waitForFunction(() => !!window.__zz, null, { timeout: 10000 });
  await dismiss(page);
  await page.waitForTimeout(300);
  await shot(page, '01-movil-dia1-mundo');

  // Expedición + sheet
  await page.evaluate(() => {
    const z = window.__zz.getState().zones.find((x) => x.state === 'discovered');
    if (z) {
      window.__zz.getState().selectedZoneId = z.id;
      window.__zz.paint();
    }
  });
  await page.click('#zz-map', { position: { x: 200, y: 180 } }).catch(() => {});
  await page.waitForTimeout(200);
  // Abrir zona vía API de UI: click explorador then use evaluate to open zone
  await page.evaluate(() => {
    const s = window.__zz.getState();
    const z = s.zones.find((x) => x.state === 'discovered' && x.type !== 'camp');
    if (z) {
      s.selectedZoneId = z.id;
      document.getElementById('zz-open-pop')?.blur();
    }
    window.__zz.paint();
  });
  await shot(page, '02-movil-dia1-hud');

  // Sembrar colonia media (~día 40 visual)
  await page.evaluate(() => {
    const s = window.__zz.getState();
    const c = window.__zz.getContent();
    s.day = 40;
    s.population.total = 22;
    s.population.injured = 1;
    s.resources = { ...s.resources, food: 40, water: 35, wood: 50, metal: 40, medicine: 12, fuel: 15, ammo: 10 };
    s.era = 1;
    const plan = [
      ['shelter', 1, 3],
      ['shelter', 3, 1],
      ['house', 3, 3],
      ['farm', 0, 2],
      ['farm', 1, 4],
      ['well', 4, 2],
      ['storage', 0, 4],
      ['workshop', 4, 0],
      ['watchtower', 2, 0],
      ['generator', 0, 0],
      ['radio', 1, 0],
    ];
    plan.forEach(([type, x, y]) => {
      if (!c.buildings[type]) return;
      if (s.base.buildings.some((b) => b.x === x && b.y === y && b.hp > 0)) return;
      Object.entries(c.buildings[type].cost || {}).forEach(([k, v]) => {
        s.resources[k] = Math.max(s.resources[k] || 0, v + 2);
      });
      s.base.buildings.push({ id: 'b_' + type + x + y, type, x, y, hp: 100 });
    });
    s.zones.forEach((z, i) => {
      if (z.type === 'camp') return;
      if (i < 5) z.state = 'controlled';
      else if (i < 9) z.state = 'discovered';
      else if (i < 12) z.state = 'hostile';
    });
    s.stats.zonesControlled = s.zones.filter((z) => z.state === 'controlled').length;
    window.__zz.paint();
  });
  await dismiss(page);
  await page.waitForTimeout(400);
  await shot(page, '03-movil-dia40-colonia');

  // Avanzada
  await page.evaluate(() => {
    const s = window.__zz.getState();
    const c = window.__zz.getContent();
    s.day = 78;
    s.population.total = 54;
    s.era = 2;
    s.resources.food = 80;
    s.resources.water = 70;
    ['clinic', 'garage', 'barricade', 'fence', 'greenhouse', 'cistern', 'kitchen'].forEach((type, i) => {
      if (!c.buildings[type]) return;
      const x = i % 5;
      const y = (i * 2) % 5;
      if (s.base.buildings.some((b) => b.x === x && b.y === y && b.hp > 0)) return;
      s.base.buildings.push({ id: 'adv_' + type, type, x, y, hp: 100 });
    });
    s.zones.forEach((z) => {
      if (z.type === 'camp') return;
      if (z.state === 'unknown') z.state = 'discovered';
      if ((z.risk || 0) < 0.4) z.state = 'controlled';
    });
    s.stats.zonesControlled = s.zones.filter((z) => z.state === 'controlled').length;
    // Segundo explorador
    if (s.explorers.length < 2) {
      s.explorers.push({
        id: 'ex_demo2',
        name: 'Nora',
        portraitSeed: 42,
        level: 2,
        xp: 5,
        skills: { explore: 3, loot: 2, fight: 2, resist: 3 },
        status: 'ready',
        gear: { weapon: 'basic', armor: 'none' },
        vehicleId: null,
        expeditionId: null,
        wounds: 0,
      });
    }
    window.__zz.paint();
  });
  await dismiss(page);
  await page.waitForTimeout(400);
  await shot(page, '04-movil-colonia-avanzada');

  // Sheet población
  await page.click('#zz-open-pop');
  await page.waitForTimeout(250);
  await shot(page, '05-movil-poblacion-sheet');
  await dismiss(page);

  // Desktop
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(350);
  await shot(page, '06-escritorio-mundo');
  await page.click('#zz-explorer-rail .zz-ex-card');
  await page.waitForTimeout(250);
  await shot(page, '07-escritorio-panel-explorador');
  await page.click('#zz-sheet-close');
  await page.waitForTimeout(200);
  await shot(page, '08-escritorio-mundo-sin-panel');

  // Día 1 reset visual for comparison - new page
  const page2 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page2.goto(`http://127.0.0.1:${port}/dev/harness.html`, { waitUntil: 'networkidle', timeout: 60000 });
  await page2.waitForFunction(() => window.__zzOk === true, null, { timeout: 30000 });
  await page2.waitForTimeout(400);
  await shot(page2, '09-movil-dia1-limpio');
  await page2.close();

  writeFileSync(join(outDir, 'INDEX.txt'), shots.join('\n') + '\n');
  console.log('DONE', shots.length);
} finally {
  await browser.close();
  server.close();
}
