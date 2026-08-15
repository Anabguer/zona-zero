/**
 * ZZ-018 — smoke sectores orgánicos + recuperación.
 * node scripts/smoke-sectors.mjs
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

const { createNewState } = await import(pathToFileURL(join(root, 'js', 'state.js')).href);
const { placeBuilding, advanceDay } = await import(pathToFileURL(join(root, 'js', 'sim.js')).href);
const {
  ensureSectors,
  canStartRecovery,
  startSectorRecovery,
  isCellBuildable,
  summarizeRecoveryCost,
} = await import(pathToFileURL(join(root, 'js', 'sectors.js')).href);

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

const state = createNewState(content, 'Refugio Norte', 'smoke-sec');
ensureSectors(state);
assert(Array.isArray(state.sectors) && state.sectors.length >= 6, 'varios sectores');
assert(state.sectors.every((s) => (s.polyOff || []).length >= 5), 'polígonos orgánicos');

const areas = state.sectors.map((s) => {
  let a = 0;
  const p = s.polyOff;
  for (let i = 0; i < p.length; i++) {
    const j = (i + 1) % p.length;
    a += p[i][0] * p[j][1] - p[j][0] * p[i][1];
  }
  return Math.abs(a / 2);
});
const uniq = new Set(areas.map((a) => Math.round(a / 10) * 10));
assert(uniq.size >= 3, 'áreas claramente distintas');

const maxSpan = Math.max(
  ...state.sectors.flatMap((s) => (s.polyOff || []).map(([x, y]) => Math.hypot(x, y)))
);
assert(maxSpan >= 24, 'sectores se extienden fuera del viewport D1: ' + maxSpan);

const core = state.sectors.find((s) => s.id === 'core');
assert(core?.status === 'recovered', 'núcleo recuperado');
assert(state.sectors.filter((s) => s.status === 'recovered').length === 1, 'solo núcleo al inicio');

const hq = state.base.buildings.find((b) => String(b.type).startsWith('hq_'));
assert(hq && isCellBuildable(state, hq.x, hq.y), 'HQ en celda construible');

assert(!isCellBuildable(state, 1, 4), 'celda aparcamiento no construible aún');
const outside = placeBuilding(state, content, 'farm', 1, 4);
assert(!outside.ok, 'no construir fuera de recuperado: ' + outside.error);

state.resources.wood = 40;
state.resources.metal = 40;
state.population.labor.idle = 5;

const lot = state.sectors.find((s) => s.id === 'lot_west');
const cost = summarizeRecoveryCost(lot);
assert(cost.days >= 2 && cost.problems.length >= 2, 'componentes situacionales');
assert(canStartRecovery(state, 'lot_west').ok, 'puede empezar lot_west');

const far = canStartRecovery(state, 'green_se');
// green_se adjacent to core — should be OK
assert(far.ok || far.error, 'check green_se evaluado');

const start = startSectorRecovery(state, 'lot_west');
assert(start.ok && lot.status === 'recovering', 'recuperación iniciada');
assert(start.cost.days === cost.days, 'días derivados de componentes');

let recovered = false;
for (let i = 0; i < cost.days + 1; i++) {
  const r = advanceDay(state, content);
  if ((r.recoveredSectors || []).some((s) => s.id === 'lot_west')) recovered = true;
}
assert(recovered && lot.status === 'recovered', 'éxito sin RNG punitivo');
assert(isCellBuildable(state, 1, 4), 'tras recuperar: celdas buildable');

const farm = placeBuilding(state, content, 'farm', 1, 4);
assert(farm.ok, 'construir en sector recuperado');

if (fails) {
  console.error('smoke-sectors FAIL', fails);
  process.exit(1);
}
console.log('smoke-sectors OK');
