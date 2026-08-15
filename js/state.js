/**
 * Estado Zona Zero v3
 */
import { createRng, hashSeed } from './rng.js';
import { clamp, uid } from './util.js';

export const SAVE_VERSION = 3;
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
    names.map((n) => fetch(new URL(`${n}.json`, base)).then((r) => {
      if (!r.ok) throw new Error(n);
      return r.json();
    }))
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
  // compat zones
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

function makeSurvivor(rng, survivorsDoc, forcedName = null) {
  const skills = {};
  SKILL_KEYS.forEach((k) => {
    skills[k] = rng.int(1, 3);
  });
  const focus = rng.pick(SKILL_KEYS);
  skills[focus] = clamp(skills[focus] + rng.int(1, 2), 1, 5);
  const traits = survivorsDoc.traits || [];
  const trait = rng.chance(0.55) && traits.length ? rng.pick(traits) : null;
  if (trait?.effects?.scoutBonus) skills.scout = clamp(skills.scout + trait.effects.scoutBonus, 1, 5);
  const hpBonus = trait?.effects?.hpBonus || 0;
  const names = survivorsDoc.names || ['Sam'];
  const name = forcedName || rng.pick(names);
  return {
    id: uid('s'),
    name,
    hp: 100 + hpBonus,
    maxHp: 100 + hpBonus,
    skills,
    status: 'ok',
    busyUntilDay: 0,
    jobBuildingId: null,
    traitId: trait?.id || null,
    ageGroup: 'adult',
    xp: { scout: 0, gather: 0, build: 0, produce: 0, fight: 0 },
  };
}

export function createNewState(content, colonyName = 'Refugio 0', seedInput = null) {
  const { balance, locationsDoc, survivorsDoc, buildings, factionsDoc, erasDoc } = content;
  const seed = seedInput || `zz-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`;
  const rng = createRng(seed);
  const names = [...(survivorsDoc.names || [])];
  const survivors = [];
  for (let i = 0; i < balance.startingSurvivors; i++) {
    const name = names.length ? names.splice(rng.int(0, names.length - 1), 1)[0] : null;
    survivors.push(makeSurvivor(rng, survivorsDoc, name));
  }

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
  // roll infected on non-controlled
  zones.forEach((z) => {
    if (z.state !== 'controlled' && z.infected) {
      z.infectedLeft = rng.int(z.infected[0] || 0, z.infected[1] || 0);
    }
  });

  const hq = buildings.hq_central_l1 || Object.values(buildings).find((b) => b.category === 'core');
  const shelterDef = buildings.shelter;
  const buildingsPlaced = [];
  if (hq) buildingsPlaced.push({ id: uid('b'), type: hq.id, x: 4, y: 3, hp: 100, workers: [] });
  if (shelterDef) {
    buildingsPlaced.push({ id: uid('b'), type: 'shelter', x: 3, y: 3, hp: 100, workers: [] });
    buildingsPlaced.push({ id: uid('b'), type: 'shelter', x: 5, y: 3, hp: 100, workers: [] });
  }

  // factions 3-5
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

  return {
    v: SAVE_VERSION,
    seed,
    rngState: rng.seed,
    colonyName: String(colonyName).slice(0, 40) || 'Refugio 0',
    day: 1,
    era: 0,
    resources: normalizeResources(balance.startingResources),
    energy: { produced: 0, demand: 0 },
    survivors,
    base: {
      w: balance.baseGrid?.w || 10,
      h: balance.baseGrid?.h || 8,
      buildings: buildingsPlaced,
    },
    zones,
    expedition: null,
    expeditionsDone: 0,
    selectedSurvivorIds: [],
    selectedZoneId: null,
    buildMode: null,
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
      coach: { people: false, explore: false, build: false, dismissed: false },
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
      maxPop: survivors.length,
      maxControlled: 1,
      births: 0,
      immigrants: 0,
      attacksSurvived: 0,
    },
    eraDocRef: erasDoc?.eras?.[0]?.id || 'era0',
  };
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
  if (!next.flags.coach) next.flags.coach = { people: false, explore: false, build: false, dismissed: false };
  if (!next.director) next.director = { threat: 10, tension: 15, cooldowns: {}, familyCooldowns: {}, recentFamilies: [] };
  if (!next.director.familyCooldowns) next.director.familyCooldowns = {};
  if (!next.director.recentFamilies) next.director.recentFamilies = [];
  next.survivors = (next.survivors || []).map((s) => {
    const skills = { scout: 1, gather: 1, build: 1, produce: 1, fight: 1, ...(s.skills || {}) };
    if (skills.produce == null) skills.produce = skills.build || 1;
    return {
      ...s,
      skills,
      xp: s.xp || { scout: 0, gather: 0, build: 0, produce: 0, fight: 0 },
      jobBuildingId: s.jobBuildingId ?? null,
      traitId: s.traitId ?? null,
      ageGroup: s.ageGroup || 'adult',
    };
  });
  if (!next.base || !next.base.w) {
    next.base = {
      w: balance?.baseGrid?.w || 10,
      h: balance?.baseGrid?.h || 8,
      buildings: next.base?.buildings || [],
    };
  }
  next.base.buildings = (next.base.buildings || []).map((b) => ({
    workers: [],
    hp: 100,
    ...b,
  }));
  (next.zones || []).forEach((z) => {
    if (z.controlProgress == null) z.controlProgress = z.state === 'controlled' ? 1 : 0;
    if (z.infectedLeft == null) z.infectedLeft = 0;
  });
  return next;
}

export function livingSurvivors(state) {
  return state.survivors.filter((s) => s.status !== 'dead' && s.ageGroup !== 'child');
}

export function allLiving(state) {
  return state.survivors.filter((s) => s.status !== 'dead');
}

export function maxSurvivorsCap(balance) {
  const n = Number(balance?.maxSurvivors);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 120;
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
    if (d?.defense) def += d.defense;
  });
  const armed = livingSurvivors(state).filter((s) => s.skills.fight >= 3).length;
  def += armed * (balance.defensePerArmedSurvivor || 3);
  def += Math.floor((state.resources.ammo || 0) * (balance.ammoDefenseFactor ?? 1.2));
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
  const alive = allLiving(state).length;
  if (state.flags.defeated) return `Derrota · Día ${state.day}`;
  if (state.flags.victory && !state.flags.endless) return `Victoria · Día ${state.day}`;
  return `Día ${state.day} · Era ${state.era} · ${alive} vivos · estab. ${Math.round(state.stability)}`;
}

export function gainSkill(state, survivor, key, amount = 1) {
  if (!survivor || survivor.status === 'dead') return;
  survivor.xp[key] = (survivor.xp[key] || 0) + amount;
  while (survivor.xp[key] >= 5 && survivor.skills[key] < 5) {
    survivor.xp[key] -= 5;
    survivor.skills[key] += 1;
  }
}

export { makeSurvivor, hashSeed, createRng };
