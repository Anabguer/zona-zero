/**
 * PT1-A AFTER — medidas viewport landscape + capturas (post Compact B / PWA / logo-first).
 * node scripts/audit-mobile-viewport.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'docs', 'review-mobile-pt1a');
mkdirSync(outDir, { recursive: true });

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

function serve() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let path = decodeURIComponent(new URL(req.url || '/', 'http://x').pathname);
      if (path === '/' || path === '/play') path = '/dev/harness-zz.html';
      if (path === '/hub') path = '/dev/hub-empty.html';
      const file = join(root, path.replace(/^\//, '').split('?')[0]);
      if (!existsSync(file)) {
        res.writeHead(404);
        res.end('missing ' + path);
        return;
      }
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'text/plain' });
      res.end(readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

async function measure(page) {
  return page.evaluate(() => {
    const vv = window.visualViewport;
    const hud = document.getElementById('zz-hud');
    const dock = document.querySelector('.zz-world-dock');
    const coach = document.getElementById('zz-coach');
    const map = document.getElementById('zz-map-wrap');
    const box = (el) => {
      if (!el) return null;
      if (el.hidden || getComputedStyle(el).display === 'none') return null;
      const r = el.getBoundingClientRect();
      if (r.height < 1 && r.width < 1) return null;
      return {
        h: Math.round(r.height * 10) / 10,
        w: Math.round(r.width * 10) / 10,
        top: Math.round(r.top * 10) / 10,
        bottom: Math.round(r.bottom * 10) / 10,
      };
    };
    const ih = window.innerHeight;
    const iw = window.innerWidth;
    const hudB = box(hud);
    const dockB = box(dock);
    const coachB = box(coach);
    const mapB = box(map);
    const chromeOwn = (hudB?.h || 0) + (dockB?.h || 0);
    const worldFree = Math.max(0, ih - chromeOwn);
    const topRow = document.querySelector('.zz-hud__row--top');
    const topRowHidden =
      !topRow || getComputedStyle(topRow).display === 'none' || topRow.offsetParent === null;
    return {
      inner: { w: iw, h: ih },
      visualViewport: vv
        ? { w: Math.round(vv.width), h: Math.round(vv.height), offsetTop: vv.offsetTop }
        : null,
      hud: hudB,
      dock: dockB,
      mapWrap: mapB,
      coach: coachB,
      chromeOwnPx: Math.round(chromeOwn * 10) / 10,
      chromeOwnPct: ih ? Math.round((chromeOwn / ih) * 1000) / 10 : null,
      worldFreePx: Math.round(worldFree * 10) / 10,
      worldUsableEstimate: ih ? Math.round((worldFree / ih) * 1000) / 10 : null,
      topRowHidden,
      dayChipVisible: (() => {
        const c = document.getElementById('zz-day-chip');
        if (!c) return false;
        const cs = getComputedStyle(c);
        return cs.display !== 'none' && c.getBoundingClientRect().height > 0;
      })(),
      title: document.title,
      dockLabels: dock
        ? [...dock.querySelectorAll('button:not([hidden])')].map(
            (b) => b.getAttribute('aria-label') || b.textContent.replace(/\s+/g, ' ').trim()
          )
        : [],
    };
  });
}

const { server, port } = await serve();
const base = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({ headless: true });

const sizes = {
  '844x390': { width: 844, height: 390 },
  '800x360': { width: 800, height: 360 },
  '740x360': { width: 740, height: 360 },
};

const results = {
  session: 'PT1-A-AFTER',
  before_reference: {
    note: 'Medidas BEFORE (producción previa Compact B)',
    '800x360': { hud_h: 77.5, dock_h: 53.3, chromeOwnPct: 36.3 },
    '844x390': { hud_h: 77.5, dock_h: 53.3, chromeOwnPct: 33.5 },
  },
};

async function runShot(name, urlPath, size, waitMs = 900) {
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: 2 });
  await page.goto(`${base}${urlPath}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const isHub = urlPath.includes('hub');
  if (isHub) {
    await page
      .waitForFunction(
        () => {
          const hub = document.getElementById('zz-hub');
          const boot = document.getElementById('zz-hub-boot');
          const logo = document.querySelector('.zz-hub__logo');
          return (
            logo ||
            (hub && hub.hidden === false) ||
            (boot && /Error/i.test(boot.textContent || ''))
          );
        },
        null,
        { timeout: 45000 }
      )
      .catch(() => {});
  } else {
    await page.waitForFunction(() => window.__zzOk === true || window.__zzErr, null, {
      timeout: 60000,
    });
    const err = await page.evaluate(() => window.__zzErr || null);
    if (err) throw new Error('boot fail: ' + err);
    // Coach visible for measure
    await page.evaluate(() => {
      const coach = document.getElementById('zz-coach');
      const text = document.getElementById('zz-coach-text');
      if (coach && text) {
        coach.hidden = false;
        text.textContent = 'Colocá un huerto cerca del refugio para producir comida.';
      }
    });
  }
  await page.waitForTimeout(waitMs);
  const m = await measure(page);
  await page.screenshot({ path: join(outDir, name), fullPage: false });
  await page.close();
  return m;
}

for (const [key, size] of Object.entries(sizes)) {
  results[`after_${key}`] = await runShot(`10-after-world-${key}.png`, '/dev/harness-zz.html', size);
  results[`after_coach_${key}`] = await runShot(
    `11-after-coach-${key}.png`,
    '/dev/harness-zz.html',
    size,
    700
  );
}

results.hub_logo_first = await runShot('12-hub-logo-first.png', '/dev/hub-empty.html', sizes['844x390'], 700);

// Manifest sanity (local file)
const manifest = JSON.parse(readFileSync(join(root, 'manifest.webmanifest'), 'utf8'));
results.manifest = {
  display: manifest.display,
  orientation: manifest.orientation,
  start_url: manifest.start_url,
  scope: manifest.scope,
  icons: (manifest.icons || []).map((i) => i.sizes),
};

writeFileSync(join(outDir, 'MEASUREMENTS_AFTER.json'), JSON.stringify(results, null, 2));

const a800 = results.after_800x360;
const summary = {
  before_800x360_chromePct: 36.3,
  after_800x360_chromePct: a800?.chromeOwnPct,
  after_800x360_hud: a800?.hud?.h,
  after_800x360_dock: a800?.dock?.h,
  after_800x360_worldPct: a800?.worldUsableEstimate,
  topRowHidden: a800?.topRowHidden,
  targetChromePctIdeal: 25,
  passIdeal: a800?.chromeOwnPct != null && a800.chromeOwnPct <= 25,
};

writeFileSync(
  join(outDir, 'README.txt'),
  [
    'PT1-A AFTER — Compact B + PWA + logo-first',
    'BEFORE shots: 01/02-before-*.png (conservados)',
    'AFTER shots: 10-after-world-*.png, 11-after-coach-*.png, 12-hub-logo-first.png',
    '',
    JSON.stringify(summary, null, 2),
  ].join('\n')
);

console.log(JSON.stringify({ summary, after_800x360: a800, after_740x360: results.after_740x360 }, null, 2));
await browser.close();
server.close();
console.log('Wrote', outDir);
