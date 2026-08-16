/**
 * ZZ-151 — Alertas priorizadas (§21.1)
 * Capas: critical (banner) → objective (chip) → tip (no compite con coach).
 * Orientar, no mandar. Localizar vía buildingIds / zoneId cuando exista.
 */
import { currentObjective } from './colony.js';

export const ALERT_LAYER = {
  critical: 100,
  high: 70,
  normal: 40,
  tip: 20,
};

/** Prioridad por id de objetivo existente. */
const OBJ_PRIORITY = {
  food_critical: ALERT_LAYER.critical,
  water_critical: ALERT_LAYER.critical,
  pending_attack: ALERT_LAYER.critical,
  catastrophe: ALERT_LAYER.critical,
  outbreak: ALERT_LAYER.high,
  need_beds: ALERT_LAYER.high,
  need_warmth: ALERT_LAYER.high,
  cold_exposure: ALERT_LAYER.high,
  need_repair: ALERT_LAYER.high,
  housing_overflow: ALERT_LAYER.normal,
  survive: ALERT_LAYER.normal,
  housing: ALERT_LAYER.normal,
  explore: ALERT_LAYER.normal,
  secure_contested: ALERT_LAYER.normal,
  need_ammo: ALERT_LAYER.normal,
  defend: ALERT_LAYER.normal,
  recovery: ALERT_LAYER.tip,
};

function foodWaterCritical(state) {
  const pop = state.population?.total || 0;
  if (pop <= 0) return [];
  const food = state.resources?.food || 0;
  const water = state.resources?.water || 0;
  const daysFood = food / pop;
  const daysWater = water / pop;
  const out = [];
  if (daysFood < 1.2) {
    out.push({
      id: 'food_critical',
      layer: 'critical',
      priority: ALERT_LAYER.critical,
      title: 'Comida crítica',
      text: `Comida para ~${daysFood.toFixed(1)} día(s).`,
      banner: true,
    });
  }
  if (daysWater < 1.2) {
    out.push({
      id: 'water_critical',
      layer: 'critical',
      priority: ALERT_LAYER.critical,
      title: 'Agua crítica',
      text: `Agua para ~${daysWater.toFixed(1)} día(s).`,
      banner: true,
    });
  }
  return out;
}

function catastropheAlert(state) {
  const cat = state.pendingCatastrophe;
  if (!cat) return null;
  const d = Math.max(0, (cat.dueDay || 0) - state.day);
  return {
    id: 'catastrophe',
    layer: 'critical',
    priority: ALERT_LAYER.critical,
    title: cat.name || 'Catástrofe',
    text: `Catástrofe avisada · ${cat.name} · ${d}d${cat.prepared ? ' · preparados' : ' · preparad stock/defensa'}`,
    banner: true,
  };
}

/**
 * Lista priorizada. Banner = solo critical. Chip = mejor no-banner o critical si no hay banner.
 */
export function collectAlerts(state, content) {
  const list = [];
  const cat = catastropheAlert(state);
  if (cat) list.push(cat);
  list.push(...foodWaterCritical(state));

  const obj = currentObjective(state, content);
  if (obj) {
    const priority = OBJ_PRIORITY[obj.id] ?? ALERT_LAYER.normal;
    const layer =
      priority >= ALERT_LAYER.critical
        ? 'critical'
        : priority >= ALERT_LAYER.high
          ? 'high'
          : priority >= ALERT_LAYER.normal
            ? 'normal'
            : 'tip';
    list.push({
      ...obj,
      layer,
      priority,
      banner:
        obj.id === 'pending_attack' ||
        obj.id === 'food_critical' ||
        obj.id === 'water_critical' ||
        obj.id === 'catastrophe',
    });
  }

  list.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  return list;
}

/** Texto del banner crítico (una sola alerta). Recovery ya no usa banner. */
export function criticalBannerAlert(state, content) {
  const alerts = collectAlerts(state, content);
  return alerts.find((a) => a.banner) || null;
}

/** Objetivo del chip: prioriza no-crítico si el banner ya muestra el crítico. */
export function missionAlert(state, content) {
  const alerts = collectAlerts(state, content);
  const banner = criticalBannerAlert(state, content);
  if (banner) {
    const next = alerts.find((a) => a.id !== banner.id && a.layer !== 'tip');
    if (next) return next;
    // Tip (p. ej. recovery) mejor que duplicar el mismo crítico en chip + banner
    return alerts.find((a) => a.id !== banner.id) || null;
  }
  return alerts.find((a) => a.layer !== 'tip') || alerts[0] || null;
}
