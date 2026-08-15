/**
 * ZZ-008 — Confirmación Nueva partida + mini-intro cinemática (≤3 pasos).
 * Pantallas full-bleed: no modales de formulario, no prompt/confirm nativos.
 */

export const DEFAULT_COLONY_NAME = 'Refugio Norte';

export const INTRO_STEPS = [
  {
    id: 'aftermath',
    motif: 'ash',
    kicker: 'El colapso',
    title: 'El mundo se quedó en silencio',
    body: 'Algo rompió la ciudad. Quedan ruinas, escasez… y quienes todavía resisten.',
  },
  {
    id: 'colony',
    motif: 'colony',
    kicker: 'La colonia',
    title: 'Este es vuestro refugio',
    body: 'Un puñado de supervivientes. Dependen de vosotros para no caer.',
  },
  {
    id: 'purpose',
    motif: 'horizon',
    kicker: 'La misión',
    title: 'Sobrevivir no basta',
    body: 'Estabilizad el refugio. Explorad lo que queda. Recuperad territorio, paso a paso.',
  },
];

/**
 * @param {HTMLElement} root
 * @param {{
 *   hasSave?: boolean,
 *   playUrl?: string,
 *   colonyName?: string,
 *   onEnterDay1?: (url: string) => void,
 * }} opts
 */
export function startNewGameFlow(root, opts = {}) {
  const playUrl = opts.playUrl || 'play.php';
  const colonyName = opts.colonyName || DEFAULT_COLONY_NAME;
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
    // serve estático reescribe .html y pierde ?query — hash sí sobrevive
    if (/harness/i.test(base)) {
      return `${base}#${q.toString()}`;
    }
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}${q.toString()}`;
  }

  function enterDay1() {
    navigate(day1Url());
  }

  if (opts.hasSave) {
    showConfirm(root, {
      onCancel: () => hideCine(root),
      onConfirm: () => showIntro(root, 0, enterDay1),
    });
  } else {
    showIntro(root, 0, enterDay1);
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
    <div class="zz-cine__veil" aria-hidden="true"></div>
    <div class="zz-cine__motif" data-motif="ash" aria-hidden="true"></div>
    <button type="button" class="zz-cine__skip" id="zz-cine-skip" hidden>Saltar intro</button>
    <div class="zz-cine__stage">
      <p class="zz-cine__kicker" id="zz-cine-kicker"></p>
      <h2 class="zz-cine__title" id="zz-cine-title"></h2>
      <p class="zz-cine__body" id="zz-cine-body"></p>
      <div class="zz-cine__dots" id="zz-cine-dots" hidden></div>
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
    el.classList.remove('is-open');
  }
  document.body.classList.remove('zz-cine-open');
}

function openCine(root) {
  const el = ensureShell(root);
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('is-open'));
  document.body.classList.add('zz-cine-open');
  return el;
}

function showConfirm(root, { onCancel, onConfirm }) {
  const el = openCine(root);
  const motif = el.querySelector('.zz-cine__motif');
  if (motif) motif.dataset.motif = 'warn';
  const skip = el.querySelector('#zz-cine-skip');
  if (skip) skip.hidden = true;
  const dots = el.querySelector('#zz-cine-dots');
  if (dots) dots.hidden = true;
  el.querySelector('#zz-cine-kicker').textContent = 'Nueva partida';
  el.querySelector('#zz-cine-title').textContent = '¿Empezar de nuevo?';
  el.querySelector('#zz-cine-body').textContent =
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

function showIntro(root, index, onDone) {
  const steps = INTRO_STEPS;
  const step = steps[index];
  if (!step) {
    onDone();
    return;
  }
  const el = openCine(root);
  const motif = el.querySelector('.zz-cine__motif');
  if (motif) motif.dataset.motif = step.motif;
  const skip = el.querySelector('#zz-cine-skip');
  if (skip) {
    skip.hidden = false;
    skip.onclick = () => onDone();
  }
  const stage = el.querySelector('.zz-cine__stage');
  stage.classList.remove('zz-cine__stage--in');
  void stage.offsetWidth;
  stage.classList.add('zz-cine__stage--in');

  el.querySelector('#zz-cine-kicker').textContent = step.kicker;
  el.querySelector('#zz-cine-title').textContent = step.title;
  el.querySelector('#zz-cine-body').textContent = step.body;

  const dots = el.querySelector('#zz-cine-dots');
  dots.hidden = false;
  dots.innerHTML = steps
    .map(
      (_, i) =>
        `<span class="zz-cine__dot${i === index ? ' is-on' : ''}" aria-hidden="true"></span>`
    )
    .join('');

  const actions = el.querySelector('#zz-cine-actions');
  actions.innerHTML = '';
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'zz-btn zz-btn--primary zz-cine__btn zz-cine__btn--hero';
  const last = index >= steps.length - 1;
  next.textContent = last ? 'Entrar al Día 1' : 'Seguir';
  next.addEventListener('click', () => {
    if (last) onDone();
    else showIntro(root, index + 1, onDone);
  });
  actions.appendChild(next);
}

export function markIntroSeen(state) {
  if (!state.flags) state.flags = {};
  state.flags.introSeen = true;
  // Evita cascada «Continuar» de bienvenida. El tutorial contextual es ZZ-012.
  if (state.flags.onboardingStep == null || state.flags.onboardingStep === 0) {
    state.flags.onboardingStep = 1;
  }
  state.flags.onboardingActive = false;
}
