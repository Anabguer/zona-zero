/**
 * Smoke D1 only — Bloque 1B
 * node scripts/smoke-d1.mjs
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content');
const loadJson = (n) => JSON.parse(readFileSync(join(contentDir, n), 'utf8'));
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
const { placeBuilding, adjustBuildingWorkers } = await import(pathToFileURL(join(root, 'js', 'sim.js')).href);
const { ensureOnboarding, checkOnboardingProgress, onboardingStatus } = await import(
  pathToFileURL(join(root, 'js', 'onboarding.js')).href
);
const { recenterCamera, clampCamera, zoomCameraBy, panCameraBy } = await import(
  pathToFileURL(join(root, 'js', 'render-map.js')).href
);

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

const state = createNewState(content, 'Refugio Norte', 'smoke-d1');
ensureOnboarding(state);
recenterCamera(state);
clampCamera(state);
assert(state.day === 1, 'día 1');
assert(Array.isArray(state.sectors) && state.sectors.some((s) => s.id === 'core' && s.status === 'recovered'), 'sectores ZZ-018');
assert((state.mapCamera.zoom || 0) >= 2.9 && (state.mapCamera.zoom || 0) <= 3.25, 'zoom D1 cercano HQ: ' + state.mapCamera.zoom);
const z0 = state.mapCamera.zoom;
zoomCameraBy(state, 1.15);
assert(state.mapCamera.zoom > z0, 'zoom in: ' + state.mapCamera.zoom);
const z1 = state.mapCamera.zoom;
zoomCameraBy(state, 1 / 1.15);
assert(state.mapCamera.zoom < z1 + 0.001, 'zoom out: ' + state.mapCamera.zoom);
const camp = state.zones.find((z) => z.type === 'camp');
panCameraBy(state, 18, -14);
const panDist = Math.hypot(state.mapCamera.x - camp.x, state.mapCamera.y - camp.y);
assert(panDist >= 14 && panDist <= 42.01, 'pan lejos del HQ permitido D1: ' + panDist);
panCameraBy(state, 40, -40);
assert(Math.hypot(state.mapCamera.x - camp.x, state.mapCamera.y - camp.y) <= 42.01, 'pan clamp D1 ampliado');
recenterCamera(state);
assert(Math.abs(state.mapCamera.x - camp.x) < 0.01, 'recenter x');
assert((state.mapCamera.zoom || 0) >= 2.9, 'recenter zoom D1');
const startB = state.base.buildings.filter((b) => b.hp > 0);
assert(startB.length === 1 && String(startB[0].type).startsWith('hq_'), 'D1 solo HQ (capacidad, no 1 casa/habitante)');
assert(onboardingStatus(state)?.step?.id === 'need_food', 'need_food contextual');
assert(onboardingStatus(state)?.step?.highlight === 'build', 'highlight construir');
assert(!onboardingStatus(state)?.step?.cta, 'sin CTA Continuar');
assert(/Núcleo|huerto/i.test(onboardingStatus(state)?.step?.text || ''), 'tip menciona Núcleo/huerto');

function free() {
  const cx = Math.floor(state.base.w / 2);
  const cy = Math.floor(state.base.h / 2);
  const cells = [];
  for (let y = 0; y < state.base.h; y++)
    for (let x = 0; x < state.base.w; x++)
      if (!state.base.buildings.some((b) => b.x === x && b.y === y && b.hp > 0))
        cells.push([x, y, Math.abs(x - cx) + Math.abs(y - cy)]);
  cells.sort((a, b) => a[2] - b[2]);
  return cells[0];
}

const [fx, fy] = free();
assert(placeBuilding(state, content, 'farm', fx, fy).ok, 'huerto');
checkOnboardingProgress(state);
assert(onboardingStatus(state)?.step?.id === 'staff_farm', 'staff_farm');
const farm = state.base.buildings.find((b) => b.type === 'farm');
assert(adjustBuildingWorkers(state, content, farm.id, 1).ok, 'asignar');
checkOnboardingProgress(state);
assert(onboardingStatus(state)?.step?.id === 'need_water', 'need_water');
assert(state.day === 1, 'sigue en D1');

const [wx, wy] = free();
assert(placeBuilding(state, content, 'well', wx, wy).ok, 'pozo');
checkOnboardingProgress(state);
assert(onboardingStatus(state)?.step?.id === 'staff_well', 'staff_well');
const well = state.base.buildings.find((b) => b.type === 'well');
assert(adjustBuildingWorkers(state, content, well.id, 1).ok, 'asignar pozo');
checkOnboardingProgress(state);
assert(onboardingStatus(state)?.step?.id === 'ready', 'ready tip avanzar día');

if (fails) process.exit(1);
console.log('Smoke D1 OK');
