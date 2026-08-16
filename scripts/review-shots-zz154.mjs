/**
 * ZZ-154 HUMAN_GATE — alertas / ayuda / diario / a11y
 * Requires: http-server :8765
 * node scripts/review-shots-zz154.mjs
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
    s.day = 10;
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

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.pendingAttack = { arrivesOnDay: s.day + 2, intensity: 3, horde: { label: 'Oleada' } };
    s.director.protectionUntil = s.day + 5;
    window.__zz.paint?.();
  });
  await dismiss(page);
  await shot(page, '01-alert-critical.png', '01 · Banner crítico', 'Hostiles · recovery no banner');

  await page.evaluate(() => document.getElementById('zz-help')?.click());
  await page.waitForSelector('#zz-sheet:not([hidden])');
  await shot(page, '02-help-sheet.png', '02 · Ayuda', 'Temas gated · sin spoilers');

  await page.evaluate(() => document.getElementById('zz-sheet-close')?.click());
  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForSelector('#zz-sheet:not([hidden])');
  await page.evaluate(() => {
    const h = [...document.querySelectorAll('.zz-sheet-section__h, .zz-diary')].pop();
    h?.scrollIntoView?.({ block: 'center' });
  });
  await shot(page, '03-diary-more.png', '03 · Diario en Más', 'Sin spam routine');

  await page.evaluate(() => document.getElementById('zz-sheet-close')?.click());
  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.pendingAttack = null;
    s.resources.food = 2;
    s.population.total = 8;
    window.__zz.paint?.();
  });
  await dismiss(page);
  await shot(page, '04-food-critical.png', '04 · Comida crítica', 'Capa critical');

  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelector('[data-action="open-help"]')?.click());
  await page.waitForSelector('#zz-sheet:not([hidden])');
  await shot(page, '05-help-from-more.png', '05 · Ayuda desde Más', '§21.3 acceso dual');
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

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.pendingCatastrophe = { name: 'Tormenta', dueDay: s.day + 3, prepared: false };
    window.__zz.paint?.();
  });
  await dismiss(page);
  await shot(page, '06-desktop-catastrophe.png', '06 · Catástrofe desktop', 'Banner critical');

  await page.evaluate(() => document.getElementById('zz-help')?.click());
  await page.waitForSelector('#zz-sheet:not([hidden])');
  await shot(page, '07-desktop-help.png', '07 · Ayuda desktop', 'Panel lateral');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForSelector('#zz-sheet:not([hidden])');
  await shot(page, '08-desktop-diary.png', '08 · Diario desktop', 'Lista filtrada');

  await page.evaluate(() => document.getElementById('zz-sheet-close')?.click());
  await shot(page, '09-a11y-targets.png', '09 · Targets HUD', 'Iconos ≥44 · focus');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.pendingCatastrophe = null;
    s.pendingAttack = null;
    s.resources.food = 40;
    window.__zz.paint?.();
  });
  await dismiss(page);
  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await shot(page, '10-world-first.png', '10 · Mundo + ficha', 'Sin tabs de app');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>ZZ-154 Review · UX alertas/ayuda/diario/a11y (HUMAN_GATE)</title>
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
  <h1>ZZ-154 · Alertas / ayuda / diario / a11y (HUMAN_GATE)</h1>
  <p>ZZ-151…153 hechas · capas §21 · sin spoilers · diario no spam · PENDIENTE DE REVISIÓN · contrato 2.8</p>
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
console.log('ZZ-154 review OK', gallery.map((g) => g.file).join(', '));
