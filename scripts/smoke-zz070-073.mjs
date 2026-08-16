/**
 * Smoke ZZ-070…073 — control, contested, loot tables, fog helpers
 * node scripts/smoke-zz070-073.mjs
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
const { controlBenefits, loseFrontierZone, lootSpecForZone, scaleLootSpecForZoneState } =
  await import(pathToFileURL(join(root, 'js', 'territory.js')).href);
const { expeditionPreview } = await import(pathToFileURL(join(root, 'js', 'sim.js')).href);
const { createRng } = await import(pathToFileURL(join(root, 'js', 'rng.js')).href);

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

assert(locationsDoc.locationTypes.supermarket.lootTable?.ranges?.food, 'supermarket lootTable');
assert(locationsDoc.locationTypes.police.lootTable?.primary?.includes('ammo'), 'police primary ammo');

const state = createNewState(content, 'Refugio Norte', 'smoke-073');
state.flags.onboardingDone = true;
state.day = 10;
state.era = 1;

// Mark two zones controlled
const z1 = state.zones.find((z) => z.type === 'supermarket') || state.zones[1];
const z2 = state.zones.find((z) => z.type === 'pharmacy') || state.zones[2];
z1.state = 'controlled';
z1.controlProgress = 1;
z1.infectedLeft = 0;
z2.state = 'controlled';
z2.controlProgress = 1;
z2.infectedLeft = 0;
state.stats.zonesControlled = state.zones.filter((z) => z.state === 'controlled').length;

const ben = controlBenefits(state, content);
assert(ben.controlled >= 2, 'control benefits count');
assert(ben.defenseBonus > 0, 'defense bonus from territory');
assert(ben.residualLoot === true, 'residual flag');

const spec = lootSpecForZone(z1, content);
assert(spec.food, 'lootSpec food');
const residual = scaleLootSpecForZoneState(z1, spec);
assert(residual.food[1] <= spec.food[1], 'residual <= full');

const ex = state.explorers[0];
const prev = expeditionPreview(state, content, z1.id, ex.id);
assert(prev.residual === true, 'preview residual');
assert(/residual/i.test(prev.note), 'preview note residual');

const rng = createRng(99);
const lost = loseFrontierZone(state, rng);
assert(lost && (lost.state === 'contested' || lost.state === 'hostile'), 'frontier loss');
if (lost.state === 'contested') {
  assert(lost.controlProgress < 1, 'contested progress');
}

if (fails) {
  console.error('smoke-zz070-073 FAIL', fails);
  process.exit(1);
}
console.log('smoke-zz070-073 OK');
