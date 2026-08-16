/**
 * Recorrido manual autenticado en producción (P0 gate).
 *   ZZ_EMAIL=... ZZ_PASSWORD=... node scripts/manual-auth-prod-flow.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'scripts', 'screenshots-prod');
mkdirSync(outDir, { recursive: true });

const email = process.env.ZZ_EMAIL || '';
const password = process.env.ZZ_PASSWORD || '';
const base = 'https://intocables13.com/juegos/zona-zero/';
if (!email || !password) {
  console.error('ZZ_EMAIL / ZZ_PASSWORD required');
  process.exit(2);
}

const log = [];
const push = (m) => {
  log.push(m);
  console.log(m);
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 844, height: 390 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console:' + m.text());
});

async function snap(name) {
  await page.screenshot({ path: join(outDir, name), fullPage: false });
}

await page.goto('https://intocables13.com/login.php', { waitUntil: 'domcontentloaded' });
const login = await page.evaluate(async ({ email, password }) => {
  const fd = new FormData();
  fd.append('email', email);
  fd.append('password', password);
  fd.append('remember', '1');
  const res = await fetch('/api/auth.php', { method: 'POST', body: fd, credentials: 'same-origin' });
  return res.json();
}, { email, password });
if (!login.success) throw new Error('login failed');
push('1 OK login ' + (login.user?.nombre || ''));

await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => {
  const boot = document.getElementById('zz-hub-boot');
  const hub = document.getElementById('zz-hub');
  return boot && boot.hidden === true && hub && hub.hidden === false;
}, null, { timeout: 25000 });
push('2 OK hub: Cargando oculto');
await snap('flow-01-hub.png');

// Nueva partida (con o sin confirmación)
await page.locator('#zz-hub-actions button', { hasText: /Nueva partida/i }).click();
await page.waitForTimeout(300);
const confirm = page.locator('#zz-cine-actions button', { hasText: /Empezar de nuevo/i });
if (await confirm.count()) {
  await confirm.click();
  push('2b confirm overwrite');
}

// Intro: 3 pasos — CTA en #zz-cine-actions
for (let step = 0; step < 3; step++) {
  await page.waitForSelector('#zz-cine:not([hidden])', { timeout: 10000 });
  const cta = page.locator('#zz-cine-actions button').first();
  const label = (await cta.innerText().catch(() => '')).trim();
  push('intro step ' + step + ': ' + label.slice(0, 40));
  await cta.click();
  if (/Entrar en Zona Zero/i.test(label)) break;
  await page.waitForTimeout(200);
}

await page.waitForURL(/play\.php/, { timeout: 20000 });
push('3 OK play.php ' + page.url());

await page.waitForFunction(() => {
  const boot = document.getElementById('zz-boot');
  const app = document.getElementById('zz-app');
  return app && app.hidden === false && (!boot || boot.hidden === true);
}, null, { timeout: 60000 });
push('4 OK D1 arrancó (Cargando/Preparando oculto)');
await snap('flow-02-d1.png');

const day = await page.locator('#zz-day-label').innerText().catch(() => '?');
push('5 día: ' + day);

const placed = await page.evaluate(() => {
  const api = window.__zz;
  if (!api?.place) return [];
  api.place('farm', 0, 2);
  api.place('well', 4, 2);
  api.paint?.();
  return api.getState().base.buildings.filter((b) => b.hp > 0).map((b) => b.type);
});
push('6 acción buildings=' + JSON.stringify(placed));
if (!placed.length) throw new Error('no se pudo colocar edificios');

await page.click('#zz-save');
await page.waitForFunction(() => {
  const t = document.getElementById('zz-save-state')?.textContent || '';
  return /Guardado|OK|Listo|guard/i.test(t) || t.length > 0;
}, null, { timeout: 15000 }).catch(() => {});
const saveState = await page.locator('#zz-save-state').innerText().catch(() => '');
push('7 Guardar: ' + saveState);
await snap('flow-03-saved.png');

// Cerrar/recargar hub
await page.goto(base, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.getElementById('zz-hub-boot')?.hidden === true, null, {
  timeout: 25000,
});
const hubText = await page.locator('#zz-hub-actions').innerText();
push('8 hub: ' + hubText.replace(/\s+/g, ' ').trim().slice(0, 100));
if (!/Continuar/i.test(hubText)) throw new Error('no Continuar tras guardar');

await page.locator('#zz-hub-actions a', { hasText: /Continuar/i }).click();
await page.waitForURL(/play\.php/, { timeout: 20000 });
await page.waitForFunction(() => document.getElementById('zz-app')?.hidden === false, null, {
  timeout: 60000,
});
const day2 = await page.locator('#zz-day-label').innerText().catch(() => '?');
const b2 = await page.evaluate(() => {
  const s = window.__zz?.getState?.();
  return s ? s.base.buildings.filter((b) => b.hp > 0).length : 0;
});
push('9 Continuar OK day=' + day2 + ' buildings=' + b2);
await snap('flow-04-continue.png');

if (b2 < 1) throw new Error('Continuar no recuperó edificios');

writeFileSync(
  join(outDir, 'MANUAL_AUTH_FLOW.txt'),
  log.concat(['errors=' + errors.length, ...errors.slice(0, 15)]).join('\n') + '\n'
);
await browser.close();
push('PASS manual-auth-prod-flow');
console.log('Cargando desaparece y D1 arranca');
