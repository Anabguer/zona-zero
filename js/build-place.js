/**
 * ZZ-019 — colocación semilibre + snap invisible (§9.2 / §9.6).
 * Piloto Neni: autoridad = neni-pilot-zones-v3 (terrain cells), una sola conversión WORLD↔celda.
 */
import { isCellBuildable, ensureSectors, sectorForCell } from './sectors.js';
import { canAfford } from './sim.js';
import {
  isPilotNeni,
  pilotFootprint,
  footprintFits,
  cellOccupiedByBuilding,
  validPilotAnchors,
  footprintWorldRect,
  footprintsOverlap,
} from './pilot-footprints.js';
import {
  getPilotZoneMap,
  worldToTerrainCell,
  terrainCellToWorld,
  terrainFootprintWorldRect,
  logPilotPlaceDebug,
} from './pilot-terrain.js';

// Piloto Neni: cellPx canónico del mapa de zonas (no el grid base).
export const CELL_WORLD_SIZE_PILOT = 24;

export function settlementScale(state) {
  if (state?.flags?.pilot === 'neni') {
    return CELL_WORLD_SIZE_PILOT;
  }
  const day = state.day || 1;
  const wide =
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(min-width: 900px)').matches;
  if (day <= 2) return wide ? 4.6 : 4.3;
  if (day <= 5) return 3.6;
  return 2.95;
}

export function cellToWorld(state, camp, cx, cy) {
  if (isPilotNeni(state)) {
    const tl = terrainCellToWorld(cx, cy);
    return {
      x: tl.x + tl.cellPx / 2,
      y: tl.y + tl.cellPx / 2,
      scale: tl.cellPx,
    };
  }
  const scale = settlementScale(state);
  const bw = state.base?.w || 10;
  const bh = state.base?.h || 8;
  return {
    x: camp.x + (cx - bw / 2 + 0.5) * scale,
    y: camp.y + (cy - bh / 2 + 0.5) * scale,
    scale,
  };
}

export function worldToCell(state, camp, wx, wy) {
  if (isPilotNeni(state)) {
    const { cx, cy, cellPx } = worldToTerrainCell(wx, wy);
    return { x: cx, y: cy, scale: cellPx };
  }
  const scale = settlementScale(state);
  const bw = state.base?.w || 10;
  const bh = state.base?.h || 8;
  const lx = wx - camp.x;
  const ly = wy - camp.y;
  const x = Math.round(lx / scale + bw / 2 - 0.5);
  const y = Math.round(ly / scale + bh / 2 - 0.5);
  return { x, y, scale };
}

/** Rect mundo del footprint de un edificio anclado en (ax, ay). */
export function pilotFootprintRect(state, camp, type, ax, ay) {
  const fp = pilotFootprint(type);
  if (!fp) return null;
  const scale = settlementScale(state);
  return footprintWorldRect(state, camp, ax, ay, fp.w, fp.h, scale);
}

export function isCellFree(state, x, y) {
  if (isPilotNeni(state)) {
    return !cellOccupiedByBuilding(state, x, y);
  }
  return !(state.base?.buildings || []).some((b) => b.hp > 0 && b.x === x && b.y === y);
}

export function freeBuildableCells(state) {
  ensureSectors(state);
  const out = [];
  const w = state.base?.w || 0;
  const h = state.base?.h || 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (isCellBuildable(state, x, y) && isCellFree(state, x, y)) out.push([x, y]);
    }
  }
  return out;
}

/** ¿Puede confirmarse el ghost aquí? (sin pagar aún) */
export function ghostPlacementOk(state, content, type, x, y) {
  const def = content?.buildings?.[type];
  if (!def) return { ok: false, reason: 'Tipo desconocido' };

  if (isPilotNeni(state)) {
    const fp = pilotFootprint(type);
    if (!fp) return { ok: false, reason: 'Edificio no disponible en piloto' };
    if (!getPilotZoneMap()) return { ok: false, reason: 'Mapa de zonas no cargado' };
    if (!footprintFits(state, type, x, y)) {
      return { ok: false, reason: 'Terreno no válido o footprint solapado' };
    }
    if (!(state.flags?.pilotTestMode || state.flags?.pilotQaMode) && !canAfford(state, def.cost)) {
      return { ok: false, reason: 'Recursos insuficientes' };
    }
    const count = (state.base.buildings || []).filter((b) => b.type === type && b.hp > 0).length;
    if (def.max != null && count >= def.max) return { ok: false, reason: 'Límite de este edificio' };
    return { ok: true };
  }

  if (x < 0 || y < 0 || x >= state.base.w || y >= state.base.h) {
    return { ok: false, reason: 'Fuera de la base' };
  }
  if (!isCellBuildable(state, x, y)) {
    const sec = sectorForCell(state, x, y);
    if (sec?.status === 'recovered') return { ok: false, reason: 'Terreno no edificable (camino/ruina)' };
    return { ok: false, reason: 'Terreno no recuperado' };
  }
  if (!isCellFree(state, x, y)) return { ok: false, reason: 'Celda ocupada' };
  if (!canAfford(state, def.cost)) return { ok: false, reason: 'Recursos insuficientes' };
  const count = (state.base.buildings || []).filter((b) => b.type === type && b.hp > 0).length;
  if (def.max != null && count >= def.max) return { ok: false, reason: 'Límite de este edificio' };
  return { ok: true };
}

export function defaultGhostCell(state) {
  // Piloto Neni: primer ancla válida cerca del HQ (terreno canónico).
  if (isPilotNeni(state) && state?.buildMode) {
    const anchors = validPilotAnchors(state, null, state.buildMode);
    if (!anchors.length) return null;
    const hq = (state.base?.buildings || []).find((b) => String(b.type).startsWith('hq_') && b.hp > 0);
    anchors.sort((a, b) => {
      const da = hq ? Math.abs(a.x - hq.x) + Math.abs(a.y - hq.y) : 0;
      const db = hq ? Math.abs(b.x - hq.x) + Math.abs(b.y - hq.y) : 0;
      return da - db;
    });
    const fp = pilotFootprint(state.buildMode);
    const pick =
      anchors.find((a) => {
        if (!hq || !fp) return true;
        const hqFp = pilotFootprint(hq.type);
        if (!hqFp) return true;
        return !footprintsOverlap(a.x, a.y, fp.w, fp.h, hq.x, hq.y, hqFp.w, hqFp.h);
      }) || anchors[0];
    return { x: pick.x, y: pick.y };
  }
  const free = freeBuildableCells(state);
  if (!free.length) return null;
  const hq = (state.base?.buildings || []).find((b) => String(b.type).startsWith('hq_') && b.hp > 0);
  if (!hq) return { x: free[0][0], y: free[0][1] };
  free.sort((a, b) => Math.abs(a[0] - hq.x) + Math.abs(a[1] - hq.y) - (Math.abs(b[0] - hq.x) + Math.abs(b[1] - hq.y)));
  const pick = free.find(([x, y]) => !(x === hq.x && y === hq.y)) || free[0];
  return { x: pick[0], y: pick[1] };
}

export function ensureBuildGhost(state) {
  if (state.uiMode !== 'build' || !state.buildMode) {
    state.buildGhost = null;
    return null;
  }
  if (
    state.buildGhost &&
    Number.isFinite(state.buildGhost.x) &&
    Number.isFinite(state.buildGhost.y)
  ) {
    return state.buildGhost;
  }
  const d = defaultGhostCell(state);
  state.buildGhost = d ? { x: d.x, y: d.y } : null;
  return state.buildGhost;
}

export function setBuildGhostCell(state, x, y) {
  let gx = Math.round(x);
  let gy = Math.round(y);
  if (isPilotNeni(state) && state.buildMode) {
    // Sin clamp al grid base artificial — el ghost recorre todo el mapa permitido.
    const map = getPilotZoneMap();
    if (map?.bounds) {
      const fp = pilotFootprint(state.buildMode);
      const fw = fp?.w || 1;
      const fh = fp?.h || 1;
      gx = Math.max(map.bounds.minX, Math.min(map.bounds.maxX - fw + 1, gx));
      gy = Math.max(map.bounds.minY, Math.min(map.bounds.maxY - fh + 1, gy));
    }
    state.buildGhost = { x: gx, y: gy };
    return state.buildGhost;
  }
  const w = state.base?.w || 0;
  const h = state.base?.h || 0;
  state.buildGhost = {
    x: Math.max(0, Math.min(w - 1, gx)),
    y: Math.max(0, Math.min(h - 1, gy)),
  };
  return state.buildGhost;
}

export function snapGhostToWorld(state, camp, wx, wy) {
  const { x, y } = worldToCell(state, camp, wx, wy);
  // Piloto: centrar el footprint en el punto tocado (anchor = top-left terreno).
  if (isPilotNeni(state) && state.buildMode) {
    const fp = pilotFootprint(state.buildMode);
    if (fp) {
      const ax = x - Math.floor(fp.w / 2);
      const ay = y - Math.floor(fp.h / 2);
      const ghost = setBuildGhostCell(state, ax, ay);
      const rect = terrainFootprintWorldRect(ghost.x, ghost.y, fp.w, fp.h);
      logPilotPlaceDebug('ghost-snap', {
        pointerWorld: { x: wx, y: wy },
        terrainUnderPointer: { x, y },
        ghostAnchor: { x: ghost.x, y: ghost.y },
        ghostWorldTL: { x: rect.x, y: rect.y },
        ghostWorldCenter: { x: rect.cx, y: rect.cy - rect.h / 2 },
      });
      return ghost;
    }
  }
  return setBuildGhostCell(state, x, y);
}

export function clearBuildMode(state) {
  state.buildMode = null;
  state.uiMode = state.uiMode === 'build' ? null : state.uiMode;
  state.buildGhost = null;
}
