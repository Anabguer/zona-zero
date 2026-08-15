/**
 * Prueba visual D1→D40: construye y avanza; log de edificios por hitos.
 * node scripts/manual-play-visual-125.mjs
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
  syncLaborFromColony,
} = await import(pathToFileURL(join(root, 'js', 'sim.js')).href);
const { colonyVisualTier } = await import(pathToFileURL(join(root, 'js', 'render-map.js')).href);

const state = createNewState(content, 'Visual 1.2.5', 'visual-125');
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
    state.resources[k] = Math.max(state.resources[k] || 0, 40);
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
  12: ['greenhouse', 'fence'],
  18: ['watchtower', 'cistern'],
  25: ['infirmary', 'sawmill'],
  32: ['house'],
};

const lines = ['Prueba visual crecimiento 1.2.5', ''];
for (let day = 1; day <= 40; day++) {
  syncLaborFromColony(state, content);
  const builds = plan[day] || [];
  const notes = builds.map(tryBuild);
  if (day === 1 || day === 18 || day === 40 || builds.length) {
    const nB = state.base.buildings.filter((b) => b.hp > 0).length;
    lines.push(
      `D${day} tier=${colonyVisualTier(state)} bld=${nB} pop=${state.population.total} · ${notes.join('; ') || '—'}`
    );
  }
  const r = advanceDay(state, content);
  if (r?.defeated) {
    lines.push(`DERROTA D${state.day}: ${state.flags.defeatReason}`);
    break;
  }
}

const outDir = join(root, 'scripts', 'screenshots-prod');
mkdirSync(outDir, { recursive: true });
const out = join(outDir, 'MANUAL-VISUAL-125.txt');
writeFileSync(out, lines.join('\n'), 'utf8');
console.log(lines.join('\n'));
console.log('Wrote', out);
