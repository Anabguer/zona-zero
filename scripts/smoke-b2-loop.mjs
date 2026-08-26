/**
 * Smoke B2 — catálogo oficial progresivo + guía + objetivos tempranos + cadena base.
 * node scripts/smoke-b2-loop.mjs
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
const { pilotBuildableTypeIds, pilotOfficialGates } = await import(
  pathToFileURL(join(root, 'js', 'pilot-test.js')).href
);
const { GUIDE_STEPS, checkOnboardingProgress, onboardingStatus, markGuideDayAdvanced } = await import(
  pathToFileURL(join(root, 'js', 'onboarding.js')).href
);
const { currentObjective } = await import(pathToFileURL(join(root, 'js', 'colony.js')).href);
const { installPilotZoneMap } = await import(pathToFileURL(join(root, 'js', 'pilot-terrain.js')).href);

installPilotZoneMap(loadJson('pilot/neni-pilot-zones-v3.json'));

let fails = 0;
const assert = (c, m) => { if (!c) { console.error('FAIL', m); fails++; } else console.log('OK ', m); };

function officialState(day = 1, era = 0, qa = false) {
  const st = createNewState(content, 'Oficial B2', `smoke-b2-${day}-${era}-${qa}`);
  st.day = day;
  st.era = era;
  st.flags.pilot = 'neni';
  st.flags.pilotQaMode = qa;
  st.flags.sectorsUiParked = true;
  return st;
}

// ---------- 1. Gates del catálogo oficial ----------
{
  const s1 = officialState(1, 0);
  const g1 = pilotBuildableTypeIds(s1);
  assert(g1.has('farm') && g1.has('well'), 'D1: farm+well disponibles');
  assert(!g1.has('house'), 'D1: house aún no (gate día 4)');
  assert(!g1.has('sawmill') && !g1.has('scrapyard'), 'D1: materiales aún no (gate día 2)');
  assert(!g1.has('radio') && !g1.has('watchtower') && !g1.has('garage'), 'D1: fuera de UX v1 ausentes');

  const s2 = officialState(2, 0);
  const g2 = pilotBuildableTypeIds(s2);
  assert(g2.has('sawmill') && g2.has('scrapyard') && g2.has('storage'), 'D2: materiales+almacén');

  const s3 = officialState(3, 0);
  assert(pilotBuildableTypeIds(s3).has('medkit'), 'D3: medkit (medicina básica)');

  const s4 = officialState(4, 0);
  assert(pilotBuildableTypeIds(s4).has('house'), 'D4: house (vivienda)');
  assert(!pilotBuildableTypeIds(s4).has('kitchen'), 'D4 era0: kitchen sigue gated por era');

  const s5e1 = officialState(9, 1);
  const g5 = pilotBuildableTypeIds(s5e1);
  assert(g5.has('tech_bench') && g5.has('greenhouse') && g5.has('cistern') && g5.has('infirmary'), 'era≥1: research/sanidad/comida/reserva');

  // QA intacto: catálogo aprobado completo independiente de gates
  const sq = officialState(1, 0, true);
  const gq = pilotBuildableTypeIds(sq);
  assert(gq.has('house') && gq.has('radio') && gq.has('workshop') && gq.size >= 13, 'QA: catálogo aprobado completo intacto (13 sin HQ)');
}

// ---------- 2. Guía oficial (secuencia completa del loop base) ----------
{
  assert(GUIDE_STEPS.some((s) => s.suggestBuild === 'farm'), 'guía: sugiere huerto');
  assert(GUIDE_STEPS.some((s) => s.suggestBuild === 'well'), 'guía: sugiere pozo');
  assert(GUIDE_STEPS.some((s) => s.suggestBuild === 'sawmill'), 'guía: sugiere aserradero (madera)');
  assert(GUIDE_STEPS.some((s) => s.suggestBuild === 'scrapyard'), 'guía: sugiere chatarrería (metal)');
  const last = GUIDE_STEPS[GUIDE_STEPS.length - 1];
  assert(last.id === 'ready' && last.wait === null, 'guía: se despide al avanzar día (no tutorial eterno)');
  // Ningún paso sugiere edificios fuera de los gates de su día aproximado
  const gatedAt1 = pilotOfficialGates({ day: 1, era: 0 });
  for (const s of GUIDE_STEPS.filter((x) => x.suggestBuild)) {
    if (s.id === 'need_wood' || s.id === 'need_metal') continue; // llegan tras avanzar a D2
    assert(gatedAt1.has(s.suggestBuild), `guía D1: "${s.id}" sugiere edificio disponible en D1`);
  }
}

// ---------- 3. Recorrido de la guía con acciones legales ----------
{
  const st = officialState(1, 0);
  st.flags.onboardingDone = false;
  st.flags.onboardingActive = true;
  st.flags.onboardingStep = 0;
  st.base.buildings = [{ id: 'b_hq', type: 'hq_central_l1', x: -7, y: 14, hp: 100, workers: 0 }];

  const addB = (type, x, y, workers = 0) =>
    st.base.buildings.push({ id: `b_${type}_${st.base.buildings.length}`, type, x, y, hp: 100, workers });

  let step = onboardingStatus(st)?.step?.id;
  assert(step === 'need_food', 'recorrido: arranca pidiendo comida');
  addB('farm', -3, 14, 1);
  checkOnboardingProgress(st);
  step = onboardingStatus(st)?.step?.id;
  assert(step === 'see_day' || step === 'staff_farm' || step === 'need_water', `recorrido: avanza tras huerto (${step})`);
  addB('farm', -3, 16, 1); // asegurar staffed
  checkOnboardingProgress(st);
  markGuideDayAdvanced(st);
  st.day = 2;
  addB('well', -5, 15, 1);
  addB('well', -6, 15, 1);
  checkOnboardingProgress(st);
  st.day = 3;
  addB('sawmill', -10, 15, 1);
  addB('scrapyard', -12, 15, 1);
  checkOnboardingProgress(st);
  markGuideDayAdvanced(st);
  assert(st.flags.onboardingDone === true, 'recorrido: la guía se despide tras el loop base');
}

// ---------- 4. Objetivos tempranos contextuales ----------
{
  const s = officialState(2, 0);
  s.base.buildings = [{ id: 'b_hq', type: 'hq_central_l1', x: -7, y: 14, hp: 100, workers: 0 }];
  let obj = currentObjective(s, content);
  assert(['survive'].includes(obj?.id), `objetivo D2 sin granjas → survive (${obj?.id})`);
  addSimple(s, 'farm', 1); addSimple(s, 'well', 1);
  obj = currentObjective(s, content);
  assert(obj?.id === 'materials_wood', `objetivo: madera antes que nada (${obj?.id})`);
  addSimple(s, 'sawmill');
  obj = currentObjective(s, content);
  assert(obj?.id === 'materials_metal', `objetivo: metal tras aserradero (${obj?.id})`);
  addSimple(s, 'scrapyard');
  obj = currentObjective(s, content);
  assert(obj?.id !== 'materials_wood' && obj?.id !== 'materials_metal', 'objetivo: materiales cerrados');

  // Sanidad básica reactiva
  const sm = officialState(5, 0);
  sm.base.buildings = [{ id: 'b_hq', type: 'hq_central_l1', x: -7, y: 14, hp: 100, workers: 0 }];
  addSimple(sm, 'farm', 1); addSimple(sm, 'well', 1); addSimple(sm, 'sawmill'); addSimple(sm, 'scrapyard');
  sm.population.sick = 2;
  const om = currentObjective(sm, content);
  assert(om?.id === 'need_medicine', `objetivo: medicina con enfermos (${om?.id})`);

  // Investigación al abrir era
  const sr = officialState(8, 1);
  sr.base.buildings = [{ id: 'b_hq', type: 'hq_central_l1', x: -7, y: 14, hp: 100, workers: 0 }];
  addSimple(sr, 'farm', 1); addSimple(sr, 'well', 1); addSimple(sr, 'sawmill'); addSimple(sr, 'scrapyard');
  sr.expeditionsDone = 1;
  sr.stats.zonesControlled = 2;
  sr.zones = [
    { id: 'z_camp', type: 'camp', name: 'Camp', state: 'controlled', neighbors: [], controlProgress: 1 },
    { id: 'z2', type: 'ruins', name: 'R2', state: 'controlled', neighbors: [], controlProgress: 1 },
    { id: 'z3', type: 'park', name: 'P3', state: 'controlled', neighbors: [], controlProgress: 1 },
  ];
  const orr = currentObjective(sr, content);
  assert(orr?.id === 'research_hint', `objetivo: research al abrir era (${orr?.id})`);
}

function addSimple(state, type, workers = 0) {
  state.base.buildings.push({
    id: `b_${type}_${Math.random().toString(36).slice(2, 7)}`,
    type, x: -20 + state.base.buildings.length, y: 18, hp: 100, workers,
  });
}

// ---------- 5. Cadena de costes con recursos iniciales (sin loot) ----------
{
  const start = content.balance.startingResources;
  const pay = (res, cost) => {
    for (const [k, v] of Object.entries(cost || {})) {
      if ((res[k] || 0) < v) return false;
      res[k] -= v;
    }
    return true;
  };
  // Orden guiado A: farm, well, sawmill(D2), scrapyard(D3) — el hueco de metal debe ser cubrible con 1-2 expediciones
  const resA = { ...start };
  const stepsA = [
    ['farm', content.buildings.farm.cost],
    ['well', content.buildings.well.cost],
    ['sawmill', content.buildings.sawmill.cost],
  ];
  let okA = true;
  for (const [id, cost] of stepsA) okA = pay(resA, cost) && okA;
  assert(okA, 'cadena A: farm+well+sawmill pagables con recursos iniciales');
  const scrapCost = content.buildings.scrapyard.cost;
  const missingMetal = Math.max(0, scrapCost.metal - (resA.metal || 0));
  // B2 fix anti-deadlock: startingResources.metal 12 cierra la cadena base SIN depender de loot
  assert(missingMetal === 0, 'cadena A: chatarrería pagable tras farm+well+sawmill (sin loot, sin deadlock)');
}

if (fails > 0) {
  console.error(`\nsmoke-b2-loop: ${fails} FAIL`);
  process.exit(1);
}
console.log('\nsmoke-b2-loop: TODO OK');
