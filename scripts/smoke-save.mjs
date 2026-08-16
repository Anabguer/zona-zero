/**
 * Smoke ZZ-009 + ZZ-180 + ZZ-183 — save main+backup + migración sin energy + catálogo sin generator/solar.
 * node scripts/smoke-save.mjs
 */
import { pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const loadJson = (n) => JSON.parse(readFileSync(join(root, 'content', n), 'utf8'));
const locationsDoc = loadJson('locations.json');
const buildings = loadJson('buildings.json');
const content = {
  balance: loadJson('balance.json'),
  buildings,
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

const { createNewState, migrateState, SAVE_VERSION } = await import(
  pathToFileURL(join(root, 'js', 'state.js')).href
);
const { placeBuilding } = await import(pathToFileURL(join(root, 'js', 'sim.js')).href);
const {
  assertNoElectricBuildingsInCatalog,
  isV1PlayableBuilding,
  playableBuildingDefs,
} = await import(pathToFileURL(join(root, 'js', 'v1-catalog.js')).href);
const api = await import(pathToFileURL(join(root, 'dev', 'api-mock.js')).href);

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

assert(SAVE_VERSION >= 7, `SAVE_VERSION ${SAVE_VERSION} ≥ 7`);

const electricHits = assertNoElectricBuildingsInCatalog(buildings);
assert(electricHits.length === 0, 'CATÁLOGO: buildings.json sin generator/solar/power_plant');
assert(!buildings.generator, 'CATÁLOGO: generator NO disponible');
assert(!buildings.solar, 'CATÁLOGO: solar NO disponible');
assert(!isV1PlayableBuilding('generator'), 'isV1PlayableBuilding(generator)=false');
assert(!isV1PlayableBuilding('solar'), 'isV1PlayableBuilding(solar)=false');
assert(
  !playableBuildingDefs(buildings).some((b) => b.id === 'generator' || b.id === 'solar'),
  'playableBuildingDefs sin electricity'
);

await api.clearGame();
let st = await api.fetchSaveStatus();
assert(!st.save, 'sin partida al inicio');

const s1 = createNewState(content, 'Alpha', 'smoke-save-1');
s1.day = 1;
assert(!s1.energy, 'createNewState sin energy');
assert(!placeBuilding(s1, content, 'generator', 2, 2).ok, 'placeBuilding generator rechazado');
assert(!placeBuilding(s1, content, 'solar', 2, 2).ok, 'placeBuilding solar rechazado');
let r = await api.saveGame(s1, 'Alpha', 'Día 1');
assert(r.ok, 'primer save main');

const s2 = createNewState(content, 'Alpha', 'smoke-save-2');
s2.day = 3;
r = await api.saveGame(s2, 'Alpha', 'Día 3');
assert(r.ok, 'segundo save rota backup');

const dump = api.__mockDump();
assert(dump.main?.state?.day === 3, 'main = día 3');
assert(dump.backup?.state?.day === 1, 'backup = día 1');

dump.main.state = { broken: true };
r = await api.loadGame();
assert(r.ok && r.recoveredFromBackup, 'load recupera backup');
assert(r.state.day === 1, 'estado recuperado día 1');

r = await api.saveGame({ day: 0, resources: {}, base: {} }, 'bad', 'bad');
assert(!r.ok, 'rechaza payload inválido');

await api.clearGame();
st = await api.fetchSaveStatus();
assert(!st.save, 'clear elimina main+backup');

const legacy = createNewState(content, 'Legacy', 'legacy-180');
legacy.v = 4;
legacy.energy = { produced: 8, demand: 2 };
legacy.base.buildings.push({ id: 'gen1', type: 'generator', x: 2, y: 2, hp: 100, workers: 0 });
legacy.base.buildings.push({ id: 'sol1', type: 'solar', x: 3, y: 2, hp: 80, workers: 0 });
const mig = migrateState(legacy, content);
assert(mig.v === SAVE_VERSION, 'migrate bump version');
assert(!mig.energy, 'migrate strip energy');
assert(mig.flags?._migratedEnergy === true, 'flag migrated energy');
const gen = mig.base.buildings.find((b) => b.id === 'gen1');
const sol = mig.base.buildings.find((b) => b.id === 'sol1');
assert(gen?.type === 'storage', 'SAVE LEGACY: generator → storage');
assert(sol?.type === 'storage', 'SAVE LEGACY: solar → storage');

r = await api.saveGame(mig, 'Legacy', 'migrated');
assert(r.ok, 'save migrado');
r = await api.loadGame();
assert(r.ok && !r.state.energy, 'load sin energy');

await api.clearGame();

if (fails) {
  console.error('Smoke save FAIL', fails);
  process.exit(1);
}
console.log('Smoke save OK');
