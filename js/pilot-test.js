/**
 * Modo pruebas exclusivo ?pilot=neni.
 * No altera reglas del juego normal. Save aislado (pilotNeniSave).
 */
import { makeExplorer, livingExplorers } from './explorers.js';
import { createRng } from './rng.js';
import { PILOT_FOOTPRINTS, isPilotNeni, pilotQaReadyTypes } from './pilot-footprints.js';

/** Camp seed del layout canónico 100×100 (locations.json). */
export const PILOT_SEED_CAMP = Object.freeze({ x: 48, y: 62 });

/** Escala provisional seed→mundo piloto (no es contrato espacial definitivo). */
export const PILOT_ZONE_REMAP_SCALE = 10;

/** Radios mínimos legibles en mapa 1819×865. */
export const PILOT_ZONE_R_MIN = 36;

/** En QA: catálogo aprobado completo. Piloto normal D1: farm + well + house. */
export function pilotBuildableTypeIds(state) {
  if (state?.flags?.pilotQaMode) return pilotQaReadyTypes();
  return new Set(['farm', 'well', 'house']);
}

/**
 * Remapea zonas seed (≈100×100) al entorno del HQ piloto.
 * Idempotente vía flags.pilotZonesRemapped.
 */
export function remapPilotZones(state) {
  if (!isPilotNeni(state) || state.flags?.pilotZonesRemapped) return;
  const camp = (state.zones || []).find((z) => z.type === 'camp');
  if (!camp) return;
  const sx = PILOT_SEED_CAMP.x;
  const sy = PILOT_SEED_CAMP.y;
  const scale = PILOT_ZONE_REMAP_SCALE;
  const W = 1819;
  const H = 865;
  (state.zones || []).forEach((z) => {
    if (!z || z.type === 'camp') return;
    const nx = camp.x + (Number(z.x) - sx) * scale;
    const ny = camp.y + (Number(z.y) - sy) * scale;
    z.x = Math.max(40, Math.min(W - 40, Math.round(nx)));
    z.y = Math.max(40, Math.min(H - 40, Math.round(ny)));
    const baseR = Number(z.r) || 14;
    z.r = Math.max(PILOT_ZONE_R_MIN, Math.round(baseR * 3));
  });
  state.flags = state.flags || {};
  state.flags.pilotZonesRemapped = true;
}

/** Descubre vecinos del camp para poder enviar expediciones en pruebas. */
export function revealPilotCampNeighbors(state) {
  if (!isPilotNeni(state)) return;
  const camp = (state.zones || []).find((z) => z.type === 'camp');
  if (!camp) return;
  const ids = new Set(camp.neighbors || []);
  (state.zones || []).forEach((z) => {
    if (!z || z.type === 'camp') return;
    if (ids.has(z.id) && z.state === 'unknown') z.state = 'discovered';
  });
}

/**
 * Activa modo QA (?pilot=neni&qa=1): recursos altos, pop/labor, exploradores, era abierta.
 * Solo piloto. No gasta reglas del juego normal.
 */
export function applyPilotTestMode(state, content) {
  if (!isPilotNeni(state)) return;
  state.flags = state.flags || {};
  state.flags.pilotTestMode = true;
  state.flags.pilotQaMode = true;

  const order = content?.balance?.resourceOrder || [
    'food',
    'water',
    'wood',
    'metal',
    'medicine',
    'fuel',
    'ammo',
  ];
  state.resources = state.resources || {};
  order.forEach((k) => {
    state.resources[k] = Math.max(state.resources[k] || 0, 9999);
  });
  // Secondary reales del catálogo (ya en normalizeResources)
  ['parts', 'tools'].forEach((k) => {
    if (k in state.resources) state.resources[k] = Math.max(state.resources[k] || 0, 9999);
  });

  state.population = state.population || {};
  // Alineado con capacidad HQ (6) + margen para no disparar overflow al auditar días.
  state.population.total = Math.max(state.population.total || 0, 6);
  state.population.labor = state.population.labor || {};
  state.population.labor.build = Math.max(2, state.population.labor.build || 0);
  state.population.labor.idle = Math.max(2, state.population.labor.idle || 0);

  // Abrir catálogo por era sin tocar balance normal
  state.era = Math.max(state.era || 0, 2);

  // Hasta 3 exploradores listos (slots de auditoría)
  const rng = createRng((state.rngState || 1) + 4242);
  state.explorers = state.explorers || [];
  while (livingExplorers(state).length < 3) {
    state.explorers.push(
      makeExplorer(rng, content?.survivorsDoc, {
        skillRange: [2, 4],
      })
    );
  }
  livingExplorers(state).forEach((e) => {
    if (e.status === 'wounded') {
      e.status = 'ready';
      e.wounds = 0;
    }
    if (e.status !== 'dead' && e.status !== 'away') e.status = 'ready';
  });
  if (!state.selectedExplorerId) {
    state.selectedExplorerId = livingExplorers(state).find((e) => e.status === 'ready')?.id || null;
  }

  remapPilotZones(state);
  revealPilotCampNeighbors(state);
}
