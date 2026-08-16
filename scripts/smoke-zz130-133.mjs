/**
 * Smoke ZZ-130…133 — contactos/comercio lean + UI go/no-go
 * node scripts/smoke-zz130-133.mjs
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRng } from '../js/rng.js';

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
const { applyEventEffects } = await import(pathToFileURL(join(root, 'js', 'director.js')).href);
const {
  discoverFaction,
  tradeWithFaction,
  discoveredFactions,
  relationLabel,
} = await import(pathToFileURL(join(root, 'js', 'factions.js')).href);

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

const state = createNewState(content, 'Contactos', 'zz133');
assert((state.factions || []).length >= 3, '3–6 facciones por semilla');
assert(state.factions.every((f) => f.offers && f.wants && f.tradeMult), 'templates cableados');
assert(state.factions.every((f) => !f.discovered), 'empiezan desconocidas');

const rng = createRng(42);
const f = discoverFaction(state, rng, { trait: 'trader' });
assert(f?.discovered, 'discoverFaction');
assert(discoveredFactions(state).length === 1, '1 descubierta');

state.resources.food = 10;
state.resources.metal = 10;
const trade = tradeWithFaction(state, f);
assert(trade.ok, 'comercio evento ok');
assert(state.flags.narrative.trade_done, 'flag trade');

// Efectos desde evento
const s2 = createNewState(content, 'E2', 'zz133b');
s2.resources.food = 20;
s2.resources.metal = 20;
applyEventEffects(s2, content, { discoverFaction: true, tradeOffer: true }, createRng(7));
assert(discoveredFactions(s2).length >= 1, 'evento descubre contacto');

const com = (content.eventsDoc.events || []).find((e) => e.id === 'com_trueque_furtivo');
assert(
  JSON.stringify(com).includes('discoverFaction') || JSON.stringify(com).includes('tradeOffer'),
  'com_trueque cableado'
);

assert(relationLabel('friendly') === 'amistosa', 'labels relación');

// Go lean: no 4X — sin mapa diplomático / turnos
assert(!content.factionsDoc.diplomacyTurns, 'sin diplomacia turnos');

console.log(fails ? `FAIL ${fails}` : 'smoke-zz130-133 OK · recomendación GO lean');
process.exit(fails ? 1 : 0);
