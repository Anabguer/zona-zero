/**
 * Prueba manual razonada D1–D10 — decisiones antes de cada Avanzar día.
 * node scripts/manual-play-colony.mjs
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

const state = createNewState(content, 'Colonia D10', 'colony-manual-10');
state._autoResolveChoices = true;

function freeCell() {
  for (let y = 0; y < state.base.h; y++) {
    for (let x = 0; x < state.base.w; x++) {
      if (!state.base.buildings.some((b) => b.x === x && b.y === y && b.hp > 0)) return [x, y];
    }
  }
  return null;
}

const lines = [];
const push = (s) => lines.push(s);

push('Prueba D1–D10 — núcleo de gestión (sin mirar código durante decisiones)');
push('');

for (let day = 1; day <= 10; day++) {
  const decisions = [];
  syncLaborFromColony(state, content);

  if (day === 1) {
    decisions.push('Objetivo: asegurar comida y agua');
    adjustCategoryLabor(state, content, 'build', 1);
    decisions.push('Población: 1 a construcción');
    let cell = freeCell();
    let r = placeBuilding(state, content, 'farm', cell[0], cell[1]);
    decisions.push(r.ok ? 'Construir HUERTO (colocación en refugio)' : `FAIL farm ${r.error}`);
    cell = freeCell();
    r = placeBuilding(state, content, 'well', cell[0], cell[1]);
    decisions.push(r.ok ? 'Construir POZO' : `FAIL well ${r.error}`);
    // Liberar build y repartir: 1 comida + 1 agua (trade-off real)
    adjustCategoryLabor(state, content, 'build', -1);
    const farm = state.base.buildings.find((b) => b.type === 'farm' && b.hp > 0);
    const well = state.base.buildings.find((b) => b.type === 'well' && b.hp > 0);
    if (farm) adjustBuildingWorkers(state, content, farm.id, 1);
    if (well) adjustBuildingWorkers(state, content, well.id, 1);
    decisions.push('Edificios: 1 en huerto, 1 en pozo (1 disponible)');
  } else if (day === 2) {
    decisions.push('Explorador: Mandar a explorar → Supermercado Norte');
    const ex = state.explorers.find((e) => e.status === 'ready');
    const z = state.zones.find((x) => x.state === 'discovered' && x.type !== 'camp');
    if (ex && z) {
      if ((state.resources.fuel || 0) < 1) state.resources.fuel = 1;
      const r = startExpedition(state, content, z.id, ex.id);
      decisions.push(r.ok ? `Enviar ${ex.name} a ${z.name}` : r.error);
    }
  } else if (day === 3) {
    decisions.push('Esperar retorno explorador; mantener producción');
    if ((state.population.labor?.idle || 0) > 0) {
      const farm = state.base.buildings.find((b) => b.type === 'farm' && b.hp > 0);
      if (farm && (farm.workers || 0) < 2) {
        adjustBuildingWorkers(state, content, farm.id, 1);
        decisions.push('Subir huerto a 2 trabajadores (más comida)');
      }
    }
  } else if (day === 4) {
    decisions.push('Capacidad: liberar 1 del huerto → construcción → refugio');
    const farm = state.base.buildings.find((b) => b.type === 'farm' && b.hp > 0);
    if (farm && (farm.workers || 0) > 1) adjustBuildingWorkers(state, content, farm.id, -1);
    adjustCategoryLabor(state, content, 'build', 1);
    const cell = freeCell();
    if (cell) {
      const r = placeBuilding(state, content, 'shelter', cell[0], cell[1]);
      decisions.push(r.ok ? 'Colocar refugio extra' : r.error);
    }
    adjustCategoryLabor(state, content, 'build', -1);
    if (farm) adjustBuildingWorkers(state, content, farm.id, 1);
    decisions.push('Devolver trabajador al huerto');
  } else if (day === 5) {
    decisions.push('Revisar agua: asegurar 1 en pozo; explorar si hay idle explorador');
    const well = state.base.buildings.find((b) => b.type === 'well' && b.hp > 0);
    if (well && (well.workers || 0) < 1 && (state.population.labor?.idle || 0) > 0) {
      adjustBuildingWorkers(state, content, well.id, 1);
      decisions.push('Reasignar 1 al pozo');
    }
  } else if (day === 6) {
    decisions.push('Trade-off: quitar 1 de comida → segundo en pozo si agua baja');
    if ((state.resources.water || 0) < 15) {
      const farm = state.base.buildings.find((b) => b.type === 'farm' && b.hp > 0);
      const well = state.base.buildings.find((b) => b.type === 'well' && b.hp > 0);
      if (farm && (farm.workers || 0) > 1) adjustBuildingWorkers(state, content, farm.id, -1);
      if (well && (well.workers || 0) < 2) adjustBuildingWorkers(state, content, well.id, 1);
      decisions.push('Priorizar agua (huerto−1, pozo+1)');
    } else {
      decisions.push('Agua OK; mantener asignación');
    }
  } else if (day === 7) {
    decisions.push('Defensa ligera: 1 disponible a construcción → barricada');
    if ((state.population.labor?.idle || 0) < 1) {
      const farm = state.base.buildings.find((b) => b.type === 'farm' && b.hp > 0);
      if (farm && (farm.workers || 0) > 1) adjustBuildingWorkers(state, content, farm.id, -1);
    }
    adjustCategoryLabor(state, content, 'build', 1);
    const cell = freeCell();
    if (cell) {
      const r = placeBuilding(state, content, 'barricade', cell[0], cell[1]);
      decisions.push(r.ok ? 'Colocar barricada' : r.error);
    }
    adjustCategoryLabor(state, content, 'build', -1);
  } else if (day === 8) {
    decisions.push('Reequilibrar producción comida/agua tras obras');
    const farm = state.base.buildings.find((b) => b.type === 'farm' && b.hp > 0);
    const well = state.base.buildings.find((b) => b.type === 'well' && b.hp > 0);
    if (well && (well.workers || 0) < 1 && (state.population.labor?.idle || 0) > 0) {
      adjustBuildingWorkers(state, content, well.id, 1);
    }
    if (farm && (farm.workers || 0) < 2 && (state.population.labor?.idle || 0) > 0) {
      adjustBuildingWorkers(state, content, farm.id, 1);
    }
    decisions.push(`Labor: comida ${state.population.labor.food} agua ${state.population.labor.water} idle ${state.population.labor.idle}`);
  } else if (day === 9) {
    const ex = state.explorers.find((e) => e.status === 'ready');
    const z = state.zones.find((x) => (x.state === 'discovered' || x.state === 'hostile') && x.type !== 'camp');
    if (ex && z && (state.expeditions || []).length === 0) {
      if ((state.resources.fuel || 0) < 1) state.resources.fuel = 1;
      const r = startExpedition(state, content, z.id, ex.id);
      decisions.push(r.ok ? `Segunda salida: ${ex.name} → ${z.name}` : r.error);
    } else {
      decisions.push('Sin explorador libre; mantener colonia');
    }
  } else if (day === 10) {
    decisions.push('Cierre: comprobar objetivo y stock antes de avanzar');
  }

  syncLaborFromColony(state, content);
  push(`--- Día ${day} (antes de Avanzar) ---`);
  push(`Población ${state.population.total} · comida ${Math.round(state.resources.food)} · agua ${Math.round(state.resources.water)}`);
  push(
    `Labor idle=${state.population.labor.idle} food=${state.population.labor.food} water=${state.population.labor.water} build=${state.population.labor.build}`
  );
  push(
    `Edificios: ${state.base.buildings
      .filter((b) => b.hp > 0)
      .map((b) => `${b.type}:${b.workers || 0}`)
      .join(', ')}`
  );
  decisions.forEach((d) => push(`  · ${d}`));

  const r = advanceDay(state, content);
  push(`  → Tras avanzar: Día ${state.day}`);
  if (r.brief?.lines?.length) push(`  Resumen: ${r.brief.lines.join(' · ')}`);
  if (state.flags.defeated) {
    push(`DERROTA: ${state.flags.defeatReason}`);
    break;
  }
  push('');
}

push(`FIN: D${state.day} pop=${state.population.total} defeated=${!!state.flags.defeated}`);
const outDir = join(root, 'scripts', 'screenshots-prod');
mkdirSync(outDir, { recursive: true });
const out = join(outDir, 'MANUAL-D10.txt');
writeFileSync(out, lines.join('\n'), 'utf8');
console.log(lines.join('\n'));
console.log('\nWrote', out);
