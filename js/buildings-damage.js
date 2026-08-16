/**
 * ZZ-066…069 — Estados estructurales, daño (perímetro/clima), reparación.
 * ok → damaged → critical → destroyed. Sin craft de piezas.
 */
import { pushLog } from './state.js';

function canAffordLocal(state, cost) {
  if (!cost) return true;
  return Object.entries(cost).every(([k, v]) => (state.resources[k] || 0) >= v);
}

function payCostLocal(state, cost) {
  Object.entries(cost || {}).forEach(([k, v]) => {
    state.resources[k] = (state.resources[k] || 0) - v;
  });
}

export const PERIMETER_TYPES = new Set([
  'barricade',
  'fence',
  'watchtower',
  'bunker',
  'armory',
]);

export function buildingMaxHp(building, content) {
  const def = content?.buildings?.[building?.type];
  return def?.maxHp || content?.balance?.buildingDamage?.maxHp || 100;
}

export function buildingStructuralState(building, content = null) {
  if (!building) return 'destroyed';
  const max = buildingMaxHp(building, content);
  const hp = building.hp == null ? max : building.hp;
  if (hp <= 0) return 'destroyed';
  const pct = hp / max;
  const cfg = content?.balance?.buildingDamage;
  const crit = cfg?.criticalBelow ?? 0.35;
  const dmg = cfg?.damagedBelow ?? 0.7;
  if (pct < crit) return 'critical';
  if (pct < dmg) return 'damaged';
  return 'ok';
}

export function buildingOutputMult(building, content) {
  const cfg = content?.balance?.buildingDamage;
  if (cfg && cfg.enabled === false) return building.hp > 0 ? 1 : 0;
  const st = buildingStructuralState(building, content);
  const table = cfg?.outputMult || { ok: 1, damaged: 0.65, critical: 0.3, destroyed: 0 };
  return table[st] ?? (st === 'destroyed' ? 0 : 1);
}

export function isPerimeterBuilding(building) {
  return PERIMETER_TYPES.has(building?.type);
}

export function perimeterIntegrity(state, content) {
  const peri = (state.base?.buildings || []).filter(
    (b) => isPerimeterBuilding(b) && buildingStructuralState(b, content) !== 'destroyed'
  );
  if (!peri.length) return { strength: 0, buildings: 0, avgHp: 0, holding: false };
  let strength = 0;
  let hpSum = 0;
  peri.forEach((b) => {
    const def = content.buildings[b.type];
    const mult = buildingOutputMult(b, content);
    strength += (def?.defense || 2) * mult;
    hpSum += Math.max(0, b.hp) / buildingMaxHp(b, content);
  });
  const avgHp = hpSum / peri.length;
  const holding = strength >= (content.balance?.buildingDamage?.perimeterHoldStrength ?? 8) && avgHp >= 0.4;
  return { strength, buildings: peri.length, avgHp, holding };
}

/** Aplica daño; respeta perímetro (ZZ-067). */
export function applyBuildingDamage(state, content, amount, opts = {}) {
  const rng = opts.rng;
  const alive = (state.base?.buildings || []).filter(
    (b) => buildingStructuralState(b, content) !== 'destroyed' || opts.includeDestroyed
  );
  const candidates = alive.filter((b) => b.hp > 0);
  if (!candidates.length) return null;

  const peri = perimeterIntegrity(state, content);
  let pool;
  if (opts.forceInterior) {
    pool = candidates.filter((b) => !isPerimeterBuilding(b));
    if (!pool.length) pool = candidates;
  } else if (opts.forcePerimeter || (peri.holding && !opts.breach)) {
    pool = candidates.filter((b) => isPerimeterBuilding(b));
    if (!pool.length) pool = candidates;
  } else if (!peri.holding && peri.buildings > 0) {
    // Perímetro roto → interiores más probables
    const interior = candidates.filter((b) => !isPerimeterBuilding(b));
    pool = interior.length && rng?.chance?.(0.7) ? interior : candidates;
  } else {
    pool = candidates;
  }

  const b = opts.target || (rng ? rng.pick(pool) : pool[0]);
  if (!b) return null;
  const before = buildingStructuralState(b, content);
  b.hp = Math.max(0, (b.hp ?? 100) - Math.max(1, Math.floor(amount)));
  if (b.repair) b.repair = null;
  const after = buildingStructuralState(b, content);
  const name = content.buildings[b.type]?.name || b.type;
  if (after === 'destroyed' && before !== 'destroyed') {
    pushLog(state, `${name} queda destruido.`, 'bad');
  } else if (after !== before) {
    pushLog(state, `${name}: ${before} → ${after} (HP ${Math.round(b.hp)}).`, 'warn');
  }
  return {
    id: b.id,
    type: b.type,
    name,
    hp: b.hp,
    state: after,
    before,
  };
}

export function buildingsNeedingRepair(state, content) {
  return (state.base?.buildings || []).filter((b) => {
    const st = buildingStructuralState(b, content);
    return st === 'damaged' || st === 'critical' || st === 'destroyed';
  });
}

export function repairQuote(state, content, building) {
  const max = buildingMaxHp(building, content);
  const hp = Math.max(0, building.hp ?? 0);
  const missing = max - hp;
  const st = buildingStructuralState(building, content);
  let wood = Math.max(1, Math.ceil(missing / 18));
  let metal = Math.max(st === 'ok' ? 0 : 1, Math.ceil(missing / 30));
  let days = st === 'destroyed' ? 3 : st === 'critical' ? 2 : 1;
  if ((state.research?.unlocked || []).includes('rapid_repair')) {
    wood = Math.max(1, Math.ceil(wood * 0.7));
    metal = Math.max(0, Math.ceil(metal * 0.7));
    days = Math.max(1, days - 1);
  }
  return { wood, metal, days, maxHp: max, missing, state: st };
}

export function startRepair(state, content, buildingId) {
  const b = (state.base?.buildings || []).find((x) => x.id === buildingId);
  if (!b) return { ok: false, error: 'Edificio no encontrado' };
  const st = buildingStructuralState(b, content);
  if (st === 'ok') return { ok: false, error: 'No necesita reparación' };
  if (b.repair?.daysLeft > 0) return { ok: false, error: 'Ya en reparación' };

  const q = repairQuote(state, content, b);
  const cost = { wood: q.wood, metal: q.metal };
  if (!canAffordLocal(state, cost)) return { ok: false, error: 'Faltan madera/metal' };

  const idle = state.population?.labor?.idle || 0;
  const build = state.population?.labor?.build || 0;
  if (idle + build < 1) return { ok: false, error: 'Hace falta al menos 1 trabajador libre o de obra' };

  payCostLocal(state, cost);
  b.repair = { daysLeft: q.days, maxHp: q.maxHp };
  const name = content.buildings[b.type]?.name || b.type;
  pushLog(
    state,
    `Reparando ${name} (${q.days}d · −${q.wood} madera${q.metal ? ` −${q.metal} metal` : ''}).`,
    'info'
  );
  return { ok: true, quote: q, building: b };
}

export function tickBuildingRepairs(state, content) {
  const done = [];
  (state.base?.buildings || []).forEach((b) => {
    if (!b.repair?.daysLeft) return;
    b.repair.daysLeft -= 1;
    if (b.repair.daysLeft > 0) return;
    const max = b.repair.maxHp || buildingMaxHp(b, content);
    b.hp = max;
    b.repair = null;
    const name = content.buildings[b.type]?.name || b.type;
    pushLog(state, `${name} reparado.`, 'good');
    done.push(b);
  });
  return done;
}

/** Daño climático leve (tormenta/ventisca) — no calendario fijo de hordas. */
export function tickWeatherStructureDamage(state, content, rng) {
  const cfg = content.balance?.buildingDamage;
  if (!cfg?.enabled) return null;
  const w = state.weather;
  if (w !== 'storm' && w !== 'blizzard') return null;
  const chance = w === 'blizzard' ? cfg.blizzardDamageChance ?? 0.18 : cfg.stormDamageChance ?? 0.22;
  if (!rng.chance(chance)) return null;
  const amount = rng.int(cfg.weatherDamageMin ?? 8, cfg.weatherDamageMax ?? 22);
  return applyBuildingDamage(state, content, amount, {
    rng,
    forcePerimeter: true,
    breach: false,
  });
}

export function structuralStateLabel(st) {
  return (
    {
      ok: 'Íntegro',
      damaged: 'Dañado',
      critical: 'Crítico',
      destroyed: 'Destruido',
    }[st] || st
  );
}
