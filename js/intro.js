/**
 * ZZ-008 — Confirmación + mini-intro (3 momentos con arte e identidad propia).
 */

export const DEFAULT_COLONY_NAME = 'Refugio Norte';

/** @type {Array<{id:string,layout:string,art:string,line:string,sub?:string,pillars?:string[],cta:string,ctaClass?:string}>} */
export const INTRO_STEPS = [
  {
    id: 'collapse',
    layout: 'collapse',
    art: 'collapse.jpg',
    line: 'La ciudad se apagó.',
    cta: '›',
    ctaClass: 'zz-cine__tap',
  },
  {
    id: 'refuge',
    layout: 'refuge',
    art: 'refuge.jpg',
    line: 'Esto es lo poco que tenemos.',
    sub: 'Un refugio. Un puñado de supervivientes.',
    cta: '›',
    ctaClass: 'zz-cine__tap',
  },
  {
    id: 'mission',
    layout: 'mission',
    art: 'mission.jpg',
    line: 'Zona Zero',
    pillars: ['Sobrevive', 'Estabiliza', 'Explora', 'Recupera'],
    cta: 'Entrar en Zona Zero',
    ctaClass: 'zz-cine__enter',
  },
];

/**
 * @param {HTMLElement} root
 * @param {{
 *   hasSave?: boolean,
 *   playUrl?: string,
 *   colonyName?: string,
 *   assetBase?: string,
 *   onEnterDay1?: (url: string) => void,
 * }} opts
 */
export function startNewGameFlow(root, opts = {}) {
  const playUrl = opts.playUrl || 'play.php';
  const colonyName = opts.colonyName || DEFAULT_COLONY_NAME;
  const assetBase = opts.assetBase || 'assets/art/intro/';
  const navigate =
    opts.onEnterDay1 ||
    ((url) => {
      window.location.href = url;
    });

  function day1Url() {
    const q = new URLSearchParams({
      new: '1',
      name: colonyName,
      intro: '1',
    });
    if (opts.hasSave) q.set('clear', '1');
    const base = playUrl.split(/[?#]/)[0];
    if (/harness/i.test(base)) {
      return `${base}#${q.toString()}`;
    }
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}${q.toString()}`;
  }

  function enterDay1() {
    const el = root.querySelector('#zz-cine');
    try {
      sessionStorage.setItem('zzFromIntro', '1');
    } catch {
      /* ignore */
    }
    if (el) {
      el.classList.add('is-exit');
      setTimeout(() => navigate(day1Url()), 520);
    } else {
      navigate(day1Url());
    }
  }

  if (opts.hasSave) {
    showConfirm(root, {
      onCancel: () => hideCine(root),
      onConfirm: () => showIntro(root, 0, enterDay1, assetBase),
    });
  } else {
    showIntro(root, 0, enterDay1, assetBase);
  }
}

function ensureShell(root) {
  let el = root.querySelector('#zz-cine');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'zz-cine';
  el.className = 'zz-cine';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.innerHTML = `
    <div class="zz-cine__art" id="zz-cine-art" aria-hidden="true"></div>
    <div class="zz-cine__scrim" aria-hidden="true"></div>
    <button type="button" class="zz-cine__skip" id="zz-cine-skip" hidden>Saltar</button>
    <div class="zz-cine__frame" id="zz-cine-frame">
      <p class="zz-cine__line" id="zz-cine-line"></p>
      <p class="zz-cine__sub" id="zz-cine-sub" hidden></p>
      <ul class="zz-cine__pillars" id="zz-cine-pillars" hidden></ul>
      <div class="zz-cine__actions" id="zz-cine-actions"></div>
    </div>
  `;
  root.appendChild(el);
  return el;
}

function hideCine(root) {
  const el = root.querySelector('#zz-cine');
  if (el) {
    el.hidden = true;
    el.classList.remove('is-open', 'is-exit', 'zz-cine--confirm');
    el.classList.remove('zz-cine--collapse', 'zz-cine--refuge', 'zz-cine--mission');
  }
  document.body.classList.remove('zz-cine-open');
}

function openCine(root) {
  const el = ensureShell(root);
  el.hidden = false;
  el.classList.remove('is-exit');
  requestAnimationFrame(() => el.classList.add('is-open'));
  document.body.classList.add('zz-cine-open');
  return el;
}

function showConfirm(root, { onCancel, onConfirm }) {
  const el = openCine(root);
  el.classList.add('zz-cine--confirm');
  el.classList.remove('zz-cine--collapse', 'zz-cine--refuge', 'zz-cine--mission');
  const art = el.querySelector('#zz-cine-art');
  if (art) {
    art.style.backgroundImage = '';
    art.classList.remove('is-kenburns');
  }
  const skip = el.querySelector('#zz-cine-skip');
  if (skip) skip.hidden = true;
  const pillars = el.querySelector('#zz-cine-pillars');
  if (pillars) {
    pillars.hidden = true;
    pillars.innerHTML = '';
  }
  const sub = el.querySelector('#zz-cine-sub');
  if (sub) {
    sub.hidden = true;
    sub.textContent = '';
  }
  el.querySelector('#zz-cine-line').textContent = '¿Empezar de nuevo?';
  const frame = el.querySelector('#zz-cine-frame');
  let warn = frame.querySelector('.zz-cine__warn');
  if (!warn) {
    warn = document.createElement('p');
    warn.className = 'zz-cine__warn';
    frame.insertBefore(warn, el.querySelector('#zz-cine-actions'));
  }
  warn.hidden = false;
  warn.textContent =
    'Ya tienes una colonia en curso. Empezar de nuevo sustituirá esta partida.';

  const actions = el.querySelector('#zz-cine-actions');
  actions.innerHTML = '';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'zz-btn zz-btn--ghost zz-cine__btn';
  cancel.textContent = 'Cancelar';
  cancel.addEventListener('click', onCancel);
  const ok = document.createElement('button');
  ok.type = 'button';
  ok.className = 'zz-btn zz-btn--primary zz-cine__btn zz-cine__btn--danger';
  ok.textContent = 'Empezar de nuevo';
  ok.addEventListener('click', onConfirm);
  actions.append(cancel, ok);
}

function showIntro(root, index, onDone, assetBase) {
  const steps = INTRO_STEPS;
  const step = steps[index];
  if (!step) {
    onDone();
    return;
  }
  const el = openCine(root);
  el.classList.remove('zz-cine--confirm', 'zz-cine--collapse', 'zz-cine--refuge', 'zz-cine--mission');
  el.classList.add(`zz-cine--${step.layout}`);

  const art = el.querySelector('#zz-cine-art');
  if (art) {
    const url = `${assetBase.replace(/\/?$/, '/')}${step.art}`;
    art.style.backgroundImage = `url("${url}")`;
    art.classList.remove('is-kenburns');
    void art.offsetWidth;
    art.classList.add('is-kenburns');
  }

  const skip = el.querySelector('#zz-cine-skip');
  if (skip) {
    skip.hidden = false;
    skip.onclick = (e) => {
      e.stopPropagation();
      onDone();
    };
  }

  const warn = el.querySelector('.zz-cine__warn');
  if (warn) warn.hidden = true;

  const frame = el.querySelector('#zz-cine-frame');
  frame.classList.remove('zz-cine__frame--in');
  void frame.offsetWidth;
  frame.classList.add('zz-cine__frame--in');

  el.querySelector('#zz-cine-line').textContent = step.line || '';

  const sub = el.querySelector('#zz-cine-sub');
  if (step.sub) {
    sub.hidden = false;
    sub.textContent = step.sub;
  } else {
    sub.hidden = true;
    sub.textContent = '';
  }

  const pillars = el.querySelector('#zz-cine-pillars');
  if (step.pillars?.length) {
    pillars.hidden = false;
    pillars.innerHTML = step.pillars.map((p) => `<li>${p}</li>`).join('');
  } else {
    pillars.hidden = true;
    pillars.innerHTML = '';
  }

  const actions = el.querySelector('#zz-cine-actions');
  actions.innerHTML = '';
  const next = document.createElement('button');
  next.type = 'button';
  next.id = 'zz-cine-next';
  next.className = `zz-cine__next ${step.ctaClass || ''}`.trim();
  next.textContent = step.cta;
  next.setAttribute('aria-label', index >= steps.length - 1 ? 'Entrar en Zona Zero' : 'Siguiente');
  const go = () => {
    if (index >= steps.length - 1) onDone();
    else showIntro(root, index + 1, onDone, assetBase);
  };
  next.addEventListener('click', (e) => {
    e.stopPropagation();
    go();
  });
  actions.appendChild(next);

  // Escenas 1–2: tocar la imagen también avanza (ritmo de apertura)
  el.onclick = (e) => {
    if (index >= steps.length - 1) return;
    if (e.target.closest('#zz-cine-skip, #zz-cine-next, .zz-cine__btn')) return;
    go();
  };
}

export function markIntroSeen(state) {
  if (!state.flags) state.flags = {};
  state.flags.introSeen = true;
  if (state.flags.onboardingStep == null || state.flags.onboardingStep === 0) {
    state.flags.onboardingStep = 1;
  }
  state.flags.onboardingActive = false;
}

/** Fade-in del mundo tras la intro (play / harness). */
export function applyIntroArrival() {
  let from = false;
  try {
    from = sessionStorage.getItem('zzFromIntro') === '1';
    sessionStorage.removeItem('zzFromIntro');
  } catch {
    /* ignore */
  }
  if (!from) return;
  document.body.classList.add('zz-from-intro');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => document.body.classList.add('zz-from-intro-in'));
  });
}
