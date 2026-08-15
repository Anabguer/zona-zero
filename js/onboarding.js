/**
 * Guía D1 — una acción, una explicación.
 * Tras el intro, la UI lleva al jugador (sin cascada de Continuar).
 */
export const GUIDE_STEPS = [
  {
    id: 'welcome',
    text: 'Este es vuestro refugio. Un puñado de supervivientes en medio de la ciudad muerta.',
    cta: 'Empezar',
    advance: 'next',
  },
  {
    id: 'build_farm',
    text: 'Necesitamos comida y agua. Construye un huerto.',
    cta: null,
    highlight: 'build',
    wait: 'hasFarm',
  },
  {
    id: 'staff_farm',
    text: 'El huerto necesita gente. Tócalo para asignar un trabajador.',
    cta: null,
    wait: 'farmStaffed',
  },
  {
    id: 'build_well',
    text: 'Ahora el agua. Construye un pozo.',
    cta: null,
    highlight: 'build',
    wait: 'hasWell',
  },
  {
    id: 'staff_well',
    text: 'Asigna un trabajador al pozo.',
    cta: null,
    wait: 'wellStaffed',
  },
  {
    id: 'ready',
    text: 'El refugio empieza a funcionar. Cuando queráis, avanzad el día.',
    cta: null,
    wait: null,
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
  return false;
}

/** Conservado por compat; no revela nada en D1. */
export function maybeRevealEarlyLandmarks(state) {
  if (!state?.zones || (state.day || 1) < 3) return false;
  if (state.flags?.earlyLandmarksRevealed) return false;
  const market = state.zones.find((z) => z.id === 'market' || z.type === 'supermarket');
  if (market && market.state === 'unknown') market.state = 'discovered';
  state.flags = state.flags || {};
  state.flags.earlyLandmarksRevealed = true;
  return true;
}

export function checkOnboardingProgress(state) {
  ensureOnboarding(state);
  if (state.flags.onboardingDone) return false;
  let changed = false;
  for (let guard = 0; guard < 8; guard++) {
    const i = state.flags.onboardingStep || 0;
    const step = GUIDE_STEPS[i];
    if (!step) {
      dismissOnboarding(state);
      changed = true;
      break;
    }
    // Paso final sin wait: permanece hasta que el jugador avance el día o cierre
    if (!step.wait) break;
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
  if (step.highlight === 'build') return { kind: 'action', action: 'openBuild' };
  return { kind: 'noop' };
}

export function dismissOnboarding(state) {
  state.flags.onboardingDone = true;
  state.flags.onboardingActive = false;
}

export function markGuideDayAdvanced(state) {
  if (!state.flags) state.flags = {};
  state.flags.guideDayAdvanced = true;
  // Al avanzar día tras el tutorial D1, cerrar guía
  if (state.flags.onboardingActive) dismissOnboarding(state);
}

export function markGuideExplored(state) {
  if (!state.flags) state.flags = {};
  state.flags.guideExplored = true;
}
