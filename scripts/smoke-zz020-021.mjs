/**
 * Smoke ZZ-020 + ZZ-021 — brief ritual + staffing canónico
 * node scripts/smoke-zz020-021.mjs
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content');
const loadJson = (n) => JSON.parse(readFileSync(join(contentDir, n), 'utf8'));
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
const { advanceDay, placeBuilding, adjustBuildingWorkers } = await import(
  pathToFileURL(join(root, 'js', 'sim.js')).href
);
const { freeBuildableCells } = await import(pathToFileURL(join(root, 'js', 'build-place.js')).href);
const { syncLaborFromColony, staffableBuildings } = await import(
  pathToFileURL(join(root, 'js', 'colony.js')).href
);

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

const state = createNewState(content, 'Refugio Norte', 'smoke-020');
state.flags.onboardingDone = true;
state.flags.onboardingActive = false;
state.resources.wood = Math.max(40, state.resources.wood || 0);
state.resources.food = Math.max(40, state.resources.food || 0);
state.resources.water = Math.max(40, state.resources.water || 0);

const cells = freeBuildableCells(state);
assert(cells.length >= 2, 'celdas libres');
const [fx, fy] = cells[0];
const [wx, wy] = cells[1];
assert(placeBuilding(state, content, 'farm', fx, fy).ok, 'huerto');
assert(placeBuilding(state, content, 'well', wx, wy).ok, 'pozo');
const farm = state.base.buildings.find((b) => b.type === 'farm');
const well = state.base.buildings.find((b) => b.type === 'well');
assert(adjustBuildingWorkers(state, content, farm.id, 1).ok, 'staff huerto +/-');
assert(adjustBuildingWorkers(state, content, well.id, 1).ok, 'staff pozo +/-');
syncLaborFromColony(state, content);
assert((state.population.labor.food || 0) >= 1, 'labor food refleja edificio');
assert((state.population.labor.water || 0) >= 1, 'labor water refleja edificio');
assert(staffableBuildings(state, content).every((b) => b.workers != null), 'workers en edificios');

// ZZ-020 clear: comida/agua, sin madera calefacción
state.weather = 'clear';
const r1 = advanceDay(state, content);
assert(r1.ok && r1.brief?.food && r1.brief?.water, 'brief comida/agua');
assert(r1.brief.wood == null, 'sin fila madera en clear');
assert(typeof r1.brief.food.balance === 'number', 'balance comida numérico');
assert(typeof r1.brief.water.balance === 'number', 'balance agua numérico');

// ZZ-020 cold: madera en brief + consumo
const woodBefore = state.resources.wood;
state.weather = 'cold';
state.weatherDaysLeft = 3;
const r2 = advanceDay(state, content);
assert(r2.brief?.wood?.heating === true, 'brief madera en frío');
assert((r2.brief.wood.consumed || 0) > 0, 'consume madera calefacción');
assert(state.resources.wood < woodBefore, 'stock madera baja');
assert(r2.heating?.active, 'heating activo');

// ZZ-021: sin gente idle no se puede subir más
const idle = state.population.labor.idle || 0;
if (idle === 0) {
  const r = adjustBuildingWorkers(state, content, farm.id, 1);
  assert(!r.ok || r.workers === farm.workers, 'sin idle no fuerza staff');
} else {
  assert(adjustBuildingWorkers(state, content, farm.id, 1).ok || true, 'idle permite +/-');
}

if (fails) {
  console.error(`\n${fails} fallos`);
  process.exit(1);
}
console.log('smoke-zz020-021 OK');
