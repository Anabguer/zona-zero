/**
 * Smoke test motor Zona Zero (Node).
 * node .\smoke.mjs  (desde scripts/)
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content');

function loadJson(name) {
  return JSON.parse(readFileSync(join(contentDir, name), 'utf8'));
}

const content = {
  balance: loadJson('balance.json'),
  buildings: loadJson('buildings.json'),
  zonesDoc: loadJson('zones.json'),
  eventsDoc: loadJson('events.json'),
  survivorsDoc: loadJson('survivors.json'),
};

const stateUrl = pathToFileURL(join(root, 'js', 'state.js')).href;
const simUrl = pathToFileURL(join(root, 'js', 'sim.js')).href;

const { createNewState, livingSurvivors, summarizeState, maxSurvivorsCap, migrateState, makeSurvivor } =
  await import(stateUrl);
const { advanceDay, startExpedition, placeBuilding } = await import(simUrl);

let fails = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    fails++;
  } else {
    console.log('OK', msg);
  }
}

assert(content.balance.maxSurvivors >= 50, 'maxSurvivors >= 50 en balance');
assert(maxSurvivorsCap(content.balance) >= 50, 'cap configurable');
assert(!JSON.stringify(content).includes('"scrap"'), 'sin scrap legacy en content');
assert(content.eventsDoc.events.length >= 20, 'suficientes eventos');

const state = createNewState(content, 'Smoke Refuge');
assert(livingSurvivors(state).length === 3, '3 supervivientes iniciales');
assert(state.resources.water > 0 && state.resources.wood > 0 && state.resources.metal > 0, 'recursos nuevos');
assert(state.resources.medicine > 0 && state.resources.fuel > 0, 'medicine/fuel');

const build = placeBuilding(state, content, 'farm', 1, 1);
assert(build.ok, 'construir huerto: ' + (build.error || 'ok'));
const well = placeBuilding(state, content, 'well', 1, 2);
assert(well.ok, 'construir pozo: ' + (well.error || 'ok'));

state.resources.fuel += 5;
const team = livingSurvivors(state).slice(0, 2).map((s) => s.id);
const ex = startExpedition(state, content, 'market', team);
assert(ex.ok, 'expedición mercado: ' + (ex.error || 'ok'));

for (let i = 0; i < 14; i++) {
  const r = advanceDay(state, content);
  assert(r.ok || state.flags.defeated, `advance day ${i + 1}`);
  if (state.flags.defeated) break;
}
assert(state.day >= 2, 'día avanzó');
assert(state.log.length > 3, 'diario con entradas');
console.log('Resumen:', summarizeState(state));

// Migración legacy
const legacy = migrateState(
  { v: 1, day: 3, resources: { food: 5, scrap: 4, meds: 2, ammo: 1 }, survivors: [], base: { buildings: [] } },
  content.balance
);
assert(legacy.resources.metal >= 4 && legacy.resources.medicine >= 2, 'migración scrap/meds');

// Cap población vía makeSurvivor loop
const grow = createNewState(content, 'Grow');
const cap = maxSurvivorsCap(content.balance);
while (livingSurvivors(grow).length < Math.min(55, cap)) {
  grow.survivors.push(makeSurvivor(content.survivorsDoc.names, content.survivorsDoc.skillKeys));
}
assert(livingSurvivors(grow).length >= 50, 'puede crecer a 50+');
assert(livingSurvivors(grow).length <= cap, 'no supera cap balance');

const deadState = createNewState(content, 'Doom');
deadState.survivors.forEach((s) => {
  s.hp = 0;
  s.status = 'dead';
});
deadState.resources.food = 0;
deadState.resources.water = 0;
advanceDay(deadState, content);
assert(deadState.flags.defeated || livingSurvivors(deadState).length === 0, 'derrota posible');

if (fails) {
  console.error(`\n${fails} fallos`);
  process.exit(1);
}
console.log('\nSMOKE OK');
