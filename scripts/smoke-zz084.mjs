/**
 * Smoke ZZ-084 — research suite + quarantine pasiva (no toggle/−prod)
 * node scripts/smoke-zz084.mjs
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
  missionsDoc: loadJson('missions.json'),
  zonesDoc: { zones: locationsDoc.seedLayout || [] },
};

const { createNewState } = await import(pathToFileURL(join(root, 'js', 'state.js')).href);
const { placeBuilding, startResearch, tickResearch } = await import(
  pathToFileURL(join(root, 'js', 'sim.js')).href
);
const { freeBuildableCells } = await import(pathToFileURL(join(root, 'js', 'build-place.js')).href);
const { assertNoEnergyBranch, allTechs, techBenefitText } = await import(
  pathToFileURL(join(root, 'js', 'research.js')).href
);
const { hasQuarantineProtocol, startOutbreak } = await import(
  pathToFileURL(join(root, 'js', 'outbreaks.js')).href
);

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

assert(assertNoEnergyBranch(content), 'no energy');
assert(content.buildings.farm.requires?.length === 0, 'farm D1');
const techs = allTechs(content);
assert(techs.every((t) => techBenefitText(t).length > 8), 'benefits');
assert(techs.some((t) => t.id === 'quarantine_protocol'), 'quarantine exists');

const state = createNewState(content, 'Q', 'zz084');
state.flags.onboardingDone = true;
state.era = 1;
state.day = 12;
state.resources.wood = 80;
state.resources.metal = 80;
state.resources.food = 40;
state.resources.water = 40;
state.resources.medicine = 10;
state.population.labor.idle = 8;
state.population.labor.build = 2;

const cells = freeBuildableCells(state);
placeBuilding(state, content, 'tech_bench', cells[0][0], cells[0][1]);
startResearch(state, content, 'quarantine_protocol');
state.research.progress = 99;
state.research.active = 'quarantine_protocol';
tickResearch(state, content);
assert(hasQuarantineProtocol(state), 'quarantine unlocked');

// No toggle / no −prod artificial en la tech
const qTech = techs.find((t) => t.id === 'quarantine_protocol');
assert(qTech.effects?.quarantinePassive === true, 'efecto pasivo');
assert(!qTech.effects?.toggle && !qTech.effects?.prodPenalty, 'sin toggle/−prod');
assert(!('foodProdPenalty' in (qTech.effects || {})), 'sin foodProdPenalty');

placeBuilding(state, content, 'farm', cells[1][0], cells[1][1]);
assert(content.buildings.farm.requires?.length === 0, 'farm sigue libre con cuarentena');

if (typeof startOutbreak === 'function') {
  startOutbreak(state, content, 'fever_wave');
  assert(state.outbreak?.active !== undefined, 'brote arranca con protocolo');
}

console.log(fails ? `FAIL ${fails}` : 'smoke-zz084 OK');
process.exit(fails ? 1 : 0);
