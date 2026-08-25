/**
 * B1 — Resolución de modo de entrada (puro, testeable en Node).
 *
 * Kinds:
 * - 'official'     → mundo canónico Neni + persistencia MySQL (QA opcional aislado).
 * - 'legacy'       → partida Clásica existente (solo cargar; sin nuevas partidas legacy).
 * - 'legacy-empty' → se pidió Clásico pero no hay partida guardada.
 *
 * Reglas de producto (B1):
 * - `?pilot=neni` es alias compatible del juego oficial.
 * - No existen nuevas partidas legacy: legacy+nueva → oficial.
 * - Sin save en BD y sin params → nueva partida oficial implícita.
 * - Save en BD decide generación: gen 'neni' (o flags.pilot) → oficial; resto → Clásica.
 */
import { isOfficialGen } from './state.js';

export function resolvePlayMode(opts = {}) {
  const {
    explicitPilot = false,
    bodyPilot = false,
    isNew = false,
    clearExisting = false,
    qa = false,
    legacyRequested = false,
    peek = null,
  } = opts;

  if (qa) return { kind: 'official', qa: true, reason: 'qa' };
  if (explicitPilot || bodyPilot) {
    // Protección B1: el alias nunca pisa una partida Clásica ya guardada en BD.
    if (!isNew && peek && peek.ok && peek.state && !isOfficialGen(peek.state)) {
      return { kind: 'legacy', qa: false, reason: 'pilot-alias-legacy-protected' };
    }
    return { kind: 'official', qa: false, reason: 'pilot-alias' };
  }

  if (legacyRequested) {
    // Producto B1: no se permiten nuevas partidas Clásicas.
    if (isNew || clearExisting) return { kind: 'official', qa: false, reason: 'legacy-new-blocked' };
    if (!peek || !peek.ok || !peek.state) {
      return { kind: 'legacy-empty', qa: false, reason: 'legacy-no-save' };
    }
    return { kind: 'legacy', qa: false, reason: 'legacy-requested' };
  }

  if (isNew) return { kind: 'official', qa: false, reason: 'new' };
  if (!peek || !peek.ok || !peek.state) return { kind: 'official', qa: false, reason: 'no-save' };
  const migratedPreview = peek.state;
  return isOfficialGen(migratedPreview)
    ? { kind: 'official', qa: false, reason: 'save-official' }
    : { kind: 'legacy', qa: false, reason: 'save-legacy' };
}
