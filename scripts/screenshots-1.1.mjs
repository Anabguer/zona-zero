/**
 * Screenshots de revisión visual 1.1
 * node scripts/screenshots-1.1.mjs
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
    spawnSync('npx', ['playwright', 'install', 'chromium'], { cwd: root, shell: true, stdio: 'inherit' });
    return await import(pathToFileURL(join(root, 'node_modules/playwright/index.mjs')).href);
  }
}

const { server, port } = await serve();
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ headless: true });
const shots = [];

async function shot(page, name) {
  const file = join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  shots.push(name);
  console.log('SHOT', name);
}

async function dismissOverlays(page) {
  for (let i = 0; i < 3; i++) {
    const choice = page.locator('#zz-choice-modal:not([hidden])');
    if (await choice.count()) {
      const btn = page.locator('#zz-choice-actions button').first();
      if (await btn.count()) await btn.click();
      await page.waitForTimeout(150);
    }
    await page.evaluate(() => {
      const ec = document.getElementById('zz-event-card');
      if (ec) ec.hidden = true;
      const ac = document.getElementById('zz-attack-card');
      if (ac) ac.hidden = true;
      const coach = document.getElementById('zz-coach-dismiss');
      if (coach) coach.click();
    });
  }
}

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => console.error('PAGEERROR', e.message));
  await page.goto(`http://127.0.0.1:${port}/dev/harness.html`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => window.__zzOk === true || window.__zzOk === false, null, { timeout: 30000 });
  const err = await page.evaluate(() => window.__zzErr || null);
  if (err) throw new Error('boot fail: ' + err);
  await page.waitForFunction(() => !!window.__zz, null, { timeout: 10000 });

  await dismissOverlays(page);

  await page.click('#zz-tab-people');
  await page.waitForTimeout(250);
  await shot(page, '01-mobile-gente');

  await page.click('#zz-tab-map');
  await dismissOverlays(page);
  await page.waitForTimeout(350);
  await shot(page, '02-mobile-mapa-dia1');

  await page.click('#zz-tab-base');
  await page.waitForTimeout(300);
  await shot(page, '03-mobile-base-dia1');

  // Construcción ANTES de expedición (gente libre)
  await page.click('#zz-tab-base');
  await page.evaluate(() => {
    window.__zz.grant({ wood: 40, metal: 30, food: 10 });
  });
  const farmBtn = page.locator('[data-build="farm"]');
  if (await farmBtn.count()) {
    await farmBtn.click();
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      const r = window.__zz.place('farm', 0, 2);
      console.log('place farm', r);
      const r2 = window.__zz.place('well', 4, 2);
      console.log('place well', r2);
      window.__zz.place('shelter', 1, 3);
    });
    await page.waitForTimeout(300);
  }
  await shot(page, '05-mobile-construccion');

  // Expedición
  await page.click('#zz-tab-people');
  const suggest = page.locator('button', { hasText: 'Sugerir' });
  if (await suggest.count()) await suggest.click();
  await page.click('#zz-tab-map');
  await dismissOverlays(page);
  const send = page.locator('#zz-send-exp');
  if (await send.count()) {
    await send.click();
    await page.waitForTimeout(400);
  }
  await shot(page, '04-mobile-expedicion');

  await page.click('#zz-tab-progress');
  await page.waitForTimeout(250);
  await shot(page, '06-mobile-progreso');

  await page.click('#zz-tab-more');
  await page.waitForTimeout(250);
  await shot(page, '07-mobile-investigacion');

  // Avanzar días + dismiss
  await page.click('#zz-tab-map');
  for (let i = 0; i < 6; i++) {
    await dismissOverlays(page);
    await page.click('#zz-advance');
    await page.waitForTimeout(160);
    await dismissOverlays(page);
  }

  // Colonia desarrollada + mapa revelado
  await page.evaluate(() => {
    window.__zz.seedColony();
    window.__zz.discoverAll();
    window.__zz.controlNear();
  });
  await page.waitForTimeout(400);
  await page.click('#zz-tab-map');
  await dismissOverlays(page);
  await shot(page, '08-mobile-mapa-desarrollado');

  await page.click('#zz-tab-base');
  await page.waitForTimeout(300);
  await shot(page, '09-mobile-base-desarrollada');

  // Evento relevante forzado
  await page.evaluate(() => {
    const card = document.getElementById('zz-event-card');
    if (!card) return;
    card.className = 'zz-event-card zz-event--loot';
    card.innerHTML =
      '<div class="zz-event-card__head"><strong>Almacén forzado</strong></div><p>Durante la noche alguien forzó el almacén. Faltan varias cajas.</p><p class="zz-event-fx"><strong>−3 comida</strong></p>';
    card.hidden = false;
  });
  await shot(page, '10-mobile-evento');

  await page.evaluate(() => {
    const card = document.getElementById('zz-attack-card');
    if (!card) return;
    card.className = 'zz-attack-card zz-attack-card--messy';
    card.innerHTML =
      '<strong>Ataque contenido</strong><p>Oleada en el perímetro. Defensa 18 vs fuerza 14. −1 herido, barricada dañada.</p>';
    card.hidden = false;
  });
  await page.click('#zz-tab-map');
  await page.waitForTimeout(200);
  await shot(page, '10b-mobile-ataque');

  // Desktop
  await page.evaluate(() => {
    const ec = document.getElementById('zz-event-card');
    if (ec) ec.hidden = true;
    const ac = document.getElementById('zz-attack-card');
    if (ac) ac.hidden = true;
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.click('#zz-tab-map');
  await page.waitForTimeout(350);
  await shot(page, '11-desktop-mapa');
  await page.click('#zz-tab-base');
  await page.waitForTimeout(300);
  await shot(page, '12-desktop-base');
  await page.click('#zz-tab-people');
  await page.waitForTimeout(300);
  await shot(page, '13-desktop-gente');

  writeFileSync(join(outDir, 'INDEX.txt'), shots.join('\n') + '\n');
  console.log('DONE', shots.length, 'shots in', outDir);
} finally {
  await browser.close();
  server.close();
}
