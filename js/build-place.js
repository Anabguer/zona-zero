/**
 * ZZ-019 — colocación semilibre + snap invisible (§9.2 / §9.6).
 */
import { isCellBuildable, ensureSectors, sectorForCell } from './sectors.js';
import { canAfford } from './sim.js';

export function settlementScale(state) {
  const day = state.day || 1;
  const wide =
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(min-width: 900px)').matches;
  if (day <= 2) return wide ? 4.6 : 4.3;
  if (day <= 5) return 3.6;
  return 2.95;
}

export function cellToWorld(state, camp, cx, cy) {
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
  const scale = settlementScale(state);
  const bw = state.base?.w || 10;
  const bh = state.base?.h || 8;
  const lx = wx - camp.x;
  const ly = wy - camp.y;
  const x = Math.round(lx / scale + bw / 2 - 0.5);
  const y = Math.round(ly / scale + bh / 2 - 0.5);
  return { x, y, scale };
}

export function isCellFree(state, x, y) {
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
  const free = freeBuildableCells(state);
  if (!free.length) return null;
  const hq = (state.base?.buildings || []).find((b) => String(b.type).startsWith('hq_') && b.hp > 0);
  if (!hq) return { x: free[0][0], y: free[0][1] };
  free.sort((a, b) => Math.abs(a[0] - hq.x) + Math.abs(a[1] - hq.y) - (Math.abs(b[0] - hq.x) + Math.abs(b[1] - hq.y)));
  // Preferir vecino cercano pero no la misma celda del HQ
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
  const w = state.base?.w || 0;
  const h = state.base?.h || 0;
  state.buildGhost = {
    x: Math.max(0, Math.min(w - 1, Math.round(x))),
    y: Math.max(0, Math.min(h - 1, Math.round(y))),
  };
  return state.buildGhost;
}

export function snapGhostToWorld(state, camp, wx, wy) {
  const { x, y } = worldToCell(state, camp, wx, wy);
  return setBuildGhostCell(state, x, y);
}

export function clearBuildMode(state) {
  state.buildMode = null;
  state.uiMode = state.uiMode === 'build' ? null : state.uiMode;
  state.buildGhost = null;
}
