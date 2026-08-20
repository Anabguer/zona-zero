/**
 * Rutas de arte 1.3 — assets raster (WebP) + fallback SVG.
 * Base relativa al documento (play.php / harness).
 */
export const ART_BASE = new URL('../assets/art/', import.meta.url).href.replace(/\/$/, '') + '/';

export const BUILDING_ART = {
  // Vivienda v1: casita isométrica sobre tierra (sin fondo negro).
  shelter: 'buildings/dwelling-v1b.png',
  hq_central_l1: 'buildings/dwelling-v1b.png',
  hq_central_l2: 'buildings/dwelling-v1b.png',
  hq_central_l3: 'buildings/dwelling-v1b.png',
  house: 'buildings/dwelling-v1b.png',
  insulated_house: 'buildings/dwelling-v1b.png',
  kitchen: 'buildings/dwelling-v1b.png',
  block: 'buildings/dwelling-v1b.png',
  farm: 'buildings/farm-iso.png',
  greenhouse: 'buildings/farm-iso.png',
  well: 'buildings/well-iso.png',
  cistern: 'buildings/well-iso.png',
  workshop: 'buildings/workshop.webp',
  sawmill: 'buildings/workshop.webp',
  scrapyard: 'buildings/workshop.webp',
  mech_shop: 'buildings/workshop.webp',
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
  station: 'zones/station.webp',
};

/** Tipos con WebP propio (o alias comercial cercano). El resto → silueta ZZ-162. */
const ZONE_ART_TYPES = new Set(['supermarket', 'market', 'store', 'mall', 'hospital', 'station']);

export const FOG_ART = 'terrain/fog.webp';
export const TERRAIN_ART = 'terrain/city.webp';
/** Patio de colonia pintado (isométrico) — no foto aérea */
export const COLONY_YARD_ART = 'terrain/colony-yard.webp';
/** Patio circular ilustrado (fondo negro → blend lighten en mapa). */
export const COLONY_YARD_CLEAN_ART = 'terrain/colony-yard-clean.png';
/** Suelo colonia: tierra + hierba, sin carreteras ni props. */
export const COLONY_DIRT_ART = 'terrain/colony-iso-world-v3.png';
/** Ciudad isométrica PC (full-bleed, pan) */
export const CITY_ISO_ART = 'terrain/city-iso.png';
/** Mapa maestro A+B (4096x2720) — fondo del mundo con contrato de cámara real */
export const WORLD_MAP_ART = 'terrain/mapa-mundo-4096x2720.png';
/** Fondo del mundo piloto Neni (1819x865) — 1 unidad de mundo = 1 px a zoom=1 */
export const PILOT_WORLD_MAP_ART = 'terrain/mapa-neni-1819x865-brownmatch-up2x.png';

/**
 * Sprites aprobados piloto Neni (autoridad en ?pilot=neni).
 * NO sustituye BUILDING_ART del juego normal.
 * shelter: HOLD humano — no migrar todavía.
 */
export const PILOT_BUILDING_ART = {
  hq_central_l1: 'buildings/pilot/01-hq-5x4-matchcolor.png',
  hq_central_l2: 'buildings/pilot/01-hq-5x4-matchcolor.png',
  hq_central_l3: 'buildings/pilot/01-hq-5x4-matchcolor.png',
  house: 'buildings/pilot/01-house-4x2-matchcolor.png',
  well: 'buildings/pilot/01-well-2x1-matchcolor.png',
  storage: 'buildings/pilot/01-storage-5x3-matchcolor.png',
  workshop: 'buildings/pilot/01-workshop-5x2-matchcolor.png',
  farm: 'buildings/pilot/01-farm-3x2-matchcolor.png',
  infirmary: 'buildings/pilot/01-infirmary-4x3-matchcolor.png',
  sawmill: 'buildings/pilot/01-sawmill-5x3-matchcolor.png',
  greenhouse: 'buildings/pilot/01-greenhouse-4x3.png',
  kitchen: 'buildings/pilot/01-kitchen-4x2.png',
  cistern: 'buildings/pilot/01-cistern-2x2.png',
  scrapyard: 'buildings/pilot/01-scrapyard-5x3-matchcolor.png',
  medkit: 'buildings/pilot/01-medkit-2x2.png',
  radio: 'buildings/pilot/01-radio-3x2-matchcolor.png',
};

/** Tipos con PNG piloto aprobado (listos para revisar en QA). */
export function pilotApprovedArtTypes() {
  return new Set(
    Object.keys(PILOT_BUILDING_ART).filter((id) => !String(id).startsWith('hq_') || id === 'hq_central_l1')
  );
}

/** ¿Hay asset piloto para este tipo? */
export function hasPilotBuildingArt(type) {
  if (!type) return false;
  const key = String(type).startsWith('hq_') ? 'hq_central_l1' : type;
  return !!PILOT_BUILDING_ART[key];
}

/** Decoración de colonia (árboles / pecios) — sprites, no pintados en el suelo. */
export const PROP_ART = {
  tree: 'props/tree-dead.png',
  vehicle: 'props/car-wreck.png',
  barrel: 'props/scrap-pile.png',
};

export function propArtUrl(kind) {
  return artUrl(PROP_ART[kind] || PROP_ART.tree);
}

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

export function artUrl(rel) {
  if (!rel) return null;
  return ART_BASE + rel.replace(/^\//, '');
}

export function buildingArtUrl(type) {
  return artUrl(BUILDING_ART[type] || BUILDING_ART.storage);
}

/** Solo asset piloto si existe; sin fallback al arte normal. */
export function pilotBuildingArtUrl(type) {
  if (!type) return null;
  const key = String(type).startsWith('hq_') ? 'hq_central_l1' : type;
  const rel = PILOT_BUILDING_ART[key];
  return rel ? artUrl(rel) : null;
}

/**
 * Arte para UI/mapa en piloto: autoridad PILOT_BUILDING_ART.
 * Juego normal: BUILDING_ART.
 */
export function uiBuildingArtUrl(state, type) {
  if (state?.flags?.pilot === 'neni') {
    const pilot = pilotBuildingArtUrl(type);
    if (pilot) return pilot;
    return null;
  }
  return buildingArtUrl(type);
}

export function zoneArtUrl(zone) {
  const key = zone?.type || zone?.id || '';
  if (ZONE_ART_TYPES.has(key) && ZONE_ART[key]) return artUrl(ZONE_ART[key]);
  const name = String(zone?.name || '').toLowerCase();
  if (name.includes('super') || name.includes('mercado') || name.includes('mall')) return artUrl(ZONE_ART.supermarket);
  if (name.includes('hospital') && !name.includes('farmac')) return artUrl(ZONE_ART.hospital);
  if (name.includes('estación') || name.includes('estacion') || name.includes('andén')) return artUrl(ZONE_ART.station);
  return null;
}

export function portraitArtUrl(explorer) {
  const seed = explorer?.portraitSeed ?? explorer?.id ?? '';
  let h = 0;
  for (let i = 0; i < String(seed).length; i++) h = (h * 31 + String(seed).charCodeAt(i)) >>> 0;
  return artUrl(h % 2 === 0 ? PORTRAIT_ART.m : PORTRAIT_ART.f);
}
