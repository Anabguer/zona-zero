/**
 * ZZ-014 HUMAN_GATE — Desktop 1920: panel + mundo (no vacío).
 * Requires: serve :8765
 * node scripts/review-shots-zz014.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, rmSync, writeFileSync, readdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs', 'review');
const drive = 'G:\\Mi unidad\\Juegos\\Zona Zero\\Review';
const BASE = 'http://127.0.0.1:8765';
const HARNESS = `${BASE}/dev/harness-zz.html`;

mkdirSync(out, { recursive: true });
mkdirSync(drive, { recursive: true });
for (const dir of [out, drive]) {
  for (const f of readdirSync(dir)) {
    try {
      rmSync(join(dir, f), { force: true });
    } catch {
      /* ignore */
    }
  }
}

const gallery = [];
async function shot(page, file, title, note) {
  await page.waitForTimeout(420);
  await page.screenshot({ path: join(out, file), fullPage: false });
  gallery.push({ file, title, note });
}

async function boot(page, { coach = false } = {}) {
  await page.goto(`${HARNESS}#new=1&clear=1&name=Refugio%20Norte`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  await page.waitForFunction(() => window.__zzOk === true || window.__zzErr, { timeout: 60000 });
  const err = await page.evaluate(() => window.__zzErr || null);
  if (err) throw new Error(err);
  await page.waitForSelector('#zz-app:not([hidden])', { timeout: 15000 });
  await page.waitForTimeout(450);
  await page.evaluate((keepCoach) => {
    const s = window.__zz.getState();
    if (!keepCoach) {
      s.flags.onboardingDone = true;
      s.flags.onboardingActive = false;
    } else {
      s.flags.onboardingDone = false;
      s.flags.onboardingActive = true;
      s.flags.onboardingStep = 0;
    }
    window.__zz.paint?.();
  }, coach);
}

const browser = await chromium.launch({ headless: true });

{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await boot(page);

  const layout = await page.evaluate(() => {
    const panel = document.getElementById('zz-desk-panel');
    const stage = document.querySelector('.zz-world-stage');
    const pr = panel?.getBoundingClientRect();
    const sr = stage?.getBoundingClientRect();
    return {
      desk: document.body.classList.contains('zz-desk-layout'),
      panelHidden: !!panel?.hidden,
      panelW: pr?.width || 0,
      stageRight: sr?.right || 0,
      stageW: sr?.width || 0,
      hasExplorers: (document.querySelectorAll('#zz-desk-explorers .zz-ex-card').length || 0) > 0,
      tip: document.getElementById('zz-desk-tip')?.textContent || '',
    };
  });
  if (!layout.desk || layout.panelHidden) throw new Error('Desk panel not active: ' + JSON.stringify(layout));
  if (layout.stageW > 1700) throw new Error('World still full-bleed (no panel inset): ' + layout.stageW);
  if (layout.panelW < 280) throw new Error('Panel too narrow: ' + layout.panelW);

  await shot(page, '01-desktop-panel-mundo.png', '01 · Panel + mundo', '1920 · panel lateral · sin vacío');
  await shot(page, '02-desktop-panel-detail.png', '02 · Panel detalle', 'Población · recursos · explorador');

  await page.evaluate(() => window.__zz.startBuild('farm'));
  await page.waitForTimeout(350);
  await shot(page, '03-desktop-build.png', '03 · Construir', 'Mundo usable + panel');

  await page.evaluate(() => {
    window.__zz.cancelBuild?.();
    document.getElementById('zz-open-pop')?.click();
  });
  await page.waitForTimeout(350);
  await shot(page, '04-desktop-sheet.png', '04 · Ficha en columna', 'Sheet ocupa el panel');

  await page.evaluate(() => document.getElementById('zz-sheet-close')?.click());
  await page.waitForTimeout(250);
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await boot(page, { coach: true });
  await shot(page, '05-desktop-coach.png', '05 · Coach + panel', 'Tip en mundo · panel a la derecha');
  await ctx.close();
}

{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  await boot(page);
  await shot(page, '06-desktop-1440.png', '06 · 1440×900', 'Panel activo ≥1100');
  await ctx.close();
}

{
  const ctx = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await boot(page);
  const mobile = await page.evaluate(() => ({
    desk: document.body.classList.contains('zz-desk-layout'),
    panelHidden: document.getElementById('zz-desk-panel')?.hidden,
  }));
  if (mobile.desk || !mobile.panelHidden) throw new Error('Panel must hide on mobile landscape');
  await shot(page, '07-mobile-no-panel.png', '07 · Móvil sin panel', 'Landscape intacto · rail explorador');
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await boot(page);
  await page.evaluate(() => {
    window.__zz.zoomBy?.(0.85);
    window.__zz.panBy?.(12, -8);
  });
  await shot(page, '08-desktop-pan.png', '08 · Pan/zoom desktop', 'Mundo en columna izquierda');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-014 Review · Desktop panel+mundo (HUMAN_GATE)</title>
<style>
body{margin:0;background:#12100c;color:#e8e0d0;font-family:system-ui,sans-serif}
header{padding:1.25rem 1.5rem;border-bottom:1px solid #333}
h1{margin:0;font-size:1.25rem}
p{margin:.35rem 0 0;opacity:.75;font-size:.9rem}
.grid{display:grid;gap:1rem;padding:1rem;grid-template-columns:repeat(auto-fill,minmax(340px,1fr))}
figure{margin:0;background:#1a1612;border:1px solid #333;border-radius:10px;overflow:hidden}
img{display:block;width:100%;height:auto;background:#0a0908}
figcaption{padding:.65rem .75rem;font-size:.85rem}
figcaption strong{display:block}
figcaption span{opacity:.7;font-size:.78rem}
</style></head><body>
<header>
  <h1>ZZ-014 · Desktop 1920 D1 (HUMAN_GATE)</h1>
  <p>Panel + mundo · sin vacío · PENDIENTE DE REVISIÓN · no ZZ-015</p>
</header>
<div class="grid">
${gallery
  .map(
    (g) => `<figure><img src="${g.file}" alt="${g.title}"/><figcaption><strong>${g.title}</strong><span>${g.note || ''}</span></figcaption></figure>`
  )
  .join('\n')}
</div></body></html>`
);

{
  const b2 = await chromium.launch({ headless: true });
  const p = await b2.newPage({ viewport: { width: 1600, height: 2200 } });
  await p.goto(`file://${out.replace(/\\/g, '/')}/index.html`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.screenshot({
    path: join(out, 'review-contact-sheet.jpg'),
    type: 'jpeg',
    quality: 82,
    fullPage: true,
  });
  await b2.close();
}

for (const f of readdirSync(out)) {
  copyFileSync(join(out, f), join(drive, f));
}
console.log('ZZ-014 review OK', gallery.map((g) => g.file).join(', '));
