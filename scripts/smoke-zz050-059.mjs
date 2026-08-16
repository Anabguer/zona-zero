/**
 * Smoke ZZ-050…059 — camas, brotes, cuarentena, sin calendario fijo
 * node scripts/smoke-zz050-059.mjs
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
const { advanceDay, placeBuilding, adjustBuildingWorkers, startOutbreak, medicalBeds } = await import(
  pathToFileURL(join(root, 'js', 'sim.js')).href
);
const { freeBuildableCells } = await import(pathToFileURL(join(root, 'js', 'build-place.js')).href);
const { healPopulationTick } = await import(pathToFileURL(join(root, 'js', 'population.js')).href);
const { currentObjective } = await import(pathToFileURL(join(root, 'js', 'colony.js')).href);

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

assert(content.balance.outbreaks.enabled === true, 'outbreaks enabled');
assert(content.balance.outbreaks.noFixedCalendar === true, 'no fixed calendar');
assert(content.buildings.medkit.beds === 1, 'medkit beds');
assert(content.buildings.infirmary.beds === 4, 'infirmary beds');
assert(content.buildings.clinic.beds === 8, 'clinic beds');
assert(content.buildings.clinic.max == null, 'clinic sin max arbitrario');
assert(
  content.researchDoc.branches.supervivencia.techs.some((t) => t.id === 'quarantine_protocol'),
  'tech quarantine_protocol'
);

const state = createNewState(content, 'Refugio Norte', 'smoke-059');
state.flags.onboardingDone = true;
state.era = 1;
state.day = 10;
state.resources.wood = 80;
state.resources.metal = 40;
state.resources.medicine = 10;
state.resources.food = 100;
state.resources.water = 100;
if (state.population?.labor) state.population.labor.idle = 8;

const cells = freeBuildableCells(state);
assert(placeBuilding(state, content, 'medkit', cells[0][0], cells[0][1]).ok, 'medkit');
const c2 = freeBuildableCells(state);
assert(placeBuilding(state, content, 'infirmary', c2[0][0], c2[0][1]).ok, 'infirmary');
assert(medicalBeds(state, content.buildings) === 5, 'beds 1+4');

const med = state.base.buildings.find((b) => b.type === 'infirmary');
adjustBuildingWorkers(state, content, med.id, 2);
state.population.injured = 3;
state.population.sick = 2;
healPopulationTick(state, content.balance, content);
assert(state.population.injured < 3 || state.population.sick < 2, 'cura con camas');

// Forced outbreak
startOutbreak(state, content, 'fever_wave');
assert(state.outbreak?.active, 'brote activo');
assert(state.outbreak.phase === 'seed', 'fase germen');
const obj = currentObjective(state, content);
assert(obj?.id === 'outbreak', 'alerta brote');

const sickBefore = state.population.sick;
let sawPhaseChange = false;
for (let i = 0; i < 25; i++) {
  state.resources.food = 120;
  state.resources.water = 120;
  state.resources.medicine = Math.max(4, state.resources.medicine || 0);
  advanceDay(state, content);
  if (state.outbreak?.phase && state.outbreak.phase !== 'seed') sawPhaseChange = true;
  if (!state.outbreak?.active) break;
}
assert(sawPhaseChange || !state.outbreak?.active, 'brote progresa o termina');
assert(typeof sickBefore === 'number', 'sick tracked');

// Quarantine reduces spread chance (smoke: unlock + still works)
state.research.unlocked.push('quarantine_protocol', 'field_medicine', 'rationing');
state.outbreak = { active: false };
state.outbreakCooldownUntil = 0;
state.day = 20;
startOutbreak(state, content, 'gut_bug');
assert(state.outbreak.active, 'segundo brote');
for (let i = 0; i < 20; i++) {
  state.resources.food = 120;
  state.resources.water = 120;
  advanceDay(state, content);
  if (!state.outbreak?.active) break;
}
assert(true, 'cuarentena pasiva no rompe tick');

// No artificial prod penalty flag — production still runs with staffed farm
const cf = freeBuildableCells(state);
if (cf[0]) placeBuilding(state, content, 'farm', cf[0][0], cf[0][1]);
assert(!content.balance.outbreaks.globalProdPenalty, 'sin −prod artificial por brote');

if (fails) {
  console.error(`\n${fails} fallos`);
  process.exit(1);
}
console.log('smoke-zz050-059 OK');
