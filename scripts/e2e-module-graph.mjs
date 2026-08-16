/**
 * Regression P0-002 — grafo ES modules real en navegador (no solo HTTP 200).
 *
 * Falla si aparece:
 *   "does not provide an export named ..."
 *   Failed to fetch dynamically imported module
 *   cualquier pageerror de resolución de módulos
 *
 * Con ZZ_EMAIL/ZZ_PASSWORD: además boot autenticado en prod.
 *
 *   node scripts/e2e-module-graph.mjs
 *   ZZ_EMAIL=... ZZ_PASSWORD=... node scripts/e2e-module-graph.mjs
 */
import { chromium } from 'playwright';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { extname } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const email = process.env.ZZ_EMAIL || '';
const password = process.env.ZZ_PASSWORD || '';
const prodBase = (process.env.ZZ_BASE || 'https://intocables13.com/juegos/zona-zero/').replace(/\/?$/, '/');

const BLOCKING =
  /does not provide an export named|Failed to fetch dynamically imported module|SyntaxError: The requested module/i;

function assertSimReexports() {
  const sim = readFileSync(join(root, 'js', 'sim.js'), 'utf8');
  const colony = readFileSync(join(root, 'js', 'colony.js'), 'utf8');
  if (!/export function adjustBuildingWorkers/.test(colony)) {
    throw new Error('colony.js debe definir adjustBuildingWorkers');
  }
  if (!/export \{[^}]*adjustBuildingWorkers/.test(sim)) {
    throw new Error('sim.js debe re-exportar adjustBuildingWorkers');
  }
  const main = readFileSync(join(root, 'js', 'main.js'), 'utf8');
  if (!/adjustBuildingWorkers/.test(main)) {
    throw new Error('main.js debe importar adjustBuildingWorkers');
  }
  const assets = readFileSync(join(root, 'includes', 'zz-assets.php'), 'utf8');
  if (!/ZZ_ASSET_V/.test(assets) || !/zz_print_js_importmap/.test(assets)) {
    throw new Error('zz-assets.php debe definir importmap versionado');
  }
  console.log('OK contrato adjustBuildingWorkers + importmap');
}

assertSimReexports();

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.php': 'text/plain',
};

function buildImportMap(origin) {
  const imports = {};
  for (const name of readdirSync(join(root, 'js')).filter((f) => f.endsWith('.js'))) {
    const abs = `${origin}/js/${name}`;
    imports[abs] = `${abs}?v=testgraph`;
  }
  return { imports };
}

async function serveLocal() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const u = new URL(req.url || '/', 'http://x');
      let path = decodeURIComponent(u.pathname);
      if (path === '/' || path === '/graph.html') {
        const origin = `http://127.0.0.1:${server.address().port}`;
        const map = buildImportMap(origin);
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<script type="importmap">${JSON.stringify(map)}</script>
</head><body>
<script type="module">
window.__graph = { stage: 'start' };
try {
  const m = await import('./js/main.js?v=testgraph');
  window.__graph.stage = 'imported';
  window.__graph.hasBootHub = typeof m.bootHub;
  window.__graph.hasBootGame = typeof m.bootGame;
  // Contrato crítico P0-002
  const sim = await import('./js/sim.js?v=testgraph');
  window.__graph.hasAdjust = typeof sim.adjustBuildingWorkers;
  window.__graph.ok = window.__graph.hasBootHub === 'function' && window.__graph.hasAdjust === 'function';
} catch (e) {
  window.__graph.ok = false;
  window.__graph.err = String(e && e.message || e);
  window.__graph.stack = String(e && e.stack || '');
}
</script></body></html>`;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }
      const file = join(root, path.replace(/^\//, '').split('?')[0]);
      try {
        const body = readFileSync(file);
        res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end('missing');
      }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const server = await serveLocal();
const port = server.address().port;
const browser = await chromium.launch({ headless: true });

const errors = [];
const page = await browser.newPage();
page.on('pageerror', (e) => errors.push('pageerror:' + String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console:' + m.text());
});

await page.goto(`http://127.0.0.1:${port}/graph.html`, { waitUntil: 'networkidle', timeout: 60000 });
let graph = null;
for (let i = 0; i < 80; i++) {
  graph = await page.evaluate(() => window.__graph || null);
  if (graph && (graph.ok === true || graph.ok === false)) break;
  await page.waitForTimeout(100);
}

const blocking = errors.filter((e) => BLOCKING.test(e));
if (graph?.err && BLOCKING.test(graph.err)) blocking.push(graph.err);

console.log(JSON.stringify({ localGraph: graph, blocking, errors: errors.slice(0, 15) }, null, 2));

if (!graph?.ok || blocking.length) {
  await browser.close();
  server.close();
  console.error('FAIL grafo local');
  process.exit(1);
}
console.log('OK grafo local (import real + adjustBuildingWorkers)');

// Prod autenticado opcional
if (email && password) {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
  const p = await ctx.newPage();
  const prodErrors = [];
  p.on('pageerror', (e) => prodErrors.push(String(e)));
  p.on('console', (m) => {
    if (m.type() === 'error') prodErrors.push('console:' + m.text());
  });
  const seenJs = [];
  p.on('response', (r) => {
    if (r.url().includes('/js/') && r.url().includes('.js')) {
      seenJs.push({ url: r.url(), status: r.status() });
    }
  });

  await p.goto(new URL('/login.php', prodBase).href, { waitUntil: 'domcontentloaded' });
  const login = await p.evaluate(async ({ email, password }) => {
    const fd = new FormData();
    fd.append('email', email);
    fd.append('password', password);
    fd.append('remember', '1');
    const res = await fetch('/api/auth.php', { method: 'POST', body: fd, credentials: 'same-origin' });
    return res.json();
  }, { email, password });
  if (!login.success) {
    console.error('FAIL login prod', login);
    process.exit(1);
  }

  await p.goto(prodBase, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForFunction(() => {
    const boot = document.getElementById('zz-hub-boot');
    const hub = document.getElementById('zz-hub');
    const err = boot && /Error al cargar|does not provide an export/i.test(boot.textContent || '');
    const ok = boot && boot.hidden === true && hub && hub.hidden === false;
    return ok || err;
  }, null, { timeout: 30000 });

  const state = await p.evaluate(() => {
    const boot = document.getElementById('zz-hub-boot');
    const hub = document.getElementById('zz-hub');
    const map = document.querySelector('script[type="importmap"]');
    let importmapHasSim = false;
    try {
      const j = JSON.parse(map?.textContent || '{}');
      importmapHasSim = Object.keys(j.imports || {}).some((k) => k.includes('/js/sim.js'));
    } catch (_) {}
    return {
      bootHidden: boot?.hidden,
      hubHidden: hub?.hidden,
      bootText: boot?.textContent?.trim()?.slice(0, 120),
      actions: document.getElementById('zz-hub-actions')?.textContent?.trim()?.slice(0, 80),
      importmapHasSim,
    };
  });

  const prodBlocking = prodErrors.filter((e) => BLOCKING.test(e));
  const versioned = seenJs.filter((x) => /\?v=\d+/.test(x.url));
  console.log(
    JSON.stringify(
      { prodState: state, prodBlocking, jsSample: seenJs.slice(0, 8), versionedCount: versioned.length },
      null,
      2
    )
  );

  if (
    !state.bootHidden ||
    state.hubHidden ||
    /Error al cargar|does not provide an export/i.test(state.bootText || '') ||
    prodBlocking.length ||
    !state.importmapHasSim ||
    versioned.length < 5
  ) {
    await browser.close();
    server.close();
    console.error('FAIL grafo/prod autenticado');
    process.exit(1);
  }
  console.log('OK grafo prod autenticado (importmap + boot)');
  await ctx.close();
}

await browser.close();
server.close();
console.log('PASS e2e-module-graph');
