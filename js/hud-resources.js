/**
 * Recursos visibles en HUD superior (ZZ-013).
 * D1: comida/agua/madera siempre legibles. Nunca fuel/ammo/oro en la barra.
 * B01 v1: fuel y munición fuera del HUD también en QA piloto (decisión de producto).
 * La lógica interna de fuel/ammo sigue viva; solo desaparecen de la presentación.
 */

export function hudResourceKeys(state) {
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
  // Prohibido en HUD: fuel, ammo, energy, gold (Au/Gu legado)
  return keys.filter((k) => !['fuel', 'ammo', 'energy', 'gold', 'au', 'gu'].includes(k));
}
