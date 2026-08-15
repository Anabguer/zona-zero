/**
 * Smoke ZZ-007 — portada sin slots (API status + hub.css).
 * node scripts/smoke-boot.mjs
 */
import { pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

const api = await import(pathToFileURL(join(root, 'dev', 'api-mock.js')).href);
await api.clearGame();
let st = await api.fetchSaveStatus();
assert(!st.save, 'status vacío');

const { createNewState } = await import(pathToFileURL(join(root, 'js', 'state.js')).href);
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
const s = createNewState(content, 'Beta', 'boot');
await api.saveGame(s, 'Beta', 'Día 1');
st = await api.fetchSaveStatus();
assert(st.save && st.save.title === 'Beta', 'status con partida');
assert(!Array.isArray(st.slots) || st.slots.length <= 1, 'sin UI multi-slot (≤1 entrada lógica)');

assert(existsSync(join(root, 'css', 'hub.css')), 'hub.css existe');
const hubCss = readFileSync(join(root, 'css', 'hub.css'), 'utf8');
assert(hubCss.includes('zz-hub__brand'), 'hub.css brand');
assert(existsSync(join(root, 'index.php')), 'index.php portada');
const indexPhp = readFileSync(join(root, 'index.php'), 'utf8');
assert(indexPhp.includes('zz-hub-actions'), 'index sin grid slots');
assert(!indexPhp.includes('zz-slots'), 'sin zz-slots');

if (fails) {
  console.error('Smoke boot FAIL', fails);
  process.exit(1);
}
console.log('Smoke boot OK');
