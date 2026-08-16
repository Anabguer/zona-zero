/**
 * Smoke ZZ-140…144 — eras por indicadores · victoria sin energy · crisis variable · endless
 * node scripts/smoke-zz140-144.mjs
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

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
const {
  updateEra,
  checkVictory,
  continueEndless,
  victoryConditions,
  endScreenStats,
} = await import(pathToFileURL(join(root, 'js', 'sim.js')).href);
const { pickFinalCrisisVariant, checkDefeatState } = await import(
  pathToFileURL(join(root, 'js', 'victory.js')).href
);

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

assert(content.balance.victory?.needEnergy === false, 'needEnergy false en balance');
assert(content.balance.victory?.minFoodDays >= 5, 'minFoodDays');
assert(content.balance.deprecatedV1?.electricity === true, 'electricidad fuera v1');

const eras = content.erasDoc.eras || [];
assert(eras[0]?.name === 'Sobrevivir' && eras[4]?.name === 'Recuperar', 'nombres eras GM');

// ZZ-140: día no es candado — pop+indicadores bastan con softDay ayuda
const sEra = createNewState(content, 'Eras', 'era140');
sEra.day = 3; // por debajo de minDay era 1 (8)
sEra.population.total = 10;
sEra.population.healthy = 10;
sEra.research.unlocked = ['basic_carpentry', 'rations'];
(sEra.zones || []).forEach((z, i) => {
  if (i < 3) {
    z.state = 'controlled';
    z.controlProgress = 1;
  }
});
for (let i = 0; i < 5; i++) {
  sEra.base.buildings.push({ id: `b${i}`, type: 'farm', hp: 10, x: i, y: 0 });
}
updateEra(sEra, content);
assert(sEra.era >= 1, `era≥1 sin esperar día (era=${sEra.era})`);

// ZZ-141: sin energía en checklist
const sWin = createNewState(content, 'Vic', 'win141');
sWin.population.total = 45;
sWin.population.healthy = 45;
sWin.stability = 70;
sWin.era = 3;
sWin.resources.food = 300;
sWin.resources.water = 300;
sWin.resources.ammo = 40;
(sWin.zones || []).forEach((z, i) => {
  if (i < 10) {
    z.state = 'controlled';
    z.controlProgress = 1;
  }
});
sWin.base.buildings = [
  { id: 'hq', type: 'hq_central_l2', hp: 100, x: 0, y: 0 },
  { id: 'cl', type: 'clinic', hp: 100, x: 1, y: 0 },
  { id: 'tw', type: 'watchtower', hp: 100, x: 2, y: 0, workers: 1 },
  { id: 'tw2', type: 'watchtower', hp: 100, x: 3, y: 0, workers: 1 },
  { id: 'tw3', type: 'watchtower', hp: 100, x: 4, y: 0, workers: 1 },
  { id: 'wall', type: 'barricade', hp: 100, x: 5, y: 0 },
  { id: 'wall2', type: 'barricade', hp: 100, x: 6, y: 0 },
  { id: 'wall3', type: 'fence', hp: 100, x: 7, y: 0 },
  { id: 'bn', type: 'bunker', hp: 100, x: 8, y: 0, workers: 2 },
];
sWin.population.labor = { ...(sWin.population.labor || {}), defense: 8, idle: 5 };
sWin.research.unlocked = ['fortify', 'watch_protocols', 'reinforced_walls'];
sWin.energy = { produced: 0, demand: 99 }; // energía rota a propósito
const vc = victoryConditions(sWin, content);
assert(vc.checks.noEnergyRequired === true, 'noEnergyRequired');
assert(vc.def >= 40, `defensa≥40 (def=${vc.def})`);
assert(vc.ready === true, `victoria ready sin energía (checks=${JSON.stringify(vc.checks)})`);

checkVictory(sWin, content);
assert(sWin.flags.finalCrisisDone === true, 'crisis final disparada');
assert(!!sWin.flags.finalCrisisVariant, `variante crisis=${sWin.flags.finalCrisisVariant}`);
assert(sWin.flags.victory === true || sWin.flags.defeated === true, 'victoria o derrota tras crisis');

if (sWin.flags.victory) {
  const end = continueEndless(sWin);
  assert(end.ok && sWin.flags.endless === true, 'endless post-victoria');
  const st = endScreenStats(sWin);
  assert(st.day > 0 && st.seed && st.controlled >= 0, 'endScreenStats victoria');
}

// ZZ-142: variantes distintas por semilla
const variants = new Set();
for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
  const s = createNewState(content, 'C', seed);
  variants.add(pickFinalCrisisVariant(s).id);
}
assert(variants.size >= 2, `crisis variable (${[...variants].join(',')})`);

// ZZ-144: derrota + stats
const sDef = createNewState(content, 'Def', 'def144');
sDef.population.total = 0;
sDef.population.healthy = 0;
sDef.day = 22;
sDef.stats.maxPop = 18;
checkDefeatState(sDef);
assert(sDef.flags.defeated === true, 'derrota pop 0');
const dst = endScreenStats(sDef);
assert(dst.reason && dst.maxPop === 18, 'stats derrota');

console.log(fails ? `FAIL ${fails}` : 'smoke-zz140-144 OK');
process.exit(fails ? 1 : 0);
