/**
 * Smoke ZZ-030…032 — housing overflow, climateProtection, insulation unlock
 * node scripts/smoke-zz030-032.mjs
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

const {
  createNewState,
  housingCapacity,
  coveredBeds,
  housingClimateCoverage,
  climateProtectionOf,
} = await import(pathToFileURL(join(root, 'js', 'state.js')).href);
const { placeBuilding, startResearch, tickResearch, advanceDay } = await import(
  pathToFileURL(join(root, 'js', 'sim.js')).href
);
const { freeBuildableCells } = await import(pathToFileURL(join(root, 'js', 'build-place.js')).href);

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

assert(climateProtectionOf(content.buildings.shelter) === 0, 'shelter prot 0');
assert(climateProtectionOf(content.buildings.house) === 1, 'house prot 1');
assert(climateProtectionOf(content.buildings.insulated_house) === 2, 'insulated prot 2');
assert(climateProtectionOf(content.buildings.hq_central_l1) === 1, 'HQ L1 prot 1');
assert(content.buildings.insulated_house.requires.includes('insulation'), 'requires insulation');

const state = createNewState(content, 'Refugio Norte', 'smoke-030');
state.flags.onboardingDone = true;
state.era = 1;
state.resources.wood = 120;
state.resources.metal = 80;
state.resources.fuel = 10;
state.resources.food = 80;
state.resources.water = 80;
if (state.population?.labor) state.population.labor.idle = 8;

const capHq = housingCapacity(state, content.buildings);
assert(capHq >= 6, `cap HQ ${capHq}`);
assert(coveredBeds(state, content.buildings, 1) >= 6, 'HQ cubre prot≥1');

const cells = freeBuildableCells(state);
// shelter then house
assert(placeBuilding(state, content, 'shelter', cells[0][0], cells[0][1]).ok, 'shelter');
const cells2 = freeBuildableCells(state);
assert(placeBuilding(state, content, 'house', cells2[0][0], cells2[0][1]).ok, 'house');

const failIso = placeBuilding(state, content, 'insulated_house', freeBuildableCells(state)[0][0], freeBuildableCells(state)[0][1]);
assert(!failIso.ok, 'insulated bloqueada sin tech');

// Research path: carpentry → insulation
state.base.buildings.push({
  id: 'tb1',
  type: 'tech_bench',
  x: 0,
  y: 0,
  hp: 100,
  workers: 0,
});
assert(startResearch(state, content, 'basic_carpentry').ok, 'start carpentry');
for (let i = 0; i < 5; i++) tickResearch(state, content);
assert(state.research.unlocked.includes('basic_carpentry'), 'carpentry done');
assert(startResearch(state, content, 'insulation').ok, 'start insulation');
for (let i = 0; i < 8; i++) tickResearch(state, content);
assert(state.research.unlocked.includes('insulation'), 'insulation unlocked');

const cellIso = freeBuildableCells(state)[0];
assert(placeBuilding(state, content, 'insulated_house', cellIso[0], cellIso[1]).ok, 'place insulated');

const covCold = housingClimateCoverage(state, content.buildings, content.balance, 'cold');
const covBliz = housingClimateCoverage(state, content.buildings, content.balance, 'blizzard');
assert(covCold.covered >= 4, `covered cold ${covCold.covered}`);
assert(covBliz.threshold === 2, 'blizzard threshold 2');
assert(covBliz.woodNeed >= covCold.woodNeed, 'blizzard ≥ cold wood');

// Cold heating uses coverage
state.weather = 'cold';
state.resources.wood = 20;
const woodBefore = state.resources.wood;
advanceDay(state, content);
assert(state.resources.wood < woodBefore, 'consume madera en frío');

if (fails) {
  console.error(`\n${fails} fallos`);
  process.exit(1);
}
console.log('smoke-zz030-032 OK');
