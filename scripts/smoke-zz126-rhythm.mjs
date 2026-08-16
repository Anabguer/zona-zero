/**
 * ZZ-126 — Ritmo tensión → crisis → recovery (sin cadencia fija)
 * node scripts/smoke-zz126-rhythm.mjs
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
const { runDirector } = await import(pathToFileURL(join(root, 'js', 'director.js')).href);

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

assert(!content.balance.eventEveryNDays, 'sin cadencia fija');

const state = createNewState(content, 'Ritmo', 'zz126');
state.flags.onboardingDone = true;
state._autoResolveChoices = true;
state.era = 2;
state.day = 30;
state.population.total = 18;
state.resources.food = 40;
state.resources.water = 40;
state.director.tension = 70;
state.director.protectionUntil = 0;
state.director.lastCrisisDay = -99;

// Forzar crisis: simular afterEvent path via pending catastrophe resolve
const cat = (content.eventsDoc.events || []).find(
  (e) => e.family === 'catastrofes' && (e.intensity || 0) >= 4
);
assert(!!cat, 'existe catástrofe int≥4');
state.pendingCatastrophe = {
  eventId: cat.id,
  name: cat.name,
  dueDay: state.day,
  prepared: true,
};
const tensionBefore = state.director.tension;
const r1 = runDirector(state, content);
assert(r1.event || state.director.lastCrisisDay === state.day, 'crisis registrada');
assert(state.director.protectionUntil > state.day, 'protection post-crisis');
assert(state.director.tension < tensionBefore || state.director.tension <= 40, 'tensión baja tras crisis');

const prot = state.director.protectionUntil;
assert(prot > state.day, 'ventana recovery activa');
let quiet = 0;
let blockedCrisis = true;
for (let i = 0; i < 20; i++) {
  state.day += 1;
  if (state.day >= prot) break;
  state.rngState = 5000 + i * 13;
  state.director.tension = 35;
  const r = runDirector(state, content);
  if (r.quiet) quiet++;
  if (r.event && (r.event.intensity || 0) >= 4) blockedCrisis = false;
}
assert(quiet >= 1 || blockedCrisis, `recovery: quiet=${quiet} · graves bloqueadas=${blockedCrisis}`);
assert(blockedCrisis, 'protección bloquea catástrofes graves');

// Tras recovery, tensión puede subir de nuevo (no calendario)
state.day = prot + 1;
state.director.protectionUntil = 0;
state.director.tension = 55;
let nonQuiet = 0;
for (let i = 0; i < 30; i++) {
  state.rngState = 8000 + i * 19;
  const r = runDirector(state, content);
  if (!r.quiet) nonQuiet++;
}
assert(nonQuiet >= 3, `tensión vuelve a generar eventos (${nonQuiet}/30)`);

console.log(fails ? `FAIL ${fails}` : 'smoke-zz126-rhythm OK');
process.exit(fails ? 1 : 0);
