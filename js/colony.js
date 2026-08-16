/**
 * Gestión de colonia: trabajadores por edificio + objetivos inmediatos.
 * La población es colectiva; los edificios piden cupos numéricos.
 */
import { clamp } from './util.js';
import { emptyLabor, workforce, redistributeLabor, LABOR_KEYS } from './population.js';

/** Rol laboral de un edificio (null = no se gestiona con trabajadores). */
export function laborKeyForBuilding(def) {
  if (!def || !(def.jobs > 0)) return null;
  if (def.produces?.food) return 'food';
  if (def.produces?.water) return 'water';
  if (def.produces?.medicine) return 'medicine';
  if (def.produces) return 'produce';
  if ((def.defense || 0) > 0) return 'defense';
  if (def.category === 'medical') return 'medicine';
  if (def.category === 'defense') return 'defense';
  return 'produce';
}

export function staffableBuildings(state, content, key = null) {
  return (state.base?.buildings || []).filter((b) => {
    if (b.hp <= 0) return false;
    const def = content.buildings[b.type];
    const k = laborKeyForBuilding(def);
    if (!k) return false;
    return key == null || k === key;
  });
}

export function buildingWorkerCap(def) {
  return Math.max(0, def?.jobs || 0);
}

export function ensureBuildingWorkers(state, content) {
  (state.base?.buildings || []).forEach((b) => {
    const def = content.buildings?.[b.type];
    const cap = buildingWorkerCap(def);
    if (cap <= 0) {
      b.workers = 0;
      return;
    }
    if (b.workers == null || Number.isNaN(b.workers)) b.workers = 0;
    b.workers = clamp(Math.floor(b.workers), 0, cap);
  });
}

/** Suma trabajadores asignados a edificios de un rol. */
export function sumBuildingWorkers(state, content, key) {
  return staffableBuildings(state, content, key).reduce((n, b) => n + (b.workers || 0), 0);
}

/**
 * Reconciliar labor con edificios + cupos libres (build / idle / defensa suelta).
 * Fuente de verdad: workers en edificios + manual.build/defense/medicine extras.
 */
export function syncLaborFromColony(state, content) {
  const pop = state.population;
  if (!pop) return;
  ensureBuildingWorkers(state, content);
  if (!pop.labor) pop.labor = emptyLabor();
  if (!pop.manual) pop.manual = {};

  const wf = workforce(pop);
  const next = emptyLabor();
  next.food = sumBuildingWorkers(state, content, 'food');
  next.water = sumBuildingWorkers(state, content, 'water');
  next.produce = sumBuildingWorkers(state, content, 'produce');
  next.medicine = sumBuildingWorkers(state, content, 'medicine');
  next.defense = sumBuildingWorkers(state, content, 'defense');

  // Defensa / medicina / construcción pueden tener cupos sin edificio (manual)
  const freeDefense = Math.max(0, Math.floor(pop.manual.defenseExtra || 0));
  const freeMedicine = Math.max(0, Math.floor(pop.manual.medicineExtra || 0));
  const buildWant = Math.max(0, Math.floor(pop.manual.build ?? pop.labor.build ?? 0));

  let used = next.food + next.water + next.produce + next.medicine + next.defense;
  const addFree = (key, want) => {
    const room = Math.max(0, wf - used);
    const n = clamp(want, 0, room);
    next[key] += n;
    used += n;
    return n;
  };
  addFree('defense', freeDefense);
  addFree('medicine', freeMedicine);
  next.build = addFree('build', buildWant);
  pop.manual.build = next.build;
  pop.manual.defenseExtra = Math.min(freeDefense, Math.max(0, next.defense - sumBuildingWorkers(state, content, 'defense')));
  pop.manual.medicineExtra = Math.min(freeMedicine, Math.max(0, next.medicine - sumBuildingWorkers(state, content, 'medicine')));

  // Si nos pasamos de wf, recortar edificios (último recurso)
  if (used > wf) {
    let over = used - wf;
    const order = ['produce', 'defense', 'medicine', 'build', 'water', 'food'];
    for (const key of order) {
      if (over <= 0) break;
      const list = staffableBuildings(state, content, key).slice().sort((a, b) => (b.workers || 0) - (a.workers || 0));
      for (const b of list) {
        if (over <= 0) break;
        const take = Math.min(b.workers || 0, over);
        b.workers -= take;
        next[key] -= take;
        over -= take;
      }
      if (key === 'build' && over > 0) {
        const take = Math.min(next.build, over);
        next.build -= take;
        pop.manual.build = next.build;
        over -= take;
      }
    }
    used = LABOR_KEYS.reduce((n, k) => n + (next[k] || 0), 0) - (next.idle || 0);
  }

  next.idle = Math.max(0, wf - (next.food + next.water + next.build + next.produce + next.defense + next.medicine));
  pop.labor = next;
  return next;
}

function freeSlots(state, content, key) {
  return staffableBuildings(state, content, key).reduce((n, b) => {
    const cap = buildingWorkerCap(content.buildings[b.type]);
    return n + Math.max(0, cap - (b.workers || 0));
  }, 0);
}

function addWorkersToCategory(state, content, key, n) {
  let left = n;
  const list = staffableBuildings(state, content, key).slice().sort((a, b) => (a.workers || 0) - (b.workers || 0));
  for (const b of list) {
    if (left <= 0) break;
    const cap = buildingWorkerCap(content.buildings[b.type]);
    const room = cap - (b.workers || 0);
    if (room <= 0) continue;
    const take = Math.min(room, left);
    b.workers = (b.workers || 0) + take;
    left -= take;
  }
  return n - left;
}

function removeWorkersFromCategory(state, content, key, n) {
  let left = n;
  const list = staffableBuildings(state, content, key).slice().sort((a, b) => (b.workers || 0) - (a.workers || 0));
  for (const b of list) {
    if (left <= 0) break;
    const take = Math.min(b.workers || 0, left);
    b.workers -= take;
    left -= take;
  }
  return n - left;
}

/**
 * Ajuste numérico desde el panel de población.
 * food/water/produce → edificios; build → cupo libre; defense/medicine → edificios + extras.
 */
export function adjustCategoryLabor(state, content, key, delta) {
  if (!LABOR_KEYS.includes(key) || key === 'idle') return { ok: false, error: 'Inválido' };
  ensureBuildingWorkers(state, content);
  const pop = state.population;
  if (!pop.manual) pop.manual = {};
  const wf = workforce(pop);
  syncLaborFromColony(state, content);
  const labor = pop.labor;
  const cur = labor[key] || 0;
  const want = clamp(cur + delta, 0, wf);

  if (want === cur) {
    syncLaborFromColony(state, content);
    return { ok: true, labor: { ...pop.labor } };
  }

  if (want > cur) {
    const need = want - cur;
    const idle = labor.idle || 0;
    if (idle < need && !['build', 'defense', 'medicine'].includes(key)) {
      // intentar liberar de otras categorías no esenciales
      const donors = ['produce', 'defense', 'medicine', 'build'].filter((k) => k !== key);
      let freed = 0;
      for (const d of donors) {
        if (freed >= need - idle) break;
        const take = Math.min((labor[d] || 0), need - idle - freed);
        if (take <= 0) continue;
        if (d === 'build') {
          pop.manual.build = Math.max(0, (pop.manual.build || 0) - take);
        } else if (['food', 'water', 'produce', 'defense', 'medicine'].includes(d)) {
          removeWorkersFromCategory(state, content, d, take);
          if (d === 'defense') pop.manual.defenseExtra = Math.max(0, (pop.manual.defenseExtra || 0) - take);
          if (d === 'medicine') pop.manual.medicineExtra = Math.max(0, (pop.manual.medicineExtra || 0) - take);
        }
        freed += take;
      }
      syncLaborFromColony(state, content);
    }
    const avail = pop.labor.idle || 0;
    const add = Math.min(need, avail);
    if (key === 'build') {
      pop.manual.build = (pop.manual.build || 0) + add;
    } else if (key === 'defense') {
      const toBld = addWorkersToCategory(state, content, 'defense', add);
      pop.manual.defenseExtra = (pop.manual.defenseExtra || 0) + Math.max(0, add - toBld);
    } else if (key === 'medicine') {
      const toBld = addWorkersToCategory(state, content, 'medicine', add);
      pop.manual.medicineExtra = (pop.manual.medicineExtra || 0) + Math.max(0, add - toBld);
    } else {
      const placed = addWorkersToCategory(state, content, key, add);
      if (placed < add && freeSlots(state, content, key) <= 0) {
        syncLaborFromColony(state, content);
        return {
          ok: false,
          error: key === 'food' || key === 'water' || key === 'produce'
            ? 'Sin edificios con puestos libres. Construid primero.'
            : 'Sin puestos libres',
        };
      }
    }
  } else {
    const drop = cur - want;
    if (key === 'build') {
      pop.manual.build = Math.max(0, (pop.manual.build || 0) - drop);
    } else if (key === 'defense') {
      const fromExtra = Math.min(pop.manual.defenseExtra || 0, drop);
      pop.manual.defenseExtra = (pop.manual.defenseExtra || 0) - fromExtra;
      removeWorkersFromCategory(state, content, 'defense', drop - fromExtra);
    } else if (key === 'medicine') {
      const fromExtra = Math.min(pop.manual.medicineExtra || 0, drop);
      pop.manual.medicineExtra = (pop.manual.medicineExtra || 0) - fromExtra;
      removeWorkersFromCategory(state, content, 'medicine', drop - fromExtra);
    } else {
      removeWorkersFromCategory(state, content, key, drop);
    }
  }

  syncLaborFromColony(state, content);
  return { ok: true, labor: { ...pop.labor } };
}

export function adjustBuildingWorkers(state, content, buildingId, delta) {
  const b = state.base.buildings.find((x) => x.id === buildingId && x.hp > 0);
  if (!b) return { ok: false, error: 'Edificio no encontrado' };
  const def = content.buildings[b.type];
  const key = laborKeyForBuilding(def);
  if (!key) return { ok: false, error: 'Este edificio no admite trabajadores' };
  const cap = buildingWorkerCap(def);
  ensureBuildingWorkers(state, content);
  syncLaborFromColony(state, content);
  const cur = b.workers || 0;
  const want = clamp(cur + delta, 0, cap);
  if (want === cur) return { ok: true, workers: cur };

  if (want > cur) {
    const need = want - cur;
    if ((state.population.labor?.idle || 0) < need) {
      return { ok: false, error: 'Sin gente disponible' };
    }
    b.workers = want;
  } else {
    b.workers = want;
  }
  syncLaborFromColony(state, content);
  return { ok: true, workers: b.workers, labor: { ...state.population.labor } };
}

export function autoStaffColony(state, content) {
  const pop = state.population;
  if (!pop) return { ok: false };
  ensureBuildingWorkers(state, content);
  staffableBuildings(state, content).forEach((b) => {
    b.workers = 0;
  });
  pop.manual = { build: 0, defenseExtra: 0, medicineExtra: 0 };
  const wf = workforce(pop);
  let left = wf;
  const fill = (key, maxShare) => {
    const want = Math.min(left, Math.max(0, Math.floor(wf * maxShare)));
    const placed = addWorkersToCategory(state, content, key, want);
    left -= placed;
    return placed;
  };
  // Prioridad supervivencia: al menos 1 en comida y agua si hay edificios
  const foodB = staffableBuildings(state, content, 'food');
  const waterB = staffableBuildings(state, content, 'water');
  if (foodB.length && left > 0) {
    foodB[0].workers = Math.min(buildingWorkerCap(content.buildings[foodB[0].type]), 1);
    left -= 1;
  }
  if (waterB.length && left > 0) {
    waterB[0].workers = Math.min(buildingWorkerCap(content.buildings[waterB[0].type]), 1);
    left -= 1;
  }
  fill('food', 0.35);
  fill('water', 0.25);
  fill('produce', 0.12);
  fill('defense', 0.1);
  if (left >= 1) {
    pop.manual.build = Math.min(left, Math.max(1, Math.floor(wf * 0.12)));
  }
  syncLaborFromColony(state, content);
  return { ok: true };
}

/** Objetivo inmediato discreto (no tutorial). */
export function currentObjective(state, content) {
  const pop = state.population?.total || 0;
  const food = state.resources?.food || 0;
  const water = state.resources?.water || 0;
  const daysFood = pop > 0 ? food / pop : food;
  const daysWater = pop > 0 ? water / pop : water;
  const hasFarm = (state.base?.buildings || []).some((b) => ['farm', 'greenhouse', 'kitchen'].includes(b.type) && b.hp > 0);
  const hasWell = (state.base?.buildings || []).some((b) => ['well', 'pump'].includes(b.type) && b.hp > 0);
  const farmStaff = staffableBuildings(state, content, 'food').reduce((n, b) => n + (b.workers || 0), 0);
  const wellStaff = staffableBuildings(state, content, 'water').reduce((n, b) => n + (b.workers || 0), 0);
  const cap = (state.base?.buildings || []).reduce((n, b) => {
    const d = content.buildings[b.type];
    return n + (b.hp > 0 && d?.housing ? d.housing : 0);
  }, 0);
  const explored = (state.expeditionsDone || 0) + (state.stats?.expeditions || 0);
  const controlled = (state.zones || []).filter((z) => z.state === 'controlled').length;

  // ZZ-033/045: aviso frío / madera
  const pending = state.pendingWeather;
  if (pending && (pending.type === 'cold' || pending.type === 'blizzard')) {
    const days = Math.max(0, (pending.startsOnDay || state.day) - state.day);
    const need = pending.woodPerDay || 0;
    const reserve = need > 0 ? Math.floor((state.resources?.wood || 0) / need) : 99;
    return {
      id: 'need_warmth',
      title: 'Frío anunciado',
      text: `Frío en ${days} día(s) — ~${need} madera/día · reserva ${reserve} días.`,
    };
  }
  if (state.weather === 'cold' || state.weather === 'blizzard') {
    const heat = state.lastHeating;
    if (heat?.active && (heat.shortfall > 0 || (heat.reserveDays != null && heat.reserveDays < 3))) {
      return {
        id: 'need_warmth',
        title: 'Calefacción',
        text: `Cubiertos ${heat.covered}/${pop} · madera ~${heat.need}/día · reserva ${heat.reserveDays === Infinity ? '∞' : heat.reserveDays} d.`,
      };
    }
  }
  if ((state.coldExposure || 0) >= 2) {
    return {
      id: 'cold_exposure',
      title: 'Exposición al frío',
      text: `Exposición ${state.coldExposure} — mejora vivienda o acumula madera.`,
    };
  }
  if (pop > cap) {
    return {
      id: 'housing_overflow',
      title: 'Hacinamiento',
      text: `${pop - cap} sin plaza de vivienda.`,
    };
  }

  if ((!hasFarm || farmStaff < 1 || !hasWell || wellStaff < 1) && (daysFood < 4 || daysWater < 4 || !hasFarm || !hasWell)) {
    return {
      id: 'survive',
      title: 'Supervivencia',
      text: 'Asegura comida y agua: huerto, pozo y trabajadores.',
    };
  }
  if (pop >= cap - 1 || cap <= 6) {
    return {
      id: 'housing',
      title: 'Ampliación',
      text: 'Aumenta la capacidad del refugio con casas.',
    };
  }
  if (explored < 1 || controlled < 2) {
    return {
      id: 'explore',
      title: 'Exploración',
      text: 'Explora los alrededores con tu explorador.',
    };
  }
  if ((state.population?.labor?.defense || 0) < 1 && (state.director?.threat || 0) >= 18) {
    return {
      id: 'defend',
      title: 'Defensa',
      text: 'Refuerza el perímetro (gente o torre).',
    };
  }
  if (state.day >= 12 && state.flags?.objectivesDismissed !== true) {
    return null;
  }
  return null;
}

export function productionPreview(def, workers) {
  if (!def?.produces) return [];
  const jobs = Math.max(1, def.jobs || 1);
  const w = Math.max(0, workers || 0);
  return Object.entries(def.produces).map(([k, v]) => ({
    key: k,
    amount: w <= 0 ? 0 : Math.round(v * (w / jobs)),
  }));
}

/** Compat: clearLaborManual sigue existiendo vía redistribute + autoStaff */
export function resetColonyLabor(state, content) {
  autoStaffColony(state, content);
  redistributeLabor(state, content.balance, { preserveManual: false });
  syncLaborFromColony(state, content);
}
