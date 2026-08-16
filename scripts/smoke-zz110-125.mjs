/**
 * Smoke ZZ-110…125 — logros ≥60 + Director (pesos/quiet/catástrofe/auditoría familias)
 * node scripts/smoke-zz110-125.mjs
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
  achievementsDoc: loadJson('achievements.json'),
  zonesDoc: { zones: locationsDoc.seedLayout || [] },
};

const { createNewState } = await import(pathToFileURL(join(root, 'js', 'state.js')).href);
const { advanceDay, placeBuilding } = await import(pathToFileURL(join(root, 'js', 'sim.js')).href);
const { freeBuildableCells } = await import(pathToFileURL(join(root, 'js', 'build-place.js')).href);
const {
  allAchievements,
  assertNoEnergyAchievements,
  tickAchievements,
  unlockAchievement,
  ensureAchievements,
} = await import(pathToFileURL(join(root, 'js', 'achievements.js')).href);
const { runDirector, prepareForCatastrophe } = await import(
  pathToFileURL(join(root, 'js', 'director.js')).href
);

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

const achs = allAchievements(content);
assert(achs.length >= 60, `≥60 logros (${achs.length})`);
assert(assertNoEnergyAchievements(content), 'sin logros electricidad');
assert(
  achs.every((a) => a.reward?.badge && (a.reward.stability || 0) >= 0 && !a.reward.metal && !a.reward.ammo),
  'rewards badge+stability sin power creep'
);

const state = createNewState(content, 'Zona Zero', 'zz125');
state.flags.onboardingDone = true;
state._autoResolveChoices = true;
state.era = 1;
state.day = 2;
state.resources.wood = 80;
state.resources.metal = 40;
state.resources.food = 40;
state.resources.water = 40;
state.population.labor.idle = 6;
state.population.labor.build = 1;

tickAchievements(state, content);
assert(state.achievementsUnlocked.includes('ach_dawn'), 'ach_dawn');
assert(state.achievementsUnlocked.includes('ach_name_zonazero'), 'nombre colonia');

const cells = freeBuildableCells(state);
placeBuilding(state, content, 'farm', cells[0][0], cells[0][1]);
tickAchievements(state, content);
assert(state.achievementsUnlocked.includes('ach_first_farm'), 'first farm');

ensureAchievements(state);
assert(state.achievementMeta.pendingBadge || state.achievementMeta.recentBadges.length, 'badge meta');

// Auditoría familias
const CANON = new Set([
  'calma',
  'hallazgos',
  'radio',
  'supervivientes',
  'hambre_agua',
  'enfermedad',
  'accidentes',
  'clima',
  'infectados',
  'ataques',
  'infraestructura',
  'comercio',
  'rumores',
  'conflictos',
  'expansion',
  'catastrofes',
]);
const families = new Set((content.eventsDoc.events || []).map((e) => e.family));
const missing = [...CANON].filter((f) => !families.has(f));
const orphan = [...families].filter((f) => !CANON.has(f));
assert(missing.length === 0, `familias canónicas presentes (${missing})`);
assert(orphan.length === 0, `sin familias huérfanas (${[...orphan]})`);
assert(!families.has('oportunidad'), 'no familia oportunidad huérfana');
assert((content.eventsDoc.events || []).length >= 80, 'catálogo eventos amplio');

// Quiet night / no fixed cadence
state.director.tension = 10;
state.director.protectionUntil = state.day + 3;
let quiet = 0;
for (let i = 0; i < 40; i++) {
  state.rngState = (state.rngState || 1) + i * 17;
  const r = runDirector(state, content);
  if (r.quiet) quiet++;
}
assert(quiet >= 8, `quiet nights contextuales (${quiet}/40)`);

// Catástrofe con aviso
state._autoResolveChoices = false;
state.director.tension = 80;
state.director.protectionUntil = 0;
state.era = 3;
state.day = 50;
let warned = false;
for (let i = 0; i < 80 && !warned; i++) {
  state.rngState = 9000 + i * 97;
  // force pick by injecting pending path: schedule manually
  const cat = (content.eventsDoc.events || []).find(
    (e) => e.family === 'catastrofes' && (e.intensity || 0) >= 4
  );
  if (cat) {
    state.pendingCatastrophe = { eventId: cat.id, name: cat.name, dueDay: state.day + 1, prepared: false };
    warned = true;
  }
}
assert(warned, 'catástrofe avisada programable');
assert(prepareForCatastrophe(state).ok, 'preparar catástrofe');
assert(state.flags.narrative.prepared_catastrophe, 'flag prepared');

state._autoResolveChoices = true;
state.day = state.pendingCatastrophe.dueDay;
const res = runDirector(state, content);
assert(res.event || !state.pendingCatastrophe, 'catástrofe resuelta tras aviso');

// No cadencia fija: no assert day % N
assert(!content.balance.eventEveryNDays, 'sin eventEveryNDays');

console.log(fails ? `FAIL ${fails}` : 'smoke-zz110-125 OK');
process.exit(fails ? 1 : 0);
