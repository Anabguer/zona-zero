/**
 * Rutas de arte 1.3 — assets raster (WebP) + fallback SVG.
 * Base relativa al documento (play.php / harness).
 */
export const ART_BASE = new URL('../assets/art/', import.meta.url).href.replace(/\/$/, '') + '/';

export const BUILDING_ART = {
  // HQ = edificio ancla sólido (shelter.webp). Refugio improvisado = misma base hasta arte propio.
  // camp-d1.webp es viñeta circular: NO usarlo como sprite de mapa (recrea parche/GIS).
  shelter: 'buildings/shelter.webp',
  hq_central_l1: 'buildings/shelter.webp',
  hq_central_l2: 'buildings/house.webp',
  hq_central_l3: 'buildings/house.webp',
  house: 'buildings/house.webp',
  farm: 'buildings/farm.webp',
  greenhouse: 'buildings/farm.webp',
  well: 'buildings/well.webp',
  cistern: 'buildings/well.webp',
  workshop: 'buildings/workshop.webp',
  sawmill: 'buildings/workshop.webp',
  storage: 'buildings/storage.webp',
  infirmary: 'buildings/infirmary.webp',
  clinic: 'buildings/infirmary.webp',
  medkit: 'buildings/infirmary.webp',
  barricade: 'buildings/defense.webp',
  fence: 'buildings/defense.webp',
  watchtower: 'buildings/defense.webp',
  wall: 'buildings/defense.webp',
  bunker: 'buildings/defense.webp',
  camp_d1: 'buildings/camp-d1.webp',
};

export const ZONE_ART = {
  supermarket: 'zones/supermarket.webp',
  market: 'zones/supermarket.webp',
  store: 'zones/supermarket.webp',
  mall: 'zones/supermarket.webp',
  hospital: 'zones/hospital.webp',
  pharmacy: 'zones/hospital.webp',
  clinic_zone: 'zones/hospital.webp',
  station: 'zones/station.webp',
  gas_station: 'zones/station.webp',
};

export const FOG_ART = 'terrain/fog.webp';

export const PORTRAIT_ART = {
  m: 'portraits/explorer-m.webp',
  f: 'portraits/explorer-f.webp',
};

export const RES_ART = {
  food: 'ui/food.webp',
  water: 'ui/water.webp',
  wood: 'ui/wood.webp',
  metal: 'ui/metal.webp',
  medicine: 'ui/medicine.webp',
  fuel: 'ui/fuel.webp',
  ammo: 'ui/ammo.webp',
  pop: 'ui/pop.webp',
};

export const TERRAIN_ART = 'terrain/city.webp';

export function artUrl(rel) {
  if (!rel) return null;
  return ART_BASE + rel.replace(/^\//, '');
}

export function buildingArtUrl(type) {
  return artUrl(BUILDING_ART[type] || BUILDING_ART.storage);
}

export function zoneArtUrl(zone) {
  const key = zone?.type || zone?.id || '';
  if (ZONE_ART[key]) return artUrl(ZONE_ART[key]);
  const name = String(zone?.name || '').toLowerCase();
  if (name.includes('super') || name.includes('mercado') || name.includes('mall')) return artUrl(ZONE_ART.supermarket);
  if (name.includes('hospital') || name.includes('farmac')) return artUrl(ZONE_ART.hospital);
  if (name.includes('estación') || name.includes('estacion') || name.includes('andén') || name.includes('sur'))
    return artUrl(ZONE_ART.station);
  return null;
}

export function portraitArtUrl(explorer) {
  const seed = explorer?.portraitSeed ?? explorer?.id ?? '';
  let h = 0;
  for (let i = 0; i < String(seed).length; i++) h = (h * 31 + String(seed).charCodeAt(i)) >>> 0;
  return artUrl(h % 2 === 0 ? PORTRAIT_ART.m : PORTRAIT_ART.f);
}
