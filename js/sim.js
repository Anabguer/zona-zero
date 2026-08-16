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
  housingClimateCoverage,
  woodReserveDays,
  tickSeason,
  tickPendingWeather,
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
import { tickOutbreak, medicalBeds, healthSemaphore } from './outbreaks.js';
import {
  resolveBaseAttack,
  schedulePendingAttack,
  tickPendingAttack,
  composeHorde,
  formatHordeLabel,
} from './combat.js';
import {
  tickBuildingRepairs,
  tickWeatherStructureDamage,
  buildingOutputMult,
  buildingsNeedingRepair,
  startRepair,
  repairQuote,
  buildingStructuralState,
  applyBuildingDamage,
  perimeterIntegrity,
} from './buildings-damage.js';
import {
  lootSpecForZone,
  scaleLootSpecForZoneState,
  applyLootDepletion,
  trySecureContested,
  controlBenefits,
  lootHintKeys,
  zoneStateLabel,
} from './territory.js';
import {
  adjustBuildingWorkers,
  adjustCategoryLabor,
  autoStaffColony,
  syncLaborFromColony,
  laborKeyForBuilding,
} from './colony.js';
import {
  findTech,
  hasResearchBench,
  researchProgressPerDay,
  sumTechEffect,
  techBenefitText,
  allTechs,
} from './research.js';
import { isCellBuildable, tickSectorRecovery, ensureSectors } from './sectors.js';
import {
  tripFuelCost,
  vehicleUsable,
  markVehicleTrip,
  repairVehicle,
  hasGarage,
  vehicleEffectSummary,
  findVehicle,
} from './vehicles.js';
import { expeditionCenterBonus } from './radio.js';
import {
  tickMissions,
  bumpMissionProgress,
  pickExpeditionEncounter,
  applyEncounterChoice,
  ensureMissions,
} from './missions.js';
import {
  tickAchievements,
  noteAchievementFlag,
  noteAttackRepelled,
} from './achievements.js';
import {
  updateEraByIndicators,
  checkVictoryMulti,
  checkDefeatState,
  continueEndlessMode,
  victoryConditions,
  endScreenStats,
} from './victory.js';

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
  const count = state.base.buildings.filter((b) => b.type === type && b.hp > 0).length;
  if (def.max != null && count >= def.max) return { ok: false, error: 'Límite de este edificio' };
  if (x < 0 || y < 0 || x >= state.base.w || y >= state.base.h) return { ok: false, error: 'Fuera de la base' };
  ensureSectors(state);
  if (!isCellBuildable(state, x, y)) {
    return { ok: false, error: 'Terreno no recuperado — recupera el sector primero' };
  }
  if (state.base.buildings.some((b) => b.x === x && b.y === y && b.hp > 0)) {
    return { ok: false, error: 'Celda ocupada' };
  }
  const buildLabor = state.population?.labor?.build || 0;
  const idle = state.population?.labor?.idle || 0;
  if (buildLabor + idle < 1) return { ok: false, error: 'Sin mano de obra para construir' };

  const costRed = Math.min(0.35, sumTechEffect(state, content, 'buildCostReduction'));
  const paid = {};
  Object.entries(def.cost || {}).forEach(([k, v]) => {
    paid[k] = Math.max(1, Math.ceil(v * (1 - costRed)));
  });
  if (!canAfford(state, paid)) return { ok: false, error: 'Recursos insuficientes' };
  payCost(state, paid);
  if (def.upgradeFrom) {
    const old = state.base.buildings.find((b) => b.type === def.upgradeFrom && b.hp > 0);
    if (old) {
      old.type = type;
      pushLog(state, `Mejoráis a ${def.name}.`, 'good');
      state.stats.buildingsBuilt += 1;
      return { ok: true, upgraded: true };
    }
  }
  state.base.buildings.push({ id: uid('b'), type, x, y, hp: 100, workers: 0 });
  state.stats.buildingsBuilt += 1;
  state.flags = state.flags || {};
  const newId = state.base.buildings[state.base.buildings.length - 1].id;
  state.flags.justBuiltIds = [...(state.flags.justBuiltIds || []).filter((id) => id !== newId).slice(-3), newId];
  syncLaborFromColony(state, content);
  pushLog(state, `Construís ${def.name}.`, 'good');
  return { ok: true };
}

export function assignWorker(state, content, buildingId) {
  return adjustBuildingWorkers(state, content, buildingId, 1);
}
export function unassignWorker(state, content, buildingId) {
  return adjustBuildingWorkers(state, content, buildingId, -1);
}
export function autoAssignWorkers(state, content) {
  return autoStaffColony(state, content);
}
export { adjustLabor, adjustCategoryLabor, adjustBuildingWorkers, syncLaborFromColony };

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
  const lootSk = explorer.skills.loot || 1;
  const resist = explorer.skills.resist || 1;
  let risk = zone.risk - explore * 0.045 - fight * 0.035 - resist * 0.02;
  const gear = explorer.gear || state.equipment || {};
  if (gear.weapon === 'basic') risk -= 0.05;
  if (gear.weapon === 'improved') risk -= 0.1;
  if (gear.armor && gear.armor !== 'none') risk -= 0.04;
  const vehicleId = explorer.vehicleId || state.equipment?.vehicleId;
  const veh = findVehicle(content, vehicleId);
  if (veh && vehicleUsable(state, vehicleId)) risk -= (veh.protection || 0) * 0.02;
  if (state.weather === 'storm' || state.weather === 'fog') risk += 0.08;
  if (zone.state === 'hostile') risk += 0.06;
  if (zone.state === 'contested') risk += 0.1;
  if (zone.state === 'controlled') risk = Math.max(0.08, risk - 0.12);
  const center = expeditionCenterBonus(state);
  risk += center.riskDelta || 0;
  risk = clamp(risk, 0.05, 0.95);
  const camp = state.zones.find((z) => z.type === 'camp') || state.zones[0];
  const dist = camp
    ? Math.hypot((zone.x || 0) - (camp.x || 0), (zone.y || 0) - (camp.y || 0))
    : 20;
  let days = content.balance.expeditionBaseDurationDays || 1;
  if (dist > 28) days += 1;
  if (dist > 42) days += 1;
  if (zone.state === 'hostile' || zone.state === 'contested') days += 1;
  if (zone.state === 'unknown') days += 1;
  if (veh?.speedBonus && vehicleUsable(state, vehicleId)) {
    days = Math.max(1, Math.round(days * (1 - veh.speedBonus)));
  }
  if (center.daysDelta) days = Math.max(1, days + center.daysDelta);
  const lootBias = lootSk >= fight + 1;
  const controlBias = explore >= lootSk && !lootBias;
  const hints = lootHintKeys(zone, content);
  const fuel =
    veh && vehicleUsable(state, vehicleId)
      ? tripFuelCost(state, content, vehicleId)
      : content.balance.expeditionFuelCost ?? 0;
  return {
    risk,
    category: riskCategory(risk),
    days,
    fuel,
    distance: Math.round(dist),
    lootHint: hints.slice(0, 4),
    residual: zone.state === 'controlled',
    explorerName: explorer.name,
    explorerStatus: explorer.status,
    vehicleId: vehicleUsable(state, vehicleId) ? vehicleId : null,
    vehicleLabel: veh && vehicleUsable(state, vehicleId) ? veh.name : 'A pie',
    vehicleEffects: veh && vehicleUsable(state, vehicleId) ? vehicleEffectSummary(veh) : 'A pie',
    centerLabel: center.label,
    slotsHint: center.slotsBonus
      ? `Slots explorador (centro +${center.slotsBonus})`
      : null,
    focus: lootBias ? 'saqueo' : controlBias ? 'control' : 'equilibrado',
    note:
      zone.state === 'controlled'
        ? 'Zona controlada: solo loot residual'
        : zone.state === 'contested'
          ? 'En disputa: reconsolidar control'
          : lootBias
            ? 'Perfil saqueo: más botín, menos control'
            : controlBias
              ? 'Perfil control: más progreso territorial'
              : 'Perfil equilibrado',
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
  let vehicleId = explorer.vehicleId || state.equipment?.vehicleId || null;
  if (vehicleId && !vehicleUsable(state, vehicleId)) {
    return { ok: false, error: 'Ese vehículo necesita reparación' };
  }
  if (vehicleId && !(state.vehiclesOwned || []).includes(vehicleId)) {
    vehicleId = null;
  }
  const payFuel = tripFuelCost(state, content, vehicleId);
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
    departDay: state.day,
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
  const vehNote = preview.vehicleLabel && preview.vehicleLabel !== 'A pie' ? ` · ${preview.vehicleLabel}` : '';
  pushLog(
    state,
    `${explorer.name} parte hacia ${zone.name} (riesgo ${preview.category}${vehNote}).`,
    'info'
  );
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
  const roll = rng.float(0.78, 1.22) * ratio;
  if (roll >= 1.4) return 'clean';
  if (roll >= 1.05) return 'wounded';
  if (roll >= 0.85) return 'pyrrhic';
  if (roll >= 0.62) return 'retreat';
  return 'fail';
}

/** ZZ-022: primeras salidas (D≤5 o ≤2 expediciones) — sin muerte automática por fail. */
function softenEarlyOutcome(state, outcome) {
  const early = (state.day || 1) <= 5 || (state.stats?.expeditions || 0) <= 2;
  if (!early) return outcome;
  if (outcome === 'fail') return 'retreat';
  if (outcome === 'pyrrhic') return 'wounded';
  return outcome;
}

function resolveOneExpedition(state, content, ex) {
  const rng = rngOf(state);
  const zone = state.zones.find((z) => z.id === ex.zoneId);
  const explorer = (state.explorers || []).find((e) => e.id === ex.explorerId);
  const report = {
    zoneId: ex.zoneId,
    zoneName: zone?.name || 'zona',
    explorerId: ex.explorerId,
    explorerName: explorer?.name || 'Explorador',
    outcome: 'lost',
    loot: {},
    wounded: false,
    dead: false,
    controlled: false,
    revealed: [],
    lines: [],
  };
  if (!zone || !explorer || explorer.status === 'dead') {
    pushLog(state, 'Una expedición se pierde en el silencio.', 'bad');
    report.lines.push('La expedición se pierde en el silencio.');
    report.dead = true;
    return report;
  }

  const explore = explorer.skills.explore || 1;
  const fight = explorer.skills.fight || 1;
  const lootSk = explorer.skills.loot || 1;
  const resist = explorer.skills.resist || 1;

  // ZZ-104: placeState × encounter × choice (auto según foco del explorador)
  const encounter = pickExpeditionEncounter(state, zone, rng);
  const lootBias = lootSk >= fight + 1;
  const controlBias = explore >= lootSk && !lootBias;
  const preferred =
    encounter.choices.find((c) =>
      lootBias ? c.id === 'loot' || c.id === 'trust' || c.id === 'fight' : false
    ) ||
    encounter.choices.find((c) =>
      controlBias ? c.id === 'secure' || c.id === 'push' || c.id === 'clear' || c.id === 'hold' : false
    ) ||
    encounter.choices[0];
  const encMods = applyEncounterChoice(preferred);
  report.encounter = encounter;
  report.choice = preferred;
  report.lines.push(`${encounter.text} → ${preferred?.label || 'seguir'}`);
  pushLog(state, `${explorer.name} en ${zone.name}: ${encounter.text}`, 'info');

  let teamPower =
    fight * 5 + explore * 2 + resist * 2 + 4 + (state.resources.ammo || 0) * 0.4;
  if (ex.weapon === 'basic') teamPower += 6;
  if (ex.weapon === 'improved') teamPower += 12;
  if (ex.armor === 'light') teamPower += 3;
  if (ex.armor === 'heavy') teamPower += 7;
  const support = Math.min(4, Math.floor((state.population?.labor?.idle || 0) * 0.15));
  teamPower += support * 2;
  teamPower *= 1 + Math.max(-0.2, Math.min(0.25, -(encMods.riskMod || 0)));

  const enemyPower = 4 + zone.infectedLeft * 3 + zone.risk * 20 * (1 + (encMods.riskMod || 0));
  let outcome = softenEarlyOutcome(state, resolveCombat(rng, teamPower, enemyPower));
  report.outcome = outcome;

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
    report.dead = true;
    report.lines.push(`${explorer.name} no vuelve de ${zone.name}.`);
    return report;
  }

  if (outcome === 'retreat') {
    explorer.status = 'wounded';
    explorer.wounds = (explorer.wounds || 0) + (content.balance?.health?.explorerWoundDaysBase || 2);
    report.wounded = true;
    gainExplorerSkill(explorer, 'resist', 1, content.balance);
    const scraps = rollLoot(rng, { wood: [0, 2], metal: [0, 2], food: [0, 1] }, 0.15);
    Object.entries(scraps).forEach(([k, v]) => {
      state.resources[k] = (state.resources[k] || 0) + v;
    });
    report.loot = scraps;
    const scrapTxt = Object.entries(scraps)
      .map(([k, v]) => `${v} ${RES_LABEL[k] || k}`)
      .join(', ');
    const line = `${explorer.name} se retira de ${zone.name}. Herido${scrapTxt ? `; trae ${scrapTxt}` : ''}.`;
    pushLog(state, line, 'warn');
    report.lines.push(line);
    return report;
  }

  if (outcome === 'wounded' || outcome === 'pyrrhic') {
    explorer.status = 'wounded';
    const baseW = content.balance?.health?.explorerWoundDaysBase || 2;
    explorer.wounds = (explorer.wounds || 0) + (outcome === 'pyrrhic' ? baseW + 1 : baseW);
    report.wounded = true;
    const early = (state.day || 1) <= 5 || (state.stats?.expeditions || 0) <= 2;
    if (!early && rng.chance(0.08 - resist * 0.012)) {
      killExplorer(state, explorer, content.balance);
      state.stats.explorersLost = (state.stats.explorersLost || 0) + 1;
      state.stats.deaths += 1;
      pushLog(state, `${explorer.name} cae limpiando ${zone.name}.`, 'bad');
      report.dead = true;
      report.lines.push(`${explorer.name} cae limpiando ${zone.name}.`);
      return report;
    }
    pushLog(
      state,
      outcome === 'pyrrhic'
        ? `${explorer.name} vuelve muy herido de ${zone.name}, pero con botín.`
        : `${explorer.name} vuelve herido de ${zone.name}.`,
      'warn'
    );
  } else {
    explorer.status = 'ready';
  }

  zone.infectedLeft = Math.max(0, zone.infectedLeft - rng.int(1, 2 + Math.floor(fight / 2)));
  const typeLoot = lootSpecForZone(zone, content);
  const lootSkAdj = lootSk;
  const lootMapRaw = {};
  Object.entries(typeLoot).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      lootMapRaw[k] = [
        v[0],
        Math.max(v[1], Math.ceil(v[1] + lootSkAdj * 0.25)),
      ];
    } else {
      const n = typeof v === 'number' ? v : 1;
      lootMapRaw[k] = [Math.max(0, Math.floor(n)), Math.max(1, Math.ceil(n + 1 + lootSkAdj * 0.35))];
    }
  });
  const lootMap = scaleLootSpecForZoneState(zone, lootMapRaw);
  if (!Object.keys(lootMap).length) {
    lootMap.food = [0, 2];
    lootMap.metal = [0, 2];
  }
  const veh = findVehicle(content, ex.vehicleId);
  const lootFocus = lootSk >= fight + 1;
  const controlFocus = explore >= lootSk && !lootFocus;
  let cargoBonus =
    (veh?.cargoBonus || 0) +
    (lootFocus ? 0.35 : 0) +
    (zone.risk > 0.5 ? 0.2 : 0) +
    (encMods.lootMod || 0);
  if (outcome === 'pyrrhic') cargoBonus += 0.15;
  if (zone.state === 'controlled') cargoBonus *= 0.5;
  if ((state.research?.unlocked || []).includes('pack_mules')) cargoBonus += 0.15;
  markVehicleTrip(state, ex.vehicleId);
  const loot = rollLoot(rng, lootMap, cargoBonus);
  if (loot.scrap) {
    loot.metal = (loot.metal || 0) + loot.scrap;
    delete loot.scrap;
  }
  // Rare hallazgo sesgado por tipo
  const rarePool =
    content.locationsDoc?.locationTypes?.[zone.type]?.lootTable?.rare ||
    ['medicine', 'ammo', 'parts', 'tools', 'fuel'];
  if (zone.state !== 'controlled' && rng.chance(0.12 + explore * 0.02)) {
    const rare = rng.pick(rarePool);
    loot[rare] = (loot[rare] || 0) + rng.int(1, 2);
    pushLog(state, `Hallazgo inesperado en ${zone.name}: ${RES_LABEL[rare] || rare}.`, 'good');
  }
  Object.entries(loot).forEach(([k, v]) => {
    state.resources[k] = (state.resources[k] || 0) + v;
  });
  if (zone.state === 'controlled') applyLootDepletion(zone, 0.1);
  report.loot = loot;
  const lootTxt = Object.entries(loot)
    .map(([k, v]) => `${v} ${RES_LABEL[k] || k}`)
    .join(', ');
  const residualNote = zone.state === 'controlled' ? ' (residual)' : '';
  const lootLine = `${explorer.name} regresa de ${zone.name}: ${lootTxt || 'casi nada'}${residualNote}.`;
  pushLog(state, lootLine, 'good');
  report.lines.push(lootLine);
  if (report.wounded) {
    report.lines.push(
      outcome === 'pyrrhic' ? 'Vuelve muy herido, pero con botín.' : 'Vuelve herido.'
    );
  }

  if (zone.state === 'discovered' || zone.state === 'hostile' || zone.state === 'contested') {
    let ctrlGain = 0.28 + explore * 0.035;
    if (controlFocus) ctrlGain += 0.14;
    if (lootFocus) ctrlGain -= 0.08;
    if (outcome === 'clean') ctrlGain += 0.06;
    if (zone.state === 'contested') ctrlGain += 0.1;
    ctrlGain += encMods.controlMod || 0;
    zone.controlProgress = Math.min(1, (zone.controlProgress || 0) + ctrlGain);
    if (zone.state === 'contested') {
      trySecureContested(state, zone, content, report);
    } else if (zone.infectedLeft <= 0 && zone.controlProgress >= (content.balance.controlClearThreshold || 0.55)) {
      zone.state = 'controlled';
      zone.controlProgress = 1;
      zone.lootDepletion = 0;
      report.controlled = true;
      state.stats.zonesControlled = state.zones.filter((z) => z.state === 'controlled').length;
      state.stats.maxControlled = Math.max(state.stats.maxControlled, state.stats.zonesControlled);
      state.stability += 4;
      pushLog(state, `¡${zone.name} pasa a control de Zona Zero!`, 'good');
      report.lines.push(`${zone.name} pasa a control de Zona Zero.`);
      (zone.neighbors || []).forEach((nid) => {
        const n = state.zones.find((z) => z.id === nid);
        if (n && n.state === 'unknown') {
          n.state = 'discovered';
          report.revealed.push(n.name);
          pushLog(state, `Rutas revelan ${n.name}.`, 'info');
        }
      });
    } else if (zone.state !== 'controlled' && zone.state !== 'contested') {
      zone.state = zone.risk >= 0.45 ? 'hostile' : 'discovered';
    }
  }

  if (rng.chance(0.14 + explore * 0.03)) {
    const unk = state.zones.find((x) => x.state === 'unknown');
    if (unk) {
      unk.state = 'discovered';
      report.revealed.push(unk.name);
      pushLog(state, `${explorer.name} cartografía ${unk.name} de camino.`, 'info');
    }
  }

  if (rng.chance(0.1)) {
    const cap = housingCapacity(state, content.buildings);
    if ((state.population?.total || 0) < cap && (state.population?.total || 0) < maxSurvivorsCap(content.balance)) {
      changePopulation(state, 1, content.balance, 'immigrant');
      pushLog(state, `Rescatáis a alguien en ${zone.name}. Población +1.`, 'good');
      report.lines.push('Rescatáis a alguien. Población +1.');
    }
  }

  // ZZ-100+: progreso de misiones
  ensureMissions(state);
  if (report.revealed?.length) {
    bumpMissionProgress(state, content, (a) => a.objective === 'discover_zones', report.revealed.length);
  }
  if (report.controlled) {
    bumpMissionProgress(state, content, (a) => a.objective === 'control_zone', 1);
  }
  if ((loot.food || 0) > 0) {
    bumpMissionProgress(
      state,
      content,
      (a) => a.objective === 'loot_food' && (!a.zoneType || a.zoneType === zone.type),
      1
    );
  }
  if ((loot.water || 0) > 0) {
    bumpMissionProgress(state, content, (a) => a.objective === 'loot_water', 1);
  }
  if ((loot.medicine || 0) > 0) {
    bumpMissionProgress(
      state,
      content,
      (a) => a.objective === 'loot_medicine' && (!a.zoneType || a.zoneType === zone.type),
      1
    );
  }
  if (zone.radioTagged || encounter.placeState === 'radio_tagged') {
    bumpMissionProgress(state, content, (a) => a.objective === 'visit_tagged', 1);
  }

  return report;
}

export function resolveExpedition(state, content) {
  if (!state.expeditions) state.expeditions = [];
  if (state.expedition && !state.expeditions.find((x) => x.id === state.expedition.id)) {
    state.expeditions.push(state.expedition);
  }
  const due = state.expeditions.filter((ex) => state.day >= ex.returnDay);
  const reports = due.map((ex) => resolveOneExpedition(state, content, ex)).filter(Boolean);
  state.expeditions = state.expeditions.filter((ex) => state.day < ex.returnDay);
  state.expedition = state.expeditions[0] || null;

  livingExplorers(state).forEach((e) => {
    if (e.status === 'wounded' && !e.expeditionId) {
      const cfg = content.balance?.health || {};
      let step = 1;
      if ((state.resources.medicine || 0) >= (cfg.explorerMedCost || 1) && (e.wounds || 0) > 0) {
        state.resources.medicine -= cfg.explorerMedCost || 1;
        step += cfg.explorerMedsShorten || 1;
      }
      e.wounds = Math.max(0, (e.wounds || cfg.explorerWoundDaysBase || 2) - step);
      if (e.wounds <= 0) e.status = 'ready';
    }
  });
  state.lastExpeditionReports = reports;
  return reports;
}

function applyProduction(state, content) {
  syncLaborFromColony(state, content);
  const stabMod = clamp(0.6 + state.stability / 200, 0.6, 1.15);
  const weatherMod =
    state.weather === 'blizzard'
      ? 0.65
      : state.weather === 'storm'
        ? 0.75
        : state.weather === 'heat' || state.weather === 'cold'
          ? 0.85
          : state.weather === 'rain'
            ? 0.92
            : 1;

  const produced = {};
  const byBuilding = [];

  state.base.buildings.forEach((b) => {
    if (b.hp <= 0) return;
    const def = content.buildings[b.type];
    if (!def) return;
    // Energía eléctrica fuera de alcance v1 (needEnergy:false)
    if (!def.produces) return;
    const jobs = Math.max(1, def.jobs || 1);
    const staff = Math.max(0, b.workers || 0);
    // Sin trabajadores → 0 producción (el edificio solo no alimenta)
    if (staff <= 0) {
      byBuilding.push({ id: b.id, type: b.type, name: def.name, workers: 0, out: {} });
      return;
    }
    const ratio = clamp(staff / jobs, 0.15, 1.15);
    const out = {};
    Object.entries(def.produces).forEach(([k, v]) => {
      let mult = buildingOutputMult(b, content);
      // Outdoor food hurt more in cold/blizzard; greenhouse resists
      if (k === 'food' && b.type === 'farm' && (state.weather === 'cold' || state.weather === 'blizzard')) {
        mult *= state.weather === 'blizzard' ? 0.55 : 0.75;
      }
      if (k === 'food' && b.type === 'greenhouse' && (state.weather === 'cold' || state.weather === 'blizzard')) {
        mult *= 0.95;
      }
      if (k === 'water' && b.type === 'well' && (state.weather === 'storm' || state.weather === 'heat')) {
        mult *= state.weather === 'heat' ? 0.8 : 0.85;
      }
      // ZZ-063: ammo_craft / ammoEfficiency
      if (k === 'ammo') {
        const eff = sumTechEffect(state, content, 'ammoEfficiency');
        if (eff) mult *= 1 + eff;
        else if ((state.research?.unlocked || []).includes('ammo_craft')) mult *= 1.2;
      }
      if (k === 'food') {
        let foodB = sumTechEffect(state, content, 'foodProdBonus');
        if (b.type === 'greenhouse' && (state.research?.unlocked || []).includes('greenhouse_tech')) {
          foodB += 0.05;
        }
        if (foodB) mult *= 1 + foodB;
      }
      if (k === 'water') {
        const wb = sumTechEffect(state, content, 'waterProdBonus');
        if (wb) mult *= 1 + wb;
      }
      if (k === 'metal') {
        const mb = sumTechEffect(state, content, 'metalProdBonus');
        if (mb) mult *= 1 + mb;
      }
      const amt = Math.max(0, Math.round(v * ratio * stabMod * weatherMod * mult));
      if (amt <= 0) return;
      out[k] = amt;
      produced[k] = (produced[k] || 0) + amt;
      state.resources[k] = (state.resources[k] || 0) + amt;
    });
    byBuilding.push({ id: b.id, type: b.type, name: def.name, workers: staff, out });
  });

  const hasFarm = state.base.buildings.some((b) => ['farm', 'greenhouse', 'kitchen'].includes(b.type) && b.hp > 0);
  const hasWell = state.base.buildings.some((b) => ['well', 'pump'].includes(b.type) && b.hp > 0);
  void hasFarm;
  void hasWell;

  // Lluvia → cisternas (recogida pasiva ZZ-034)
  if (state.weather === 'rain' || state.weather === 'storm') {
    const rng = rngOf(state);
    state.base.buildings.forEach((b) => {
      if (b.hp <= 0) return;
      const def = content.buildings[b.type];
      if (!def?.rainCollect) return;
      const gain = rng.int(1, state.weather === 'storm' ? 4 : 3);
      state.resources.water = (state.resources.water || 0) + gain;
      produced.water = (produced.water || 0) + gain;
    });
  }

  // Soft-caps: almacén general + cisterna (agua)
  const pop = Math.max(1, state.population?.total || 1);
  const storageN = state.base.buildings.filter((b) => ['storage', 'warehouse'].includes(b.type) && b.hp > 0).length;
  const cisternBonus = state.base.buildings
    .filter((b) => b.hp > 0)
    .reduce((n, b) => n + (content.buildings[b.type]?.waterStorageBonus || 0), 0);
  const softFood = content.balance.foodSoftCapDays || 10;
  const softWater = content.balance.waterSoftCapDays || softFood;
  const foodCap = pop * softFood + storageN * 18;
  const waterCap = pop * softWater + storageN * 16 + cisternBonus;
  if ((state.resources.food || 0) > foodCap) {
    const excess = state.resources.food - foodCap;
    const spoilRed = Math.min(0.8, sumTechEffect(state, content, 'spoilReduction'));
    const lost = Math.max(1, Math.ceil(excess * 0.2 * (1 - spoilRed)));
    state.resources.food -= lost;
    if (lost >= 3) pushLog(state, `Comida se estropea sin almacenaje (−${lost}).`, 'warn');
  }
  if ((state.resources.water || 0) > waterCap) {
    const excess = state.resources.water - waterCap;
    // Cisterna reduce merma de agua
    const spoil = cisternBonus > 0 ? 0.08 : 0.15;
    const lost = Math.max(1, Math.ceil(excess * spoil));
    state.resources.water -= lost;
    if (lost >= 3) pushLog(state, `Agua se pierde sin suficiente reserva (−${lost}).`, 'warn');
  }

  // ZZ-180: no persistir energy (fuera de alcance v1)
  if (state.energy) delete state.energy;
  return { produced, byBuilding, foodCap, waterCap };
}

function fuelNeed(state, content) {
  // ZZ-043: sin gasto diario de fuel de colonia (fuel = vehículos).
  if (content.balance.colonyDailyFuelEnabled === false) return 0;
  let need = content.balance.fuelPerDayBase || 0.5;
  const pop = state.population?.total || 0;
  need += pop * (content.balance.fuelPerPersonPerDay || content.balance.fuelPerSurvivorPerDay || 0.08);
  state.base.buildings.forEach((b) => {
    const def = content.buildings[b.type];
    if (def?.fuelSave) need = Math.max(0, need - def.fuelSave);
  });
  return Math.ceil(need);
}

/** Calefacción madera + exposición acumulativa (ZZ-043/044). */
function applyColdWoodHeating(state, content) {
  const w = state.weather;
  const wh = content.balance.woodHeating || {};
  if (w !== 'cold' && w !== 'blizzard') {
    // Decay exposición al salir del frío
    if ((state.coldExposure || 0) > 0) {
      state.coldExposure = Math.max(0, (state.coldExposure || 0) - (wh.exposureDecay || 1));
    }
    state.lastHeating = { active: false, need: 0, consumed: 0, shortfall: 0 };
    return state.lastHeating;
  }
  const pop = state.population?.total || 0;
  if (pop <= 0) {
    state.lastHeating = { active: true, need: 0, consumed: 0, shortfall: 0 };
    return state.lastHeating;
  }
  const cov = housingClimateCoverage(state, content.buildings, content.balance, w);
  const need = cov.woodNeed;
  const have = state.resources.wood || 0;
  const consumed = Math.min(have, need);
  state.resources.wood = have - consumed;
  const shortfall = need - consumed;
  if (consumed > 0) {
    pushLog(state, `Calefacción: −${consumed} madera.`, 'info', { routine: true });
  }
  if (shortfall > 0) {
    state.coldExposure = (state.coldExposure || 0) + (wh.exposurePerShortfall || 1) * Math.min(3, shortfall);
    pushLog(state, 'Falta madera para calentar el refugio. Sube la exposición al frío.', 'warn');
  } else if ((state.coldExposure || 0) > 0) {
    state.coldExposure = Math.max(0, (state.coldExposure || 0) - (wh.exposureDecay || 1));
  }

  const amber = wh.exposureThresholds?.amber ?? 2;
  const red = wh.exposureThresholds?.red ?? 5;
  const exp = state.coldExposure || 0;
  const rng = rngOf(state);
  if (exp >= red && rng.chance(wh.sickChanceRed ?? 0.28)) {
    applyCasualties(state, content.balance, { injured: 0 });
    state.population.sick = (state.population.sick || 0) + 1;
    pushLog(state, 'El frío extremo enferma a alguien.', 'bad');
  } else if (exp >= amber && rng.chance(wh.sickChanceAmber ?? 0.12)) {
    state.population.sick = (state.population.sick || 0) + 1;
    pushLog(state, 'El frío empieza a pasar factura. +1 enfermo.', 'warn');
  }

  state.lastHeating = {
    active: true,
    need,
    consumed,
    shortfall,
    weather: w,
    covered: cov.covered,
    deficit: cov.deficit,
    threshold: cov.threshold,
    reserveDays: woodReserveDays(state, need),
    exposure: exp,
  };
  return state.lastHeating;
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
  const loss = Math.min(1, Math.max(0, Math.ceil(missing / 3)));
  const softRate = balance.starvationLossPerDay ?? 0.55;
  const hasProd =
    state.base.buildings.some((b) => ['farm', 'greenhouse', 'well'].includes(b.type) && b.hp > 0);
  // Sin producción: hambre duele, pero no ejecuta cada noche (permite recuperarse con botín)
  const softDead =
    missing >= 2 &&
    loss &&
    rngOf(state).chance(hasProd ? softRate : softRate * 0.55)
      ? 1
      : 0;
  const pop = state.population?.total || 0;
  // Última persona puede caer por hambre prolongada (no inmunidad)
  let dead = 0;
  if (softDead) {
    if (pop > 1) dead = 1;
    else if (pop === 1) dead = rngOf(state).chance(missing >= 2 ? 0.5 : 0.25) ? 1 : 0;
  }
  applyCasualties(state, balance, { dead, injured: Math.max(dead ? 0 : 1, loss) });
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
  state.director.recentLosses = Math.max(0, (state.director.recentLosses || 0) - 1);
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
    state.stability >= 48 &&
    (state.resources.food || 0) > pop * 2.5
  ) {
    if (rng.chance(bal.birthChance || 0.11)) {
      changePopulation(state, 1, bal, 'birth');
      pushLog(state, 'Nueva vida en el refugio. Población +1.', 'good');
    }
  }

  if (
    rng.chance((bal.immigrantBaseChance || 0.07) * 0.55) &&
    pop < cap &&
    pop < max &&
    state.stability >= 50 &&
    state.stats.zonesControlled >= 3 &&
    (state.resources.food || 0) >= pop * 2.5 &&
    (state.resources.water || 0) >= pop * 2.5
  ) {
    changePopulation(state, 1, bal, 'immigrant');
    pushLog(state, 'Llega gente buscando refugio. Población +1.', 'good');
  }

  redistributeLabor(state, bal);
  syncLaborFromColony(state, content);
}

export { resolveBaseAttack, schedulePendingAttack, composeHorde, formatHordeLabel } from './combat.js';
export {
  startRepair,
  repairQuote,
  buildingsNeedingRepair,
  buildingStructuralState,
  buildingOutputMult,
  perimeterIntegrity,
  applyBuildingDamage,
} from './buildings-damage.js';
export {
  controlBenefits,
  lootSpecForZone,
  zoneStateLabel,
  loseFrontierZone,
} from './territory.js';
export {
  techBenefitText,
  hasResearchBench,
  researchWorkers,
  researchProgressPerDay,
  assertNoEnergyBranch,
  findTech,
  allTechs,
} from './research.js';

export function tickResearch(state, content) {
  if (!state.research.active) return;
  const tech = findTech(content, state.research.active);
  if (!tech) {
    state.research.active = null;
    return;
  }
  const step = researchProgressPerDay(state);
  state.research.progress += step;
  if (state.research.progress >= (tech.days || 3)) {
    state.research.unlocked.push(tech.id);
    state.research.active = null;
    state.research.progress = 0;
    pushLog(state, `Investigación completada: ${tech.name}.`, 'good');
    if (tech.effects?.unlockBuilding) {
      pushLog(state, `Desbloqueado: ${tech.effects.unlockBuilding}.`, 'good');
    }
    if (tech.effects?.vehicleUnlock) {
      state.flags.narrative[`veh_${tech.effects.vehicleUnlock}`] = true;
    }
  }
}

export function startResearch(state, content, techId) {
  const tech = findTech(content, techId);
  if (!tech) return { ok: false, error: 'Tecnología desconocida' };
  if ((state.research.unlocked || []).includes(techId)) return { ok: false, error: 'Ya investigada' };
  if (state.research.active) return { ok: false, error: 'Ya hay una investigación en curso' };
  if ((tech.minEra || 0) > state.era) return { ok: false, error: 'Era insuficiente' };
  if (tech.requires?.some((r) => !(state.research.unlocked || []).includes(r))) {
    return { ok: false, error: 'Faltan requisitos' };
  }
  if (!hasResearchBench(state)) {
    return { ok: false, error: 'Necesitás un banco técnico (o laboratorio)' };
  }
  if (!canAfford(state, tech.cost)) return { ok: false, error: 'Recursos insuficientes' };
  payCost(state, tech.cost);
  state.research.active = techId;
  state.research.progress = 0;
  pushLog(state, `Investigáis: ${tech.name}.`, 'info');
  return { ok: true };
}

export function buyVehicle(state, content, vehicleId) {
  const v = findVehicle(content, vehicleId);
  if (!v) return { ok: false, error: 'Vehículo desconocido' };
  if (state.vehiclesOwned.includes(vehicleId)) return { ok: false, error: 'Ya lo tenéis' };
  if ((v.minEra || 0) > state.era) return { ok: false, error: 'Era insuficiente' };
  const needTech = allTechs(content).find((t) => t.effects?.vehicleUnlock === vehicleId);
  if (needTech && !(state.research.unlocked || []).includes(needTech.id)) {
    return { ok: false, error: `Requiere investigación: ${needTech.name}` };
  }
  if (vehicleId !== 'bike' && !hasGarage(state)) return { ok: false, error: 'Hace falta un garaje' };
  if (!canAfford(state, v.cost)) return { ok: false, error: 'Recursos insuficientes' };
  payCost(state, v.cost);
  state.vehiclesOwned.push(vehicleId);
  if (!state.vehicleMeta) state.vehicleMeta = {};
  state.vehicleMeta[vehicleId] = { trips: 0, needsRepair: false, wear: 0 };
  pushLog(state, `Disponible: ${v.name}.`, 'good');
  return { ok: true };
}

export { repairVehicle };

export function updateEra(state, content) {
  updateEraByIndicators(state, content);
}

export function checkVictory(state, content) {
  checkVictoryMulti(state, content);
}

function checkDefeat(state) {
  checkDefeatState(state);
}

export function advanceDay(state, content) {
  if (state.flags.defeated) return { ok: false, error: 'Partida terminada' };
  if (state.flags.victory && !state.flags.endless) {
    return { ok: false, error: 'Victoria alcanzada. Continuad en modo endless o nueva partida.' };
  }

  const before = {
    food: state.resources.food || 0,
    water: state.resources.water || 0,
    wood: state.resources.wood || 0,
    metal: state.resources.metal || 0,
    pop: state.population?.total || 0,
    threat: state.director?.threat || 0,
    expeditions: (state.expeditions || []).map((e) => ({ ...e })),
  };

  syncLaborFromColony(state, content);
  const expeditionReports = resolveExpedition(state, content) || [];
  // Limpiar flash de ataque del día anterior
  (state.zones || []).forEach((z) => {
    z._attackFlash = false;
  });
  if (state.flags) state.flags.lastAttackZoneId = null;

  const pop = state.population?.total || 0;
  let foodNeed = pop * (content.balance.foodPerPersonPerDay || content.balance.foodPerSurvivorPerDay || 1);
  let waterNeed = pop * (content.balance.waterPerPersonPerDay || content.balance.waterPerSurvivorPerDay || 1);
  if (state.weather === 'heat') waterNeed = Math.ceil(waterNeed * 1.25);
  consumeNeed(state, 'food', foodNeed, 'comida', content.balance);
  consumeNeed(state, 'water', waterNeed, 'agua', content.balance);

  const heating = applyColdWoodHeating(state, content);

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

  const prod = applyProduction(state, content) || { produced: {}, byBuilding: [] };
  healPopulationTick(state, content.balance, content);
  tickOutbreak(state, content);
  tickResearch(state, content);
  tickMissions(state, content);
  tickAchievements(state, content);
  tickBuildingRepairs(state, content);
  {
    const wrng = rngOf(state);
    tickWeatherStructureDamage(state, content, wrng);
  }

  if (state.weatherDaysLeft > 0) {
    state.weatherDaysLeft -= 1;
    if (state.weatherDaysLeft <= 0) state.weather = 'clear';
  }

  state.day += 1;
  tickSeason(state, content.balance);
  tickPendingWeather(state);
  const recoveredSectors = tickSectorRecovery(state);
  recoveredSectors.forEach((s) => {
    pushLog(state, `Hemos recuperado «${s.name}». La colonia crece — y el perímetro también.`, 'good');
  });
  // ZZ-153: no spam diario con «Amanece…» cada día
  if (state.day === 1 || state.day % 7 === 0) {
    pushLog(state, `Amanece el día ${state.day}.`, 'story', { routine: state.day !== 1 });
  }

  updateStability(state, content);
  populationTick(state, content);
  updateEra(state, content);

  const wasProtected = state.day < (state.director.protectionUntil || 0);
  const dir = runDirector(state, content);
  let attack = null;

  // ZZ-061: prep → resolve. Aviso previo salvo ataque inmediato ya programado.
  const pendingTick = tickPendingAttack(state);
  if (pendingTick?.due) {
    const p = pendingTick.pending;
    attack = resolveBaseAttack(state, content, p.intensity, {
      wasProtected,
      horde: p.horde,
    });
  } else if (dir?.attackIntensity && !state.pendingAttack) {
    const warnDays = content.balance?.attackWarnDays ?? 1;
    const optics = (state.research?.unlocked || []).includes('tower_optics');
    const canWarn = warnDays > 0 || optics;
    if (canWarn && dir.attackIntensity >= 1) {
      schedulePendingAttack(state, dir.attackIntensity, content, { source: 'director' });
    } else {
      attack = resolveBaseAttack(state, content, dir.attackIntensity, { wasProtected });
    }
  } else if (dir?.attackIntensity && state.pendingAttack) {
    // Ya hay aviso: subir intensidad al máximo anunciado
    state.pendingAttack.intensity = Math.max(
      state.pendingAttack.intensity || 1,
      Math.floor(dir.attackIntensity)
    );
  }

  checkVictory(state, content);
  checkDefeat(state);

  const brief = buildDayBrief(state, content, before, prod, {
    foodNeed,
    waterNeed,
    heating,
    dir,
    attack,
    recoveredSectors,
  });
  state.lastDayBrief = brief;

  state.rngState = (state.rngState || 1) + 17;
  return { ok: true, director: dir, attack, brief, recoveredSectors, heating, expeditionReports };
}

function buildDayBrief(state, content, before, prod, ctx) {
  const produced = prod?.produced || {};
  const foodGain = Math.round((produced.food || 0) * 10) / 10;
  const waterGain = Math.round((produced.water || 0) * 10) / 10;
  const woodGain = Math.round((produced.wood || 0) * 10) / 10;
  const foodNeed = Math.round((ctx.foodNeed || 0) * 10) / 10;
  const waterNeed = Math.round((ctx.waterNeed || 0) * 10) / 10;
  const foodBal = Math.round((foodGain - foodNeed) * 10) / 10;
  const waterBal = Math.round((waterGain - waterNeed) * 10) / 10;

  const facts = [];

  const returning = (before.expeditions || []).filter((e) => e.returnDay === state.day);
  returning.forEach((e) => {
    const ex = (state.explorers || []).find((x) => x.id === e.explorerId);
    if (!ex) return;
    if (ex.status === 'wounded' || (ex.wounds || 0) > 0) {
      facts.push({ kind: 'explore', text: `${ex.name} ha vuelto herido, pero con botín.` });
    } else {
      facts.push({ kind: 'explore', text: `${ex.name} ha regresado de la expedición.` });
    }
  });
  // Expediciones en curso
  (state.expeditions || []).forEach((e) => {
    const left = e.returnDay - state.day;
    const ex = (state.explorers || []).find((x) => x.id === e.explorerId);
    const zone = (state.zones || []).find((z) => z.id === e.zoneId);
    if (ex && left >= 1) {
      facts.push({
        kind: 'explore',
        text: left === 1 ? `${ex.name} vuelve mañana${zone ? ` de ${zone.name}` : ''}.` : `${ex.name} vuelve en ${left} días.`,
      });
    }
  });

  const dThreat = Math.round((state.director?.threat || 0) - (before.threat || 0));
  if (dThreat) facts.push({ kind: 'threat', text: `Amenaza ${dThreat > 0 ? '+' : ''}${dThreat}.` });

  const dPop = (state.population?.total || 0) - (before.pop || 0);
  if (dPop) facts.push({ kind: 'pop', text: `Población ${dPop > 0 ? '+' : ''}${dPop}.` });

  if (ctx.attack) {
    const a = ctx.attack;
    const dmg =
      a.damaged?.length > 0
        ? ` · daño: ${a.damaged.map((d) => d.name).join(', ')}`
        : '';
    facts.push({
      kind: 'attack',
      text:
        (a.result === 'win'
          ? 'Ataque repelido.'
          : a.result === 'messy'
            ? 'Ataque contenido con pérdidas.'
            : 'El perímetro ha cedido.') +
        (a.hordeLabel ? ` ${a.hordeLabel}.` : '') +
        ` −${a.ammoSpent ?? 0} munición` +
        dmg,
    });
  } else if (state.pendingAttack) {
    const p = state.pendingAttack;
    const d = Math.max(0, (p.arrivesOnDay || 0) - state.day);
    facts.push({
      kind: 'attack',
      text: `Hostiles en ${d} día(s) · int. ~${p.intensity}${p.horde?.label ? ` · ${p.horde.label}` : ''}.`,
    });
  } else if (ctx.dir?.event && !ctx.dir?.choice) {
    facts.push({ kind: 'event', text: ctx.dir.event.name || 'Algo ha ocurrido en la colonia.' });
  }

  (ctx.recoveredSectors || []).forEach((s) => {
    facts.push({ kind: 'build', text: `Territorio recuperado: ${s.name}.` });
  });

  (state.log || [])
    .filter((L) => L.day === state.day - 1 && /Construís|Mejoráis|Calefacción/.test(L.text || ''))
    .slice(0, 3)
    .forEach((L) => facts.push({ kind: L.text?.includes('Calefacción') ? 'heat' : 'build', text: L.text }));

  const heating = ctx.heating || {};
  const woodConsumed = Math.round((heating.consumed || 0) * 10) / 10;
  const woodBal = Math.round((woodGain - woodConsumed) * 10) / 10;
  const showWood = !!heating.active;
  if (heating.active && heating.covered != null) {
    facts.push({
      kind: 'heat',
      text: `Cobertura climática ${heating.covered}/${state.population?.total || 0} · reserva madera ${
        heating.reserveDays === Infinity ? '∞' : heating.reserveDays
      } d.`,
    });
  }
  if ((state.coldExposure || 0) >= 2) {
    facts.push({ kind: 'heat', text: `Exposición al frío: ${state.coldExposure}.` });
  }
  if (state.pendingWeather) {
    const p = state.pendingWeather;
    const d = Math.max(0, (p.startsOnDay || 0) - state.day);
    facts.push({
      kind: 'event',
      text: `${p.type === 'heat' ? 'Calor' : 'Frío'} anunciado en ${d} día(s).`,
    });
  }

  const important =
    Math.abs(foodBal) >= 0.1 ||
    Math.abs(waterBal) >= 0.1 ||
    (showWood && (woodConsumed > 0 || Math.abs(woodBal) >= 0.1)) ||
    facts.length > 0 ||
    foodGain > 0 ||
    waterGain > 0;

  const brief = {
    day: state.day,
    food: { produced: foodGain, consumed: foodNeed, balance: foodBal },
    water: { produced: waterGain, consumed: waterNeed, balance: waterBal },
    facts: facts.slice(0, 6),
    important: !!important,
  };
  if (showWood) {
    brief.wood = {
      produced: woodGain,
      consumed: woodConsumed,
      balance: woodBal,
      heating: true,
      shortfall: heating.shortfall || 0,
    };
  }
  brief.lines = [
    `Comida ${foodGain >= 0 ? '+' : ''}${foodGain} / −${foodNeed} → ${foodBal >= 0 ? '+' : ''}${foodBal}`,
    `Agua ${waterGain >= 0 ? '+' : ''}${waterGain} / −${waterNeed} → ${waterBal >= 0 ? '+' : ''}${waterBal}`,
    ...(showWood
      ? [`Madera ${woodGain >= 0 ? '+' : ''}${woodGain} / −${woodConsumed} calefacción → ${woodBal >= 0 ? '+' : ''}${woodBal}`]
      : []),
    ...facts.map((f) => f.text),
  ].slice(0, 8);
  return brief;
}

export function continueEndless(state) {
  return continueEndlessMode(state);
}

export { victoryConditions, endScreenStats };
export { applyEventEffects, riskCategory, readyExplorers };
export { medicalBeds, healthSemaphore, startOutbreak, tickOutbreak } from './outbreaks.js';
