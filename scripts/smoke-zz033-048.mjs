/**
 * Smoke ZZ-033…048 — alertas, pozo≠cisterna, soft-caps, estaciones, pipeline, exposición
 * node scripts/smoke-zz033-048.mjs
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

const {
  createNewState,
  housingClimateCoverage,
  scheduleOrApplyWeather,
  woodReserveDays,
} = await import(pathToFileURL(join(root, 'js', 'state.js')).href);
const { advanceDay, placeBuilding } = await import(pathToFileURL(join(root, 'js', 'sim.js')).href);
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

assert(content.balance.woodHeating.enabled === true, 'woodHeating enabled');
assert(content.balance.colonyDailyFuelEnabled === false, 'sin fuel diario colonia');
assert(!content.buildings.cistern.produces?.water, 'cisterna no produce agua');
assert(content.buildings.cistern.waterStorageBonus > 0, 'cisterna soft-cap');
assert(content.buildings.cistern.rainCollect === true, 'cisterna rain');
assert(content.buildings.well.produces?.water > 0, 'pozo produce');

const state = createNewState(content, 'Refugio Norte', 'smoke-048');
state.flags.onboardingDone = true;
state.resources.wood = 40;
state.resources.food = 80;
state.resources.water = 80;
state.resources.metal = 40;
if (state.population?.labor) state.population.labor.idle = 6;
assert(state.season, `season ${state.season}`);

state.era = 1;
const cells = freeBuildableCells(state);
assert(placeBuilding(state, content, 'well', cells[0][0], cells[0][1]).ok, 'pozo');
const c2 = freeBuildableCells(state);
assert(placeBuilding(state, content, 'cistern', c2[0][0], c2[0][1]).ok, 'cisterna');

// Pipeline aviso
const rng = createRng(42);
const sched = scheduleOrApplyWeather(state, content, 'cold', rng);
assert(sched.scheduled === true, 'frío programado con aviso');
assert(state.pendingWeather?.type === 'cold', 'pendingWeather cold');
const obj = currentObjective(state, content);
assert(obj?.id === 'need_warmth', 'alerta need_warmth');
assert(/madera/.test(obj.text), 'alerta menciona madera');

const start = state.pendingWeather.startsOnDay;
while (state.day < start) {
  state.resources.food = 100;
  state.resources.water = 100;
  advanceDay(state, content);
}
assert(state.weather === 'cold' || state.pendingWeather == null, 'clima llega tras aviso');

// Forzar cold + shortfall → exposición
state.weather = 'cold';
state.weatherDaysLeft = 3;
state.resources.wood = 0;
state.coldExposure = 0;
const r = advanceDay(state, content);
assert(r.heating?.active, 'heating activo');
assert((state.coldExposure || 0) > 0, 'exposición acumulada');
assert(r.brief?.wood?.heating, 'brief madera');

const cov = housingClimateCoverage(state, content.buildings, content.balance, 'blizzard');
assert(cov.threshold === 2, 'blizzard umbral 2');
assert(woodReserveDays(state, 5) === Math.floor((state.resources.wood || 0) / 5), 'reserve days');

// fuel colonia 0
const fuelBefore = state.resources.fuel || 0;
state.weather = 'clear';
state.resources.food = 100;
state.resources.water = 100;
advanceDay(state, content);
assert((state.resources.fuel || 0) === fuelBefore, 'advance no gasta fuel colonia');

// rain → cistern collect (net of daily drink)
state.weather = 'rain';
state.weatherDaysLeft = 1;
state.population.total = 3;
state.resources.water = 50;
state.resources.food = 100;
const waterBefore = state.resources.water || 0;
const rRain = advanceDay(state, content);
const drink = 3; // approx
assert(
  (state.resources.water || 0) + drink >= waterBefore || (rRain.brief?.water?.produced || 0) > 0,
  'lluvia aporta agua (cisterna/lluvia)'
);

if (fails) {
  console.error(`\n${fails} fallos`);
  process.exit(1);
}
console.log('smoke-zz033-048 OK');
