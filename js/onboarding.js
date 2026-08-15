/**
 * Onboarding jugable 1.3 — enseña tocando el mundo (sin tutorial pesado).
 */
export const ONBOARDING_STEPS = [
  {
    id: 'refuge',
    text: 'Este es tu refugio. Tocá el mapa y acercate: ahí vive tu colonia.',
    focus: 'camp',
  },
  {
    id: 'resources',
    text: 'Arriba ves comida, agua y materiales. Sin ellos la colonia muere.',
    focus: 'hud',
  },
  {
    id: 'need_food',
    text: 'Necesitamos comida. Pulsá Construir y colocá un Huerto en el refugio.',
    focus: 'build',
    wait: 'hasFarm',
  },
  {
    id: 'staff_farm',
    text: 'El huerto no produce solo. Tocá el Huerto en el mapa y asigná un trabajador.',
    focus: 'farm',
    wait: 'farmStaffed',
  },
  {
    id: 'need_water',
    text: 'Ahora el agua. Construí un Pozo y asignale personal.',
    focus: 'build',
    wait: 'wellStaffed',
  },
  {
    id: 'explore',
    text: 'Hay un supermercado cercano. Tocá esa zona del mapa y enviá a tu explorador.',
    focus: 'zone',
    wait: 'explored',
  },
  {
    id: 'done',
    text: 'Ya sabés lo esencial: tocar el mundo, construir, asignar y explorar. El resto lo descubriréis sobreviviendo.',
    focus: null,
  },
];

export function ensureOnboarding(state) {
  if (!state.flags) state.flags = {};
  if (state.flags.onboardingDone) return;
  if (state.flags.onboardingStep == null) {
    state.flags.onboardingStep = 0;
    state.flags.onboardingActive = true;
  }
}

export function onboardingStatus(state, content) {
  ensureOnboarding(state);
  if (state.flags.onboardingDone || !state.flags.onboardingActive) return null;
  const step = ONBOARDING_STEPS[state.flags.onboardingStep] || null;
  if (!step) return null;
  return { step, index: state.flags.onboardingStep, total: ONBOARDING_STEPS.length };
}

function hasType(state, types) {
  return (state.base?.buildings || []).some((b) => types.includes(b.type) && b.hp > 0);
}
function staffed(state, types) {
  return (state.base?.buildings || []).some((b) => types.includes(b.type) && b.hp > 0 && (b.workers || 0) > 0);
}

export function checkOnboardingProgress(state) {
  ensureOnboarding(state);
  if (state.flags.onboardingDone) return false;
  const i = state.flags.onboardingStep || 0;
  const step = ONBOARDING_STEPS[i];
  if (!step?.wait) return false;
  const ok =
    (step.wait === 'hasFarm' && hasType(state, ['farm', 'greenhouse'])) ||
    (step.wait === 'farmStaffed' && staffed(state, ['farm', 'greenhouse'])) ||
    (step.wait === 'wellStaffed' && staffed(state, ['well', 'cistern'])) ||
    (step.wait === 'explored' && ((state.stats?.expeditions || 0) > 0 || (state.expeditions || []).length > 0));
  if (ok) {
    state.flags.onboardingStep = i + 1;
    if (state.flags.onboardingStep >= ONBOARDING_STEPS.length - 1) {
      /* stay on last until dismiss */
    }
    return true;
  }
  return false;
}

export function advanceOnboarding(state) {
  ensureOnboarding(state);
  const i = state.flags.onboardingStep || 0;
  if (i >= ONBOARDING_STEPS.length - 1) {
    state.flags.onboardingDone = true;
    state.flags.onboardingActive = false;
    return;
  }
  // Solo avanzar manualmente pasos sin wait (o el final)
  const step = ONBOARDING_STEPS[i];
  if (!step.wait || i === 0 || i === 1) {
    state.flags.onboardingStep = i + 1;
  }
  if (state.flags.onboardingStep >= ONBOARDING_STEPS.length - 1 && step?.id === 'done') {
    state.flags.onboardingDone = true;
    state.flags.onboardingActive = false;
  }
}

export function dismissOnboarding(state) {
  state.flags.onboardingDone = true;
  state.flags.onboardingActive = false;
}
