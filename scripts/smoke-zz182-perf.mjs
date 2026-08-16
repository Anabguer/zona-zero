/**
 * ZZ-182 — Perf mapa + ambient (cap sprites, pan/zoom sin throw).
 * node scripts/smoke-zz182-perf.mjs
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
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
assert((bal.ambientLife?.maxSprites || 0) <= 16, 'maxSprites ≤16');
assert(bal.victory?.needEnergy === false, 'needEnergy false');
assert((bal.saveVersion || 0) >= 7, 'saveVersion ≥7');

const { ambientSpriteBudget, planAmbientFigures } = await import(
  pathToFileURL(join(root, 'js', 'ambient-life.js')).href
);
const { createNewState, migrateState, SAVE_VERSION } = await import(
  pathToFileURL(join(root, 'js', 'state.js')).href
);
const { panCameraBy, zoomCameraBy, clampCamera } = await import(
  pathToFileURL(join(root, 'js', 'render-map.js')).href
);

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

assert(SAVE_VERSION >= 7, `SAVE_VERSION ${SAVE_VERSION}`);

const state = createNewState(content, 'Perf', 'smoke-182');
state.population.total = 120;
state.population.sick = 4;
state.day = 40;
state.era = 1;
for (let i = 0; i < 12; i++) {
  state.base.buildings.push({
    id: `f${i}`,
    type: 'farm',
    x: 2 + (i % 4),
    y: 2 + Math.floor(i / 4),
    hp: 100,
    workers: 2,
  });
}

const budget = ambientSpriteBudget(state, content);
assert(budget <= 16, `budget alta pop ${budget} ≤16`);
assert(budget >= 8, `budget no colapsa ${budget}`);

const geo = { scale: 3, bw: state.base.w, bh: state.base.h };
const plan = planAmbientFigures(state, content, geo);
assert(plan.figures.length <= budget, `figures ${plan.figures.length} ≤ budget ${budget}`);
assert(plan.figures.length <= 16, 'figures ≤16 hard');

const t0 = Date.now();
for (let i = 0; i < 200; i++) {
  planAmbientFigures(state, content, geo);
}
const ms = Date.now() - t0;
assert(ms < 800, `200 planAmbient <800ms (got ${ms}ms)`);

assert(!!state.mapCamera, 'mapCamera presente');
const zBefore = state.mapCamera.zoom;
zoomCameraBy(state, 1.25);
assert(state.mapCamera.zoom >= zBefore, `zoom sube ${zBefore}→${state.mapCamera.zoom}`);
panCameraBy(state, 2.5, -1.5);
const x1 = state.mapCamera.x;
panCameraBy(state, -40, 40);
clampCamera(state);
assert(Number.isFinite(state.mapCamera.x) && Number.isFinite(state.mapCamera.y), 'pan finito');
assert(
  state.mapCamera.x >= 4 && state.mapCamera.x <= 96 && state.mapCamera.y >= 4 && state.mapCamera.y <= 96,
  `camera clamped ${state.mapCamera.x},${state.mapCamera.y} (from ${x1})`
);

const legacy = createNewState(content, 'L', 'legacy');
legacy.energy = { produced: 1, demand: 1 };
legacy.base.buildings.push({ id: 'g', type: 'generator', x: 1, y: 1, hp: 100, workers: 0 });
const mig = migrateState(legacy, content);
assert(!mig.energy && mig.base.buildings.find((b) => b.id === 'g')?.type === 'storage', 'migrate strip+map');

if (fails) {
  console.error('Smoke ZZ-182 FAIL', fails);
  process.exit(1);
}
console.log('Smoke ZZ-182 OK');
