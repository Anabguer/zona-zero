/**
 * ZZ-150 HUMAN_GATE — sheets móvil/desktop consistentes
 * Requires: http-server :8765
 * node scripts/review-shots-zz150.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, rmSync, writeFileSync, readdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs', 'review');
const drive = 'G:\\Mi unidad\\Juegos\\Zona Zero\\Review';
const HARNESS = 'http://127.0.0.1:8765/dev/harness-zz.html';

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
  await page.waitForTimeout(280);
  await page.screenshot({ path: join(out, file), fullPage: false });
  gallery.push({ file, title, note });
}

async function dismiss(page) {
  await page.evaluate(() => {
    const s = window.__zz.getState();
    if (s) {
      s.pendingChoice = null;
      if (s.director) {
        s.director.tension = 0;
        s.director.protectionUntil = 99;
      }
    }
    document.getElementById('zz-brief-ok')?.click();
    ['zz-coach', 'zz-day-brief', 'zz-event-card', 'zz-attack-card', 'zz-choice-modal', 'zz-toast'].forEach(
      (id) => {
        const el = document.getElementById(id);
        if (el) el.hidden = true;
      }
    );
  });
}

async function boot(page) {
  await page.goto(`${HARNESS}#new=1&clear=1&name=Refugio%20Norte`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForFunction(() => window.__zzOk === true || window.__zzErr, { timeout: 60000 });
  if (await page.evaluate(() => window.__zzErr)) throw new Error(await page.evaluate(() => window.__zzErr));
  await page.waitForSelector('#zz-app:not([hidden])', { timeout: 15000 });
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.resources.wood = 80;
    s.resources.metal = 40;
    s.resources.food = 40;
    s.resources.water = 40;
    s.flags.onboardingDone = true;
    s.era = 1;
    s.day = 8;
    s.pendingChoice = null;
    s.director.tension = 0;
    s.director.protectionUntil = 99;
    window.__zz.paint?.();
  });
}

const browser = await chromium.launch({ headless: true });

{
  const ctx = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'es-ES',
  });
  const page = await ctx.newPage();
  await boot(page);
  await dismiss(page);
  await shot(page, '01-mobile-world.png', '01 · Mundo landscape', 'Sin pestañas · dock');

  await page.evaluate(() => document.getElementById('zz-open-build')?.click());
  await page.waitForSelector('#zz-sheet:not([hidden])');
  await shot(page, '02-mobile-build.png', '02 · Construir', 'Ficha lateral landscape');
  await page.evaluate(() => document.getElementById('zz-sheet-close')?.click());

  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForSelector('#zz-sheet:not([hidden])');
  await page.waitForTimeout(200);
  await shot(page, '03-mobile-more.png', '03 · Más', 'Secciones consistentes');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    const b = s.base.buildings.find((x) => x.hp > 0);
    if (b) {
      s.selectedBuildingId = b.id;
      window.__zz.paint?.();
    }
  });
  await page.evaluate(() => {
    const s = window.__zz.getState();
    const b = (s.base.buildings || []).find((x) => x.hp > 0);
    if (!b) return;
    // open via paint path: click open-pop then building isn't easy; use evaluate import
  });
  await page.evaluate(async () => {
    const s = window.__zz.getState();
    const b = (s.base.buildings || []).find((x) => x.hp > 0);
    if (!b) return;
    document.getElementById('zz-open-more')?.click();
  });
  await dismiss(page);
  await page.evaluate(() => document.getElementById('zz-open-pop')?.click());
  await page.waitForSelector('#zz-sheet:not([hidden])');
  await shot(page, '04-mobile-pop.png', '04 · Colonia', 'Resumen SO');

  const kind = await page.evaluate(() => document.getElementById('zz-sheet')?.dataset.sheetKind);
  if (kind !== 'population') throw new Error('expected population kind got ' + kind);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const closed = await page.evaluate(() => document.getElementById('zz-sheet')?.hidden);
  if (!closed) throw new Error('Escape should close sheet');
  await shot(page, '05-mobile-escape.png', '05 · Tras Escape', 'Mundo visible de nuevo');
  await ctx.close();
}

{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    locale: 'es-ES',
  });
  const page = await ctx.newPage();
  await boot(page);
  await dismiss(page);
  await shot(page, '06-desktop-world.png', '06 · Desktop mundo', 'Panel lateral + dock');

  await page.evaluate(() => document.getElementById('zz-open-build')?.click());
  await page.waitForSelector('#zz-sheet:not([hidden])');
  await shot(page, '07-desktop-build.png', '07 · Construir desktop', 'Misma ficha, panel full-height');

  await page.evaluate(() => document.getElementById('zz-sheet-close')?.click());
  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForSelector('#zz-sheet:not([hidden])');
  await shot(page, '08-desktop-more.png', '08 · Más desktop', 'Secciones + scroll body');

  await page.evaluate(() => document.getElementById('zz-open-pop')?.click());
  await page.waitForSelector('#zz-sheet:not([hidden])');
  await shot(page, '09-desktop-pop.png', '09 · Colonia desktop', 'Contrato compartido');

  const desk = await page.evaluate(() => document.body.classList.contains('zz-desk-layout'));
  if (!desk) throw new Error('expected desk layout');
  await shot(page, '10-desktop-sheet-chrome.png', '10 · Chrome ficha', 'Close + body · sin tabs');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>ZZ-150 Review · Sheets consistentes (HUMAN_GATE)</title>
<style>
body{margin:0;background:#12100c;color:#e8e0d0;font-family:system-ui,sans-serif}
header{padding:1.25rem 1.5rem;border-bottom:1px solid #333}
h1{margin:0;font-size:1.2rem}
p{margin:.35rem 0 0;opacity:.75;font-size:.9rem}
.grid{display:grid;gap:1rem;padding:1rem;grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}
figure{margin:0;background:#1a1612;border:1px solid #333;border-radius:10px;overflow:hidden}
img{display:block;width:100%;height:auto}
figcaption{padding:.65rem .75rem;font-size:.85rem}
figcaption strong{display:block}
figcaption span{opacity:.7;font-size:.78rem}
</style></head><body>
<header>
  <h1>ZZ-150 · Sheets móvil/desktop (HUMAN_GATE)</h1>
  <p>Mundo primero · sin pestañas · shell común · PENDIENTE DE REVISIÓN · contrato 2.8</p>
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
  const p = await b2.newPage({ viewport: { width: 1500, height: 2400 } });
  await p.goto(`file://${out.replace(/\\/g, '/')}/index.html`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(700);
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
console.log('ZZ-150 review OK', gallery.map((g) => g.file).join(', '));
