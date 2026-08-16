/**
 * ZZ-060…065 — Prep→ataque→informe, infectados tipados, ammo, recovery.
 * Combate abstracto (sin control manual). Defensa agregada: state.defenseBreakdown.
 */
import { createRng } from './rng.js';
import { pushLog, defenseBreakdown } from './state.js';
import { applyCasualties } from './population.js';
import { applyBuildingDamage, perimeterIntegrity } from './buildings-damage.js';

function rngOf(state) {
  return createRng((state.rngState || 1) + state.day * 9973 + 17);
}

function unlocked(state, id) {
  return (state.research?.unlocked || []).includes(id);
}

/** Composición de horda tipada (ZZ-062). */
export function composeHorde(intensity, era, infectedDoc, rng) {
  const types = (infectedDoc?.types || []).filter((t) => (t.minEra || 0) <= era);
  const pool = types.length ? types : [{ id: 'common', name: 'Común', threatWeight: 1, damage: 8 }];
  const byId = Object.fromEntries(pool.map((t) => [t.id, t]));
  const counts = {};
  let budget = Math.max(2, Math.round(3 + intensity * 2.2 + era));

  const prefer =
    intensity >= 4
      ? ['horde', 'tank', 'fast', 'common']
      : intensity >= 3
        ? ['horde', 'fast', 'common', 'tank']
        : intensity >= 2
          ? ['common', 'fast', 'horde']
          : ['common', 'fast'];

  while (budget > 0) {
    const candidates = prefer.filter((id) => byId[id]).concat(pool.map((t) => t.id));
    const id = rng.pick(candidates);
    const t = byId[id] || pool[0];
    const cost = Math.max(1, t.threatWeight || 1);
    if (cost > budget && Object.keys(counts).length) break;
    counts[t.id] = (counts[t.id] || 0) + 1;
    budget -= cost;
  }

  const units = Object.entries(counts).map(([id, n]) => {
    const t = byId[id] || { id, name: id, threatWeight: 1, damage: 8 };
    return {
      id,
      name: t.name || id,
      count: n,
      threatWeight: t.threatWeight || 1,
      damage: t.damage || 8,
      speed: t.speed || 1,
    };
  });

  const power = units.reduce((s, u) => s + u.count * u.threatWeight, 0);
  const avgDamage =
    units.reduce((s, u) => s + u.count * u.damage, 0) / Math.max(1, units.reduce((s, u) => s + u.count, 0));
  const hasTank = !!counts.tank;
  const hasHorde = !!counts.horde;
  const hasFast = !!counts.fast;
  const label = units.map((u) => `${u.count}× ${u.name}`).join(', ') || 'Comunes';

  return { units, counts, power, avgDamage, hasTank, hasHorde, hasFast, label };
}

export function formatHordeLabel(horde) {
  return horde?.label || 'Oleada';
}

/** Aviso prep ataque (ZZ-061) — no calendario fijo; depende de Director/evento. */
export function schedulePendingAttack(state, intensity, content, opts = {}) {
  const rng = rngOf(state);
  let inten = Math.max(1, Math.floor(intensity));
  const controlled = (state.zones || []).filter((z) => z.state === 'controlled').length;
  inten = Math.max(1, inten - Math.floor(controlled / 3));
  if (unlocked(state, 'perimeter_doctrine')) inten = Math.max(1, inten - 1);

  let warn = content.balance?.attackWarnDays ?? 1;
  if (unlocked(state, 'tower_optics')) warn = Math.max(warn, 2);
  if (opts.immediate) warn = 0;

  const horde = composeHorde(inten, state.era || 0, content.infectedDoc, rng);
  state.pendingAttack = {
    intensity: inten,
    arrivesOnDay: state.day + warn,
    horde,
    source: opts.source || 'director',
  };
  if (warn > 0) {
    pushLog(
      state,
      `Movimiento hostil detectado (intensidad ~${inten}). Llega en ${warn} día(s). ${horde.label}.`,
      'warn'
    );
  }
  return state.pendingAttack;
}

export function tickPendingAttack(state) {
  const p = state.pendingAttack;
  if (!p) return null;
  if (state.day < p.arrivesOnDay) return { waiting: true, pending: p };
  return { due: true, pending: p };
}

function loseFrontierZone(state, rng) {
  const frontier = (state.zones || []).filter(
    (z) => z.state === 'controlled' && z.type !== 'camp' && z.id !== 'camp'
  );
  if (!frontier.length) return null;
  const z = rng.pick(frontier);
  z.state = 'hostile';
  z.infectedLeft = Math.max(z.infectedLeft || 0, rng.int(2, 6));
  pushLog(state, `Zona fronteriza perdida: ${z.name || z.id}.`, 'bad');
  state.stats.zonesControlled = state.zones.filter((x) => x.state === 'controlled').length;
  return z;
}

/**
 * Resolución abstracta de ataque a la base (ZZ-061/062/063).
 * @returns informe con bajas, daño, composición, ammo
 */
export function resolveBaseAttack(state, content, intensity = 2, opts = {}) {
  const rng = rngOf(state);
  let inten = Math.max(1, Math.floor(intensity));
  const underProtection =
    opts.wasProtected != null
      ? !!opts.wasProtected
      : state.day < (state.director.protectionUntil || 0);
  if (underProtection) inten = Math.max(1, inten - 1);

  const controlled = (state.zones || []).filter((z) => z.state === 'controlled').length;
  inten = Math.max(1, inten - Math.floor(controlled / 3));
  if (unlocked(state, 'perimeter_doctrine')) inten = Math.max(1, inten - 1);

  const horde =
    opts.horde ||
    state.pendingAttack?.horde ||
    composeHorde(inten, state.era || 0, content.infectedDoc, rng);

  const bd = defenseBreakdown(state, content.buildings, content.balance);
  const def = bd.total;
  const atk = 10 + inten * 11 + state.director.threat * 0.28 + horde.power * 1.6;
  const ratio = def / Math.max(1, atk);
  const roll = rng.float(0.75, 1.15) * ratio;

  let ammoSpend = Math.max(1, Math.ceil(inten / 2) + (horde.hasFast ? 1 : 0));
  if (unlocked(state, 'ammo_craft')) ammoSpend = Math.max(1, Math.ceil(ammoSpend * 0.8));
  const ammoBefore = state.resources.ammo || 0;
  state.resources.ammo = Math.max(0, ammoBefore - ammoSpend);
  const ammoSpent = ammoBefore - state.resources.ammo;

  const camp = state.zones.find((z) => z.type === 'camp');
  if (camp) {
    camp._attackFlash = true;
    state.flags.lastAttackZoneId = camp.id;
  }

  const pop = state.population?.total || 1;
  const towers = state.base.buildings.filter(
    (b) => ['watchtower', 'bunker', 'armory'].includes(b.type) && b.hp > 0
  ).length;

  let floorPop = 1;
  if (pop <= 4) floorPop = underProtection ? 1 : rng.chance(0.22) ? 0 : 1;
  else if (pop <= 8) floorPop = underProtection ? 2 : Math.max(1, pop - 2);
  else floorPop = underProtection ? Math.max(3, Math.floor(pop * 0.65)) : Math.max(2, Math.floor(pop * 0.45));

  const damaged = [];
  const dropThreat = (n) => {
    state.director.threat = Math.max(6, Math.round((state.director.threat || 0) - n));
    state.director.tension = Math.max(0, (state.director.tension || 0) - n * 0.6);
  };

  const finish = (result, dead, injured, extra = {}) => {
    state.pendingAttack = null;
    state.lastAttackReport = {
      result,
      intensity: inten,
      dead,
      injured,
      ammoSpent,
      hordeLabel: horde.label,
      damaged,
      zoneLost: extra.zoneLost || null,
      day: state.day,
      defense: Math.round(def),
      attackPower: Math.round(atk),
    };
    return { ...state.lastAttackReport, horde };
  };

  if (roll >= 1.15) {
    state.stats.attacksSurvived += 1;
    state.stability += 2;
    dropThreat(6);
    pushLog(
      state,
      `Ataque repelido (int. ${inten}). ${horde.label}. Munición −${ammoSpent}.`,
      'good'
    );
    return finish('win', 0, 0);
  }

  if (roll >= 0.7) {
    let dead = ratio > 0.95 && rng.chance(0.18) ? 1 : rng.chance(0.28) ? 1 : 0;
    if (pop >= 20 && rng.chance(0.2)) dead = Math.min(2, dead + 1);
    dead = Math.min(dead, Math.max(0, pop - floorPop));
    let injured = Math.min(3, Math.max(1, Math.floor(inten * 0.7)));
    if (horde.hasHorde) injured = Math.min(5, injured + 1);
    applyCasualties(state, content.balance, { injured, dead });

    const peri = perimeterIntegrity(state, content);
    const dmgChance = 0.35 + (horde.hasTank ? 0.25 : 0);
    if (rng.chance(dmgChance)) {
      const dmg = rng.int(15, 45) + (horde.hasTank ? rng.int(10, 25) : 0);
      const hit = applyBuildingDamage(state, content, dmg, {
        rng,
        forcePerimeter: peri.holding,
        breach: !peri.holding,
      });
      if (hit) damaged.push(hit);
    }
    state.stability -= 5;
    if (dead) state.director.recentLosses += dead;
    if (dead > 0 && pop - dead <= 4) {
      state.director.protectionUntil = Math.max(state.director.protectionUntil || 0, state.day + 2);
      state.director.lastCrisisDay = state.day;
    }
    dropThreat(10);
    pushLog(
      state,
      `Ataque contenido (${dead} muertos, ${injured} heridos). ${horde.label}. Munición −${ammoSpent}.`,
      'warn'
    );
    return finish('messy', dead, injured);
  }

  let maxDead = towers ? 2 : Math.min(4, 1 + Math.floor(inten * 0.85));
  if (pop >= 25) maxDead = Math.min(maxDead + 2, Math.floor(pop * 0.4));
  if (pop <= 4) maxDead = underProtection ? 1 : Math.min(3, maxDead);
  else if (pop <= 8) maxDead = underProtection ? 1 : Math.min(2, maxDead);
  if (horde.hasHorde) maxDead = Math.min(maxDead + 1, Math.max(0, pop - floorPop));

  let dead = Math.min(Math.max(1, pop - floorPop), maxDead);
  dead = Math.min(dead, Math.max(0, pop - floorPop));
  const hasFarmOrDef = state.base.buildings.some(
    (b) =>
      ['farm', 'greenhouse', 'watchtower', 'bunker', 'fence', 'barricade'].includes(b.type) && b.hp > 0
  );
  if (pop === 1 && !underProtection && rng.chance(hasFarmOrDef ? 0.28 : 0.5)) dead = 1;
  if (pop === 2 && !underProtection && inten >= 2 && rng.chance(hasFarmOrDef ? 0.18 : 0.35)) dead = 2;

  let injured = Math.min(4, inten + 1 + (horde.hasHorde ? 1 : 0));
  applyCasualties(state, content.balance, { dead, injured });
  state.stability -= 10;
  state.director.recentLosses += dead;

  // Daño a varios edificios: perímetro aguanta → exteriores; roto → interiores
  const peri = perimeterIntegrity(state, content);
  const hits = Math.min(
    (state.base.buildings || []).filter((x) => x.hp > 0).length,
    1 + (horde.hasTank ? 1 : 0) + (inten >= 3 ? 1 : 0) + (!peri.holding ? 1 : 0)
  );
  for (let i = 0; i < hits; i++) {
    const dmg = rng.int(20, 55) + (horde.hasTank ? 20 : 0);
    const hit = applyBuildingDamage(state, content, dmg, {
      rng,
      forcePerimeter: peri.holding && i === 0,
      forceInterior: !peri.holding && i > 0,
      breach: !peri.holding,
    });
    if (hit && !damaged.some((d) => d.id === hit.id)) damaged.push(hit);
  }

  const zoneLost = inten >= 2 && controlled > 1 && rng.chance(0.55) ? loseFrontierZone(state, rng) : null;

  const hasTower = state.base.buildings.some(
    (b) => ['watchtower', 'bunker', 'armory'].includes(b.type) && b.hp > 0
  );
  const recoverDays = !hasTower
    ? Math.max(4, (content.balance.postDisasterProtectionDays || 4) + 1)
    : pop - dead <= 2
      ? Math.max(2, (content.balance.postDisasterProtectionDays || 4) - 1)
      : Math.max(3, content.balance.postDisasterProtectionDays || 4);
  state.director.protectionUntil = Math.max(state.director.protectionUntil || 0, state.day + recoverDays);
  state.director.lastCrisisDay = state.day;
  dropThreat(16);
  pushLog(
    state,
    `El perímetro cede (${dead} muertos). ${horde.label}. Recuperación hasta día ${state.director.protectionUntil}.`,
    'bad'
  );
  return finish('lose', dead, injured, { zoneLost: zoneLost ? zoneLost.id : null });
}
