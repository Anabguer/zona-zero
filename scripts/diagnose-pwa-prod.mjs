/**
 * Diagnóstico PWA en prod (sin cambiar juego).
 * ZZ_EMAIL ZZ_PASSWORD node scripts/diagnose-pwa-prod.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
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
const context = await browser.newContext({
  viewport: { width: 800, height: 360 },
  userAgent:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();

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

await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);

const report = await page.evaluate(async () => {
  const link = document.querySelector('link[rel="manifest"]');
  let manifest = null;
  let manifestStatus = null;
  if (link) {
    const r = await fetch(link.href);
    manifestStatus = r.status;
    try {
      manifest = await r.json();
    } catch (e) {
      manifest = { parseError: String(e) };
    }
  }

  let sw = { supported: 'serviceWorker' in navigator };
  if (sw.supported) {
    const reg = await navigator.serviceWorker.getRegistration();
    sw = {
      ...sw,
      controller: !!navigator.serviceWorker.controller,
      registrationScope: reg?.scope || null,
      activeState: reg?.active?.state || null,
      installing: !!reg?.installing,
      waiting: !!reg?.waiting,
    };
  }

  const icons = [];
  for (const icon of manifest?.icons || []) {
    try {
      const ir = await fetch(icon.src);
      icons.push({ src: icon.src, status: ir.status, type: ir.headers.get('content-type'), sizes: icon.sizes });
    } catch (e) {
      icons.push({ src: icon.src, error: String(e) });
    }
  }

  const installWrap = document.querySelector('.zz-hub__install');
  const installBtn = document.querySelector('.zz-btn--install');

  return {
    href: location.href,
    title: document.title,
    displayModeStandalone: matchMedia('(display-mode: standalone)').matches,
    displayModeFullscreen: matchMedia('(display-mode: fullscreen)').matches,
    displayModeBrowser: matchMedia('(display-mode: browser)').matches,
    navigatorStandalone: navigator.standalone === true,
    bodyHasStandaloneClass: document.body.classList.contains('zz-standalone'),
    manifestLink: link?.href || null,
    manifestStatus,
    manifest,
    icons,
    sw,
    installCta: {
      present: !!installWrap,
      hidden: installWrap ? installWrap.hidden : null,
      btnText: installBtn?.textContent || null,
      dismissedKey: localStorage.getItem('zzPwaInstallDismissed'),
    },
    hasNuevaOrContinuar: /Nueva partida|Continuar/i.test(
      document.getElementById('zz-hub-actions')?.textContent || ''
    ),
    chromeBarNote:
      'La barra X|título|dominio|⋮ NO está en el DOM del juego; es Chrome/Custom Tab.',
  };
});

// beforeinstallprompt no dispara de forma fiable en headless; documentar
report.beforeinstallpromptNote =
  'Playwright headless suele NO disparar beforeinstallprompt; en Android Chrome real sí puede tras engagement.';

writeFileSync(join(out, 'PWA_DIAG_PROD.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();

const ok =
  report.manifestStatus === 200 &&
  report.manifest?.display === 'standalone' &&
  report.manifest?.orientation === 'landscape' &&
  report.sw?.registrationScope &&
  (report.icons || []).every((i) => i.status === 200);

console.log(ok ? 'PASS PWA assets/SW/manifest en prod' : 'FAIL criterios PWA');
process.exit(ok ? 0 : 1);
