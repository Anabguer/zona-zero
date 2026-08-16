/**
 * Brotes probabilísticos (GM §12) — sin calendario fijo.
 */
import { clamp } from './util.js';
import { pushLog, housingCapacity } from './state.js';
import { applyCasualties, changePopulation } from './population.js';
import { createRng } from './rng.js';

export function medicalBeds(state, buildingsContent) {
  let beds = 0;
  (state.base?.buildings || []).forEach((b) => {
    if (b.hp <= 0) return;
    const def = buildingsContent[b.type];
    if (def?.beds) beds += def.beds;
  });
  return beds;
}

export function medicalStaff(state) {
  return state.population?.labor?.medicine || 0;
}

export function hasQuarantineProtocol(state) {
  return (state.research?.unlocked || []).includes('quarantine_protocol');
}

function rngOf(state) {
  return createRng((state.rngState || 1) + state.day * 4177);
}

function archetypeList(balance) {
  const raw = balance?.outbreaks?.archetypes;
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((id) => ({ id, label: id, spread: 1, severity: 1, durationBias: 1 }));
  }
  return Object.entries(raw).map(([id, v]) => ({ id, ...v }));
}

function pickArchetype(state, balance, rng) {
  const list = archetypeList(balance);
  if (!list.length) return { id: 'fever_wave', label: 'Fiebre', spread: 1, severity: 1, durationBias: 1 };
  const scored = list.map((a) => {
    let w = 1;
    if (a.waterBias && (state.resources?.water || 0) < (state.population?.total || 1) * 2) w *= 1.6;
    if (a.injuryBias && (state.population?.injured || 0) > 0) w *= 1.7;
    if (a.coldBias && (state.weather === 'cold' || state.weather === 'blizzard' || state.season === 'winter')) w *= 1.5;
    return { a, w };
  });
  const total = scored.reduce((n, x) => n + x.w, 0);
  let roll = rng.float(0, total);
  for (const s of scored) {
    roll -= s.w;
    if (roll <= 0) return s.a;
  }
  return scored[0].a;
}

function riskSeed(state, content) {
  const bal = content.balance;
  const pop = state.population?.total || 0;
  if (pop < 4 || state.day < (bal.outbreaks?.minDay || 8)) return 0;
  if (state.outbreak?.active) return 0;
  if (state.day < (state.outbreakCooldownUntil || 0)) return 0;

  let r = bal.outbreaks?.baseSeedChance ?? 0.04;
  const cap = housingCapacity(state, content.buildings);
  if (pop > cap) r *= 1.35;
  if ((state.coldExposure || 0) >= 2) r *= 1.25;
  if (state.weather === 'cold' || state.weather === 'blizzard') r *= 1.15;
  if ((state.resources?.water || 0) < pop) r *= 1.3;
  if ((state.population?.injured || 0) > 0) r *= 1.2;
  if (state.season === 'winter') r *= 1.1;

  const beds = medicalBeds(state, content.buildings);
  const freeBeds = Math.max(0, beds - (state.population?.sick || 0) - (state.population?.injured || 0));
  if (freeBeds >= 2) r *= 0.75;
  if ((state.resources?.medicine || 0) >= 3) r *= 0.85;
  if (medicalStaff(state) >= 2) r *= 0.8;
  if (hasQuarantineProtocol(state)) r *= 0.55;
  if ((state.stability || 0) >= 60) r *= 0.9;
  if (state.day < (state.director?.protectionUntil || 0)) r *= 0.7;
  return clamp(r, 0.005, 0.35);
}

function phaseDuration(balance, phase, arch, quarantine) {
  const range = balance.outbreaks?.phaseDays?.[phase] || [2, 3];
  let d = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
  d = Math.max(1, Math.round(d * (arch.durationBias || 1)));
  if (quarantine) d = Math.max(1, Math.round(d * 0.7));
  return d;
}

export function startOutbreak(state, content, forcedType = null) {
  const rng = rngOf(state);
  const arch = forcedType
    ? archetypeList(content.balance).find((a) => a.id === forcedType) || pickArchetype(state, content.balance, rng)
    : pickArchetype(state, content.balance, rng);
  const q = hasQuarantineProtocol(state);
  state.outbreak = {
    active: true,
    type: arch.id,
    label: arch.label || arch.id,
    phase: 'seed',
    phaseDay: 0,
    phaseLen: phaseDuration(content.balance, 'seed', arch, q),
    days: 0,
    severity: 1,
    newCasesToday: 0,
    spread: arch.spread || 1,
  };
  const seed = rng.int(1, 3);
  applyCasualties(state, content.balance, { sick: seed });
  pushLog(state, `Alerta sanitaria: ${state.outbreak.label} (germen, ${seed} enfermos).`, 'warn');
  return state.outbreak;
}

function advancePhase(state, content, arch) {
  const phases = content.balance.outbreaks?.phases || ['seed', 'spread', 'peak', 'resolve', 'recovery'];
  const ob = state.outbreak;
  const i = phases.indexOf(ob.phase);
  if (i < 0 || i >= phases.length - 1) {
    endOutbreak(state, content, true);
    return;
  }
  const next = phases[i + 1];
  const q = hasQuarantineProtocol(state);
  // Contención anticipada en peak si sanidad fuerte
  if (ob.phase === 'peak' || ob.phase === 'spread') {
    const beds = medicalBeds(state, content.buildings);
    const sick = state.population?.sick || 0;
    const staff = medicalStaff(state);
    const meds = state.resources?.medicine || 0;
    const containScore = beds + staff * 1.5 + Math.min(4, meds) + (q ? 3 : 0);
    if (containScore >= sick + 4 && next === 'peak') {
      ob.phase = 'resolve';
      ob.phaseDay = 0;
      ob.phaseLen = phaseDuration(content.balance, 'resolve', arch, q);
      pushLog(state, 'El brote parece contenerse gracias a la sanidad.', 'good');
      return;
    }
  }
  ob.phase = next;
  ob.phaseDay = 0;
  ob.phaseLen = phaseDuration(content.balance, next, arch, q);
  if (next === 'peak') {
    ob.severity = Math.min(3, (ob.severity || 1) + 1);
    state.stability = Math.max(0, (state.stability || 0) - 3);
    pushLog(state, `Pico de ${ob.label}. La colonia sufre.`, 'bad');
  } else if (next === 'recovery') {
    pushLog(state, `Recuperación tras ${ob.label}.`, 'good');
  }
}

function endOutbreak(state, content, contained) {
  const cd = content.balance.outbreaks?.cooldownDays || 12;
  state.outbreakCooldownUntil = state.day + cd;
  const label = state.outbreak?.label || 'brote';
  state.outbreak = { active: false, type: null, phase: null, days: 0, severity: 0 };
  pushLog(state, contained ? `Brote de ${label} contenido.` : `El brote de ${label} termina.`, contained ? 'good' : 'info');
}

export function healthSemaphore(state) {
  const ob = state.outbreak;
  if (ob?.active) {
    if (ob.phase === 'peak' || (state.population?.sick || 0) > (state.population?.total || 1) * 0.35) return 'red';
    if (ob.phase === 'spread' || ob.phase === 'resolve') return 'amber';
    return 'amber';
  }
  const sick = state.population?.sick || 0;
  const injured = state.population?.injured || 0;
  if (sick + injured <= 0) return 'green';
  if (sick + injured >= 3) return 'amber';
  return 'green';
}

/** Tick diario de brotes. Prod↓ solo vía sick + reasignación staff (nunca −prod global). */
export function tickOutbreak(state, content) {
  const bal = content.balance;
  if (!bal.outbreaks?.enabled) return null;
  const rng = rngOf(state);

  if (!state.outbreak?.active) {
    const p = riskSeed(state, content);
    if (rng.chance(p)) startOutbreak(state, content);
    return state.outbreak;
  }

  const ob = state.outbreak;
  const arch =
    archetypeList(bal).find((a) => a.id === ob.type) ||
    { id: ob.type, spread: ob.spread || 1, severity: 1, durationBias: 1 };
  ob.days = (ob.days || 0) + 1;
  ob.phaseDay = (ob.phaseDay || 0) + 1;
  ob.newCasesToday = 0;

  const q = hasQuarantineProtocol(state);
  const beds = medicalBeds(state, content.buildings);
  const staff = medicalStaff(state);
  const meds = state.resources?.medicine || 0;
  const sick = state.population?.sick || 0;
  const pop = state.population?.total || 1;

  let spreadMult = (arch.spread || 1) * (q ? 0.65 : 1);
  if (staff >= 2) spreadMult *= 0.85;
  if (beds >= sick) spreadMult *= 0.8;
  if (meds >= 2) spreadMult *= 0.9;

  if (ob.phase === 'seed' || ob.phase === 'spread' || ob.phase === 'peak') {
    const base =
      ob.phase === 'seed' ? rng.int(0, 1) : ob.phase === 'spread' ? rng.int(0, 3) : rng.int(1, 4);
    const cases = Math.max(0, Math.round(base * spreadMult * (ob.severity || 1)));
    if (cases > 0) {
      const room = Math.max(0, pop - sick - (state.population?.injured || 0));
      const add = Math.min(cases, room);
      if (add > 0) {
        applyCasualties(state, bal, { sick: add });
        ob.newCasesToday = add;
      }
    }
  }

  if (ob.phase === 'peak' || ob.phase === 'resolve') {
    const pressure = (sick || 0) - beds - staff;
    if (pressure > 2 && rng.chance(0.18 + (ob.severity || 1) * 0.05)) {
      changePopulation(state, -1, bal, 'death');
      pushLog(state, 'Alguien no supera el brote.', 'bad');
      state.director.recentLosses = (state.director.recentLosses || 0) + 1;
    }
  }

  if (ob.phase === 'resolve' || ob.phase === 'recovery') {
    // curación extra ligera en contención (además de healPopulationTick)
    if ((state.population?.sick || 0) > 0 && (staff > 0 || beds > 0) && rng.chance(0.45)) {
      state.population.sick = Math.max(0, state.population.sick - 1);
    }
  }

  if (ob.phaseDay >= (ob.phaseLen || 2)) {
    if (ob.phase === 'recovery') endOutbreak(state, content, true);
    else advancePhase(state, content, arch);
  }

  return state.outbreak;
}
