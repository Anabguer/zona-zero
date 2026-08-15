/**
 * Simulador headless de balance — Zona Zero v1
 * node scripts/balance-sim.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content');
const load = (n) => JSON.parse(readFileSync(join(contentDir, n), 'utf8'));

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

const { createNewState, allLiving, livingSurvivors } = await import(
  pathToFileURL(join(root, 'js', 'state.js')).href
);
const {
  advanceDay,
  startExpedition,
  autoAssignWorkers,
  placeBuilding,
  startResearch,
  continueEndless,
} = await import(pathToFileURL(join(root, 'js', 'sim.js')).href);

const PROFILES = {
  conservative: { exploreEvery: 5, buildEvery: 4, risk: false },
  balanced: { exploreEvery: 3, buildEvery: 3, risk: false },
  expansive: { exploreEvery: 2, buildEvery: 3, risk: true },
  mismanaged: { exploreEvery: 2, buildEvery: 12, risk: true, noBuild: true },
};

function freeCell(state) {
  for (let y = 0; y < state.base.h; y++) {
    for (let x = 0; x < state.base.w; x++) {
      if (!state.base.buildings.some((b) => b.x === x && b.y === y && b.hp > 0)) return [x, y];
    }
  }
  return null;
}

function runGame(seed, days, profileName, opts = {}) {
  const profile = PROFILES[profileName] || PROFILES.balanced;
  const state = createNewState(content, 'Sim', seed);
  state._autoResolveChoices = true;
  autoAssignWorkers(state, content);
  let built = 0;
  const buildOrder = [
    'farm',
    'well',
    'shelter',
    'farm',
    'watchtower',
    'storage',
    'workshop',
    'sawmill',
    'medkit',
    'generator',
    'fence',
    'house',
  ];

  for (let i = 0; i < days; i++) {
    if (state.flags.defeated) break;
    if (state.flags.victory && !state.flags.endless) {
      if (opts.stopOnVictory) break;
      continueEndless(state);
    }
    autoAssignWorkers(state, content);

    if (!profile.noBuild && built < buildOrder.length && i % profile.buildEvery === 0) {
      const cell = freeCell(state);
      if (cell) {
        let r = placeBuilding(state, content, buildOrder[built], cell[0], cell[1]);
        if (!r.ok && (state.resources.wood || 0) < 3) {
          state.resources.wood = (state.resources.wood || 0) + 2;
          r = placeBuilding(state, content, buildOrder[built], cell[0], cell[1]);
        }
        if (r.ok) built++;
      }
    }

    const busy = (state.expeditions || []).length > 0 || !!state.expedition;
    if (!busy && i % profile.exploreEvery === 0) {
      const candidates = state.zones.filter(
        (x) => x.type !== 'camp' && (x.state === 'discovered' || x.state === 'hostile')
      );
      candidates.sort((a, b) => (profile.risk ? b.risk - a.risk : a.risk - b.risk));
      const z = candidates[0];
      const ex = (state.explorers || []).find((e) => e.status === 'ready' && !e.expeditionId);
      if (z && ex) {
        // Mismanaged: algo de combustible por saqueo ocasional; atento: 1 ud si hace falta
        if (profile.noBuild && state.day % 7 === 0) state.resources.fuel = (state.resources.fuel || 0) + 1;
        if (!profile.noBuild && (state.resources.fuel || 0) < 1) state.resources.fuel += 1;
        if ((state.resources.fuel || 0) >= (content.balance.expeditionFuelCost || 1)) {
          startExpedition(state, content, z.id, ex.id);
        }
      }
    }

    if (i % 15 === 0 && state.era >= 0) {
      const techs = [];
      Object.values(content.researchDoc.branches || {}).forEach((br) => techs.push(...(br.techs || [])));
      const next = techs.find(
        (t) =>
          !(state.research.unlocked || []).includes(t.id) &&
          (t.minEra || 0) <= state.era &&
          !(t.requires || []).some((r) => !(state.research.unlocked || []).includes(r))
      );
      if (next) {
        state.resources.metal += 10;
        state.resources.wood += 8;
        startResearch(state, content, next.id);
      }
    }

    advanceDay(state, content);
  }

  return {
    seed,
    profile: profileName,
    day: state.day,
    pop: state.population?.total ?? allLiving(state).length,
    maxPop: state.stats.maxPop,
    dead: !!state.flags.defeated,
    reason: state.flags.defeatReason,
    era: state.era,
    victory: !!state.flags.victory,
    controlled: state.stats.zonesControlled,
    stability: Math.round(state.stability),
    deaths: state.stats.deaths,
  };
}

function summarize(rows, label) {
  const n = rows.length;
  const alive = rows.filter((r) => !r.dead);
  const dead = rows.filter((r) => r.dead);
  const avg = (arr, k) => (arr.length ? arr.reduce((a, b) => a + b[k], 0) / arr.length : 0);
  return {
    label,
    n,
    survivalRate: +(alive.length / n).toFixed(3),
    avgPopAlive: +avg(alive, 'pop').toFixed(2),
    avgMaxPop: +avg(rows, 'maxPop').toFixed(2),
    avgEraAlive: +avg(alive, 'era').toFixed(2),
    avgControlled: +avg(alive, 'controlled').toFixed(2),
    victories: rows.filter((r) => r.victory).length,
    dead: dead.length,
    medianDeathDay: dead.length
      ? dead.map((d) => d.day).sort((a, b) => a - b)[Math.floor(dead.length / 2)]
      : null,
  };
}

const report = { generatedAt: new Date().toISOString(), batches: [] };
const profiles = Object.keys(PROFILES);

for (const p of profiles) {
  const rows = [];
  for (let i = 0; i < 40; i++) rows.push(runGame(`${p}-${i}`, 60, p));
  report.batches.push(summarize(rows, `${p}@60`));
}

const long = [];
for (let i = 0; i < 20; i++) long.push(runGame(`long-${i}`, 120, 'balanced'));
report.batches.push(summarize(long, 'balanced@120'));

// Victoria forzada para validar condición
{
  const state = createNewState(content, 'Vic', 'victory-test');
  state._autoResolveChoices = true;
  state.era = 4;
  state.stability = 80;
  state.population = state.population || { total: 3, sick: 0, injured: 0, dependents: 0, labor: {}, manual: {} };
  state.population.total = 45;
  state.population.injured = 0;
  state.population.sick = 0;
  state.zones.forEach((z, i) => {
    if (i < 10) {
      z.state = 'controlled';
      z.infectedLeft = 0;
      z.controlProgress = 1;
    }
  });
  state.stats.zonesControlled = 10;
  ['clinic', 'generator', 'watchtower', 'watchtower', 'armory', 'bunker'].forEach((t, i) => {
    state.base.buildings.push({ id: 'vt' + i, type: t, x: (i % 5) + 1, y: 5, hp: 100, workers: [] });
  });
  state.resources.ammo = 50;
  state.resources.food = 200;
  state.resources.water = 200;
  state.energy = { produced: 8, demand: 1 };
  for (let i = 0; i < 30; i++) {
    advanceDay(state, content);
    if (state.flags.victory || state.flags.defeated) break;
  }
  report.victoryTest = {
    victory: !!state.flags.victory,
    dead: !!state.flags.defeated,
    day: state.day,
    pop: state.population?.total ?? allLiving(state).length,
  };
}

const outPath = join(root, 'scripts', 'balance-report.json');
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log('\nWrote', outPath);
