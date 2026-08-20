/**
 * Compat: el barrio vive en colony-layout.js.
 */
export {
  useColonyMap as usePaintedCity,
  ensureColonyLayout,
  slotById,
  slotForBuilding as plotForBuilding,
  slotForCell as plotForCell,
  buildingForSlot as plotBuilding,
  slotIsVacant,
  vacantSlots,
  attachBuildingToSlot,
  colonyFrame as paintedCityFrame,
  plotLocalPoly,
  COLONY_LAYOUT_VERSION,
} from './colony-layout.js';

export const CITY_ISO_SIZE = 86;
export const CITY_PLOTS = [];

export function plotHasBuilding(state, plot) {
  return false;
}
export function plotFreeCell() {
  return null;
}
export function plotCentroid(plot) {
  return [plot?.lx || 0, plot?.ly || 0];
}
