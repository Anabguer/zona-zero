/**
 * ZZ-133 HUMAN_GATE — Go/no-go facciones lean
 * Requires: http-server :8765
 * node scripts/review-shots-zz133.mjs
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
    const sh = document.getElementById('zz-sheet');
    if (sh) sh.hidden = true;
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

  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const h = [...document.querySelectorAll('h3')].find((el) => /Contactos/i.test(el.textContent || ''));
    h?.scrollIntoView({ block: 'center' });
  });
  await shot(page, '01-contacts-empty.png', '01 · Sin contactos', 'Nadie descubierto aún');
  await dismiss(page);

  await page.evaluate(async () => {
    const { discoverFaction, tradeWithFaction } = await import('/js/factions.js');
    const { createRng } = await import('/js/rng.js');
    const s = window.__zz.getState();
    s.resources.food = 20;
    s.resources.metal = 20;
    const f = discoverFaction(s, createRng(3), { trait: 'trader' });
    tradeWithFaction(s, f);
    window.__zz.paint?.();
  });
  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const h = [...document.querySelectorAll('h3')].find((el) => /Contactos/i.test(el.textContent || ''));
    h?.scrollIntoView({ block: 'center' });
  });
  await shot(page, '02-contact-card.png', '02 · Contacto', 'Card lean + trueque');
  await dismiss(page);

  await page.evaluate(async () => {
    const { discoverFaction } = await import('/js/factions.js');
    const { createRng } = await import('/js/rng.js');
    const s = window.__zz.getState();
    discoverFaction(s, createRng(9), { trait: 'hostile', relation: 'hostile' });
    window.__zz.paint?.();
  });
  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(350);
  await page.evaluate(() => {
    const h = [...document.querySelectorAll('h3')].find((el) => /Contactos/i.test(el.textContent || ''));
    h?.scrollIntoView({ block: 'center' });
  });
  await shot(page, '03-hostile-no-trade.png', '03 · Hostil', 'Sin comercio · relación legible');
  await dismiss(page);

  await shot(page, '04-colony.png', '04 · Colonia', 'Sin mapa 4X');
  await shot(page, '05-map-world.png', '05 · Mapa', 'Mundo primero · contrato 2.8');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.director.protectionUntil = s.day + 3;
    window.__zz.paint?.();
  });
  await shot(page, '06-recovery-banner.png', '06 · Recovery', 'Post-crisis · quiet válida');

  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(300);
  await shot(page, '07-more-panel.png', '07 · Más', 'Contactos en panel, no embajada');
  await dismiss(page);

  await shot(page, '08-go-lean.png', '08 · GO lean', 'Contactos evento · sin 4X');
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await boot(page);
  await page.evaluate(async () => {
    const { discoverFaction } = await import('/js/factions.js');
    const { createRng } = await import('/js/rng.js');
    discoverFaction(window.__zz.getState(), createRng(1), { trait: 'friendly', relation: 'friendly' });
    window.__zz.paint?.();
  });
  await dismiss(page);
  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(400);
  await shot(page, '09-desktop-contacts.png', '09 · Desktop', 'UI mínima contactos');
  await ctx.close();
}

{
  const ctx = await browser.newContext({
    viewport: { width: 740, height: 360 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await boot(page);
  await dismiss(page);
  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(350);
  await shot(page, '10-740-contacts.png', '10 · 740×360', 'Landscape');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-133 Review · Contactos lean GO/NO-GO (HUMAN_GATE)</title>
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
  <h1>ZZ-133 · Contactos lean (HUMAN_GATE · GO/NO-GO)</h1>
  <p>ZZ-126…132 hechas · recomendación <strong>GO lean</strong> (eventos+trueque, sin 4X) · PENDIENTE DE REVISIÓN · quiet nights · contrato 2.8</p>
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
console.log('ZZ-133 review OK', gallery.map((g) => g.file).join(', '));
