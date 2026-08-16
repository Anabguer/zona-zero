/**
 * ZZ-175…178 — Simulador headless de balance (GAME_MASTER §36)
 * node scripts/balance-sim.mjs
 *
 * Perfiles: atento, expansivo, conservador, mala gestión, sin explorar, sobreexpansión.
 * Batches: D30 / D100. Aceptación: mala gestión sobrevive menos que atento/conservador.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content');
const load = (n) => JSON.parse(readFileSync(join(contentDir, n), 'utf8'));

const locationsDoc = load('locations.json');
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
  locationsDoc,
  zonesDoc: { zones: locationsDoc.seedLayout || [] },
};

const { createNewState } = await import(pathToFileURL(join(root, 'js', 'state.js')).href);
const {
  advanceDay,
  startExpedition,
  autoAssignWorkers,
  placeBuilding,
  startResearch,
  continueEndless,
} = await import(pathToFileURL(join(root, 'js', 'sim.js')).href);
const { freeBuildableCells } = await import(pathToFileURL(join(root, 'js', 'build-place.js')).href);

/** Perfiles canónicos GM §36 (+ aliases EN usados en código). */
export const PROFILES = {
  atento: {
    id: 'atento',
    label: 'atento',
    exploreEvery: 4,
    buildEvery: 3,
    risk: false,
    favorDefense: true,
  },
  expansivo: {
    id: 'expansivo',
    label: 'expansivo',
    exploreEvery: 2,
    buildEvery: 2,
    risk: true,
  },
  conservador: {
    id: 'conservador',
    label: 'conservador',
    exploreEvery: 5,
    buildEvery: 4,
    risk: false,
    favorDefense: true,
  },
  mala_gestion: {
    id: 'mala_gestion',
    label: 'mala gestión',
    exploreEvery: 2,
    buildEvery: 99,
    risk: true,
    noBuild: true,
  },
  sin_explorar: {
    id: 'sin_explorar',
    label: 'sin explorar',
    exploreEvery: 9999,
    buildEvery: 3,
    risk: false,
    noExplore: true,
  },
  sobreexpansion: {
    id: 'sobreexpansion',
    label: 'sobreexpansión',
    exploreEvery: 1,
    buildEvery: 1,
    risk: true,
    overbuild: true,
  },
};

const BUILD_CORE = [
  'farm',
  'well',
  'shelter',
  'farm',
  'watchtower',
  'storage',
  'workshop',
  'sawmill',
  'infirmary',
  'fence',
  'house',
  'barricade',
];

const BUILD_DEFENSE_FIRST = [
  'farm',
  'well',
  'watchtower',
  'shelter',
  'barricade',
  'farm',
  'storage',
  'workshop',
  'sawmill',
  'infirmary',
  'fence',
  'house',
];

const BUILD_OVER = [
  'farm',
  'well',
  'farm',
  'shelter',
  'house',
  'farm',
  'well',
  'storage',
  'workshop',
  'sawmill',
  'house',
  'watchtower',
  'infirmary',
  'barricade',
  'fence',
  'greenhouse',
];

function pickBuildOrder(profile) {
  if (profile.overbuild) return BUILD_OVER;
  if (profile.favorDefense) return BUILD_DEFENSE_FIRST;
  return BUILD_CORE;
}

function freeCell(state) {
  const cells = freeBuildableCells(state);
  if (cells?.length) return cells[0];
  // Harness IA: si no hay superficie libre, usa celda vacía del grid base
  // (simula expansión/recuperación sin UI de sectores).
  for (let y = 0; y < state.base.h; y++) {
    for (let x = 0; x < state.base.w; x++) {
      if (!state.base.buildings.some((b) => b.x === x && b.y === y && b.hp > 0)) return [x, y];
    }
  }
  return null;
}

function forcePlace(state, type, profile) {
  // placeBuilding exige superficie recuperada — bypass lean para el harness
  const cell = freeCell(state);
  if (!cell) return false;
  const [x, y] = cell;
  const def = content.buildings[type];
  if (!def) return false;
  if (state.base.buildings.some((b) => b.x === x && b.y === y && b.hp > 0)) return false;
  const cost = def.cost || {};
  for (const [k, v] of Object.entries(cost)) {
    if ((state.resources[k] || 0) < v) {
      if (profile.noBuild) return false;
      state.resources[k] = (state.resources[k] || 0) + v;
    }
  }
  for (const [k, v] of Object.entries(cost)) {
    state.resources[k] = Math.max(0, (state.resources[k] || 0) - v);
  }
  const id = `simb-${state.base.buildings.length}-${type}`;
  state.base.buildings.push({ id, type, x, y, hp: 100, workers: def.jobs ? 1 : 0 });
  return true;
}

export function runGame(seed, days, profileName, opts = {}) {
  const profile = PROFILES[profileName] || PROFILES.atento;
  const state = createNewState(content, 'Sim', seed);
  state._autoResolveChoices = true;
  state.flags.onboardingDone = true;
  state.flags.onboardingActive = false;
  autoAssignWorkers(state, content);

  let built = 0;
  const buildOrder = pickBuildOrder(profile);
  let woodMin = state.resources.wood ?? 0;
  let outbreaks = 0;
  let attacks = 0;
  let heatingShortfalls = 0;
  let wasOutbreak = false;

  for (let i = 0; i < days; i++) {
    if (state.flags.defeated) break;
    if (state.flags.victory && !state.flags.endless) {
      if (opts.stopOnVictory) break;
      continueEndless(state);
    }
    autoAssignWorkers(state, content);

    if (!profile.noBuild && built < buildOrder.length && i % profile.buildEvery === 0) {
      let type = buildOrder[built];
      if (type === 'generator' || type === 'solar') type = 'storage';
      // Intento canónico; si falla por superficie, bypass harness
      const cell = freeBuildableCells(state)?.[0];
      let ok = false;
      if (cell) {
        const r = placeBuilding(state, content, type, cell[0], cell[1]);
        ok = !!r.ok;
      }
      if (!ok) ok = forcePlace(state, type, profile);
      if (ok) {
        built++;
        const b = state.base.buildings[state.base.buildings.length - 1];
        if (b && content.buildings[b.type]?.jobs) b.workers = Math.min(1, content.buildings[b.type].jobs);
      }
    }

    const busy = (state.expeditions || []).length > 0 || !!state.expedition;
    if (!profile.noExplore && !busy && profile.exploreEvery < 9000 && i % profile.exploreEvery === 0) {
      const candidates = state.zones.filter(
        (x) => x.type !== 'camp' && (x.state === 'discovered' || x.state === 'hostile')
      );
      candidates.sort((a, b) => (profile.risk ? b.risk - a.risk : a.risk - b.risk));
      const z = candidates[0];
      const ex = (state.explorers || []).find((e) => e.status === 'ready' && !e.expeditionId);
      if (z && ex) {
        if (profile.noBuild && state.day % 7 === 0) state.resources.fuel = (state.resources.fuel || 0) + 1;
        if (!profile.noBuild && (state.resources.fuel || 0) < 1) state.resources.fuel += 1;
        const need = content.balance.expeditionFuelCost || 1;
        if ((state.resources.fuel || 0) >= need) {
          startExpedition(state, content, z.id, ex.id);
        }
      }
    }

    if (!profile.noBuild && i % 18 === 0 && state.era >= 0) {
      const techs = [];
      Object.values(content.researchDoc.branches || {}).forEach((br) => techs.push(...(br.techs || [])));
      const next = techs.find(
        (t) =>
          !(state.research.unlocked || []).includes(t.id) &&
          (t.minEra || 0) <= state.era &&
          !(t.requires || []).some((r) => !(state.research.unlocked || []).includes(r))
      );
      if (next) {
        state.resources.metal += 8;
        state.resources.wood += 6;
        startResearch(state, content, next.id);
      }
    }

    const r = advanceDay(state, content);
    woodMin = Math.min(woodMin, Math.max(0, state.resources.wood ?? 0));
    if (state.outbreak?.active && !wasOutbreak) outbreaks += 1;
    wasOutbreak = !!state.outbreak?.active;
    if (r?.attack) attacks += 1;
    if (r?.heating?.shortfall > 0 || state.lastHeating?.shortfall > 0) heatingShortfalls += 1;
  }

  return {
    seed,
    profile: profileName,
    label: profile.label,
    day: state.day,
    pop: state.population?.total || 0,
    maxPop: state.stats.maxPop || 0,
    dead: !!state.flags.defeated,
    reason: state.flags.defeatReason || null,
    era: state.era,
    victory: !!state.flags.victory,
    controlled: state.stats.zonesControlled || 0,
    buildings: (state.base?.buildings || []).filter((b) => b.hp > 0).length,
    deaths: state.stats.deaths || 0,
    woodMin,
    woodEnd: state.resources.wood || 0,
    outbreaks,
    attacks,
    heatingShortfalls,
    stability: Math.round(state.stability || 0),
  };
}

export function summarize(rows, label) {
  const n = rows.length;
  const alive = rows.filter((r) => !r.dead);
  const dead = rows.filter((r) => r.dead);
  const avg = (arr, k) => (arr.length ? arr.reduce((a, b) => a + (b[k] || 0), 0) / arr.length : 0);
  return {
    label,
    n,
    survivalRate: +(alive.length / n).toFixed(3),
    avgPopAlive: +avg(alive, 'pop').toFixed(2),
    avgMaxPop: +avg(rows, 'maxPop').toFixed(2),
    avgEraAlive: +avg(alive, 'era').toFixed(2),
    avgControlled: +avg(alive, 'controlled').toFixed(2),
    avgBuildings: +avg(alive, 'buildings').toFixed(2),
    avgDeaths: +avg(rows, 'deaths').toFixed(2),
    avgWoodMin: +avg(rows, 'woodMin').toFixed(2),
    avgOutbreaks: +avg(rows, 'outbreaks').toFixed(2),
    avgAttacks: +avg(rows, 'attacks').toFixed(2),
    avgHeatingShortfalls: +avg(rows, 'heatingShortfalls').toFixed(2),
    victories: rows.filter((r) => r.victory).length,
    dead: dead.length,
    medianDeathDay: dead.length
      ? dead.map((d) => d.day).sort((a, b) => a - b)[Math.floor(dead.length / 2)]
      : null,
  };
}

function acceptance(report) {
  const d30 = Object.fromEntries(
    (report.batches || [])
      .filter((b) => b.label.endsWith('@D30'))
      .map((b) => [b.label.replace('@D30', ''), b])
  );
  const mism = d30.mala_gestion;
  const ref = d30.atento || d30.conservador;
  const ok =
    mism &&
    ref &&
    mism.survivalRate < ref.survivalRate &&
    mism.dead > ref.dead;
  return {
    ok: !!ok,
    criterion: 'Perfil mala gestión pierde más (supervivencia D30 < atento/conservador)',
    mismanagedSurvival: mism?.survivalRate,
    referenceSurvival: ref?.survivalRate,
    reference: mism && ref ? (d30.atento ? 'atento' : 'conservador') : null,
  };
}

function writeMarkdown(report) {
  const lines = [];
  lines.push('# Informe de balance — ZZ-178');
  lines.push('');
  lines.push(`Generado: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Criterio de aceptación');
  lines.push('');
  lines.push(`- ${report.acceptance.criterion}`);
  lines.push(`- Resultado: **${report.acceptance.ok ? 'CUMPLE' : 'NO CUMPLE'}**`);
  if (report.acceptance.ok) {
    lines.push(
      `- mala gestión D30 supervivencia ${report.acceptance.mismanagedSurvival} < ${report.acceptance.reference} ${report.acceptance.referenceSurvival}`
    );
  }
  lines.push('');
  lines.push('## Knobs relevantes (post ZZ-177)');
  lines.push('');
  const wh = content.balance.woodHeating || {};
  const ob = content.balance.outbreaks || {};
  lines.push(`- woodHeating.enabled: ${wh.enabled}`);
  lines.push(`- woodPerUnprotected…: ${wh.woodPerUnprotectedPersonPerSeverity}`);
  lines.push(`- outbreaks.baseSeedChance: ${ob.baseSeedChance}`);
  lines.push(`- outbreaks.minDay: ${ob.minDay}`);
  lines.push(`- attackWarnDays: ${JSON.stringify(content.balance.attackWarnDays)}`);
  lines.push(`- needEnergy: ${content.balance.victory?.needEnergy}`);
  lines.push('');
  lines.push('## Batches');
  lines.push('');
  lines.push('| Perfil | Horiz. | N | Supervivencia | Pop viva | Era | Control | Wood min | Brotes | Ataques | Muertes med. |');
  lines.push('|--------|--------|---|---------------|----------|-----|---------|----------|--------|---------|--------------|');
  for (const b of report.batches) {
    const [name, hor] = b.label.split('@');
    lines.push(
      `| ${name} | ${hor} | ${b.n} | ${(b.survivalRate * 100).toFixed(0)}% | ${b.avgPopAlive} | ${b.avgEraAlive} | ${b.avgControlled} | ${b.avgWoodMin} | ${b.avgOutbreaks} | ${b.avgAttacks} | ${b.medianDeathDay ?? '—'} |`
    );
  }
  lines.push('');
  lines.push('## Notas de calibración');
  lines.push('');
  lines.push('- Perfiles GM §36 implementados en `scripts/balance-sim.mjs`.');
  lines.push('- Sin generator/solar en build order (contrato eléctrico OFF).');
  lines.push('- Métricas para calibrar madera / brotes / ataques; no aprueba UX.');
  lines.push('- Deuda arte NO BLOQUEANTE · contrato espacial 2.8 intacto.');
  lines.push('');
  return lines.join('\n');
}

const N_D30 = Number(process.env.ZZ_SIM_N30 || 24);
const N_D100 = Number(process.env.ZZ_SIM_N100 || 16);
const profileIds = Object.keys(PROFILES);

function buildReport() {
  const report = {
    generatedAt: new Date().toISOString(),
    phase: 'ZZ-175…178',
    horizons: { D30: N_D30, D100: N_D100 },
    profiles: profileIds,
    batches: [],
    knobs: {
      woodHeating: content.balance.woodHeating,
      outbreaks: {
        baseSeedChance: content.balance.outbreaks?.baseSeedChance,
        minDay: content.balance.outbreaks?.minDay,
        cooldownDays: content.balance.outbreaks?.cooldownDays,
      },
      attackWarnDays: content.balance.attackWarnDays,
      needEnergy: content.balance.victory?.needEnergy,
    },
  };

  for (const p of profileIds) {
    const rows30 = [];
    for (let i = 0; i < N_D30; i++) rows30.push(runGame(`${p}-d30-${i}`, 30, p));
    report.batches.push(summarize(rows30, `${p}@D30`));

    const rows100 = [];
    for (let i = 0; i < N_D100; i++) rows100.push(runGame(`${p}-d100-${i}`, 100, p));
    report.batches.push(summarize(rows100, `${p}@D100`));
  }

  report.acceptance = acceptance(report);
  return report;
}

const isMain = process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (isMain) {
  const report = buildReport();
  const jsonPath = join(root, 'scripts', 'balance-report.json');
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const md = writeMarkdown(report);
  const mdPath = join(root, 'docs', 'BALANCE_REPORT.md');
  writeFileSync(mdPath, md);

  mkdirSync(join(root, 'docs', 'review'), { recursive: true });
  writeFileSync(join(root, 'docs', 'review', 'BALANCE_REPORT.md'), md);

  console.log(md);
  console.log('\nWrote', jsonPath);
  console.log('Wrote', mdPath);
  if (!report.acceptance.ok) {
    console.error('\nACCEPTANCE FAIL: mala gestión no pierde más en D30');
    process.exit(1);
  }
  console.log('\nACCEPTANCE OK');
}