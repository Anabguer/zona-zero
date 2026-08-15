/**
 * Guía por hitos D1–D5 — aprender haciendo.
 * Prioridad UI: evento/decisión > brief > guía > sheet.
 */
export const GUIDE_STEPS = [
  {
    id: 'welcome',
    text: 'Este es vuestro refugio. Un puñado de supervivientes en medio de la ciudad muerta.',
    cta: 'Continuar',
    advance: 'next',
  },
  {
    id: 'needs',
    text: 'Arriba veis población, comida y agua. Cada día se consume. Sin comida o agua, la colonia muere.',
    cta: 'Continuar',
    advance: 'next',
  },
  {
    id: 'build_farm',
    text: 'Necesitamos comida. Construid un Huerto en el refugio.',
    cta: 'Construir huerto',
    action: 'openBuild',
    wait: 'hasFarm',
  },
  {
    id: 'staff_farm',
    text: 'El huerto no produce solo. Tocad el Huerto y asignad un trabajador.',
    cta: null,
    wait: 'farmStaffed',
  },
  {
    id: 'build_well',
    text: 'Ahora el agua. Construid un Pozo.',
    cta: 'Construir pozo',
    action: 'openBuild',
    wait: 'hasWell',
  },
  {
    id: 'staff_well',
    text: 'Asignad un trabajador al Pozo.',
    cta: null,
    wait: 'wellStaffed',
  },
  {
    id: 'first_day',
    text: 'Ya producís. Avanzad el día para ver qué se produce y qué se consume.',
    cta: 'Avanzar día',
    action: 'advanceDay',
    wait: 'day2',
  },
  {
    id: 'wait_scout',
    text: 'Mañana alguien avistará movimiento al norte. Sobrevivid un día más.',
    cta: 'Avanzar día',
    action: 'advanceDay',
    wait: 'day3',
  },
  {
    id: 'explore',
    text: 'Ha aparecido un lugar en la ciudad. Tocad el Supermercado Norte y enviad a vuestro explorador.',
    cta: 'Ver supermercado',
    action: 'focusMarket',
    wait: 'explored',
  },
  {
    id: 'done',
    text: 'Ya sabéis lo esencial: construir, asignar, avanzar el día y explorar. El resto lo descubriréis sobreviviendo.',
    cta: 'Empezar a jugar',
    advance: 'finish',
  },
];

export const ONBOARDING_STEPS = GUIDE_STEPS;

export function ensureOnboarding(state) {
  if (!state.flags) state.flags = {};
  if (state.flags.onboardingDone) return;
  if (state.flags.onboardingStep == null) {
    state.flags.onboardingStep = 0;
    state.flags.onboardingActive = true;
  }
}

export function onboardingStatus(state) {
  ensureOnboarding(state);
  if (state.flags.onboardingDone || !state.flags.onboardingActive) return null;
  const i = state.flags.onboardingStep || 0;
  const step = GUIDE_STEPS[i];
  if (!step) return null;
  return { step, index: i, total: GUIDE_STEPS.length };
}

function hasType(state, types) {
  return (state.base?.buildings || []).some((b) => types.includes(b.type) && b.hp > 0);
}
function staffed(state, types) {
  return (state.base?.buildings || []).some((b) => types.includes(b.type) && b.hp > 0 && (b.workers || 0) > 0);
}

function stepWaitMet(state, wait) {
  if (!wait) return true;
  if (wait === 'hasFarm') return hasType(state, ['farm', 'greenhouse']);
  if (wait === 'farmStaffed') return staffed(state, ['farm', 'greenhouse']);
  if (wait === 'hasWell') return hasType(state, ['well', 'cistern']);
  if (wait === 'wellStaffed') return staffed(state, ['well', 'cistern']);
  if (wait === 'day2') return (state.day || 1) >= 2 || !!state.flags?.guideDayAdvanced;
  if (wait === 'day3') return (state.day || 1) >= 3;
  if (wait === 'explored')
    return (state.stats?.expeditions || 0) > 0 || (state.expeditions || []).length > 0 || !!state.flags?.guideExplored;
  return false;
}

/** En D3 revela el primer lugar cercano (supermercado) de forma natural. */
export function maybeRevealEarlyLandmarks(state) {
  if (!state?.zones || (state.day || 1) < 3) return false;
  if (state.flags?.earlyLandmarksRevealed) return false;
  const market = state.zones.find((z) => z.id === 'market' || z.type === 'supermarket');
  let changed = false;
  if (market && market.state === 'unknown') {
    market.state = 'discovered';
    changed = true;
  }
  // Un segundo lugar lejano sigue oculto; solo el ancla de exploración temprana
  state.flags = state.flags || {};
  state.flags.earlyLandmarksRevealed = true;
  return changed;
}

export function checkOnboardingProgress(state) {
  ensureOnboarding(state);
  if (state.flags.onboardingDone) return false;
  maybeRevealEarlyLandmarks(state);
  let changed = false;
  for (let guard = 0; guard < 8; guard++) {
    const i = state.flags.onboardingStep || 0;
    const step = GUIDE_STEPS[i];
    if (!step?.wait) break;
    if (!stepWaitMet(state, step.wait)) break;
    state.flags.onboardingStep = i + 1;
    changed = true;
    if (state.flags.onboardingStep >= GUIDE_STEPS.length) {
      state.flags.onboardingDone = true;
      state.flags.onboardingActive = false;
      break;
    }
  }
  return changed;
}

export function advanceOnboarding(state) {
  ensureOnboarding(state);
  const i = state.flags.onboardingStep || 0;
  const step = GUIDE_STEPS[i];
  if (!step) {
    dismissOnboarding(state);
    return { kind: 'finish' };
  }
  if (step.advance === 'finish' || i >= GUIDE_STEPS.length - 1) {
    dismissOnboarding(state);
    return { kind: 'finish' };
  }
  if (step.advance === 'next' && !step.wait) {
    state.flags.onboardingStep = i + 1;
    checkOnboardingProgress(state);
    return { kind: 'next' };
  }
  if (step.action) return { kind: 'action', action: step.action };
  return { kind: 'noop' };
}

export function dismissOnboarding(state) {
  state.flags.onboardingDone = true;
  state.flags.onboardingActive = false;
}

export function markGuideDayAdvanced(state) {
  if (!state.flags) state.flags = {};
  state.flags.guideDayAdvanced = true;
}

export function markGuideExplored(state) {
  if (!state.flags) state.flags = {};
  state.flags.guideExplored = true;
}
