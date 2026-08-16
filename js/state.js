/**
 * Estado Zona Zero v4 — población colectiva + exploradores
 */
import { createRng, hashSeed } from './rng.js';
import { clamp, uid } from './util.js';
import { emptyLabor, redistributeLabor, workforce } from './population.js';
import { makeExplorer, livingExplorers } from './explorers.js';
import { syncLaborFromColony } from './colony.js';
import { createColonySectors, ensureSectors } from './sectors.js';

export const SAVE_VERSION = 6;
/** @deprecated legacy individual skills — solo migración */
export const SKILL_KEYS = ['scout', 'gather', 'build', 'produce', 'fight'];

const DEFAULT_RESOURCES = {
  food: 0,
  water: 0,
  wood: 0,
  metal: 0,
  medicine: 0,
  fuel: 0,
  ammo: 0,
  parts: 0,
  tools: 0,
};

export async function loadContent() {
  const base = new URL('../content/', import.meta.url);
  const names = [
    'balance',
    'buildings',
    'events',
    'survivors',
    'research',
    'vehicles',
    'infected',
    'factions',
    'eras',
    'locations',
  ];
  const files = await Promise.all(
    names.map((n) =>
      fetch(new URL(`${n}.json`, base)).then((r) => {
        if (!r.ok) throw new Error(n);
        return r.json();
      })
    )
  );
  const [
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
  ] = files;
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

export function normalizeResources(raw = {}) {
  const out = { ...DEFAULT_RESOURCES };
  Object.keys(DEFAULT_RESOURCES).forEach((k) => {
    if (raw[k] != null && Number.isFinite(Number(raw[k]))) {
      out[k] = Math.max(0, Math.floor(Number(raw[k])));
    }
  });
  if (raw.scrap != null) out.metal += Math.max(0, Math.floor(Number(raw.scrap)) || 0);
  if (raw.meds != null) out.medicine += Math.max(0, Math.floor(Number(raw.meds)) || 0);
  return out;
}

export function createNewState(content, colonyName = 'Refugio 0', seedInput = null) {
  const { balance, locationsDoc, survivorsDoc, buildings, factionsDoc, erasDoc } = content;
  const seed = seedInput || `zz-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`;
  const rng = createRng(seed);

  const startPop = balance.startingPopulation || balance.startingSurvivors || 3;
  const population = {
    total: startPop,
    sick: 0,
    injured: 0,
    dependents: 0,
    labor: emptyLabor(),
    manual: {},
  };

  const explorer = makeExplorer(rng, survivorsDoc, {
    skillRange: balance.explorers?.startingSkillRange || [1, 2],
  });
  // El primer explorador sale de la colonia
  population.total = Math.max(1, population.total);
  redistributeLabor({ population }, balance);

  const layout = locationsDoc.seedLayout || content.zonesDoc?.zones || [];
  const types = locationsDoc.locationTypes || {};
  const zones = layout.map((z) => {
    const t = types[z.type] || {};
    return {
      id: z.id,
      type: z.type || 'unknown',
      name: z.name || t.name || z.id,
      x: z.x,
      y: z.y,
      r: z.r || 14,
      state: z.startState || 'unknown',
      risk: z.risk ?? t.baseRisk ?? 0.3,
      loot: z.loot || t.lootBias || {},
      infected: z.infected || t.infected || [0, 2],
      infectedLeft: 0,
      neighbors: z.neighbors || [],
      controlProgress: z.startState === 'controlled' ? 1 : 0,
    };
  });
  zones.forEach((z) => {
    if (z.state !== 'controlled' && z.infected) {
      z.infectedLeft = rng.int(z.infected[0] || 0, z.infected[1] || 0);
    }
  });

  // D1: solo Refugio Central (vivienda = capacidad, no una casa por habitante).
  // HQ housing 6 cubre pop 3; shelters se construyen después si hace falta.
  const hq = buildings.hq_central_l1 || Object.values(buildings).find((b) => b.category === 'core');
  const buildingsPlaced = [];
  if (hq) {
    const gw = balance.baseGrid?.w || 10;
    const gh = balance.baseGrid?.h || 8;
    buildingsPlaced.push({
      id: uid('b'),
      type: hq.id,
      x: Math.floor(gw / 2),
      y: Math.floor(gh / 2) - 1,
      hp: 100,
      workers: 0,
    });
  }

  const templates = factionsDoc.templates || factionsDoc.factions || [];
  const factionCount = rng.int(3, Math.min(6, templates.length || 3));
  const picked = rng.shuffle(templates).slice(0, factionCount);
  const factions = picked.map((t, i) => ({
    id: `f${i}_${t.id || t.trait || i}`,
    name: t.name || `Grupo ${i + 1}`,
    trait: t.trait || t.id,
    relation: t.relationStart || t.defaultRelation || 'neutral',
    discovered: false,
  }));

  const state = {
    v: SAVE_VERSION,
    seed,
    rngState: rng.seed,
    colonyName: String(colonyName).slice(0, 40) || 'Refugio 0',
    day: 1,
    era: 0,
    resources: normalizeResources(balance.startingResources),
    energy: { produced: 0, demand: 0 },
    population,
    explorers: [explorer],
    explorerRecruitReadyDay: 0,
    // compat vacío — ya no se gestiona gente individual
    survivors: [],
    base: {
      w: balance.baseGrid?.w || 10,
      h: balance.baseGrid?.h || 8,
      buildings: buildingsPlaced,
    },
    zones,
    expedition: null,
    expeditions: [],
    expeditionsDone: 0,
    selectedExplorerId: explorer.id,
    selectedZoneId: null,
    selectedBuildingId: null,
    uiPanel: null,
    uiMode: null, // 'build' | 'explore' | null
    buildMode: null,
    mapCamera: { x: 50, y: 48, zoom: 1.15 },
    layoutVersion: 3,
    sectors: createColonySectors(zones.find((z) => z.type === 'camp') || { x: 48, y: 62 }),
    lastDayBrief: null,
    equipment: { weapon: 'none', armor: 'none', vehicleId: null },
    vehiclesOwned: [],
    research: { unlocked: [], active: null, progress: 0 },
    factions,
    season: balance.seasons?.startSeason || 'autumn',
    seasonDay: balance.seasons?.startDayInSeason || 1,
    weather: 'clear',
    weatherDaysLeft: 0,
    pendingWeather: null,
    coldExposure: 0,
    lastHeating: null,
    outbreak: { active: false, type: null, phase: null, days: 0, severity: 0 },
    outbreakCooldownUntil: 0,
    stability: balance.stabilityStart ?? 55,
    director: {
      threat: 8,
      tension: balance.tensionStart ?? 12,
      force: 10,
      fragility: 20,
      momentum: 0,
      cooldowns: {},
      familyCooldowns: {},
      recentLosses: 0,
      lastEventId: null,
      lastCrisisDay: -99,
      recentFamilies: [],
      protectionUntil: 0,
    },
    flags: {
      defeated: false,
      defeatReason: null,
      victory: false,
      endless: false,
      finalCrisisDone: false,
      finalCrisisActive: false,
      introSeen: false,
      narrative: {},
      coach: { explore: false, labor: false, build: false, dismissed: false },
    },
    pendingChoice: null,
    pendingAttack: null,
    lastAttackReport: null,
    log: [
      {
        day: 1,
        text: 'Día 0 terminó. Queda el silencio… y este refugio. Hoy empieza Zona Zero.',
        kind: 'story',
      },
    ],
    stats: {
      expeditions: 0,
      zonesControlled: zones.filter((z) => z.state === 'controlled').length,
      buildingsBuilt: buildingsPlaced.length,
      deaths: 0,
      maxPop: population.total,
      maxControlled: 1,
      births: 0,
      immigrants: 0,
      attacksSurvived: 0,
      explorersLost: 0,
    },
    eraDocRef: erasDoc?.eras?.[0]?.id || 'era0',
  };

  redistributeLabor(state, balance);
  syncLaborFromColony(state, content);
  return state;
}

export function migrateState(state, content) {
  if (!state || typeof state !== 'object') return state;
  const balance = content?.balance || content;
  const next = { ...state };
  next.v = SAVE_VERSION;
  next.resources = normalizeResources(next.resources || {});
  if (!next.seed) next.seed = `migrated-${Date.now()}`;
  if (next.stability == null) next.stability = 50;
  if (next.era == null) next.era = 0;
  if (!next.research) next.research = { unlocked: [], active: null, progress: 0 };
  if (!next.vehiclesOwned) next.vehiclesOwned = [];
  if (!next.equipment) next.equipment = { weapon: 'none', armor: 'none', vehicleId: null };
  if (!next.factions) next.factions = [];
  if (!next.energy) next.energy = { produced: 0, demand: 0 };
  if (!next.weather) next.weather = 'clear';
  if (next.weatherDaysLeft == null) next.weatherDaysLeft = 0;
  if (next.season == null) next.season = balance.seasons?.startSeason || 'autumn';
  if (next.seasonDay == null) next.seasonDay = balance.seasons?.startDayInSeason || 1;
  if (next.pendingWeather === undefined) next.pendingWeather = null;
  if (next.coldExposure == null) next.coldExposure = 0;
  if (next.lastHeating === undefined) next.lastHeating = null;
  if (!next.outbreak) next.outbreak = { active: false, type: null, phase: null, days: 0, severity: 0 };
  if (next.outbreakCooldownUntil == null) next.outbreakCooldownUntil = 0;
  if (next.pendingAttack === undefined) next.pendingAttack = null;
  if (next.lastAttackReport === undefined) next.lastAttackReport = null;
  if (!next.flags) next.flags = {};
  if (!next.flags.narrative) next.flags.narrative = {};
  if (!next.flags.coach) next.flags.coach = { explore: false, labor: false, build: false, dismissed: false };
  if (!next.director) next.director = { threat: 10, tension: 15, cooldowns: {}, familyCooldowns: {}, recentFamilies: [] };
  if (!next.expeditions) next.expeditions = [];

  // Migrar supervivientes individuales → población + 1 explorador
  if (!next.population) {
    const alive = (next.survivors || []).filter((s) => s.status !== 'dead');
    const wounded = alive.filter((s) => s.status === 'wounded').length;
    next.population = {
      total: Math.max(1, alive.length || balance.startingPopulation || 3),
      sick: 0,
      injured: wounded,
      dependents: 0,
      labor: emptyLabor(),
      manual: {},
    };
  }
  if (!next.explorers) {
    const rng = createRng(hashSeed(next.seed || 'mig'));
    const best =
      (next.survivors || [])
        .filter((s) => s.status !== 'dead')
        .sort((a, b) => (b.skills?.scout || 0) - (a.skills?.scout || 0))[0] || null;
    const ex = makeExplorer(rng, content?.survivorsDoc, {
      name: best?.name,
      skillRange: [1, 2],
    });
    if (best) {
      ex.skills.explore = clamp(best.skills?.scout || 1, 1, 5);
      ex.skills.loot = clamp(best.skills?.gather || 1, 1, 5);
      ex.skills.fight = clamp(best.skills?.fight || 1, 1, 5);
      ex.skills.resist = clamp(Math.ceil(((best.skills?.build || 1) + (best.skills?.produce || 1)) / 2), 1, 5);
    }
    next.explorers = [ex];
    next.selectedExplorerId = ex.id;
  }

  next.survivors = [];
  if (!next.base || !next.base.w) {
    next.base = {
      w: balance?.baseGrid?.w || 10,
      h: balance?.baseGrid?.h || 8,
      buildings: next.base?.buildings || [],
    };
  }
  next.base.buildings = (next.base.buildings || []).map((b) => ({
    ...b,
    hp: b.hp != null ? b.hp : 100,
    workers: b.workers != null ? Math.max(0, b.workers) : 0,
  }));
  if (!next.mapCamera) next.mapCamera = { x: 50, y: 48, zoom: 1.15 };
  ensureSectors(next);
  if (next.uiMode == null) next.uiMode = null;
  if (!next.population.manual) next.population.manual = {};
  (next.zones || []).forEach((z) => {
    if (z.controlProgress == null) z.controlProgress = z.state === 'controlled' ? 1 : 0;
    if (z.infectedLeft == null) z.infectedLeft = 0;
  });

  redistributeLabor(next, balance);
  syncLaborFromColony(next, content);
  return next;
}

/** Compat: población total viva */
export function allLiving(state) {
  if (state.population) {
    return Array.from({ length: state.population.total }, (_, i) => ({ id: `p${i}`, status: 'ok' }));
  }
  return (state.survivors || []).filter((s) => s.status !== 'dead');
}

export function livingSurvivors(state) {
  // Compat para código legado: fuerza laboral abstracta
  const n = workforce(state.population || { total: 0 });
  return Array.from({ length: n }, (_, i) => ({
    id: `w${i}`,
    status: 'ok',
    busyUntilDay: 0,
    skills: { scout: 1, gather: 1, build: 1, produce: 1, fight: 1 },
    xp: {},
    jobBuildingId: null,
  }));
}

export function maxSurvivorsCap(balance) {
  const n = Number(balance?.maxPopulation ?? balance?.maxSurvivors);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 150;
}

export function housingCapacity(state, buildingsContent) {
  let cap = 0;
  state.base.buildings.forEach((b) => {
    if (b.hp <= 0) return;
    const def = buildingsContent[b.type];
    if (!def?.housing) return;
    const pct = (b.hp ?? 100) / 100;
    const struct = pct < 0.35 ? 0.3 : pct < 0.7 ? 0.65 : 1;
    cap += def.housing * struct;
  });
  if ((state.research?.unlocked || []).includes('advanced_housing')) {
    cap += 1;
  }
  return Math.max(Math.floor(cap), 0);
}

/** Protección climática 0–3 por tipo de edificio (GM §4). */
export function climateProtectionOf(def) {
  if (!def) return 0;
  if (def.climateProtection != null) return Number(def.climateProtection) || 0;
  if (def.housing) return 0;
  return 0;
}

/**
 * Plazas con protección ≥ umbral (cadena climática GM §4).
 * Asigna camas de mayor a menor protección.
 */
export function coveredBeds(state, buildingsContent, minProtection = 0) {
  const beds = [];
  (state.base?.buildings || []).forEach((b) => {
    if (b.hp <= 0) return;
    const def = buildingsContent[b.type];
    const housing = def?.housing || 0;
    if (housing <= 0) return;
    const prot = climateProtectionOf(def);
    const pct = (b.hp ?? 100) / 100;
    const struct = pct < 0.35 ? 0.3 : pct < 0.7 ? 0.65 : 1;
    if (prot >= minProtection) beds.push({ prot, housing: housing * struct });
  });
  return Math.floor(beds.reduce((n, x) => n + x.housing, 0));
}

/** Umbral de protección según clima puntual. */
export function climateProtectionThreshold(weather) {
  if (weather === 'blizzard') return 2;
  if (weather === 'cold' || weather === 'heat') return 1;
  return 0;
}

/**
 * Cobertura térmica: déficit de plazas a cubierto + madera estimada.
 */
export function housingClimateCoverage(state, buildingsContent, balance, weather) {
  const pop = state.population?.total || 0;
  const threshold = climateProtectionThreshold(weather);
  const covered = coveredBeds(state, buildingsContent, threshold);
  const deficit = Math.max(0, pop - covered);
  const wh = balance?.woodHeating || {};
  const severity = weather === 'blizzard' ? 2 : weather === 'cold' || weather === 'heat' ? 1 : 0;
  const per = wh.woodPerUnprotectedPersonPerSeverity ?? 0.4;
  const mit = wh.protectionMitigation || [1, 0.65, 0.35, 0.1];

  // Personas cubiertas: mitigan según su nivel medio de protección ≥ umbral
  // Personas en déficit: mit=1 (expuestas)
  let woodNeed = 0;
  if (severity > 0) {
    woodNeed += deficit * per * severity * (mit[0] ?? 1);
    // Cubiertos: coste residual según umbral alcanzado
    const coveredMit = mit[Math.min(3, threshold)] ?? 0.35;
    woodNeed += Math.min(pop, covered) * per * severity * coveredMit;
  }
  return {
    pop,
    threshold,
    covered,
    deficit,
    woodNeed: Math.max(0, Math.ceil(woodNeed)),
    weather,
  };
}

/** Días de reserva de madera al ritmo woodNeed (ZZ-033/045). */
export function woodReserveDays(state, woodNeed) {
  const need = Math.max(0, Number(woodNeed) || 0);
  if (need <= 0) return Infinity;
  return Math.floor((state.resources?.wood || 0) / need);
}

export const SEASON_LABEL = {
  spring: 'Primavera',
  summer: 'Verano',
  autumn: 'Otoño',
  winter: 'Invierno',
};

export function tickSeason(state, balance) {
  const cfg = balance?.seasons || {};
  const order = cfg.order || ['spring', 'summer', 'autumn', 'winter'];
  const len = Math.max(8, cfg.daysPerSeason || 22);
  if (!state.season || !order.includes(state.season)) state.season = cfg.startSeason || 'autumn';
  state.seasonDay = (state.seasonDay || 0) + 1;
  if (state.seasonDay > len) {
    state.seasonDay = 1;
    const i = order.indexOf(state.season);
    state.season = order[(i + 1) % order.length];
    pushLog(state, `Empieza ${SEASON_LABEL[state.season] || state.season}.`, 'info');
  }
}

/** Programa clima con aviso (ZZ-042) o aplica inmediato. */
export function scheduleOrApplyWeather(state, content, weather, rng, { forceImmediate = false } = {}) {
  const balance = content.balance || content;
  const wh = balance.woodHeating || {};
  const durCfg = balance.weatherDuration || { min: 1, max: 3 };
  const duration = rng.int(durCfg.min || 1, durCfg.max || 3);
  const needsWarn =
    !forceImmediate &&
    (weather === 'cold' || weather === 'blizzard' || weather === 'heat') &&
    Array.isArray(wh.warnDaysBefore) &&
    wh.warnDaysBefore.length;
  if (needsWarn) {
    const warn = rng.pick(wh.warnDaysBefore);
    const cov = housingClimateCoverage(state, content.buildings || {}, balance, weather);
    state.pendingWeather = {
      type: weather,
      startsOnDay: state.day + warn,
      duration,
      woodPerDay: cov.woodNeed,
      announced: true,
    };
    const reserve = woodReserveDays(state, cov.woodNeed);
    const reserveTxt = Number.isFinite(reserve) ? `${reserve} días` : 'sobra';
    pushLog(
      state,
      `${weather === 'heat' ? 'Calor' : 'Frío'} en ${warn} día(s) — ~${cov.woodNeed} madera/día · reserva ${reserveTxt}.`,
      'warn'
    );
    return { scheduled: true, warn, duration };
  }
  state.weather = weather;
  state.weatherDaysLeft = duration;
  return { scheduled: false, duration };
}

export function tickPendingWeather(state) {
  const p = state.pendingWeather;
  if (!p) return null;
  if (state.day < p.startsOnDay) return { waiting: true, pending: p };
  state.weather = p.type;
  state.weatherDaysLeft = p.duration || 2;
  state.pendingWeather = null;
  pushLog(state, `Llega el clima anunciado: ${p.type}.`, 'warn');
  return { applied: p };
}

/** Desglose defensa agregada (ZZ-060). */
export function defenseBreakdown(state, buildingsContent, balance) {
  let buildings = 0;
  state.base.buildings.forEach((b) => {
    if (b.hp <= 0) return;
    const d = buildingsContent[b.type];
    if (!d?.defense) return;
    const jobs = d.jobs || 0;
    let raw = 0;
    if (jobs <= 0) {
      raw = d.defense;
    } else {
      const staff = Math.max(0, b.workers || 0);
      raw = d.defense * clamp(staff / jobs, 0, 1.15);
    }
    // ZZ-066: daño estructural reduce defensa aportada
    const pct = (b.hp ?? 100) / 100;
    const struct = pct < 0.35 ? 0.3 : pct < 0.7 ? 0.65 : 1;
    buildings += raw * struct;
  });
  const assigned = state.population?.labor?.defense || 0;
  const bldDefWorkers = (state.base?.buildings || []).reduce((n, b) => {
    const d = buildingsContent[b.type];
    if (b.hp <= 0 || !d || !(d.jobs > 0) || !(d.defense > 0)) return n;
    return n + (b.workers || 0);
  }, 0);
  const patrol = Math.max(0, assigned - bldDefWorkers);
  const per = balance.defensePerAssigned || balance.compat?.defensePerArmedSurvivor || 2.5;
  const patrolScore = patrol * per;
  const staffBonus = bldDefWorkers * (per * 0.35);
  const ammoFactor = balance.ammoDefenseFactor ?? 1.2;
  const ammoCap = balance.ammoDefenseCap ?? 12;
  let ammoScore = Math.min(ammoCap, Math.floor((state.resources.ammo || 0) * ammoFactor));
  const unlocked = state.research?.unlocked || [];
  if (unlocked.includes('ammo_craft')) ammoScore = Math.min(ammoCap + 2, Math.round(ammoScore * 1.15));
  let explorers = 0;
  livingExplorers(state).forEach((e) => {
    if (e.status === 'ready') explorers += (e.skills.fight || 1) * 0.8;
  });
  let gear = 0;
  if (state.equipment?.weapon === 'basic') gear += 3;
  if (state.equipment?.weapon === 'improved') gear += 7;
  if (state.equipment?.armor === 'light') gear += 2;
  if (state.equipment?.armor === 'heavy') gear += 5;
  let tech = 0;
  if (unlocked.includes('def_fortify')) tech += 8;
  if (unlocked.includes('watch_protocols')) tech += 3;
  if (unlocked.includes('tower_optics')) tech += 2;
  const controlled = (state.zones || []).filter((z) => z.state === 'controlled').length;
  const territory = Math.min(12, controlled * (balance.defensePerControlledZone ?? 1.5));
  const total = buildings + patrolScore + staffBonus + ammoScore + explorers + gear + tech + territory;
  return {
    total,
    buildings: Math.round(buildings * 10) / 10,
    patrol: Math.round(patrolScore * 10) / 10,
    staffBonus: Math.round(staffBonus * 10) / 10,
    ammo: Math.round(ammoScore * 10) / 10,
    explorers: Math.round(explorers * 10) / 10,
    gear: Math.round(gear * 10) / 10,
    tech: Math.round(tech * 10) / 10,
    territory: Math.round(territory * 10) / 10,
    controlled,
    ammoStock: state.resources.ammo || 0,
  };
}

export function defenseValue(state, buildingsContent, balance) {
  return defenseBreakdown(state, buildingsContent, balance).total;
}

export function pushLog(state, text, kind = 'info') {
  state.log.unshift({ day: state.day, text, kind });
  if (state.log.length > 120) state.log.length = 120;
}

export function summarizeState(state) {
  const alive = state.population?.total ?? allLiving(state).length;
  if (state.flags.defeated) return `Derrota · Día ${state.day}`;
  if (state.flags.victory && !state.flags.endless) return `Victoria · Día ${state.day}`;
  return `Día ${state.day} · Era ${state.era} · ${alive} hab. · estab. ${Math.round(state.stability)}`;
}

/** @deprecated */
export function gainSkill() {}

export function makeSurvivor() {
  return null;
}

export { hashSeed, createRng, workforce };
