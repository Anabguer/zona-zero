/**
 * Smoke ZZ-066…069 — estados daño, perímetro, repair
 * node scripts/smoke-zz066-069.mjs
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

const { createNewState, housingCapacity } = await import(pathToFileURL(join(root, 'js', 'state.js')).href);
const {
  placeBuilding,
  startRepair,
  buildingStructuralState,
  buildingOutputMult,
  applyBuildingDamage,
  advanceDay,
  perimeterIntegrity,
} = await import(pathToFileURL(join(root, 'js', 'sim.js')).href);
const { freeBuildableCells } = await import(pathToFileURL(join(root, 'js', 'build-place.js')).href);
const { currentObjective } = await import(pathToFileURL(join(root, 'js', 'colony.js')).href);
const { createRng } = await import(pathToFileURL(join(root, 'js', 'rng.js')).href);

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

assert(content.balance.buildingDamage.enabled === true, 'buildingDamage enabled');
assert(
  content.researchDoc.branches.defensa.techs.some((t) => t.id === 'rapid_repair'),
  'tech rapid_repair'
);

const state = createNewState(content, 'Refugio Norte', 'smoke-069');
state.flags.onboardingDone = true;
state.era = 1;
state.day = 12;
state.resources.wood = 80;
state.resources.metal = 40;
state.resources.food = 100;
state.resources.water = 100;
if (state.population?.labor) {
  state.population.labor.idle = 6;
  state.population.labor.build = 1;
}

const cells = freeBuildableCells(state);
assert(placeBuilding(state, content, 'farm', cells[0][0], cells[0][1]).ok, 'farm');
const c2 = freeBuildableCells(state);
assert(placeBuilding(state, content, 'barricade', c2[0][0], c2[0][1]).ok, 'barricade');
const c3 = freeBuildableCells(state);
assert(placeBuilding(state, content, 'watchtower', c3[0][0], c3[0][1]).ok, 'watchtower');

const farm = state.base.buildings.find((b) => b.type === 'farm');
farm.workers = 1;
const okProd = buildingOutputMult(farm, content);
assert(okProd === 1, 'output ok = 1');

farm.hp = 50;
assert(buildingStructuralState(farm, content) === 'damaged', 'state damaged');
assert(buildingOutputMult(farm, content) === 0.65, 'output damaged');

farm.hp = 20;
assert(buildingStructuralState(farm, content) === 'critical', 'state critical');
assert(buildingOutputMult(farm, content) === 0.3, 'output critical');

const capFull = housingCapacity(
  { ...state, base: { ...state.base, buildings: [{ id: 'h', type: 'shelter', hp: 100, x: 0, y: 0, workers: 0 }] } },
  content.buildings
);
const capDmg = housingCapacity(
  { ...state, base: { ...state.base, buildings: [{ id: 'h', type: 'shelter', hp: 50, x: 0, y: 0, workers: 0 }] } },
  content.buildings
);
assert(capDmg < capFull || capFull === 0, 'housing reduced when damaged');

const rng = createRng(7);
const peri = perimeterIntegrity(state, content);
assert(peri.buildings >= 1, 'perimeter buildings');

applyBuildingDamage(state, content, 40, { rng, forcePerimeter: true });
const hitPeri = state.base.buildings.some(
  (b) => ['barricade', 'watchtower', 'fence'].includes(b.type) && b.hp < 100
);
assert(hitPeri, 'perimeter took damage while holding');

farm.hp = 40;
state.resources.wood = 50;
state.resources.metal = 20;
state.population.labor.idle = 2;
const obj = currentObjective(state, content);
assert(obj?.id === 'need_repair' || obj?.id === 'pending_attack' || obj?.id === 'recovery' || obj?.id === 'survive' || obj?.id === 'need_warmth' || obj?.id === 'outbreak' || obj?.id === 'explore' || obj?.id === 'housing', 'objective exists');

const r = startRepair(state, content, farm.id);
assert(r.ok, 'startRepair ok');
assert(farm.repair?.daysLeft >= 1, 'repair scheduled');

const days = farm.repair.daysLeft;
for (let i = 0; i < days; i++) {
  advanceDay(state, content);
}
assert(farm.hp >= 100 && !farm.repair, 'repair restores HP');

farm.hp = 10;
state.director.protectionUntil = 0;
state.pendingAttack = null;
const obj2 = currentObjective(state, content);
assert(obj2?.id === 'need_repair', 'need_repair objective');

if (fails) {
  console.error('smoke-zz066-069 FAIL', fails);
  process.exit(1);
}
console.log('smoke-zz066-069 OK');
