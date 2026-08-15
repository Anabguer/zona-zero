/**
 * Smoke test motor Zona Zero (Node).
 * node W:\juegos\zona-zero\scripts\smoke.mjs
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

const { createNewState, livingSurvivors, summarizeState } = await import(stateUrl);
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

const state = createNewState(content, 'Smoke Refuge');
assert(livingSurvivors(state).length === 3, '3 supervivientes iniciales');
assert(state.resources.food > 0, 'comida inicial');
assert(state.zones.some((z) => z.state === 'controlled'), 'campamento controlado');

const build = placeBuilding(state, content, 'farm', 1, 1);
assert(build.ok, 'construir huerto: ' + (build.error || 'ok'));

const team = livingSurvivors(state).slice(0, 2).map((s) => s.id);
const ex = startExpedition(state, content, 'market', team);
assert(ex.ok, 'expedición mercado: ' + (ex.error || 'ok'));

for (let i = 0; i < 12; i++) {
  const r = advanceDay(state, content);
  assert(r.ok || state.flags.defeated, `advance day ${i + 1}`);
  if (state.flags.defeated) break;
}
assert(state.day >= 2, 'día avanzó');
assert(state.log.length > 3, 'diario con entradas');
console.log('Resumen:', summarizeState(state));
console.log('Muertes:', state.stats.deaths, 'Amenaza:', state.director.threat);

// Derrota forzada
const deadState = createNewState(content, 'Doom');
deadState.survivors.forEach((s) => {
  s.hp = 0;
  s.status = 'dead';
});
deadState.resources.food = 0;
advanceDay(deadState, content);
assert(deadState.flags.defeated || livingSurvivors(deadState).length === 0, 'derrota posible');

if (fails) {
  console.error(`\n${fails} fallos`);
  process.exit(1);
}
console.log('\nSMOKE OK');
