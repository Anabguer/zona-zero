/**
 * ZZ-018 / ZZ-019A — Sectores orgánicos + superficies edificables.
 * Geometría irregular en coords de mapa. SECTOR ≠ PARCELA (§9.4 2.8).
 * Escala: mundo > viewport móvil — sectores NO caben todos a la vez.
 */
import { clamp } from './util.js';

/** Escala celda→mapa alineada con render D1 (~4.3) */
export const SECTOR_CELL_SCALE = 4.25;

export const COMPONENT_LABEL = {
  debris: 'Escombros densos',
  heavy_wreck: 'Estructuras / vehículos pesados',
  blocked_access: 'Acceso bloqueado',
  hostiles: 'Amenaza residual',
  unsafe_perimeter: 'Perímetro inseguro',
  explore_local: 'Zona poco reconocida',
};

/** Unión de celdas de superficies (+ opcionales estructura). */
function unionCells(...lists) {
  const seen = new Set();
  const out = [];
  lists.flat().forEach((c) => {
    const k = `${c[0]},${c[1]}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push([c[0], c[1]]);
  });
  return out;
}

/**
 * Núcleo 2.8: mundo primero (carretera E–W + resto norte),
 * luego superficies disjuntas A/B/C + pad HQ.
 * HQ spawn = (7,5) en grid 14×12.
 */
function coreSurfacesAndStructure() {
  const surfA = {
    id: 'explanada_oeste',
    name: 'Explanada oeste',
    cells: [
      [4, 3],
      [5, 3],
      [4, 4],
      [5, 4],
      [4, 5],
      [5, 5],
    ],
  };
  const surfB = {
    id: 'explanada_este',
    name: 'Explanada este',
    cells: [
      [9, 3],
      [10, 3],
      [9, 4],
      [10, 4],
    ],
  };
  const surfC = {
    id: 'patio_sur',
    name: 'Patio sur',
    cells: [
      [4, 7],
      [5, 7],
      [6, 7],
      [7, 7],
      [8, 7],
      [4, 8],
      [5, 8],
      [6, 8],
      [7, 8],
      [8, 8],
    ],
  };
  const surfHq = {
    id: 'nucleo_hq',
    name: 'Plataforma del refugio',
    cells: [[7, 5]],
  };
  // Estructura del mundo (NO edificable): carretera E–W + resto norte + borde
  const structure = [
    [6, 5],
    [8, 5],
    [6, 4],
    [7, 4],
    [8, 4],
    [6, 3],
    [7, 3],
    [8, 3],
    [6, 6],
    [7, 6],
    [8, 6],
  ];
  const surfaces = [surfA, surfB, surfC, surfHq];
  const cells = unionCells(...surfaces.map((s) => s.cells), structure);
  return { surfaces, cells, structure };
}

function singleSurfaceFromCells(id, cells) {
  return [{ id, name: id, cells: cells.map((c) => [...c]) }];
}

/**
 * Offsets en unidades de mapa (camp-local).
 * Núcleo compacto y legible; vecinos lejos → pan obligatorio en 844×390.
 */
function sectorBlueprints() {
  const core = coreSurfacesAndStructure();
  const bps = [
    {
      id: 'core',
      name: 'Sector Núcleo',
      identity: 'El claro donde resistimos el primer día.',
      gain: 'Suelo inicial para el refugio y primeras construcciones.',
      adjacent: ['lot_west', 'ruins_east', 'alley_south', 'yard_north'],
      status: 'recovered',
      polyOff: [
        [-7.5, -5.5],
        [-3.0, -8.0],
        [4.5, -7.0],
        [8.5, -2.5],
        [7.0, 4.5],
        [1.5, 7.5],
        [-4.5, 6.5],
        [-8.5, 1.5],
      ],
      components: [],
      surfaces: core.surfaces,
      cells: core.cells,
      structureCells: core.structure,
    },
    {
      id: 'lot_west',
      name: 'Aparcamiento ruinoso',
      identity: 'Asfalto agrietado y coches calcinados al oeste.',
      gain: 'Suelo alargado — buen sitio para huertos o almacenes en fila.',
      adjacent: ['core', 'scrap_sw', 'yard_north'],
      status: 'locked',
      polyOff: [
        [-28.0, -6.0],
        [-12.0, -7.5],
        [-10.5, 3.5],
        [-13.0, 9.0],
        [-27.5, 8.0],
        [-30.5, 1.0],
        [-29.0, -4.0],
      ],
      components: [
        { type: 'heavy_wreck', days: 2, labor: 2, wood: 4, metal: 6 },
        { type: 'debris', days: 1, labor: 1 },
      ],
      cells: [
        [1, 3],
        [1, 4],
        [1, 5],
        [1, 6],
        [2, 3],
        [2, 4],
        [2, 5],
        [2, 6],
        [3, 4],
        [3, 5],
      ],
    },
    {
      id: 'ruins_east',
      name: 'Parcela entre ruinas',
      identity: 'Hueco irregular entre muros derruidos al este.',
      gain: 'Espacio compacto, protegido por muros muertos.',
      adjacent: ['core', 'green_se', 'yard_north'],
      status: 'locked',
      polyOff: [
        [10.0, -8.0],
        [20.0, -11.0],
        [27.5, -5.0],
        [26.0, 3.0],
        [18.5, 7.5],
        [11.0, 6.0],
        [9.5, -0.5],
        [14.0, -4.0],
        [11.5, -6.5],
      ],
      components: [
        { type: 'debris', days: 2, labor: 2 },
        { type: 'blocked_access', days: 1, labor: 1, wood: 3 },
      ],
      cells: [
        [11, 2],
        [12, 2],
        [13, 2],
        [11, 3],
        [12, 3],
        [13, 3],
        [11, 4],
        [12, 4],
        [13, 4],
        [12, 5],
        [13, 5],
      ],
    },
    {
      id: 'alley_south',
      name: 'Callejón sur',
      identity: 'Pasillo estrecho tras la valla rota.',
      gain: 'Franja larga — ideal para defensas o camino.',
      adjacent: ['core', 'scrap_sw', 'green_se'],
      status: 'locked',
      polyOff: [
        [-7.0, 8.5],
        [7.0, 9.5],
        [9.5, 16.0],
        [3.5, 22.0],
        [-5.5, 21.0],
        [-10.0, 14.5],
      ],
      components: [
        { type: 'blocked_access', days: 1, labor: 1, wood: 2 },
        { type: 'unsafe_perimeter', days: 1, labor: 1, wood: 3, metal: 1 },
      ],
      cells: [
        [5, 9],
        [6, 9],
        [7, 9],
        [8, 9],
        [5, 10],
        [6, 10],
        [7, 10],
        [8, 10],
      ],
    },
    {
      id: 'yard_north',
      name: 'Patio industrial',
      identity: 'Solar amplio detrás de escombros al norte.',
      gain: 'Terreno más grande — cluster funcional futuro.',
      adjacent: ['core', 'lot_west', 'ruins_east'],
      status: 'locked',
      polyOff: [
        [-10.0, -24.0],
        [4.0, -26.5],
        [15.0, -21.0],
        [13.0, -11.0],
        [-2.0, -10.5],
        [-13.5, -13.5],
      ],
      components: [
        { type: 'debris', days: 2, labor: 2 },
        { type: 'heavy_wreck', days: 1, labor: 1, metal: 4 },
        { type: 'explore_local', days: 1, labor: 0 },
      ],
      cells: [
        [4, 0],
        [5, 0],
        [6, 0],
        [7, 0],
        [8, 0],
        [9, 0],
        [4, 1],
        [5, 1],
        [6, 1],
        [7, 1],
        [8, 1],
        [9, 1],
        [5, 2],
        [6, 2],
        [7, 2],
        [8, 2],
      ],
    },
    {
      id: 'scrap_sw',
      name: 'Chatarrería suroeste',
      identity: 'Montón de chatarra y un camión volcado.',
      gain: 'Rincón pequeño; metal residual al limpiar.',
      adjacent: ['lot_west', 'alley_south', 'core'],
      status: 'locked',
      polyOff: [
        [-22.0, 6.0],
        [-11.0, 7.5],
        [-9.5, 15.0],
        [-16.5, 20.5],
        [-24.5, 17.0],
        [-26.0, 10.0],
      ],
      components: [
        { type: 'heavy_wreck', days: 2, labor: 2, metal: 5, wood: 2 },
        { type: 'hostiles', days: 1, labor: 1 },
      ],
      cells: [
        [0, 7],
        [1, 7],
        [0, 8],
        [1, 8],
        [2, 8],
        [0, 9],
        [1, 9],
        [2, 9],
      ],
      clearBonus: { metal: 3 },
    },
    {
      id: 'green_se',
      name: 'Solar verde abandonado',
      identity: 'Hierbajos y un seto muerto al sureste.',
      gain: 'Suelo blando — bueno para huertos cuando se limpie.',
      adjacent: ['ruins_east', 'alley_south', 'core'],
      status: 'locked',
      polyOff: [
        [8.0, 7.5],
        [19.0, 6.5],
        [24.5, 13.0],
        [21.5, 21.5],
        [11.0, 22.5],
        [6.5, 15.5],
      ],
      components: [
        { type: 'debris', days: 1, labor: 1 },
        { type: 'explore_local', days: 1, labor: 0 },
        { type: 'unsafe_perimeter', days: 1, labor: 1, wood: 2 },
      ],
      cells: [
        [10, 7],
        [11, 7],
        [12, 7],
        [13, 7],
        [10, 8],
        [11, 8],
        [12, 8],
        [13, 8],
        [11, 9],
        [12, 9],
        [13, 9],
      ],
    },
  ];
  return bps.map((bp) => {
    if (!bp.surfaces) {
      bp.surfaces = singleSurfaceFromCells(`${bp.id}_main`, bp.cells);
    }
    return bp;
  });
}

export function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function absPoly(camp, polyOff) {
  return polyOff.map(([dx, dy]) => [camp.x + dx, camp.y + dy]);
}

function hydrateSurfaces(bp) {
  return (bp.surfaces || singleSurfaceFromCells(`${bp.id}_main`, bp.cells || [])).map((s) => ({
    id: s.id,
    name: s.name || s.id,
    cells: (s.cells || []).map((c) => [...c]),
  }));
}

export function createColonySectors(camp) {
  const c = camp || { x: 48, y: 62 };
  return sectorBlueprints().map((bp) => ({
    id: bp.id,
    name: bp.name,
    identity: bp.identity,
    gain: bp.gain,
    adjacent: [...bp.adjacent],
    status: bp.status,
    poly: absPoly(c, bp.polyOff),
    polyOff: bp.polyOff.map((p) => [...p]),
    components: (bp.components || []).map((comp) => ({ ...comp })),
    surfaces: hydrateSurfaces(bp),
    cells: (bp.cells || []).map((cell) => [...cell]),
    structureCells: (bp.structureCells || []).map((cell) => [...cell]),
    clearBonus: bp.clearBonus ? { ...bp.clearBonus } : null,
    recover: null,
  }));
}

function needsSurfaceRehydrate(sectors) {
  if (!Array.isArray(sectors) || !sectors.length) return true;
  const core = sectors.find((s) => s.id === 'core');
  if (!core) return true;
  if (!Array.isArray(core.surfaces) || core.surfaces.length < 2) return true;
  return false;
}

export function ensureSectors(state) {
  const camp = state.zones?.find((z) => z.type === 'camp') || { x: 48, y: 62 };
  if (!Array.isArray(state.sectors) || !state.sectors.length || !state.sectors[0]?.poly) {
    state.sectors = createColonySectors(camp);
  }
  if (state.sectors && !Array.isArray(state.sectors) && state.sectors.recovered) {
    const list = createColonySectors(camp);
    const rec = new Set(state.sectors.recovered || ['core']);
    list.forEach((s) => {
      if (rec.has(s.id)) s.status = 'recovered';
    });
    state.sectors = list;
  }
  if (Array.isArray(state.sectors) && state.sectors[0]?.polyOff) {
    const span = state.sectors.reduce((m, s) => {
      (s.polyOff || []).forEach(([x, y]) => {
        m = Math.max(m, Math.abs(x), Math.abs(y));
      });
      return m;
    }, 0);
    if (span < 18 || needsSurfaceRehydrate(state.sectors) || (state.layoutVersion || 0) < 3) {
      const statuses = Object.fromEntries(state.sectors.map((s) => [s.id, s.status]));
      const recovering = Object.fromEntries(
        state.sectors.filter((s) => s.recover).map((s) => [s.id, s.recover])
      );
      state.sectors = createColonySectors(camp).map((s) => ({
        ...s,
        status: statuses[s.id] || s.status,
        recover: recovering[s.id] || null,
      }));
    }
  }
  state.sectors.forEach((s) => {
    if (!Array.isArray(s.surfaces) || !s.surfaces.length) {
      s.surfaces = singleSurfaceFromCells(`${s.id}_main`, s.cells || []);
    }
  });
  state.layoutVersion = Math.max(3, state.layoutVersion || 1);
  return state.sectors;
}

export function getSector(state, id) {
  ensureSectors(state);
  return state.sectors.find((s) => s.id === id) || null;
}

export function sectorForCell(state, x, y) {
  ensureSectors(state);
  return state.sectors.find((s) => (s.cells || []).some((c) => c[0] === x && c[1] === y)) || null;
}

export function surfaceForCell(state, x, y) {
  ensureSectors(state);
  for (const sec of state.sectors) {
    if (sec.status !== 'recovered') continue;
    const surf = (sec.surfaces || []).find((s) => (s.cells || []).some((c) => c[0] === x && c[1] === y));
    if (surf) return { sector: sec, surface: surf };
  }
  return null;
}

/** Celda dentro de una superficie edificable de sector recuperado (2.8). */
export function isCellBuildable(state, x, y) {
  return !!surfaceForCell(state, x, y);
}

export function recoveredSurfaces(state) {
  ensureSectors(state);
  const out = [];
  state.sectors.forEach((sec) => {
    if (sec.status !== 'recovered') return;
    (sec.surfaces || []).forEach((surf) => out.push({ sector: sec, surface: surf }));
  });
  return out;
}

export function recoveredSectorIds(state) {
  ensureSectors(state);
  return state.sectors.filter((s) => s.status === 'recovered').map((s) => s.id);
}

export function isAdjacentToRecovered(state, sector) {
  const rec = new Set(recoveredSectorIds(state));
  return (sector.adjacent || []).some((id) => rec.has(id));
}

export function summarizeRecoveryCost(sector) {
  const comps = sector.components || [];
  const out = { days: 0, labor: 0, wood: 0, metal: 0, problems: [] };
  comps.forEach((c) => {
    out.days += c.days || 0;
    out.labor = Math.max(out.labor, c.labor || 0);
    out.wood += c.wood || 0;
    out.metal += c.metal || 0;
    out.problems.push(COMPONENT_LABEL[c.type] || c.type);
  });
  out.days = Math.max(1, out.days);
  return out;
}

export function canStartRecovery(state, sectorId) {
  const sector = getSector(state, sectorId);
  if (!sector) return { ok: false, error: 'Sector desconocido' };
  if (sector.status === 'recovered') return { ok: false, error: 'Ya recuperado' };
  if (sector.status === 'recovering') return { ok: false, error: 'Ya en recuperación' };
  if (!isAdjacentToRecovered(state, sector)) {
    return { ok: false, error: 'Solo sectores colindantes al territorio recuperado' };
  }
  const cost = summarizeRecoveryCost(sector);
  if ((state.resources.wood || 0) < cost.wood) return { ok: false, error: 'Falta madera', cost };
  if ((state.resources.metal || 0) < cost.metal) return { ok: false, error: 'Falta metal', cost };
  const idle = state.population?.labor?.idle || 0;
  const build = state.population?.labor?.build || 0;
  if (idle + build < cost.labor) {
    return { ok: false, error: `Hace falta ~${cost.labor} manos libres`, cost };
  }
  return { ok: true, cost };
}

/** Sin RNG punitivo: si requisitos OK → empieza y termina en éxito. */
export function startSectorRecovery(state, sectorId) {
  const check = canStartRecovery(state, sectorId);
  if (!check.ok) return check;
  const sector = getSector(state, sectorId);
  const cost = check.cost;
  state.resources.wood = (state.resources.wood || 0) - cost.wood;
  state.resources.metal = (state.resources.metal || 0) - cost.metal;
  sector.status = 'recovering';
  sector.recover = {
    daysLeft: cost.days,
    daysTotal: cost.days,
    laborNeeded: cost.labor,
    startedDay: state.day,
  };
  return { ok: true, sector, cost };
}

export function tickSectorRecovery(state) {
  ensureSectors(state);
  const done = [];
  state.sectors.forEach((sector) => {
    if (sector.status !== 'recovering' || !sector.recover) return;
    sector.recover.daysLeft = Math.max(0, (sector.recover.daysLeft || 1) - 1);
    if (sector.recover.daysLeft > 0) return;
    sector.status = 'recovered';
    if (sector.clearBonus) {
      Object.entries(sector.clearBonus).forEach(([k, v]) => {
        state.resources[k] = (state.resources[k] || 0) + v;
      });
    }
    if (state.director) {
      state.director.threat = clamp((state.director.threat || 0) + 2.5, 0, 100);
      state.director.fragility = clamp((state.director.fragility || 0) + 3, 0, 100);
    }
    sector.recover = null;
    done.push(sector);
  });
  return done;
}

export function sectorAtMapPoint(state, mx, my) {
  ensureSectors(state);
  const hits = state.sectors.filter((s) => pointInPoly(mx, my, s.poly));
  if (!hits.length) return null;
  hits.sort((a, b) => polyArea(a.poly) - polyArea(b.poly));
  return hits[0];
}

function polyArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    a += poly[i][0] * poly[j][1] - poly[j][0] * poly[i][1];
  }
  return Math.abs(a / 2);
}

export function ptsStr(poly) {
  return poly.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
}
