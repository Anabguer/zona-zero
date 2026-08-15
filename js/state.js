/**
 * Estado de partida Zona Zero.
 */
import { randInt, pick, uid, clamp } from './util.js';

export const SAVE_VERSION = 1;

export async function loadContent() {
  const base = new URL('../content/', import.meta.url);
  const [balance, buildings, zonesDoc, eventsDoc, survivorsDoc] = await Promise.all([
    fetch(new URL('balance.json', base)).then((r) => r.json()),
    fetch(new URL('buildings.json', base)).then((r) => r.json()),
    fetch(new URL('zones.json', base)).then((r) => r.json()),
    fetch(new URL('events.json', base)).then((r) => r.json()),
    fetch(new URL('survivors.json', base)).then((r) => r.json()),
  ]);
  return { balance, buildings, zonesDoc, eventsDoc, survivorsDoc };
}

function makeSurvivor(names, skillKeys, forcedName = null) {
  const skills = {};
  skillKeys.forEach((k) => {
    skills[k] = randInt(1, 4);
  });
  // Un poco de especialización
  const focus = pick(skillKeys);
  skills[focus] = clamp(skills[focus] + randInt(1, 3), 1, 8);
  return {
    id: uid('s'),
    name: forcedName || pick(names),
    hp: 100,
    maxHp: 100,
    skills,
    status: 'ok', // ok | wounded | dead
    busyUntilDay: 0,
  };
}

export function createNewState(content, colonyName = 'Refugio 0') {
  const { balance, zonesDoc, survivorsDoc } = content;
  const names = [...survivorsDoc.names];
  const skillKeys = survivorsDoc.skillKeys;
  const survivors = [];
  for (let i = 0; i < balance.startingSurvivors; i++) {
    const name = names.splice(randInt(0, names.length - 1), 1)[0];
    survivors.push(makeSurvivor(survivorsDoc.names, skillKeys, name));
  }

  const zones = zonesDoc.zones.map((z) => ({
    id: z.id,
    name: z.name,
    x: z.x,
    y: z.y,
    r: z.r,
    state: z.startState || 'unknown',
    risk: z.risk,
    loot: z.loot,
    infected: z.infected || [0, 0],
    neighbors: z.neighbors || [],
  }));

  const gw = balance.baseGrid.w;
  const gh = balance.baseGrid.h;
  const buildings = [
    { id: uid('b'), type: 'shelter', x: 2, y: 2 },
    { id: uid('b'), type: 'shelter', x: 3, y: 2 },
  ];

  return {
    v: SAVE_VERSION,
    colonyName: colonyName.slice(0, 40) || 'Refugio 0',
    day: 1,
    resources: { ...balance.startingResources },
    survivors,
    base: { w: gw, h: gh, buildings },
    zones,
    expedition: null,
    selectedSurvivorIds: [],
    selectedZoneId: null,
    buildMode: null,
    log: [
      {
        day: 1,
        text: 'Día 0 terminó. Queda el silencio… y este refugio. Hoy empieza Zona Zero.',
        kind: 'story',
      },
    ],
    director: {
      threat: 6,
      cooldowns: {},
      recentLosses: 0,
      lastEventId: null,
    },
    flags: {
      defeated: false,
      defeatReason: null,
      victoryHint: false,
    },
    stats: {
      expeditions: 0,
      zonesControlled: 1,
      buildingsBuilt: 0,
      deaths: 0,
    },
  };
}

export function livingSurvivors(state) {
  return state.survivors.filter((s) => s.status !== 'dead');
}

export function housingCapacity(state, buildingsContent, balance) {
  const shelters = state.base.buildings.filter((b) => b.type === 'shelter').length;
  return shelters * (balance.housingPerShelter || 2);
}

export function defenseValue(state, balance) {
  const towers = state.base.buildings.filter((b) => b.type === 'watchtower').length;
  const armed = livingSurvivors(state).filter((s) => s.skills.fight >= 3).length;
  return (
    towers * (balance.defensePerWatchtower || 8) +
    armed * (balance.defensePerArmedSurvivor || 3) +
    Math.floor((state.resources.ammo || 0) * 1.5)
  );
}

export function pushLog(state, text, kind = 'info') {
  state.log.unshift({ day: state.day, text, kind });
  if (state.log.length > 80) state.log.length = 80;
}

export function summarizeState(state) {
  const alive = livingSurvivors(state).length;
  if (state.flags.defeated) {
    return `Derrota · Día ${state.day}`;
  }
  return `Día ${state.day} · ${alive} vivos · amenaza ${state.director.threat}`;
}

export { makeSurvivor };
