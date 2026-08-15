/**
 * ZZ-012 — Tutorial contextual D1 (§31.4) sobre el mundo 2.8 / ZZ-019A.
 * Una pista a la vez; avanza al completar la acción; sin cascada Continuar.
 * Asume: landscape · mundo > viewport · superficies edificables · ghost · snap · ✓/✕.
 */
export const GUIDE_STEPS = [
  {
    id: 'need_food',
    text:
      'Las reservas no durarán. Abrí Construir: en el Núcleo recuperado veréis superficies edificables (áreas, no huecos fijos). Colocá un huerto en una de ellas.',
    highlight: 'build',
    suggestBuild: 'farm',
    wait: 'hasFarm',
  },
  {
    id: 'staff_farm',
    text: 'El huerto no produce solo. Tocadlo y asignad a alguien.',
    wait: 'farmStaffed',
  },
  {
    id: 'need_water',
    text:
      'También hace falta agua. Otro pozo en una superficie del Núcleo — podéis elegir otra zona o la misma área si cabe.',
    highlight: 'build',
    suggestBuild: 'well',
    wait: 'hasWell',
  },
  {
    id: 'staff_well',
    text: 'Asignad un trabajador al pozo.',
    wait: 'wellStaffed',
  },
  {
    id: 'ready',
    text:
      'El refugio empieza a producir. Arrastrá el mapa o usad zoom si queréis mirar alrededor; cuando estéis listos, avanzad el día.',
    highlight: 'advance',
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

/** Tras mini-intro: activar coach contextual (sin welcome Continuar). */
export function activateWorldCoach(state) {
  if (!state.flags) state.flags = {};
  state.flags.introSeen = true;
  state.flags.onboardingDone = false;
  state.flags.onboardingActive = true;
  state.flags.onboardingStep = 0;
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
  if (state.flags.onboardingDone || !state.flags.onboardingActive) return false;
  let changed = false;
  for (let guard = 0; guard < 8; guard++) {
    const i = state.flags.onboardingStep || 0;
    const step = GUIDE_STEPS[i];
    if (!step) {
      dismissOnboarding(state);
      changed = true;
      break;
    }
    // Paso final sin wait: permanece hasta avanzar día
    if (!step.wait) break;
    if (!stepWaitMet(state, step.wait)) break;
    state.flags.onboardingStep = i + 1;
    changed = true;
    if (state.flags.onboardingStep >= GUIDE_STEPS.length) {
      dismissOnboarding(state);
      break;
    }
  }
  return changed;
}

/**
 * Solo acciones de UI (abrir construir). Nunca avanza la guía por «Continuar».
 */
export function advanceOnboarding(state) {
  ensureOnboarding(state);
  const st = onboardingStatus(state);
  if (!st) return { kind: 'finish' };
  if (st.step.highlight === 'build') return { kind: 'action', action: 'openBuild' };
  if (st.step.highlight === 'advance') return { kind: 'noop' };
  return { kind: 'noop' };
}

export function dismissOnboarding(state) {
  state.flags.onboardingDone = true;
  state.flags.onboardingActive = false;
}

export function markGuideDayAdvanced(state) {
  if (!state.flags) state.flags = {};
  state.flags.guideDayAdvanced = true;
  if (state.flags.onboardingActive) dismissOnboarding(state);
}

export function markGuideExplored(state) {
  if (!state.flags) state.flags = {};
  state.flags.guideExplored = true;
}

export function suggestedBuildType(state) {
  const st = onboardingStatus(state);
  return st?.step?.suggestBuild || null;
}

/**
 * Texto coach efectivo (2.8): superficies + ghost + snap invisible + ✓/✕ + pan fuera del fantasma.
 */
export function coachMessage(state) {
  const st = onboardingStatus(state);
  if (!st) return null;
  if (state.buildMode && (st.step.wait === 'hasFarm' || st.step.wait === 'hasWell')) {
    return 'Movéd el fantasma por la superficie marcada. El encaje es invisible: confirmá con ✓ o cancelá con ✕. Fuera del fantasma podéis arrastrar el mapa.';
  }
  return st.step.text;
}
