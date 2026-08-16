/**
 * ZZ-140…144 — Eras por indicadores · victoria multi-condición sin energía ·
 * crisis final variable · endless · pantallas.
 */
import { defenseValue, housingCapacity, pushLog } from './state.js';
import { resolveBaseAttack } from './combat.js';
import { startOutbreak } from './outbreaks.js';
import { createRng } from './rng.js';
import { loseFrontierZone } from './territory.js';

export function victoryConditions(state, content) {
  const v = content.balance?.victory || {};
  const pop = state.population?.total || 0;
  const controlled = (state.zones || []).filter((z) => z.state === 'controlled').length;
  const hasClinic = (state.base?.buildings || []).some(
    (b) => ['clinic', 'infirmary'].includes(b.type) && b.hp > 0
  );
  const hasHq2 = (state.base?.buildings || []).some(
    (b) => (b.type === 'hq_central_l2' || b.type === 'hq_central_l3') && b.hp > 0
  );
  const def = defenseValue(state, content.buildings, content.balance);
  const foodDays = pop > 0 ? (state.resources.food || 0) / pop : 0;
  const waterDays = pop > 0 ? (state.resources.water || 0) / pop : 0;
  const sustainable = foodDays >= (v.minFoodDays || 5) && waterDays >= (v.minWaterDays || 5);

  const checks = {
    pop: pop >= (v.minPop || 40),
    controlled: controlled >= (v.minControlled || 8),
    stability: (state.stability || 0) >= (v.minStability || 55),
    era: (state.era || 0) >= (v.minEra || 3),
    clinic: !v.needHospital || hasClinic,
    defense: def >= (v.needDefense || 40),
    sustainable,
    recoveryInfra: !v.needHqUpgrade || hasHq2,
    // Energía explícitamente FUERA
    noEnergyRequired: v.needEnergy !== true,
  };
  const ready = Object.entries(checks)
    .filter(([k]) => k !== 'noEnergyRequired')
    .every(([, ok]) => ok);
  return { ready, checks, pop, controlled, def, foodDays, waterDays, hasClinic, hasHq2 };
}

/** Crisis final variable por semilla (no castigo único). */
export function pickFinalCrisisVariant(state) {
  const rng = createRng(String(state.seed || 'zz') + ':final');
  const variants = [
    {
      id: 'horde_surge',
      name: 'Oleada regional',
      desc: 'Una horda masiva empuja desde varios frentes.',
      run: (s, c) => {
        resolveBaseAttack(s, c, 5, { wasProtected: false });
      },
    },
    {
      id: 'plague_and_push',
      name: 'Fiebre y asalto',
      desc: 'Un brote coincide con presión hostil.',
      run: (s, c) => {
        startOutbreak(s, c, 'fever_wave');
        resolveBaseAttack(s, c, 4, { wasProtected: false });
      },
    },
    {
      id: 'frontier_collapse',
      name: 'Frontera en llamas',
      desc: 'Zonas fronterizas caen a disputa mientras atacan el campamento.',
      run: (s, c) => {
        const rng = createRng(String(s.seed || 'zz') + ':frontier');
        loseFrontierZone(s, rng);
        loseFrontierZone(s, rng);
        resolveBaseAttack(s, c, 4, { wasProtected: false });
      },
    },
    {
      id: 'siege_scarcity',
      name: 'Asedio de escasez',
      desc: 'Rutas cortadas: comida y agua se hunden antes del golpe final.',
      run: (s, c) => {
        s.resources.food = Math.max(0, Math.floor((s.resources.food || 0) * 0.45));
        s.resources.water = Math.max(0, Math.floor((s.resources.water || 0) * 0.45));
        pushLog(s, 'Las rutas de abastecimiento se cortan. Reservas diezmadas.', 'warn');
        resolveBaseAttack(s, c, 4, { wasProtected: false });
      },
    },
  ];
  return rng.pick(variants);
}

export function updateEraByIndicators(state, content) {
  const eras = content.erasDoc?.eras || [];
  let era = 0;
  const pop = state.population?.total || 0;
  const controlled = (state.zones || []).filter((z) => z.state === 'controlled').length;
  const tech = (state.research?.unlocked || []).length;
  const hasRadio = (state.base?.buildings || []).some((b) => b.type === 'radio' && b.hp > 0);
  const hasClinic = (state.base?.buildings || []).some(
    (b) => ['clinic', 'infirmary', 'medkit'].includes(b.type) && b.hp > 0
  );
  const buildings = (state.base?.buildings || []).filter((b) => b.hp > 0).length;

  eras.forEach((e, idx) => {
    if (idx === 0) {
      era = Math.max(era, 0);
      return;
    }
    const u = e.unlock || {};
    // Indicadores 2.5 — el día es brújula suave, NO candado obligatorio
    const okPop = pop >= (u.minPop || 0);
    const okCtrl = controlled >= (u.minControlled || 0);
    const okTech = tech >= (u.minResearch || 0);
    const okInfra =
      (u.needRadio ? hasRadio : true) &&
      (u.needClinic ? hasClinic : true) &&
      buildings >= (u.minBuildings || 0);
    const softDay = !u.minDay || state.day >= u.minDay;
    // Necesita pop + al menos 2 de (ctrl, tech, infra); softDay solo ayuda si ya hay base
    const secondary = [okCtrl, okTech, okInfra, softDay].filter(Boolean).length;
    if (okPop && secondary >= 2) era = Math.max(era, idx);
  });

  if (era > state.era) {
    state.era = era;
    pushLog(state, `Nueva era: ${eras[era]?.name || era}.`, 'good');
  }
}

export function checkVictoryMulti(state, content) {
  if (state.flags.victory && state.flags.endless) return;
  if (state.flags.defeated) return;

  const { ready } = victoryConditions(state, content);
  if (!ready) return;

  if (!state.flags.finalCrisisDone && !state.flags.finalCrisisActive) {
    state.flags.finalCrisisActive = true;
    const variant = pickFinalCrisisVariant(state);
    state.flags.finalCrisisVariant = variant.id;
    pushLog(state, `CRISIS FINAL — ${variant.name}: ${variant.desc}`, 'warn');
    variant.run(state, content);
    state.flags.finalCrisisActive = false;
    state.flags.finalCrisisDone = true;

    if (!state.flags.defeated && (state.population?.total || 0) > 0) {
      state.flags.victory = true;
      state.flags.victoryDay = state.day;
      state.stats = state.stats || {};
      state.stats.maxPop = Math.max(state.stats.maxPop || 0, state.population?.total || 0);
      pushLog(state, 'ZONA ZERO ESTÁ ESTABILIZADA. Habéis conseguido un respiro regional.', 'good');
    }
  }
}

export function checkDefeatState(state) {
  if ((state.population?.total || 0) <= 0) {
    state.flags.defeated = true;
    state.flags.defeatReason = 'No queda población.';
    pushLog(state, 'DERROTA: el refugio queda vacío.', 'bad');
    return;
  }
  const hq = (state.base?.buildings || []).find(
    (b) => String(b.type).startsWith('hq_central') && b.hp > 0
  );
  if (!hq && (state.population?.total || 0) < 2) {
    state.flags.defeated = true;
    state.flags.defeatReason = 'El Refugio Central se ha perdido.';
    pushLog(state, 'DERROTA: sin centro ni esperanza.', 'bad');
  }
}

export function continueEndlessMode(state) {
  if (!state.flags.victory) return { ok: false, error: 'Sin victoria' };
  state.flags.endless = true;
  state.endlessDay = state.endlessDay || 0;
  pushLog(state, 'Continuáis en modo endless. La zona nunca duerme del todo.', 'story');
  return { ok: true };
}

export function endScreenStats(state) {
  const controlled = (state.zones || []).filter((z) => z.state === 'controlled').length;
  const crisisId = state.flags?.finalCrisisVariant || '';
  const crisisNames = {
    horde_surge: 'Oleada regional',
    plague_and_push: 'Fiebre y asalto',
    frontier_collapse: 'Frontera en llamas',
    siege_scarcity: 'Asedio de escasez',
  };
  return {
    day: state.day,
    maxPop: state.stats?.maxPop || state.population?.total || 0,
    pop: state.population?.total || 0,
    controlled,
    seed: state.seed || '—',
    era: state.era || 0,
    reason: state.flags?.defeatReason || '',
    crisis: crisisId,
    crisisLabel: crisisNames[crisisId] || crisisId.replace(/_/g, ' '),
    victoryDay: state.flags?.victoryDay || state.day,
  };
}
