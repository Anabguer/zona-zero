/**
 * ZZ-019 — smoke construcción semilibre (ghost + ✓/✕, sin segundo-tap).
 * node scripts/smoke-build-place.mjs
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const loadJson = (n) => JSON.parse(readFileSync(join(root, 'content', n), 'utf8'));
const locationsDoc = loadJson('locations.json');
const content = {
  balance: loadJson('balance.json'),
  buildings: loadJson('buildings.json'),
  eventsDoc: loadJson('events.json'),
  survivorsDoc: loadJson('survivors.json'),
  researchDoc: loadJson('research.json'),
  vehiclesDoc: loadJson('vehicles.json'),
  infectedDoc: loadJson('infected.json'),
  factionsDoc: loadJson('factions.json'),
  erasDoc: loadJson('eras.json'),
  locationsDoc,
  zonesDoc: { zones: locationsDoc.seedLayout || [] },
};

const { createNewState } = await import(pathToFileURL(join(root, 'js', 'state.js')).href);
const { placeBuilding } = await import(pathToFileURL(join(root, 'js', 'sim.js')).href);
const {
  ensureBuildGhost,
  setBuildGhostCell,
  ghostPlacementOk,
  clearBuildMode,
  freeBuildableCells,
  defaultGhostCell,
} = await import(pathToFileURL(join(root, 'js', 'build-place.js')).href);

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

const state = createNewState(content, 'Refugio Norte', 'smoke-build');
state.resources.wood = 80;
state.resources.water = 40;
state.resources.metal = 20;
if (state.population?.labor) state.population.labor.idle = 8;

const free0 = freeBuildableCells(state);
assert(free0.length >= 4, 'celdas libres en núcleo: ' + free0.length);

// Entrar en modo ghost
state.buildMode = 'farm';
state.uiMode = 'build';
const g0 = ensureBuildGhost(state);
assert(g0 && Number.isFinite(g0.x), 'ghost inicial');
assert(ghostPlacementOk(state, content, 'farm', g0.x, g0.y).ok, 'ghost inicial válido');

// Cancelar no construye
clearBuildMode(state);
assert(!state.buildMode && !state.buildGhost, 'cancel limpia modo');
assert(state.base.buildings.filter((b) => b.type === 'farm').length === 0, 'cancel sin farm');

// Tres huertos en celdas distintas vía confirmación (placeBuilding = ✓)
const farms = [];
for (let i = 0; i < 3; i++) {
  state.buildMode = 'farm';
  state.uiMode = 'build';
  state.buildGhost = null;
  ensureBuildGhost(state);
  const free = freeBuildableCells(state);
  assert(free.length > 0, 'queda espacio ' + i);
  const [x, y] = free[Math.min(i + 1, free.length - 1)];
  setBuildGhostCell(state, x, y);
  assert(ghostPlacementOk(state, content, 'farm', x, y).ok, 'ghost válido huerto ' + i);
  const r = placeBuilding(state, content, 'farm', x, y);
  assert(r.ok, 'confirmar huerto ' + i + ': ' + r.error);
  farms.push([x, y]);
  clearBuildMode(state);
}
const uniq = new Set(farms.map(([x, y]) => `${x},${y}`));
assert(uniq.size === 3, '3 posiciones distintas');

// Inválido: fuera de recuperado
assert(!ghostPlacementOk(state, content, 'farm', 1, 4).ok, 'celda no recuperada inválida');
const bad = placeBuilding(state, content, 'farm', 1, 4);
assert(!bad.ok, 'no construir fuera');

// Sin espacio físico: llenar resto del núcleo (mezcla tipos — farm tiene max)
let guard = 0;
const fillers = ['shelter', 'storage', 'barricade', 'farm'];
while (freeBuildableCells(state).length && guard++ < 80) {
  const [x, y] = freeBuildableCells(state)[0];
  state.resources.wood = Math.max(40, state.resources.wood);
  state.resources.water = Math.max(20, state.resources.water);
  state.resources.metal = Math.max(20, state.resources.metal);
  let ok = false;
  for (const t of fillers) {
    const r = placeBuilding(state, content, t, x, y);
    if (r.ok) {
      ok = true;
      break;
    }
  }
  if (!ok) break;
}
assert(freeBuildableCells(state).length === 0, 'sin celdas libres tras llenar: ' + freeBuildableCells(state).length);
const noSpace = defaultGhostCell(state);
assert(noSpace == null, 'sin ghost si no hay espacio');

if (fails) {
  console.error('smoke-build-place FAIL', fails);
  process.exit(1);
}
console.log('smoke-build-place OK');
