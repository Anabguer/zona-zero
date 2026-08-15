/**
 * Smoke test motor Zona Zero (Node).
 * node scripts/smoke.mjs
 * ZZ-004: mapa solo desde locations.json (zones.json deprecado).
 */
import { readFileSync } from 'fs';
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

const stateUrl = pathToFileURL(join(root, 'js', 'state.js')).href;
const simUrl = pathToFileURL(join(root, 'js', 'sim.js')).href;

const {
  createNewState,
  livingSurvivors,
  summarizeState,
  maxSurvivorsCap,
  migrateState,
  makeSurvivor,
} = await import(stateUrl);
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

assert(content.balance.laborModel === 'per_building', 'laborModel per_building');
assert(content.balance.woodHeating && content.balance.woodHeating.enabled === false, 'woodHeating skeleton');
assert(content.balance.outbreaks && content.balance.outbreaks.noFixedCalendar === true, 'outbreaks skeleton');
assert(content.balance.victory.needEnergy === false, 'victory sin needEnergy');
assert(content.balance.deprecatedV1?.electricity === true, 'deprecated electricity flag');
assert(!!content.locationsDoc.seedLayout?.length, 'locations seedLayout');
assert(content.balance.maxPopulation >= 50 || content.balance.maxSurvivors >= 50, 'max pop');
assert(maxSurvivorsCap(content.balance) >= 50, 'cap configurable');
assert(!JSON.stringify(content.balance).includes('"scrap"'), 'sin scrap legacy');
assert(content.eventsDoc.events.length >= 20, 'suficientes eventos');

const state = createNewState(content, 'Smoke Refuge');
assert((state.population?.total || livingSurvivors(state).length) >= 3, 'pop inicial');
assert(state.resources.water > 0 && state.resources.wood > 0 && state.resources.metal > 0, 'recursos');
assert(state.resources.medicine > 0 && state.resources.fuel > 0, 'medicine/fuel');
assert(state.zones?.length > 0, 'zonas desde locations');

const build = placeBuilding(state, content, 'farm', 1, 1);
assert(build.ok, 'construir huerto: ' + (build.error || 'ok'));
const well = placeBuilding(state, content, 'well', 1, 2);
assert(well.ok, 'construir pozo: ' + (well.error || 'ok'));

const market = state.zones.find((z) => z.id === 'market' || z.type === 'supermarket') || state.zones[1];
if (market && market.state === 'unknown') market.state = 'discovered';
state.resources.fuel += 5;
const ex = startExpedition(state, content, market?.id || 'market', []);
assert(ex.ok || /explorador|explorer|equipo|team/i.test(String(ex.error || '')), 'expedición intentada: ' + (ex.error || 'ok'));

for (let i = 0; i < 5; i++) {
  const r = advanceDay(state, content);
  assert(r.ok || state.flags.defeated, `advance day ${i + 1}`);
  if (state.flags.defeated) break;
}
assert(state.day >= 2, 'día avanzó');

const legacy = migrateState(
  { v: 1, day: 3, resources: { food: 5, scrap: 4, meds: 2, ammo: 1 }, survivors: [], base: { buildings: [] } },
  content.balance
);
assert(legacy.resources.metal >= 4 && legacy.resources.medicine >= 2, 'migración scrap/meds');

if (fails) {
  console.error(`\n${fails} fallos`);
  process.exit(1);
}
console.log('\nSMOKE OK (locations-first, balance 2.5 skeleton)');
