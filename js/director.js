/**
 * Director: eventos variables por pesos/condiciones (no guion fijo por día).
 */
import { chance, pick, rollRange, clamp } from './util.js';
import {
  livingSurvivors,
  pushLog,
  defenseValue,
  makeSurvivor,
  maxSurvivorsCap,
} from './state.js';

function eventAllowed(ev, state, balance) {
  if (state.day < (ev.minDay || 1)) return false;
  const cd = state.director.cooldowns[ev.id] || 0;
  if (state.day < cd) return false;
  const c = ev.conditions || {};
  const alive = livingSurvivors(state).length;
  const controlled = state.zones.filter((z) => z.state === 'controlled').length;
  const R = state.resources || {};
  if (c.minDay != null && state.day < c.minDay) return false;
  if (c.minPop != null && alive < c.minPop) return false;
  if (c.maxPop != null && alive > c.maxPop) return false;
  if (c.minFood != null && R.food < c.minFood) return false;
  if (c.minWater != null && R.water < c.minWater) return false;
  if (c.minWood != null && R.wood < c.minWood) return false;
  if (c.minMetal != null && R.metal < c.minMetal) return false;
  if (c.minFuel != null && R.fuel < c.minFuel) return false;
  if (c.maxFuel != null && R.fuel > c.maxFuel) return false;
  if (c.minThreat != null && state.director.threat < c.minThreat) return false;
  if (c.maxThreat != null && state.director.threat > c.maxThreat) return false;
  if (c.minControlled != null && controlled < c.minControlled) return false;
  if ((ev.intensity || 0) >= 3 && state.day <= (balance.softCapThreatEarlyDays || 4)) {
    return false;
  }
  if ((ev.intensity || 0) >= 5 && alive < 2) return false;
  return true;
}

function weightFor(ev, state) {
  let w = ev.weight || 1;
  const threat = state.director.threat;
  const alive = livingSurvivors(state).length;
  const R = state.resources || {};
  if ((ev.intensity || 0) >= 3) w += Math.floor(threat / 12);
  if ((ev.intensity || 0) === 0) w += threat < 15 ? 2 : 0;
  if (ev.id === 'uneventful' || ev.id === 'quiet_night') {
    if (threat < 20) w += 4;
    if (threat > 40) w *= 0.55;
  }
  if (ev.id === 'hard_raid' || ev.id === 'siege_pressure') {
    if (threat < 18) w *= 0.3;
  }
  if (ev.id === 'fuel_leak_find' && R.fuel < 4) w += 2;
  if (ev.id === 'rain_cistern' && R.water < 6) w += 2;
  if (ev.id === 'scavenge_bonus' && R.food < 8) w += 1.5;
  if (ev.id === 'deserter_hope' && alive < 6) w += 1.5;
  if (ev.id === 'deserter_hope' && alive > 30) w *= 0.5;
  if (state.director.recentLosses > 0 && (ev.intensity || 0) >= 3) w *= 0.5;
  if (state.director.lastEventId === ev.id) w *= 0.35;
  return Math.max(0.05, w);
}

function applyLoot(state, loot) {
  if (!loot) return;
  Object.entries(loot).forEach(([k, range]) => {
    const n = rollRange(range);
    if (n > 0) state.resources[k] = (state.resources[k] || 0) + n;
  });
}

function applyLose(state, lose) {
  if (!lose) return;
  Object.entries(lose).forEach(([k, range]) => {
    const n = rollRange(range);
    state.resources[k] = Math.max(0, (state.resources[k] || 0) - n);
  });
}

function applyRaid(state, raid, balance) {
  const power = raid.power || 10;
  const def = defenseValue(state, balance);
  const margin = def - power;
  const survivors = livingSurvivors(state);
  if (margin >= 8 && chance(0.55)) {
    pushLog(state, 'La defensa aguanta. La oleada se dispersa.', 'good');
    if (state.resources.ammo > 0 && chance(0.4)) state.resources.ammo -= 1;
    return;
  }
  const dmg = rollRange(raid.damage || [8, 20]);
  const target = pick(survivors);
  if (!target) return;
  target.hp -= Math.max(5, dmg - Math.floor(def / 4));
  if (state.resources.ammo > 0) state.resources.ammo -= 1;
  if (target.hp <= 0) {
    target.hp = 0;
    target.status = 'dead';
    state.stats.deaths += 1;
    state.director.recentLosses += 1;
    pushLog(state, `${target.name} cae defendiendo el refugio.`, 'bad');
  } else if (target.hp < 55) {
    target.status = 'wounded';
    pushLog(state, `${target.name} resulta herido en la oleada (−${dmg} PV).`, 'bad');
  } else {
    pushLog(state, `${target.name} resiste la embestida (−${dmg} PV).`, 'warn');
  }
  if (margin < -10) {
    const hasStorage = state.base.buildings.some((b) => b.type === 'storage');
    const loseFood = hasStorage ? randSafe(1, 2) : randSafe(2, 5);
    const loseWater = hasStorage ? randSafe(0, 1) : randSafe(1, 3);
    state.resources.food = Math.max(0, state.resources.food - loseFood);
    state.resources.water = Math.max(0, state.resources.water - loseWater);
    pushLog(state, `Saquean provisiones (−${loseFood} comida, −${loseWater} agua).`, 'bad');
  }
}

function randSafe(a, b) {
  return a + Math.floor(Math.random() * (b - a + 1));
}

function discoverOneUnknown(state) {
  const unknown = state.zones.filter((z) => z.state === 'unknown');
  if (!unknown.length) return;
  const z = pick(unknown);
  z.state = 'discovered';
  pushLog(state, `Nuevos rumores revelan la zona: ${z.name}.`, 'info');
}

function applyEffects(state, effects, content, balance) {
  if (!effects) return;
  applyLoot(state, effects.loot);
  applyLose(state, effects.lose);
  if (effects.raid) applyRaid(state, effects.raid, balance);
  if (effects.threatDelta) {
    state.director.threat = clamp(state.director.threat + effects.threatDelta, 0, 100);
  }
  if (effects.discoverNeighbor) discoverOneUnknown(state);
  if (effects.woundOne) {
    const s = pick(livingSurvivors(state));
    if (s) {
      s.hp = Math.max(1, s.hp - effects.woundOne);
      s.status = s.hp < 55 ? 'wounded' : s.status;
      if (effects.needMeds && state.resources.medicine > 0) {
        state.resources.medicine -= 1;
        s.hp = Math.min(s.maxHp, s.hp + 15);
        pushLog(state, `Usáis medicina con ${s.name}.`, 'info');
      } else if (effects.needMeds) {
        pushLog(state, `${s.name} empeora: no hay medicinas.`, 'warn');
      } else {
        pushLog(state, `${s.name} resulta afectado (−${effects.woundOne} PV).`, 'warn');
      }
    }
  }
  if (effects.recruit) {
    const cap = maxSurvivorsCap(balance);
    const alive = livingSurvivors(state).length;
    if (alive < cap) {
      const neo = makeSurvivor(content.survivorsDoc.names, content.survivorsDoc.skillKeys);
      state.survivors.push(neo);
      pushLog(state, `${neo.name} se une al refugio.`, 'good');
    } else {
      pushLog(state, 'Llega gente… pero no cabe nadie más (límite de población).', 'warn');
    }
  }
}

export function runDirector(state, content) {
  const { eventsDoc, balance } = content;

  // Muchas noches no traen un evento “importante”: tirada de silencio previo.
  if (chance(balance.quietNightChance ?? 0.32) && state.day > 1) {
    pushLog(state, 'Noche tranquila. Nada digno de informe.', 'info');
    state.director.threat = clamp(
      state.director.threat + (state.director.threat > 35 ? 1 : 0) - (livingSurvivors(state).length >= 8 ? 1 : 0),
      0,
      100
    );
    if (state.director.recentLosses > 0) state.director.recentLosses -= 1;
    return;
  }

  const pool = (eventsDoc.events || []).filter((ev) => eventAllowed(ev, state, balance));
  if (!pool.length) {
    pushLog(state, 'La noche pasa sin novedad.', 'info');
    return;
  }
  const weights = pool.map((ev) => weightFor(ev, state));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  let chosen = pool[0];
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      chosen = pool[i];
      break;
    }
  }
  const variant = pick(chosen.variants || [{ text: chosen.name, effects: {} }]);
  const kind =
    chosen.intensity >= 4 ? 'bad' : chosen.intensity >= 2 ? 'warn' : chosen.intensity <= 0 ? 'info' : 'event';
  pushLog(state, `${chosen.name}: ${variant.text}`, kind);
  applyEffects(state, variant.effects, content, balance);
  state.director.cooldowns[chosen.id] = state.day + (chosen.cooldown || 3);
  state.director.lastEventId = chosen.id;

  const controlled = state.zones.filter((z) => z.state === 'controlled').length;
  const pop = livingSurvivors(state).length;
  state.director.threat = clamp(
    state.director.threat +
      ((chosen.intensity || 0) >= 3 ? 2 : 1) +
      Math.floor(state.day / 6) +
      Math.floor(controlled * 0.4) -
      Math.floor(defenseValue(state, balance) / 22) +
      (state.director.recentLosses > 0 ? -1 : 0) -
      (pop >= 8 ? 1 : 0),
    0,
    100
  );
  if (state.director.recentLosses > 0) state.director.recentLosses -= 1;
}
