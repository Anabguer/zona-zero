/**
 * ZZ-100…107 — Misiones + motor expedición combinatorio (lean v1).
 */
import { createRng } from './rng.js';
import { uid } from './util.js';
import { hasRadio, pushRadioSignal } from './radio.js';

export function ensureMissions(state) {
  if (!state.missions) {
    state.missions = {
      active: [],
      completed: [],
      memory: { encounters: [], placeOutcomes: [], lastMissionIds: [] },
      cooldowns: {},
    };
  }
  if (!state.missions.memory) {
    state.missions.memory = { encounters: [], placeOutcomes: [], lastMissionIds: [] };
  }
  return state.missions;
}

export function allMissionDefs(content) {
  return content.missionsDoc?.missions || [];
}

export function findMission(content, id) {
  return allMissionDefs(content).find((m) => m.id === id) || null;
}

function needFood(state) {
  const pop = state.population?.total || 1;
  return (state.resources.food || 0) < pop * 2;
}
function needWater(state) {
  const pop = state.population?.total || 1;
  return (state.resources.water || 0) < pop * 2;
}
function needMed(state) {
  return (state.population?.sick || 0) + (state.population?.injured || 0) > 0 && (state.resources.medicine || 0) < 2;
}

export function missionEligible(state, content, def) {
  if (!def) return false;
  const m = ensureMissions(state);
  if (m.active.some((a) => a.id === def.id)) return false;
  if (m.completed.includes(def.id) && def.once) return false;
  if (state.day < (m.cooldowns[def.id] || 0)) return false;
  if ((def.minDay || 0) > state.day) return false;
  if ((def.minEra || 0) > (state.era || 0)) return false;
  if (def.requiresRadio && !hasRadio(state)) return false;
  if (def.when === 'food_low' && !needFood(state)) return false;
  if (def.when === 'water_low' && !needWater(state)) return false;
  if (def.when === 'med_low' && !needMed(state)) return false;
  if (def.when === 'has_radio' && !hasRadio(state)) return false;
  return true;
}

export function offerMission(state, content, def) {
  if (!missionEligible(state, content, def)) return null;
  const m = ensureMissions(state);
  if (m.active.length >= 3) return null;
  const entry = {
    id: def.id,
    type: def.type,
    title: def.title,
    objective: def.objective,
    detail: def.detail || def.benefit || '',
    target: def.target || 1,
    progress: 0,
    zoneType: def.zoneType || null,
    reward: def.reward || null,
    startedDay: state.day,
  };
  m.active.push(entry);
  m.memory.lastMissionIds = [def.id, ...(m.memory.lastMissionIds || [])].slice(0, 10);
  return entry;
}

/** Ofertas diarias: guías + contextuales + radio. */
export function tickMissions(state, content) {
  const defs = allMissionDefs(content);
  const m = ensureMissions(state);
  // Guías early
  defs
    .filter((d) => d.type === 'guide')
    .forEach((d) => {
      if (missionEligible(state, content, d) && m.active.length < 2) offerMission(state, content, d);
    });
  // Contextuales
  defs
    .filter((d) => d.type === 'contextual')
    .forEach((d) => {
      if (missionEligible(state, content, d) && m.active.length < 3) offerMission(state, content, d);
    });
  // Radio / historia / crisis / ambigua
  if (hasRadio(state) && m.active.length < 3) {
    const pool = defs.filter((d) => ['radio', 'historia', 'crisis', 'ambigua'].includes(d.type));
    const eligible = pool.filter((d) => missionEligible(state, content, d));
    if (eligible.length) {
      const rng = createRng((state.rngState || 1) + state.day * 31);
      const pick = rng.pick(eligible);
      const offered = offerMission(state, content, pick);
      if (offered) {
        pushRadioSignal(state, {
          title: offered.title,
          detail: offered.detail || offered.objective,
          kind: offered.type === 'radio' ? 'sos' : 'rumor',
        });
      }
    }
  }
}

export function bumpMissionProgress(state, content, predicate, amount = 1) {
  const m = ensureMissions(state);
  const done = [];
  m.active.forEach((a) => {
    if (!predicate(a)) return;
    a.progress = (a.progress || 0) + amount;
    if (a.progress >= (a.target || 1)) {
      completeMission(state, content, a.id);
      done.push(a.id);
    }
  });
  return done;
}

export function completeMission(state, content, missionId) {
  const m = ensureMissions(state);
  const idx = m.active.findIndex((a) => a.id === missionId);
  if (idx < 0) return false;
  const a = m.active[idx];
  m.active.splice(idx, 1);
  if (!m.completed.includes(missionId)) m.completed.push(missionId);
  const def = findMission(content, missionId);
  m.cooldowns[missionId] = state.day + (def?.cooldown || 8);
  if (a.reward) {
    Object.entries(a.reward).forEach(([k, v]) => {
      state.resources[k] = (state.resources[k] || 0) + v;
    });
  }
  return true;
}

/** placeState canónico para el motor. */
export function placeStateOf(zone) {
  if (!zone) return 'pristine';
  if (zone.state === 'controlled') return 'looted';
  if (zone.state === 'contested') return 'contested';
  if (zone.state === 'hostile') return 'infested';
  if ((zone.controlProgress || 0) <= 0 && zone.state === 'discovered') return 'pristine';
  if (zone.lootDepletion > 0.5) return 'looted';
  if (zone.flags?.radioTagged || zone.radioTagged) return 'radio_tagged';
  return 'pristine';
}

const ENCOUNTER_TABLE = {
  pristine: ['scavenge', 'quiet_find', 'ambush_light'],
  looted: ['scavenge_thin', 'tracks', 'empty_shelves'],
  infested: ['ambush', 'clear_nest', 'run'],
  contested: ['skirmish', 'hold_ground', 'withdraw'],
  collapsed: ['rubble', 'unstable', 'salvage'],
  radio_tagged: ['signal_cache', 'contact_note', 'trap_or_ally'],
};

const ENCOUNTER_TEXT = {
  scavenge: 'Estanterías intactas. ¿Cómo lo enfocáis?',
  quiet_find: 'Silencio raro. Hay algo útil a la vista.',
  ambush_light: 'Movimiento en la periferia.',
  scavenge_thin: 'Ya saquearon aquí. Queda poco.',
  tracks: 'Huellas recientes hacia el interior.',
  empty_shelves: 'Estanterías vacías. Solo restos.',
  ambush: 'Emboscada: hay que decidir rápido.',
  clear_nest: 'Nido de infectados en el sótano.',
  run: 'Demasiados. La retirada es una opción.',
  skirmish: 'Disputa abierta por el lugar.',
  hold_ground: 'Podéis aguantar y consolidar.',
  withdraw: 'Presión alta: salir con lo puesto.',
  rubble: 'Escombros inestables.',
  unstable: 'El techo cruje.',
  salvage: 'Chatarra aprovechable bajo ruinas.',
  signal_cache: 'Marca de radio: un escondite.',
  contact_note: 'Nota de un contacto: coordenadas.',
  trap_or_ally: '¿Trampa o aliado? Ambiguo.',
};

/**
 * Encounter combinatorio placeState × encounter × choice weights.
 * Antirrepetición vía memoria reciente.
 */
export function pickExpeditionEncounter(state, zone, rng) {
  const m = ensureMissions(state);
  const ps = placeStateOf(zone);
  let pool = [...(ENCOUNTER_TABLE[ps] || ENCOUNTER_TABLE.pristine)];
  const recent = m.memory.encounters || [];
  pool = pool.filter((id) => !recent.slice(0, 3).includes(id));
  if (!pool.length) pool = [...(ENCOUNTER_TABLE[ps] || ENCOUNTER_TABLE.pristine)];
  const encounterId = rng.pick(pool);
  m.memory.encounters = [encounterId, ...recent].slice(0, 16);
  m.memory.placeOutcomes = [`${ps}:${encounterId}`, ...(m.memory.placeOutcomes || [])].slice(0, 24);
  const choices = choicesForEncounter(encounterId);
  return {
    placeState: ps,
    encounterId,
    text: ENCOUNTER_TEXT[encounterId] || 'El lugar exige una decisión.',
    choices,
  };
}

function choicesForEncounter(encounterId) {
  const map = {
    ambush: [
      { id: 'fight', label: 'Plantar cara', risk: 0.12, loot: 0.2, control: 0.1 },
      { id: 'sneak', label: 'Escabullirse', risk: -0.05, loot: -0.1, control: 0 },
    ],
    clear_nest: [
      { id: 'clear', label: 'Limpiar nido', risk: 0.15, loot: 0.25, control: 0.2 },
      { id: 'seal', label: 'Sellar y marcar', risk: -0.02, loot: 0, control: 0.05 },
    ],
    skirmish: [
      { id: 'push', label: 'Empujar', risk: 0.1, loot: 0.1, control: 0.25 },
      { id: 'negotiate', label: 'Negociar paso', risk: 0, loot: -0.05, control: 0.05 },
    ],
    trap_or_ally: [
      { id: 'trust', label: 'Confiar', risk: 0.08, loot: 0.3, control: 0 },
      { id: 'caution', label: 'Con cautela', risk: 0, loot: 0.05, control: 0 },
    ],
  };
  return (
    map[encounterId] || [
      { id: 'loot', label: 'Priorizar botín', risk: 0.04, loot: 0.25, control: -0.05 },
      { id: 'secure', label: 'Priorizar control', risk: 0.02, loot: -0.05, control: 0.2 },
      { id: 'leave', label: 'Salir pronto', risk: -0.06, loot: -0.15, control: 0 },
    ]
  );
}

export function applyEncounterChoice(choice, base = {}) {
  return {
    riskMod: (base.riskMod || 0) + (choice?.risk || 0),
    lootMod: (base.lootMod || 0) + (choice?.loot || 0),
    controlMod: (base.controlMod || 0) + (choice?.control || 0),
  };
}

/** Métrica antirrepetición para tests. */
export function encounterRepeatRate(memory, window = 12) {
  const list = (memory?.encounters || []).slice(0, window);
  if (list.length < 2) return 0;
  const counts = {};
  list.forEach((id) => {
    counts[id] = (counts[id] || 0) + 1;
  });
  const max = Math.max(...Object.values(counts));
  return max / list.length;
}
