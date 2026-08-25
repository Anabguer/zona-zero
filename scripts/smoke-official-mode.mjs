/**
 * Smoke B1 — entrada oficial + persistencia real (sin DOM, sin BD real).
 * node scripts/smoke-official-mode.mjs
 *
 * Cubre:
 * 1. resolvePlayMode: matriz completa de decisión de entrada.
 * 2. SAVE_VERSION 8 + normalización gen ('neni') desde flags piloto antiguos.
 * 3. Guarda legacy: el wipe a HQ solo aplica a partidas Clásicas.
 * 4. Round-trip MySQL (api-mock): oficial guarda/carga íntegro con gen y HQ canon A.
 */
import { pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

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

const { createNewState, migrateState, SAVE_VERSION, OFFICIAL_GEN, isOfficialGen } = await import(
  pathToFileURL(join(root, 'js', 'state.js')).href
);
const { resolvePlayMode } = await import(pathToFileURL(join(root, 'js', 'play-mode.js')).href);
const api = await import(pathToFileURL(join(root, 'dev', 'api-mock.js')).href);

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

function expectMode(actual, kind, qa, reason, m) {
  assert(
    actual.kind === kind && actual.qa === qa && actual.reason === reason,
    `${m} → ${actual.kind}/${actual.qa}/${actual.reason} (esperado ${kind}/${qa}/${reason})`
  );
}

// ---------- 1. resolvePlayMode ----------
expectMode(resolvePlayMode({ explicitPilot: true }), 'official', false, 'pilot-alias', 'alias ?pilot=neni');
expectMode(resolvePlayMode({ bodyPilot: true }), 'official', false, 'pilot-alias', 'body class piloto');
expectMode(resolvePlayMode({ qa: true }), 'official', true, 'qa', '?qa=1 → QA oficial');
expectMode(resolvePlayMode({ isNew: true }), 'official', false, 'new', 'nueva partida → oficial');
expectMode(resolvePlayMode({}), 'official', false, 'no-save', 'sin save → nueva oficial implícita');

const officialPeek = {
  ok: true,
  state: { v: 8, day: 5, resources: {}, base: { w: 76, h: 37, buildings: [] }, gen: 'neni' },
};
expectMode(
  resolvePlayMode({ peek: officialPeek }),
  'official',
  false,
  'save-official',
  'save en BD con gen neni → oficial'
);

const legacyPeek = {
  ok: true,
  state: { v: 7, day: 30, resources: {}, base: { w: 10, h: 8, buildings: [] }, population: { total: 4 } },
};
expectMode(resolvePlayMode({ peek: legacyPeek }), 'legacy', false, 'save-legacy', 'save legacy → Clásica');
expectMode(
  resolvePlayMode({ legacyRequested: true, peek: legacyPeek }),
  'legacy',
  false,
  'legacy-requested',
  '?legacy=1 con save → Clásica'
);
expectMode(
  resolvePlayMode({ legacyRequested: true }),
  'legacy-empty',
  false,
  'legacy-no-save',
  '?legacy=1 sin save → aviso vacío'
);
expectMode(
  resolvePlayMode({ legacyRequested: true, isNew: true }),
  'official',
  false,
  'legacy-new-blocked',
  'legacy+nueva → BLOQUEADA, deriva a oficial'
);
expectMode(
  resolvePlayMode({ explicitPilot: true, peek: legacyPeek }),
  'legacy',
  false,
  'pilot-alias-legacy-protected',
  'alias ?pilot=neni con save Clásico en BD → protege, no pisa'
);
expectMode(
  resolvePlayMode({ explicitPilot: true, isNew: true, peek: legacyPeek }),
  'official',
  false,
  'pilot-alias',
  'alias + nueva explícita → oficial'
);
// flags.pilot antiguo también cuenta como oficial
expectMode(
  resolvePlayMode({
    peek: { ok: true, state: { v: 7, flags: { pilot: 'neni' }, base: { w: 76, h: 37, buildings: [] } } },
  }),
  'official',
  false,
  'save-official',
  'save piloto antiguo (flags.pilot) → oficial'
);

// ---------- 2. state.js: v8 + gen ----------
assert(SAVE_VERSION === 8, `SAVE_VERSION === 8 (visto ${SAVE_VERSION})`);
assert(OFFICIAL_GEN === 'neni', "OFFICIAL_GEN === 'neni'");

const freshOfficial = createNewState(content, 'Oficial B1', 'smoke-b1-a');
freshOfficial.gen = OFFICIAL_GEN;
freshOfficial.flags.pilot = 'neni';
const migOfficial = migrateState(JSON.parse(JSON.stringify(freshOfficial)), content);
assert(migOfficial.v === 8, 'migrate oficial → v8');
assert(isOfficialGen(migOfficial), 'migrate oficial conserva generación oficial');
assert(migOfficial.gen === 'neni', 'gen normalizada a nenI');

// Normalización desde save piloto localStorage viejo (solo flags.pilot, sin gen)
const oldPilotSave = JSON.parse(JSON.stringify(freshOfficial));
delete oldPilotSave.gen;
oldPilotSave.v = 7;
const migOldPilot = migrateState(oldPilotSave, content);
assert(migOldPilot.gen === 'neni', 'flags.pilot antiguo → gen nenI en migrate');

// ---------- 3. wipe solo legacy ----------
// Clásica: sin gen ni flags.pilot ni _wipeColonyToHqV1 → se limpia a HQ (comportamiento legacy intacto)
const legacyOld = createNewState(content, 'Clásica', 'smoke-b1-b');
delete legacyOld.flags._wipeColonyToHqV1;
legacyOld.base.buildings.push({ id: 'b_farm_old', type: 'farm', x: 2, y: 2, hp: 100, workers: 0 });
const migLegacy = migrateState(legacyOld, content);
assert(!isOfficialGen(migLegacy), 'estado sin gen/pilot NO es oficial');
assert(
  migLegacy.base.buildings.every((b) => String(b.type).startsWith('hq_')),
  'CLÁSICA: wipe a HQ preservado para saves legacy viejos'
);

// Oficial: edificios del mundo Neni NUNCA se limpian aunque falte el flag interno
const officialWithFarm = JSON.parse(JSON.stringify(freshOfficial));
officialWithFarm.flags._wipeColonyToHqV1 = undefined; // simula save que no trae el flag
officialWithFarm.base.buildings.push({ id: 'b_farm_neni', type: 'farm', x: -3, y: 14, hp: 100, workers: 0 });
const migProtected = migrateState(officialWithFarm, content);
assert(
  migProtected.base.buildings.some((b) => b.type === 'farm'),
  'OFICIAL: farm del mundo Neni no se elimina en migrate'
);

// ---------- 4. round-trip persistencia (api-mock) ----------
await api.clearGame();
let status = await api.fetchSaveStatus();
assert(!status.save, 'BD mock vacía al inicio');

// Oficial nueva → save inmediato (como bootOfficialWorld)
const runState = JSON.parse(JSON.stringify(freshOfficial));
runState.base.buildings[0].x = -7; // HQ canon A
runState.base.buildings[0].y = 14;
runState.base.buildings.push({ id: 'b_well_b1', type: 'well', x: -3, y: 15, hp: 100, workers: 2 });
const saved = await api.saveGame(runState, runState.colonyName, 'Día 1 · smoke B1');
assert(saved.ok, 'save oficial en BD');

status = await api.fetchSaveStatus();
assert(status.save?.gen === 'neni', `hub ve gen nenI (visto ${status.save?.gen})`);

const loaded = await api.loadGame();
assert(loaded.ok && isOfficialGen(loaded.state), 'load devuelve partida oficial');
assert(loaded.state.gen === 'neni', 'gen viaja en el payload');
const hq = loaded.state.base.buildings.find((b) => String(b.type).startsWith('hq_'));
assert(hq && hq.x === -7 && hq.y === 14, 'HQ canon A (-7,14) intacto tras round-trip');
assert(loaded.state.base.buildings.some((b) => b.id === 'b_well_b1'), 'edificio world-space intacto tras round-trip');
const remig = migrateState(loaded.state, content);
assert(remig.base.buildings.length === loaded.state.base.buildings.length, 'migrate post-load no altera edificios');

if (fails > 0) {
  console.error(`\nsmoke-official-mode: ${fails} FAIL`);
  process.exit(1);
}
console.log('\nsmoke-official-mode: TODO OK');
