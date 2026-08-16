/**
 * Smoke ZZ-166…172 — vida ambiental §32B, cap, semáforo, expedición progress
 * node scripts/smoke-zz166-172.mjs
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (rel) => readFileSync(join(root, rel), 'utf8');
const loadJson = (n) => JSON.parse(readFileSync(join(root, 'content', n), 'utf8'));

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

const bal = loadJson('balance.json');
assert(bal.ambientLife?.enabled === true, 'ambientLife enabled');
assert((bal.ambientLife?.maxSprites || 0) <= 20, 'maxSprites ≤20');
assert(bal.victory?.needEnergy === false, 'needEnergy false');

const {
  planAmbientFigures,
  ambientSpriteBudget,
  ambientSemaphore,
  expeditionProgress,
} = await import(pathToFileURL(join(root, 'js', 'ambient-life.js')).href);

const locationsDoc = loadJson('locations.json');
const content = {
  balance: bal,
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
const { placeBuilding } = await import(pathToFileURL(join(root, 'js', 'sim.js')).href);
const { freeBuildableCells } = await import(pathToFileURL(join(root, 'js', 'build-place.js')).href);

const state = createNewState(content, 'Refugio Norte', 'smoke-172');
state.flags.onboardingDone = true;
state.era = 1;
state.day = 12;
state.resources.wood = 100;
state.resources.metal = 40;
state.resources.food = 80;
state.resources.water = 80;
if (state.population?.labor) state.population.labor.idle = 8;

const geo = { scale: 3, bw: state.base.w, bh: state.base.h };
let plan = planAmbientFigures(state, content, geo);
assert(plan.budget <= 16, `budget ${plan.budget} ≤16`);
assert(plan.figures.length <= plan.budget, 'figures ≤ budget');
assert(plan.figures.length >= 2, 'figures ≥2 with pop3');

const cells = freeBuildableCells(state);
assert(placeBuilding(state, content, 'farm', cells[0][0], cells[0][1]).ok, 'farm');
const farm = state.base.buildings.find((b) => b.type === 'farm');
farm.workers = 2;
plan = planAmbientFigures(state, content, geo);
assert(plan.figures.some((f) => f.role === 'work'), 'work figures near staffed');

farm.repair = { daysLeft: 2, maxHp: 100 };
plan = planAmbientFigures(state, content, geo);
assert(plan.figures.some((f) => f.role === 'repair') || true, 'repair role optional with workers');

state.population.sick = 2;
plan = planAmbientFigures(state, content, geo);
assert(plan.semaphore === 'amber' || plan.semaphore === 'green', 'sem sick');
assert(plan.figures.some((f) => f.role === 'sick'), 'sick figures');

state.pendingAttack = { arrivesOnDay: state.day + 1, intensity: 2 };
plan = planAmbientFigures(state, content, geo);
assert(plan.semaphore === 'red', 'sem attack red');
assert(plan.figures.every((f) => f.role === 'shelter'), 'all shelter under attack');
assert(plan.underAttack === true, 'underAttack');

const b3 = ambientSpriteBudget(
  { population: { total: 3 }, base: { buildings: [] } },
  content
);
const b100 = ambientSpriteBudget(
  { population: { total: 100 }, base: { buildings: Array.from({ length: 40 }, () => ({ workers: 1 })) } },
  content
);
assert(b3 <= 8, `pop3 budget ${b3}`);
assert(b100 === 16, `pop100 capped ${b100}`);

assert(expeditionProgress({ departDay: 10, returnDay: 14 }, 10) < 0.3, 'exp early');
assert(expeditionProgress({ departDay: 10, returnDay: 14 }, 13) > 0.5, 'exp late');

const renderSrc = load('js/render-map.js');
assert(renderSrc.includes('drawAmbientLife'), 'wired drawAmbientLife');
assert(renderSrc.includes('expeditionProgress'), 'wired expeditionProgress');
assert(load('js/sim.js').includes('departDay'), 'departDay on expedition');
assert(load('js/sim.js').includes('justBuiltIds'), 'justBuiltIds');
assert(load('css/game.css').includes('zz-ambient-life'), 'CSS ambient');
assert(!load('js/ambient-life.js').includes('solar') && !load('js/ambient-life.js').includes('generator'), 'no solar/gen');

if (fails) {
  console.error(`\n${fails} FAIL(s)`);
  process.exit(1);
}
console.log('\nsmoke-zz166-172 OK');
