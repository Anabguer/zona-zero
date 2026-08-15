/**
 * Smoke Bloque 1 — partida D1→D5 (motor + guía).
 * node scripts/smoke-block1.mjs
 */
import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content');

function loadJson(name) {
  return JSON.parse(readFileSync(join(contentDir, name), 'utf8'));
}

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
  zonesDoc: {
    zones: (locationsDoc.seedLayout || []).map((z) => ({
      ...z,
      name: z.name || locationsDoc.locationTypes?.[z.type]?.name || z.id,
      risk: z.risk ?? locationsDoc.locationTypes?.[z.type]?.baseRisk ?? 0.3,
      loot: z.loot || locationsDoc.locationTypes?.[z.type]?.lootBias || {},
      infected: z.infected || locationsDoc.locationTypes?.[z.type]?.infected || [0, 2],
    })),
  },
};

const { createNewState } = await import(pathToFileURL(join(root, 'js', 'state.js')).href);
const { advanceDay, placeBuilding, startExpedition, adjustBuildingWorkers } = await import(
  pathToFileURL(join(root, 'js', 'sim.js')).href
);
const {
  ensureOnboarding,
  checkOnboardingProgress,
  advanceOnboarding,
  maybeRevealEarlyLandmarks,
  onboardingStatus,
} = await import(pathToFileURL(join(root, 'js', 'onboarding.js')).href);

let fails = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    fails++;
  } else {
    console.log('OK', msg);
  }
}

const state = createNewState(content, 'Refugio Norte', 'smoke-block1');
ensureOnboarding(state);

assert(state.colonyName === 'Refugio Norte', 'nombre colonia');
assert(state.day === 1, 'día 1');
assert(
  state.zones.find((z) => z.id === 'market')?.state === 'unknown',
  'supermercado oculto en D1'
);

let st = onboardingStatus(state);
assert(st?.step?.id === 'welcome', 'guía welcome');
advanceOnboarding(state);
advanceOnboarding(state);
st = onboardingStatus(state);
assert(st?.step?.id === 'build_farm', 'guía construir huerto');

function freeCell(near = true) {
  const cx = Math.floor(state.base.w / 2);
  const cy = Math.floor(state.base.h / 2);
  const cells = [];
  for (let y = 0; y < state.base.h; y++) {
    for (let x = 0; x < state.base.w; x++) {
      if (!state.base.buildings.some((b) => b.x === x && b.y === y && b.hp > 0)) {
        cells.push([x, y, Math.abs(x - cx) + Math.abs(y - cy)]);
      }
    }
  }
  cells.sort((a, b) => a[2] - b[2]);
  return near ? cells[0] : cells[cells.length - 1];
}

const [fx, fy] = freeCell();
assert(placeBuilding(state, content, 'farm', fx, fy).ok, 'colocar huerto');
checkOnboardingProgress(state);
const farm = state.base.buildings.find((b) => b.type === 'farm');
assert(farm, 'huerto existe');
assert(adjustBuildingWorkers(state, content, farm.id, 1).ok, 'asignar huerto');
checkOnboardingProgress(state);
st = onboardingStatus(state);
assert(st?.step?.id === 'build_well', 'guía pozo');

const [wx, wy] = freeCell();
assert(placeBuilding(state, content, 'well', wx, wy).ok, 'colocar pozo');
checkOnboardingProgress(state);
const well = state.base.buildings.find((b) => b.type === 'well');
assert(adjustBuildingWorkers(state, content, well.id, 1).ok, 'asignar pozo');
checkOnboardingProgress(state);
st = onboardingStatus(state);
assert(st?.step?.id === 'first_day', 'guía avanzar día');

const r2 = advanceDay(state, content);
assert(r2.ok, 'avanzar a D2');
assert(r2.brief?.food && r2.brief?.water, 'brief comida/agua');
assert(Array.isArray(r2.brief.facts), 'brief facts');
maybeRevealEarlyLandmarks(state);
checkOnboardingProgress(state);
assert(state.day === 2, 'día 2');
assert(state.zones.find((z) => z.id === 'market')?.state === 'unknown', 'aún sin landmark D2');

const r3 = advanceDay(state, content);
assert(r3.ok, 'avanzar a D3');
maybeRevealEarlyLandmarks(state);
checkOnboardingProgress(state);
assert(state.day === 3, 'día 3');
assert(state.zones.find((z) => z.id === 'market')?.state === 'discovered', 'supermercado revelado D3');
st = onboardingStatus(state);
assert(st?.step?.id === 'explore', 'guía explorar');

const ex = state.explorers.find((e) => e.status === 'ready') || state.explorers[0];
const exp = startExpedition(state, content, 'market', ex.id);
assert(exp.ok, 'enviar explorador: ' + (exp.error || 'ok'));
checkOnboardingProgress(state);

while (state.day < 5 && !state.flags.defeated) {
  const r = advanceDay(state, content);
  assert(r.ok, `avanzar D${state.day}`);
  maybeRevealEarlyLandmarks(state);
  checkOnboardingProgress(state);
}
assert(state.day >= 5, 'llega a D5');
assert(state.population.total > 0, 'colonia viva');

console.log('\nResumen D' + state.day, {
  pop: state.population.total,
  food: state.resources.food,
  water: state.resources.water,
  buildings: state.base.buildings.map((b) => b.type),
  market: state.zones.find((z) => z.id === 'market')?.state,
});

if (fails) {
  console.error(`\n${fails} fallos`);
  process.exit(1);
}
console.log('\nSmoke bloque 1 OK');
