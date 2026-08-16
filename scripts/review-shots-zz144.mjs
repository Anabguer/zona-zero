/**
 * ZZ-144 HUMAN_GATE — pantallas victoria/derrota + eras/crisis
 * Requires: http-server :8765
 * node scripts/review-shots-zz144.mjs
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
    s.resources.food = 80;
    s.resources.water = 80;
    s.flags.onboardingDone = true;
    s.era = 2;
    s.day = 24;
    s.pendingChoice = null;
    s.director.tension = 0;
    s.director.protectionUntil = 99;
    window.__zz.paint?.();
  });
}

async function forceVictoryReady(page) {
  await page.evaluate(async () => {
    const { checkVictory, victoryConditions } = await import('/js/sim.js');
    const s = window.__zz.getState();
    const c = window.__zz.getContent();
    s.population.total = 45;
    s.population.healthy = 45;
    s.stability = 75;
    s.era = 3;
    s.day = 40;
    s.resources.food = 400;
    s.resources.water = 400;
    s.resources.ammo = 50;
    s.flags.victory = false;
    s.flags.defeated = false;
    s.flags.finalCrisisDone = false;
    s.flags.finalCrisisActive = false;
    s.flags.endless = false;
    (s.zones || []).forEach((z, i) => {
      if (i < 10) {
        z.state = 'controlled';
        z.controlProgress = 1;
      }
    });
    s.base.buildings = [
      { id: 'hq', type: 'hq_central_l2', hp: 100, x: 0, y: 0 },
      { id: 'cl', type: 'clinic', hp: 100, x: 1, y: 0 },
      { id: 'tw', type: 'watchtower', hp: 100, x: 2, y: 0, workers: 1 },
      { id: 'tw2', type: 'watchtower', hp: 100, x: 3, y: 0, workers: 1 },
      { id: 'tw3', type: 'watchtower', hp: 100, x: 4, y: 0, workers: 1 },
      { id: 'b1', type: 'barricade', hp: 100, x: 5, y: 0 },
      { id: 'b2', type: 'barricade', hp: 100, x: 6, y: 0 },
      { id: 'f1', type: 'fence', hp: 100, x: 7, y: 0 },
      { id: 'bn', type: 'bunker', hp: 100, x: 8, y: 0, workers: 2 },
    ];
    s.population.labor = { ...(s.population.labor || {}), defense: 8, idle: 5 };
    s.research.unlocked = ['fortify', 'watch_protocols', 'reinforced_walls'];
    s.energy = { produced: 0, demand: 99 };
    const vc = victoryConditions(s, c);
    if (!vc.ready) throw new Error('not ready ' + JSON.stringify(vc.checks));
    checkVictory(s, c);
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
  await shot(page, '01-mobile-map.png', '01 · Móvil mapa', 'Partida mid · era indicadores');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.era = 3;
    window.__zz.paint?.();
  });
  await dismiss(page);
  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(350);
  await shot(page, '02-mobile-more-era.png', '02 · Más / era', 'Progresión visible');
  await dismiss(page);

  await forceVictoryReady(page);
  await dismiss(page);
  await page.waitForSelector('#zz-victory:not([hidden])', { timeout: 8000 });
  await shot(page, '03-victory-mobile.png', '03 · Victoria', 'Stats + crisis · sin energía');

  await page.click('#zz-endless');
  await page.waitForTimeout(300);
  await dismiss(page);
  const endlessHidden = await page.evaluate(() => document.getElementById('zz-victory')?.hidden);
  if (!endlessHidden) throw new Error('victory should hide after endless');
  await shot(page, '04-endless-continue.png', '04 · Endless', 'Sigue jugando post-victoria');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.flags.endless = false;
    s.flags.victory = false;
    s.flags.defeated = true;
    s.flags.defeatReason = 'No queda población.';
    s.population.total = 0;
    s.stats.maxPop = 28;
    s.day = 33;
    window.__zz.paint?.();
  });
  await page.waitForSelector('#zz-defeat:not([hidden])', { timeout: 5000 });
  await shot(page, '05-defeat-mobile.png', '05 · Derrota', 'Causa + stats');
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
  await shot(page, '06-desktop-map.png', '06 · Desktop mapa', 'Escenario mid-game');

  await forceVictoryReady(page);
  await dismiss(page);
  await page.waitForSelector('#zz-victory:not([hidden])', { timeout: 8000 });
  await shot(page, '07-victory-desktop.png', '07 · Victoria desktop', 'Culminación multi-condición');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.flags.victory = false;
    s.flags.endless = false;
    s.flags.defeated = true;
    s.flags.defeatReason = 'El Refugio Central se ha perdido.';
    s.day = 41;
    s.stats.maxPop = 36;
    window.__zz.paint?.();
  });
  await page.waitForSelector('#zz-defeat:not([hidden])', { timeout: 5000 });
  await shot(page, '08-defeat-desktop.png', '08 · Derrota desktop', 'HQ perdido');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.flags.defeated = false;
    s.flags.victory = false;
    s.energy = { produced: 0, demand: 50 };
    window.__zz.paint?.();
  });
  await dismiss(page);
  await shot(page, '09-no-energy-ok.png', '09 · Sin energía', 'Victoria no exige electricidad');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.flags.finalCrisisVariant = 'siege_scarcity';
    s.flags.victory = true;
    s.flags.endless = false;
    s.flags.victoryDay = 48;
    window.__zz.paint?.();
  });
  await shot(page, '10-crisis-label.png', '10 · Crisis variable', 'Variante etiquetada en victoria');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>ZZ-144 Review · Victoria / derrota (HUMAN_GATE)</title>
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
  <h1>ZZ-144 · Eras / victoria / derrota (HUMAN_GATE)</h1>
  <p>ZZ-140…143 hechas · sin needEnergy · crisis variable · endless · PENDIENTE DE REVISIÓN · contrato 2.8</p>
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
console.log('ZZ-144 review OK', gallery.map((g) => g.file).join(', '));
