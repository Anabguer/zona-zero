/**
 * Simulación diaria, expediciones, construcción.
 */
import { chance, clamp, pick, rollRange, uid } from './util.js';
import {
  livingSurvivors,
  pushLog,
  defenseValue,
  housingCapacity,
} from './state.js';
import { runDirector } from './director.js';

export const RES_LABEL = {
  food: 'comida',
  water: 'agua',
  wood: 'madera',
  metal: 'metal',
  medicine: 'medicinas',
  fuel: 'combustible',
  ammo: 'munición',
};

export function canAfford(state, cost) {
  if (!cost) return true;
  return Object.entries(cost).every(([k, v]) => (state.resources[k] || 0) >= v);
}

export function payCost(state, cost) {
  Object.entries(cost || {}).forEach(([k, v]) => {
    state.resources[k] = (state.resources[k] || 0) - v;
  });
}

export function placeBuilding(state, content, type, x, y) {
  const def = content.buildings[type];
  if (!def) return { ok: false, error: 'Tipo desconocido' };
  if (state.flags.defeated) return { ok: false, error: 'Partida terminada' };
  if (!canAfford(state, def.cost)) return { ok: false, error: 'Recursos insuficientes' };
  const count = state.base.buildings.filter((b) => b.type === type).length;
  if (def.max != null && count >= def.max) return { ok: false, error: 'Límite de este edificio' };
  if (x < 0 || y < 0 || x >= state.base.w || y >= state.base.h) {
    return { ok: false, error: 'Fuera de la base' };
  }
  if (state.base.buildings.some((b) => b.x === x && b.y === y)) {
    return { ok: false, error: 'Celda ocupada' };
  }
  const builders = livingSurvivors(state).filter((s) => s.busyUntilDay <= state.day);
  if (!builders.length) return { ok: false, error: 'Nadie libre para construir' };
  payCost(state, def.cost);
  state.base.buildings.push({ id: uid('b'), type, x, y });
  state.stats.buildingsBuilt += 1;
  const best = builders.sort((a, b) => b.skills.build - a.skills.build)[0];
  best.skills.build = clamp(best.skills.build + 0.15, 1, 10);
  pushLog(state, `Construís ${def.name} (${best.name}).`, 'good');
  return { ok: true };
}

export function startExpedition(state, content, zoneId, survivorIds) {
  if (state.flags.defeated) return { ok: false, error: 'Partida terminada' };
  if (state.expedition) return { ok: false, error: 'Ya hay una expedición en curso' };
  const zone = state.zones.find((z) => z.id === zoneId);
  if (!zone) return { ok: false, error: 'Zona inválida' };
  if (zone.state === 'unknown') return { ok: false, error: 'Zona aún no descubierta' };
  if (zone.id === 'camp') return { ok: false, error: 'El campamento ya es vuestro' };

  const fuelCost = content.balance.expeditionFuelCost ?? 1;
  if ((state.resources.fuel || 0) < fuelCost) {
    return { ok: false, error: `Hace falta ${fuelCost} combustible para la expedición` };
  }

  const max = content.balance.expeditionMaxSurvivors || 3;
  const ids = [...new Set(survivorIds)].slice(0, max);
  const team = livingSurvivors(state).filter(
    (s) => ids.includes(s.id) && s.busyUntilDay <= state.day && s.status !== 'dead'
  );
  if (team.length < 1) return { ok: false, error: 'Selecciona supervivientes libres' };

  state.resources.fuel -= fuelCost;

  const scout = Math.max(...team.map((s) => s.skills.scout));
  const duration = Math.max(
    1,
    (content.balance.expeditionBaseDurationDays || 1) + (zone.risk > 0.45 ? 1 : 0) - (scout >= 6 ? 1 : 0)
  );
  const returnDay = state.day + duration;
  team.forEach((s) => {
    s.busyUntilDay = returnDay;
  });
  state.expedition = {
    zoneId,
    survivorIds: team.map((s) => s.id),
    startDay: state.day,
    returnDay,
  };
  state.stats.expeditions += 1;
  pushLog(
    state,
    `Expedición a ${zone.name}: ${team.map((s) => s.name).join(', ')} (vuelven día ${returnDay}, −${fuelCost} combustible).`,
    'info'
  );
  return { ok: true };
}

function resolveExpedition(state, content) {
  const ex = state.expedition;
  if (!ex || state.day < ex.returnDay) return;
  const zone = state.zones.find((z) => z.id === ex.zoneId);
  const team = state.survivors.filter((s) => ex.survivorIds.includes(s.id) && s.status !== 'dead');
  state.expedition = null;
  if (!zone || !team.length) {
    pushLog(state, 'La expedición no regresa…', 'bad');
    return;
  }

  const fight = team.reduce((a, s) => a + s.skills.fight, 0) / team.length;
  const scout = team.reduce((a, s) => a + s.skills.scout, 0) / team.length;
  const gather = team.reduce((a, s) => a + s.skills.gather, 0) / team.length;
  const infected = rollRange(zone.infected || [0, 2]);
  const risk = clamp(zone.risk - scout * 0.03 - fight * 0.025 + infected * 0.04, 0.05, 0.85);

  (zone.neighbors || []).forEach((nid) => {
    const n = state.zones.find((z) => z.id === nid);
    if (n && n.state === 'unknown') {
      n.state = 'discovered';
      pushLog(state, `Descubrís la zona: ${n.name}.`, 'info');
    }
  });
  if (zone.state === 'unknown') zone.state = 'discovered';

  const lootGain = {};
  Object.entries(zone.loot || {}).forEach(([k, range]) => {
    let n = rollRange(range);
    n = Math.max(0, n + Math.floor(gather / 4) - (chance(risk) ? 1 : 0));
    if (n > 0) {
      lootGain[k] = n;
      state.resources[k] = (state.resources[k] || 0) + n;
    }
  });

  let deaths = 0;
  team.forEach((s) => {
    if (chance(risk * (0.7 + infected * 0.08))) {
      const dmg = randDmg(12, 35) - Math.floor(s.skills.fight * 2);
      s.hp -= Math.max(5, dmg);
      if (s.hp <= 0) {
        s.hp = 0;
        s.status = 'dead';
        deaths += 1;
        state.stats.deaths += 1;
        state.director.recentLosses += 1;
      } else if (s.hp < 55) {
        s.status = 'wounded';
      }
    } else {
      s.skills.scout = clamp(s.skills.scout + 0.2, 1, 10);
      s.skills.gather = clamp(s.skills.gather + 0.15, 1, 10);
    }
    s.busyUntilDay = state.day;
  });

  const lootTxt = Object.entries(lootGain)
    .map(([k, v]) => `${v} ${RES_LABEL[k] || k}`)
    .join(', ');
  if (deaths) {
    pushLog(
      state,
      `Regreso de ${zone.name}: ${lootTxt || 'casi nada'}. Bajas: ${deaths}. Infectados: ${infected}.`,
      'bad'
    );
  } else {
    pushLog(
      state,
      `Regreso de ${zone.name}: ${lootTxt || 'poco botín'}. Infectados avistados: ${infected}.`,
      lootTxt ? 'good' : 'warn'
    );
  }

  const canControl =
    zone.state !== 'controlled' &&
    deaths === 0 &&
    fight + scout >= 7 &&
    chance(0.35 + fight * 0.04 - zone.risk);
  if (canControl) {
    zone.state = 'controlled';
    state.stats.zonesControlled = state.zones.filter((z) => z.state === 'controlled').length;
    state.director.threat = clamp(state.director.threat + 2, 0, 100);
    pushLog(state, `${zone.name} queda bajo vuestro control.`, 'good');
  }
}

function randDmg(a, b) {
  return a + Math.floor(Math.random() * (b - a + 1));
}

function applyProduction(state, balance) {
  const counts = {};
  state.base.buildings.forEach((b) => {
    counts[b.type] = (counts[b.type] || 0) + 1;
  });
  const p = balance.production || {};
  if (counts.farm) state.resources.food += counts.farm * (p.farm_food || 3);
  if (counts.well) state.resources.water += counts.well * (p.well_water || 3);
  if (counts.workshop) state.resources.metal += counts.workshop * (p.workshop_metal || 2);
  if (counts.sawmill) state.resources.wood += counts.sawmill * (p.sawmill_wood || 3);
  if (counts.clinic) state.resources.medicine += counts.clinic * (p.clinic_medicine || 1);
}

function fuelNeed(state, balance) {
  const alive = livingSurvivors(state).length;
  const base = balance.fuelPerDayBase ?? 1;
  const per = balance.fuelPerSurvivorPerDay ?? 0.15;
  const gens = state.base.buildings.filter((b) => b.type === 'generator').length;
  const saved = gens * (balance.production?.generator_fuel_saved || 1);
  return Math.max(0, Math.ceil(base + alive * per - saved));
}

function consumeNeed(state, key, need, damageKey, label, balance) {
  const alive = livingSurvivors(state);
  if (need <= 0) return;
  if ((state.resources[key] || 0) >= need) {
    state.resources[key] -= need;
    return;
  }
  const missing = need - (state.resources[key] || 0);
  state.resources[key] = 0;
  pushLog(state, `${label}: faltan ${missing}.`, 'bad');
  const dmg = balance[damageKey] || 20;
  alive.forEach((s) => {
    if (s.status === 'dead') return;
    s.hp -= dmg;
    if (s.hp <= 0) {
      s.hp = 0;
      s.status = 'dead';
      state.stats.deaths += 1;
      state.director.recentLosses += 1;
      pushLog(state, `${s.name} muere por falta de ${key === 'food' ? 'comida' : 'agua'}.`, 'bad');
    } else {
      s.status = 'wounded';
    }
  });
}

function healTick(state) {
  const hasClinic = state.base.buildings.some((b) => b.type === 'clinic');
  livingSurvivors(state).forEach((s) => {
    if (s.status === 'wounded') {
      let heal = hasClinic ? 12 : 5;
      if (state.resources.medicine > 0 && s.hp < 70) {
        state.resources.medicine -= 1;
        heal += 18;
      }
      s.hp = Math.min(s.maxHp, s.hp + heal);
      if (s.hp >= 80) s.status = 'ok';
    } else if (s.hp < s.maxHp) {
      s.hp = Math.min(s.maxHp, s.hp + (hasClinic ? 4 : 2));
    }
  });
}

function checkDefeat(state, balance) {
  const alive = livingSurvivors(state);
  if (!alive.length) {
    state.flags.defeated = true;
    state.flags.defeatReason = 'No quedan supervivientes.';
    pushLog(state, 'DERROTA: el refugio queda vacío.', 'bad');
    return;
  }
  const cap = housingCapacity(state, null, balance);
  const grace = balance.housingOverflowGrace ?? 2;
  if (alive.length > cap + grace) {
    const s = pick(alive);
    s.hp -= 8;
    if (s.hp <= 0) {
      s.status = 'dead';
      state.stats.deaths += 1;
      pushLog(state, `${s.name} no soporta el hacinamiento.`, 'bad');
    } else {
      pushLog(state, 'Hacinamiento: necesitáis más refugios.', 'warn');
    }
  }
}

export function advanceDay(state, content) {
  if (state.flags.defeated) return { ok: false, error: 'Partida terminada' };
  const balance = content.balance;

  resolveExpedition(state, content);

  const alive = livingSurvivors(state);
  const foodNeed = alive.length * (balance.foodPerSurvivorPerDay || 1);
  const waterNeed = alive.length * (balance.waterPerSurvivorPerDay || 1);
  consumeNeed(state, 'food', foodNeed, 'starvationDamage', 'Hambre', balance);
  consumeNeed(state, 'water', waterNeed, 'dehydrationDamage', 'Sed', balance);

  const fNeed = fuelNeed(state, balance);
  if (fNeed > 0) {
    if ((state.resources.fuel || 0) >= fNeed) {
      state.resources.fuel -= fNeed;
    } else {
      const missing = fNeed - (state.resources.fuel || 0);
      state.resources.fuel = 0;
      const extra = balance.noFuelExtraFoodLoss ?? 1;
      state.resources.food = Math.max(0, state.resources.food - extra * Math.max(1, missing));
      pushLog(
        state,
        `Sin combustible suficiente (−${missing}). Se pierde comida al improvisar (−${extra * Math.max(1, missing)}).`,
        'warn'
      );
    }
  }

  applyProduction(state, balance);
  healTick(state);

  state.day += 1;
  pushLog(state, `Amanece el día ${state.day}.`, 'story');

  runDirector(state, content);
  checkDefeat(state, balance);

  livingSurvivors(state).forEach((s) => {
    if (s.busyUntilDay < state.day) s.busyUntilDay = 0;
  });

  return { ok: true };
}
