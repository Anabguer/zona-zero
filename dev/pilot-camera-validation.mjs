/**
 * Validación P0 cámara piloto Neni — capturas A–G por viewport.
 * Uso: node dev/pilot-camera-validation.mjs [baseUrl]
 * Requiere: npx playwright (se instala bajo demanda).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dir, '..');
const OUT = path.join(ROOT, 'docs', 'review', 'pilot-camera-p0');
const BASE = process.argv[2] || 'http://127.0.0.1:8765';

const VIEWPORTS = [
  { id: '740x360', w: 740, h: 360 },
  { id: '844x390', w: 844, h: 390 },
  { id: '932x430', w: 932, h: 430 },
  { id: 'desktop', w: 1366, h: 768 },
];

async function ensurePlaywright() {
  const { chromium } = await import('playwright');
  return chromium;
}

async function maybeStartServer() {
  if (!BASE.includes('127.0.0.1') && !BASE.includes('localhost')) return null;
  const port = Number(new URL(BASE).port || 8765);
  const child = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', ROOT], {
    cwd: ROOT,
    stdio: 'ignore',
    shell: true,
  });
  await new Promise((r) => setTimeout(r, 800));
  return child;
}

async function evalCamera(page) {
  return page.evaluate(() => {
    const svg = document.getElementById('zz-map');
    const st = window.__zz?.getState?.();
    const rect = svg?.getBoundingClientRect?.();
    const vb = svg?.getAttribute('viewBox')?.split(/\s+/).map(Number) || [];
    return {
      viewBox: vb,
      cam: window.__zz?.getState?.()?.mapCamera ? { ...window.__zz.getState().mapCamera } : null,
      svgPx: rect ? { w: rect.width, h: rect.height } : null,
      world: { w: Number(svg?.dataset?.zzWorldW), h: Number(svg?.dataset?.zzWorldH) },
    };
  });
}

async function panToExtreme(page, dir) {
  await page.evaluate(async (direction) => {
    const st = window.__zz?.getState?.();
    const pan = window.__zz?.panBy;
    const clamp = window.__zz?.clampCam;
    if (!st?.mapCamera || !pan) return;
    for (let i = 0; i < 80; i++) {
      const dx = direction === 'left' ? -120 : direction === 'right' ? 120 : 0;
      const dy = direction === 'up' ? -120 : direction === 'down' ? 120 : 0;
      pan(dx, dy);
    }
    clamp?.();
    window.__zz?.paint?.();
  }, dir);
  await page.waitForTimeout(200);
}

async function setZoom(page, mode) {
  await page.evaluate((m) => {
    const st = window.__zz?.getState?.();
    const zoomBy = window.__zz?.zoomBy;
    const clamp = window.__zz?.clampCam;
    if (!st?.mapCamera) return;
    if (m === 'min') {
      const svg = document.getElementById('zz-map');
      const dims = { w: Number(svg?.dataset?.zzWorldW), h: Number(svg?.dataset?.zzWorldH) };
      const r = svg?.getBoundingClientRect?.();
      if (r && dims.w && dims.h) {
        st.mapCamera.zoom = Math.max(r.width / dims.w, r.height / dims.h);
        st.mapCamera.x = dims.w / 2;
        st.mapCamera.y = dims.h / 2;
      }
    } else {
      for (let i = 0; i < 24; i++) zoomBy?.(1.15);
    }
    clamp?.();
    window.__zz?.paint?.();
  }, mode);
  await page.waitForTimeout(200);
}

async function countBlackInMapWrap(page) {
  return page.evaluate(() => {
    const wrap = document.querySelector('.zz-world-map-wrap');
    const svg = document.getElementById('zz-map');
    if (!wrap || !svg) return { error: 'no wrap/svg' };
    const wr = wrap.getBoundingClientRect();
    const sr = svg.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(wr.width);
    canvas.height = Math.round(wr.height);
    const ctx = canvas.getContext('2d');
    // Aproximación: muestreo de píxeles del SVG renderizado vía foreignObject no trivial.
    // Marcamos negro si el fondo del wrap (#0c0e10) domina bordes exteriores del SVG.
    const dark = (r, g, b) => r < 30 && g < 30 && b < 35;
    let blackSamples = 0;
    let total = 0;
    const img = svg;
    const vb = svg.getAttribute('viewBox')?.split(/\s+/).map(Number) || [];
    if (vb.length === 4) {
      const [vx, vy, vw, vh] = vb;
      const worldW = Number(svg.dataset.zzWorldW);
      const worldH = Number(svg.dataset.zzWorldH);
      const outside =
        vx < -0.5 || vy < -0.5 || vx + vw > worldW + 0.5 || vy + vh > worldH + 0.5;
      return { outsideViewBox: outside, viewBox: vb, worldW, worldH };
    }
    return { blackSamples, total };
  });
}

async function run() {
  await mkdir(OUT, { recursive: true });
  const server = await maybeStartServer();
  let chromium;
  try {
    chromium = await ensurePlaywright();
  } catch (e) {
    console.error('Instala playwright: npx playwright install chromium');
    throw e;
  }

  const browser = await chromium.launch({ headless: true });
  const report = [];

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    const url = `${BASE}/play.php?pilot=neni&new=1&clear=1`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('#zz-map', { timeout: 30000 });
    await page.waitForTimeout(1500);

    const shots = [
      ['A-d1-inicial', async () => {}],
      ['B-pan-left', async () => panToExtreme(page, 'left')],
      ['C-pan-right', async () => panToExtreme(page, 'right')],
      ['D-pan-up', async () => panToExtreme(page, 'up')],
      ['E-pan-down', async () => panToExtreme(page, 'down')],
      ['F-zoom-min', async () => setZoom(page, 'min')],
      ['G-zoom-max', async () => setZoom(page, 'max')],
    ];

    for (const [label, setup] of shots) {
      if (label !== 'A-d1-inicial') {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('#zz-map', { timeout: 30000 });
        await page.waitForTimeout(800);
      }
      await setup();
      const meta = await evalCamera(page);
      const black = await countBlackInMapWrap(page);
      const file = `${vp.id}-${label}.png`;
      const wrap = page.locator('.zz-world-map-wrap');
      await wrap.screenshot({ path: path.join(OUT, file) });
      report.push({ viewport: vp.id, shot: label, file, meta, black });
      console.log(`OK ${file}`, black.outsideViewBox === false ? 'in-bounds' : 'OUT-OF-BOUNDS');
    }
    await ctx.close();
  }

  await browser.close();
  if (server) server.kill();
  const reportPath = path.join(OUT, 'report.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport: ${reportPath}`);
  console.log(`Capturas: ${OUT}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
