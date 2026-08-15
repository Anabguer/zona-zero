/**
 * Capturas finales 1.2.2 — móvil + escritorio panorámico + estados
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

function seedColony(page, mode) {
  return page.evaluate((mode) => {
    const s = window.__zz.getState();
    const c = window.__zz.getContent();
    const place = (type, x, y) => {
      if (!c.buildings[type]) return;
      if (s.base.buildings.some((b) => b.x === x && b.y === y && b.hp > 0)) return;
      s.base.buildings.push({ id: 's_' + type + x + y, type, x, y, hp: 100 });
    };
    if (mode === 'day1') {
      s.day = 1;
      s.population.total = 3;
      s.era = 0;
      return;
    }
    if (mode === 'mid') {
      s.day = 40;
      s.population.total = 22;
      s.population.injured = 1;
      s.era = 1;
      s.resources = { ...s.resources, food: 45, water: 40, wood: 55, metal: 40, medicine: 12, fuel: 14, ammo: 10 };
      [
        ['shelter', 1, 3],
        ['shelter', 3, 1],
        ['house', 3, 3],
        ['farm', 0, 2],
        ['farm', 1, 4],
        ['well', 4, 2],
        ['storage', 0, 4],
        ['workshop', 4, 0],
        ['watchtower', 2, 0],
        ['fence', 3, 0],
        ['generator', 0, 0],
        ['radio', 1, 0],
      ].forEach(([t, x, y]) => place(t, x, y));
      s.zones.forEach((z, i) => {
        if (z.type === 'camp') return;
        if (i < 5) {
          z.state = 'controlled';
          z.infectedLeft = 0;
          z.controlProgress = 1;
        } else if (i < 9) z.state = 'discovered';
        else if (i < 12) z.state = 'hostile';
      });
    }
    if (mode === 'adv') {
      s.day = 78;
      s.population.total = 54;
      s.era = 2;
      s.resources.food = 90;
      s.resources.water = 80;
      [
        'clinic',
        'garage',
        'barricade',
        'fence',
        'greenhouse',
        'cistern',
        'kitchen',
        'house',
        'watchtower',
        'armory',
      ].forEach((type, i) => place(type, i % 5, (i * 2) % 5));
      s.zones.forEach((z) => {
        if (z.type === 'camp') return;
        if (z.state === 'unknown') z.state = 'discovered';
        if ((z.risk || 0) < 0.45) {
          z.state = 'controlled';
          z.infectedLeft = 0;
          z.controlProgress = 1;
        }
      });
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
    }
    s.stats.zonesControlled = s.zones.filter((z) => z.state === 'controlled').length;
    window.__zz.paint();
  }, mode);
}

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => console.error('PAGEERROR', e.message));
  await page.goto(`http://127.0.0.1:${port}/dev/harness.html`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => window.__zzOk === true, null, { timeout: 30000 });
  await page.waitForFunction(() => !!window.__zz, null, { timeout: 10000 });
  await dismiss(page);
  await page.waitForTimeout(200);
  await shot(page, '01-movil-dia1');

  // Explorador + expedición
  await page.evaluate(() => {
    const s = window.__zz.getState();
    const z = s.zones.find((x) => x.state === 'discovered' && x.type !== 'camp');
    const ex = s.explorers[0];
    if (z && ex) {
      s.selectedZoneId = z.id;
      s.selectedExplorerId = ex.id;
      s.resources.fuel = Math.max(3, s.resources.fuel || 0);
      import('/js/sim.js').then(({ startExpedition }) => {
        startExpedition(s, window.__zz.getContent(), z.id, ex.id);
        window.__zz.paint();
      });
    }
  });
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    document.getElementById('zz-sheet')?.removeAttribute('hidden');
  });
  // Abrir sheet zona
  await page.evaluate(() => {
    const z = window.__zz.getState().zones.find((x) => x.state === 'discovered' || x.state === 'hostile');
    if (z) {
      // trigger via paint selection
      window.__zz.getState().selectedZoneId = z.id;
    }
  });
  await shot(page, '02-movil-expedicion');

  await page.evaluate(() => {
    const e = window.__zz.getState().explorers[0];
    if (e) {
      const btn = [...document.querySelectorAll('.zz-ex-card')].find((b) => b.textContent.includes(e.name));
      btn?.click();
    }
  });
  await page.waitForTimeout(100);
  await shot(page, '03-movil-explorador');
  await dismiss(page);

  await seedColony(page, 'mid');
  await dismiss(page);
  await page.waitForTimeout(200);
  await shot(page, '04-movil-colonia-media');

  await seedColony(page, 'adv');
  await dismiss(page);
  await page.waitForTimeout(200);
  await shot(page, '05-movil-colonia-avanzada');

  // Evento + ataque
  await page.evaluate(() => {
    const card = document.getElementById('zz-event-card');
    if (card) {
      card.hidden = false;
      card.className = 'zz-event-card zz-event--loot';
      card.innerHTML = '<div class="zz-event-card__head"><strong>Convoy abandonado</strong></div><p>Encontráis cajas selladas en la avenida. Comida y piezas.</p><p class="zz-event-fx">+8 comida · +3 piezas</p>';
    }
  });
  await shot(page, '06-movil-evento');
  await dismiss(page);

  await page.evaluate(() => {
    const s = window.__zz.getState();
    const camp = s.zones.find((z) => z.type === 'camp');
    if (camp) camp._attackFlash = true;
    s.flags.lastAttackZoneId = camp?.id;
    s.director.protectionUntil = s.day + 4;
    window.__zz.paint();
    const card = document.getElementById('zz-attack-card');
    if (card) {
      card.hidden = false;
      card.className = 'zz-attack-card zz-attack-card--messy';
      card.innerHTML =
        '<strong>Ataque contenido</strong><p>Intensidad 2 · Muertos 0 · Heridos 2</p><p class="zz-event-fx">Habéis aguantado. Revisad heridos y munición.</p>';
    }
  });
  await shot(page, '07-movil-ataque');
  await page.waitForTimeout(100);
  await shot(page, '08-movil-crisis-recuperacion');
  await dismiss(page);

  // Escritorio panorámico
  await page.setViewportSize({ width: 1440, height: 810 });
  await page.evaluate(() => {
    const s = window.__zz.getState();
    // reset to day1-like then mid/adv for desktop
    s.day = 1;
    s.population.total = 3;
    s.era = 0;
    s.director.protectionUntil = 0;
    s.zones.forEach((z) => {
      if (z.type === 'camp') {
        z.state = 'controlled';
        return;
      }
      z.state = z.state === 'controlled' ? 'discovered' : z.state;
    });
    // keep some discovered
    let n = 0;
    s.zones.forEach((z) => {
      if (z.type === 'camp') return;
      if (n < 2) z.state = 'discovered';
      else if (n < 4) z.state = 'unknown';
      n++;
    });
    s.base.buildings = s.base.buildings.filter((b) => String(b.type).startsWith('hq') || b.type === 'farm' || b.type === 'well').slice(0, 4);
    window.__zz.paint();
  });
  await dismiss(page);
  await page.waitForTimeout(250);
  await shot(page, '09-escritorio-dia1');

  await seedColony(page, 'mid');
  await dismiss(page);
  await page.waitForTimeout(250);
  await shot(page, '10-escritorio-media');

  await seedColony(page, 'adv');
  await dismiss(page);
  await page.waitForTimeout(250);
  await shot(page, '11-escritorio-avanzada');

  // Panel replegado vs abierto
  await page.evaluate(() => {
    document.getElementById('zz-sheet').hidden = true;
    window.__zz.paint();
  });
  await shot(page, '12-escritorio-mundo-limpio');

  await page.evaluate(() => {
    const e = window.__zz.getState().explorers[0];
    const btn = [...document.querySelectorAll('.zz-ex-card')][0];
    btn?.click();
  });
  await page.waitForTimeout(120);
  await shot(page, '13-escritorio-panel-explorador');

  writeFileSync(
    join(outDir, 'INDEX.txt'),
    shots.map((s) => s + '.png').join('\n') + '\n',
    'utf8'
  );
  console.log('DONE', shots.length);
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
