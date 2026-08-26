/**
 * ZZ-012 — Tutorial contextual D1 (§31.4 / GAME_MASTER Apéndice H).
 * Una pista a la vez; avanza al completar la acción; sin cascada Continuar.
 * Piloto Neni: superficies válidas + ghost + ✓ (sin solares/ruinas).
 */

export const GUIDE_STEPS = [
  {
    id: 'need_food',
    text: 'Somos 3 y las reservas no durarán para siempre. Abre Construir y elige un Huerto.',
    highlight: 'build',
    suggestBuild: 'farm',
    wait: 'hasFarm',
  },
  {
    id: 'staff_farm',
    text: 'El huerto no produce solo. Tócalo y asigna al menos 1 trabajador.',
    wait: 'farmStaffed',
  },
  {
    id: 'see_day',
    text: 'Ya producimos comida. Veamos si alcanza: avanza el día.',
    highlight: 'advance',
    wait: 'dayAdvanced',
  },
  {
    id: 'need_water',
    text: 'También necesitamos una fuente estable de agua. Abre Construir y elige un Pozo.',
    highlight: 'build',
    suggestBuild: 'well',
    wait: 'hasWell',
  },
  {
    id: 'staff_well',
    text: 'Asigna un trabajador al pozo.',
    wait: 'wellStaffed',
  },
  {
    id: 'need_wood',
    text: 'La madera ampliará este refugio. Con metal y madera ya pagados, construye un Aserradero.',
    highlight: 'build',
    suggestBuild: 'sawmill',
    wait: 'hasSawmill',
  },
  {
    id: 'staff_sawmill',
    text: 'Asigna un trabajador al aserradero para que caigan troncos.',
    wait: 'sawmillStaffed',
  },
  {
    id: 'need_metal',
    text: 'El metal llega de la chatarra. Construye una Chatarrería (si falta metal, una expedición cercana puede traerlo).',
    highlight: 'build',
    suggestBuild: 'scrapyard',
    wait: 'hasScrapyard',
  },
  {
    id: 'staff_scrapyard',
    text: 'Asigna 1 trabajador a la Chatarrería: sin personal produce 0 metal.',
    wait: 'scrapyardStaffedOrNoHands',
  },
  {
    id: 'ready',
    text: 'Comida, agua y materiales en marcha. Sigue la franja de objetivo de arriba y avanza el día cuando estés listo.',
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
  delete state.flags.guideDayAdvanced;
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
  if (wait === 'dayAdvanced') return !!state.flags?.guideDayAdvanced;
  if (wait === 'hasWell') return hasType(state, ['well']);
  if (wait === 'wellStaffed') return staffed(state, ['well']);
  if (wait === 'hasSawmill') return hasType(state, ['sawmill']);
  if (wait === 'sawmillStaffed') return staffed(state, ['sawmill']);
  if (wait === 'hasScrapyard') return hasType(state, ['scrapyard', 'workshop', 'mech_shop']);
  // B2 revisión: exigir staffing SOLO si hay manos libres; si no, el paso se resuelve solo
  // (la ficha ya avisa «Sin personal — no produce» y el objetivo reaparecerá al crecer).
  if (wait === 'scrapyardStaffedOrNoHands') {
    return staffed(state, ['scrapyard']) || (state.population?.labor?.idle || 0) === 0;
  }
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
    // Paso final sin wait: permanece hasta avanzar día (markGuideDayAdvanced)
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
  if (st.step.highlight === 'build') return { kind: 'noop' };
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
  const i = state.flags.onboardingStep || 0;
  const step = GUIDE_STEPS[i];
  // Paso final (ready, sin wait): cerrar guía al avanzar día.
  // En see_day (wait dayAdvanced) NO cerrar — checkOnboardingProgress avanza a agua.
  if (step && !step.wait && state.flags.onboardingActive) {
    dismissOnboarding(state);
  }
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
 * Texto coach efectivo: superficies + ghost + ✓/✕ + pan fuera del fantasma.
 */
export function coachMessage(state) {
  const st = onboardingStatus(state);
  if (!st) return null;
  const pilot = state?.flags?.pilot === 'neni';
  // Paso adaptable: sin manos libres no se exige staffing imposible (B2 revisión).
  if (st.step.id === 'staff_scrapyard' && (state.population?.labor?.idle || 0) === 0) {
    return 'Ahora no hay manos libres: la Chatarrería empezará a producir en cuanto la colonia crezca.';
  }
  if (state.buildMode && st.step.suggestBuild) {
    if (pilot) {
      return 'Mueve el fantasma a una zona válida (verde) y confirma con ✓.';
    }
    return 'Coloca el edificio en un sitio válido y confirma con ✓. Arrastra el mapa para mirar alrededor.';
  }
  return st.step.text;
}
