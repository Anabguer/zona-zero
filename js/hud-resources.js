/**
 * Recursos visibles en HUD superior (ZZ-013).
 * D1: comida/agua/madera siempre legibles. Nunca fuel/ammo/oro en la barra.
 * Excepción: ?pilot=neni modo pruebas — muestra recursos reales para auditoría.
 */

export function hudResourceKeys(state) {
  // QA piloto: auditoría con stock completo. Piloto normal: mismo contrato D1 que el juego.
  if (state?.flags?.pilot === 'neni' && state?.flags?.pilotQaMode) {
    return ['food', 'water', 'wood', 'metal', 'medicine', 'fuel', 'ammo'];
  }

  const day = state.day || 1;
  const guideOn = !!(state.flags?.onboardingActive && !state.flags?.onboardingDone);
  const keys = ['food', 'water', 'wood'];
  if (day >= 2 || state.uiMode === 'build' || state.buildMode || !guideOn) {
    if (!keys.includes('metal')) keys.push('metal');
  }
  if (
    day >= 3 &&
    ((state.explorers || []).some((e) => e.status === 'wounded' || (e.wounds || 0) > 0) ||
      day >= 4 ||
      (state.resources.medicine || 0) < 2)
  ) {
    if (!keys.includes('medicine')) keys.push('medicine');
  }
  // Prohibido en HUD normal: fuel, ammo, energy, gold (Au/Gu legado)
  return keys.filter((k) => !['fuel', 'ammo', 'energy', 'gold', 'au', 'gu'].includes(k));
}
