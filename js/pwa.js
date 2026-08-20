/**
 * PWA install CTA (secundario) + fullscreen opcional tras gesto.
 * No bloquea Nueva partida / Continuar.
 */
const DISMISS_KEY = 'zzPwaInstallDismissed';

export function isStandaloneDisplay() {
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
    if (navigator.standalone === true) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function wasInstallDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissInstallPrompt() {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    /* ignore */
  }
}

function publicBaseFromPage() {
  try {
    const path = location.pathname || '';
    const m = path.match(/^(.*\/juegos\/zona-zero\/)/);
    if (m) return m[1];
    if (path.endsWith('/')) return path;
    return path.replace(/\/[^/]*$/, '/');
  } catch {
    return '/juegos/zona-zero/';
  }
}

/** Registra SW una vez (instalabilidad). Fallo silencioso. */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const base = publicBaseFromPage();
  const url = `${base}sw.js`;
  navigator.serviceWorker.register(url, { scope: base }).catch(() => {});
}

/**
 * @param {HTMLElement} actionsEl  #zz-hub-actions
 */
export function mountHubInstallCta(actionsEl) {
  if (!actionsEl || isStandaloneDisplay() || wasInstallDismissed()) return;

  let deferred = null;
  const wrap = document.createElement('div');
  wrap.className = 'zz-hub__install';
  wrap.hidden = true;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'zz-btn zz-btn--ghost zz-btn--install';
  btn.textContent = 'Instalar app';

  const skip = document.createElement('button');
  skip.type = 'button';
  skip.className = 'zz-hub__install-skip';
  skip.textContent = 'Ahora no';

  const hint = document.createElement('p');
  hint.className = 'zz-hub__install-hint';
  hint.hidden = true;
  hint.textContent =
    'En iPhone: Compartir → Añadir a pantalla de inicio. En Android: menú ⋮ → Instalar app.';

  wrap.append(btn, skip, hint);
  actionsEl.appendChild(wrap);

  const show = () => {
    wrap.hidden = false;
  };

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    show();
  });

  // iOS / navegadores sin beforeinstallprompt: tip discreto tras un instante
  const ua = navigator.userAgent || '';
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIos && !isStandaloneDisplay()) {
    setTimeout(() => {
      if (!deferred && !wasInstallDismissed()) {
        hint.hidden = false;
        show();
        btn.textContent = 'Cómo instalar';
      }
    }, 1200);
  }

  btn.addEventListener('click', async () => {
    if (deferred) {
      deferred.prompt();
      try {
        await deferred.userChoice;
      } catch {
        /* ignore */
      }
      deferred = null;
      wrap.hidden = true;
      return;
    }
    hint.hidden = false;
  });

  skip.addEventListener('click', () => {
    dismissInstallPrompt();
    wrap.hidden = true;
  });
}

/** Una sola petición de fullscreen tras gesto válido; sin bucles. */
let fullscreenAsked = false;

function isDesktopPointer() {
  try {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  } catch {
    return true;
  }
}

export function requestFullscreenOnce() {
  if (fullscreenAsked || isStandaloneDisplay() || isDesktopPointer()) return;
  fullscreenAsked = true;
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) return;
  try {
    const p = req.call(el);
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch {
    /* ignore — el SO decide */
  }
}

/** Enlaza el primer pointerdown a fullscreen — solo móvil, nunca PC con ratón. */
export function bindFullscreenOnFirstGesture() {
  if (isStandaloneDisplay() || fullscreenAsked || isDesktopPointer()) return;
  const once = () => {
    document.removeEventListener('pointerdown', once, true);
    requestFullscreenOnce();
  };
  document.addEventListener('pointerdown', once, true);
}
