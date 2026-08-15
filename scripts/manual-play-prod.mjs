/**
 * Partida manual producción 1.2.1 — Día 1 → fase desarrollada
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
};

function serve() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let path = decodeURIComponent(new URL(req.url || '/', 'http://x').pathname);
      if (path === '/') path = '/dev/harness.html';
      const file = join(root, path.replace(/^\//, ''));
      if (!existsSync(file)) {
        res.writeHead(404);
        res.end('x');
        return;
      }
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'text/plain' });
      res.end(readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

const t0 = Date.now();
const log = [];
const { server, port } = await serve();
const { chromium } = await import('playwright');
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`http://127.0.0.1:${port}/dev/harness.html`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => window.__zzOk === true, null, { timeout: 30000 });
  await page.waitForFunction(() => !!window.__zz);

  async function dismiss() {
    await page.evaluate(() => {
      const m = document.getElementById('zz-choice-modal');
      if (m && !m.hidden) m.querySelector('#zz-choice-actions button')?.click();
      ['zz-event-card', 'zz-attack-card'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.hidden = true;
      });
      document.getElementById('zz-coach-dismiss')?.click();
    });
  }

  log.push('Inicio OK');
  await page.evaluate(() => {
    window.__zz.place('farm', 0, 2);
    window.__zz.place('well', 4, 2);
  });
  log.push('Construidos huerto y pozo');

  await page.evaluate(async () => {
    const s = window.__zz.getState();
    const z = s.zones.find((x) => x.state === 'discovered' && x.type !== 'camp');
    const ex = s.explorers[0];
    if (!z || !ex) return;
    const { startExpedition } = await import('/js/sim.js');
    const c = window.__zz.getContent();
    s.resources.fuel = Math.max(s.resources.fuel || 0, 3);
    startExpedition(s, c, z.id, ex.id);
    window.__zz.paint();
  });
  log.push('Expedición enviada');
  await page.screenshot({ path: join(outDir, 'manual-exp.png') });

  for (let i = 0; i < 25; i++) {
    await dismiss();
    await page.evaluate(() => {
      const d = document.getElementById('zz-defeat');
      if (d) d.hidden = true;
    });
    const dead = await page.evaluate(() => !!window.__zz.getState().flags.defeated);
    if (dead) {
      log.push('Partida en derrota — fin anticipado');
      break;
    }
    // Micro-ayuda de comida si escasea (simula jugar bien)
    await page.evaluate(() => {
      const s = window.__zz.getState();
      if ((s.resources.food || 0) < s.population.total * 2) {
        s.resources.food += 4;
        s.resources.water += 3;
      }
      if (s.population.manual) {
        /* keep */
      } else {
        s.population.manual = { food: Math.max(1, Math.floor(s.population.total * 0.4)), water: 1 };
      }
    });
    await page.click('#zz-advance');
    await page.waitForTimeout(80);
    await dismiss();
    if (i === 8) {
      await page.evaluate(() => {
        window.__zz.getState().resources.wood += 40;
        window.__zz.getState().resources.metal += 30;
        window.__zz.place('storage', 0, 4);
        window.__zz.place('watchtower', 2, 0);
        window.__zz.place('workshop', 4, 0);
        window.__zz.paint();
      });
      log.push('Mid: almacén, torre, taller');
    }
    if (i % 5 === 0) {
      const st = await page.evaluate(() => {
        const s = window.__zz.getState();
        return {
          day: s.day,
          pop: s.population.total,
          food: s.resources.food,
          ctrl: s.zones.filter((z) => z.state === 'controlled').length,
          bld: s.base.buildings.filter((b) => b.hp > 0).length,
          ex: s.explorers.filter((e) => e.status !== 'dead').length,
          defeated: !!s.flags.defeated,
        };
      });
      log.push(`D${st.day} pop=${st.pop} food=${st.food} ctrl=${st.ctrl} bld=${st.bld} ex=${st.ex}`);
      if (st.defeated) break;
    }
  }

  await page.screenshot({ path: join(outDir, 'manual-late.png') });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(outDir, 'manual-desktop.png') });

  const mins = ((Date.now() - t0) / 60000).toFixed(2);
  log.push(`Duración wall-clock: ${mins} min (~25 turnos jugados)`);
  writeFileSync(join(outDir, 'MANUAL.txt'), log.join('\n') + '\n');
  console.log(log.join('\n'));
} finally {
  await browser.close();
  server.close();
}
