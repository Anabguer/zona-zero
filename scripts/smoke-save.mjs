/**
 * Smoke ZZ-009 — save main+backup (mock in-memory).
 * node scripts/smoke-save.mjs
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

const { createNewState } = await import(pathToFileURL(join(root, 'js', 'state.js')).href);
const api = await import(pathToFileURL(join(root, 'dev', 'api-mock.js')).href);

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

await api.clearGame();
let st = await api.fetchSaveStatus();
assert(!st.save, 'sin partida al inicio');

const s1 = createNewState(content, 'Alpha', 'smoke-save-1');
s1.day = 1;
let r = await api.saveGame(s1, 'Alpha', 'Día 1');
assert(r.ok, 'primer save main');

const s2 = createNewState(content, 'Alpha', 'smoke-save-2');
s2.day = 3;
r = await api.saveGame(s2, 'Alpha', 'Día 3');
assert(r.ok, 'segundo save rota backup');

const dump = api.__mockDump();
assert(dump.main?.state?.day === 3, 'main = día 3');
assert(dump.backup?.state?.day === 1, 'backup = día 1');

// Corromper main
dump.main.state = { broken: true };
r = await api.loadGame();
assert(r.ok && r.recoveredFromBackup, 'load recupera backup');
assert(r.state.day === 1, 'estado recuperado día 1');

r = await api.saveGame({ day: 0, resources: {}, base: {} }, 'bad', 'bad');
assert(!r.ok, 'rechaza payload inválido');

await api.clearGame();
st = await api.fetchSaveStatus();
assert(!st.save, 'clear elimina main+backup');

if (fails) {
  console.error('Smoke save FAIL', fails);
  process.exit(1);
}
console.log('Smoke save OK');
