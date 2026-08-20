import { createServer } from 'http';
import { existsSync, mkdirSync, createReadStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'docs', 'review', 'qa-neni');
mkdirSync(outDir, { recursive: true });
const mime = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml' };
function serve(port) {
  const server = createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath === '/') urlPath = '/qa-harness.html';
    const file = path.join(root, urlPath.replace(/^\//, ''));
    if (!file.startsWith(root) || !existsSync(file)) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(port, '127.0.0.1', () => r(server)));
}
async function main() {
  const server = await serve(9877);
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => { if (m.type()==='error') console.error('CONS', m.text()); });
  await page.goto('http://127.0.0.1:9877/qa-harness.html', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForFunction(() => window.__zzQaReady === true, null, { timeout: 90000 });
  await page.waitForTimeout(800);

  await page.click('#zz-open-build');
  await page.waitForSelector('.zz-build-section', { timeout: 15000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, '01-build-menu.png') });
  await page.click('#zz-sheet-close');
  await page.waitForTimeout(200);

  const dbg = await page.evaluate(() => {
    const st = window.__zz.getState();
    return {
      qa: st.flags.pilotQaMode,
      test: st.flags.pilotTestMode,
      base: { w: st.base.w, h: st.base.h },
      hq: st.base.buildings.find((b) => String(b.type).startsWith('hq_')),
      food: st.resources.food,
      types: Object.keys(st.base),
    };
  });
  console.log('state', JSON.stringify(dbg));

  const placed = await page.evaluate(async () => {
    const st = window.__zz.getState();
    const content = window.__zz.getContent();
    const { placeBuilding } = await import('./js/sim.js');
    const { ghostPlacementOk } = await import('./js/build-place.js');
    const picks = [
      ['house', 1, 1], ['well', 14, 8], ['storage', 3, 10], ['workshop', 16, 12],
      ['farm', 10, 14], ['cistern', 18, 6], ['kitchen', 20, 10], ['radio', 6, 14],
    ];
    const out = [];
    for (const [type, x, y] of picks) {
      const check = ghostPlacementOk(st, content, type, x, y);
      const r = placeBuilding(st, content, type, x, y);
      out.push({ type, x, y, check, r });
    }
    window.__zz.paint();
    return out;
  });
  console.log(JSON.stringify(placed, null, 2));

  await page.evaluate(() => {
    const st = window.__zz.getState();
    const camp = st.zones.find((z) => z.type === 'camp');
    if (camp && st.mapCamera) {
      st.mapCamera.x = camp.x; st.mapCamera.y = camp.y; st.mapCamera.zoom = 2.4;
    }
    window.__zz.paint();
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(outDir, '02-colony-buildings.png') });
  await browser.close();
  server.close();
  console.log('OK', outDir);
}
main().catch((e) => { console.error(e); process.exit(1); });

