/**
 * ZZ-016 — orientation / landscape gate smoke (Playwright).
 * Requires: npx --yes serve -l 8765 .
 * Usage: node scripts/smoke-orient.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.ZZ_REVIEW_URL || 'http://127.0.0.1:8765';
let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

async function boot(page) {
  await page.goto(`${BASE}/dev/harness.html#new=1&clear=1&name=Refugio%20Norte`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  await page.waitForFunction(() => window.__zzOk === true || window.__zzErr, { timeout: 60000 });
  const err = await page.evaluate(() => window.__zzErr || null);
  if (err) throw new Error(err);
  await page.waitForSelector('#zz-app:not([hidden])', { timeout: 15000 });
}

const browser = await chromium.launch({ headless: true });

{
  const ctx = await browser.newContext({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await boot(page);
  const gateHidden = await page.evaluate(() => {
    const g = document.getElementById('zz-rotate-gate');
    return !g || g.hidden === true;
  });
  assert(gateHidden, 'landscape 844×390: gate oculto');
  assert(
    await page.evaluate(() => !window.__zz.isPortraitBlocked()),
    'landscape: isPortraitBlocked false'
  );
  assert(errors.length === 0, 'sin errores JS landscape: ' + errors.join('; '));
  await ctx.close();
}

{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await boot(page);
  const gateVisible = await page.evaluate(() => {
    const g = document.getElementById('zz-rotate-gate');
    return g && g.hidden === false && document.body.classList.contains('zz-need-landscape');
  });
  assert(gateVisible, 'portrait 390×844: rotate gate visible');
  const dayBefore = await page.evaluate(() => window.__zz.getState().day);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(200);
  await page.evaluate(() => window.__zz.refreshOrientation());
  const after = await page.evaluate(() => ({
    hidden: document.getElementById('zz-rotate-gate').hidden,
    blocked: window.__zz.isPortraitBlocked(),
    day: window.__zz.getState().day,
    need: document.body.classList.contains('zz-need-landscape'),
  }));
  assert(after.hidden === true && !after.blocked && !after.need, 'tras rotar: gate desaparece');
  assert(after.day === dayBefore, 'estado/día preservado tras rotar');
  await ctx.close();
}

{
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await ctx.newPage();
  await boot(page);
  assert(
    await page.evaluate(() => document.getElementById('zz-rotate-gate').hidden),
    'desktop: sin gate'
  );
  await ctx.close();
}

{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/dev/hub-empty.html`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(800);
  const hasGate = await page.evaluate(() => !!document.getElementById('zz-rotate-gate'));
  assert(!hasGate, 'hub portrait: sin rotate gate en DOM');
  await ctx.close();
}

await browser.close();
if (fails) {
  console.error(`smoke-orient FAILED (${fails})`);
  process.exit(1);
}
console.log('smoke-orient OK');
