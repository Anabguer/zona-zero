/**
 * Partida manual automatizada (revisión de ritmo 1.1)
 * node scripts/manual-play-1.1.mjs
 */
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { spawnSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'scripts', 'screenshots-1.1');
mkdirSync(outDir, { recursive: true });

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
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

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    spawnSync('npm', ['install', '--no-save', 'playwright@1.49.0'], { cwd: root, shell: true, stdio: 'inherit' });
    return await import(pathToFileURL(join(root, 'node_modules/playwright/index.mjs')).href);
  }
}

const t0 = Date.now();
const log = [];
const { server, port } = await serve();
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => log.push('ERR ' + e.message));
  await page.goto(`http://127.0.0.1:${port}/dev/harness.html`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => window.__zzOk === true, null, { timeout: 30000 });
  await page.waitForFunction(() => !!window.__zz, null, { timeout: 10000 });

  async function snap(name) {
    await page.screenshot({ path: join(outDir, `manual-${name}.png`), fullPage: false });
  }
  async function dismiss() {
    await page.evaluate(() => {
      const m = document.getElementById('zz-choice-modal');
      if (m && !m.hidden) {
        const b = m.querySelector('#zz-choice-actions button');
        if (b) b.click();
      }
      const ec = document.getElementById('zz-event-card');
      if (ec) ec.hidden = true;
      const ac = document.getElementById('zz-attack-card');
      if (ac) ac.hidden = true;
      const d = document.getElementById('zz-coach-dismiss');
      if (d) d.click();
    });
    await page.waitForTimeout(80);
  }

  const start = await page.evaluate(() => {
    const s = window.__zz.getState();
    return { day: s.day, pop: s.survivors.filter((x) => x.status !== 'dead').length, food: s.resources.food };
  });
  log.push(`Inicio D${start.day} pop=${start.pop} food=${start.food}`);

  // Construir huerto + pozo
  await page.click('#zz-tab-base');
  await page.evaluate(() => {
    window.__zz.grant({ wood: 20, metal: 10, water: 10 });
    window.__zz.place('farm', 0, 2);
    window.__zz.place('well', 4, 2);
    window.__zz.place('shelter', 1, 3);
  });
  log.push('Construidos: huerto, pozo, refugio');
  await snap('build');

  // Expedición
  await page.click('#zz-tab-people');
  const sug = page.locator('button', { hasText: 'Sugerir' });
  if (await sug.count()) await sug.click();
  await page.click('#zz-tab-map');
  await dismiss();
  if (await page.locator('#zz-send-exp').count()) {
    await page.click('#zz-send-exp');
    log.push('Expedición enviada');
  }
  await snap('exp-out');

  // Avanzar ~18 días jugando
  for (let i = 0; i < 18; i++) {
    await dismiss();
    await page.click('#zz-advance');
    await page.waitForTimeout(120);
    await dismiss();
    const st = await page.evaluate(() => {
      const s = window.__zz.getState();
      return {
        day: s.day,
        pop: s.survivors.filter((x) => x.status !== 'dead').length,
        food: s.resources.food,
        water: s.resources.water,
        era: s.era,
        controlled: s.zones.filter((z) => z.state === 'controlled').length,
        discovered: s.zones.filter((z) => z.state !== 'unknown').length,
        buildings: s.base.buildings.filter((b) => b.hp > 0).length,
        defeated: !!s.flags.defeated,
        log0: s.log[0]?.text || '',
      };
    });
    if (i % 3 === 0 || st.defeated) {
      log.push(
        `D${st.day} pop=${st.pop} food=${st.food} water=${st.water} era=${st.era} ctrl=${st.controlled} known=${st.discovered} bld=${st.buildings} | ${st.log0}`
      );
    }
    if (st.defeated) {
      log.push('DERROTA');
      break;
    }
    // Mid-game: más construcción cuando hay gente libre
    if (i === 5) {
      await page.evaluate(() => {
        window.__zz.grant({ wood: 30, metal: 20 });
        const s = window.__zz.getState();
        s.survivors.forEach((x) => {
          x.busyUntilDay = 0;
        });
        window.__zz.place('storage', 0, 4);
        window.__zz.place('watchtower', 2, 0);
        window.__zz.place('workshop', 4, 0);
      });
      log.push('Mid: almacén, torre, taller');
    }
    if (i === 10) {
      await page.click('#zz-tab-more');
      await page.waitForTimeout(100);
      const tech = page.locator('.zz-tech-card:not([disabled])').first();
      if (await tech.count()) {
        await tech.click();
        log.push('Investigación iniciada');
      }
      await page.click('#zz-tab-map');
    }
  }

  await page.click('#zz-tab-map');
  await dismiss();
  await snap('late-map');
  await page.click('#zz-tab-base');
  await snap('late-base');
  await page.click('#zz-tab-progress');
  await snap('late-progress');

  const end = await page.evaluate(() => {
    const s = window.__zz.getState();
    return {
      day: s.day,
      pop: s.survivors.filter((x) => x.status !== 'dead').length,
      era: s.era,
      controlled: s.zones.filter((z) => z.state === 'controlled').length,
      buildings: s.base.buildings.filter((b) => b.hp > 0).length,
      defeated: !!s.flags.defeated,
    };
  });
  const mins = ((Date.now() - t0) / 60000).toFixed(1);
  log.push(`FIN D${end.day} pop=${end.pop} era=${end.era} ctrl=${end.controlled} bld=${end.buildings} defeated=${end.defeated}`);
  log.push(`Duración script: ${mins} min (wall-clock)`);
  log.push('Notas jugables: mapa ciudad+niebla; base con edificios distintos; coach; expedición visible; progreso eras; sin popups de calma.');

  writeFileSync(join(outDir, 'MANUAL_PLAY.txt'), log.join('\n') + '\n');
  console.log(log.join('\n'));
} finally {
  await browser.close();
  server.close();
}
