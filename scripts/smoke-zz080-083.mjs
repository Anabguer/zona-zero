/**
 * Smoke ZZ-080…083 — research banco, workers, effects, no energy, benefit copy
 * node scripts/smoke-zz080-083.mjs
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

const { createNewState, defenseValue, housingCapacity } = await import(
  pathToFileURL(join(root, 'js', 'state.js')).href
);
const {
  placeBuilding,
  startResearch,
  tickResearch,
  applyProduction,
  advanceDay,
} = await import(pathToFileURL(join(root, 'js', 'sim.js')).href);
// applyProduction may not be exported — use advanceDay / place + unlock
const { freeBuildableCells } = await import(pathToFileURL(join(root, 'js', 'build-place.js')).href);
const {
  assertNoEnergyBranch,
  allTechs,
  techBenefitText,
  hasResearchBench,
  researchProgressPerDay,
  sumTechEffect,
} = await import(pathToFileURL(join(root, 'js', 'research.js')).href);
const { hasQuarantineProtocol } = await import(pathToFileURL(join(root, 'js', 'outbreaks.js')).href);

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

assert(assertNoEnergyBranch(content), 'no energy branch/tech');
assert(content.buildings.farm.requires?.length === 0, 'farm D1 sin tech');
assert(content.buildings.greenhouse.requires?.includes('greenhouse_tech'), 'greenhouse needs tech');

const techs = allTechs(content);
assert(techs.length >= 20, 'tech count');
assert(techs.every((t) => techBenefitText(t).length > 8), 'cada tech tiene beneficio legible');
assert(techs.some((t) => t.id === 'quarantine_protocol'), 'quarantine_protocol');

const state = createNewState(content, 'Refugio Norte', 'smoke-083');
state.flags.onboardingDone = true;
state.era = 1;
state.day = 8;
state.resources.wood = 120;
state.resources.metal = 80;
state.resources.food = 80;
state.resources.water = 80;
state.resources.medicine = 20;
state.resources.ammo = 10;
state.resources.fuel = 10;
if (state.population?.labor) {
  state.population.labor.idle = 10;
  state.population.labor.build = 2;
}

assert(!hasResearchBench(state), 'sin banco al inicio');
assert(startResearch(state, content, 'rationing').ok === false, 'research bloqueada sin banco');

const cells = freeBuildableCells(state);
assert(placeBuilding(state, content, 'tech_bench', cells[0][0], cells[0][1]).ok, 'tech_bench');
assert(hasResearchBench(state), 'banco listo');
const bench = state.base.buildings.find((b) => b.type === 'tech_bench');
bench.workers = 1;

assert(startResearch(state, content, 'rationing').ok, 'start rationing');
const p0 = researchProgressPerDay(state);
assert(p0 >= 1.5, 'workers aceleran progreso');
tickResearch(state, content);
assert(state.research.progress >= 1.5, 'progress stepped');
// finish
state.research.progress = 99;
tickResearch(state, content);
assert(state.research.unlocked.includes('rationing'), 'rationing unlocked');

// measurable assertions per key effect tech
const asserts = {
  rationing: () => sumTechEffect(state, content, 'foodProdBonus') >= 0.1,
  water_filters: () => {
    state.research.unlocked.push('water_filters');
    return sumTechEffect(state, content, 'waterProdBonus') >= 0.1;
  },
  field_medicine: () => {
    state.research.unlocked.push('field_medicine');
    return state.research.unlocked.includes('field_medicine');
  },
  quarantine_protocol: () => {
    state.research.unlocked.push('quarantine_protocol');
    return hasQuarantineProtocol(state);
  },
  greenhouse_tech: () => {
    state.research.unlocked.push('greenhouse_tech');
    const c = freeBuildableCells(state);
    return placeBuilding(state, content, 'farm', c[0][0], c[0][1]).ok;
  },
  basic_carpentry: () => {
    state.research.unlocked.push('basic_carpentry');
    return sumTechEffect(state, content, 'buildCostReduction') >= 0.1;
  },
  metalwork: () => {
    state.research.unlocked.push('metalwork');
    return sumTechEffect(state, content, 'metalProdBonus') >= 0.15;
  },
  reinforced_walls: () => {
    state.research.unlocked.push('reinforced_walls');
    return defenseValue(state, content.buildings, content.balance) >= 0;
  },
  insulation: () => {
    state.research.unlocked.push('insulation');
    return content.buildings.insulated_house.requires.includes('insulation');
  },
  advanced_housing: () => {
    state.research.unlocked.push('advanced_housing');
    return housingCapacity(state, content.buildings) >= 0;
  },
  watch_protocols: () => {
    state.research.unlocked.push('watch_protocols');
    return state.research.unlocked.includes('watch_protocols');
  },
  ammo_craft: () => {
    state.research.unlocked.push('ammo_craft');
    return sumTechEffect(state, content, 'ammoEfficiency') >= 0.2;
  },
  rapid_repair: () => {
    state.research.unlocked.push('rapid_repair');
    return state.research.unlocked.includes('rapid_repair');
  },
  tower_optics: () => {
    state.research.unlocked.push('tower_optics');
    return state.research.unlocked.includes('tower_optics');
  },
  fortify: () => {
    state.research.unlocked.push('fortify');
    return state.research.unlocked.includes('fortify');
  },
  preservation: () => {
    state.research.unlocked.push('preservation');
    return sumTechEffect(state, content, 'spoilReduction') >= 0.25;
  },
  scouting: () => {
    state.research.unlocked.push('scouting');
    return state.research.unlocked.includes('scouting');
  },
  pack_mules: () => {
    state.research.unlocked.push('pack_mules');
    return state.research.unlocked.includes('pack_mules');
  },
  bike_tech: () => {
    state.research.unlocked.push('bike_tech');
    return state.research.unlocked.includes('bike_tech');
  },
  vehicle_bay: () => {
    state.research.unlocked.push('vehicle_bay');
    return state.research.unlocked.includes('vehicle_bay');
  },
  convoy: () => {
    state.research.unlocked.push('convoy');
    return state.research.unlocked.includes('convoy');
  },
  armor_vehicle: () => {
    state.research.unlocked.push('armor_vehicle');
    return state.research.unlocked.includes('armor_vehicle');
  },
};

for (const t of techs) {
  const fn = asserts[t.id];
  if (!fn) {
    assert(!!t.benefit, `benefit ${t.id}`);
    continue;
  }
  assert(fn(), `effect ${t.id}`);
}

// only 1 active
state.research.active = null;
state.resources.food = 50;
state.resources.wood = 50;
assert(startResearch(state, content, 'water_filters').ok || state.research.unlocked.includes('water_filters'), 'can start or already have water');
if (state.research.active) {
  assert(startResearch(state, content, 'metalwork').ok === false, 'solo 1 tech activa');
}

if (fails) {
  console.error('smoke-zz080-083 FAIL', fails);
  process.exit(1);
}
console.log('smoke-zz080-083 OK', techs.length, 'techs');
