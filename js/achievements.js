/**
 * ZZ-110…113 — Logros: schema, tracking, ≥60, badge no invasivo.
 * Recompensa: badge + estabilidad/flavor. Sin power creep / sin electricidad.
 */
import { pushLog } from './state.js';
import { housingCapacity } from './state.js';

export function allAchievements(content) {
  return content.achievementsDoc?.achievements || [];
}

export function assertNoEnergyAchievements(content) {
  const bad = allAchievements(content).some((a) =>
    /energ|generator|solar|power_grid|electric/i.test(`${a.id} ${a.name} ${a.desc || ''}`)
  );
  return !bad;
}

export function ensureAchievements(state) {
  if (!Array.isArray(state.achievementsUnlocked)) state.achievementsUnlocked = [];
  if (!state.achievementMeta) {
    state.achievementMeta = {
      noDeathStreak: 0,
      calmNights: 0,
      attacksRepelled: 0,
      pendingBadge: null,
      recentBadges: [],
    };
  }
  return state.achievementMeta;
}

function unlocked(state, id) {
  return (state.achievementsUnlocked || []).includes(id);
}

function countBuildings(state, type) {
  return (state.base?.buildings || []).filter((b) => b.type === type && b.hp > 0).length;
}

function evalWhen(state, content, when) {
  if (!when) return false;
  const { kind, arg } = when;
  const pop = state.population?.total || 0;
  const controlled = (state.zones || []).filter((z) => z.state === 'controlled').length;
  const discovered = (state.zones || []).filter((z) => z.state !== 'unknown').length;
  const meta = ensureAchievements(state);

  switch (kind) {
    case 'day_ge':
      return (state.day || 0) >= arg;
    case 'season':
      return state.season === arg;
    case 'weather':
      return state.weather === arg;
    case 'no_deaths_streak':
      return (meta.noDeathStreak || 0) >= arg;
    case 'flag':
      return !!state.flags?.narrative?.[arg] || !!state.flags?.[arg];
    case 'endless_days':
      return !!(state.flags?.endless && (state.endlessDay || 0) >= arg);
    case 'pop_ge':
      return pop >= arg;
    case 'full_housing':
      return pop > 0 && pop <= housingCapacity(state, content.buildings);
    case 'healthy_pop':
      return (
        pop >= arg &&
        (state.population?.sick || 0) === 0 &&
        (state.population?.injured || 0) === 0
      );
    case 'stability_ge':
      return (state.stability || 0) >= arg;
    case 'expeditions_ge':
      return (state.stats?.expeditions || 0) >= arg;
    case 'discovered_ge':
      return discovered >= arg;
    case 'controlled_ge':
      return controlled >= arg;
    case 'explorer_level':
      return (state.explorers || []).some((e) => e.status !== 'dead' && (e.level || 1) >= arg);
    case 'explorers_alive':
      return (state.explorers || []).filter((e) => e.status !== 'dead').length >= arg;
    case 'building':
      return countBuildings(state, arg) >= 1;
    case 'building_count':
      return countBuildings(state, arg[0]) >= arg[1];
    case 'buildings_ge':
      return (state.base?.buildings || []).filter((b) => b.hp > 0).length >= arg;
    case 'attacks_repelled':
      return (meta.attacksRepelled || 0) >= arg;
    case 'research_ge':
      return (state.research?.unlocked || []).length >= arg;
    case 'vehicles_ge':
      return (state.vehiclesOwned || []).length >= arg;
    case 'calm_nights':
      return (meta.calmNights || 0) >= arg;
    case 'colony_name':
      return String(state.colonyName || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .includes(String(arg).toLowerCase());
    default:
      return false;
  }
}

/** Desbloquea logro: badge pendiente + estabilidad (no power creep). */
export function unlockAchievement(state, content, id) {
  ensureAchievements(state);
  if (unlocked(state, id)) return false;
  const def = allAchievements(content).find((a) => a.id === id);
  if (!def) return false;
  // Sin electricidad / pay-to-win
  if (/energ|generator|solar|power_/i.test(id)) return false;
  state.achievementsUnlocked.push(id);
  const stab = def.reward?.stability || 1;
  state.stability = Math.min(100, (state.stability || 0) + stab);
  const meta = state.achievementMeta;
  meta.pendingBadge = {
    id,
    name: def.name,
    desc: def.desc,
    day: state.day,
  };
  meta.recentBadges = [meta.pendingBadge, ...(meta.recentBadges || [])].slice(0, 8);
  pushLog(state, `Logro: ${def.name}.`, 'good');
  return true;
}

export function tickAchievements(state, content) {
  ensureAchievements(state);
  const meta = state.achievementMeta;
  // rachas
  if ((state.stats?.deathsToday || 0) === 0 && (state.director?.recentLosses || 0) === 0) {
    meta.noDeathStreak = (meta.noDeathStreak || 0) + 1;
  } else {
    meta.noDeathStreak = 0;
  }
  if (state.flags?.endless) {
    state.endlessDay = (state.endlessDay || 0) + 1;
  }

  let n = 0;
  allAchievements(content).forEach((a) => {
    if (unlocked(state, a.id)) return;
    if (evalWhen(state, content, a.when)) {
      if (unlockAchievement(state, content, a.id)) n += 1;
    }
  });
  return n;
}

export function noteAchievementFlag(state, flag) {
  if (!state.flags) state.flags = {};
  if (!state.flags.narrative) state.flags.narrative = {};
  state.flags.narrative[flag] = true;
}

export function noteCalmNight(state) {
  const meta = ensureAchievements(state);
  meta.calmNights = (meta.calmNights || 0) + 1;
}

export function noteAttackRepelled(state, { messy = false, zeroAmmo = false, horde = false } = {}) {
  const meta = ensureAchievements(state);
  meta.attacksRepelled = (meta.attacksRepelled || 0) + 1;
  if (messy) noteAchievementFlag(state, 'messy_survive');
  if (zeroAmmo) noteAchievementFlag(state, 'zero_ammo_win');
  if (horde) noteAchievementFlag(state, 'horde_faced');
}

export function consumePendingBadge(state) {
  const meta = ensureAchievements(state);
  const b = meta.pendingBadge;
  meta.pendingBadge = null;
  return b;
}
