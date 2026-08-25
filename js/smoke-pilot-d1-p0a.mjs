/**
 * Smoke P0-A — piloto Neni D1 (sin qa): onboarding + farm/well + brief.
 * node js/smoke-pilot-d1-p0a.mjs
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
const { placeBuilding, adjustBuildingWorkers, advanceDay } = await import(
  pathToFileURL(join(root, 'js', 'sim.js')).href
);
const { productionPreview } = await import(pathToFileURL(join(root, 'js', 'colony.js')).href);
const {
  ensureOnboarding,
  checkOnboardingProgress,
  onboardingStatus,
  coachMessage,
  markGuideDayAdvanced,
  GUIDE_STEPS,
} = await import(pathToFileURL(join(root, 'js', 'onboarding.js')).href);
const { pilotBuildableTypeIds } = await import(pathToFileURL(join(root, 'js', 'pilot-test.js')).href);
const { hudResourceKeys } = await import(pathToFileURL(join(root, 'js', 'hud-resources.js')).href);
const { installPilotZoneMap } = await import(
  pathToFileURL(join(root, 'js', 'pilot-terrain.js')).href
);
const { footprintFits, pilotFootprint, validPilotAnchors } = await import(
  pathToFileURL(join(root, 'js', 'pilot-footprints.js')).href
);

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

installPilotZoneMap(loadJson('pilot/neni-pilot-zones-v3.json'));

const state = createNewState(content, 'Pilot Neni', 'smoke-p0a');
state.flags = state.flags || {};
state.flags.pilot = 'neni';
state.flags.pilotQaMode = false;
state.flags.pilotTestMode = false;
state.flags.onboardingDone = false;
state.flags.onboardingActive = true;
state.flags.onboardingStep = 0;
state.flags.pilotTerrainCoords = 1;
state.flags.pilotTerrainVersion = 3;

// HQ canónico
state.base.buildings = [
  {
    id: 'b_hq_pilot',
    type: 'hq_central_l1',
    x: -7,
    y: 14,
    hp: 100,
    workers: 0,
  },
];

ensureOnboarding(state);
assert(state.population.total === 3, 'pop 3');
assert(onboardingStatus(state)?.step?.id === 'need_food', 'coach need_food');
assert(/Somos 3|Huerto/i.test(GUIDE_STEPS[0].text), 'texto paso 1');
assert(pilotBuildableTypeIds(state).has('farm'), 'farm en catálogo D1');
assert(pilotBuildableTypeIds(state).has('well'), 'well en catálogo D1');
assert(!pilotBuildableTypeIds(state).has('radio'), 'sin radio en D1');

const hud = hudResourceKeys(state);
assert(hud.includes('food') && hud.includes('water') && hud.includes('wood'), 'HUD comida/agua/madera');
assert(!hud.includes('fuel') && !hud.includes('ammo'), 'HUD sin fuel/ammo');

const farmFp = pilotFootprint('farm');
assert(farmFp && farmFp.w === 3 && farmFp.h === 2, 'farm footprint 3x2');
const anchors = validPilotAnchors(state, content, 'farm');
assert(anchors.length > 0, 'hay anclas farm válidas: ' + anchors.length);
const fa = anchors[0];
assert(placeBuilding(state, content, 'farm', fa.x, fa.y).ok, 'colocar farm');
checkOnboardingProgress(state);
assert(onboardingStatus(state)?.step?.id === 'staff_farm', 'paso staff_farm');

const farm = state.base.buildings.find((b) => b.type === 'farm');
const def = content.buildings.farm;
const prod0 = productionPreview(def, 0);
const prod1 = productionPreview(def, 1);
assert(prod0[0]?.amount === 0, 'prod 0 workers = 0');
assert(prod1[0]?.amount > 0, 'prod 1 worker > 0: ' + prod1[0]?.amount);
console.log('  farm food/día @0w=', prod0[0]?.amount, '@1w=', prod1[0]?.amount);

assert(adjustBuildingWorkers(state, content, farm.id, 1).ok, 'asignar worker');
checkOnboardingProgress(state);
assert(onboardingStatus(state)?.step?.id === 'see_day', 'paso see_day');
assert(/comida|avanzad/i.test(coachMessage(state) || ''), 'coach avanzar día');

const beforeFood = state.resources.food;
const r = advanceDay(state, content);
assert(r.ok, 'advanceDay ok');
assert(r.brief, 'brief real');
markGuideDayAdvanced(state);
checkOnboardingProgress(state);
assert(onboardingStatus(state)?.step?.id === 'need_water', 'paso need_water');
assert(state.day === 2, 'día 2');
console.log('  brief food:', JSON.stringify(r.brief.food));
console.log('  brief water:', JSON.stringify(r.brief.water));
console.log('  food stock', beforeFood, '→', state.resources.food);

const wellFp = pilotFootprint('well');
assert(wellFp && wellFp.w === 2 && wellFp.h === 1, 'well footprint 2x1');
const wAnchors = validPilotAnchors(state, content, 'well');
assert(wAnchors.length > 0, 'hay anclas well');
assert(placeBuilding(state, content, 'well', wAnchors[0].x, wAnchors[0].y).ok, 'colocar well');
checkOnboardingProgress(state);
assert(onboardingStatus(state)?.step?.id === 'staff_well', 'paso staff_well');
const well = state.base.buildings.find((b) => b.type === 'well');
assert(adjustBuildingWorkers(state, content, well.id, 1).ok, 'asignar well');
assert((farm.workers || 0) === 1 && (well.workers || 0) === 1, 'workers en edificios');

// Persistencia: roundtrip JSON (save/reload)
const snap = JSON.parse(JSON.stringify(state));
assert(snap.base.buildings.some((b) => b.type === 'farm' && b.workers === 1), 'save farm+worker');
assert(snap.base.buildings.some((b) => b.type === 'well' && b.workers === 1), 'save well+worker');

// QA catálogo intacto
const qaState = { flags: { pilot: 'neni', pilotQaMode: true } };
const qaIds = pilotBuildableTypeIds(qaState);
assert(qaIds.has('farm') && qaIds.has('storage') && qaIds.has('workshop'), 'QA catálogo amplio');
// B01: fuel/ammo fuera del HUD también en QA (solo presentación; la lógica sigue viva)
const qaHud = hudResourceKeys(qaState);
assert(!qaHud.includes('fuel') && !qaHud.includes('ammo'), 'QA HUD sin fuel/ammo');

if (fails) process.exit(1);
console.log('Smoke P0-A piloto D1 OK');
