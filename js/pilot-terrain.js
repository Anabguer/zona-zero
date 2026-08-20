/**
 * Terreno canónico piloto Neni — autoridad espacial de construcción.
 * Fuente: content/pilot/neni-pilot-zones-v3.json (NO reinterpretar / NO regenerar).
 *
 * Contrato:
 * - cellPx = 24
 * - origin world = [932, 136] = top-left de la celda (0,0)
 * - WORLD → cell: floor((w - origin) / cellPx)
 * - Footprint edificio (w×h celdas terreno): todas deben ser buildable
 */
export const PILOT_ZONES_URL = new URL('../content/pilot/neni-pilot-zones-v3.json', import.meta.url).href;

/** @type {null | { cellPx:number, origin:[number,number], cells:Record<string,any>, overrides:Record<string,string>, bounds:any }} */
let _map = null;
let _loadPromise = null;

export async function loadPilotZoneMap() {
  if (_map) return _map;
  if (_loadPromise) return _loadPromise;
  _loadPromise = fetch(PILOT_ZONES_URL)
    .then((r) => {
      if (!r.ok) throw new Error('neni-pilot-zones-v3.json');
      return r.json();
    })
    .then((doc) => {
      if (doc?.schema !== 'neni-pilot-zone-map-v3') {
        throw new Error('schema zona piloto inesperado');
      }
      _map = {
        schema: doc.schema,
        cellPx: doc.grid.cellPx,
        origin: /** @type {[number, number]} */ ([doc.grid.origin[0], doc.grid.origin[1]]),
        bounds: doc.grid.bounds,
        cells: doc.cells || {},
        overrides: doc.overrides || {},
        defaultSemantic: doc.defaultSemantic || 'buildable',
        world: doc.grid.world,
      };
      return _map;
    });
  return _loadPromise;
}

export function getPilotZoneMap() {
  return _map;
}

export function terrainKey(cx, cy) {
  return `${cx},${cy}`;
}

/** Semántica de una celda terreno: buildable | blocked | forest | scrap | null(fuera). */
export function terrainSemantic(cx, cy) {
  const map = _map;
  if (!map) return null;
  const k = terrainKey(cx, cy);
  if (map.overrides[k]) return map.overrides[k];
  const c = map.cells[k];
  if (c == null) return null;
  if (typeof c === 'string') return c;
  return c.semantic || (c.buildable ? 'buildable' : null);
}

export function isTerrainBuildable(cx, cy) {
  return terrainSemantic(cx, cy) === 'buildable';
}

/** WORLD → celda terreno (floor). */
export function worldToTerrainCell(wx, wy) {
  const map = _map;
  if (!map) return { cx: 0, cy: 0, cellPx: 24 };
  const cellPx = map.cellPx;
  return {
    cx: Math.floor((wx - map.origin[0]) / cellPx),
    cy: Math.floor((wy - map.origin[1]) / cellPx),
    cellPx,
  };
}

/** Top-left WORLD de una celda terreno. */
export function terrainCellToWorld(cx, cy) {
  const map = _map;
  const cellPx = map?.cellPx || 24;
  const ox = map?.origin?.[0] ?? 0;
  const oy = map?.origin?.[1] ?? 0;
  return { x: ox + cx * cellPx, y: oy + cy * cellPx, cellPx };
}

/** Rect WORLD del footprint anclado en celda terreno (ax,ay). */
export function terrainFootprintWorldRect(ax, ay, fw, fh) {
  const tl = terrainCellToWorld(ax, ay);
  const cellPx = tl.cellPx;
  return {
    x: tl.x,
    y: tl.y,
    w: fw * cellPx,
    h: fh * cellPx,
    scale: cellPx,
    cellPx,
    cx: tl.x + (fw * cellPx) / 2,
    cy: tl.y + fh * cellPx,
  };
}

/** Centro WORLD del footprint. */
export function terrainFootprintWorldCenter(ax, ay, fw, fh) {
  const r = terrainFootprintWorldRect(ax, ay, fw, fh);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/**
 * ¿El footprint (ax,ay)+(fw×fh) cabe en terreno buildable?
 * Una sola celda blocked/forest/scrap/fuera → inválido.
 */
export function terrainFootprintBuildable(ax, ay, fw, fh) {
  for (let dy = 0; dy < fh; dy++) {
    for (let dx = 0; dx < fw; dx++) {
      if (!isTerrainBuildable(ax + dx, ay + dy)) return false;
    }
  }
  return true;
}

/** Lista de celdas buildable (para overlay). */
export function listBuildableTerrainCells() {
  const map = _map;
  if (!map) return [];
  const out = [];
  const { minX, minY, maxX, maxY } = map.bounds;
  for (let cy = minY; cy <= maxY; cy++) {
    for (let cx = minX; cx <= maxX; cx++) {
      if (isTerrainBuildable(cx, cy)) out.push([cx, cy]);
    }
  }
  return out;
}

/**
 * Candidatos HQ 5×4 cerca de un punto WORLD.
 * No aplica el cambio — solo propone (Human Gate).
 */
export function findHqTerrainCandidates(nearWx, nearWy, { w = 5, h = 4, search = 24, limit = 3 } = {}) {
  const { cx, cy } = worldToTerrainCell(nearWx, nearWy);
  const scored = [];
  for (let ay = cy - search; ay <= cy + search; ay++) {
    for (let ax = cx - search; ax <= cx + search; ax++) {
      if (!terrainFootprintBuildable(ax, ay, w, h)) continue;
      const center = terrainFootprintWorldCenter(ax, ay, w, h);
      const dist = Math.hypot(center.x - nearWx, center.y - nearWy);
      let expand = 0;
      for (let y = ay - 3; y < ay + h + 3; y++) {
        for (let x = ax - 3; x < ax + w + 3; x++) {
          if (isTerrainBuildable(x, y)) expand += 1;
        }
      }
      const tl = terrainCellToWorld(ax, ay);
      scored.push({
        ax,
        ay,
        worldTL: { x: tl.x, y: tl.y },
        worldCenter: { x: Math.round(center.x), y: Math.round(center.y) },
        dist: Math.round(dist),
        expand,
        label: `HQ@terrain(${ax},${ay})`,
      });
    }
  }
  scored.sort((a, b) => a.dist - b.dist || b.expand - a.expand);
  // Diversificar un poco: tomar mejores con distancia distinta
  const picked = [];
  for (const c of scored) {
    if (picked.length >= limit) break;
    if (picked.some((p) => Math.abs(p.ax - c.ax) + Math.abs(p.ay - c.ay) < 3)) continue;
    picked.push(c);
  }
  while (picked.length < limit && scored[picked.length]) {
    const c = scored[picked.length];
    if (!picked.some((p) => p.ax === c.ax && p.ay === c.ay)) picked.push(c);
    else break;
  }
  return picked.slice(0, limit);
}

/** Debug placement log (temporal P0). */
export function logPilotPlaceDebug(tag, payload) {
  try {
    // eslint-disable-next-line no-console
    console.info(`[pilot-place] ${tag}`, payload);
  } catch {
    /* ignore */
  }
}
