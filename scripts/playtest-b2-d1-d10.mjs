/**
 * B2 — Playtest D1→D10 desde partida nueva oficial (sin QA, sin regalos).
 * Bot con SOLO acciones legales del jugador: construir (gates+coste), asignar,
 * avanzar día, enviar expediciones descubiertas. Registra métricas diarias.
 *
 *   node scripts/playtest-b2-d1-d10.mjs [seed1,seed2,...]
 *
 * Deadlock = 3 días seguidos sin construcción/expedición/población nueva,
 * con objetivo de materiales bloqueado por recursos y sin explorador disponible.
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

const { createNewState, housingCapacity } = await import(pathToFileURL(join(root, 'js', 'state.js')).href);
const { installPilotZoneMap } = await import(pathToFileURL(join(root, 'js', 'pilot-terrain.js')).href);
const { remapPilotZones } = await import(pathToFileURL(join(root, 'js', 'pilot-test.js')).href);
const { pilotBuildableTypeIds } = await import(pathToFileURL(join(root, 'js', 'pilot-test.js')).href);
const {
  placeBuilding,
  adjustBuildingWorkers,
  advanceDay,
  startExpedition,
  expeditionPreview,
} = await import(pathToFileURL(join(root, 'js', 'sim.js')).href);
const onbMod = await import(pathToFileURL(join(root, 'js', 'onboarding.js')).href);
const {
  ensureOnboarding,
  checkOnboardingProgress,
  onboardingStatus,
  markGuideDayAdvanced,
} = await import(pathToFileURL(join(root, 'js', 'onboarding.js')).href);
const { currentObjective } = await import(pathToFileURL(join(root, 'js', 'colony.js')).href);
const { livingExplorers } = await import(pathToFileURL(join(root, 'js', 'explorers.js')).href);

installPilotZoneMap(loadJson('pilot/neni-pilot-zones-v3.json'));

const seeds = (process.argv[2] || 'b2-uno,b2-dos,b2-tres').split(',').filter(Boolean);
const HQ = { x: -7, y: 14 };
let globalFails = 0;

function newOfficialGame(seed) {
  const st = createNewState(content, 'Playtest B2', seed);
  st.flags.pilot = 'neni';
  st.flags.pilotQaMode = false;
  st.flags.pilotTestMode = false;
  st.gen = 'neni';
  st.flags.sectorsUiParked = true;
  st.flags.onboardingDone = false;
  st.flags.onboardingActive = true;
  st.flags.onboardingStep = 0;
  const camp = st.zones.find((z) => z.type === 'camp');
  if (camp) { camp.x = 824; camp.y = 520; }
  st.base.w = Math.max(st.base.w || 0, 76);
  st.base.h = Math.max(st.base.h || 0, 37);
  let hq = st.base.buildings.find((b) => String(b.type).startsWith('hq_'));
  if (!hq) {
    hq = { id: 'b_hq_pilot', type: 'hq_central_l1', x: HQ.x, y: HQ.y, hp: 100, workers: 0 };
    st.base.buildings.unshift(hq);
  } else { hq.x = HQ.x; hq.y = HQ.y; }
  remapPilotZones(st);
  ensureOnboarding(st);
  return st;
}

function tryBuild(st, type) {
  const allowed = pilotBuildableTypeIds(st);
  if (!allowed.has(type)) return { ok: false, error: `gate (${type})` };
  const def = content.buildings[type];
  const count = st.base.buildings.filter((x) => x.type === type && x.hp > 0).length;
  if (def.max != null && count >= def.max) return { ok: false, error: 'max' };
  const canPay = Object.entries(def.cost || {}).every(([k, v]) => (st.resources[k] || 0) >= v);
  if (!canPay) {
    const miss = Object.entries(def.cost || {})
      .filter(([k, v]) => (st.resources[k] || 0) < v)
      .map(([k]) => k)
      .join('+');
    return { ok: false, error: `sin recursos (${miss})` };
  }
  // anclas válidas más cercanas al HQ
  const { validPilotAnchors } = anchorsMod;
  const list = validPilotAnchors(st, content, type).sort(
    (a, b) => Math.abs(a.x - HQ.x) + Math.abs(a.y - HQ.y) - (Math.abs(b.x - HQ.x) + Math.abs(b.y - HQ.y))
  );
  for (const a of list.slice(0, 12)) {
    const r = placeBuilding(st, content, type, a.x, a.y);
    if (r.ok) return r;
  }
  return { ok: false, error: 'sin sitio válido' };
}
const anchorsModP = pathToFileURL(join(root, 'js', 'pilot-footprints.js')).href;
const anchorsMod = await import(anchorsModP);

function ensureStaffed(st, types) {
  const done = [];
  for (const t of types) {
    const b = st.base.buildings.find((x) => x.type === t && x.hp > 0 && (x.workers || 0) < 1);
    if (b && (st.population.labor?.idle || 0) > 0) {
      const r = adjustBuildingWorkers(st, content, b.id, 1);
      if (r.ok) done.push(t);
    }
  }
  return done;
}

function tryExpedition(st, wantMetal) {
  const ex = livingExplorers(st).find((e) => e.status === 'ready' && !e.expeditionId);
  if (!ex) return { ok: false, error: 'sin explorador listo' };
  const camp = st.zones.find((z) => z.type === 'camp') || { x: 824, y: 520 };
  const cands = st.zones.filter((z) => z.state !== 'unknown' && z.id !== camp.id && z.type !== 'camp');
  if (!cands.length) return { ok: false, error: 'sin zonas descubiertas' };
  const score = (z) => {
    const d = Math.hypot((z.x ?? 0) - camp.x, (z.y ?? 0) - camp.y);
    const metalBonus = wantMetal && (z.loot?.metal || 0) > 0 ? -100 : 0;
    return d + metalBonus;
  };
  cands.sort((a, b) => score(a) - score(b));
  for (const z of cands.slice(0, 4)) {
    const prev = expeditionPreview(st, content, z.id, ex.id);
    if ((prev.fuel || 0) > (st.resources.fuel || 0)) continue; // sin fuel no sale (no debería pasar a pie)
    const r = startExpedition(st, content, z.id, ex.id);
    if (r.ok) return { ok: true, zone: z.name, days: prev.days, fuel: prev.fuel || 0 };
  }
  return { ok: false, error: 'sin destino válido' };
}

function snapshot(st, extra) {
  const cap = housingCapacity(st, content.buildings);
  const obj = currentObjective(st, content);
  const bCounts = {};
  st.base.buildings.forEach((b) => { if (b.hp > 0) bCounts[b.type] = (bCounts[b.type] || 0) + 1; });
  return {
    day: st.day,
    pop: st.population.total,
    cap,
    food: Math.floor(st.resources.food),
    water: Math.floor(st.resources.water),
    wood: Math.floor(st.resources.wood),
    metal: Math.floor(st.resources.metal),
    medicine: Math.floor(st.resources.medicine || 0),
    buildings: bCounts,
    freeWorkers: st.population.labor?.idle || 0,
    objective: obj ? `${obj.id}: ${obj.title}` : null,
    explorers: livingExplorers(st).map((e) => `${e.name}:${e.status}`).join(','),
    expeditionsStarted: st.stats.expeditions || 0,
    controlled: (st.zones || []).filter((z) => z.state === 'controlled').length,
    era: st.era,
    ...extra,
  };
}

async function runSeed(seed, verbose) {
  const st = newOfficialGame(seed);
  const lines = [];
  let placedThisRun = [];
  let stalledStreak = 0;
  let verdict = 'OK';
  let verdictReason = '';

  for (let d = 1; d <= 10; d++) {
    const beforePop = st.population.total;
    const beforeBldgCount = st.base.buildings.length;
    const beforeExp = st.expeditions.length;
    checkOnboardingProgress(st);

    const extra = {};
    // 1) guía sugiere construcción
    const guide = onboardingStatus(st);
    const suggest = guide?.step?.suggestBuild;
    if (suggest) {
      const r = tryBuild(st, suggest);
      extra.guideBuild = r.ok ? `${suggest}@${r.building?.x},${r.building?.y}` : `NO:${r.error}`;
      if (r.ok) placedThisRun.push(suggest);
    }
    // 2) staffing guiado
    const staffed = ensureStaffed(st, ['farm', 'well', 'sawmill']);
    if (staffed.length) extra.staffed = staffed.join(',');
    checkOnboardingProgress(st);

    // 3) objetivos → construcción contextual
    let obj = currentObjective(st, content);
    if (obj?.id === 'materials_wood' || obj?.id === 'materials_metal' || obj?.id === 'research_hint' || obj?.id === 'need_medicine') {
      const mapT = { materials_wood: 'sawmill', materials_metal: 'scrapyard', research_hint: 'tech_bench', need_medicine: 'medkit' };
      const t = mapT[obj.id];
      const r = tryBuild(st, t);
      extra.objBuild = r.ok ? t : `NO:${r.error}`;
      if (r.ok) placedThisRun.push(t);
    }
    if ((obj?.id === 'housing' || obj?.id === 'housing_overflow') && st.day >= 4) {
      const r = tryBuild(st, 'house');
      extra.houseBuild = r.ok ? 'house' : `NO:${r.error}`;
      if (r.ok) placedThisRun.push('house');
    }

    // 4) exploración temprana (D≥3 o cuando falta metal para materiales)
    const wantMetal = obj?.id === 'materials_metal' || !!extra.objBuild?.startsWith('NO:sin recursos (metal');
    if (st.day >= 3 || wantMetal) {
      const exp = tryExpedition(st, wantMetal);
      if (exp.ok) extra.expedition = `${exp.zone} (${exp.days}d, fuel ${exp.fuel})`;
      else if (wantMetal) extra.expedition = `NO:${exp.error}`;
    }
    obj = currentObjective(st, content);

    // 5) avanzar día
    const res = advanceDay(st, content);
    markGuideDayAdvanced(st);
    // El juego real revela el primer landmark al volver del día (main.js post-advance)
    const { maybeRevealEarlyLandmarks } = onbMod;
    maybeRevealEarlyLandmarks(st);
    if (res?.attack) extra.attack = res.attack.result;
    const reports = res?.expeditionReports || [];
    if (reports.length) {
      extra.expReports = reports.map((r) => `${r.outcome}${r.dead ? '×' : ''}:${Object.entries(r.loot || {}).map(([k, v]) => `${k}+${v}`).join(',') || 'sacos vacíos'}`).join(' | ');
    }

    // métricas del día resultante
    const events = (st.log || [])
      .filter((e) => e.day >= st.day - 1 && ['bad', 'warn', 'story'].includes(e.kind))
      .slice(0, 3)
      .map((e) => e.text);
    const snap = snapshot(st, { ...extra, eventos: events.join(' | ').slice(0, 90) });
    lines.push(snap);

    // derrota
    if (st.flags.defeated) {
      verdict = 'DERROTA';
      verdictReason = st.flags.defeatReason || 'derrota';
      break;
    }

    // detector de estancamiento
    const progressed =
      st.base.buildings.length > beforeBldgCount ||
      st.expeditions.length > beforeExp ||
      reports.length > 0 ||
      st.population.total > beforePop ||
      Object.keys(extra).some((k) => !String(extra[k]).startsWith('NO:'));
    const materialBlocked = /materials_/.test(snap.objective || '') && !progressed;
    if (materialBlocked) stalledStreak += 1;
    else stalledStreak = 0;
    if (stalledStreak >= 3) {
      verdict = 'DEADLOCK';
      verdictReason = `materiales bloqueados ${stalledStreak} días sin salida legal`;
      break;
    }
  }

  if (verbose) {
    console.log(`\n== SEMILLA ${seed} ==`);
    console.table(
      lines.map((l) => ({
        D: l.day, pop: l.pop, cap: l.cap, comida: l.food, agua: l.water, madera: l.wood,
        metal: l.metal, med: l.medicine, libres: l.freeWorkers,
        objetivo: (l.objective || '').split(':')[0],
        extra: [l.guideBuild, l.staffed, l.objBuild, l.houseBuild, l.expedition, l.expReports, l.attack ? `ataque:${l.attack}` : null]
          .filter(Boolean).join(' · ').slice(0, 90),
      }))
    );
  }
  const finalSnap = lines[lines.length - 1] || {};
  // trazabilidad de bajas de población (para distinguir evento duro vs hambre)
  for (let i = 1; i < lines.length; i++) {
    if ((lines[i].pop ?? 0) < (lines[i - 1].pop ?? 0)) {
      console.log(`   [${seed}] baja pop D${lines[i].day}: ${lines[i].eventos || '(sin eventos registrados)'}`);
    }
  }
  console.log(
    `[${seed}] veredicto=${verdict}${verdictReason ? ` (${verdictReason})` : ''} · día final=${finalSnap.day} · pop=${finalSnap.pop} · era=${finalSnap.era} · edificios=${JSON.stringify(finalSnap.buildings)} · construidos=(${placedThisRun.join(',')})`
  );
  if (verdict !== 'OK') globalFails += 1;
  return { seed, verdict, lines };
}

(async () => {
  const verboseFirst = true;
  for (let i = 0; i < seeds.length; i++) {
    await runSeed(seeds[i], verboseFirst && i === 0);
  }
  console.log('');
  if (globalFails > 0) {
    console.error(`playtest-b2-d1-d10: ${globalFails}/${seeds.length} semillas con problemas`);
    process.exit(1);
  }
  console.log(`playtest-b2-d1-d10: ${seeds.length}/${seeds.length} semillas alcanzan D10 sin deadlock`);
})();
