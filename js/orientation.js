/**
 * ZZ-016 — Landscape-first gameplay orientation gate.
 * Hub/intro: no gate. Play portrait (narrow): branded rotate overlay. State preserved.
 */

function isPlayShell() {
  return document.body?.classList?.contains('zz-body--play');
}

/** Desktop wide enough for panoramic play without forcing rotate. */
function isDesktopPanoramic() {
  return window.matchMedia('(min-width: 1100px) and (min-height: 640px)').matches;
}

export function isGameplayPortraitBlocked() {
  // Portrait habilitado — contrato de cámara real 4096×2720 aprobado.
  // El mapa es más grande que cualquier viewport; portrait simplemente
  // muestra una ventana más estrecha del mismo mundo.
  return false;
}

function applyGate(active) {
  const gate = document.getElementById('zz-rotate-gate');
  if (!gate) return;
  gate.hidden = !active;
  gate.setAttribute('aria-hidden', active ? 'false' : 'true');
  document.body.classList.toggle('zz-need-landscape', active);
  document.documentElement.classList.toggle('zz-need-landscape', active);
}

export function refreshOrientationGate() {
  applyGate(isGameplayPortraitBlocked());
}

/**
 * @returns {() => void} dispose
 */
export function initOrientationGate() {
  refreshOrientationGate();
  const onChange = () => refreshOrientationGate();
  window.addEventListener('resize', onChange);
  window.addEventListener('orientationchange', onChange);
  const mql = window.matchMedia('(orientation: portrait)');
  if (mql.addEventListener) mql.addEventListener('change', onChange);
  else if (mql.addListener) mql.addListener(onChange);

  return () => {
    window.removeEventListener('resize', onChange);
    window.removeEventListener('orientationchange', onChange);
    if (mql.removeEventListener) mql.removeEventListener('change', onChange);
    else if (mql.removeListener) mql.removeListener(onChange);
  };
}
