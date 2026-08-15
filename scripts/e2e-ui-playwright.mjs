/**
 * Playwright: flujo UI real sobre harness local (sin login).
 * npx --yes playwright@1.49.0 install chromium
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
};

function serve() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      let path = decodeURIComponent(url.pathname);
      if (path === '/') path = '/dev/harness.html';
      const file = join(root, path.replace(/^\//, '').replace(/\//g, '\\'));
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

const { server, port } = await serve();
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push('console: ' + msg.text());
});

let fails = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    fails++;
  } else console.log('OK', msg);
}

try {
  await page.goto(`http://127.0.0.1:${port}/dev/harness.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__zzOk === true || window.__zzOk === false, null, {
    timeout: 20000,
  });
  const bootErr = await page.evaluate(() => window.__zzErr || null);
  assert(!bootErr, 'boot sin error: ' + bootErr);

  const defeatHidden = await page.evaluate(() => {
    const d = document.getElementById('zz-defeat');
    const style = getComputedStyle(d);
    return d.hasAttribute('hidden') && style.display === 'none';
  });
  assert(defeatHidden, 'overlay Derrota oculto (display:none + hidden)');

  const victoryHidden = await page.evaluate(() => {
    const v = document.getElementById('zz-victory');
    return v && v.hasAttribute('hidden') && getComputedStyle(v).display === 'none';
  });
  assert(victoryHidden, 'overlay Victoria oculto');

  const bootHidden = await page.evaluate(() => {
    const b = document.getElementById('zz-boot');
    return b.hasAttribute('hidden') && getComputedStyle(b).display === 'none';
  });
  assert(bootHidden, 'pantalla Preparando partida oculta');

  const eraText = (await page.locator('#zz-era').innerText()).trim();
  assert(eraText.length > 0 && eraText !== '\u2014' && eraText !== '-', 'HUD era visible: ' + eraText);

  const stab = await page.locator('#zz-stability').innerText();
  assert(/\d+/.test(stab), 'HUD estabilidad: ' + stab);

  const people = await page.locator('.zz-person:not(.is-dead)').count();
  assert(people === 3, '3 supervivientes visibles: ' + people);

  // 5 skills (incl. produce) x 3 personas = 15
  const skillBars = await page.locator('.zz-skill').count();
  assert(skillBars === 15, 'barras de habilidad (5x3 produce): ' + skillBars);

  const produceBars = await page.locator('.zz-skill-ico--produce, [data-skill="produce"]').count();
  assert(produceBars === 3, 'skill produce x3: ' + produceBars);

  const portraits = await page.locator('.zz-portrait').count();
  assert(portraits === 3, 'retratos SVG: ' + portraits);

  const pop = await page.locator('#zz-pop').innerText();
  assert(/^3\//.test(pop), 'HUD población 3/x: ' + pop);

  const resCount = await page.locator('#zz-resources li').count();
  assert(resCount >= 6, 'recursos visibles: ' + resCount);

  // Mapa urbano
  await page.click('#zz-tab-map');
  await page.waitForTimeout(200);
  const sectors = await page.locator('.zz-zone-poly').count();
  assert(sectors >= 5, 'sectores de mapa: ' + sectors);

  await page.waitForSelector('#zz-send-exp:not([disabled])');
  await page.click('#zz-send-exp');
  await page.waitForTimeout(500);
  const expSent = await page.evaluate(() => {
    const panel = document.getElementById('zz-zone-panel');
    const toast = document.getElementById('zz-toast');
    const text = (panel?.textContent || '') + ' ' + (toast?.textContent || '');
    return /en curso|enviada/i.test(text);
  });
  assert(expSent, 'expedición enviada (panel/toast)');

  async function dismissChoiceIfAny() {
    const open = await page.evaluate(() => {
      const m = document.getElementById('zz-choice-modal');
      return m && !m.hasAttribute('hidden');
    });
    if (open) {
      const btn = page.locator('#zz-choice-actions button').first();
      if (await btn.count()) {
        await btn.click();
        await page.waitForTimeout(200);
      }
    }
  }

  // Avanzar varios días (cerrar decisiones del director si aparecen)
  for (let i = 0; i < 5; i++) {
    await dismissChoiceIfAny();
    await page.click('#zz-advance');
    await page.waitForTimeout(150);
    await dismissChoiceIfAny();
  }
  const day = Number(await page.locator('#zz-day').innerText());
  assert(day >= 5, 'varios días: ' + day);

  const stillHidden = await page.evaluate(() => {
    const d = document.getElementById('zz-defeat');
    return d.hasAttribute('hidden') && getComputedStyle(d).display === 'none';
  });
  assert(stillHidden, 'tras varios días sigue sin Derrota falsa');

  // Base → construir
  await page.click('#zz-tab-base');
  await page.waitForTimeout(200);
  const buildBtns = page.locator('.zz-build-btn');
  const nBuild = await buildBtns.count();
  assert(nBuild >= 3, 'botones de construcción: ' + nBuild);
  const thumbs = await page.locator('.zz-bthumb').count();
  assert(thumbs >= 3, 'miniaturas edificio: ' + thumbs);
  await buildBtns.first().click();
  const baseBox = await page.locator('#zz-base').boundingBox();
  if (baseBox) {
    await page.mouse.click(baseBox.x + baseBox.width * 0.7, baseBox.y + baseBox.height * 0.7);
    await page.waitForTimeout(200);
  }

  await page.click('#zz-tab-people');
  await page.waitForTimeout(100);

  await page.click('#zz-tab-more');
  await page.waitForTimeout(200);
  const moreVisible = await page.evaluate(() => {
    const panel = document.querySelector('.zz-panel[data-panel="more"]');
    return panel?.classList.contains('is-active') && !!document.getElementById('zz-more')?.children.length;
  });
  assert(moreVisible, 'pestana Mas con contenido');

  await page.click('#zz-tab-map');
  await page.waitForTimeout(100);

  await page.click('#zz-save');
  await page.waitForTimeout(500);
  const saved = await page.locator('#zz-save-state').innerText();
  assert(/Guardado/i.test(saved), 'guardado: ' + saved);

  // Desktop viewport smoke
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(200);
  const deskPeople = await page.locator('.zz-person:not(.is-dead)').count();
  assert(deskPeople >= 1, 'desktop sigue jugable: ' + deskPeople);

  assert(errors.length === 0, 'sin errores de página: ' + errors.join(' | '));
} finally {
  await browser.close();
  server.close();
}

if (fails) {
  console.error('UI E2E FALLÓ', fails);
  process.exit(1);
}
console.log('UI E2E OK (móvil 390×844 + desktop)');
