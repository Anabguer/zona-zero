/**
 * Exploradores — únicos personajes individuales (máx. 3).
 */
import { createRng } from './rng.js';
import { clamp, uid } from './util.js';

export const EXPLORER_SKILLS = ['explore', 'loot', 'fight', 'resist'];

export function makeExplorer(rng, survivorsDoc, opts = {}) {
  const names = survivorsDoc?.names || ['Sam'];
  const name = opts.name || rng.pick(names);
  const range = opts.skillRange || [1, 2];
  const skills = {};
  EXPLORER_SKILLS.forEach((k) => {
    skills[k] = rng.int(range[0], range[1]);
  });
  const focus = rng.pick(EXPLORER_SKILLS);
  skills[focus] = clamp(skills[focus] + 1, 1, 5);
  return {
    id: uid('ex'),
    name,
    portraitSeed: opts.portraitSeed || rng.int(1, 999999),
    level: 1,
    xp: 0,
    skills,
    status: 'ready', // ready | away | wounded | dead
    gear: { weapon: 'none', armor: 'none' },
    vehicleId: null,
    expeditionId: null,
    wounds: 0,
  };
}

export function explorerSlotsUnlocked(state, balance) {
  const cfg = balance?.explorers || {};
  let slots = cfg.startSlots || 1;
  const pop = state.population?.total || 0;
  const controlled = (state.zones || []).filter((z) => z.state === 'controlled').length;
  const era = state.era || 0;
  const s2 = cfg.slot2 || {};
  const s3 = cfg.slot3 || {};
  if (pop >= (s2.minPop || 12) && controlled >= (s2.minControlled || 3) && era >= (s2.minEra || 1)) {
    slots = Math.max(slots, 2);
  }
  if (pop >= (s3.minPop || 28) && controlled >= (s3.minControlled || 6) && era >= (s3.minEra || 2)) {
    slots = Math.max(slots, 3);
  }
  return Math.min(cfg.maxActive || 3, slots);
}

export function livingExplorers(state) {
  return (state.explorers || []).filter((e) => e.status !== 'dead');
}

export function readyExplorers(state) {
  return livingExplorers(state).filter((e) => e.status === 'ready' && !e.expeditionId);
}

export function gainExplorerXp(explorer, amount, balance) {
  if (!explorer || explorer.status === 'dead') return;
  const table = balance?.explorers?.xpPerLevel || [0, 8, 20, 40, 70];
  explorer.xp = (explorer.xp || 0) + amount;
  let lvl = explorer.level || 1;
  while (lvl < 5 && explorer.xp >= (table[lvl] || 9999)) {
    explorer.xp -= table[lvl] || 9999;
    lvl += 1;
  }
  explorer.level = lvl;
}

export function gainExplorerSkill(explorer, key, amount = 1, balance) {
  if (!explorer || explorer.status === 'dead') return;
  if (!EXPLORER_SKILLS.includes(key)) return;
  const max = balance?.explorers?.skillMax || 5;
  // XP lenta: acumula fracciones vía contador interno
  if (!explorer._skillXp) explorer._skillXp = { explore: 0, loot: 0, fight: 0, resist: 0 };
  explorer._skillXp[key] = (explorer._skillXp[key] || 0) + amount;
  const need = 3 + (explorer.skills[key] || 1) * 2; // más lento a niveles altos
  while (explorer._skillXp[key] >= need && explorer.skills[key] < max) {
    explorer._skillXp[key] -= need;
    explorer.skills[key] += 1;
  }
  gainExplorerXp(explorer, amount, balance);
}

export function renameExplorer(state, explorerId, name) {
  const e = (state.explorers || []).find((x) => x.id === explorerId);
  if (!e || e.status === 'dead') return { ok: false, error: 'No encontrado' };
  const n = String(name || '').trim().slice(0, 24);
  if (!n) return { ok: false, error: 'Nombre vacío' };
  e.name = n;
  return { ok: true };
}

export function recruitExplorer(state, content) {
  const balance = content.balance;
  const slots = explorerSlotsUnlocked(state, balance);
  const living = livingExplorers(state).length;
  if (living >= slots) return { ok: false, error: 'No hay plaza de explorador libre' };
  if ((state.population?.total || 0) < 2) return { ok: false, error: 'Población insuficiente' };
  if (state.explorerRecruitReadyDay != null && state.day < state.explorerRecruitReadyDay) {
    return { ok: false, error: `Reclutamiento listo el día ${state.explorerRecruitReadyDay}` };
  }
  const rng = createRng((state.rngState || 1) + state.day * 13);
  state.rngState = (state.rngState || 1) + 3;
  // El recluta sale de la población
  state.population.total = Math.max(1, state.population.total - 1);
  const ex = makeExplorer(rng, content.survivorsDoc, {
    skillRange: balance.explorers?.startingSkillRange || [1, 2],
  });
  state.explorers.push(ex);
  state.explorerRecruitReadyDay = state.day + (balance.explorers?.recruitCooldownDays || 2);
  return { ok: true, explorer: ex };
}

export function killExplorer(state, explorer, balance, { recoverGear = null } = {}) {
  if (!explorer) return;
  explorer.status = 'dead';
  explorer.expeditionId = null;
  const chance = recoverGear == null ? balance?.explorers?.gearRecoverChanceOnDeath ?? 0.55 : recoverGear ? 1 : 0;
  // gear recovery abstracted into resources if lucky
  if (Math.random() < chance && explorer.gear?.weapon && explorer.gear.weapon !== 'none') {
    state.resources.metal = (state.resources.metal || 0) + 1;
  }
  explorer.gear = { weapon: 'none', armor: 'none' };
  explorer.vehicleId = null;
}
