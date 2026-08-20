/**
 * Self-test editor zonas v3 — extremos, persistencia, export/import, destinos.
 * Uso: node dev/pilot-zone-editor-selftest.mjs [baseUrl]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dir, '..');
const OUT = path.join(ROOT, 'docs', 'review');
const BASE = process.argv[2] || 'http://127.0.0.1:9876';
const EDITOR = `${BASE}/pilot-zone-editor.html?selftest=1&nocache=${Date.now()}`;

async function maybeStartServer() {
  if (!BASE.includes('127.0.0.1') && !BASE.includes('localhost')) return null;
  const port = Number(new URL(BASE).port || 9876);
  const child = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', ROOT], {
    cwd: ROOT,
    stdio: 'ignore',
    shell: true,
  });
  await new Promise((r) => setTimeout(r, 900));
  return child;
}

async function main() {
  const { chromium } = await import('playwright');
  await mkdir(OUT, { recursive: true });
  const server = await maybeStartServer();
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(EDITOR, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__zoneEditor?.GRID?.columns === 76);

  const grid = await page.evaluate(() => window.__zoneEditor.GRID);
  console.log('Grid:', `${grid.columns}×${grid.rows} = ${grid.columns * grid.rows} celdas`);
  console.log('Bounds:', grid);

  // Limpiar v3 previo del test
  await page.evaluate(() => {
    localStorage.removeItem('neni-pilot-zone-map-v3');
    window.__zoneEditor.setOverrides({});
  });

  // Pintar extremos + bosque/chatarra interior
  const painted = await page.evaluate(() => {
    const G = window.__zoneEditor.GRID;
    const marks = [
      { cx: G.minX, cy: G.minY, sem: 'blocked', label: 'left-top' },
      { cx: G.maxX, cy: G.minY, sem: 'blocked', label: 'right-top' },
      { cx: G.minX, cy: G.maxY, sem: 'forest', label: 'left-bottom' },
      { cx: G.maxX, cy: G.maxY, sem: 'scrap', label: 'right-bottom' },
      { cx: 0, cy: 0, sem: 'forest', label: 'center-forest' },
      { cx: 5, cy: 5, sem: 'scrap', label: 'center-scrap' },
    ];
    marks.forEach(({ cx, cy, sem }) => {
      window.__zoneEditor.paintCell(cx, cy, sem);
      window.__zoneEditor.paintCell(cx + 1, cy, sem);
      window.__zoneEditor.paintCell(cx, cy + 1, sem);
    });
    window.__zoneEditor.saveLocal(true);
    return marks;
  });

  await page.evaluate(() => window.__zoneEditor.saveLocal(true));
  const beforeReload = await page.evaluate(() => window.__zoneEditor.getState());

  // Recargar y verificar persistencia
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__zoneEditor?.getState()?.cells);
  const afterReload = await page.evaluate(() => window.__zoneEditor.getState());

  const checks = [];
  checks.push(['cellPx=24', afterReload.grid.cellPx === 24]);
  checks.push(['total celdas 2812', Object.keys(afterReload.cells).length === 2812]);
  checks.push(['default buildable', afterReload.defaultSemantic === 'buildable']);
  checks.push(['persiste blocked left-top', afterReload.cells[`${grid.minX},${grid.minY}`]?.semantic === 'blocked']);
  checks.push(['persiste scrap right-bottom', afterReload.cells[`${grid.maxX},${grid.maxY}`]?.semantic === 'scrap']);
  checks.push(['forest buildable false', afterReload.cells[`${grid.minX},${grid.maxY}`]?.buildable === false]);
  checks.push(['scrap buildable false', afterReload.cells[`${grid.maxX},${grid.maxY}`]?.buildable === false]);
  checks.push(['destinos forest>=1', Object.values(afterReload.destinations).some(d => d.semantic === 'forest')]);
  checks.push(['destinos scrap>=1', Object.values(afterReload.destinations).some(d => d.semantic === 'scrap')]);
  checks.push(['centroidWorld presente', Object.values(afterReload.destinations).every(d => d.centroidWorld?.length === 2)]);

  // Export → limpiar → import
  const exportJson = JSON.stringify(afterReload);
  await page.evaluate(() => window.__zoneEditor.setOverrides({}));
  await page.evaluate((json) => window.__zoneEditor.loadPayload(JSON.parse(json)), exportJson);
  const afterImport = await page.evaluate(() => window.__zoneEditor.getState());
  checks.push(['import restaura overrides', Object.keys(afterImport.overrides).length === Object.keys(afterReload.overrides).length]);
  checks.push(['import destinos iguales', Object.keys(afterImport.destinations).length === Object.keys(afterReload.destinations).length]);

  // Captura mapa completo con grid
  await page.click('#btn-fit');
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(OUT, 'zone-editor-v3-full-grid-24px.png'),
    fullPage: false,
  });

  const report = {
    ok: checks.every(([, v]) => v),
    grid: `${grid.columns}×${grid.rows}`,
    totalCells: grid.columns * grid.rows,
    checks: Object.fromEntries(checks),
    destinations: Object.keys(afterImport.destinations),
    painted,
  };
  await writeFile(path.join(OUT, 'zone-editor-v3-selftest.json'), JSON.stringify(report, null, 2));

  console.log('\nSelf-test:', report.ok ? 'PASS' : 'FAIL');
  checks.forEach(([name, ok]) => console.log(`  ${ok ? '✓' : '✗'} ${name}`));
  console.log('Destinos:', report.destinations.join(', '));

  await browser.close();
  if (server) server.kill();

  if (!report.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
