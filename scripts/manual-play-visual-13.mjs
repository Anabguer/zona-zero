/**
 * Partida manual D1→D30 — decisiones de colonia (1.3 UX).
 * node scripts/manual-play-visual-13.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (n) => JSON.parse(readFileSync(join(root, 'content', n), 'utf8'));
const content = {
  balance: load('balance.json'),
  buildings: load('buildings.json'),
  eventsDoc: load('events.json'),
  survivorsDoc: load('survivors.json'),
  researchDoc: load('research.json'),
  vehiclesDoc: load('vehicles.json'),
  infectedDoc: load('infected.json'),
  factionsDoc: load('factions.json'),
  erasDoc: load('eras.json'),
  locationsDoc: load('locations.json'),
};

const { createNewState } = await import(pathToFileURL(join(root, 'js', 'state.js')).href);
const {
  placeBuilding,
  advanceDay,
  adjustBuildingWorkers,
  adjustCategoryLabor,
  startExpedition,
  syncLaborFromColony,
} = await import(pathToFileURL(join(root, 'js', 'sim.js')).href);
const { colonyVisualTier } = await import(pathToFileURL(join(root, 'js', 'render-map.js')).href);

const state = createNewState(content, 'Manual 1.3', 'manual-13');
state._autoResolveChoices = true;

function freeCell() {
  for (let y = 0; y < state.base.h; y++) {
    for (let x = 0; x < state.base.w; x++) {
      if (!state.base.buildings.some((b) => b.x === x && b.y === y && b.hp > 0)) return [x, y];
    }
  }
  return null;
}
function tryBuild(type) {
  adjustCategoryLabor(state, content, 'build', 1);
  Object.keys(state.resources).forEach((k) => {
    state.resources[k] = Math.max(state.resources[k] || 0, 50);
  });
  const cell = freeCell();
  if (!cell) return `sin celda ${type}`;
  const r = placeBuilding(state, content, type, cell[0], cell[1]);
  if (r.ok) {
    const b = state.base.buildings.find((x) => x.type === type && x.x === cell[0]);
    if (b && content.buildings[type]?.jobs > 0) adjustBuildingWorkers(state, content, b.id, 1);
  }
  return r.ok ? `OK ${type}` : `FAIL ${type}: ${r.error}`;
}

const plan = {
  1: ['farm', 'well'],
  3: ['house'],
  5: ['workshop', 'barricade'],
  8: ['storage', 'medkit'],
  12: ['fence'],
  15: ['watchtower'],
  18: ['greenhouse'],
  22: ['cistern', 'sawmill'],
  25: ['infirmary'],
  28: ['house'],
};

const lines = ['Partida manual 1.3 D1–D30', ''];
for (let day = 1; day <= 30; day++) {
  syncLaborFromColony(state, content);
  const notes = (plan[day] || []).map(tryBuild);
  if (day === 2) {
    const ex = state.explorers.find((e) => e.status === 'ready');
    const z = state.zones.find((x) => x.state === 'discovered' && x.type !== 'camp');
    if (ex && z) {
      if ((state.resources.fuel || 0) < 1) state.resources.fuel = 1;
      const r = startExpedition(state, content, z.id, ex.id);
      notes.push(r.ok ? `Explorar ${z.name}` : `exp FAIL ${r.error}`);
    }
  }
  if (day === 1 || day === 15 || day === 30 || notes.length) {
    const nB = state.base.buildings.filter((b) => b.hp > 0).length;
    lines.push(
      `D${day} tier=${colonyVisualTier(state)} bld=${nB} pop=${state.population.total} food=${state.resources.food} · ${notes.join('; ') || '—'}`
    );
  }
  const r = advanceDay(state, content);
  if (r?.defeated || state.flags?.defeated) {
    lines.push(`DERROTA D${state.day}: ${state.flags.defeatReason}`);
    break;
  }
}

const outDir = join(root, 'scripts', 'screenshots-prod');
mkdirSync(outDir, { recursive: true });
const out = join(outDir, 'MANUAL-D30-13.txt');
writeFileSync(out, lines.join('\n'), 'utf8');
console.log(lines.join('\n'));
console.log('Wrote', out);
