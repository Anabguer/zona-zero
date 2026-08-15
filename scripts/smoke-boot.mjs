/**
 * Smoke ZZ-008 — intro cinemática + confirmación (sin prompt/confirm nativos).
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

const hubCss = readFileSync(join(root, 'css', 'hub.css'), 'utf8');
assert(hubCss.includes('zz-cine__art'), 'hub.css arte intro');
assert(hubCss.includes('zz-cine--collapse'), 'layouts por escena');
assert(hubCss.includes('zzKen'), 'ken burns');

for (const f of ['collapse.jpg', 'refuge.jpg', 'mission.jpg']) {
  assert(existsSync(join(root, 'assets', 'art', 'intro', f)), `asset ${f}`);
}

const introSrc = readFileSync(join(root, 'js', 'intro.js'), 'utf8');
assert(introSrc.includes('INTRO_STEPS'), 'intro.js INTRO_STEPS');
assert(introSrc.includes('Entrar en Zona Zero'), 'CTA final propia');
assert(introSrc.includes('applyIntroArrival'), 'fade llegada D1');
assert(introSrc.includes('sustituirá esta partida'), 'texto confirmación GM');

const { INTRO_STEPS, markIntroSeen, DEFAULT_COLONY_NAME } = await import(
  pathToFileURL(join(root, 'js', 'intro.js')).href
);
assert(INTRO_STEPS.length === 3, 'exactamente 3 pasos');
assert(INTRO_STEPS.every((s) => s.art && s.line), 'cada paso con arte + línea');
assert(INTRO_STEPS[2].pillars?.length === 4, '4 pilares misión');
assert(DEFAULT_COLONY_NAME === 'Refugio Norte', 'nombre colonia por defecto');

const mainSrc = readFileSync(join(root, 'js', 'main.js'), 'utf8');
assert(mainSrc.includes('startNewGameFlow'), 'main usa startNewGameFlow');
assert(!mainSrc.includes("window.prompt('Nombre de la colonia'"), 'sin prompt nombre');

const fresh = createNewState(content, 'IntroTest');
markIntroSeen(fresh);
assert(fresh.flags.introSeen === true, 'markIntroSeen');
assert(fresh.flags.onboardingActive === false, 'coach diferido ZZ-012');

const worldCss = readFileSync(join(root, 'css', 'world.css'), 'utf8');
assert(worldCss.includes('zz-from-intro'), 'fade D1 en world.css');

if (fails) {
  console.error('Smoke boot FAIL', fails);
  process.exit(1);
}
console.log('Smoke boot OK');
