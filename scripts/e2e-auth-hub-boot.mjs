/**
 * Regression P0 — hub autenticado prod-equivalente termina boot (no "Cargando…" eterno).
 *
 * Cubre:
 *   login real → hub → desaparece Cargando → aparece Nueva partida / Continuar
 *
 * No acepta solo HTTP 200.
 *
 *   ZZ_EMAIL=... ZZ_PASSWORD=... node scripts/e2e-auth-hub-boot.mjs
 *   ZZ_BASE=https://intocables13.com/juegos/zona-zero/  (default prod)
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const email = process.env.ZZ_EMAIL || '';
const password = process.env.ZZ_PASSWORD || '';
const base = (process.env.ZZ_BASE || 'https://intocables13.com/juegos/zona-zero/').replace(/\/?$/, '/');
const origin = new URL(base).origin;

if (!email || !password) {
  console.error('FAIL: define ZZ_EMAIL y ZZ_PASSWORD (sesión Intocables real)');
  process.exit(2);
}

// Guardia estática: hub no debe pedir logo.png enorme (atasca móvil).
const hubCss = readFileSync(join(root, 'css', 'hub.css'), 'utf8');
if (/logo\.png/i.test(hubCss)) {
  console.error('FAIL: css/hub.css referencia logo.png (peso móvil; usar cover.svg)');
  process.exit(1);
}
if (!/cover\.svg/i.test(hubCss)) {
  console.error('FAIL: css/hub.css debería usar cover.svg en atmósfera');
  process.exit(1);
}
const indexPhp = readFileSync(join(root, 'index.php'), 'utf8');
if (/bootHub\(\)\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/.test(indexPhp)) {
  console.error('FAIL: index.php traga errores de boot con catch vacío');
  process.exit(1);
}
if (!/await import\(/.test(indexPhp)) {
  console.error('FAIL: index.php debe await import() para capturar fallos de módulo');
  process.exit(1);
}
console.log('OK static guards (hub.css + index.php boot)');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 844, height: 390 },
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror:' + String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console:' + m.text());
});
page.on('requestfailed', (r) => {
  const u = r.url();
  if (u.includes('zona-zero') && !u.includes('favicon')) {
    errors.push('fail:' + u + ' :: ' + (r.failure()?.errorText || ''));
  }
});

await page.goto(origin + '/login.php', { waitUntil: 'domcontentloaded', timeout: 60000 });
const login = await page.evaluate(async ({ email, password }) => {
  const fd = new FormData();
  fd.append('email', email);
  fd.append('password', password);
  fd.append('remember', '1');
  const res = await fetch('/api/auth.php', { method: 'POST', body: fd, credentials: 'same-origin' });
  return { status: res.status, data: await res.json() };
}, { email, password });

if (!login.data?.success) {
  console.error('FAIL login', login);
  await browser.close();
  process.exit(1);
}
console.log('OK login', login.data.user?.nombre || email);

const t0 = Date.now();
await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });

let state = null;
const deadline = Date.now() + 25000;
while (Date.now() < deadline) {
  state = await page.evaluate(() => {
    const boot = document.getElementById('zz-hub-boot');
    const hub = document.getElementById('zz-hub');
    const actions = document.getElementById('zz-hub-actions');
    return {
      href: location.href,
      bootHidden: boot ? boot.hidden : null,
      hubHidden: hub ? hub.hidden : null,
      bootText: boot ? boot.textContent.trim().slice(0, 80) : null,
      actionsText: actions ? actions.textContent.replace(/\s+/g, ' ').trim() : null,
      hasNueva: !!(actions && /Nueva partida/i.test(actions.textContent || '')),
      hasContinuar: !!(actions && /Continuar/i.test(actions.textContent || '')),
    };
  });
  if (state.bootHidden === true && state.hubHidden === false && (state.hasNueva || state.hasContinuar)) {
    break;
  }
  if (state.bootText && /Error al (cargar|iniciar)/i.test(state.bootText)) {
    break;
  }
  await page.waitForTimeout(200);
}

const ms = Date.now() - t0;
const ok =
  state &&
  state.bootHidden === true &&
  state.hubHidden === false &&
  (state.hasNueva || state.hasContinuar) &&
  !/Cargando/i.test(state.actionsText || '');

console.log(JSON.stringify({ ms, state, errors: errors.slice(0, 20) }, null, 2));

const outDir = join(root, 'scripts', 'screenshots-prod');
if (existsSync(outDir)) {
  await page.screenshot({ path: join(outDir, 'e2e-auth-hub-boot.png'), fullPage: true }).catch(() => {});
}

await browser.close();

if (!ok) {
  console.error('FAIL: hub autenticado no completó boot jugable');
  process.exit(1);
}
if (errors.some((e) => /Failed to fetch dynamically imported module|SyntaxError/i.test(e))) {
  console.error('FAIL: errores de módulo bloqueantes', errors);
  process.exit(1);
}
console.log('PASS e2e-auth-hub-boot');
