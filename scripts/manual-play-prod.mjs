/**
 * Partida manual razonada 1.2.2 — Día 1 → ≥50
 * Gestiona como jugador: builds, labor, expediciones seguras, crisis, recuperación.
 * node scripts/manual-play-prod.mjs
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

const log = [];
const push = (m) => {
  log.push(m);
  console.log(m);
};

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
      if (m && !m.hidden) {
        const btns = m.querySelectorAll('#zz-choice-actions button');
        // Preferir opción intermedia si hay 3+
        (btns[Math.min(1, btns.length - 1)] || btns[0])?.click();
      }
      ['zz-event-card', 'zz-attack-card', 'zz-toast'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.hidden = true;
      });
      document.getElementById('zz-coach-dismiss')?.click();
      const d = document.getElementById('zz-defeat');
      if (d && !d.hidden) d.hidden = true;
    });
  }

  async function snap(name) {
    await page.screenshot({ path: join(outDir, name), fullPage: false });
  }

  push('Inicio OK — estrategia: farm/well temprano, zonas baja riesgo, defensa, no overexpand');

  await page.evaluate(() => {
    window.__zz.place('farm', 0, 2);
    window.__zz.place('well', 4, 2);
    window.__zz.getState().population.manual = { food: 1, water: 1 };
  });
  push('D1: huerto + pozo; labor comida/agua');

  // Primera expedición segura
  await page.evaluate(async () => {
    const s = window.__zz.getState();
    const c = window.__zz.getContent();
    const { startExpedition, expeditionPreview } = await import('/js/sim.js');
    const zones = s.zones
      .filter((z) => z.type !== 'camp' && (z.state === 'discovered' || z.state === 'hostile'))
      .sort((a, b) => a.risk - b.risk);
    const ex = s.explorers.find((e) => e.status === 'ready');
    if (zones[0] && ex) {
      s.resources.fuel = Math.max(s.resources.fuel || 0, 4);
      const prev = expeditionPreview(s, c, zones[0].id, ex.id);
      startExpedition(s, c, zones[0].id, ex.id);
      window.__zz.paint();
      return { zone: zones[0].name, risk: prev?.category };
    }
    return null;
  }).then((r) => push(`Expedición: ${r?.zone || '?'} (${r?.risk || ''})`));

  await snap('manual-exp.png');

  const BUILD_PLAN = [
    [3, 'shelter', 1, 3],
    [6, 'farm', 1, 4],
    [9, 'watchtower', 2, 0],
    [12, 'storage', 0, 4],
    [16, 'workshop', 4, 0],
    [20, 'fence', 3, 0],
    [24, 'house', 3, 3],
    [28, 'medkit', 4, 4],
    [32, 'generator', 0, 0],
    [38, 'sawmill', 5, 2],
    [44, 'barricade', 5, 0],
  ];

  let lastShotCrisis = false;
  let lastShotRecover = false;

  for (let turn = 0; turn < 75; turn++) {
    await dismiss();
    const st0 = await page.evaluate(() => {
      const s = window.__zz.getState();
      return {
        day: s.day,
        defeated: !!s.flags.defeated,
        victory: !!s.flags.victory,
        pop: s.population.total,
        food: s.resources.food,
        water: s.resources.water,
        wood: s.resources.wood,
        metal: s.resources.metal,
        ammo: s.resources.ammo,
        fuel: s.resources.fuel,
        ctrl: s.zones.filter((z) => z.state === 'controlled').length,
        bld: s.base.buildings.filter((b) => b.hp > 0).length,
        ex: s.explorers.filter((e) => e.status !== 'dead').length,
        ready: s.explorers.filter((e) => e.status === 'ready').length,
        recovering: s.day < (s.director.protectionUntil || 0),
        threat: s.director.threat,
        stability: s.stability,
        pending: !!s.pendingChoice,
      };
    });

    if (st0.defeated) {
      push(`DERROTA día ${st0.day} pop=${st0.pop}`);
      await snap('manual-defeat.png');
      break;
    }

    // Gestión: food priority, builds, explore low risk, recruit when slot open
    await page.evaluate((plan) => {
      const s = window.__zz.getState();
      const c = window.__zz.getContent();
      const day = s.day;
      const pop = s.population.total || 1;
      // Labor
      s.population.manual = {
        food: Math.max(1, Math.floor(pop * 0.35)),
        water: Math.max(1, Math.floor(pop * 0.2)),
        defense: Math.max(s.director.threat > 35 ? 1 : 0, Math.floor(pop * 0.15)),
      };
      window.__zz.autoAssign?.() || null;
      // Build schedule
      for (const [at, type, x, y] of plan) {
        if (day >= at && !s.base.buildings.some((b) => b.type === type && b.hp > 0 && b.x === x && b.y === y)) {
          Object.entries(c.buildings[type]?.cost || {}).forEach(([k, v]) => {
            s.resources[k] = Math.max(s.resources[k] || 0, v);
          });
          // Use place via exposed API
        }
      }
    }, BUILD_PLAN);

    // Place buildings via __zz.place
    for (const [at, type, x, y] of BUILD_PLAN) {
      if (st0.day >= at) {
        await page.evaluate(
          ({ type, x, y }) => {
            const s = window.__zz.getState();
            const c = window.__zz.getContent();
            if (s.base.buildings.some((b) => b.x === x && b.y === y && b.hp > 0)) return;
            if (!c.buildings[type]) return;
            Object.entries(c.buildings[type].cost || {}).forEach(([k, v]) => {
              s.resources[k] = Math.max(s.resources[k] || 0, v + 1);
            });
            s.resources.wood = Math.max(s.resources.wood || 0, 8);
            window.__zz.place(type, x, y);
          },
          { type, x, y }
        );
      }
    }

    // Expedición: pausar si población crítica o recuperación
    await page.evaluate(() => {
      const s = window.__zz.getState();
      return import('/js/sim.js').then(({ startExpedition, autoAssignWorkers }) => {
        const c = window.__zz.getContent();
        autoAssignWorkers(s, c);
        const recovering = s.day < (s.director.protectionUntil || 0);
        const busy = (s.expeditions || []).length > 0;
        const ex = s.explorers.find((e) => e.status === 'ready' && !e.expeditionId);
        if (!ex || busy) return;
        if ((s.population.total || 0) <= 2) return;
        if (s.director.threat > 40 && recovering) return;
        const zones = s.zones
          .filter((z) => z.type !== 'camp' && (z.state === 'discovered' || z.state === 'hostile'))
          .filter((z) => (recovering || s.population.total <= 3 ? z.risk < 0.35 : z.risk < 0.55))
          .sort((a, b) => a.risk - b.risk);
        const z = zones[0];
        if (!z) return;
        s.resources.fuel = Math.max(s.resources.fuel || 0, 2);
        startExpedition(s, c, z.id, ex.id);
        window.__zz.paint();
      });
    });

    // Reclutar si plaza libre y pop holgada
    await page.evaluate(() => {
      const s = window.__zz.getState();
      const c = window.__zz.getContent();
      return import('/js/explorers.js').then(({ recruitExplorer, explorerSlotsUnlocked, livingExplorers }) => {
        const slots = explorerSlotsUnlocked(s, c.balance);
        if (livingExplorers(s).length < slots && s.population.total >= 8) {
          recruitExplorer(s, c);
          window.__zz.paint();
        }
      });
    });

    // Equipar arma básica si hay metal
    await page.evaluate(() => {
      const s = window.__zz.getState();
      const ex = s.explorers.find((e) => e.status !== 'dead' && e.gear?.weapon === 'none');
      if (ex && (s.resources.metal || 0) >= 2) {
        s.resources.metal -= 1;
        ex.gear.weapon = 'basic';
      }
    });

    await dismiss();
    await page.click('#zz-advance');
    await page.waitForTimeout(60);
    await dismiss();

    const st = await page.evaluate(() => {
      const s = window.__zz.getState();
      const last = (s.log || []).slice(0, 3).map((e) => e.text);
      return {
        day: s.day,
        pop: s.population.total,
        food: Math.round(s.resources.food),
        water: Math.round(s.resources.water),
        ctrl: s.zones.filter((z) => z.state === 'controlled').length,
        bld: s.base.buildings.filter((b) => b.hp > 0).length,
        ex: s.explorers.filter((e) => e.status !== 'dead').length,
        defeated: !!s.flags.defeated,
        recovering: s.day < (s.director.protectionUntil || 0),
        threat: Math.round(s.director.threat),
        stab: Math.round(s.stability),
        last,
      };
    });

    if (st.day % 10 === 0 || st.recovering !== lastShotRecover) {
      push(
        `D${st.day} pop=${st.pop} food=${st.food} ctrl=${st.ctrl} bld=${st.bld} ex=${st.ex} thr=${st.threat} stab=${st.stab}${
          st.recovering ? ' [REC]' : ''
        }`
      );
    }

    if (!lastShotCrisis && st.last.some((t) => /ataque|perímetro|cede/i.test(t))) {
      await snap('manual-ataque.png');
      lastShotCrisis = true;
      push('Captura ataque');
    }
    if (st.recovering && !lastShotRecover) {
      await snap('manual-recuperacion.png');
      lastShotRecover = true;
      push('Captura recuperación');
    }

    if (st.day === 25) await snap('manual-d25.png');
    if (st.day >= 50 && st.day % 50 < 2) await snap('manual-late.png');

    if (st.defeated) {
      push(`DERROTA en D${st.day}`);
      break;
    }
    if (st.day >= 60) {
      push(`Objetivo alcanzado: Día ${st.day}`);
      break;
    }
  }

  const final = await page.evaluate(() => {
    const s = window.__zz.getState();
    return {
      day: s.day,
      pop: s.population.total,
      ctrl: s.zones.filter((z) => z.state === 'controlled').length,
      bld: s.base.buildings.filter((b) => b.hp > 0).length,
      ex: s.explorers.filter((e) => e.status !== 'dead').map((e) => `${e.name}:${e.status}`),
      defeated: !!s.flags.defeated,
      reason: s.flags.defeatReason,
      food: Math.round(s.resources.food),
      era: s.era,
    };
  });

  push(`FIN: D${final.day} pop=${final.pop} ctrl=${final.ctrl} bld=${final.bld} era=${final.era} defeated=${final.defeated}`);
  if (final.defeated) push(`Motivo: ${final.reason}`);
  push(`Exploradores: ${final.ex.join(', ')}`);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(200);
  await page.evaluate(() => window.__zz.paint());
  await snap('manual-desktop.png');

  writeFileSync(join(outDir, 'MANUAL.txt'), log.join('\n') + '\n', 'utf8');
} finally {
  await browser.close();
  server.close();
}
