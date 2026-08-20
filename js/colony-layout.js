/**
 * Barrio de colonia: suelo + casitas/solares clicables.
 * Layout fijo por seed. Una celda de sim por hito.
 */
import { createRng, hashSeed } from './rng.js';
import { isCellBuildable, sectorForCell } from './sectors.js';

export const COLONY_LAYOUT_VERSION = 1;
/** Regenera árboles/pecios sin rehacer solares (partidas viejas). */
export const COLONY_PROPS_VERSION = 2;

export const LOT_TYPES = new Set([
  'farm',
  'greenhouse',
  'well',
  'cistern',
  'pump',
  'scrapyard',
  'sawmill',
]);

const DIM = {
  s: { rw: 2.9, rh: 2.15 },
  m: { rw: 3.7, rh: 2.75 },
  l: { rw: 4.8, rh: 3.5 },
  hq: { rw: 5.6, rh: 4.2 },
  lot: { rw: 3.5, rh: 2.45 },
};

/** Plantilla camp-local + celda de sim. Jitter leve por seed. */
const SLOT_TEMPLATES = [
  { id: 'hq', kind: 'hq', size: 'hq', lx: 0, ly: -1.6, cell: [7, 5], sector: 'core' },
  { id: 'h_nw', kind: 'house', size: 'm', lx: -15, ly: -9.5, cell: [4, 3], sector: 'core' },
  { id: 'h_n', kind: 'house', size: 'l', lx: 1.5, ly: -15.5, cell: [5, 3], sector: 'core' },
  { id: 'h_ne', kind: 'house', size: 'm', lx: 15.5, ly: -9, cell: [10, 3], sector: 'core' },
  { id: 'h_w', kind: 'house', size: 's', lx: -18.5, ly: 1.2, cell: [4, 5], sector: 'core' },
  { id: 'h_e', kind: 'house', size: 'm', lx: 18.5, ly: 0.5, cell: [10, 4], sector: 'core' },
  { id: 'h_sw', kind: 'house', size: 's', lx: -10.5, ly: 11.5, cell: [5, 7], sector: 'core' },
  { id: 'h_se', kind: 'house', size: 'm', lx: 11.5, ly: 11, cell: [8, 7], sector: 'core' },
  { id: 'h_s', kind: 'house', size: 's', lx: 0.5, ly: 8.5, cell: [7, 7], sector: 'core' },
  { id: 'h_midw', kind: 'house', size: 's', lx: -8.5, ly: -6.5, cell: [4, 4], sector: 'core' },
  { id: 'h_mide', kind: 'house', size: 's', lx: 9.5, ly: -5.5, cell: [9, 3], sector: 'core' },
  { id: 'lot_w', kind: 'lot', size: 'lot', lx: -17, ly: 10.5, cell: [4, 7], sector: 'core' },
  { id: 'lot_s', kind: 'lot', size: 'lot', lx: -3, ly: 16.5, cell: [6, 8], sector: 'core' },
  { id: 'lot_se', kind: 'lot', size: 'lot', lx: 7, ly: 16, cell: [8, 8], sector: 'core' },
  { id: 'lot_sw', kind: 'lot', size: 'lot', lx: -12, ly: 17.5, cell: [4, 8], sector: 'core' },
  { id: 'lot_e', kind: 'lot', size: 'lot', lx: 17, ly: 8.5, cell: [9, 4], sector: 'core' },
  { id: 'h_west2', kind: 'house', size: 'm', lx: -24, ly: -2, cell: [2, 4], sector: 'lot_west' },
  { id: 'h_west3', kind: 'house', size: 's', lx: -26, ly: 6, cell: [1, 5], sector: 'lot_west' },
  { id: 'lot_west', kind: 'lot', size: 'lot', lx: -22, ly: 4, cell: [3, 5], sector: 'lot_west' },
  { id: 'h_east2', kind: 'house', size: 'l', lx: 24, ly: -6, cell: [12, 3], sector: 'ruins_east' },
  { id: 'h_east3', kind: 'house', size: 's', lx: 26, ly: 2.5, cell: [13, 4], sector: 'ruins_east' },
  { id: 'lot_east', kind: 'lot', size: 'lot', lx: 21, ly: 5, cell: [12, 5], sector: 'ruins_east' },
  { id: 'h_north2', kind: 'house', size: 'm', lx: -8, ly: -22, cell: [5, 1], sector: 'yard_north' },
  { id: 'h_north3', kind: 'house', size: 's', lx: 8, ly: -21, cell: [8, 1], sector: 'yard_north' },
  { id: 'lot_north', kind: 'lot', size: 'lot', lx: 0, ly: -24, cell: [6, 0], sector: 'yard_north' },
  { id: 'h_south2', kind: 'house', size: 's', lx: -4, ly: 23, cell: [6, 10], sector: 'alley_south' },
  { id: 'lot_south2', kind: 'lot', size: 'lot', lx: 5, ly: 22.5, cell: [7, 9], sector: 'alley_south' },
  { id: 'lot_green', kind: 'lot', size: 'lot', lx: 16, ly: 18, cell: [11, 8], sector: 'green_se' },
  { id: 'h_green', kind: 'house', size: 'm', lx: 20, ly: 14, cell: [12, 7], sector: 'green_se' },
  { id: 'lot_scrap', kind: 'lot', size: 'lot', lx: -20, ly: 16, cell: [1, 8], sector: 'scrap_sw' },
];

export function useColonyMap() {
  return true;
}

export function slotKindForBuildingType(type) {
  if (!type) return 'house';
  if (String(type).startsWith('hq_')) return 'hq';
  if (LOT_TYPES.has(type)) return 'lot';
  return 'house';
}

export function slotFitsType(slot, type) {
  if (!slot || !type) return false;
  const need = slotKindForBuildingType(type);
  if (need === 'hq') return slot.kind === 'hq';
  return slot.kind === need;
}

function dimOf(slot) {
  return DIM[slot.size] || DIM.m;
}

export function generateColonyLayout(state) {
  const rng = createRng(hashSeed(`colony-layout:${state.seed || 's'}`));
  const slots = SLOT_TEMPLATES.map((t) => {
    const d = DIM[t.size] || DIM.m;
    const jitter = t.kind === 'hq' ? 0 : 0.85;
    return {
      id: t.id,
      kind: t.kind,
      size: t.size,
      sector: t.sector,
      cell: [...t.cell],
      lx: t.lx + rng.float(-jitter, jitter),
      ly: t.ly + rng.float(-jitter * 0.7, jitter * 0.7),
      rw: d.rw,
      rh: d.rh,
      buildingId: null,
    };
  });

  const { trees, wrecks } = scatterColonyProps(rng, slots);
  return { version: COLONY_LAYOUT_VERSION, propsVersion: COLONY_PROPS_VERSION, slots, trees, wrecks };
}

function scatterColonyProps(rng, slots, skipSlotIds = new Set()) {
  const trees = [];
  const wrecks = [];
  const occupied = slots.map((s) => ({ x: s.lx, y: s.ly, r: Math.max(s.rw, s.rh) + 1.4 }));
  const clear = (x, y, extra = 1.2) =>
    occupied.every((o) => Math.hypot(x - o.x, y - o.y) > o.r + extra) && Math.abs(y) > 2.2;

  const parkIds = new Set(['lot_se', 'lot_scrap']);
  for (const s of slots) {
    if (!parkIds.has(s.id) || skipSlotIds.has(s.id)) continue;
    const kind = s.id === 'lot_scrap' ? 'barrel' : 'vehicle';
    wrecks.push({ x: s.lx + rng.float(-0.4, 0.4), y: s.ly + rng.float(-0.3, 0.3), s: rng.float(0.95, 1.18), kind });
    occupied.push({ x: s.lx, y: s.ly, r: Math.max(s.rw, s.rh) + 0.4 });
  }

  for (let i = 0; i < 36 && trees.length < 16; i++) {
    const ang = rng.float(0, Math.PI * 2);
    const dist = rng.float(7, 34);
    const x = Math.cos(ang) * dist * 1.18;
    const y = Math.sin(ang) * dist * 0.84;
    if (!clear(x, y, 1.5)) continue;
    trees.push({ x, y, s: rng.float(0.72, 1.22) });
    occupied.push({ x, y, r: 1.9 * 0.85 });
  }
  for (let i = 0; i < 14 && wrecks.length < 6; i++) {
    const ang = rng.float(0, Math.PI * 2);
    const dist = rng.float(11, 28);
    const x = Math.cos(ang) * dist;
    const y = Math.sin(ang) * dist * 0.76;
    if (!clear(x, y, 2.1)) continue;
    wrecks.push({ x, y, s: rng.float(0.78, 1.12), kind: rng.chance(0.5) ? 'vehicle' : 'barrel' });
    occupied.push({ x, y, r: 2.1 });
  }
  return { trees, wrecks };
}

function propRadius(p, kind) {
  const s = p.s || 1;
  if (kind === 'tree') return 1.7 * s;
  if (kind === 'vehicle') return 2.35 * s;
  return 2.05 * s;
}

export function colonyBlockers(state) {
  const layout = state?.colonyLayout;
  const out = [];
  for (const t of layout?.trees || []) out.push({ x: t.x, y: t.y, r: propRadius(t, 'tree'), kind: 'tree' });
  for (const w of layout?.wrecks || []) {
    const kind = w.kind === 'vehicle' ? 'vehicle' : 'barrel';
    out.push({ x: w.x, y: w.y, r: propRadius(w, kind), kind });
  }
  return out;
}

export function pointBlockedByProp(state, x, y, extra = 0.85) {
  return colonyBlockers(state).some((b) => Math.hypot(x - b.x, y - b.y) < b.r + extra);
}

export function slotBlockedByProp(state, slot) {
  if (!slot) return false;
  const sr = Math.max(slot.rw || 2, slot.rh || 2) * 0.52;
  return colonyBlockers(state).some((b) => Math.hypot(slot.lx - b.x, slot.ly - b.y) < sr + b.r * 0.82);
}

export function slotById(state, id) {
  return (state.colonyLayout?.slots || []).find((s) => s.id === id) || null;
}

export function slotForCell(state, x, y) {
  return (state.colonyLayout?.slots || []).find((s) => s.cell[0] === x && s.cell[1] === y) || null;
}

export function slotForBuilding(state, b) {
  if (!b || !state.colonyLayout?.slots) return null;
  if (b.plotId) {
    const byId = slotById(state, b.plotId);
    if (byId) return byId;
  }
  if (String(b.type).startsWith('hq_')) {
    return state.colonyLayout.slots.find((s) => s.kind === 'hq') || null;
  }
  const byB = state.colonyLayout.slots.find((s) => s.buildingId === b.id);
  if (byB) return byB;
  return slotForCell(state, b.x, b.y);
}

export function buildingForSlot(state, slot) {
  if (!slot) return null;
  const blds = state.base?.buildings || [];
  if (slot.buildingId) {
    const byId = blds.find((b) => b.id === slot.buildingId && b.hp > 0);
    if (byId) return byId;
  }
  if (slot.kind === 'hq') {
    return blds.find((b) => b.hp > 0 && String(b.type).startsWith('hq_')) || null;
  }
  return (
    blds.find((b) => b.hp > 0 && b.plotId === slot.id) ||
    blds.find((b) => b.hp > 0 && b.x === slot.cell[0] && b.y === slot.cell[1]) ||
    null
  );
}

export function slotIsVacant(state, slot) {
  return !!slot && !buildingForSlot(state, slot);
}

export function slotIsUnlocked(state, slot) {
  if (!slot) return false;
  if (slot.kind === 'hq') return true;
  return isCellBuildable(state, slot.cell[0], slot.cell[1]);
}

export function vacantSlots(state, kind) {
  ensureColonyLayout(state);
  return (state.colonyLayout.slots || []).filter(
    (s) =>
      (!kind || s.kind === kind) &&
      slotIsVacant(state, s) &&
      slotIsUnlocked(state, s) &&
      !slotBlockedByProp(state, s)
  );
}

export function attachBuildingToSlot(state, building, slot) {
  if (!building || !slot) return;
  building.plotId = slot.id;
  building.x = slot.cell[0];
  building.y = slot.cell[1];
  slot.buildingId = building.id;
}

function syncOccupancy(state) {
  // Piloto Neni: x/y = ancla terreno canónica. NO reasignar a slots del layout antiguo
  // (eso apilaba edificios en celdas [7,5]/[8,8] cerca del HQ).
  if (state?.flags?.pilot === 'neni') {
    const slots = state.colonyLayout?.slots || [];
    slots.forEach((s) => {
      s.buildingId = null;
    });
    return;
  }
  const slots = state.colonyLayout?.slots || [];
  slots.forEach((s) => {
    s.buildingId = null;
  });
  const blds = (state.base?.buildings || []).filter((b) => b.hp > 0);
  const used = new Set();

  const take = (slot, b) => {
    if (!slot || used.has(slot.id)) return false;
    attachBuildingToSlot(state, b, slot);
    used.add(slot.id);
    return true;
  };

  for (const b of blds) {
    if (b.plotId) {
      const s = slots.find((x) => x.id === b.plotId);
      if (s && slotFitsType(s, b.type) && take(s, b)) continue;
    }
    if (String(b.type).startsWith('hq_')) {
      take(slots.find((x) => x.kind === 'hq'), b);
      continue;
    }
    const byCell = slotForCell(state, b.x, b.y);
    if (byCell && slotFitsType(byCell, b.type) && take(byCell, b)) continue;
    const kind = slotKindForBuildingType(b.type);
    const free = slots.find(
      (s) => s.kind === kind && !used.has(s.id) && !slotBlockedByProp(state, s)
    );
    take(free, b);
  }
}

export function ensureColonyLayout(state) {
  if (!state) return null;
  const ok =
    state.colonyLayout &&
    state.colonyLayout.version === COLONY_LAYOUT_VERSION &&
    Array.isArray(state.colonyLayout.slots) &&
    state.colonyLayout.slots.length >= 10;
  if (!ok) {
    state.colonyLayout = generateColonyLayout(state);
  } else {
    ensureColonyProps(state);
  }
  if (!state.flags) state.flags = {};
  if (!state.flags.colonyCamV2) {
    state.flags.colonyCamV2 = 1;
    const camp = state.zones?.find((z) => z.type === 'camp');
    if (camp) {
      state.mapCamera = state.mapCamera || {};
      state.mapCamera.x = camp.x;
      state.mapCamera.y = camp.y + 1.2;
      state.mapCamera.zoom = 1.08;
    }
  }
  syncOccupancy(state);
  return state.colonyLayout;
}

function ensureColonyProps(state) {
  const layout = state.colonyLayout;
  if (!layout) return;
  const fresh =
    layout.propsVersion === COLONY_PROPS_VERSION &&
    Array.isArray(layout.trees) &&
    layout.trees.length > 0 &&
    Array.isArray(layout.wrecks) &&
    layout.wrecks.length > 0;
  if (fresh) return;
  const rng = createRng(hashSeed(`colony-props-v2:${state.seed || 's'}`));
  const skip = new Set();
  for (const b of state.base?.buildings || []) {
    if (!(b.hp > 0)) continue;
    if (b.plotId) skip.add(b.plotId);
    const s = (layout.slots || []).find((x) => x.cell[0] === b.x && x.cell[1] === b.y);
    if (s) skip.add(s.id);
  }
  const planted = scatterColonyProps(rng, layout.slots || [], skip);
  layout.trees = planted.trees;
  layout.wrecks = planted.wrecks;
  layout.propsVersion = COLONY_PROPS_VERSION;
}

export function colonyFrame(camp) {
  const size = 86;
  const x = (camp?.x || 48) - size / 2;
  const y = (camp?.y || 62) - size / 2 - 4;
  return { x, y, size, cx: x + size / 2, cy: y + size / 2 };
}

export function plotLocalPoly(slot) {
  const { lx, ly, rw, rh } = slot;
  const w = rw || dimOf(slot).rw;
  const h = rh || dimOf(slot).rh;
  const steps = 10;
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2 - Math.PI / 2;
    pts.push([lx + Math.cos(a) * w, ly + Math.sin(a) * h]);
  }
  return pts;
}

export function sectorOfSlot(state, slot) {
  if (!slot) return null;
  return sectorForCell(state, slot.cell[0], slot.cell[1]);
}
