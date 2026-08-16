/**
 * Medidas AFTER en producción autenticada (landscape 800×360).
 * ZZ_EMAIL ZZ_PASSWORD node scripts/measure-prod-viewport.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs', 'review-mobile-pt1a');
mkdirSync(out, { recursive: true });
const email = process.env.ZZ_EMAIL || '';
const password = process.env.ZZ_PASSWORD || '';
const base = (process.env.ZZ_BASE || 'https://intocables13.com/juegos/zona-zero/').replace(/\/?$/, '/');
const origin = new URL(base).origin;

if (!email || !password) {
  console.error('FAIL: ZZ_EMAIL / ZZ_PASSWORD');
  process.exit(2);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 800, height: 360 },
  deviceScaleFactor: 2,
  userAgent:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
});

await page.goto(`${origin}/login.php`, { waitUntil: 'domcontentloaded', timeout: 60000 });
const login = await page.evaluate(
  async ({ email, password }) => {
    const fd = new FormData();
    fd.append('email', email);
    fd.append('password', password);
    fd.append('remember', '1');
    const res = await fetch('/api/auth.php', { method: 'POST', body: fd, credentials: 'same-origin' });
    return { status: res.status, data: await res.json() };
  },
  { email, password }
);
if (!login.data?.success) {
  console.error('FAIL login', login);
  await browser.close();
  process.exit(1);
}

await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
const deadline = Date.now() + 25000;
while (Date.now() < deadline) {
  const ok = await page.evaluate(() => {
    const hub = document.getElementById('zz-hub');
    const boot = document.getElementById('zz-hub-boot');
    return hub && hub.hidden === false && boot && boot.hidden === true;
  });
  if (ok) break;
  await page.waitForTimeout(200);
}
await page.screenshot({ path: join(out, '20-prod-hub-800x360.png'), fullPage: false });

const cont = page.locator('#zz-hub-actions a.zz-btn--hero').first();
if ((await cont.count()) > 0) {
  await cont.click();
} else {
  await page.goto(`${base}play.php`, { waitUntil: 'domcontentloaded' });
}

await page.waitForFunction(
  () => {
    const app = document.getElementById('zz-app');
    return app && app.hidden === false;
  },
  null,
  { timeout: 60000 }
);
await page.waitForTimeout(1000);

const m = await page.evaluate(() => {
  const hud = document.getElementById('zz-hud');
  const dock = document.querySelector('.zz-world-dock');
  const box = (el) => {
    if (!el || el.hidden) return null;
    const r = el.getBoundingClientRect();
    return { h: Math.round(r.height * 10) / 10, w: Math.round(r.width * 10) / 10 };
  };
  const ih = window.innerHeight;
  const hudB = box(hud);
  const dockB = box(dock);
  const chrome = (hudB?.h || 0) + (dockB?.h || 0);
  const top = document.querySelector('.zz-hud__row--top');
  return {
    inner: { w: window.innerWidth, h: ih },
    hud: hudB,
    dock: dockB,
    chromeOwnPx: Math.round(chrome * 10) / 10,
    chromeOwnPct: ih ? Math.round((chrome / ih) * 1000) / 10 : null,
    topRowDisplay: top ? getComputedStyle(top).display : null,
    title: document.title,
    standalone: matchMedia('(display-mode: standalone)').matches,
    hasManifestLink: !!document.querySelector('link[rel="manifest"]'),
  };
});

await page.screenshot({ path: join(out, '21-prod-play-800x360.png'), fullPage: false });

await page.click('#zz-open-more').catch(() => {});
await page.waitForTimeout(500);
await page.screenshot({ path: join(out, '22-prod-mas-800x360.png'), fullPage: false });

// Simular display-mode standalone (aproximación PWA)
await page.emulateMedia({ colorScheme: 'dark' });
await page.addStyleTag({
  content: `
    @media all {
      /* harness visual note only */
    }
  `,
});
await page.evaluate(() => {
  document.body.classList.add('zz-standalone');
});
await page.waitForTimeout(300);
const mStand = await page.evaluate(() => {
  const hud = document.getElementById('zz-hud');
  const dock = document.querySelector('.zz-world-dock');
  const box = (el) => {
    if (!el || el.hidden) return null;
    const r = el.getBoundingClientRect();
    return { h: Math.round(r.height * 10) / 10 };
  };
  const ih = window.innerHeight;
  const chrome = (box(hud)?.h || 0) + (box(dock)?.h || 0);
  return {
    chromeOwnPct: ih ? Math.round((chrome / ih) * 1000) / 10 : null,
    hud: box(hud),
    dock: box(dock),
  };
});
await page.screenshot({ path: join(out, '23-prod-standalone-class-800x360.png'), fullPage: false });

const manifest = await page.evaluate(async () => {
  const link = document.querySelector('link[rel="manifest"]');
  if (!link) return null;
  const r = await fetch(link.href);
  return { status: r.status, href: link.href, json: await r.json() };
});

writeFileSync(
  join(out, 'MEASUREMENTS_PROD.json'),
  JSON.stringify({ measure: m, standaloneClass: mStand, manifest }, null, 2)
);
console.log(JSON.stringify({ measure: m, standaloneClass: mStand, manifestDisplay: manifest?.json?.display }, null, 2));
await browser.close();
