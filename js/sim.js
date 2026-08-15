/**
 * Simulación diaria Zona Zero v1
 */
import { chance, clamp, pick, rollRange, uid } from './util.js';
import { createRng } from './rng.js';
import {
  livingSurvivors,
  allLiving,
  pushLog,
  defenseValue,
  housingCapacity,
  maxSurvivorsCap,
  gainSkill,
  makeSurvivor,
} from './state.js';
import { runDirector, applyEventEffects } from './director.js';

export const RES_LABEL = {
  food: 'comida',
  water: 'agua',
  wood: 'madera',
  metal: 'metal',
  medicine: 'medicinas',
  fuel: 'combustible',
  ammo: 'munición',
  parts: 'piezas',
  tools: 'herramientas',
};

function rngOf(state) {
  return createRng((state.rngState || 1) + state.day * 9973);
}

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
  if ((def.minEra || 0) > state.era) return { ok: false, error: 'Aún no desbloqueado (era)' };
  if (def.requires?.length) {
    const missing = def.requires.filter((t) => !(state.research.unlocked || []).includes(t));
    if (missing.length) return { ok: false, error: 'Falta investigación' };
  }
  if (def.requiresBuilding) {
    if (!state.base.buildings.some((b) => b.type === def.requiresBuilding && b.hp > 0)) {
      return { ok: false, error: 'Requiere otro edificio' };
    }
  }
  if (!canAfford(state, def.cost)) return { ok: false, error: 'Recursos insuficientes' };
  const count = state.base.buildings.filter((b) => b.type === type && b.hp > 0).length;
  if (def.max != null && count >= def.max) return { ok: false, error: 'Límite de este edificio' };
  if (x < 0 || y < 0 || x >= state.base.w || y >= state.base.h) return { ok: false, error: 'Fuera de la base' };
  if (state.base.buildings.some((b) => b.x === x && b.y === y && b.hp > 0)) {
    return { ok: false, error: 'Celda ocupada' };
  }
  const builders = livingSurvivors(state).filter((s) => s.busyUntilDay <= state.day);
  if (!builders.length) return { ok: false, error: 'Nadie libre para construir' };
  payCost(state, def.cost);
  if (def.upgradeFrom) {
    const old = state.base.buildings.find((b) => b.type === def.upgradeFrom && b.hp > 0);
    if (old) {
      old.type = type;
      pushLog(state, `Mejoráis a ${def.name}.`, 'good');
      state.stats.buildingsBuilt += 1;
      gainSkill(state, builders[0], 'build', 2);
      return { ok: true, upgraded: true };
    }
  }
  state.base.buildings.push({ id: uid('b'), type, x, y, hp: 100, workers: [] });
  state.stats.buildingsBuilt += 1;
  const best = builders.sort((a, b) => b.skills.build - a.skills.build)[0];
  gainSkill(state, best, 'build', 2);
  pushLog(state, `Construís ${def.name} (${best.name}).`, 'good');
  return { ok: true };
}

export function assignWorker(state, buildingId, survivorId) {
  const b = state.base.buildings.find((x) => x.id === buildingId);
  const s = state.survivors.find((x) => x.id === survivorId);
  if (!b || !s || s.status === 'dead') return { ok: false, error: 'Inválido' };
  const def = null;
  void def;
  if (!b.workers) b.workers = [];
  if (s.jobBuildingId && s.jobBuildingId !== buildingId) {
    const prev = state.base.buildings.find((x) => x.id === s.jobBuildingId);
    if (prev?.workers) prev.workers = prev.workers.filter((id) => id !== s.id);
  }
  if (b.workers.includes(s.id)) return { ok: true };
  b.workers.push(s.id);
  s.jobBuildingId = b.id;
  return { ok: true };
}

export function unassignWorker(state, survivorId) {
  const s = state.survivors.find((x) => x.id === survivorId);
  if (!s) return;
  if (s.jobBuildingId) {
    const b = state.base.buildings.find((x) => x.id === s.jobBuildingId);
    if (b?.workers) b.workers = b.workers.filter((id) => id !== s.id);
  }
  s.jobBuildingId = null;
}

export function autoAssignWorkers(state, content) {
  livingSurvivors(state).forEach((s) => unassignWorker(state, s.id));
  const jobs = [];
  state.base.buildings.forEach((b) => {
    if (b.hp <= 0) return;
    const def = content.buildings[b.type];
    if (!def?.jobs || !def.produces) return;
    for (let i = 0; i < def.jobs; i++) jobs.push({ b, def, skill: 'produce' });
  });
  const free = livingSurvivors(state)
    .filter((s) => s.busyUntilDay <= state.day)
    .sort((a, b) => b.skills.produce - a.skills.produce);
  jobs.forEach((j) => {
    const s = free.shift();
    if (!s) return;
    if (!j.b.workers) j.b.workers = [];
    j.b.workers.push(s.id);
    s.jobBuildingId = j.b.id;
  });
  return { ok: true, assigned: state.base.buildings.reduce((n, b) => n + (b.workers?.length || 0), 0) };
}

function riskCategory(score) {
  if (score < 0.25) return 'Bajo';
  if (score < 0.45) return 'Moderado';
  if (score < 0.7) return 'Alto';
  return 'Extremo';
}

export function expeditionPreview(state, content, zoneId, survivorIds) {
  const zone = state.zones.find((z) => z.id === zoneId);
  if (!zone) return null;
  const team = livingSurvivors(state).filter((s) => survivorIds.includes(s.id));
  const scout = Math.max(0, ...team.map((s) => s.skills.scout));
  const fight = Math.max(0, ...team.map((s) => s.skills.fight));
  let risk = zone.risk - scout * 0.04 - fight * 0.03 - team.length * 0.03;
  if (state.equipment.weapon === 'basic') risk -= 0.05;
  if (state.equipment.weapon === 'improved') risk -= 0.1;
  if (state.equipment.armor !== 'none') risk -= 0.04;
  const veh = content.vehiclesDoc?.vehicles?.find((v) => v.id === state.equipment.vehicleId);
  if (veh) risk -= (veh.protection || 0) * 0.02;
  if (state.weather === 'storm' || state.weather === 'fog') risk += 0.08;
  risk = clamp(risk, 0.05, 0.95);
  let days = content.balance.expeditionBaseDurationDays || 1;
  if (zone.state === 'unknown') days += 1;
  if (veh?.speedBonus) days = Math.max(1, Math.round(days * (1 - veh.speedBonus)));
  return { risk, category: riskCategory(risk), days, fuel: content.balance.expeditionFuelCost || 1 };
}

export function startExpedition(state, content, zoneId, survivorIds) {
  if (state.flags.defeated) return { ok: false, error: 'Partida terminada' };
  if (state.expedition) return { ok: false, error: 'Ya hay una expedición en curso' };
  const zone = state.zones.find((z) => z.id === zoneId);
  if (!zone) return { ok: false, error: 'Zona inválida' };
  if (zone.state === 'unknown') return { ok: false, error: 'Zona aún no descubierta' };
  if (zone.id === 'camp' || zone.type === 'camp') return { ok: false, error: 'El campamento ya es vuestro' };

  const preview = expeditionPreview(state, content, zoneId, survivorIds);
  const fuelCost = preview.fuel + (state.equipment.vehicleId && state.equipment.vehicleId !== 'bike' ? 1 : 0);
  if ((state.resources.fuel || 0) < fuelCost && fuelCost > 0) {
    const veh = content.vehiclesDoc?.vehicles?.find((v) => v.id === state.equipment.vehicleId);
    if (veh && veh.fuelPerTrip > 0) return { ok: false, error: 'Sin combustible' };
    if (fuelCost > 0 && (state.resources.fuel || 0) < (content.balance.expeditionFuelCost || 1)) {
      // allow foot expeditions with 0 fuel if no vehicle
      if (state.equipment.vehicleId && state.equipment.vehicleId !== 'bike') {
        return { ok: false, error: 'Sin combustible para el vehículo' };
      }
    }
  }

  const max = (content.balance.expeditionMaxSurvivors || 3) + ((state.research.unlocked || []).includes('log_bigger_teams') ? 1 : 0);
  const ids = [...new Set(survivorIds)].slice(0, max);
  const team = livingSurvivors(state).filter(
    (s) => ids.includes(s.id) && s.busyUntilDay <= state.day && s.status !== 'dead'
  );
  if (team.length < 1) return { ok: false, error: 'Selecciona supervivientes libres' };

  const veh = content.vehiclesDoc?.vehicles?.find((v) => v.id === state.equipment.vehicleId);
  const payFuel = veh ? veh.fuelPerTrip || 0 : content.balance.expeditionFuelCost || 0;
  if (payFuel > 0) {
    if ((state.resources.fuel || 0) < payFuel) return { ok: false, error: `Hace falta ${payFuel} combustible` };
    state.resources.fuel -= payFuel;
  }

  team.forEach((s) => {
    s.busyUntilDay = state.day + preview.days;
    unassignWorker(state, s.id);
  });

  state.expedition = {
    zoneId,
    survivorIds: team.map((s) => s.id),
    returnDay: state.day + preview.days,
    risk: preview.risk,
    vehicleId: state.equipment.vehicleId,
    weapon: state.equipment.weapon,
    armor: state.equipment.armor,
  };
  state.stats.expeditions += 1;
  pushLog(state, `Expedición a ${zone.name} (riesgo ${preview.category}).`, 'info');
  return { ok: true, preview };
}

function rollLoot(rng, lootSpec, cargoBonus = 0) {
  const out = {};
  Object.entries(lootSpec || {}).forEach(([k, v]) => {
    let amount = 0;
    if (Array.isArray(v)) amount = rng.int(v[0], v[1]);
    else if (typeof v === 'number') amount = Math.max(0, Math.round(v + rng.float(-0.5, 1.5)));
    amount = Math.round(amount * (1 + cargoBonus));
    if (amount > 0) out[k] = amount;
  });
  return out;
}

function resolveCombat(rng, teamPower, enemyPower) {
  const ratio = teamPower / Math.max(1, enemyPower);
  const roll = rng.float(0.75, 1.25) * ratio;
  if (roll >= 1.35) return 'clean';
  if (roll >= 1.0) return 'wounded';
  if (roll >= 0.7) return 'retreat';
  return 'fail';
}

export function resolveExpedition(state, content) {
  if (!state.expedition || state.day < state.expedition.returnDay) return;
  const rng = rngOf(state);
  const ex = state.expedition;
  const zone = state.zones.find((z) => z.id === ex.zoneId);
  const team = state.survivors.filter((s) => ex.survivorIds.includes(s.id) && s.status !== 'dead');
  state.expedition = null;
  if (!zone || !team.length) {
    pushLog(state, 'La expedición no regresa.', 'bad');
    return;
  }

  const scout = team.reduce((n, s) => n + s.skills.scout, 0);
  const fight = team.reduce((n, s) => n + s.skills.fight, 0);
  const gather = team.reduce((n, s) => n + s.skills.gather, 0);
  let teamPower = fight * 4 + scout * 2 + team.length * 3 + (state.resources.ammo || 0) * 0.5;
  if (ex.weapon === 'basic') teamPower += 6;
  if (ex.weapon === 'improved') teamPower += 12;
  if (ex.armor === 'light') teamPower += 3;
  if (ex.armor === 'heavy') teamPower += 7;
  const enemyPower = 4 + zone.infectedLeft * 3 + zone.risk * 20;
  const outcome = resolveCombat(rng, teamPower, enemyPower);

  team.forEach((s) => {
    gainSkill(state, s, 'scout', 1);
    gainSkill(state, s, 'gather', 1);
    if (outcome !== 'clean') gainSkill(state, s, 'fight', 1);
    s.busyUntilDay = 0;
  });

  if (outcome === 'fail') {
    const victim = rng.pick(team);
    victim.hp = 0;
    victim.status = 'dead';
    state.stats.deaths += 1;
    state.director.recentLosses += 1;
    state.stability -= 8;
    pushLog(state, `Fracaso en ${zone.name}. ${victim.name} no vuelve.`, 'bad');
    return;
  }

  if (outcome === 'retreat') {
    team.forEach((s) => {
      s.hp -= rng.int(10, 25);
      if (s.hp <= 40) s.status = 'wounded';
    });
    pushLog(state, `Retirada de ${zone.name}. Heridos, poco botín.`, 'warn');
    const scraps = rollLoot(rng, { wood: [0, 1], metal: [0, 1] });
    Object.entries(scraps).forEach(([k, v]) => {
      state.resources[k] = (state.resources[k] || 0) + v;
    });
    return;
  }

  // clean or wounded success
  if (outcome === 'wounded') {
    const hurt = rng.pick(team);
    hurt.hp -= rng.int(15, 35);
    if (hurt.hp <= 0) {
      hurt.hp = 0;
      hurt.status = 'dead';
      state.stats.deaths += 1;
      pushLog(state, `${hurt.name} cae limpiando ${zone.name}.`, 'bad');
    } else {
      hurt.status = 'wounded';
      pushLog(state, `${hurt.name} vuelve herido de ${zone.name}.`, 'warn');
    }
  }

  zone.infectedLeft = Math.max(0, zone.infectedLeft - rng.int(1, 3));
  const typeLoot = content.locationsDoc?.locationTypes?.[zone.type]?.lootBias || zone.loot || {};
  const lootMap = {};
  Object.entries(typeLoot).forEach(([k, bias]) => {
    const n = typeof bias === 'number' ? bias : 1;
    lootMap[k] = [Math.max(0, Math.floor(n)), Math.max(1, Math.ceil(n + 2 + gather * 0.15))];
  });
  if (!Object.keys(lootMap).length) {
    lootMap.food = [0, 2];
    lootMap.scrap = [0, 2];
  }
  // map scrap to metal
  const veh = content.vehiclesDoc?.vehicles?.find((v) => v.id === ex.vehicleId);
  const loot = rollLoot(rng, lootMap, veh?.cargoBonus || 0);
  if (loot.scrap) {
    loot.metal = (loot.metal || 0) + loot.scrap;
    delete loot.scrap;
  }
  Object.entries(loot).forEach(([k, v]) => {
    state.resources[k] = (state.resources[k] || 0) + v;
  });
  const lootTxt = Object.entries(loot)
    .map(([k, v]) => `${v} ${RES_LABEL[k] || k}`)
    .join(', ');
  pushLog(state, `Regreso de ${zone.name}: ${lootTxt || 'casi nada'}.`, 'good');

  if (zone.state === 'discovered' || zone.state === 'hostile') {
    zone.controlProgress = Math.min(1, (zone.controlProgress || 0) + 0.35 + scout * 0.02);
    if (zone.infectedLeft <= 0 && zone.controlProgress >= (content.balance.controlClearThreshold || 0.55)) {
      zone.state = 'controlled';
      zone.controlProgress = 1;
      state.stats.zonesControlled = state.zones.filter((z) => z.state === 'controlled').length;
      state.stats.maxControlled = Math.max(state.stats.maxControlled, state.stats.zonesControlled);
      state.stability += 4;
      pushLog(state, `¡${zone.name} pasa a control de Zona Zero!`, 'good');
      // reveal neighbors
      (zone.neighbors || []).forEach((nid) => {
        const n = state.zones.find((z) => z.id === nid);
        if (n && n.state === 'unknown') {
          n.state = 'discovered';
          pushLog(state, `Rutas revelan ${n.name}.`, 'info');
        }
      });
    } else if (zone.state !== 'controlled') {
      zone.state = zone.risk >= 0.45 ? 'hostile' : 'discovered';
    }
  }

  if (rng.chance(0.08)) {
    const cap = housingCapacity(state, content.buildings);
    if (allLiving(state).length < cap && allLiving(state).length < maxSurvivorsCap(content.balance)) {
      const s = makeSurvivor(rng, content.survivorsDoc);
      state.survivors.push(s);
      state.stats.immigrants += 1;
      pushLog(state, `Rescatáis a ${s.name} en ${zone.name}.`, 'good');
    }
  }
}

function applyProduction(state, content) {
  const stabMod = clamp(0.6 + state.stability / 200, 0.6, 1.15);
  const weatherMod =
    state.weather === 'heat' || state.weather === 'cold' ? 0.85 : state.weather === 'storm' ? 0.75 : 1;
  let energyProd = 0;
  let energyDemand = 1;
  state.base.buildings.forEach((b) => {
    if (b.hp <= 0) return;
    const def = content.buildings[b.type];
    if (!def) return;
    if (def.energy > 0) energyProd += def.energy;
    if (def.energy < 0) energyDemand += Math.abs(def.energy);
    if (def.fuelSave) {
      // handled in fuel need
    }
    if (!def.produces) return;
    const jobs = def.jobs || 0;
    const workers = (b.workers || [])
      .map((id) => state.survivors.find((s) => s.id === id))
      .filter((s) => s && s.status !== 'dead' && s.busyUntilDay <= state.day);
    // Producción pasiva mínima si el edificio existe (colonia temprana)
    const staffRatio = jobs ? clamp(workers.length / jobs, 0.35, 1) : 0.55;
    const skill = workers.length
      ? workers.reduce((n, s) => n + (s.skills.produce || 1), 0) / workers.length
      : 2;
    const mult = staffRatio * stabMod * weatherMod * (0.85 + skill * 0.1);
    Object.entries(def.produces).forEach(([k, v]) => {
      const amt = Math.max(0, Math.round(v * mult));
      if (amt) state.resources[k] = (state.resources[k] || 0) + amt;
    });
    workers.forEach((s) => gainSkill(state, s, 'produce', 1));
  });
  // research bonuses
  if ((state.research.unlocked || []).includes('surv_crops')) {
    state.resources.food += 1;
  }
  if ((state.research.unlocked || []).includes('surv_filters')) {
    state.resources.water += 1;
  }
  state.energy.produced = energyProd;
  state.energy.demand = energyDemand;
}

function fuelNeed(state, content) {
  let need = content.balance.fuelPerDayBase || 0.5;
  need += livingSurvivors(state).length * (content.balance.fuelPerSurvivorPerDay || 0.08);
  state.base.buildings.forEach((b) => {
    const def = content.buildings[b.type];
    if (def?.fuelSave) need = Math.max(0, need - def.fuelSave);
  });
  if (state.energy.produced >= state.energy.demand) need *= 0.5;
  return Math.ceil(need);
}

function consumeNeed(state, key, need, dmgKey, label, balance) {
  const have = state.resources[key] || 0;
  if (have >= need) {
    state.resources[key] = have - need;
    return;
  }
  state.resources[key] = 0;
  const missing = need - have;
  state.stability -= 2 + Math.min(4, missing);
  pushLog(state, `Escasez de ${label}.`, 'bad');
  // Daño gradual: no aniquilar la colonia en un solo día
  const victims = livingSurvivors(state)
    .slice()
    .sort((a, b) => a.hp - b.hp)
    .slice(0, Math.min(2, Math.max(1, Math.ceil(missing / 3))));
  const dmg = (balance[dmgKey] || 12) * 0.55;
  victims.forEach((s) => {
    s.hp -= dmg;
    if (s.hp <= 40) s.status = 'wounded';
    if (s.hp <= 0) {
      s.hp = 0;
      s.status = 'dead';
      state.stats.deaths += 1;
      state.director.recentLosses += 1;
      pushLog(state, `${s.name} sucumbe (${label}).`, 'bad');
    }
  });
}

function healTick(state, content) {
  const hasClinic = state.base.buildings.some((b) =>
    ['clinic', 'infirmary', 'medkit'].includes(b.type) && b.hp > 0
  );
  const meds = state.resources.medicine || 0;
  livingSurvivors(state).forEach((s) => {
    if (s.status === 'wounded' || s.status === 'sick') {
      let heal = hasClinic ? 8 : 3;
      if (meds > 0) {
        state.resources.medicine -= 1;
        heal += 14;
      }
      s.hp = Math.min(s.maxHp, s.hp + heal);
      if (s.hp >= 80) s.status = 'ok';
    } else if (s.hp < s.maxHp) {
      s.hp = Math.min(s.maxHp, s.hp + (hasClinic ? 4 : 2));
    }
  });
}

function updateStability(state, content) {
  const alive = livingSurvivors(state).length;
  const cap = housingCapacity(state, content.buildings);
  let d = 0;
  if ((state.resources.food || 0) > alive) d += 1;
  if ((state.resources.water || 0) > alive) d += 1;
  if (alive <= cap) d += 1;
  else d -= 2;
  if (state.director.recentLosses > 0) d -= state.director.recentLosses;
  d += Math.min(2, Math.floor(state.stats.zonesControlled / 3));
  state.stability = clamp(state.stability + d, 0, 100);
  state.director.recentLosses = Math.max(0, state.director.recentLosses - 1);
}

function populationTick(state, content) {
  const rng = rngOf(state);
  const bal = content.balance;
  const alive = allLiving(state).length;
  const cap = housingCapacity(state, content.buildings);
  const max = maxSurvivorsCap(bal);
  state.stats.maxPop = Math.max(state.stats.maxPop, alive);

  if (alive > cap + (bal.housingOverflowGrace || 2)) {
    state.stability -= 2;
    if (rng.chance(0.2)) {
      const s = rng.pick(livingSurvivors(state));
      if (s) {
        s.status = 'dead';
        s.hp = 0;
        state.stats.deaths += 1;
        pushLog(state, `${s.name} abandona el hacinamiento… y no vuelve.`, 'bad');
      }
    }
  }

  if (
    state.day % (bal.birthCheckInterval || 5) === 0 &&
    alive >= (bal.birthMinPop || 6) &&
    alive < cap &&
    alive < max &&
    state.stability >= 45 &&
    (state.resources.food || 0) > alive * 2
  ) {
    if (rng.chance(bal.birthChance || 0.12)) {
      const s = makeSurvivor(rng, content.survivorsDoc);
      s.name = s.name;
      state.survivors.push(s);
      state.stats.births += 1;
      pushLog(state, `Nueva vida en el refugio: ${s.name}.`, 'good');
    }
  }

  if (
    rng.chance((bal.immigrantBaseChance || 0.08) * 0.6) &&
    alive < cap &&
    alive < max &&
    state.stability >= 45 &&
    state.stats.zonesControlled >= 2 &&
    (state.resources.food || 0) >= alive * 3 &&
    (state.resources.water || 0) >= alive * 3
  ) {
    const s = makeSurvivor(rng, content.survivorsDoc);
    state.survivors.push(s);
    state.stats.immigrants += 1;
    pushLog(state, `${s.name} llega buscando refugio.`, 'good');
  }
}

export function resolveBaseAttack(state, content, intensity = 2) {
  const rng = rngOf(state);
  const def = defenseValue(state, content.buildings, content.balance);
  const atk = 10 + intensity * 12 + state.director.threat * 0.3;
  const ratio = def / Math.max(1, atk);
  const roll = rng.float(0.8, 1.2) * ratio;
  state.resources.ammo = Math.max(0, (state.resources.ammo || 0) - intensity);
  if (roll >= 1.1) {
    state.stats.attacksSurvived += 1;
    state.stability += 2;
    pushLog(state, `Ataque repelido (intensidad ${intensity}).`, 'good');
    return 'win';
  }
  if (roll >= 0.75) {
    const hurt = rng.pick(livingSurvivors(state));
    if (hurt) {
      hurt.hp -= rng.int(20, 40);
      hurt.status = hurt.hp <= 0 ? 'dead' : 'wounded';
      if (hurt.status === 'dead') state.stats.deaths += 1;
    }
    const b = rng.pick(state.base.buildings.filter((x) => x.hp > 0));
    if (b && rng.chance(0.4)) {
      b.hp -= rng.int(20, 50);
      if (b.hp <= 0) pushLog(state, `${content.buildings[b.type]?.name || b.type} queda destruido.`, 'bad');
    }
    state.stability -= 6;
    pushLog(state, 'Ataque contenido con pérdidas.', 'warn');
    return 'messy';
  }
  // heavy loss
  const victims = rng.shuffle(livingSurvivors(state)).slice(0, Math.min(2, intensity));
  victims.forEach((s) => {
    s.hp = 0;
    s.status = 'dead';
    state.stats.deaths += 1;
  });
  state.stability -= 12;
  state.director.recentLosses += victims.length;
  pushLog(state, 'El perímetro cede. Bajas graves.', 'bad');
  return 'lose';
}

export function tickResearch(state, content) {
  if (!state.research.active) return;
  const allTechs = [];
  Object.values(content.researchDoc?.branches || {}).forEach((br) => {
    (br.techs || []).forEach((t) => allTechs.push(t));
  });
  const tech = allTechs.find((t) => t.id === state.research.active);
  if (!tech) {
    state.research.active = null;
    return;
  }
  state.research.progress += 1;
  if (state.research.progress >= (tech.days || 3)) {
    state.research.unlocked.push(tech.id);
    state.research.active = null;
    state.research.progress = 0;
    pushLog(state, `Investigación completada: ${tech.name}.`, 'good');
    if (tech.effects?.vehicleUnlock && !state.vehiclesOwned.includes(tech.effects.vehicleUnlock)) {
      // unlock ability to build/buy later
      state.flags.narrative[`veh_${tech.effects.vehicleUnlock}`] = true;
    }
  }
}

export function startResearch(state, content, techId) {
  const allTechs = [];
  Object.values(content.researchDoc?.branches || {}).forEach((br) => {
    (br.techs || []).forEach((t) => allTechs.push(t));
  });
  const tech = allTechs.find((t) => t.id === techId);
  if (!tech) return { ok: false, error: 'Tecnología desconocida' };
  if ((state.research.unlocked || []).includes(techId)) return { ok: false, error: 'Ya investigada' };
  if (state.research.active) return { ok: false, error: 'Ya hay una investigación en curso' };
  if ((tech.minEra || 0) > state.era) return { ok: false, error: 'Era insuficiente' };
  if (tech.requires?.some((r) => !(state.research.unlocked || []).includes(r))) {
    return { ok: false, error: 'Faltan requisitos' };
  }
  if (!canAfford(state, tech.cost)) return { ok: false, error: 'Recursos insuficientes' };
  const hasBench = state.base.buildings.some((b) => ['tech_bench', 'lab'].includes(b.type) && b.hp > 0);
  if (!hasBench && state.era >= 1) return { ok: false, error: 'Necesitás mesa técnica o laboratorio' };
  payCost(state, tech.cost);
  state.research.active = techId;
  state.research.progress = 0;
  pushLog(state, `Investigáis: ${tech.name}.`, 'info');
  return { ok: true };
}

export function buyVehicle(state, content, vehicleId) {
  const v = content.vehiclesDoc?.vehicles?.find((x) => x.id === vehicleId);
  if (!v) return { ok: false, error: 'Vehículo desconocido' };
  if (state.vehiclesOwned.includes(vehicleId)) return { ok: false, error: 'Ya lo tenéis' };
  if ((v.minEra || 0) > state.era) return { ok: false, error: 'Era insuficiente' };
  const hasGarage = state.base.buildings.some((b) => b.type === 'garage' && b.hp > 0);
  if (vehicleId !== 'bike' && !hasGarage) return { ok: false, error: 'Hace falta un garaje' };
  if (!canAfford(state, v.cost)) return { ok: false, error: 'Recursos insuficientes' };
  payCost(state, v.cost);
  state.vehiclesOwned.push(vehicleId);
  pushLog(state, `Disponible: ${v.name}.`, 'good');
  return { ok: true };
}

export function updateEra(state, content) {
  const eras = content.erasDoc?.eras || [];
  let era = 0;
  const pop = allLiving(state).length;
  const controlled = state.zones.filter((z) => z.state === 'controlled').length;
  const tech = (state.research.unlocked || []).length;
  eras.forEach((e, idx) => {
    const u = e.unlock || {};
    const okPop = pop >= (u.minPop || 0);
    const okCtrl = controlled >= (u.minControlled || 0);
    const okTech = tech >= (u.minResearch || 0);
    const okDay = state.day >= (u.minDay || 0);
    // need majority of soft gates
    const checks = [okPop, okCtrl, okTech, okDay || !u.minDay];
    if (checks.filter(Boolean).length >= 2 && okPop) era = Math.max(era, idx);
  });
  if (era > state.era) {
    state.era = era;
    pushLog(state, `Nueva era: ${eras[era]?.name || era}.`, 'good');
  }
}

export function checkVictory(state, content) {
  if (state.flags.victory && state.flags.endless) return;
  if (state.flags.defeated) return;
  const v = content.balance.victory || {};
  const pop = allLiving(state).length;
  const controlled = state.zones.filter((z) => z.state === 'controlled').length;
  const hasHospital = state.base.buildings.some((b) => ['clinic', 'infirmary'].includes(b.type) && b.hp > 0);
  const energyOk = state.energy.produced >= state.energy.demand && state.energy.produced > 0;
  const def = defenseValue(state, content.buildings, content.balance);
  const ready =
    pop >= (v.minPop || 40) &&
    controlled >= (v.minControlled || 8) &&
    state.stability >= (v.minStability || 55) &&
    state.era >= (v.minEra || 3) &&
    (!v.needHospital || hasHospital) &&
    (!v.needEnergy || energyOk) &&
    def >= (v.needDefense || 40);

  if (ready && !state.flags.finalCrisisDone && !state.flags.finalCrisisActive) {
    state.flags.finalCrisisActive = true;
    pushLog(state, 'CRISIS FINAL: la región entera se agita. Preparad la defensa.', 'warn');
    resolveBaseAttack(state, content, 5);
    state.flags.finalCrisisActive = false;
    state.flags.finalCrisisDone = true;
    if (!state.flags.defeated && allLiving(state).length > 0) {
      state.flags.victory = true;
      pushLog(state, 'ZONA ZERO ESTÁ ESTABILIZADA.', 'good');
    }
    return;
  }
}

function checkDefeat(state) {
  const alive = allLiving(state);
  if (!alive.length) {
    state.flags.defeated = true;
    state.flags.defeatReason = 'No quedan supervivientes.';
    pushLog(state, 'DERROTA: el refugio queda vacío.', 'bad');
    return;
  }
  const hq = state.base.buildings.find((b) => String(b.type).startsWith('hq_central') && b.hp > 0);
  if (!hq && alive.length < 2) {
    state.flags.defeated = true;
    state.flags.defeatReason = 'El Refugio Central se ha perdido.';
    pushLog(state, 'DERROTA: sin centro ni esperanza.', 'bad');
  }
}

export function advanceDay(state, content) {
  if (state.flags.defeated) return { ok: false, error: 'Partida terminada' };
  if (state.flags.victory && !state.flags.endless) {
    // allow advancing only if endless
    return { ok: false, error: 'Victoria alcanzada. Continuad en modo endless o nueva partida.' };
  }

  resolveExpedition(state, content);

  const alive = livingSurvivors(state);
  const foodNeed = allLiving(state).length * (content.balance.foodPerSurvivorPerDay || 1);
  const waterNeed = allLiving(state).length * (content.balance.waterPerSurvivorPerDay || 1);
  consumeNeed(state, 'food', foodNeed, 'starvationDamage', 'hambre', content.balance);
  consumeNeed(state, 'water', waterNeed, 'dehydrationDamage', 'sed', content.balance);

  const fNeed = fuelNeed(state, content);
  if (fNeed > 0) {
    if ((state.resources.fuel || 0) >= fNeed) state.resources.fuel -= fNeed;
    else {
      const missing = fNeed - (state.resources.fuel || 0);
      state.resources.fuel = 0;
      state.resources.food = Math.max(0, state.resources.food - (content.balance.noFuelExtraFoodLoss || 1) * missing);
      pushLog(state, 'Sin combustible: se pierde comida al improvisar.', 'warn');
    }
  }

  applyProduction(state, content);
  healTick(state, content);
  tickResearch(state, content);

  if (state.weatherDaysLeft > 0) {
    state.weatherDaysLeft -= 1;
    if (state.weatherDaysLeft <= 0) state.weather = 'clear';
  }

  state.day += 1;
  pushLog(state, `Amanece el día ${state.day}.`, 'story');

  updateStability(state, content);
  populationTick(state, content);
  updateEra(state, content);

  const dir = runDirector(state, content);
  if (dir?.attackIntensity) resolveBaseAttack(state, content, dir.attackIntensity);

  checkVictory(state, content);
  checkDefeat(state);

  livingSurvivors(state).forEach((s) => {
    if (s.busyUntilDay < state.day) s.busyUntilDay = 0;
  });

  state.rngState = (state.rngState || 1) + 17;

  return { ok: true, director: dir };
}

export function continueEndless(state) {
  if (!state.flags.victory) return { ok: false, error: 'Sin victoria' };
  state.flags.endless = true;
  pushLog(state, 'Continuáis en modo endless. La zona nunca duerme del todo.', 'story');
  return { ok: true };
}

export { applyEventEffects, riskCategory };
