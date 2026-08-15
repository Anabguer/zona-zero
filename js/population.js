/**
 * Población colectiva Zona Zero 1.2 — sin gestión individual.
 */
import { clamp } from './util.js';

export const LABOR_KEYS = ['idle', 'food', 'water', 'build', 'produce', 'defense', 'medicine'];

export function emptyLabor() {
  return { idle: 0, food: 0, water: 0, build: 0, produce: 0, defense: 0, medicine: 0 };
}

export function workforce(pop) {
  if (!pop) return 0;
  return Math.max(0, (pop.total || 0) - (pop.sick || 0) - (pop.injured || 0) - (pop.dependents || 0));
}

export function laborSum(labor) {
  return LABOR_KEYS.reduce((n, k) => n + (labor?.[k] || 0), 0);
}

/** Reparte la fuerza laboral según objetivos de balance, respetando overrides manuales. */
export function redistributeLabor(state, balance, { preserveManual = true } = {}) {
  const pop = state.population;
  if (!pop) return;
  if (!pop.labor) pop.labor = emptyLabor();
  const wf = workforce(pop);
  const targets = balance?.laborTargets || {};
  const manual = preserveManual ? { ...(pop.manual || {}) } : {};

  const next = emptyLabor();
  let remaining = wf;

  // Primero slots fijados a mano
  LABOR_KEYS.forEach((k) => {
    if (k === 'idle') return;
    if (manual[k] != null) {
      const v = clamp(Math.floor(manual[k]), 0, remaining);
      next[k] = v;
      remaining -= v;
    }
  });

  // Resto por prioridades / ratios
  const priorities = (balance?.laborPriorities || LABOR_KEYS).filter((k) => k !== 'idle');
  const autoKeys = priorities.filter((k) => manual[k] == null);
  const weightSum = autoKeys.reduce((n, k) => n + (targets[k] || 0.1), 0) || 1;

  autoKeys.forEach((k, i) => {
    if (remaining <= 0) return;
    const share = (targets[k] || 0.1) / weightSum;
    let n = i === autoKeys.length - 1 ? remaining : Math.floor(remaining * share);
    // Con pocas personas, no vaciar idle del todo
    if (wf <= 4 && k !== 'food' && k !== 'water' && i < autoKeys.length - 1) {
      n = Math.min(n, 1);
    }
    n = clamp(n, 0, remaining);
    next[k] = (next[k] || 0) + n;
    remaining -= n;
  });

  next.idle = Math.max(0, remaining);
  // Garantizar al menos 1 idle si hay ≥2 trabajadores y no hay override
  if (wf >= 2 && next.idle === 0 && manual.idle == null) {
    const donor = ['build', 'produce', 'defense', 'medicine'].find((k) => (next[k] || 0) > 0 && manual[k] == null);
    if (donor) {
      next[donor] -= 1;
      next.idle = 1;
    }
  }
  pop.labor = next;
  return next;
}

export function adjustLabor(state, key, delta, balance) {
  const pop = state.population;
  if (!pop?.labor || !LABOR_KEYS.includes(key) || key === 'idle') return { ok: false, error: 'Inválido' };
  if (!pop.manual) pop.manual = {};

  const wf = workforce(pop);
  const cur = pop.labor[key] || 0;
  const want = clamp(cur + delta, 0, wf);
  pop.manual[key] = want;

  // Liberar/ocupar desde idle u otras no-manual
  redistributeLabor(state, balance, { preserveManual: true });

  // Si pedimos más de lo posible, clamp manual
  if ((pop.labor[key] || 0) < want) {
    pop.manual[key] = pop.labor[key];
  }
  return { ok: true, labor: { ...pop.labor } };
}

export function clearLaborManual(state, balance) {
  if (state.population) state.population.manual = {};
  redistributeLabor(state, balance, { preserveManual: false });
}

export function changePopulation(state, delta, balance, reason = '') {
  const pop = state.population;
  if (!pop) return;
  const max = balance?.maxPopulation || balance?.maxSurvivors || 150;
  const before = pop.total;
  pop.total = clamp(Math.floor(pop.total + delta), 0, max);
  if (pop.sick > pop.total) pop.sick = pop.total;
  if (pop.injured > pop.total - pop.sick) pop.injured = Math.max(0, pop.total - pop.sick);
  redistributeLabor(state, balance);
  if (delta < 0 && state.stats) state.stats.deaths += before - pop.total;
  if (delta > 0 && state.stats) {
    if (reason === 'birth') state.stats.births += delta;
    if (reason === 'immigrant') state.stats.immigrants += delta;
  }
  state.stats.maxPop = Math.max(state.stats.maxPop || 0, pop.total);
}

export function applyCasualties(state, balance, { dead = 0, injured = 0, sick = 0 } = {}) {
  const pop = state.population;
  if (!pop) return;
  if (dead > 0) changePopulation(state, -dead, balance, 'death');
  pop.injured = clamp((pop.injured || 0) + injured, 0, pop.total);
  pop.sick = clamp((pop.sick || 0) + sick, 0, Math.max(0, pop.total - pop.injured));
  redistributeLabor(state, balance);
}

export function healPopulationTick(state, balance) {
  const pop = state.population;
  if (!pop) return;
  const medStaff = pop.labor?.medicine || 0;
  const meds = state.resources.medicine || 0;
  let heal = Math.floor(medStaff * 0.4 + (meds > 0 ? 1 : 0));
  if (heal > 0 && pop.injured > 0) {
    const n = Math.min(heal, pop.injured);
    pop.injured -= n;
    heal -= n;
    if (meds > 0) state.resources.medicine = Math.max(0, meds - 0.25);
  }
  if (heal > 0 && pop.sick > 0) {
    const n = Math.min(heal, pop.sick);
    pop.sick -= n;
  }
  redistributeLabor(state, balance);
}
