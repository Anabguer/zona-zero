/**
 * Capturas prueba final escala grid — demo-neni.html
 * Uso: node dev/demo-neni-scale-screenshots.mjs [baseUrl]
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dir, '..');
const OUT = path.join(ROOT, 'docs', 'review');
const BASE = process.argv[2] || 'http://127.0.0.1:9876';
const DEMO = `${BASE}/demo-neni.html?review=scale-final`;

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
  const page = await browser.newPage();

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(DEMO, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  await page.screenshot({
    path: path.join(OUT, 'scale-review-general.png'),
    fullPage: false,
  });

  // Acercar al cluster coche+casa (cámara Neni + zoom extra)
  await page.evaluate(() => {
    window.__neniDemo.applyReviewDefaults();
    const st = window.__neniDemo.getState();
    // zoom un poco más para comparación persona/coche/edificios
    document.getElementById('viewport').dispatchEvent(new Event('resize'));
  });
  await page.evaluate(() => {
    const cam = { x: 910, y: 433, zoom: 1.35 };
    // acceso directo vía applyReviewDefaults ya hecho; subir zoom manualmente
    const ev = new WheelEvent('wheel', { deltaY: -200, clientX: 683, clientY: 384, bubbles: true });
    document.getElementById('viewport').dispatchEvent(ev);
  });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(OUT, 'scale-review-close-car-house-hq.png'),
    fullPage: false,
  });

  await browser.close();
  if (server) server.kill();
  console.log('Capturas en docs/review/: scale-review-general.png, scale-review-close-car-house-hq.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
