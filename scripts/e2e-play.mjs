/**
 * Prueba de partida real (motor + asserts de UI-critical).
 * Simula: nueva → gente → zona → expedición → días → construir → derrota solo al vaciar.
 * node .\e2e-play.mjs
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content');
const css = readFileSync(join(root, 'css', 'game.css'), 'utf8');

function loadJson(name) {
  return JSON.parse(readFileSync(join(contentDir, name), 'utf8'));
}

/** Mirror js/state.js loadContent (sync, from disk). */
function loadContentSync() {
  const balance = loadJson('balance.json');
  const buildings = loadJson('buildings.json');
  const eventsDoc = loadJson('events.json');
  const survivorsDoc = loadJson('survivors.json');
  const researchDoc = loadJson('research.json');
  const vehiclesDoc = loadJson('vehicles.json');
  const infectedDoc = loadJson('infected.json');
  const factionsDoc = loadJson('factions.json');
  const erasDoc = loadJson('eras.json');
  const locationsDoc = loadJson('locations.json');
  const zonesDoc = {
    zones: (locationsDoc.seedLayout || []).map((z) => ({
      ...z,
      name: z.name || locationsDoc.locationTypes?.[z.type]?.name || z.id,
      risk: z.risk ?? locationsDoc.locationTypes?.[z.type]?.baseRisk ?? 0.3,
      loot: z.loot || locationsDoc.locationTypes?.[z.type]?.lootBias || {},
      infected: z.infected || locationsDoc.locationTypes?.[z.type]?.infected || [0, 2],
    })),
  };
  return {
    balance,
    buildings,
    eventsDoc,
    survivorsDoc,
    researchDoc,
    vehiclesDoc,
    infectedDoc,
    factionsDoc,
    erasDoc,
    locationsDoc,
    zonesDoc,
  };
}

const content = loadContentSync();

const { createNewState, livingSurvivors, migrateState, summarizeState, SKILL_KEYS } = await import(
  pathToFileURL(join(root, 'js', 'state.js')).href
);
const { advanceDay, startExpedition, placeBuilding } = await import(
  pathToFileURL(join(root, 'js', 'sim.js')).href
);

let fails = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    fails++;
  } else console.log('OK', msg);
}

// --- CSS crítico ---
assert(/\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s.test(css), 'CSS [hidden] !important presente');
assert(/\.zz-defeat:not\(\[hidden\]\)/.test(css), 'CSS derrota solo visible sin hidden');

// --- Content v7 ---
assert(!!content.locationsDoc?.seedLayout?.length, 'locations seedLayout cargado');
assert(!!content.researchDoc, 'research cargado');
assert(!!content.erasDoc, 'eras cargado');
assert(!!content.factionsDoc, 'factions cargado');
assert(!!content.vehiclesDoc, 'vehicles cargado');
assert(!!content.infectedDoc, 'infected cargado');
assert(SKILL_KEYS.includes('produce'), 'skill produce en SKILL_KEYS');

// --- Nueva partida ---
let state = createNewState(content, 'Prueba Real');
assert(state.flags.defeated === false, 'nueva partida no derrotada');
assert(livingSurvivors(state).length === 3, '3 supervivientes visibles en estado');
assert(state.resources.food > 0 && state.resources.water > 0, 'recursos iniciales');
assert(state.zones.some((z) => z.state === 'discovered'), 'hay zona descubierta');
assert(state.base.buildings.some((b) => String(b.type).startsWith('hq_')), 'hay HQ');
assert(
  livingSurvivors(state).every((s) => s.skills && s.skills.produce != null),
  'supervivientes tienen skill produce'
);

// --- Selección gente + zona + expedición ---
const team = livingSurvivors(state).slice(0, 2).map((s) => s.id);
state.resources.fuel += 5;
const zone = state.zones.find((z) => z.id === 'market');
assert(!!zone, 'zona mercado existe');
const ex = startExpedition(state, content, 'market', team);
assert(ex.ok, 'enviar expedición: ' + (ex.error || 'ok'));
assert(!!state.expedition, 'expedición en curso');

// --- Avanzar días hasta retorno ---
let returned = false;
for (let i = 0; i < 6; i++) {
  const before = state.expedition;
  advanceDay(state, content);
  if (before && !state.expedition) returned = true;
  assert(state.flags.defeated === false || livingSurvivors(state).length === 0, 'sin derrota falsa día ' + state.day);
  if (state.flags.defeated) break;
}
assert(returned || state.flags.defeated, 'expedición resolvió o derrota legítima');
assert(livingSurvivors(state).length >= 1 || state.flags.defeated, 'sigue habiendo gente o derrota real');

// --- Construir ---
if (!state.flags.defeated) {
  state.resources.wood += 20;
  state.resources.water += 10;
  state.resources.metal += 20;
  // buscar celda libre
  let placed = false;
  outer: for (let y = 0; y < state.base.h; y++) {
    for (let x = 0; x < state.base.w; x++) {
      if (state.base.buildings.some((b) => b.x === x && b.y === y)) continue;
      const r = placeBuilding(state, content, 'farm', x, y);
      if (r.ok) {
        placed = true;
        break outer;
      }
    }
  }
  assert(placed, 'construir huerto');
}

// --- Varios días + posible evento ---
const logBefore = state.log.length;
for (let i = 0; i < 5; i++) {
  if (state.flags.defeated) break;
  advanceDay(state, content);
}
assert(state.log.length > logBefore, 'diario creció (días/eventos)');
assert(state.day >= 3, 'varios días jugados: día ' + state.day);

// --- Guardado roundtrip ---
const raw = JSON.parse(JSON.stringify(state));
const loaded = migrateState(raw, content.balance);
assert(loaded.day === state.day, 'cargar mantiene día');
assert(livingSurvivors(loaded).length === livingSurvivors(state).length, 'cargar mantiene población');
assert(loaded.flags.defeated === state.flags.defeated, 'cargar mantiene defeated');
console.log('Resumen guardado:', summarizeState(loaded));

// --- Derrota SOLO al vaciar ---
const doom = createNewState(content, 'Doom');
assert(doom.flags.defeated === false, 'doom fresco no derrotado');
doom.survivors.forEach((s) => {
  s.hp = 0;
  s.status = 'dead';
});
advanceDay(doom, content);
assert(doom.flags.defeated === true, 'derrota solo sin vivos');

if (fails) {
  console.error('\nE2E FALLÓ:', fails);
  process.exit(1);
}
console.log('\nE2E PLAY OK — flujo jugable sin derrota falsa');
