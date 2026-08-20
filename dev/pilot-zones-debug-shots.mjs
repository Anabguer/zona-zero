/**
 * Capturas DEBUG zonas canónicas v3
 * Uso: node dev/pilot-zones-debug-shots.mjs [baseUrl]
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dir, '..');
const OUT = path.join(ROOT, 'docs', 'review');
const BASE = process.argv[2] || 'http://127.0.0.1:9876';
const URL = `${BASE}/pilot-zones-debug.html`;

async function maybeStartServer() {
  try {
    const r = await fetch(`${BASE}/pilot-zones-debug.html`);
    if (r.ok) return null;
  } catch {}
  const port = 9876;
  const child = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', ROOT], {
    cwd: ROOT, stdio: 'ignore', shell: true,
  });
  await new Promise((r) => setTimeout(r, 900));
  return child;
}

async function main() {
  const { chromium } = await import('playwright');
  await mkdir(OUT, { recursive: true });
  const server = await maybeStartServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.getElementById('hud-meta')?.textContent?.includes('cellPx 24'));
  await page.waitForTimeout(500);

  await page.click('#btn-fit');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'zones-canonical-v3-full.png') });

  await page.click('#btn-focus-forest');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'zones-canonical-v3-forest-dest.png') });

  await page.click('#btn-focus-scrap');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'zones-canonical-v3-scrap-dest.png') });

  await browser.close();
  if (server) server.kill();
  console.log('OK shots in docs/review/');
}

main().catch((e) => { console.error(e); process.exit(1); });
