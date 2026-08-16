/**
 * Smoke ZZ-024…027 — build preview, housing growth, feedback, explorers
 * node scripts/smoke-zz024-027.mjs
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

const { createNewState, housingCapacity } = await import(pathToFileURL(join(root, 'js', 'state.js')).href);
const { placeBuilding, adjustBuildingWorkers, advanceDay } = await import(
  pathToFileURL(join(root, 'js', 'sim.js')).href
);
const { freeBuildableCells, ensureBuildGhost, clearBuildMode, ghostPlacementOk } = await import(
  pathToFileURL(join(root, 'js', 'build-place.js')).href
);
const { recruitExplorer, killExplorer, livingExplorers, explorerSlotsUnlocked } = await import(
  pathToFileURL(join(root, 'js', 'explorers.js')).href
);

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

const state = createNewState(content, 'Refugio Norte', 'smoke-024');
state.flags.onboardingDone = true;
state.resources.wood = 80;
state.resources.metal = 40;
state.resources.food = 80;
state.resources.water = 80;
if (state.population?.labor) state.population.labor.idle = 6;

// ZZ-024: sin ghost fuera de build; ghost solo en build
assert(!state.buildMode && state.uiMode !== 'build', 'fuera de build');
ensureBuildGhost(state);
assert(!state.buildGhost, 'sin ghost fuera de build mode');
state.uiMode = 'build';
state.buildMode = 'farm';
ensureBuildGhost(state);
assert(!!state.buildGhost, 'ghost en build mode');
const cells = freeBuildableCells(state);
assert(cells.length > 0, 'celdas libres');
const ok = ghostPlacementOk(state, content, 'farm', cells[0][0], cells[0][1]);
assert(ok.ok, 'ghost válido en superficie');
const place = placeBuilding(state, content, 'farm', cells[0][0], cells[0][1]);
assert(place.ok, 'placeBuilding');
clearBuildMode(state);
assert(!state.buildMode, 'clearBuildMode');

// Staff toast path: adjust works
const farm = state.base.buildings.find((b) => b.type === 'farm');
const adj = adjustBuildingWorkers(state, content, farm.id, 1);
assert(adj.ok && farm.workers === 1, 'staff +/- edificio');

// ZZ-025: housing gate — sin crecer si no hay plazas
const cap0 = housingCapacity(state, content.buildings);
state.population.total = cap0;
state.stability = 80;
state.stats.zonesControlled = 5;
state.resources.food = 400;
state.resources.water = 400;
state.flags.defeated = false;
const popBefore = state.population.total;
for (let i = 0; i < 12; i++) {
  state.resources.food = Math.max(state.resources.food, 200);
  state.resources.water = Math.max(state.resources.water, 200);
  advanceDay(state, content);
}
assert(!state.flags.defeated, 'colonia viva tras check housing');
assert(state.population.total <= cap0 + 1, 'sin inmigración si lleno (o +1 max)');

// Overflow pain
state.flags.defeated = false;
const capNow = housingCapacity(state, content.buildings);
state.population.total = capNow + (content.balance.housingOverflowGrace || 2) + 3;
state.stability = 60;
state.resources.food = 200;
state.resources.water = 200;
const stabBefore = state.stability;
const popOv = state.population.total;
for (let i = 0; i < 5; i++) {
  state.resources.food = Math.max(state.resources.food, 100);
  state.resources.water = Math.max(state.resources.water, 100);
  advanceDay(state, content);
}
assert(
  state.stability < stabBefore || state.population.total < popOv,
  'overflow baja estabilidad o abandona'
);

// ZZ-027: max 3 + recruit + kill
assert(content.balance.explorers.maxActive === 3, 'maxActive 3');
assert(explorerSlotsUnlocked(state, content.balance) >= 1, 'slot1');
const ex = state.explorers[0];
assert(ex && ex.status === 'ready', 'explorador inicial');
killExplorer(state, ex, content.balance);
assert(ex.status === 'dead', 'muerte permanente');
assert(livingExplorers(state).length === 0, 'living sin muertos');
state.population.total = Math.max(4, state.population.total);
state.explorerRecruitReadyDay = null;
const rec = recruitExplorer(state, content);
assert(rec.ok, 'reclutar tras muerte');
assert(livingExplorers(state).length === 1, '1 vivo tras recluta');
assert(rec.explorer.level === 1, 'recluta verde');

if (fails) {
  console.error(`\n${fails} fallos`);
  process.exit(1);
}
console.log('smoke-zz024-027 OK');
