/**
 * Director adaptativo + resolución de eventos
 * 1.2.2 — calma real, cooldown de crisis, recuperación post-catástrofe
 */
import { createRng } from './rng.js';
import {
  allLiving,
  pushLog,
  defenseValue,
  housingCapacity,
  scheduleOrApplyWeather,
} from './state.js';
import { changePopulation, applyCasualties, workforce } from './population.js';

function rngOf(state) {
  return createRng((state.rngState || 1) ^ (state.day * 7919));
}

function clampNum(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function colonyForce(state, content) {
  const pop = state.population?.total || workforce(state.population) || allLiving(state).length;
  const def = defenseValue(state, content.buildings, content.balance);
  const controlled = state.zones.filter((z) => z.state === 'controlled').length;
  const tech = (state.research.unlocked || []).length;
  const reserves =
    Math.min(30, (state.resources.food || 0) / 4) +
    Math.min(20, (state.resources.water || 0) / 4) +
    Math.min(12, (state.resources.ammo || 0));
  return pop * 2 + def + controlled * 4 + tech * 3 + reserves;
}

function fragility(state, content) {
  const pop = Math.max(1, state.population?.total || allLiving(state).length || 1);
  const foodDays = (state.resources.food || 0) / pop;
  const waterDays = (state.resources.water || 0) / pop;
  const wounded = (state.population?.injured || 0) + (state.population?.sick || 0);
  const cap = housingCapacity(state, content.buildings);
  let f = 0;
  if (foodDays < 2) f += 22;
  if (waterDays < 2) f += 22;
  f += wounded * 3;
  if (pop > cap) f += 12;
  f += Math.max(0, 40 - state.stability);
  f += (state.director.recentLosses || 0) * 6;
  return f;
}

function inProtection(state) {
  return state.day < (state.director.protectionUntil || 0);
}

function inCrisisCooldown(state, balance) {
  const last = state.director.lastCrisisDay;
  if (last == null) return false;
  return state.day - last < (balance.crisisCooldownDays || 5);
}

function updateIndices(state, content) {
  const force = colonyForce(state, content);
  const frag = fragility(state, content);
  state.director.force = Math.round(force);
  state.director.fragility = Math.round(frag);
  if (force > 40 && state.director.tension < 30) state.director.momentum = (state.director.momentum || 0) + 1;
  else state.director.momentum = Math.max(0, (state.director.momentum || 0) - 1);

  let t = state.director.tension || 10;
  t += (state.director.momentum || 0) * 0.75;
  t += frag * 0.055;
  t -= force * 0.018;
  if (state.day > 25) t += 0.25;
  if (state.day > 45) t += 0.4;
  if (state.day > 80) t += 0.55;
  if (inProtection(state)) t -= 2;
  if (state.day <= (content.balance.softCapThreatEarlyDays || 12)) t = Math.min(t, 30);
  if (state.day < 10) t = Math.min(t, 34);
  state.director.tension = clampNum(t, 0, 100);
  state.director.threat = Math.round(
    clampNum(8 + state.director.tension * 0.34 + state.era * 5 + frag * 0.1, 0, 100)
  );
}

function conditionsMet(ev, state, balance) {
  const c = ev.conditions || {};
  const pop = state.population?.total || allLiving(state).length;
  const controlled = state.zones.filter((z) => z.state === 'controlled').length;
  if (ev.minDay != null && state.day < ev.minDay) return false;
  if (ev.minEra != null && state.era < ev.minEra) return false;
  if (ev.maxEra != null && state.era > ev.maxEra) return false;
  if (c.minPop != null && pop < c.minPop) return false;
  if (c.maxPop != null && pop > c.maxPop) return false;
  if (c.minThreat != null && state.director.threat < c.minThreat) return false;
  if (c.maxThreat != null && state.director.threat > c.maxThreat) return false;
  if (c.minControlled != null && controlled < c.minControlled) return false;
  if (c.minStability != null && state.stability < c.minStability) return false;
  if (c.maxStability != null && state.stability > c.maxStability) return false;
  if (c.requiresFlag && !state.flags.narrative?.[c.requiresFlag]) return false;
  if (c.blocksFlag && state.flags.narrative?.[c.blocksFlag]) return false;
  if (c.requiresBuilding) {
    const need = Array.isArray(c.requiresBuilding) ? c.requiresBuilding : [c.requiresBuilding];
    const ok = need.some((t) => state.base.buildings.some((b) => b.type === t && b.hp > 0));
    if (!ok) return false;
  }
  if (state.day < (state.director.cooldowns?.[ev.id] || 0)) return false;
  if (ev.family && state.day < (state.director.familyCooldowns?.[ev.family] || 0)) return false;
  // Recuperación: bloquear solo crisis graves (int≥4)
  if (inProtection(state) && (ev.intensity || 0) >= 4) return false;
  if (inCrisisCooldown(state, balance || {}) && (ev.intensity || 0) >= 4) return false;
  return true;
}

function weightFor(ev, state, balance) {
  let w = ev.weight || 1;
  const recent = state.director.recentFamilies || [];
  const repeats = recent.filter((f) => f === ev.family).length;
  if (repeats) w *= Math.max(0.15, 1 - repeats * 0.35);
  if (ev.id === state.director.lastEventId) w *= 0.18;
  const budget = 1 + state.director.tension / 24 + state.era * 0.5;
  if (state.day < 18 && (ev.intensity || 0) >= 3) w *= 0.35;
  if (state.day < 10 && (ev.intensity || 0) >= 4) w *= 0.08;
  if ((ev.intensity || 0) > budget + 1.5) w *= 0.08;
  if ((ev.intensity || 0) === 0) w *= 1.1;
  // Amenazas medias (int 2) más presentes cuando hay tensión
  if ((ev.intensity || 0) === 2 && state.director.tension >= 28) w *= 1.25;
  if ((ev.intensity || 0) === 2 && (ev.family === 'ataques' || ev.family === 'infectados')) {
    w *= 1.15;
  }
  // Tras crisis: bloquea graves, deja pasar presión media atenuada
  if (inCrisisCooldown(state, balance) && (ev.family === 'ataques' || ev.family === 'catastrofes')) {
    w *= (ev.intensity || 0) >= 3 ? 0.25 : 0.55;
  }
  if (inProtection(state) && (ev.family === 'ataques' || ev.family === 'catastrofes')) {
    w *= (ev.intensity || 0) >= 3 ? 0.3 : 0.55;
  }
  if (inProtection(state) && (ev.intensity || 0) >= 4) w *= 0.05;
  if ((state.director.fragility || 0) < 20 && (ev.family === 'calma' || ev.family === 'oportunidad')) {
    w *= 1.15;
  }
  // Colonia muy débil: algo más de presión media (no wipe garantizado)
  if ((state.director.force || 0) < 28 && (ev.intensity || 0) === 2) {
    w *= 1.12;
  }
  return Math.max(0, w);
}

export function applyEventEffects(state, content, effects = {}, rng) {
  if (!effects) return { attackIntensity: 0 };
  let attackIntensity = 0;
  if (effects.loot) {
    Object.entries(effects.loot).forEach(([k, range]) => {
      const n = Array.isArray(range) ? rng.int(range[0], range[1]) : Number(range) || 0;
      if (n) state.resources[k] = (state.resources[k] || 0) + n;
    });
  }
  if (effects.threatDelta) state.director.threat = clampNum(state.director.threat + effects.threatDelta, 0, 100);
  if (effects.stabilityDelta) state.stability = clampNum(state.stability + effects.stabilityDelta, 0, 100);
  if (effects.tensionDelta) state.director.tension = clampNum(state.director.tension + effects.tensionDelta, 0, 100);
  if (effects.weather) {
    scheduleOrApplyWeather(state, content, effects.weather, rng);
  }
  if (effects.setFlag) state.flags.narrative[effects.setFlag] = true;
  if (effects.clearFlag) delete state.flags.narrative[effects.clearFlag];
  if (effects.damageSurvivor) {
    applyCasualties(state, content.balance, { injured: 1 });
  }
  if (effects.killSurvivorChance && rng.chance(effects.killSurvivorChance)) {
    applyCasualties(state, content.balance, { dead: 1 });
    state.director.recentLosses += 1;
    pushLog(state, 'Alguien no sobrevive al incidente.', 'bad');
  }
  if (effects.damageBuildingChance && rng.chance(effects.damageBuildingChance)) {
    const b = rng.pick(state.base.buildings.filter((x) => x.hp > 0));
    if (b) {
      b.hp -= rng.int(25, 60);
      pushLog(state, `Daños en ${content.buildings[b.type]?.name || b.type}.`, 'warn');
    }
  }
  if (effects.spawnSurvivorChance && rng.chance(effects.spawnSurvivorChance)) {
    changePopulation(state, 1, content.balance, 'immigrant');
    pushLog(state, 'Alguien se une al refugio. Población +1.', 'good');
  }
  if (effects.discoverZone) {
    const z = state.zones.find((x) => x.state === 'unknown');
    if (z) {
      z.state = 'discovered';
      pushLog(state, `Descubrís ${z.name}.`, 'info');
    }
  }
  if (effects.researchBonus && state.research.active) {
    state.research.progress += effects.researchBonus;
  }
  if (effects.attackIntensity) attackIntensity = effects.attackIntensity;
  return { attackIntensity };
}

function afterEvent(state, content, chosen) {
  state.director.lastEventId = chosen.id;
  state.director.cooldowns[chosen.id] = state.day + (chosen.cooldown || 3);
  if (chosen.family) {
    state.director.familyCooldowns[chosen.family] =
      state.day + (content.balance.familyCooldownDays || 3);
    state.director.recentFamilies = [chosen.family, ...(state.director.recentFamilies || [])].slice(0, 8);
  }
  const intensity = chosen.intensity || 0;
  if (intensity >= 4) {
    state.director.lastCrisisDay = state.day;
    state.director.protectionUntil = Math.max(
      state.director.protectionUntil || 0,
      state.day + (content.balance.postDisasterProtectionDays || 3)
    );
    state.director.tension = Math.max(12, state.director.tension - 12);
    pushLog(state, 'Tras lo ocurrido, la zona respira unos días. Aprovechad para recuperaros.', 'story');
  } else if (intensity >= 3) {
    state.director.lastCrisisDay = state.day;
    state.director.protectionUntil = Math.max(state.director.protectionUntil || 0, state.day + 2);
    state.director.tension = Math.max(14, state.director.tension - 4);
  } else {
    state.director.tension = clampNum(state.director.tension + Math.max(1, intensity + 0.5), 0, 100);
  }
}

function resolveChosenEvent(state, content, chosen, rng) {
  const variant = rng.pick(chosen.variants || [{ text: chosen.name, effects: {} }]);
  const kind = (chosen.intensity || 0) >= 4 ? 'bad' : (chosen.intensity || 0) >= 2 ? 'warn' : 'info';
  pushLog(state, `${chosen.name}: ${variant.text}`, kind);
  const applied = applyEventEffects(state, content, variant.effects || {}, rng);
  afterEvent(state, content, chosen);
  return { event: chosen, variant, attackIntensity: applied.attackIntensity };
}

export function runDirector(state, content) {
  updateIndices(state, content);
  const rng = rngOf(state);
  const bal = content.balance;
  if (state.day < (bal.directorMinDay || 1)) return { quiet: true };

  let quietChance = bal.quietNightChance || 0.3;
  if (inProtection(state)) quietChance = Math.min(0.48, quietChance + 0.1);
  if (inCrisisCooldown(state, bal)) quietChance = Math.min(0.42, quietChance + 0.05);
  if ((state.population?.total || 0) <= 4) quietChance = Math.min(0.45, quietChance + 0.08);
  if (state.day > 40) quietChance *= 0.9;
  if (state.day > 90) quietChance *= 0.88;
  if (state.era >= 2) quietChance *= 0.92;

  if (rng.chance(quietChance) && state.director.tension < 52) {
    pushLog(state, 'Noche tranquila. Nada digno de anotar.', 'story');
    state.director.tension = Math.max(0, state.director.tension - 2);
    return { quiet: true };
  }

  const events = (content.eventsDoc?.events || []).filter((ev) => conditionsMet(ev, state, bal));
  if (!events.length) {
    pushLog(state, 'El viento arrastra polvo. Sin novedades.', 'story');
    return { quiet: true };
  }

  const weighted = events.map((ev) => ({ ev, w: weightFor(ev, state, bal) })).filter((x) => x.w > 0);
  const total = weighted.reduce((n, x) => n + x.w, 0) || 1;
  let r = rng.float(0, total);
  let chosen = weighted[0]?.ev;
  for (const row of weighted) {
    r -= row.w;
    if (r <= 0) {
      chosen = row.ev;
      break;
    }
  }
  if (!chosen) return { quiet: true };

  if (chosen.choices?.length && !state._autoResolveChoices) {
    state.pendingChoice = {
      eventId: chosen.id,
      name: chosen.name,
      family: chosen.family,
      intensity: chosen.intensity,
      text: rng.pick(chosen.variants || [{ text: chosen.name }]).text,
      choices: chosen.choices,
    };
    pushLog(state, `Decisión: ${chosen.name}`, 'warn');
    return { choice: true, event: chosen };
  }

  return resolveChosenEvent(state, content, chosen, rng);
}

export function resolvePendingChoice(state, content, choiceId) {
  if (!state.pendingChoice) return { ok: false };
  const ev = (content.eventsDoc?.events || []).find((e) => e.id === state.pendingChoice.eventId);
  const choices = state.pendingChoice.choices || [];
  const choice =
    typeof choiceId === 'number'
      ? choices[choiceId]
      : choices.find((c) => c.id === choiceId) || choices.find((c) => c.label === choiceId);
  const rng = rngOf(state);
  const pendingText = state.pendingChoice.text;
  state.pendingChoice = null;
  if (!ev || !choice) return { ok: false };
  pushLog(state, `${ev.name}: ${pendingText}`, 'info');
  const applied = applyEventEffects(state, content, choice.effects || {}, rng);
  afterEvent(state, content, ev);
  return { ok: true, event: ev, attackIntensity: applied.attackIntensity };
}
