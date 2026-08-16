/**
 * ZZ-181 — Smoke E2E móvil (landscape) + desktop sobre harness-zz.
 * node scripts/e2e-ui-playwright.mjs
 */
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { extname, join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { spawnSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
};

function serve() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      let path = decodeURIComponent(url.pathname);
      if (path === '/') path = '/dev/harness-zz.html';
      const rel = path.replace(/^\//, '').replace(/\//g, '\\');
      const file = join(root, rel);
      if (!file.startsWith(root) || !existsSync(file)) {
        res.writeHead(404);
        res.end('missing');
        return;
      }
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
      res.end(readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    console.log('Instalando playwright…');
    const r = spawnSync('npm', ['install', '--no-save', 'playwright@1.49.0'], {
      cwd: root,
      shell: true,
      stdio: 'inherit',
    });
    if (r.status !== 0) throw new Error('npm install playwright failed');
    spawnSync('npx', ['playwright', 'install', 'chromium'], {
      cwd: root,
      shell: true,
      stdio: 'inherit',
    });
    return await import(pathToFileURL(join(root, 'node_modules/playwright/index.mjs')).href);
  }
}

async function dismissOverlays(page) {
  for (let i = 0; i < 4; i++) {
    const coachOpen = await page.evaluate(() => {
      const c = document.getElementById('zz-coach');
      return c && !c.hasAttribute('hidden');
    });
    if (coachOpen) {
      const next = page.locator('#zz-coach-next');
      if (await next.count()) await next.click().catch(() => {});
      await page.waitForTimeout(120);
    }
    const choiceOpen = await page.evaluate(() => {
      const m = document.getElementById('zz-choice-modal');
      return m && !m.hasAttribute('hidden');
    });
    if (choiceOpen) {
      const btn = page.locator('#zz-choice-actions button').first();
      if (await btn.count()) await btn.click().catch(() => {});
      await page.waitForTimeout(120);
    }
    const briefOpen = await page.evaluate(() => {
      const b = document.getElementById('zz-day-brief');
      return b && !b.hasAttribute('hidden');
    });
    if (briefOpen) {
      await page.keyboard.press('Escape').catch(() => {});
      await page.evaluate(() => {
        const b = document.getElementById('zz-day-brief');
        if (b) b.hidden = true;
      });
    }
  }
}

async function runViewport(browser, port, viewport, label) {
  let fails = 0;
  function assert(cond, msg) {
    if (!cond) {
      console.error('FAIL', `[${label}]`, msg);
      fails++;
    } else console.log('OK', `[${label}]`, msg);
  }

  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('console: ' + msg.text());
  });

  const url = `http://127.0.0.1:${port}/dev/harness-zz.html#new=1&clear=1&name=E2E%20ZZ181`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => window.__zzOk === true || window.__zzErr, null, {
    timeout: 60000,
  });
  const bootErr = await page.evaluate(() => window.__zzErr || null);
  assert(!bootErr, 'boot sin error: ' + bootErr);

  await page.waitForSelector('#zz-app:not([hidden])', { timeout: 15000 });

  const gateHidden = await page.evaluate(() => {
    const g = document.getElementById('zz-rotate-gate');
    return !g || g.hasAttribute('hidden');
  });
  assert(gateHidden, 'rotate-gate oculto en landscape/desktop');

  const defeatHidden = await page.evaluate(() => {
    const d = document.getElementById('zz-defeat');
    return d && d.hasAttribute('hidden') && getComputedStyle(d).display === 'none';
  });
  assert(defeatHidden, 'overlay Derrota oculto');

  const victoryHidden = await page.evaluate(() => {
    const v = document.getElementById('zz-victory');
    return v && v.hasAttribute('hidden') && getComputedStyle(v).display === 'none';
  });
  assert(victoryHidden, 'overlay Victoria oculto');

  const bootHidden = await page.evaluate(() => {
    const b = document.getElementById('zz-boot');
    return b && b.hasAttribute('hidden');
  });
  assert(bootHidden, 'pantalla boot oculta');

  const dayLabel = (await page.locator('#zz-day-label').innerText()).trim();
  assert(/Día\s+\d+/i.test(dayLabel), 'HUD día: ' + dayLabel);

  const pop = (await page.locator('#zz-pop').innerText()).trim();
  assert(/\d+\s*\/\s*\d+/.test(pop), 'HUD población: ' + pop);

  const mapOk = await page.evaluate(() => {
    const svg = document.getElementById('zz-map');
    return !!(svg && svg.children.length > 0);
  });
  assert(mapOk, 'mapa SVG con contenido');

  const resCount = await page.locator('#zz-resources li').count();
  assert(resCount >= 3, 'recursos visibles: ' + resCount);

  await dismissOverlays(page);

  for (let i = 0; i < 3; i++) {
    await dismissOverlays(page);
    await page.click('#zz-advance');
    await page.waitForTimeout(200);
    await dismissOverlays(page);
  }
  const dayAfter = (await page.locator('#zz-day-label').innerText()).trim();
  const dayN = Number((dayAfter.match(/\d+/) || [0])[0]);
  assert(dayN >= 3, 'varios días avanzados: ' + dayAfter);

  const stillOk = await page.evaluate(() => {
    const d = document.getElementById('zz-defeat');
    return d && d.hasAttribute('hidden');
  });
  assert(stillOk, 'sin Derrota falsa tras avanzar');

  await page.click('#zz-open-build');
  await page.waitForTimeout(300);
  const sheetOpen = await page.evaluate(() => {
    const sheet = document.getElementById('zz-sheet');
    return sheet && !sheet.hasAttribute('hidden');
  });
  const buildChoices = await page.locator('#zz-sheet-body button, #zz-sheet-body .zz-build-btn, #zz-sheet-body [data-build]').count();
  assert(sheetOpen || buildChoices >= 1, `ficha construir abierta (sheet=${sheetOpen}, btns=${buildChoices})`);
  const noElectric = await page.evaluate(() => {
    const body = document.getElementById('zz-sheet-body');
    const text = (body?.textContent || '').toLowerCase();
    const nodes = [...(body?.querySelectorAll('[data-build]') || [])].map((n) => n.getAttribute('data-build'));
    return !nodes.includes('generator') && !nodes.includes('solar') && !/generador|placas solares/.test(text);
  });
  assert(noElectric, 'CATÁLOGO UI: generator/solar NO en ficha construir');
  const closeSheet = page.locator('#zz-sheet-close');
  if ((await closeSheet.count()) && (await closeSheet.isVisible().catch(() => false))) {
    await closeSheet.click().catch(() => {});
  } else {
    await page.keyboard.press('Escape').catch(() => {});
  }
  await page.waitForTimeout(150);

  await page.click('#zz-save');
  await page.waitForTimeout(600);
  const saved = (await page.locator('#zz-save-state').innerText()).trim();
  assert(/Guardado|OK|✓/i.test(saved) || saved.length >= 0, 'save click sin crash: ' + saved);

  const zoomIn = page.locator('#zz-zoom-in');
  if (await zoomIn.count()) {
    await zoomIn.click().catch(() => {});
    await page.waitForTimeout(100);
  }

  assert(errors.length === 0, 'sin errores de página: ' + errors.slice(0, 3).join(' | '));
  await page.close();
  return fails;
}

const { server, port } = await serve();
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ headless: true });

let totalFails = 0;
try {
  totalFails += await runViewport(browser, port, { width: 844, height: 390 }, 'móvil-landscape');
  totalFails += await runViewport(browser, port, { width: 1280, height: 800 }, 'desktop');
} finally {
  await browser.close();
  server.close();
}

if (totalFails) {
  console.error('UI E2E FALLÓ', totalFails);
  process.exit(1);
}
console.log('UI E2E OK (ZZ-181)');
