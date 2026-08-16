/**
 * ZZ-070…073 — Beneficios de control, contested, loot por landmark, helpers territorio.
 * Control ≠ pintar verde vacío (GM §16.3).
 */
import { pushLog } from './state.js';

const RESIDUAL_MULT = 0.28;

/** Beneficios reales agregados del territorio controlado (legibles en UI). */
export function controlBenefits(state, content) {
  const controlled = (state.zones || []).filter((z) => z.state === 'controlled' && z.type !== 'camp');
  const n = controlled.length + ((state.zones || []).some((z) => z.type === 'camp' && z.state === 'controlled') ? 1 : 0);
  const per = content.balance?.defensePerControlledZone ?? 1.5;
  const defenseBonus = Math.min(12, n * per);
  const attackEase = Math.floor(n / 3);
  const stabilityCap = Math.min(2, Math.floor(n / 3));
  const contested = (state.zones || []).filter((z) => z.state === 'contested').length;
  const types = [...new Set(controlled.map((z) => z.type))];
  return {
    controlled: n,
    landmarks: controlled.length,
    defenseBonus: Math.round(defenseBonus * 10) / 10,
    attackIntensityReduction: attackEase,
    stabilityPerDay: stabilityCap,
    contested,
    types,
    residualLoot: true,
    label:
      n <= 1
        ? 'Solo el campamento'
        : `${controlled.length} landmarks · def +${defenseBonus.toFixed(0)} · ataques −${attackEase} int.`,
  };
}

/** Tabla de loot por tipo de landmark (ZZ-072). */
export function lootSpecForZone(zone, content) {
  const type = content.locationsDoc?.locationTypes?.[zone?.type];
  if (!type) return zone?.loot || { food: [0, 2], metal: [0, 2] };

  if (type.lootTable?.ranges) {
    const ranges = { ...type.lootTable.ranges };
    // Asegurar primary presentes
    (type.lootTable.primary || []).forEach((k) => {
      if (!ranges[k]) ranges[k] = [1, 2];
    });
    return ranges;
  }

  const bias = type.lootBias || zone?.loot || {};
  const lootMap = {};
  Object.entries(bias).forEach(([k, n]) => {
    const v = typeof n === 'number' ? n : 1;
    lootMap[k] = [Math.max(0, Math.floor(v)), Math.max(1, Math.ceil(v + 1))];
  });
  return Object.keys(lootMap).length ? lootMap : { food: [0, 2], metal: [0, 2] };
}

/** Escala loot según estado de zona (residual en controlled). */
export function scaleLootSpecForZoneState(zone, lootSpec) {
  const out = {};
  const mult =
    zone.state === 'controlled'
      ? RESIDUAL_MULT * Math.max(0.15, 1 - (zone.lootDepletion || 0))
      : zone.state === 'contested'
        ? 0.55
        : 1;
  Object.entries(lootSpec || {}).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      out[k] = [Math.max(0, Math.floor(v[0] * mult)), Math.max(v[0] === 0 && mult < 1 ? 0 : 1, Math.ceil(v[1] * mult))];
    } else if (typeof v === 'number') {
      out[k] = Math.max(0, v * mult);
    }
  });
  return out;
}

export function applyLootDepletion(zone, amount = 0.12) {
  if (!zone || zone.state !== 'controlled') return;
  zone.lootDepletion = Math.min(0.85, (zone.lootDepletion || 0) + amount);
}

export function zoneStateLabel(state) {
  return (
    {
      unknown: 'Desconocida',
      discovered: 'Conocida',
      hostile: 'Hostil',
      contested: 'En disputa',
      controlled: 'Controlada',
    }[state] || state
  );
}

/** Pérdida fronteriza: contested primero; hostile si ya estaba débil (ZZ-071). */
export function loseFrontierZone(state, rng) {
  const frontier = (state.zones || []).filter(
    (z) => (z.state === 'controlled' || z.state === 'contested') && z.type !== 'camp' && z.id !== 'camp'
  );
  if (!frontier.length) return null;
  const z = rng.pick(frontier);
  if (z.state === 'contested' || (z.controlProgress || 1) < 0.7) {
    z.state = 'hostile';
    z.controlProgress = Math.min(0.4, z.controlProgress || 0.3);
    z.infectedLeft = Math.max(z.infectedLeft || 0, rng.int(3, 7));
    pushLog(state, `Zona fronteriza caída: ${z.name || z.id} (hostil).`, 'bad');
  } else {
    z.state = 'contested';
    z.controlProgress = 0.45;
    z.infectedLeft = Math.max(z.infectedLeft || 0, rng.int(2, 5));
    pushLog(state, `Zona en disputa: ${z.name || z.id}. Hay que reconsolidar.`, 'warn');
  }
  state.stats.zonesControlled = state.zones.filter((x) => x.state === 'controlled').length;
  return z;
}

/** Tras expedición exitosa a contested → controlled. */
export function trySecureContested(state, zone, content, report) {
  if (!zone || zone.state !== 'contested') return false;
  const thr = content.balance.controlClearThreshold || 0.52;
  if (zone.infectedLeft <= 0 && (zone.controlProgress || 0) >= thr) {
    zone.state = 'controlled';
    zone.controlProgress = 1;
    zone.lootDepletion = Math.min(0.4, zone.lootDepletion || 0);
    report.controlled = true;
    report.secured = true;
    state.stats.zonesControlled = state.zones.filter((z) => z.state === 'controlled').length;
    state.stability += 3;
    pushLog(state, `Reconsolidáis ${zone.name}: vuelve a control.`, 'good');
    report.lines.push(`${zone.name} reconsolidada.`);
    return true;
  }
  return false;
}

export function lootHintKeys(zone, content) {
  const type = content.locationsDoc?.locationTypes?.[zone?.type];
  if (type?.lootTable?.primary?.length) {
    return [...type.lootTable.primary, ...(type.lootTable.secondary || []).slice(0, 2)];
  }
  return Object.keys(type?.lootBias || zone?.loot || {}).slice(0, 4);
}
