/**
 * ZZ-065 HUMAN_GATE — QA ataque + recuperación visual
 * Requires: http-server :8765
 * node scripts/review-shots-zz065.mjs
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
      }
    }
    document.getElementById('zz-brief-ok')?.click();
    const sh = document.getElementById('zz-sheet');
    if (sh) sh.hidden = true;
    ['zz-coach', 'zz-day-brief', 'zz-event-card', 'zz-choice-modal', 'zz-toast'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.hidden = true;
    });
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
    s.resources.wood = 90;
    s.resources.metal = 50;
    s.resources.ammo = 8;
    s.resources.food = 90;
    s.resources.water = 90;
    if (s.population?.labor) s.population.labor.idle = 8;
    s.flags.onboardingDone = true;
    s.flags.onboardingActive = false;
    s.era = 1;
    s.day = 16;
    s.pendingChoice = null;
    s.director = s.director || {};
    s.director.tension = 0;
    s.director.protectionUntil = 0;
    s.director.threat = 36;
    window.__zz.paint?.();
  });
}

async function place(page, type) {
  await page.evaluate((t) => {
    window.__zz.startBuild(t);
    const free = window.__zz.freeCells();
    if (!free?.length) return;
    window.__zz.setGhost(free[0][0], free[0][1]);
    window.__zz.confirmBuild();
    const sh = document.getElementById('zz-sheet');
    if (sh) sh.hidden = true;
  }, type);
  await page.waitForTimeout(160);
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

  await place(page, 'farm');
  await place(page, 'well');
  await place(page, 'barricade');
  await place(page, 'watchtower');
  await page.evaluate(() => {
    const t = window.__zz.getState().base.buildings.find((x) => x.type === 'watchtower');
    if (t) window.__zz.adjustWorkers(t.id, 1);
  });
  await dismiss(page);
  await shot(page, '01-defense-hud.png', '01 · Defensa HUD', 'Amenaza + defensa agregada');

  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(350);
  await shot(page, '02-defense-panel.png', '02 · Panel Defensa', 'Desglose edificios/munición/territorio');
  await dismiss(page);

  await page.evaluate(async () => {
    const { schedulePendingAttack } = await import('/js/combat.js');
    const s = window.__zz.getState();
    const c = window.__zz.getContent();
    schedulePendingAttack(s, 3, c);
    window.__zz.paint?.();
  });
  await page.waitForTimeout(350);
  await shot(page, '03-pending-attack.png', '03 · Aviso hostiles', 'Prep antes del resolve');

  await page.evaluate(async () => {
    const { resolveBaseAttack } = await import('/js/sim.js');
    const s = window.__zz.getState();
    const c = window.__zz.getContent();
    if (s.pendingAttack) s.pendingAttack.arrivesOnDay = s.day;
    const atk = resolveBaseAttack(s, c, s.pendingAttack?.intensity || 3, {
      horde: s.pendingAttack?.horde,
    });
    s.lastAttackReport = atk;
    window.__zz.paint?.();
    // show card via DOM helper if exposed
    const card = document.getElementById('zz-attack-card');
    if (card) {
      const labels = { win: 'Ataque repelido', messy: 'Ataque contenido', lose: 'El perímetro cede' };
      card.className = `zz-attack-card zz-attack-card--${atk.result}`;
      card.innerHTML = `<strong>${labels[atk.result] || 'Ataque'}</strong>
        <p>Intensidad ${atk.intensity} · Muertos ${atk.dead} · Heridos ${atk.injured} · Munición −${atk.ammoSpent}</p>
        <p>${atk.hordeLabel || ''}</p>`;
      card.hidden = false;
    }
  });
  await page.waitForTimeout(400);
  await shot(page, '04-attack-report.png', '04 · Informe ataque', 'Bajas + munición + composición');

  await page.evaluate(() => {
    const card = document.getElementById('zz-attack-card');
    if (card) card.hidden = true;
    const s = window.__zz.getState();
    s.director.protectionUntil = s.day + 4;
    s.director.threat = 28;
    window.__zz.paint?.();
  });
  await shot(page, '05-recovery-banner.png', '05 · Recuperación', 'Banner + objetivo recovery');

  await page.evaluate(() => {
    const s = window.__zz.getState();
    s.resources.ammo = 1;
    s.director.protectionUntil = 0;
    s.director.threat = 30;
    s.pendingAttack = null;
    window.__zz.paint?.();
  });
  await shot(page, '06-need-ammo.png', '06 · Munición baja', 'Alerta need_ammo');

  await place(page, 'armory');
  await page.evaluate(() => {
    const a = window.__zz.getState().base.buildings.find((x) => x.type === 'armory');
    if (a) window.__zz.adjustWorkers(a.id, 2);
    const s = window.__zz.getState();
    s.research.unlocked = [...(s.research.unlocked || []), 'watch_protocols', 'ammo_craft'];
    window.__zz.paint?.();
  });
  await dismiss(page);
  await page.evaluate(() => {
    const a = window.__zz.getState().base.buildings.find((x) => x.type === 'armory');
    if (a) window.__zz.selectBuilding?.(a.id);
  });
  await page.waitForTimeout(300);
  await shot(page, '07-armory.png', '07 · Armería', 'Staff + producción ammo');
  await dismiss(page);

  await page.evaluate(() => document.getElementById('zz-open-more')?.click());
  await page.waitForTimeout(300);
  await shot(page, '08-tech-defense.png', '08 · Tech defensa', 'watch_protocols / ammo_craft');
  await dismiss(page);

  await shot(page, '09-colony-def.png', '09 · Colonia', 'Perímetro con torre/barricada');
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await boot(page);
  await place(page, 'watchtower');
  await page.evaluate(async () => {
    const { schedulePendingAttack } = await import('/js/combat.js');
    schedulePendingAttack(window.__zz.getState(), 2, window.__zz.getContent());
    window.__zz.paint?.();
  });
  await dismiss(page);
  await shot(page, '10-desktop-threat.png', '10 · Desktop', 'Amenaza + aviso');
  await ctx.close();
}

await browser.close();

writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZZ-065 Review · QA ataque + recuperación (HUMAN_GATE)</title>
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
  <h1>ZZ-065 · QA ataque + recuperación (HUMAN_GATE)</h1>
  <p>ZZ-060…064 hechas · defensa legible · prep→informe · infectados tipados · ammo · recovery · PENDIENTE DE REVISIÓN · no ZZ-066 · deudas arte NO BLOQUEANTES</p>
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
console.log('ZZ-065 review OK', gallery.map((g) => g.file).join(', '));
