/**
 * Smoke ZZ-090…096 + ZZ-100…107 — vehículos, radio≠centro, misiones, antirrepetición
 * node scripts/smoke-zz090-108.mjs
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRng } from '../js/rng.js';

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
  missionsDoc: loadJson('missions.json'),
  zonesDoc: { zones: locationsDoc.seedLayout || [] },
};

const { createNewState } = await import(pathToFileURL(join(root, 'js', 'state.js')).href);
const {
  placeBuilding,
  buyVehicle,
  repairVehicle,
  expeditionPreview,
  startExpedition,
  advanceDay,
} = await import(pathToFileURL(join(root, 'js', 'sim.js')).href);
const { freeBuildableCells } = await import(pathToFileURL(join(root, 'js', 'build-place.js')).href);
const { tripFuelCost, markVehicleTrip, ensureVehicleMeta } = await import(
  pathToFileURL(join(root, 'js', 'vehicles.js')).href
);
const { hasRadio, hasExpeditionCenter, radioFamilyWeightMult, expeditionCenterBonus } = await import(
  pathToFileURL(join(root, 'js', 'radio.js')).href
);
const {
  tickMissions,
  pickExpeditionEncounter,
  encounterRepeatRate,
  ensureMissions,
  allMissionDefs,
} = await import(pathToFileURL(join(root, 'js', 'missions.js')).href);
const { explorerSlotsUnlocked } = await import(pathToFileURL(join(root, 'js', 'explorers.js')).href);

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

assert(content.balance.colonyDailyFuelEnabled === false, 'fuel≠calor colonia');
assert(content.buildings.radio.max === 1, 'radio max=1');
assert(!content.buildings.garage.fuelSave, 'garage sin fuelSave diario legado');
assert(content.missionsDoc.missions.length >= 6, 'missions schema');

const supermarket = content.missionsDoc.missions.find((m) => m.zoneType === 'supermarket');
const pharmacy = content.missionsDoc.missions.find((m) => m.zoneType === 'pharmacy');
assert(supermarket && pharmacy && supermarket.id !== pharmacy.id, 'supermercado≠farmacia');

const state = createNewState(content, 'V', 'zz108');
state.flags.onboardingDone = true;
state._autoResolveChoices = true;
state.era = 2;
state.day = 10;
state.resources.wood = 120;
state.resources.metal = 120;
state.resources.food = 60;
state.resources.water = 60;
state.resources.fuel = 20;
state.resources.medicine = 8;
state.population.total = 14;
state.population.labor.idle = 10;
state.population.labor.build = 2;
state.research.unlocked.push('bike_tech', 'vehicle_bay');

const cells = freeBuildableCells(state);
let i = 0;
const place = (t) => {
  const c = cells[i++];
  return placeBuilding(state, content, t, c[0], c[1]);
};

assert(buyVehicle(state, content, 'car').ok === false, 'coche sin garaje falla');
assert(place('garage').ok, 'garage');
assert(buyVehicle(state, content, 'bike').ok, 'bike sin garaje ok');
assert(buyVehicle(state, content, 'car').ok, 'coche con garaje');

const fuel0 = tripFuelCost(state, content, 'car');
const garage = state.base.buildings.find((b) => b.type === 'garage');
garage.workers = 1;
const fuel1 = tripFuelCost(state, content, 'car');
assert(fuel1 === Math.max(0, fuel0 - 1), 'garage staff ahorra fuel viaje');

const meta = ensureVehicleMeta(state, 'car');
meta.wear = 90;
meta.needsRepair = true;
assert(repairVehicle(state, content, 'car').ok, 'repair usa metal+fuel');
assert(!ensureVehicleMeta(state, 'car').needsRepair, 'reparado');

assert(!hasRadio(state), 'sin radio');
assert(radioFamilyWeightMult(state) < 0.2, 'radio events casi nulos sin antena');
assert(place('radio').ok, 'radio');
assert(hasRadio(state), 'con radio');
assert(radioFamilyWeightMult(state) > 1, 'radio potencia señales');

assert(!hasExpeditionCenter(state), 'sin centro');
const slotsBefore = explorerSlotsUnlocked(state, content.balance);
assert(place('expedition_center').ok, 'centro');
assert(hasExpeditionCenter(state), 'con centro');
const bonus = expeditionCenterBonus(state);
assert(bonus.riskDelta < 0, 'centro reduce riesgo (visible)');
const slotsAfter = explorerSlotsUnlocked(state, content.balance);
assert(slotsAfter >= slotsBefore, 'centro ayuda slots');

const zone = state.zones.find((z) => z.state === 'discovered' || z.state === 'hostile') || state.zones[1];
zone.state = 'discovered';
const ex = state.explorers[0];
ex.status = 'ready';
ex.vehicleId = 'car';
const prevFoot = (() => {
  ex.vehicleId = null;
  return expeditionPreview(state, content, zone.id, ex.id);
})();
ex.vehicleId = 'car';
const prevCar = expeditionPreview(state, content, zone.id, ex.id);
assert(prevCar.fuel > 0, 'coche gasta fuel');
assert(prevCar.centerLabel, 'ficha muestra centro');
assert(prevCar.days <= prevFoot.days, 'speed/centro ≤ tiempo a pie');

const fuelBefore = state.resources.fuel;
assert(startExpedition(state, content, zone.id, ex.id).ok, 'start exp coche');
assert(state.resources.fuel < fuelBefore, 'fuel solo viaje');

// Misiones
tickMissions(state, content);
ensureMissions(state);
assert(state.missions.active.length >= 1, 'misiones guía/activas');
assert(allMissionDefs(content).some((m) => m.type === 'guide'), 'guías');
assert(allMissionDefs(content).some((m) => m.type === 'radio'), 'radio missions');

// Antirrepetición batch
const rng = createRng(42);
for (let n = 0; n < 40; n++) {
  pickExpeditionEncounter(state, zone, rng);
}
const rate = encounterRepeatRate(state.missions.memory, 12);
assert(rate < 0.55, `antirrepetición rate=${rate.toFixed(2)}`);

// Fuel no calienta
state.weather = 'cold';
state.resources.fuel = 5;
const fuelCold = state.resources.fuel;
state.resources.wood = 50;
advanceDay(state, content);
assert(state.resources.fuel === fuelCold || state.resources.fuel === 5, 'advance no gasta fuel en calor');

console.log(fails ? `FAIL ${fails}` : 'smoke-zz090-108 OK');
process.exit(fails ? 1 : 0);
