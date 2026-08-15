/**
 * Estado Zona Zero v4 — población colectiva + exploradores
 */
import { createRng, hashSeed } from './rng.js';
import { clamp, uid } from './util.js';
import { emptyLabor, redistributeLabor, workforce } from './population.js';
import { makeExplorer, livingExplorers } from './explorers.js';
import { syncLaborFromColony } from './colony.js';

export const SAVE_VERSION = 4;
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
    lastDayBrief: null,
    equipment: { weapon: 'none', armor: 'none', vehicleId: null },
    vehiclesOwned: [],
    research: { unlocked: [], active: null, progress: 0 },
    factions,
    weather: 'clear',
    weatherDaysLeft: 0,
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
      narrative: {},
      coach: { explore: false, labor: false, build: false, dismissed: false },
    },
    pendingChoice: null,
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
    if (def?.housing) cap += def.housing;
  });
  return Math.max(cap, 0);
}

export function defenseValue(state, buildingsContent, balance) {
  let def = 0;
  state.base.buildings.forEach((b) => {
    if (b.hp <= 0) return;
    const d = buildingsContent[b.type];
    if (!d?.defense) return;
    const jobs = d.jobs || 0;
    if (jobs <= 0) {
      def += d.defense; // pasivo (barricadas, vallas)
    } else {
      const staff = Math.max(0, b.workers || 0);
      def += d.defense * clamp(staff / jobs, 0, 1.15);
    }
  });
  const assigned = state.population?.labor?.defense || 0;
  // Solo el cupo "extra" de patrulla (no doble-contar edificios)
  const bldDefWorkers = (state.base?.buildings || []).reduce((n, b) => {
    const d = buildingsContent[b.type];
    if (b.hp <= 0 || !d || !(d.jobs > 0) || !(d.defense > 0)) return n;
    return n + (b.workers || 0);
  }, 0);
  const patrol = Math.max(0, assigned - bldDefWorkers);
  def += patrol * (balance.defensePerAssigned || balance.compat?.defensePerArmedSurvivor || 2.5);
  // Torres/armory staffed ya aportan defense del edificio; bonus ligero por estar asignados
  def += bldDefWorkers * ((balance.defensePerAssigned || 2.5) * 0.35);
  const ammoFactor = balance.ammoDefenseFactor ?? 1.2;
  const ammoCap = balance.ammoDefenseCap ?? 12;
  def += Math.min(ammoCap, Math.floor((state.resources.ammo || 0) * ammoFactor));
  // Bonus exploradores en casa
  livingExplorers(state).forEach((e) => {
    if (e.status === 'ready') def += (e.skills.fight || 1) * 0.8;
  });
  if (state.equipment?.weapon === 'basic') def += 3;
  if (state.equipment?.weapon === 'improved') def += 7;
  if (state.equipment?.armor === 'light') def += 2;
  if (state.equipment?.armor === 'heavy') def += 5;
  const techDef = (state.research?.unlocked || []).includes('def_fortify') ? 8 : 0;
  return def + techDef;
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
