/**
 * Smoke ZZ-022 — Reveal → enviar → ruta → retorno (+ informe)
 * node scripts/smoke-zz022.mjs
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
const { advanceDay, placeBuilding, adjustBuildingWorkers, startExpedition, expeditionPreview } =
  await import(pathToFileURL(join(root, 'js', 'sim.js')).href);
const { freeBuildableCells } = await import(pathToFileURL(join(root, 'js', 'build-place.js')).href);
const { maybeRevealEarlyLandmarks } = await import(pathToFileURL(join(root, 'js', 'onboarding.js')).href);
const { readyExplorers } = await import(pathToFileURL(join(root, 'js', 'explorers.js')).href);

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

const state = createNewState(content, 'Refugio Norte', 'smoke-022');
state.flags.onboardingDone = true;
state.flags.onboardingActive = false;
state.resources.food = 80;
state.resources.water = 80;
state.resources.wood = 40;

const cells = freeBuildableCells(state);
placeBuilding(state, content, 'farm', cells[0][0], cells[0][1]);
placeBuilding(state, content, 'well', cells[1][0], cells[1][1]);
const farm = state.base.buildings.find((b) => b.type === 'farm');
const well = state.base.buildings.find((b) => b.type === 'well');
adjustBuildingWorkers(state, content, farm.id, 1);
adjustBuildingWorkers(state, content, well.id, 1);

assert(state.zones.find((z) => z.id === 'market')?.state === 'unknown', 'market oculto D1');

while (state.day < 3) {
  const r = advanceDay(state, content);
  assert(r.ok, `advance → D${state.day}`);
}
maybeRevealEarlyLandmarks(state);
assert(state.zones.find((z) => z.id === 'market')?.state === 'discovered', 'reveal market D3');

const explorer = readyExplorers(state)[0];
assert(explorer, 'explorador listo');
const prev = expeditionPreview(state, content, 'market', explorer.id);
assert(prev && prev.fuel === 0, 'a pie sin fuel');
assert(prev.days >= 1, 'días de viaje');

const fuelBefore = state.resources.fuel || 0;
const send = startExpedition(state, content, 'market', explorer.id);
assert(send.ok, 'enviar expedición');
assert(state.expeditions?.length === 1, 'expedición activa');
assert(explorer.status === 'away', 'explorador away');
assert((state.resources.fuel || 0) === fuelBefore, 'no gasta fuel a pie');

let reports = [];
let guard = 0;
while (guard++ < 8) {
  const r = advanceDay(state, content);
  assert(r.ok, `espera retorno D${state.day}`);
  if (r.expeditionReports?.length) {
    reports = r.expeditionReports;
    break;
  }
}
assert(reports.length >= 1, 'informe retorno');
assert(reports[0].explorerName, 'informe con nombre');
assert(reports[0].zoneName, 'informe con zona');
assert(explorer.status === 'ready' || explorer.status === 'wounded' || explorer.status === 'dead', 'status post-retorno');
assert(state.lastExpeditionReports?.length >= 1, 'lastExpeditionReports');

if (fails) {
  console.error(`\n${fails} fallos`);
  process.exit(1);
}
console.log('smoke-zz022 OK');
