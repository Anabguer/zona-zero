/**
 * ZZ-130…133 — Contactos / comercio lean (sin diplomacia 4X).
 * Relación: hostile | wary | neutral | friendly
 */
import { pushLog } from './state.js';
import { noteAchievementFlag } from './achievements.js';

export const RELATION_ORDER = ['hostile', 'wary', 'neutral', 'friendly'];

export function relationLabel(rel) {
  return (
    {
      hostile: 'hostil',
      wary: 'tensa',
      neutral: 'neutral',
      friendly: 'amistosa',
    }[rel] || rel
  );
}

export function discoveredFactions(state) {
  return (state.factions || []).filter((f) => f.discovered);
}

export function findFaction(state, idOrTrait) {
  return (state.factions || []).find(
    (f) => f.id === idOrTrait || f.trait === idOrTrait || f.templateId === idOrTrait
  );
}

export function discoverFaction(state, rng, opts = {}) {
  const pool = (state.factions || []).filter((f) => !f.discovered);
  if (!pool.length) {
    const any = (state.factions || [])[0];
    if (any) {
      any.discovered = true;
      return any;
    }
    return null;
  }
  let pick = pool[0];
  if (opts.trait) {
    pick = pool.find((f) => f.trait === opts.trait) || pick;
  } else if (rng?.pick) {
    pick = rng.pick(pool);
  }
  pick.discovered = true;
  if (opts.relation) pick.relation = opts.relation;
  pushLog(state, `Contacto: ${pick.name} (${relationLabel(pick.relation)}).`, 'info');
  return pick;
}

export function shiftRelation(state, faction, delta) {
  if (!faction) return null;
  let i = RELATION_ORDER.indexOf(faction.relation || 'neutral');
  if (i < 0) i = 2;
  i = Math.max(0, Math.min(RELATION_ORDER.length - 1, i + delta));
  faction.relation = RELATION_ORDER[i];
  return faction.relation;
}

/**
 * Trueque lean: paga wants (1 ud) por offers (1–2 ud) según tradeMult y relación.
 */
export function tradeWithFaction(state, faction, { give, take } = {}) {
  if (!faction?.discovered) return { ok: false, error: 'Grupo desconocido' };
  if (faction.relation === 'hostile') return { ok: false, error: 'No comercian: hostiles' };
  const wants = faction.wants?.length ? faction.wants : ['food'];
  const offers = faction.offers?.length ? faction.offers : ['metal'];
  const payKey = give && wants.includes(give) ? give : wants[0];
  const getKey = take && offers.includes(take) ? take : offers[0];
  const mult = faction.tradeMult || 1;
  const pay = Math.max(1, Math.round(1 * mult));
  const get = faction.relation === 'friendly' ? 2 : 1;
  if ((state.resources[payKey] || 0) < pay) {
    return { ok: false, error: `Falta ${pay} ${payKey}` };
  }
  state.resources[payKey] -= pay;
  state.resources[getKey] = (state.resources[getKey] || 0) + get;
  if (faction.relation === 'wary' || faction.relation === 'neutral') {
    shiftRelation(state, faction, 1);
  }
  noteAchievementFlag(state, 'trade_done');
  pushLog(
    state,
    `Trueque con ${faction.name}: −${pay} ${payKey} · +${get} ${getKey} (${relationLabel(faction.relation)}).`,
    'good'
  );
  return { ok: true, payKey, pay, getKey, get };
}

/** Evento: descubrir + opcional trueque automático si hay stock. */
export function applyFactionContact(state, effects, rng) {
  if (!effects) return null;
  let f = null;
  if (effects.discoverFaction) {
    f = discoverFaction(state, rng, {
      trait: typeof effects.discoverFaction === 'string' ? effects.discoverFaction : null,
      relation: effects.factionRelation || null,
    });
  }
  if (effects.factionRelationDelta && f) {
    shiftRelation(state, f, Number(effects.factionRelationDelta) || 0);
  }
  if (effects.tradeOffer) {
    f = f || discoveredFactions(state)[0] || discoverFaction(state, rng);
    if (f) {
      const r = tradeWithFaction(state, f, {
        give: effects.tradeGive,
        take: effects.tradeTake,
      });
      if (!r.ok && effects.tradeOffer === 'soft') {
        pushLog(state, `${f.name} ofrece trueque, pero no podéis pagar ahora.`, 'info');
      }
    }
  }
  return f;
}
