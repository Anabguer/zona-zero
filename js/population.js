/**

 * Población colectiva Zona Zero 1.2 — sin gestión individual.

 * La asignación fina vive en edificios (colony.js); aquí solo cupos y clamps.

 */

import { clamp } from './util.js';
import { rngOf } from './sim.js';



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



/**

 * Ajusta idle para que la suma encaje con la fuerza laboral.

 * No reparte automáticamente a comida/agua (eso lo hacen los edificios).

 */

export function redistributeLabor(state, balance, { preserveManual = true } = {}) {

  const pop = state.population;

  if (!pop) return;

  if (!pop.labor) pop.labor = emptyLabor();

  const wf = workforce(pop);

  const labor = pop.labor;

  let used =

    (labor.food || 0) +

    (labor.water || 0) +

    (labor.build || 0) +

    (labor.produce || 0) +

    (labor.defense || 0) +

    (labor.medicine || 0);



  if (used > wf) {

    let over = used - wf;

    const cutOrder = ['produce', 'medicine', 'defense', 'build', 'water', 'food'];

    for (const k of cutOrder) {

      if (over <= 0) break;

      const take = Math.min(labor[k] || 0, over);

      labor[k] = (labor[k] || 0) - take;

      over -= take;

      if (preserveManual && pop.manual?.[k] != null) pop.manual[k] = labor[k];

    }

    used = wf;

  }

  labor.idle = Math.max(0, wf - used);

  return labor;

}



export function adjustLabor(state, key, delta, balance) {

  // Compat: el panel usa adjustCategoryLabor (colony). Aquí solo clamp genérico.

  const pop = state.population;

  if (!pop?.labor || !LABOR_KEYS.includes(key) || key === 'idle') return { ok: false, error: 'Inválido' };

  if (!pop.manual) pop.manual = {};

  const wf = workforce(pop);

  const cur = pop.labor[key] || 0;

  const want = clamp(cur + delta, 0, wf);

  pop.manual[key] = want;

  const diff = want - cur;

  if (diff > 0) {

    const take = Math.min(diff, pop.labor.idle || 0);

    pop.labor[key] = cur + take;

    pop.labor.idle = Math.max(0, (pop.labor.idle || 0) - take);

    pop.manual[key] = pop.labor[key];

  } else if (diff < 0) {

    pop.labor[key] = want;

    pop.labor.idle = (pop.labor.idle || 0) - diff;

  }

  redistributeLabor(state, balance, { preserveManual: true });

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



export function healPopulationTick(state, balance, content = null) {
  const pop = state.population;
  if (!pop) return { healed: 0, beds: 0 };
  const buildings = content?.buildings || {};
  let beds = 0;
  (state.base?.buildings || []).forEach((b) => {
    if (b.hp <= 0) return;
    beds += buildings[b.type]?.beds || 0;
  });
  const cfg = balance?.health || {};
  const medStaff = pop.labor?.medicine || 0;
  const meds = state.resources.medicine || 0;
  const techBonus = (state.research?.unlocked || []).includes('field_medicine')
    ? 0.15
    : 0;
  const occupied = (pop.sick || 0) + (pop.injured || 0);
  const freeBeds = Math.max(0, beds - occupied);

  let heal =
    beds > 0
      ? beds * (cfg.healPerBed ?? 0.55) +
        medStaff * (cfg.healPerMedStaff ?? 0.45) +
        (meds > 0 ? cfg.healPerMedicine ?? 0.35 : 0) +
        techBonus * 2
      : cfg.minHealWithoutBeds ?? 0.35;

  heal = Math.floor(heal + (freeBeds > 0 ? 0.25 : 0));

  // Sin camas: riesgo de muerte en heridos
  if (beds <= 0 && (pop.injured || 0) > 0) {
    const chance = cfg.deathChanceNoBedsPerInjured ?? 0.08;
    if (rngOf(state).chance(chance * Math.min(3, pop.injured))) {
      changePopulation(state, -1, balance, 'death');
      if (pop.injured > 0) pop.injured -= 1;
      // B2 revisión: ninguna muerte puede ser silenciosa. Sin camas médicas,
      // un herido puede no superar la noche — el jugador debe saberlo y poder
      // mitigarlo (botiquín/enfermería = objetivo need_medicine).
      state.log = state.log || [];
      state.log.unshift({
        day: state.day,
        text: 'No pudimos salvarle: herido sin camas médicas. Necesitamos sanidad.',
        kind: 'bad',
        diary: true,
      });
      if (state.log.length > 120) state.log.length = 120;
    }
  }

  let healed = 0;
  if (heal > 0 && pop.injured > 0) {
    const n = Math.min(heal, pop.injured);
    pop.injured -= n;
    heal -= n;
    healed += n;
    if (meds > 0) state.resources.medicine = Math.max(0, meds - 0.25 * n);
  }
  if (heal > 0 && pop.sick > 0) {
    const n = Math.min(heal, pop.sick);
    pop.sick -= n;
    healed += n;
  }
  redistributeLabor(state, balance);
  return { healed, beds };
}



