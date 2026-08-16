/**
 * Smoke ZZ-060…065 — defensa, prep→ataque, infectados tipados, ammo, recovery
 * node scripts/smoke-zz060-065.mjs
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

const { createNewState, defenseBreakdown, defenseValue } = await import(
  pathToFileURL(join(root, 'js', 'state.js')).href
);
const { placeBuilding, resolveBaseAttack, schedulePendingAttack, composeHorde, advanceDay } =
  await import(pathToFileURL(join(root, 'js', 'sim.js')).href);
const { freeBuildableCells } = await import(pathToFileURL(join(root, 'js', 'build-place.js')).href);
const { currentObjective } = await import(pathToFileURL(join(root, 'js', 'colony.js')).href);
const { createRng } = await import(pathToFileURL(join(root, 'js', 'rng.js')).href);

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

assert(content.balance.attackWarnDays === 1, 'attackWarnDays');
assert(content.infectedDoc.types.length >= 4, 'infected types');
assert(content.buildings.armory.produces?.ammo === 1, 'armory ammo');

const state = createNewState(content, 'Refugio Norte', 'smoke-065');
state.flags.onboardingDone = true;
state.era = 1;
state.day = 14;
state.resources.wood = 80;
state.resources.metal = 40;
state.resources.ammo = 10;
state.resources.food = 100;
state.resources.water = 100;
if (state.population?.labor) state.population.labor.idle = 8;
state.director.threat = 40;
state.director.tension = 50;
state.director.protectionUntil = 0;

const cells = freeBuildableCells(state);
assert(placeBuilding(state, content, 'barricade', cells[0][0], cells[0][1]).ok, 'barricade');
const c2 = freeBuildableCells(state);
assert(placeBuilding(state, content, 'watchtower', c2[0][0], c2[0][1]).ok, 'watchtower');
const tower = state.base.buildings.find((b) => b.type === 'watchtower');
if (tower) tower.workers = 1;

const bd = defenseBreakdown(state, content.buildings, content.balance);
assert(bd.total > 0 && bd.buildings > 0, 'defense breakdown');
assert(Math.abs(defenseValue(state, content.buildings, content.balance) - bd.total) < 0.01, 'defenseValue = breakdown');

const rng = createRng(42);
const horde = composeHorde(3, 1, content.infectedDoc, rng);
assert(horde.units.length >= 1 && horde.label, 'compose horde');
assert(horde.power > 0, 'horde power');

schedulePendingAttack(state, 3, content);
assert(state.pendingAttack?.intensity >= 1, 'pending attack');
assert(state.pendingAttack.arrivesOnDay > state.day, 'warn day future');
const objWarn = currentObjective(state, content);
assert(objWarn?.id === 'pending_attack', 'objective pending_attack');

// Force resolve
state.pendingAttack.arrivesOnDay = state.day;
const atk = resolveBaseAttack(state, content, state.pendingAttack.intensity, {
  horde: state.pendingAttack.horde,
});
assert(['win', 'messy', 'lose'].includes(atk.result), 'attack result');
assert(typeof atk.ammoSpent === 'number', 'ammo spent reported');
assert(atk.hordeLabel, 'horde in report');
assert(!state.pendingAttack, 'pending cleared');

if (atk.result === 'lose') {
  assert(state.day < state.director.protectionUntil, 'protection after lose');
  const objR = currentObjective(state, content);
  assert(
    objR?.id === 'recovery' || objR?.id === 'need_repair' || objR?.id === 'pending_attack',
    'objective recovery/repair after lose'
  );
}

// Tech ammo_craft / watch_protocols bump defense
state.research.unlocked = ['watch_protocols', 'ammo_craft'];
const bd2 = defenseBreakdown(state, content.buildings, content.balance);
assert(bd2.tech >= 3, 'watch_protocols tech bonus');

// No fixed calendar: many advances without requiring attack on fixed day
let attacks = 0;
const s2 = createNewState(content, 'Calma', 'smoke-cal');
s2.flags.onboardingDone = true;
s2.day = 8;
s2.director.protectionUntil = 99;
s2.director.tension = 5;
s2.resources.food = 200;
s2.resources.water = 200;
for (let i = 0; i < 6; i++) {
  const r = advanceDay(s2, content);
  if (r.attack) attacks++;
}
assert(attacks === 0, 'protección bloquea ataques graves en ventana');

if (fails) {
  console.error('smoke-zz060-065 FAIL', fails);
  process.exit(1);
}
console.log('smoke-zz060-065 OK');
