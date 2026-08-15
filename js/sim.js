/**
 * Simulación diaria Zona Zero v4 — población colectiva + exploradores
 */
import { clamp, uid } from './util.js';
import { createRng } from './rng.js';
import {
  allLiving,
  pushLog,
  defenseValue,
  housingCapacity,
  maxSurvivorsCap,
} from './state.js';
import {
  redistributeLabor,
  changePopulation,
  applyCasualties,
  healPopulationTick,
  clearLaborManual,
  adjustLabor,
  workforce,
} from './population.js';
import {
  readyExplorers,
  livingExplorers,
  gainExplorerSkill,
  killExplorer,
  explorerSlotsUnlocked,
} from './explorers.js';
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
  const buildLabor = state.population?.labor?.build || 0;
  const idle = state.population?.labor?.idle || 0;
  if (buildLabor + idle < 1) return { ok: false, error: 'Sin mano de obra para construir' };

  payCost(state, def.cost);
  if (def.upgradeFrom) {
    const old = state.base.buildings.find((b) => b.type === def.upgradeFrom && b.hp > 0);
    if (old) {
      old.type = type;
      pushLog(state, `Mejoráis a ${def.name}.`, 'good');
      state.stats.buildingsBuilt += 1;
      return { ok: true, upgraded: true };
    }
  }
  state.base.buildings.push({ id: uid('b'), type, x, y, hp: 100 });
  state.stats.buildingsBuilt += 1;
  pushLog(state, `Construís ${def.name}.`, 'good');
  return { ok: true };
}

/** Compat stubs — la asignación es colectiva */
export function assignWorker() {
  return { ok: false, error: 'Asignación colectiva: usad el panel de población' };
}
export function unassignWorker() {}
export function autoAssignWorkers(state, content) {
  clearLaborManual(state, content.balance);
  return { ok: true, assigned: workforce(state.population) };
}
export { adjustLabor };

function riskCategory(score) {
  if (score < 0.25) return 'Bajo';
  if (score < 0.45) return 'Moderado';
  if (score < 0.7) return 'Alto';
  return 'Extremo';
}

export function expeditionPreview(state, content, zoneId, explorerId) {
  const zone = state.zones.find((z) => z.id === zoneId);
  const explorer = (state.explorers || []).find((e) => e.id === explorerId);
  if (!zone || !explorer) return null;
  const explore = explorer.skills.explore || 1;
  const fight = explorer.skills.fight || 1;
  const resist = explorer.skills.resist || 1;
  let risk = zone.risk - explore * 0.045 - fight * 0.035 - resist * 0.02;
  const gear = explorer.gear || state.equipment || {};
  if (gear.weapon === 'basic') risk -= 0.05;
  if (gear.weapon === 'improved') risk -= 0.1;
  if (gear.armor && gear.armor !== 'none') risk -= 0.04;
  const vehicleId = explorer.vehicleId || state.equipment?.vehicleId;
  const veh = content.vehiclesDoc?.vehicles?.find((v) => v.id === vehicleId);
  if (veh) risk -= (veh.protection || 0) * 0.02;
  if (state.weather === 'storm' || state.weather === 'fog') risk += 0.08;
  risk = clamp(risk, 0.05, 0.95);
  let days = content.balance.expeditionBaseDurationDays || 1;
  if (zone.state === 'unknown') days += 1;
  if (veh?.speedBonus) days = Math.max(1, Math.round(days * (1 - veh.speedBonus)));
  const camp = state.zones.find((z) => z.type === 'camp') || state.zones[0];
  const dist = camp
    ? Math.hypot((zone.x || 0) - (camp.x || 0), (zone.y || 0) - (camp.y || 0))
    : 20;
  return {
    risk,
    category: riskCategory(risk),
    days,
    fuel: veh ? veh.fuelPerTrip || 0 : content.balance.expeditionFuelCost || 1,
    distance: Math.round(dist),
    lootHint: Object.keys(zone.loot || {}).slice(0, 3),
    explorerName: explorer.name,
    explorerStatus: explorer.status,
  };
}

export function startExpedition(state, content, zoneId, explorerId) {
  if (state.flags.defeated) return { ok: false, error: 'Partida terminada' };
  const zone = state.zones.find((z) => z.id === zoneId);
  if (!zone) return { ok: false, error: 'Zona inválida' };
  if (zone.state === 'unknown') return { ok: false, error: 'Zona aún no descubierta' };
  if (zone.id === 'camp' || zone.type === 'camp') return { ok: false, error: 'El campamento ya es vuestro' };

  const explorer = (state.explorers || []).find((e) => e.id === explorerId);
  if (!explorer || explorer.status !== 'ready') return { ok: false, error: 'Explorador no disponible' };
  if (explorer.expeditionId) return { ok: false, error: 'Ese explorador ya está fuera' };

  // Una expedición activa por explorador; varias en paralelo OK
  const busyZones = (state.expeditions || []).map((x) => x.zoneId);
  if (busyZones.includes(zoneId)) return { ok: false, error: 'Ya hay una expedición a esa zona' };

  const preview = expeditionPreview(state, content, zoneId, explorerId);
  const vehicleId = explorer.vehicleId || state.equipment?.vehicleId || null;
  const veh = content.vehiclesDoc?.vehicles?.find((v) => v.id === vehicleId);
  const payFuel = veh ? veh.fuelPerTrip || 0 : content.balance.expeditionFuelCost || 0;
  if (payFuel > 0) {
    if ((state.resources.fuel || 0) < payFuel) return { ok: false, error: `Hace falta ${payFuel} combustible` };
    state.resources.fuel -= payFuel;
  }

  const exId = uid('xp');
  const gear = { ...(explorer.gear || { weapon: 'none', armor: 'none' }) };
  const entry = {
    id: exId,
    zoneId,
    explorerId: explorer.id,
    returnDay: state.day + preview.days,
    risk: preview.risk,
    vehicleId,
    weapon: gear.weapon,
    armor: gear.armor,
  };
  if (!state.expeditions) state.expeditions = [];
  state.expeditions.push(entry);
  // Compat mapa 1.1
  state.expedition = state.expeditions[0] || null;

  explorer.status = 'away';
  explorer.expeditionId = exId;
  state.stats.expeditions += 1;
  pushLog(state, `${explorer.name} parte hacia ${zone.name} (riesgo ${preview.category}).`, 'info');
  return { ok: true, preview, expeditionId: exId };
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

function resolveOneExpedition(state, content, ex) {
  const rng = rngOf(state);
  const zone = state.zones.find((z) => z.id === ex.zoneId);
  const explorer = (state.explorers || []).find((e) => e.id === ex.explorerId);
  if (!zone || !explorer || explorer.status === 'dead') {
    pushLog(state, 'Una expedición se pierde en el silencio.', 'bad');
    return;
  }

  const explore = explorer.skills.explore || 1;
  const fight = explorer.skills.fight || 1;
  const lootSk = explorer.skills.loot || 1;
  const resist = explorer.skills.resist || 1;

  let teamPower =
    fight * 5 + explore * 2 + resist * 2 + 4 + (state.resources.ammo || 0) * 0.4;
  if (ex.weapon === 'basic') teamPower += 6;
  if (ex.weapon === 'improved') teamPower += 12;
  if (ex.armor === 'light') teamPower += 3;
  if (ex.armor === 'heavy') teamPower += 7;
  // Apoyo humano interno (no micromanagement)
  const support = Math.min(4, Math.floor((state.population?.labor?.idle || 0) * 0.15));
  teamPower += support * 2;

  const enemyPower = 4 + zone.infectedLeft * 3 + zone.risk * 20;
  const outcome = resolveCombat(rng, teamPower, enemyPower);

  gainExplorerSkill(explorer, 'explore', 1, content.balance);
  if (outcome !== 'fail') gainExplorerSkill(explorer, 'loot', 1, content.balance);
  if (outcome !== 'clean') gainExplorerSkill(explorer, 'fight', 1, content.balance);
  if (outcome === 'wounded' || outcome === 'retreat' || state.weather !== 'clear') {
    gainExplorerSkill(explorer, 'resist', 1, content.balance);
  }

  explorer.expeditionId = null;

  if (outcome === 'fail') {
    killExplorer(state, explorer, content.balance);
    state.stats.explorersLost = (state.stats.explorersLost || 0) + 1;
    state.stats.deaths += 1;
    state.director.recentLosses += 1;
    state.stability -= 8;
    pushLog(state, `Fracaso en ${zone.name}. ${explorer.name} no vuelve.`, 'bad');
    return;
  }

  if (outcome === 'retreat') {
    explorer.status = 'wounded';
    explorer.wounds = (explorer.wounds || 0) + 1;
    pushLog(state, `${explorer.name} se retira de ${zone.name}. Herido, poco botín.`, 'warn');
    const scraps = rollLoot(rng, { wood: [0, 1], metal: [0, 1] });
    Object.entries(scraps).forEach(([k, v]) => {
      state.resources[k] = (state.resources[k] || 0) + v;
    });
    return;
  }

  if (outcome === 'wounded') {
    explorer.status = 'wounded';
    explorer.wounds = (explorer.wounds || 0) + 1;
    if (rng.chance(0.12 - resist * 0.015)) {
      killExplorer(state, explorer, content.balance);
      state.stats.explorersLost = (state.stats.explorersLost || 0) + 1;
      state.stats.deaths += 1;
      pushLog(state, `${explorer.name} cae limpiando ${zone.name}.`, 'bad');
      return;
    }
    pushLog(state, `${explorer.name} vuelve herido de ${zone.name}.`, 'warn');
  } else {
    explorer.status = 'ready';
  }

  zone.infectedLeft = Math.max(0, zone.infectedLeft - rng.int(1, 2 + Math.floor(fight / 2)));
  const typeLoot = content.locationsDoc?.locationTypes?.[zone.type]?.lootBias || zone.loot || {};
  const lootMap = {};
  Object.entries(typeLoot).forEach(([k, bias]) => {
    const n = typeof bias === 'number' ? bias : 1;
    lootMap[k] = [Math.max(0, Math.floor(n)), Math.max(1, Math.ceil(n + 1 + lootSk * 0.35))];
  });
  if (!Object.keys(lootMap).length) {
    lootMap.food = [0, 2];
    lootMap.metal = [0, 2];
  }
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
  pushLog(state, `${explorer.name} regresa de ${zone.name}: ${lootTxt || 'casi nada'}.`, 'good');

  if (zone.state === 'discovered' || zone.state === 'hostile') {
    zone.controlProgress = Math.min(1, (zone.controlProgress || 0) + 0.3 + explore * 0.03);
    if (zone.infectedLeft <= 0 && zone.controlProgress >= (content.balance.controlClearThreshold || 0.55)) {
      zone.state = 'controlled';
      zone.controlProgress = 1;
      state.stats.zonesControlled = state.zones.filter((z) => z.state === 'controlled').length;
      state.stats.maxControlled = Math.max(state.stats.maxControlled, state.stats.zonesControlled);
      state.stability += 4;
      pushLog(state, `¡${zone.name} pasa a control de Zona Zero!`, 'good');
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

  if (rng.chance(0.1)) {
    const cap = housingCapacity(state, content.buildings);
    if ((state.population?.total || 0) < cap && (state.population?.total || 0) < maxSurvivorsCap(content.balance)) {
      changePopulation(state, 1, content.balance, 'immigrant');
      pushLog(state, `Rescatáis a alguien en ${zone.name}. Población +1.`, 'good');
    }
  }
}

export function resolveExpedition(state, content) {
  if (!state.expeditions) state.expeditions = [];
  // Migrar singular
  if (state.expedition && !state.expeditions.find((x) => x.id === state.expedition.id)) {
    state.expeditions.push(state.expedition);
  }
  const due = state.expeditions.filter((ex) => state.day >= ex.returnDay);
  due.forEach((ex) => resolveOneExpedition(state, content, ex));
  state.expeditions = state.expeditions.filter((ex) => state.day < ex.returnDay);
  state.expedition = state.expeditions[0] || null;

  // Curar exploradores heridos en casa
  livingExplorers(state).forEach((e) => {
    if (e.status === 'wounded' && !e.expeditionId) {
      e.wounds = Math.max(0, (e.wounds || 1) - 1);
      if (e.wounds <= 0) e.status = 'ready';
    }
  });
}

function applyProduction(state, content) {
  const stabMod = clamp(0.6 + state.stability / 200, 0.6, 1.15);
  const weatherMod =
    state.weather === 'heat' || state.weather === 'cold' ? 0.85 : state.weather === 'storm' ? 0.75 : 1;
  const labor = state.population?.labor || {};
  const per = content.balance.productionPerWorker || {};

  let energyProd = 0;
  let energyDemand = 1;
  let buildingFood = 0;
  let buildingWater = 0;
  let buildingOther = {};

  state.base.buildings.forEach((b) => {
    if (b.hp <= 0) return;
    const def = content.buildings[b.type];
    if (!def) return;
    if (def.energy > 0) energyProd += def.energy;
    if (def.energy < 0) energyDemand += Math.abs(def.energy);
    if (!def.produces) return;
    const jobs = def.jobs || 1;
    Object.entries(def.produces).forEach(([k, v]) => {
      // Capacidad del edificio × cobertura laboral
      let staff = labor.produce || 0;
      if (k === 'food') staff = labor.food || 0;
      if (k === 'water') staff = labor.water || 0;
      const ratio = clamp(staff / Math.max(1, jobs * 2), 0.25, 1.15);
      const amt = Math.max(0, Math.round(v * ratio * stabMod * weatherMod));
      if (k === 'food') buildingFood += amt;
      else if (k === 'water') buildingWater += amt;
      else buildingOther[k] = (buildingOther[k] || 0) + amt;
    });
  });

  // Producción directa por trabajadores asignados (colonia temprana sin edificios)
  const foodExtra = Math.round((labor.food || 0) * (per.food || 1.5) * 0.35 * stabMod);
  const waterExtra = Math.round((labor.water || 0) * (per.water || 1.4) * 0.35 * stabMod);
  const produceExtra = Math.round((labor.produce || 0) * (per.produce || 1.0) * 0.25 * stabMod);

  state.resources.food = (state.resources.food || 0) + buildingFood + foodExtra;
  state.resources.water = (state.resources.water || 0) + buildingWater + waterExtra;
  if (produceExtra > 0) {
    state.resources.wood = (state.resources.wood || 0) + Math.ceil(produceExtra / 2);
    state.resources.metal = (state.resources.metal || 0) + Math.floor(produceExtra / 2);
  }
  Object.entries(buildingOther).forEach(([k, v]) => {
    state.resources[k] = (state.resources[k] || 0) + v;
  });

  if ((state.research.unlocked || []).includes('surv_crops')) state.resources.food += 1;
  if ((state.research.unlocked || []).includes('surv_filters')) state.resources.water += 1;
  state.energy.produced = energyProd;
  state.energy.demand = energyDemand;
}

function fuelNeed(state, content) {
  let need = content.balance.fuelPerDayBase || 0.5;
  const pop = state.population?.total || 0;
  need += pop * (content.balance.fuelPerPersonPerDay || content.balance.fuelPerSurvivorPerDay || 0.08);
  state.base.buildings.forEach((b) => {
    const def = content.buildings[b.type];
    if (def?.fuelSave) need = Math.max(0, need - def.fuelSave);
  });
  if (state.energy.produced >= state.energy.demand) need *= 0.5;
  return Math.ceil(need);
}

function consumeNeed(state, key, need, label, balance) {
  const have = state.resources[key] || 0;
  if (have >= need) {
    state.resources[key] = have - need;
    return;
  }
  state.resources[key] = 0;
  const missing = need - have;
  state.stability -= 2 + Math.min(4, missing);
  pushLog(state, `Escasez de ${label}.`, 'bad');
  const loss = Math.min(2, Math.max(1, Math.ceil(missing / 4)));
  applyCasualties(state, balance, { dead: loss > 1 && missing >= 3 ? 1 : 0, injured: loss });
  if (loss) pushLog(state, `La colonia sufre por falta de ${label}.`, 'bad');
}

function updateStability(state, content) {
  const pop = state.population?.total || 0;
  const cap = housingCapacity(state, content.buildings);
  let d = 0;
  if ((state.resources.food || 0) > pop) d += 1;
  if ((state.resources.water || 0) > pop) d += 1;
  if (pop <= cap) d += 1;
  else d -= 2;
  if (state.director.recentLosses > 0) d -= state.director.recentLosses;
  d += Math.min(2, Math.floor(state.stats.zonesControlled / 3));
  state.stability = clamp(state.stability + d, 0, 100);
  state.director.recentLosses = Math.max(0, state.director.recentLosses - 1);
}

function populationTick(state, content) {
  const rng = rngOf(state);
  const bal = content.balance;
  const pop = state.population?.total || 0;
  const cap = housingCapacity(state, content.buildings);
  const max = maxSurvivorsCap(bal);
  state.stats.maxPop = Math.max(state.stats.maxPop || 0, pop);

  // Desbloqueo plazas explorador (mensaje)
  const slots = explorerSlotsUnlocked(state, bal);
  if (slots > (state._lastExplorerSlots || 1)) {
    pushLog(state, `Nueva plaza de explorador disponible (${slots}/3).`, 'good');
    state._lastExplorerSlots = slots;
  }

  if (pop > cap + (bal.housingOverflowGrace || 2)) {
    state.stability -= 2;
    if (rng.chance(0.2)) {
      changePopulation(state, -1, bal, 'death');
      pushLog(state, 'Alguien abandona el hacinamiento… y no vuelve.', 'bad');
    }
  }

  if (
    state.day % (bal.birthCheckInterval || 5) === 0 &&
    pop >= (bal.birthMinPop || 8) &&
    pop < cap &&
    pop < max &&
    state.stability >= 45 &&
    (state.resources.food || 0) > pop * 2
  ) {
    if (rng.chance(bal.birthChance || 0.14)) {
      changePopulation(state, 1, bal, 'birth');
      pushLog(state, 'Nueva vida en el refugio. Población +1.', 'good');
    }
  }

  if (
    rng.chance((bal.immigrantBaseChance || 0.1) * 0.6) &&
    pop < cap &&
    pop < max &&
    state.stability >= 45 &&
    state.stats.zonesControlled >= 2 &&
    (state.resources.food || 0) >= pop * 3 &&
    (state.resources.water || 0) >= pop * 3
  ) {
    changePopulation(state, 1, bal, 'immigrant');
    pushLog(state, 'Llega gente buscando refugio. Población +1.', 'good');
  }

  redistributeLabor(state, bal);
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
    applyCasualties(state, content.balance, { injured: rng.int(1, 2), dead: rng.chance(0.25) ? 1 : 0 });
    const b = rng.pick(state.base.buildings.filter((x) => x.hp > 0));
    if (b && rng.chance(0.4)) {
      b.hp -= rng.int(20, 50);
      if (b.hp <= 0) pushLog(state, `${content.buildings[b.type]?.name || b.type} queda destruido.`, 'bad');
    }
    state.stability -= 6;
    pushLog(state, 'Ataque contenido con pérdidas.', 'warn');
    return 'messy';
  }
  const dead = Math.min(state.population?.total || 1, Math.min(3, intensity));
  applyCasualties(state, content.balance, { dead, injured: intensity });
  state.stability -= 12;
  state.director.recentLosses += dead;
  pushLog(state, 'El perímetro cede. Bajas graves entre la población.', 'bad');
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
    if (tech.effects?.vehicleUnlock) {
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
  const pop = state.population?.total || 0;
  const controlled = state.zones.filter((z) => z.state === 'controlled').length;
  const tech = (state.research.unlocked || []).length;
  eras.forEach((e, idx) => {
    const u = e.unlock || {};
    const okPop = pop >= (u.minPop || 0);
    const okCtrl = controlled >= (u.minControlled || 0);
    const okTech = tech >= (u.minResearch || 0);
    const okDay = state.day >= (u.minDay || 0);
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
  const pop = state.population?.total || 0;
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
    if (!state.flags.defeated && (state.population?.total || 0) > 0) {
      state.flags.victory = true;
      pushLog(state, 'ZONA ZERO ESTÁ ESTABILIZADA.', 'good');
    }
  }
}

function checkDefeat(state) {
  if ((state.population?.total || 0) <= 0) {
    state.flags.defeated = true;
    state.flags.defeatReason = 'No queda población.';
    pushLog(state, 'DERROTA: el refugio queda vacío.', 'bad');
    return;
  }
  const hq = state.base.buildings.find((b) => String(b.type).startsWith('hq_central') && b.hp > 0);
  if (!hq && (state.population?.total || 0) < 2) {
    state.flags.defeated = true;
    state.flags.defeatReason = 'El Refugio Central se ha perdido.';
    pushLog(state, 'DERROTA: sin centro ni esperanza.', 'bad');
  }
}

export function advanceDay(state, content) {
  if (state.flags.defeated) return { ok: false, error: 'Partida terminada' };
  if (state.flags.victory && !state.flags.endless) {
    return { ok: false, error: 'Victoria alcanzada. Continuad en modo endless o nueva partida.' };
  }

  resolveExpedition(state, content);

  const pop = state.population?.total || 0;
  const foodNeed = pop * (content.balance.foodPerPersonPerDay || content.balance.foodPerSurvivorPerDay || 1);
  const waterNeed = pop * (content.balance.waterPerPersonPerDay || content.balance.waterPerSurvivorPerDay || 1);
  consumeNeed(state, 'food', foodNeed, 'comida', content.balance);
  consumeNeed(state, 'water', waterNeed, 'agua', content.balance);

  const fNeed = fuelNeed(state, content);
  if (fNeed > 0) {
    if ((state.resources.fuel || 0) >= fNeed) state.resources.fuel -= fNeed;
    else {
      const missing = fNeed - (state.resources.fuel || 0);
      state.resources.fuel = 0;
      state.resources.food = Math.max(
        0,
        state.resources.food - (content.balance.noFuelExtraFoodLoss || 1) * missing
      );
      pushLog(state, 'Sin combustible: se pierde comida al improvisar.', 'warn');
    }
  }

  applyProduction(state, content);
  healPopulationTick(state, content.balance);
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

  state.rngState = (state.rngState || 1) + 17;
  return { ok: true, director: dir };
}

export function continueEndless(state) {
  if (!state.flags.victory) return { ok: false, error: 'Sin victoria' };
  state.flags.endless = true;
  pushLog(state, 'Continuáis en modo endless. La zona nunca duerme del todo.', 'story');
  return { ok: true };
}

export { applyEventEffects, riskCategory, readyExplorers };
