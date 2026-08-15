/**
 * Director: eventos variables por pesos/condiciones (no guion fijo por día).
 */
import { chance, pick, rollRange, clamp } from './util.js';
import { livingSurvivors, pushLog, defenseValue, makeSurvivor } from './state.js';

function eventAllowed(ev, state, balance) {
  if (state.day < (ev.minDay || 1)) return false;
  const cd = state.director.cooldowns[ev.id] || 0;
  if (state.day < cd) return false;
  const c = ev.conditions || {};
  const alive = livingSurvivors(state).length;
  const controlled = state.zones.filter((z) => z.state === 'controlled').length;
  if (c.minDay != null && state.day < c.minDay) return false;
  if (c.minPop != null && alive < c.minPop) return false;
  if (c.maxPop != null && alive > c.maxPop) return false;
  if (c.minFood != null && state.resources.food < c.minFood) return false;
  if (c.minThreat != null && state.director.threat < c.minThreat) return false;
  if (c.maxThreat != null && state.director.threat > c.maxThreat) return false;
  if (c.minControlled != null && controlled < c.minControlled) return false;
  // Suavizar amenazas absurdas al inicio
  if ((ev.intensity || 0) >= 3 && state.day <= (balance.softCapThreatEarlyDays || 4)) {
    return false;
  }
  if ((ev.intensity || 0) >= 5 && alive < 2) return false;
  return true;
}

function weightFor(ev, state) {
  let w = ev.weight || 1;
  const threat = state.director.threat;
  if ((ev.intensity || 0) >= 3) w += Math.floor(threat / 10);
  if (ev.id === 'quiet_night' && threat < 12) w += 3;
  if (ev.id === 'hard_raid' && threat < 18) w *= 0.35;
  if (state.director.recentLosses > 0 && (ev.intensity || 0) >= 3) w *= 0.5;
  if (state.director.lastEventId === ev.id) w *= 0.4;
  return Math.max(0.1, w);
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

function applyRaid(state, raid, balance, content) {
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
  // Saqueo si defensa muy baja
  if (margin < -10) {
    const hasStorage = state.base.buildings.some((b) => b.type === 'storage');
    const loseFood = hasStorage ? randSafe(1, 2) : randSafe(2, 5);
    state.resources.food = Math.max(0, state.resources.food - loseFood);
    pushLog(state, `Saquean provisiones (−${loseFood} comida).`, 'bad');
  }
}

function randSafe(a, b) {
  return a + Math.floor(Math.random() * (b - a + 1));
}

function applyEffects(state, effects, content, balance) {
  if (!effects) return;
  applyLoot(state, effects.loot);
  applyLose(state, effects.lose);
  if (effects.raid) applyRaid(state, effects.raid, balance, content);
  if (effects.woundOne) {
    const s = pick(livingSurvivors(state));
    if (s) {
      s.hp = Math.max(1, s.hp - effects.woundOne);
      s.status = s.hp < 55 ? 'wounded' : s.status;
      if (effects.needMeds && state.resources.meds > 0) {
        state.resources.meds -= 1;
        s.hp = Math.min(s.maxHp, s.hp + 15);
        pushLog(state, `Usáis medicina con ${s.name}.`, 'info');
      } else {
        pushLog(state, `${s.name} empeora por la fiebre.`, 'warn');
      }
    }
  }
  if (effects.recruit && livingSurvivors(state).length < 12) {
    const neo = makeSurvivor(content.survivorsDoc.names, content.survivorsDoc.skillKeys);
    state.survivors.push(neo);
    pushLog(state, `${neo.name} se une al refugio.`, 'good');
  }
}

export function runDirector(state, content) {
  const { eventsDoc, balance } = content;
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
  pushLog(state, `${chosen.name}: ${variant.text}`, chosen.intensity >= 3 ? 'bad' : 'event');
  applyEffects(state, variant.effects, content, balance);
  state.director.cooldowns[chosen.id] = state.day + (chosen.cooldown || 3);
  state.director.lastEventId = chosen.id;
  // Amenaza evoluciona
  const controlled = state.zones.filter((z) => z.state === 'controlled').length;
  const pop = livingSurvivors(state).length;
  state.director.threat = clamp(
    state.director.threat +
      1 +
      Math.floor(state.day / 5) +
      Math.floor(controlled * 0.5) -
      Math.floor(defenseValue(state, balance) / 20) +
      (state.director.recentLosses > 0 ? -1 : 0) -
      (pop >= 5 ? 1 : 0),
    0,
    100
  );
  if (state.director.recentLosses > 0) state.director.recentLosses -= 1;
}
