/**
 * Catálogo v1 — edificios retirados del contrato 2.8 (sin electricidad).
 * Migración save: generator/solar/power_plant → storage (js/state.js).
 * NO reintroducir energy/electricidad.
 */
export const V1_REMOVED_BUILDING_IDS = Object.freeze(['generator', 'solar', 'power_plant']);

const REMOVED = new Set(V1_REMOVED_BUILDING_IDS);

/** ¿Se puede construir / listar en partida nueva v1? */
export function isV1PlayableBuilding(idOrDef) {
  const id = typeof idOrDef === 'string' ? idOrDef : idOrDef?.id;
  if (!id) return false;
  if (REMOVED.has(id)) return false;
  if (idOrDef && typeof idOrDef === 'object') {
    if (idOrDef.playable === false || idOrDef.v1Removed === true) return false;
  }
  return true;
}

/** Lista jugable desde content.buildings */
export function playableBuildingDefs(buildings) {
  return Object.values(buildings || {}).filter((b) => isV1PlayableBuilding(b));
}

export function assertNoElectricBuildingsInCatalog(buildings) {
  const hits = Object.keys(buildings || {}).filter((id) => REMOVED.has(id));
  return hits;
}
