/**
 * Piloto Neni — footprints lógicos (celdas terreno 24px).
 * Aprobados (human gate): ver PILOT_FOOTPRINTS.
 * Provisionales: PILOT_TEST_FOOTPRINTS (no construibles en QA hasta arte nuevo).
 *
 * Autoridad espacial en piloto: content/pilot/neni-pilot-zones-v3.json
 * (NO el grid base 14×12 / 28×20 ni coords relativas a camp).
 */
import { isCellBuildable, ensureSectors } from './sectors.js';
import {
  getPilotZoneMap,
  isTerrainBuildable,
  terrainFootprintBuildable,
  terrainFootprintWorldRect,
} from './pilot-terrain.js';

/** Footprints aprobados (celdas lógicas w×h). No dependen de PILOT_SPRITE_SCALE. */
export const PILOT_FOOTPRINTS = {
  hq_central_l1: { w: 5, h: 4 },
  hq_central_l2: { w: 5, h: 4 },
  hq_central_l3: { w: 5, h: 4 },
  house: { w: 4, h: 2 },
  well: { w: 2, h: 1 },
  storage: { w: 5, h: 3 },
  workshop: { w: 5, h: 2 },
  farm: { w: 3, h: 2 },
  infirmary: { w: 4, h: 3 },
  sawmill: { w: 5, h: 3 },
  greenhouse: { w: 4, h: 3 },
  kitchen: { w: 4, h: 2 },
  cistern: { w: 2, h: 2 },
  scrapyard: { w: 5, h: 3 },
  medkit: { w: 2, h: 2 },
  radio: { w: 3, h: 2 },
};

/** HOLD humano — footprint de lote-3, no aprobado para construir en QA. */
export const PILOT_HOLD_FOOTPRINTS = {
  shelter: { w: 3, h: 2 },
};

/** Footprints provisionales — no construibles en QA (sin PNG piloto). */
export const PILOT_TEST_FOOTPRINTS = {
  insulated_house: { w: 4, h: 2 },
  block: { w: 5, h: 3 },
  mech_shop: { w: 5, h: 2 },
  clinic: { w: 5, h: 3 },
  barricade: { w: 2, h: 1 },
  fence: { w: 3, h: 1 },
  watchtower: { w: 2, h: 2 },
  armory: { w: 4, h: 2 },
  bunker: { w: 5, h: 3 },
  expedition_center: { w: 4, h: 3 },
  garage: { w: 5, h: 3 },
  command: { w: 4, h: 3 },
  tech_bench: { w: 3, h: 2 },
  lab: { w: 4, h: 3 },
};

/** Aprobados para construcción canónica / QA “Listos para revisar”. */
export const PILOT_BUILDABLE_TYPES = new Set(
  Object.keys(PILOT_FOOTPRINTS).filter((id) => !String(id).startsWith('hq_'))
);

/** Tipos construibles en QA: solo footprints aprobados (sin HQ; HQ ya anclado). */
export function pilotQaReadyTypes() {
  return new Set([...PILOT_BUILDABLE_TYPES]);
}

/** Tipos construibles en modo pruebas legado (aprobados + provisionales). */
export function pilotTestBuildableTypes() {
  return new Set([
    ...Object.keys(PILOT_FOOTPRINTS),
    ...Object.keys(PILOT_HOLD_FOOTPRINTS),
    ...Object.keys(PILOT_TEST_FOOTPRINTS),
  ]);
}

export function isPilotNeni(state) {
  return state?.flags?.pilot === 'neni';
}

export function isPilotTestMode(state) {
  return isPilotNeni(state) && !!(state?.flags?.pilotTestMode || state?.flags?.pilotQaMode);
}

export function pilotFootprint(type) {
  if (!type) return null;
  if (PILOT_FOOTPRINTS[type]) return PILOT_FOOTPRINTS[type];
  if (String(type).startsWith('hq_')) return PILOT_FOOTPRINTS.hq_central_l1;
  if (PILOT_HOLD_FOOTPRINTS[type]) return PILOT_HOLD_FOOTPRINTS[type];
  if (PILOT_TEST_FOOTPRINTS[type]) return PILOT_TEST_FOOTPRINTS[type];
  return null;
}

/** ¿Aprobado para construir en QA (arte + footprint)? HQ no se elige en lista. */
export function isPilotQaReadyBuilding(type) {
  if (!type || String(type).startsWith('hq_')) return false;
  return !!PILOT_FOOTPRINTS[type];
}

/** Celdas ocupadas por un footprint anclado en (ax, ay). */
export function footprintCellList(ax, ay, fw, fh) {
  const out = [];
  for (let dy = 0; dy < fh; dy++) {
    for (let dx = 0; dx < fw; dx++) {
      out.push([ax + dx, ay + dy]);
    }
  }
  return out;
}

/**
 * Rect en píxeles de mundo (top-left + tamaño). Anchor = celda superior-izquierda.
 * Piloto: celda terreno canónica (origin 932,136 / cellPx 24). Ignora camp/base grid.
 */
export function footprintWorldRect(state, camp, ax, ay, fw, fh, scale) {
  if (isPilotNeni(state)) {
    return terrainFootprintWorldRect(ax, ay, fw, fh);
  }
  const bw = state.base?.w || 10;
  const bh = state.base?.h || 8;
  const x = camp.x + (ax - bw / 2) * scale;
  const y = camp.y + (ay - bh / 2) * scale;
  return {
    x,
    y,
    w: fw * scale,
    h: fh * scale,
    scale,
    cx: x + (fw * scale) / 2,
    cy: y + fh * scale,
  };
}

export function footprintForBuilding(state, building) {
  if (!building) return null;
  return pilotFootprint(building.type);
}

/** ¿La celda (cx,cy) está dentro del footprint de algún edificio vivo? */
export function cellOccupiedByBuilding(state, cx, cy, ignoreBuildingId = null) {
  for (const b of state.base?.buildings || []) {
    if (!b || b.hp <= 0 || b.id === ignoreBuildingId) continue;
    const fp = pilotFootprint(b.type);
    if (!fp) continue;
    if (cx >= b.x && cx < b.x + fp.w && cy >= b.y && cy < b.y + fp.h) return true;
  }
  return false;
}

/**
 * Celda edificable en piloto = semantic buildable del JSON canónico.
 * Juego normal: superficies / sectores.
 */
export function pilotCellBuildable(state, x, y) {
  if (!isPilotNeni(state)) return isCellBuildable(state, x, y);
  return isTerrainBuildable(x, y);
}

/** ¿El footprint completo cabe (todas las celdas buildable) y no colisiona? */
export function footprintFits(state, type, ax, ay, ignoreBuildingId = null) {
  const fp = pilotFootprint(type);
  if (!fp) return false;
  if (isPilotNeni(state)) {
    if (!getPilotZoneMap()) return false;
    if (!terrainFootprintBuildable(ax, ay, fp.w, fp.h)) return false;
    for (const [cx, cy] of footprintCellList(ax, ay, fp.w, fp.h)) {
      if (cellOccupiedByBuilding(state, cx, cy, ignoreBuildingId)) return false;
    }
    return true;
  }
  const bw = state.base?.w || 0;
  const bh = state.base?.h || 0;
  if (ax < 0 || ay < 0 || ax + fp.w > bw || ay + fp.h > bh) return false;
  ensureSectors(state);
  for (const [cx, cy] of footprintCellList(ax, ay, fp.w, fp.h)) {
    if (!pilotCellBuildable(state, cx, cy)) return false;
    if (cellOccupiedByBuilding(state, cx, cy, ignoreBuildingId)) return false;
  }
  return true;
}

/** ¿Dos footprints se solapan? */
export function footprintsOverlap(ax1, ay1, fw1, fh1, ax2, ay2, fw2, fh2) {
  return ax1 < ax2 + fw2 && ax1 + fw1 > ax2 && ay1 < ay2 + fh2 && ay1 + fh1 > ay2;
}

/** Posiciones anchor válidas para un tipo en el piloto (malla terreno canónica). */
export function validPilotAnchors(state, content, type) {
  if (!isPilotNeni(state)) return [];
  const fp = pilotFootprint(type);
  const map = getPilotZoneMap();
  if (!fp || !map) return [];
  const out = [];
  const { minX, minY, maxX, maxY } = map.bounds;
  for (let y = minY; y <= maxY - fp.h + 1; y++) {
    for (let x = minX; x <= maxX - fp.w + 1; x++) {
      if (footprintFits(state, type, x, y)) out.push({ x, y });
    }
  }
  return out;
}

/** Posiciones debug: HQ en anchor real + Casa/Pozo/Almacén en anclas válidas separadas. */
export function pilotDebugFootprintPlacements(state, camp) {
  const hq = (state.base?.buildings || []).find((b) => String(b.type).startsWith('hq_') && b.hp > 0);
  const hqAnchor = hq ? { type: hq.type, x: hq.x, y: hq.y } : { type: 'hq_central_l1', x: -7, y: 14 };
  const used = [{ ...hqAnchor, fp: pilotFootprint(hqAnchor.type) }];
  const picks = [{ ...hqAnchor, label: 'HQ 5×4' }];
  const map = getPilotZoneMap();
  if (!map) return picks;

  for (const spec of [
    { type: 'house', label: 'Casa 4×2' },
    { type: 'well', label: 'Pozo 2×1' },
    { type: 'storage', label: 'Almacén 5×3' },
  ]) {
    const fp = pilotFootprint(spec.type);
    let best = null;
    let bestScore = Infinity;
    const { minX, minY, maxX, maxY } = map.bounds;
    for (let y = minY; y <= maxY - fp.h + 1; y++) {
      for (let x = minX; x <= maxX - fp.w + 1; x++) {
        if (!footprintFits(state, spec.type, x, y)) continue;
        const overlaps = used.some(
          (u) => u.fp && footprintsOverlap(x, y, fp.w, fp.h, u.x, u.y, u.fp.w, u.fp.h)
        );
        if (overlaps) continue;
        const score = Math.abs(x - hqAnchor.x) + Math.abs(y - hqAnchor.y);
        if (score < bestScore) {
          bestScore = score;
          best = { type: spec.type, x, y, label: spec.label };
        }
      }
    }
    if (best) {
      picks.push(best);
      used.push({ ...best, fp });
    }
  }
  return picks;
}
