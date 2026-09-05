/**
 * PLAYTEST LARGO — D1→D300
 * Bot legal: construir, asignar, avanzar día, expediciones.
 * NO regala recursos, NO toca balance, NO modifica código del juego.
 *
 *   node scripts/playtest-long.mjs --seeds=lt-alpha,lt-beta --maxDay=300
 *
 * Paquete territorial canónico (B5.22–B5.32):
 *   - never-targeted exploration pass
 *   - territorial scoring (frontier + contested bonuses)
 *   - distance k=0.45
 *   - TOP6 candidate pool
 *   - second explorer recruitment
 *
 * Salida: JSON estructurado en scripts/playtest-long-results.json
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const maxDayArg = process.argv.find(a => a.startsWith('--maxDay='));
const seedsArg = process.argv.find(a => a.startsWith('--seeds='));
const POST_CONTROL_SCAVENGE = process.argv.includes('--postControlScavenge');
const THIRD_FARM_CAPACITY = process.argv.includes('--thirdFarmCapacity');
const SCALABLE_FARM_CAPACITY = process.argv.includes('--scalableFarmCapacity');
const MAX_DAY = maxDayArg ? parseInt(maxDayArg.split('=')[1]) : 50;
const SEEDS = seedsArg ? seedsArg.split('=')[1].split(',') : ['lt-alpha', 'lt-beta', 'lt-gamma', 'lt-delta', 'lt-epsilon'];

const loadJson = (n) => JSON.parse(readFileSync(join(root, 'content', n), 'utf8'));
const locationsDoc = loadJson('locations.json');
const content = {
  balance: loadJson('balance.json'),
  buildings: loadJson('buildings.json'),
  eventsDoc: loadJson('events.json'),
  survivorsDoc: loadJson('survivors.json'),
  researchDoc: loadJson('research.json'),
  vehiclesDoc: loadJson('vehicles.json'),
  infectedDoc: loadJson('infected.json'),
  factionsDoc: loadJson('factions.json'),
  erasDoc: loadJson('eras.json'),
  locationsDoc,
  missionsDoc: loadJson('missions.json'),
  achievementsDoc: loadJson('achievements.json'),
  zonesDoc: { zones: locationsDoc.seedLayout || [] },
};

const { createNewState, housingCapacity, defenseValue } = await import(pathToFileURL(join(root, 'js', 'state.js')).href);
const { installPilotZoneMap } = await import(pathToFileURL(join(root, 'js', 'pilot-terrain.js')).href);
const { remapPilotZones, pilotBuildableTypeIds } = await import(pathToFileURL(join(root, 'js', 'pilot-test.js')).href);
const simModule = await import(pathToFileURL(join(root, 'js', 'sim.js')).href);
const { placeBuilding, adjustBuildingWorkers, startExpedition, expeditionPreview, startResearch, canAfford } = simModule;
let { advanceDay } = simModule;

const onbMod = await import(pathToFileURL(join(root, 'js', 'onboarding.js')).href);
const { ensureOnboarding, checkOnboardingProgress, onboardingStatus, markGuideDayAdvanced } = onbMod;
const { currentObjective, syncLaborFromColony } = await import(pathToFileURL(join(root, 'js', 'colony.js')).href);
const { workforce: canonicalWorkforce } = await import(pathToFileURL(join(root, 'js', 'population.js')).href);
const { livingExplorers, recruitExplorer, explorerSlotsUnlocked } = await import(pathToFileURL(join(root, 'js', 'explorers.js')).href);
const anchorsMod = await import(pathToFileURL(join(root, 'js', 'pilot-footprints.js')).href);

installPilotZoneMap(loadJson('pilot/neni-pilot-zones-v3.json'));

// SEEDS and MAX_DAY already parsed from flags above
const CONTINUE_DAYS = 101;
const HQ = { x: -7, y: 14 };
const RESULTS = [];
const HOUSE_ATTEMPTS = [];
const TECH_BENCH_ATTEMPTS = [];
const TECH_BENCH_BUILT = [];
const RESEARCH_EVENTS = [];
const ERA_CHANGES = [];
const RESERVATION_EVENTS = [];
const METAL_LEDGER = [];
const TECH_BENCH_AFFORDABLE = [];
const firstAffordableSeen = {};
const IMMIGRATION_LOG = [];
const POP_MILESTONES = [];
const POP_CHANGES = [];
const WORKFORCE_LOG = [];
let _emergencyMedActive = false;

// ─── helpers ────────────────────────────────────────────

function newOfficialGame(seed) {
  const st = createNewState(content, 'Playtest Largo', seed);
  st.flags.pilot = 'neni';
  st.flags.pilotQaMode = false;
  st.flags.pilotTestMode = false;
  st.gen = 'neni';
  st.flags.sectorsUiParked = true;
  st.flags.onboardingDone = false;
  st.flags.onboardingActive = true;
  st.flags.onboardingStep = 0;
  const camp = st.zones.find((z) => z.type === 'camp');
  if (camp) { camp.x = 824; camp.y = 520; }
  st.base.w = Math.max(st.base.w || 0, 76);
  st.base.h = Math.max(st.base.h || 0, 37);
  let hq = st.base.buildings.find((b) => String(b.type).startsWith('hq_'));
  if (!hq) {
    hq = { id: 'b_hq_pilot', type: 'hq_central_l1', x: HQ.x, y: HQ.y, hp: 100, workers: 0 };
    st.base.buildings.unshift(hq);
  } else { hq.x = HQ.x; hq.y = HQ.y; }
  remapPilotZones(st);
  ensureOnboarding(st);
  st._expeditionTargets = [];
  return st;
}

function tryBuild(st, type) {
  const allowed = pilotBuildableTypeIds(st);
  if (!allowed.has(type)) return { ok: false, error: `gate (${type})` };
  const def = content.buildings[type];
  if (!def) return { ok: false, error: `unknown (${type})` };
  const count = st.base.buildings.filter((x) => x.type === type && x.hp > 0).length;
  if (def.max != null && count >= def.max) return { ok: false, error: 'max' };
  // NENI pilot mode SKIPS requires and requiresBuilding (sim.js:151-163)
  const canPay = Object.entries(def.cost || {}).every(([k, v]) => (st.resources[k] || 0) >= v);
  if (!canPay) {
    const miss = Object.entries(def.cost || {}).filter(([k, v]) => (st.resources[k] || 0) < v).map(([k]) => k).join('+');
    return { ok: false, error: `sin recursos (${miss})` };
  }
  const list = anchorsMod.validPilotAnchors(st, content, type).sort(
    (a, b) => Math.abs(a.x - HQ.x) + Math.abs(a.y - HQ.y) - (Math.abs(b.x - HQ.x) + Math.abs(b.y - HQ.y))
  );
  for (const a of list.slice(0, 12)) {
    const r = placeBuilding(st, content, type, a.x, a.y);
    if (r.ok) return r;
  }
  return { ok: false, error: 'sin sitio válido' };
}

function ensureStaffed(st, types) {
  const done = [];
  for (const t of types) {
    const buildings = st.base.buildings.filter((x) => x.type === t && x.hp > 0);
    for (const b of buildings) {
      if ((b.workers || 0) < 1 && (st.population.labor?.idle || 0) > 0) {
        const r = adjustBuildingWorkers(st, content, b.id, 1);
        if (r.ok) done.push(t);
      }
    }
  }
  return done;
}

function ensureAllStaffed(st, types) {
  const done = [];
  const workforce = estimateWorkforce(st);
  const pop = st.population.total || 0;
  
  // Calculate real targets for critical types
  const foodNeed = pop * 0.9;
  const waterNeed = pop * 0.88;
  const weatherMargin = (st.weather === 'heat' || st.weather === 'storm' || 
    (st.pendingWeather?.type === 'heat' || st.pendingWeather?.type === 'storm' || 
     st.pendingWeather?.type === 'cold' || st.pendingWeather?.type === 'blizzard')) ? 1 : 0;
  
  // Real targets per building type
  const targets = {
    farm: Math.min(3, Math.max(1, Math.ceil((pop * 0.9 / 3) / Math.max(1, st.base.buildings.filter(b => b.type === 'farm' && b.hp > 0).length)) + weatherMargin)),
    well: Math.min(2, Math.max(1, Math.ceil((pop * 0.9 / 4) / Math.max(1, st.base.buildings.filter(b => b.type === 'well' && b.hp > 0).length)) + weatherMargin)),
    sawmill: 1,
    scrapyard: 1,
    tech_bench: 1,
  };
  
  // First: ensure at least 1 worker per instance
  for (const t of types) {
    const buildings = st.base.buildings.filter((x) => x.type === t && x.hp > 0);
    for (const b of buildings) {
      if ((b.workers || 0) < 1 && (st.population.labor?.idle || 0) > 0) {
        const totalAssigned = st.base.buildings.reduce((sum, b) => sum + (b.workers || 0), 0);
        if (totalAssigned < workforce) {
          const r = adjustBuildingWorkers(st, content, b.id, 1);
          if (r.ok) done.push(t);
        }
      }
    }
  }
  
  // Second: distribute extras up to real targets (not maxW), respecting workforce
  for (let round = 0; round < 3; round++) {
    for (const t of types) {
      const buildings = st.base.buildings.filter((x) => x.type === t && x.hp > 0);
      const target = targets[t] || 1;
      for (const b of buildings) {
        if ((b.workers || 0) < target && (st.population.labor?.idle || 0) > 0) {
          const totalAssigned = st.base.buildings.reduce((sum, b) => sum + (b.workers || 0), 0);
          if (totalAssigned < workforce) {
            const r = adjustBuildingWorkers(st, content, b.id, 1);
            if (r.ok) done.push(t);
          }
        }
      }
    }
  }
  return done;
}

function reassignWorker(st, fromType, toType) {
  const from = st.base.buildings.find((b) => b.type === fromType && b.hp > 0 && (b.workers || 0) > 0);
  const to = st.base.buildings.find((b) => b.type === toType && b.hp > 0);
  if (!from || !to) return false;
  const r1 = adjustBuildingWorkers(st, content, from.id, -1);
  if (!r1.ok) return false;
  const r2 = adjustBuildingWorkers(st, content, to.id, 1);
  if (!r2.ok) { adjustBuildingWorkers(st, content, from.id, 1); return false; }
  return true;
}

function reassignWorkerToNeedy(st, fromType, toType) {
  const from = st.base.buildings.find((b) => b.type === fromType && b.hp > 0 && (b.workers || 0) > 1);
  const to = st.base.buildings.find((b) => b.type === toType && b.hp > 0 && (b.workers || 0) < 1);
  if (!from || !to) return false;
  const r1 = adjustBuildingWorkers(st, content, from.id, -1);
  if (!r1.ok) return false;
  const r2 = adjustBuildingWorkers(st, content, to.id, 1);
  if (!r2.ok) { adjustBuildingWorkers(st, content, from.id, 1); return false; }
  return true;
}

function reassignWorkerForCritical(st, fromType, toType, maxTo = 2) {
  const from = st.base.buildings.find((b) => b.type === fromType && b.hp > 0 && (b.workers || 0) >= 1);
  const to = st.base.buildings.find((b) => b.type === toType && b.hp > 0 && (b.workers || 0) < maxTo);
  if (!from || !to) return false;
  const r1 = adjustBuildingWorkers(st, content, from.id, -1);
  if (!r1.ok) return false;
  const r2 = adjustBuildingWorkers(st, content, to.id, 1);
  if (!r2.ok) { adjustBuildingWorkers(st, content, from.id, 1); return false; }
  return true;
}

// Calculate approximate workforce (matches game's workforce function)
function estimateWorkforce(st) {
  const pop = st.population.total || 0;
  const sick = st.population.sick || 0;
  const injured = st.population.injured || 0;
  // Note: dependents not exposed in bot state, approximate
  return Math.max(0, pop - sick - injured);
}

// Reduce non-critical staffing to keep total assigned <= workforce
function reduceNonCriticalStaffing(st, content) {
  const actions = [];
  const workforce = estimateWorkforce(st);
  let totalAssigned = st.base.buildings.reduce((sum, b) => sum + (b.workers || 0), 0);

  if (totalAssigned <= workforce) return actions;

  // B4L.6: if emergency med rotation is active, treat medkit worker as protected
  // Don't count medkit workers toward totalAssigned for reduction purposes
  if (_emergencyMedActive) {
    const medkitWorkers = st.base.buildings
      .filter(b => ['medkit', 'clinic', 'infirmary'].includes(b.type) && b.hp > 0)
      .reduce((s, b) => s + (b.workers || 0), 0);
    totalAssigned -= medkitWorkers;
    if (totalAssigned <= workforce) return actions;
  }

  const wellCount = st.base.buildings.filter(b => b.type === 'well' && b.hp > 0).length;
  const farmCount = st.base.buildings.filter(b => b.type === 'farm' && b.hp > 0).length;
  let totalWellWorkers = st.base.buildings.filter(b => b.type === 'well' && b.hp > 0).reduce((s, b) => s + (b.workers || 0), 0);
  let totalFarmWorkers = st.base.buildings.filter(b => b.type === 'farm' && b.hp > 0).reduce((s, b) => s + (b.workers || 0), 0);

  const waterNeed = (st.population.total || 0) * 0.88;
  const foodNeed = (st.population.total || 0) * 0.9;
  const requiredWellWorkers = wellCount > 0 ? minWellWorkersForNeed(waterNeed, wellCount, st) : 0;
  const requiredFarmWorkers = farmCount > 0 ? minFarmWorkersForNeed(foodNeed, farmCount, st) : 0;

  if (totalWellWorkers !== requiredWellWorkers) { console.log(`DEBUG reduceWell: day=${st.day||'?'} wellCount=${wellCount} totalWellWorkers=${totalWellWorkers} requiredWellWorkers=${requiredWellWorkers} waterNeed=${waterNeed.toFixed(2)}`); }

  // Target: 2 workers per well, 2 per farm (up to max jobs)
  const targetWellWorkers = Math.min(wellCount * 2, workforce);
  const targetFarmWorkers = Math.min(farmCount * 2, Math.max(0, workforce - targetWellWorkers));
  const criticalNeeded = targetWellWorkers + targetFarmWorkers;

  // If over workforce, reduce non-critical first (tech_bench, scrapyard, sawmill)
  // B4L.6: never reduce medkit/clinic/infirmary when injured — protect emergency rotation
  const medTypes = ['medkit', 'clinic', 'infirmary'];
  const nonCriticalTypes = ['tech_bench', 'scrapyard', 'sawmill']; // reverse priority
  for (const type of nonCriticalTypes) {
    while (totalAssigned > workforce) {
      const b = st.base.buildings.find(b => b.type === type && b.hp > 0 && (b.workers || 0) > 0);
      if (!b) break;
      const r = adjustBuildingWorkers(st, content, b.id, -1);
      if (!r.ok) break;
      totalAssigned--;
      actions.push('reduce:' + type);
    }
  }

  // If still over, reduce farm (but keep at least requiredFarmWorkers total)
  while (totalAssigned > workforce) {
    const farm = st.base.buildings.find(b => b.type === 'farm' && b.hp > 0 && (b.workers || 0) > 1);
    if (!farm) break;
    if (totalFarmWorkers <= requiredFarmWorkers) break;
    const r = adjustBuildingWorkers(st, content, farm.id, -1);
    if (!r.ok) break;
    totalFarmWorkers--;
    totalAssigned--;
    actions.push('reduce:farm');
  }

  // If still over, reduce well (but keep at least requiredWellWorkers total)
  while (totalAssigned > workforce) {
    const well = st.base.buildings.find(b => b.type === 'well' && b.hp > 0 && (b.workers || 0) > 1);
    if (!well) {
      if (totalWellWorkers > requiredWellWorkers) console.log(`DEBUG wellLoop: day=${st.day||'?'} noWellWith>1 totalWellWorkers=${totalWellWorkers} requiredWellWorkers=${requiredWellWorkers}`);
      break;
    }
    if (totalWellWorkers <= requiredWellWorkers) {
      console.log(`DEBUG wellLoop: day=${st.day||'?'} BREAK totalWellWorkers=${totalWellWorkers} requiredWellWorkers=${requiredWellWorkers}`);
      break;
    }
    console.log(`DEBUG wellLoop: day=${st.day||'?'} REDUCE well id=${well.id} workers=${well.workers} totalWellWorkers=${totalWellWorkers} requiredWellWorkers=${requiredWellWorkers}`);
    const r = adjustBuildingWorkers(st, content, well.id, -1);
    if (!r.ok) break;
    totalWellWorkers--;
    totalAssigned--;
    actions.push('reduce:well');
  }

  // Ensure critical buildings have minimum staffing (survival floor)
  const wells = st.base.buildings.filter(b => b.type === 'well' && b.hp > 0);
  for (const well of wells) {
    if ((well.workers || 0) < 1 && (st.population.labor?.idle || 0) > 0) {
      const r = adjustBuildingWorkers(st, content, well.id, 1);
      if (r.ok) actions.push('ensure:well+1');
    }
  }
  const farms = st.base.buildings.filter(b => b.type === 'farm' && b.hp > 0);
  for (const farm of farms) {
    if ((farm.workers || 0) < 1 && (st.population.labor?.idle || 0) > 0) {
      const r = adjustBuildingWorkers(st, content, farm.id, 1);
      if (r.ok) actions.push('ensure:farm+1');
    }
  }

  return actions;
}

// Validation asserts for staffing anomalies
function validateStaffing(st, actions) {
  const pop = st.population.total || 0;
  const workforce = estimateWorkforce(st);
  const totalAssigned = st.base.buildings.reduce((sum, b) => sum + (b.workers || 0), 0);
  
  // 1. assignedWorkers > population
  if (totalAssigned > pop) {
    actions.push(`ASSERT_FAIL: assignedWorkers(${totalAssigned}) > population(${pop})`);
  }
  
  // 2. workers negativos
  for (const b of st.base.buildings) {
    if ((b.workers || 0) < 0) {
      actions.push(`ASSERT_FAIL: negative workers on ${b.type} (${b.workers})`);
    }
  }
  
  // 3. staffing > jobs permitido
  for (const b of st.base.buildings) {
    const def = content.buildings[b.type];
    const maxW = def?.jobs || 1;
    if ((b.workers || 0) > maxW) {
      actions.push(`ASSERT_FAIL: ${b.type} staffing(${b.workers}) > jobs(${maxW})`);
    }
  }
  
  // 4. workers duplicados (same worker counted twice - check total vs sum)
  // This is harder to detect but we can check if sum of workers per type matches total
  const sumByType = {};
  for (const b of st.base.buildings) {
    if (b.hp > 0 && (b.workers || 0) > 0) {
      sumByType[b.type] = (sumByType[b.type] || 0) + b.workers;
    }
  }
  
  // 5. divergencia entre staffing agregado y por instancia
  // Check if sum of per-type workers matches total assigned
  const sumPerType = Object.values(sumByType).reduce((a, b) => a + b, 0);
  if (sumPerType !== totalAssigned) {
    actions.push(`ASSERT_FAIL: sumPerType(${sumPerType}) != totalAssigned(${totalAssigned})`);
  }
  
  // 6. edificios críticos a 0 workers existiendo manos libres y necesidad real
  const farms = st.base.buildings.filter(b => b.type === 'farm' && b.hp > 0);
  const wells = st.base.buildings.filter(b => b.type === 'well' && b.hp > 0);
  const idle = st.population.labor?.idle || 0;
  const foodNeed = pop * 0.9;
  const waterNeed = pop * 0.88;
  
  for (const farm of farms) {
    const foodProduced = farm.workers * 3; // approx
    if ((farm.workers || 0) === 0 && idle > 0 && foodNeed > 0) {
      actions.push(`ASSERT_WARN: farm at 0 workers with idle=${idle} and foodNeed=${foodNeed.toFixed(1)}`);
    }
  }
  
  for (const well of wells) {
    const waterProduced = well.workers * 4; // approx
    if ((well.workers || 0) === 0 && idle > 0 && waterNeed > 0) {
      actions.push(`ASSERT_WARN: well at 0 workers with idle=${idle} and waterNeed=${waterNeed.toFixed(1)}`);
    }
  }
  
  // 7. edificios sobrestaffed sin beneficio necesario
  for (const b of st.base.buildings) {
    if (b.hp > 0 && (b.workers || 0) > 0) {
      const def = content.buildings[b.type];
      const maxW = def?.jobs || 1;
      // Check if building is at max but producing surplus
      if ((b.workers || 0) === maxW && maxW > 1) {
        actions.push(`ASSERT_INFO: ${b.type} at max workers (${maxW})`);
      }
    }
  }
  
  return actions;
}

function staffAll(st, types) {
  for (const t of types) {
    while ((st.population.labor?.idle || 0) > 0) {
      const b = st.base.buildings.find((x) => x.type === t && x.hp > 0 && (x.workers || 0) < (x.maxWorkers || 1));
      if (!b) break;
      const r = adjustBuildingWorkers(st, content, b.id, 1);
      if (!r.ok) break;
    }
  }
}

// Expedition targeting: never-targeted pass + territorial scoring + k=0.45 + TOP6
function tryExpeditionTargeted(st, preferMetal) {
  const ex = livingExplorers(st).find((e) => e.status === 'ready' && !e.expeditionId);
  if (!ex) return { ok: false, error: 'sin explorador listo' };
  const camp = st.zones.find((z) => z.type === 'camp') || { x: 824, y: 520 };
  const cands = st.zones.filter((z) => z.state !== 'unknown' && z.id !== camp.id && z.type !== 'camp');
  if (!cands.length) return { ok: false, error: 'sin zonas descubiertas' };

  const targeted = new Set((st._expeditionTargets || []));
  const neverTargeted = cands.filter(z => !targeted.has(z.id));

  const score = (z) => {
    const d = Math.hypot((z.x ?? 0) - camp.x, (z.y ?? 0) - camp.y);
    const metalBonus = preferMetal && (z.loot?.metal || 0) > 0 ? -100 : 0;
    return d + metalBonus;
  };

  // Phase 1: try never-targeted zones (using canonical ordering)
  if (neverTargeted.length > 0) {
    neverTargeted.sort((a, b) => score(a) - score(b));
    for (const z of neverTargeted.slice(0, 4)) {
      const prev = expeditionPreview(st, content, z.id, ex.id);
      if ((prev?.fuel || 0) > (st.resources.fuel || 0)) continue;
      const r = startExpedition(st, content, z.id, ex.id);
      if (r.ok) {
        if (!st._expeditionTargets) st._expeditionTargets = [];
        st._expeditionTargets.push(z.id);
        return { ok: true, zone: z.name, days: prev.days, fuel: prev.fuel || 0, explorer: ex.name };
      }
    }
  }

  // Phase 2: territorial scoring with k=0.45
  const controlledIds = new Set(cands.filter(z => z.state === 'controlled').map(z => z.id));

  const baseScore = (z) => {
    const d = Math.hypot((z.x ?? 0) - camp.x, (z.y ?? 0) - camp.y);
    const metalBonus = preferMetal && (z.loot?.metal || 0) > 0 ? -100 : 0;
    return d * 0.45 + metalBonus;
  };

  const territorialScore = (z) => {
    let s = baseScore(z);

    // Frontier bonus: hostile zone adjacent to a controlled zone
    if (z.state === 'hostile') {
      const isFrontier = (z.neighbors || []).some(nid => controlledIds.has(nid));
      if (isFrontier) s -= 50;
    }

    // Contested bonus: zone near capture threshold
    if (z.state === 'contested') {
      const thr = content.balance?.controlClearThreshold || 0.52;
      const cp = z.controlProgress || 0;
      const canSecure = (z.infectedLeft || 0) <= 0 && cp >= thr;
      if (canSecure) s -= 80;
      else if (cp >= thr * 0.6) s -= 30;
    }

    return s;
  };

  cands.sort((a, b) => territorialScore(a) - territorialScore(b));
  const legalCands = cands.filter(z => z.state !== 'controlled').slice(0, 6);
  for (const z of legalCands) {
    const prev = expeditionPreview(st, content, z.id, ex.id);
    if ((prev.fuel || 0) > (st.resources.fuel || 0)) continue;
    const r = startExpedition(st, content, z.id, ex.id);
    if (r.ok) {
      if (!st._expeditionTargets) st._expeditionTargets = [];
      st._expeditionTargets.push(z.id);
      return { ok: true, zone: z.name, days: prev.days, fuel: prev.fuel || 0, explorer: ex.name };
    }
  }

  // Phase 3: post-control scavenging (only if --postControlScavenge flag)
  if (POST_CONTROL_SCAVENGE) {
    const ctrlCands = cands.filter(z => z.state === 'controlled');
    if (ctrlCands.length > 0) {
      ctrlCands.sort((a, b) => {
        const da = Math.hypot((a.x ?? 0) - camp.x, (a.y ?? 0) - camp.y);
        const db = Math.hypot((b.x ?? 0) - camp.x, (b.y ?? 0) - camp.y);
        return da - db;
      });
      for (const z of ctrlCands) {
        const prev = expeditionPreview(st, content, z.id, ex.id);
        if ((prev.fuel || 0) > (st.resources.fuel || 0)) continue;
        const r = startExpedition(st, content, z.id, ex.id);
        if (r.ok) {
          if (!st._expeditionTargets) st._expeditionTargets = [];
          st._expeditionTargets.push(z.id);
          return { ok: true, zone: z.name, days: prev.days, fuel: prev.fuel || 0, explorer: ex.name, scavenging: true };
        }
      }
    }
  }

  return { ok: false, error: 'sin destino válido' };
}

function snapshot(st) {
  const cap = housingCapacity(st, content.buildings);
  const obj = currentObjective(st, content);
  const bCounts = {};
  const bStaffing = {};
  st.base.buildings.forEach((b) => {
    if (b.hp > 0) {
      bCounts[b.type] = (bCounts[b.type] || 0) + 1;
      if ((b.workers || 0) > 0) bStaffing[b.type] = (bStaffing[b.type] || 0) + b.workers;
    }
  });
  const expls = livingExplorers(st);
  const def = defenseValue(st, content.buildings, content.balance);
  const foodDays = resourceDays(st, 'food');
  const waterDays = resourceDays(st, 'water');
  return {
    day: st.day,
    pop: st.population.total,
    healthy: (st.population.total || 0) - (st.population.injured || 0) - (st.population.sick || 0),
    injured: st.population.injured || 0,
    sick: st.population.sick || 0,
    cap,
    freeWorkers: st.population.labor?.idle || 0,
    food: Math.floor(st.resources.food),
    water: Math.floor(st.resources.water),
    wood: Math.floor(st.resources.wood),
    metal: Math.floor(st.resources.metal),
    medicine: Math.floor(st.resources.medicine || 0),
    fuel: Math.floor(st.resources.fuel || 0),
    ammo: Math.floor(st.resources.ammo || 0),
    buildings: bCounts,
    staffing: bStaffing,
    buildingCount: Object.values(bCounts).reduce((a, b) => a + b, 0),
    explorersReady: expls.filter((e) => e.status === 'ready').length,
    explorersTotal: expls.length,
    expeditions: st.expeditions?.length || 0,
    expeditionsStarted: st.stats?.expeditions || 0,
    controlled: (st.zones || []).filter((z) => z.state === 'controlled').length,
    discovered: (st.zones || []).filter((z) => z.state !== 'unknown').length,
    objective: obj ? `${obj.id}: ${obj.title}` : null,
    era: st.era,
    researchCount: (st.research?.unlocked || []).length,
    researchActive: st.research?.active || null,
    threat: Math.round(st.director?.threat || 0),
    defense: Math.round(def),
    stability: Math.round(st.stability || 0),
    weather: st.weather || 'clear',
    season: st.season || '?',
    coldExposure: st.coldExposure || 0,
    foodDays: Math.round(foodDays * 10) / 10,
    waterDays: Math.round(waterDays * 10) / 10,
  };
}

// Real production using actual game formula: round(v * ratio * stabMod * weatherMod)
// sim.js:745-780
function realProduction(produces, jobs, workers, st) {
  const ratio = Math.max(0.15, Math.min(1.15, workers / Math.max(1, jobs)));
  // stabMod = clamp(0.6 + stability/200, 0.6, 1.15) — sim.js:717
  const stability = st?.stability ?? 52;
  const stabMod = Math.max(0.6, Math.min(1.15, 0.6 + stability / 200));
  // weatherMod — sim.js:718-727
  const weather = st?.weather || 'clear';
  const weatherMod = weather === 'blizzard' ? 0.65 : weather === 'storm' ? 0.75 :
    (weather === 'heat' || weather === 'cold') ? 0.85 : weather === 'rain' ? 0.92 : 1;
  let total = 0;
  for (const v of Object.values(produces)) total += Math.max(0, Math.round(v * ratio * stabMod * weatherMod));
  return total;
}
function realFoodProd(farmWorkers, farmCount, st) {
  if (!farmCount || !farmWorkers) return 0;
  let total = 0;
  const perFarm = Math.floor(farmWorkers / farmCount);
  const extra = farmWorkers % farmCount;
  for (let i = 0; i < farmCount; i++) {
    const w = perFarm + (i < extra ? 1 : 0);
    total += realProduction({ food: 7 }, 3, w, st);
  }
  return total;
}
function realWaterProd(wellWorkers, wellCount, st) {
  if (!wellCount || !wellWorkers) return 0;
  let total = 0;
  const perWell = Math.floor(wellWorkers / wellCount);
  const extra = wellWorkers % wellCount;
  for (let i = 0; i < wellCount; i++) {
    const w = perWell + (i < extra ? 1 : 0);
    total += realProduction({ water: 7 }, 2, w, st);
  }
  return total;
}
function minFarmWorkersForNeed(foodNeed, farmCount, st) {
  for (let total = farmCount; total <= farmCount * 3; total++) {
    if (realFoodProd(total, farmCount, st) >= foodNeed) return total;
  }
  return farmCount * 3;
}
function minWellWorkersForNeed(waterNeed, wellCount, st) {
  for (let total = wellCount; total <= wellCount * 2; total++) {
    if (realWaterProd(total, wellCount, st) >= waterNeed) return total;
  }
  return wellCount * 2;
}

function resourceDays(st, key) {
  const pop = st.population?.total || 0;
  if (pop <= 0) return 999;
  return (st.resources?.[key] || 0) / pop;
}

// ─── B4K.3C instrumentation ─────────────────────────────

const INVARIANT_LOG = [];
const LEGALITY_LOG = [];
const TRACE_LOG = [];
const WELL_WORKERS_LOG = [];

function captureInvariant(st, label) {
  const wf = canonicalWorkforce(st.population);
  const sumW = (st.base?.buildings || []).reduce((s, b) => s + (b.hp > 0 ? (b.workers || 0) : 0), 0);
  const labor = st.population?.labor || {};
  const laborSum = ['food','water','build','produce','defense','medicine'].reduce((s, k) => s + (labor[k] || 0), 0);
  return {
    seed: st._seed, day: st.day, label,
    workforce: wf, sumWorkers: sumW,
    idle: labor.idle || 0, laborTotal: laborSum + (labor.idle || 0),
    food: labor.food || 0, water: labor.water || 0, build: labor.build || 0,
    produce: labor.produce || 0, defense: labor.defense || 0, medicine: labor.medicine || 0,
    sick: st.population?.sick || 0, injured: st.population?.injured || 0,
    total: st.population?.total || 0,
    coherent: (labor.idle || 0) === Math.max(0, wf - laborSum) && laborSum + (labor.idle || 0) === wf,
  };
}

function checkBotLegality(st) {
  const violations = [];
  const wf = canonicalWorkforce(st.population);
  const sumW = (st.base?.buildings || []).reduce((s, b) => s + (b.hp > 0 ? (b.workers || 0) : 0), 0);
  if (sumW > wf) violations.push(`OVERASSIGN: sumWorkers(${sumW}) > workforce(${wf})`);
  for (const b of (st.base?.buildings || [])) {
    if (b.hp <= 0) continue;
    if ((b.workers || 0) < 0) violations.push(`NEGATIVE: ${b.type} id=${b.id} workers=${b.workers}`);
    const def = content.buildings[b.type];
    const maxW = def?.jobs || 0;
    if (maxW > 0 && (b.workers || 0) > maxW) violations.push(`OVERSTAFF: ${b.type} id=${b.id} workers=${b.workers} > jobs(${maxW})`);
  }
  return { seed: st._seed, day: st.day, violations, sumWorkers: sumW, workforce: wf };
}

function logWellWorkers(st, label) {
  const wells = (st.base?.buildings || []).filter(b => b.type === 'well' && b.hp > 0);
  const totalWW = wells.reduce((s, b) => s + (b.workers || 0), 0);
  WELL_WORKERS_LOG.push({ seed: st._seed, day: st.day, label, wellCount: wells.length, wellWorkers: totalWW, wells: wells.map(b => ({ id: b.id, workers: b.workers })) });
}

// ─── bot decision engine ────────────────────────────────

function botDecide(st) {
  let actions = [];

  // 0) B4L.6: EMERGENCY MEDICAL ROTATION — human-reasonable staffing
  const pop = st.population.total || 0;
  const wf = estimateWorkforce(st);
  const idle = st.population.labor?.idle || 0;
  const hasInjuredNow = (st.population.injured || 0) > 0;
  const medBuildingsNow = st.base.buildings.filter(b => ['medkit', 'clinic', 'infirmary'].includes(b.type) && b.hp > 0);
  const medStaffNow = medBuildingsNow.reduce((s, b) => s + (b.workers || 0), 0);

  if (hasInjuredNow && medBuildingsNow.length > 0 && medStaffNow === 0 && idle === 0 && wf > 0) {
    const fDays = pop > 0 ? (st.resources.food || 0) / (pop * 0.9) : 999;
    const wDays = pop > 0 ? (st.resources.water || 0) / (pop * 0.88) : 999;
    const sacrificeType = fDays >= wDays ? 'farm' : 'well';
    const sacrificeBuilding = st.base.buildings.find(b => b.type === sacrificeType && b.hp > 0 && (b.workers || 0) > 0);
    if (sacrificeBuilding) {
      const resource = sacrificeType === 'farm' ? 'food' : 'water';
      const stock = st.resources[resource] || 0;
      const consumption = pop * (resource === 'food' ? 0.9 : 0.88);
      if (stock > consumption) {
        const r1 = adjustBuildingWorkers(st, content, sacrificeBuilding.id, -1);
        if (r1.ok) {
          const r2 = adjustBuildingWorkers(st, content, medBuildingsNow[0].id, 1);
          if (r2.ok) {
            actions.push(`emergency:rotate ${sacrificeType}->medkit`);
            _emergencyMedActive = true;
          } else {
            adjustBuildingWorkers(st, content, sacrificeBuilding.id, 1);
          }
        }
      }
    }
  }

  // 1) ADAPTIVE WATER POLICY — react to weather and water crisis

  // Tech Bench reservation — when era>=1 and no tech_bench, save 4w+6m for it.
  const hasTechBench = st.base.buildings.some((b) => b.type === 'tech_bench' && b.hp > 0);
  const tbCost = content.buildings.tech_bench.cost || {};
  const reservingTechBench = st.era >= 1 && !hasTechBench;
  // Track first day Tech Bench becomes affordable (4w+6m available)
  if (st.era >= 1 && !hasTechBench && !firstAffordableSeen[st._seed]) {
    const tbCostInner = content.buildings.tech_bench.cost || {};
    if (canAfford(st, tbCostInner)) {
      TECH_BENCH_AFFORDABLE.push({ seed: st._seed || null, day: st.day, wood: st.resources.wood || 0, metal: st.resources.metal || 0 });
      // Proactive: build TB immediately when first affordable
      const r = tryBuild(st, 'tech_bench');
      if (r.ok) {
        firstAffordableSeen[st._seed] = st.day;
        actions.push('rotate:build_tech_bench(priority)');
        TECH_BENCH_BUILT.push({ seed: st._seed || null, day: st.day, pop, wood: st.resources.wood || 0, metal: st.resources.metal || 0 });
      }
    }
  }

  const waterRatio = resourceDays(st, 'water');
  const foodDays = resourceDays(st, 'food');
  const waterDays = waterRatio;
  const weatherNow = st.weather || 'clear';
  const pending = st.pendingWeather;
  const pendingType = pending?.type || null;
  const heatOrStormNow = weatherNow === 'heat' || weatherNow === 'storm';
  const heatOrStormPending = pendingType === 'heat' || pendingType === 'storm' || pendingType === 'cold' || pendingType === 'blizzard';
  const waterCrisis = waterRatio < 4;
  const waterDanger = waterRatio < 8;
  const waterWarning = waterRatio < 12;
  
  // Shared need calculations for all policies
  const foodNeed = pop * 0.9;
  const waterNeed = pop * 0.88;

  const wellCount = st.base.buildings.filter((b) => b.type === 'well' && b.hp > 0).length;
  const wells = st.base.buildings.filter(b => b.type === 'well' && b.hp > 0);
  const totalWellWorkers = wells.reduce((sum, b) => sum + (b.workers || 0), 0);

  // Calculate REAL water production using actual game formula
  const waterProduction = realWaterProd(totalWellWorkers, wellCount, st);
  const waterConsumption = pop * 0.88;
  const waterNet = waterProduction - waterConsumption;

  // Proactive: build 2nd well when pop reaches 5 (break-even needs 2 wells with 2+ workers)
  if (wellCount < 2 && pop >= 5 && st.day >= 5) {
    const r = tryBuild(st, 'well');
    if (r.ok) actions.push('water:build_well2(proactive)');
  }

  // Proactive: build 3rd well when pop reaches 9 (break-even with 2 wells + 3 workers)
  if (wellCount < 3 && pop >= 9 && st.day >= 10) {
    const r = tryBuild(st, 'well');
    if (r.ok) actions.push('water:build_well3(proactive)');
  }

  // Calculate REAL water staffing needs: 1 worker per well base + margin for weather
  const minWellWorkers = Math.max(wellCount, Math.ceil(waterNeed / 4)); // 4 water/worker base
  const weatherMargin = (heatOrStormPending || heatOrStormNow) ? 1 : 0;
  const targetWellWorkers = Math.min(wellCount * 2, minWellWorkers + weatherMargin);

  // Proactive staffing: ensure minimum workers per well (1 base + weather margin)
  for (const well of wells) {
    const wellTarget = Math.min(2, Math.max(1, Math.ceil((waterNeed / 4) / wellCount) + weatherMargin));
    if ((well.workers || 0) < wellTarget && (st.population.labor?.idle || 0) > 0) {
      const r = adjustBuildingWorkers(st, content, well.id, 1);
      if (r.ok) actions.push('water:staff_well+1');
    }
  }

  // Reactive: increase well staffing when water is tight (up to 2 per well)
  if (waterDanger || waterCrisis) {
    for (const well of wells) {
      if ((well.workers || 0) < 2 && (st.population.labor?.idle || 0) > 0) {
        const r = adjustBuildingWorkers(st, content, well.id, 1);
        if (r.ok) actions.push('water:staff_well+1(crisis)');
      }
    }
  }

  // Proactive reassignment: move from sawmill/scrapyard to well when understaffed
  if (totalWellWorkers < targetWellWorkers && (st.population.labor?.idle || 0) === 0) {
    if (reassignWorkerForCritical(st, 'sawmill', 'well', 2)) {
      actions.push('water:reassign sawmill->well(proactive)');
    } else if (reassignWorkerForCritical(st, 'scrapyard', 'well', 2)) {
      actions.push('water:reassign scrapyard->well(proactive)');
    }
  }

  // Reduce non-critical staffing to maintain buffer for wells/farms
  const reduceActions = reduceNonCriticalStaffing(st, content);
  if (reduceActions.length) actions.push(...reduceActions);

  // Reactive reassignment during crisis
  if (waterCrisis && (st.population.labor?.idle || 0) === 0) {
    if (reassignWorkerForCritical(st, 'sawmill', 'well', 2)) {
      actions.push('water:reassign sawmill->well(crisis)');
    } else if (reassignWorkerForCritical(st, 'scrapyard', 'well', 2)) {
      actions.push('water:reassign scrapyard->well(crisis)');
    }
  }

  // Build cistern at era 1 if pop >= 6 and no cistern yet (skip while reserving for tech_bench)
  if (st.era >= 1 && wellCount >= 2 && !reservingTechBench) {
    const cisternCount = st.base.buildings.filter((b) => b.type === 'cistern' && b.hp > 0).length;
    if (cisternCount < 1 && pop >= 6) {
      const r = tryBuild(st, 'cistern');
      if (r.ok) actions.push('water:build_cistern(proactive)');
    }
  }

  // Build 2nd cistern at era 2 if pop >= 10 and water is tight
  if (st.era >= 2 && wellCount >= 2) {
    const cisternCount = st.base.buildings.filter((b) => b.type === 'cistern' && b.hp > 0).length;
    if (cisternCount < 2 && (pop >= 10 || waterDanger)) {
      const r = tryBuild(st, 'cistern');
      if (r.ok) actions.push('water:build_cistern2(proactive)');
    }
  }

  // 0b) ADAPTIVE FOOD POLICY — anticipate and react to food needs
  // NOTE: st.foodDays is undefined; foodRatio was always 999 pre-B5.42, making foodCrisis/foodDanger dead code
  const foodRatio = 999;
  const foodCrisis = false;
  const foodDanger = false;
  // const pop = st.population.total || 0; // already declared in water policy
  const farmCount = st.base.buildings.filter((b) => b.type === 'farm' && b.hp > 0).length;
  const totalFarmWorkers = st.base.buildings.filter(b => b.type === 'farm' && b.hp > 0).reduce((sum, b) => sum + (b.workers || 0), 0);
  const farmSlots = farmCount * 3; // each farm has 3 job slots
  
  // Calculate current food production vs consumption (using real formula)
  const foodProduction = realFoodProd(totalFarmWorkers, farmCount, st);
  const foodConsumption = pop * 0.9;
  const foodNet = foodProduction - foodConsumption;

  // Proactive: build 2nd farm before crisis if pop is growing
  if (farmCount < 2 && pop >= 5 && st.day >= 5) {
    const r = tryBuild(st, 'farm');
    if (r.ok) actions.push('food:build_farm2(proactive)');
  }

  // Reactive: build 2nd farm during crisis
  if (farmCount < 2 && foodCrisis && pop >= 4) {
    const r = tryBuild(st, 'farm');
    if (r.ok) actions.push('food:build_farm2(crisis)');
  }

  // B5.41: 3rd farm capacity — build when structural food pressure + existing farms are meaningfully staffed
  const _curFoodDays = pop > 0 ? (st.resources.food || 0) / pop : 999;
  if (THIRD_FARM_CAPACITY && farmCount === 2 && _curFoodDays < 5 && pop >= 10) {
    const farms = st.base.buildings.filter(b => b.type === 'farm' && b.hp > 0);
    const totalFarmWorkers = farms.reduce((s, b) => s + (b.workers || 0), 0);
    if (totalFarmWorkers >= 4) {
      const r = tryBuild(st, 'farm');
      if (r.ok) actions.push('food:build_farm3(capacity)');
    }
  }

  // B5.42: Scalable farm capacity — build when production < consumption + existing farms meaningfully staffed
  if (SCALABLE_FARM_CAPACITY && pop >= 10) {
    const curProd = realFoodProd(totalFarmWorkers, farmCount, st);
    const curCons = pop * 0.9;
    // Require existing farms to be reasonably staffed (at least 2 workers per farm)
    if (curProd < curCons && totalFarmWorkers >= farmCount * 2) {
      const r = tryBuild(st, 'farm');
      if (r.ok) actions.push('food:build_farm(scalable)');
    }
  }

  // Calculate REAL farm staffing needs: 1 worker per farm base + margin for weather
  const minFarmWorkers = Math.max(farmCount, Math.ceil(foodNeed / 3)); // 3 food/worker base
  const targetFarmWorkers = Math.min(farmCount * 3, minFarmWorkers + weatherMargin);

  // Proactive staffing: ensure minimum workers per farm (1 base + weather margin)
  const farms = st.base.buildings.filter(b => b.type === 'farm' && b.hp > 0);
  for (const farm of farms) {
    const farmTarget = Math.min(3, Math.max(1, Math.ceil((foodNeed / 3) / farmCount) + weatherMargin));
    if ((farm.workers || 0) < farmTarget && (st.population.labor?.idle || 0) > 0) {
      const r = adjustBuildingWorkers(st, content, farm.id, 1);
      if (r.ok) actions.push('food:staff_farm+1');
    }
  }

  // Reactive: increase farm staffing when food is tight (up to 3 per farm)
  if (foodDanger || foodCrisis) {
    for (const farm of farms) {
      if ((farm.workers || 0) < 3 && (st.population.labor?.idle || 0) > 0) {
        const r = adjustBuildingWorkers(st, content, farm.id, 1);
        if (r.ok) actions.push('food:staff_farm+1(crisis)');
      }
    }
  }

  // Proactive reassignment: move from sawmill/scrapyard to farm when understaffed
  if (totalFarmWorkers < targetFarmWorkers && (st.population.labor?.idle || 0) === 0) {
    if (reassignWorkerForCritical(st, 'sawmill', 'farm', 3)) {
      actions.push('food:reassign sawmill->farm(proactive)');
    } else if (reassignWorkerForCritical(st, 'scrapyard', 'farm', 3)) {
      actions.push('food:reassign scrapyard->farm(proactive)');
    }
  }

  // Reactive reassignment during crisis
  if (foodCrisis && (st.population.labor?.idle || 0) === 0) {
    if (reassignWorkerForCritical(st, 'sawmill', 'farm', 3)) {
      actions.push('food:reassign sawmill->farm(crisis)');
    } else if (reassignWorkerForCritical(st, 'scrapyard', 'farm', 3)) {
      actions.push('food:reassign scrapyard->farm(crisis)');
    }
  }

  // 1) follow onboarding guide
  checkOnboardingProgress(st);
  const guide = onboardingStatus(st);
  if (guide?.step?.suggestBuild) {
    const r = tryBuild(st, guide.step.suggestBuild);
    actions.push(`guide:${guide.step.suggestBuild}:${r.ok ? 'built' : r.error}`);
  }

  // 2) ensure core staffing — per-instance, not per-type
  const workforce = estimateWorkforce(st);
  
  // Calculate REAL minimum workers needed based on actual consumption/production
  // Farm: 1 worker = 3 food/día, need pop * 0.9 food/día
  // Well: 1 worker = 4 water/día, need pop * 0.9 water/día
  // Minimum workers: each farm worker produces ~3 food, each well worker ~4 water
  const minFarmWorkersNeeded = Math.min(farmCount * 3, Math.max(farmCount, Math.ceil((pop * 0.9) / 3)));
  const minWellWorkersNeeded = Math.min(wellCount * 2, Math.max(wellCount, Math.ceil((pop * 0.9) / 4)));
  const criticalNeed = minFarmWorkersNeeded + minWellWorkersNeeded;
  
  // Add safety margin for weather (use existing weatherMargin from water policy)
  const staffNonCritical = workforce > criticalNeed + weatherMargin;
  
  const staffPriority = (waterCrisis || heatOrStormNow)
    ? ['well', 'farm', ...(staffNonCritical ? ['sawmill', 'scrapyard', 'tech_bench'] : [])]
    : (waterDanger || (st.population.total || 0) >= 5)
    ? ['well', 'farm', ...(staffNonCritical ? ['sawmill', 'scrapyard', 'tech_bench'] : [])]
    : (foodCrisis || foodDanger)
    ? ['farm', 'well', ...(staffNonCritical ? ['sawmill', 'scrapyard', 'tech_bench'] : [])]
    : ['well', 'farm', ...(staffNonCritical ? ['sawmill', 'scrapyard', 'tech_bench'] : [])];

  // First: ensure at least 1 worker per building instance (survival minimum)
  const staffed = ensureStaffed(st, staffPriority);
  if (staffed.length) actions.push(`staff:${staffed.join(',')}`);

  // Second: for critical types (well, farm), try to fill to max if possible
  // Run every turn after day 3 to ensure wells/farms are fully staffed
  // But only if there's workforce capacity
  if (st.day >= 3) {
    const workforce = estimateWorkforce(st);
    const totalAssigned = st.base.buildings.reduce((sum, b) => sum + (b.workers || 0), 0);
    if (totalAssigned < workforce) {
      const criticalTypes = (waterCrisis || heatOrStormNow)
        ? ['well', 'farm']
        : (waterDanger || pop >= 5)
        ? ['well', 'farm']
        : (foodCrisis || foodDanger)
        ? ['farm', 'well']
        : ['well', 'farm'];
      const extra = ensureAllStaffed(st, criticalTypes);
      if (extra.length) actions.push(`staff_extra:${extra.join(',')}`);
    }
  }

  // 2b) ROTATION POLICY B5.9 — demand-aware + capacity-safe wood recovery
  // Maintains existing canonical hysteresis (WOOD_TARGET=20, WOOD_RESUME=8)
  // Adds wood demand check to prevent dead-band stagnation (wood 9-19)
  const woodBuffer = st.resources.wood || 0;
  const metalBuffer = st.resources.metal || 0;
  const foodBuffer = st.resources.food || 0;
  const waterBuffer = st.resources.water || 0;

  // B5.9: Calculate legitimate wood demand from currently affordable buildings
  // This identifies construction/affordability needs the colony is trying to meet
  let woodDemand = 0;
  // House: wood 10
  const houseDef = content.buildings.house;
  const houseAllowed = pilotBuildableTypeIds(st).has('house');
  const houseCanAfford = houseAllowed && Object.entries(houseDef.cost || {}).every(([k, v]) => (st.resources[k] || 0) >= v);
  const houseAnchors = houseAllowed ? anchorsMod.validPilotAnchors(st, content, 'house') : [];
  if (houseAllowed && houseCanAfford && houseAnchors.length > 0) woodDemand += houseDef.cost.wood || 10;
  // Tech Bench: wood 4
  const tbDef = content.buildings.tech_bench;
  const tbAllowed = pilotBuildableTypeIds(st).has('tech_bench');
  const tbCanAfford = tbAllowed && Object.entries(tbDef.cost || {}).every(([k, v]) => (st.resources[k] || 0) >= v);
  const tbAnchors = tbAllowed ? anchorsMod.validPilotAnchors(st, content, 'tech_bench') : [];
  if (tbAllowed && tbCanAfford && tbAnchors.length > 0) woodDemand += tbDef.cost.wood || 4;
  // Cistern: wood 3
  const cisternDef = content.buildings.cistern;
  const cisternAllowed = pilotBuildableTypeIds(st).has('cistern');
  const cisternCanAfford = cisternAllowed && Object.entries(cisternDef.cost || {}).every(([k, v]) => (st.resources[k] || 0) >= v);
  const cisternAnchors = cisternAllowed ? anchorsMod.validPilotAnchors(st, content, 'cistern') : [];
  if (cisternAllowed && cisternCanAfford && cisternAnchors.length > 0) woodDemand += cisternDef.cost.wood || 3;
  // Sawmill: wood 3
  const sawmillDef = content.buildings.sawmill;
  const sawmillAllowed = pilotBuildableTypeIds(st).has('sawmill');
  const sawmillCanAfford = sawmillAllowed && Object.entries(sawmillDef.cost || {}).every(([k, v]) => (st.resources[k] || 0) >= v);
  const sawmillAnchors = sawmillAllowed ? anchorsMod.validPilotAnchors(st, content, 'sawmill') : [];
  if (sawmillAllowed && sawmillCanAfford && sawmillAnchors.length > 0) woodDemand += sawmillDef.cost.wood || 3;
  // Scrapyard: wood 4
  const scDef = content.buildings.scrapyard;
  const scAllowed = pilotBuildableTypeIds(st).has('scrapyard');
  const scCanAfford = scAllowed && Object.entries(scDef.cost || {}).every(([k, v]) => (st.resources[k] || 0) >= v);
  const scAnchors = scAllowed ? anchorsMod.validPilotAnchors(st, content, 'scrapyard') : [];
  if (scAllowed && scCanAfford && scAnchors.length > 0) woodDemand += scDef.cost.wood || 4;
  // Greenhouse: wood 8
  const ghDef = content.buildings.greenhouse;
  const ghAllowed = pilotBuildableTypeIds(st).has('greenhouse');
  const ghCanAfford = ghAllowed && Object.entries(ghDef.cost || {}).every(([k, v]) => (st.resources[k] || 0) >= v);
  const ghAnchors = ghAllowed ? anchorsMod.validPilotAnchors(st, content, 'greenhouse') : [];
  if (ghAllowed && ghCanAfford && ghAnchors.length > 0) woodDemand += ghDef.cost.wood || 8;

  // Buffer targets — canonical baseline (preserved)
  const WOOD_TARGET = 20;
  const WOOD_RESUME = 8;
  const METAL_TARGET = 20;
  const METAL_RESUME = 8;

  const sawmills = st.base.buildings.filter(b => b.type === 'sawmill' && b.hp > 0);
  const scrapyards = st.base.buildings.filter(b => b.type === 'scrapyard' && b.hp > 0);
  const techBenches = st.base.buildings.filter(b => b.type === 'tech_bench' && b.hp > 0);

  // 1. PAUSE sawmill if wood buffer full (canonical, preserved)
  for (const saw of sawmills) {
    if ((saw.workers || 0) > 0 && woodBuffer >= WOOD_TARGET) {
      const r = adjustBuildingWorkers(st, content, saw.id, -1);
      if (r.ok) actions.push('rotate:pause_sawmill');
    }
  }

  // 2. PAUSE scrapyard if metal buffer full (canonical, preserved)
  for (const sc of scrapyards) {
    if ((sc.workers || 0) > 0 && metalBuffer >= METAL_TARGET) {
      const r = adjustBuildingWorkers(st, content, sc.id, -1);
      if (r.ok) actions.push('rotate:pause_scrapyard');
    }
  }

  // 3. B5.9: RESUME sawmill if wood low AND legitimate unmet demand AND safe labor capacity
  // Key: only assign if idle workers exist AFTER critical survival needs (food/water/medical)
  // This prevents the wood 9-19 dead band from causing permanent sawmill pause
  // while never stealing workers from critical survival production
  if ((woodBuffer <= WOOD_RESUME || (woodBuffer < woodDemand && (st.population.labor?.idle || 0) > 0)) && (st.population.labor?.idle || 0) > 0) {
    // Only assign sawmill worker if it won't reduce critical survival coverage
    // Reuse canonical idle worker check: if there are idle workers beyond survival needs
    for (const saw of sawmills) {
      if ((saw.workers || 0) === 0) {
        const r = adjustBuildingWorkers(st, content, saw.id, 1);
        if (r.ok) actions.push('rotate:resume_sawmill');
      }
    }
  }

  // 4. RESUME scrapyard if metal low (canonical, preserved)
  if (metalBuffer <= METAL_RESUME) {
    for (const sc of scrapyards) {
      if ((sc.workers || 0) === 0 && (st.population.labor?.idle || 0) > 0) {
        const r = adjustBuildingWorkers(st, content, sc.id, 1);
        if (r.ok) actions.push('rotate:resume_scrapyard');
        break;
      }
    }
  }
  
  // 5. ASSIGN freed workers to tech_bench for RESEARCH (temporary)
  // Tech bench should be staffed ASAP when built to maximize research speed
  if (st.day >= 5) {
    const activeResearch = st.research?.active;
    const unlocked = st.research?.unlocked || [];
    const techBench = st.base.buildings.find(b => b.type === 'tech_bench' && b.hp > 0);
    
    // Check if there are available research projects to start
    const allResearch = [];
    for (const branch of Object.values(content.researchDoc?.branches || {})) {
      if (branch.techs) allResearch.push(...branch.techs);
    }
    const hasAvailableResearch = allResearch.some(tech => 
      (tech.minEra || 0) <= st.era &&
      !unlocked.includes(tech.id) &&
      !tech.requires?.some(r => !unlocked.includes(r)) &&
      (!tech.cost || canAfford(st, tech.cost))
    );
    
    const shouldStaffTechBench = techBench && (techBench.workers || 0) === 0 && hasAvailableResearch && (st.population.labor?.idle || 0) > 0;
    
    if (shouldStaffTechBench) {
      const r = adjustBuildingWorkers(st, content, techBench.id, 1);
      if (r.ok) actions.push('rotate:assign_tech_bench');
    }

    // RELEASE tech_bench worker when no active research AND no available research
    if (techBench && (techBench.workers || 0) > 0 && !activeResearch && !hasAvailableResearch) {
      const r = adjustBuildingWorkers(st, content, techBench.id, -1);
      if (r.ok) actions.push('rotate:release_tech_bench');
    }
  }

  // 5b) START RESEARCH — if tech_bench exists and no active research, start one
  if (st.day >= 5 && st.era >= 0) {
    const techBench = st.base.buildings.find(b => b.type === 'tech_bench' && b.hp > 0);
    const activeResearch = st.research?.active;
    const unlocked = st.research?.unlocked || [];
    
    if (techBench && !activeResearch && st.day % 2 === 0) {
      // Find available research at current era
      const allTechs = [];
      for (const branch of Object.values(content.researchDoc?.branches || {})) {
        if (branch.techs) allTechs.push(...branch.techs);
      }
      
      for (const tech of allTechs) {
        if ((tech.minEra || 0) > st.era) continue;
        if (unlocked.includes(tech.id)) continue;
        if (tech.requires?.some(r => !unlocked.includes(r))) continue;
        if (tech.cost && !canAfford(st, tech.cost)) continue;
        
        // Start this research
        const r = startResearch(st, content, tech.id);
        if (r.ok) {
          actions.push('research:start_' + tech.id);
          break;
        }
      }
    }
  }
  
  // 5c) BUILD TECH_BENCH PROACTIVELY — Era 1, pop >= 5
  if (st.era >= 1 && pop >= 5) {
    const hasTechBench = st.base.buildings.some(b => b.type === 'tech_bench' && b.hp > 0);
    if (!hasTechBench) {
      const r = tryBuild(st, 'tech_bench');
      if (r.ok) actions.push('rotate:build_tech_bench');
    }
  }
  
  // 6. MEDICINE ON-DEMAND: staff medkit/clinic only when injured/sick
  const hasInjured = (st.population.injured || 0) > 0;
  const hasSick = (st.population.sick || 0) > 0;
  const medBuildings = st.base.buildings.filter(b => ['medkit', 'clinic', 'infirmary'].includes(b.type) && b.hp > 0);
  
  if (hasInjured || hasSick) {
    for (const med of medBuildings) {
      if ((med.workers || 0) === 0 && (st.population.labor?.idle || 0) > 0) {
        const r = adjustBuildingWorkers(st, content, med.id, 1);
        if (r.ok) actions.push('rotate:assign_medic');
      }
    }
  } else {
    // B4L.6: Release medic workers when no injured/sick AND no emergency active
    if (!hasInjured && !hasSick) {
      _emergencyMedActive = false;
      for (const med of medBuildings) {
        if ((med.workers || 0) > 0 && (st.population.labor?.idle || 0) === 0) {
          const r = adjustBuildingWorkers(st, content, med.id, -1);
          if (r.ok) actions.push('rotate:release_medic');
        }
      }
    }
  }

  // 7. DEFENSE ON-DEMAND: staff watchtower only when threat high
  const threat = st.director?.threat || 0;
  const watchtowers = st.base.buildings.filter(b => b.type === 'watchtower' && b.hp > 0);
  if (threat > 20) {
    for (const wt of watchtowers) {
      if ((wt.workers || 0) === 0 && (st.population.labor?.idle || 0) > 0) {
        const r = adjustBuildingWorkers(st, content, wt.id, 1);
        if (r.ok) actions.push('rotate:assign_defense');
      }
    }
  } else if (threat <= 10) {
    for (const wt of watchtowers) {
      if ((wt.workers || 0) > 0 && (st.population.labor?.idle || 0) === 0) {
        const r = adjustBuildingWorkers(st, content, wt.id, -1);
        if (r.ok) actions.push('rotate:release_defense');
      }
    }
  }

  checkOnboardingProgress(st);

  // 3) follow objectives
  let obj = currentObjective(st, content);
  const buildMap = {
    materials_wood: 'sawmill',
    materials_metal: 'scrapyard',
    materials_wood_staff: 'sawmill',
    materials_metal_staff: 'scrapyard',
    research_hint: 'tech_bench',
    need_medicine: 'medkit',
    food_shortage: 'farm',
    water_shortage: 'well',
  };
  if (obj?.id && buildMap[obj.id]) {
    const r = tryBuild(st, buildMap[obj.id]);
    if (r.ok) actions.push(`obj:${obj.id}->built`);
    else actions.push(`obj:${obj.id}->NO:${r.error}`);
  }

  // housing — NENI pilot: house available from day 4, no shelter prerequisite
  if (obj?.id === 'housing' || obj?.id === 'housing_overflow') {
    const r = tryBuild(st, 'house');
    if (r.ok) actions.push('built:house');
    else actions.push(`house:NO:${r.error}`);
  }

  // 4) contextual builds based on game state
  if (st.day >= 5) {
    // clinic for health
    const hasClinic = st.base.buildings.some((b) => ['clinic', 'infirmary'].includes(b.type) && b.hp > 0);
    if (!hasClinic && (st.population.injured > 0 || st.population.sick > 0)) {
      const r = tryBuild(st, 'clinic');
      if (r.ok) actions.push('built:clinic');
    }

    // house if near cap — NENI pilot: house available directly from day 4
    const cap = housingCapacity(st, content.buildings);
    if (st.population.total >= cap - 1 && st.population.total < 40) {
      const r = tryBuild(st, 'house');
      if (r.ok) actions.push('built:house(preemptive)');
    }

    // defense if threat rising
    if ((st.director?.threat || 0) > 20) {
      const hasWatchtower = st.base.buildings.some((b) => b.type === 'watchtower' && b.hp > 0);
      if (!hasWatchtower) {
        const r = tryBuild(st, 'watchtower');
        if (r.ok) actions.push('built:watchtower');
      }
    }

    // ammo storage if low
    if ((st.resources.ammo || 0) < 4) {
      const r = tryBuild(st, 'ammo_depot');
      if (r.ok) actions.push('built:ammo_depot');
    }

    // greenhouse for food scaling
    if (st.era >= 1 && st.population.total >= 6) {
      const hasGreenhouse = st.base.buildings.some((b) => b.type === 'greenhouse' && b.hp > 0);
      if (!hasGreenhouse) {
        const r = tryBuild(st, 'greenhouse');
        if (r.ok) actions.push('built:greenhouse');
      }
    }

    // extra farm (more aggressive) — trigger was dead code pre-B5.42; st.foodDays is undefined
    if (st.foodDays && st.foodDays < 12 && st.population.total >= 4) {
      const farmCount2 = st.base.buildings.filter((b) => b.type === 'farm' && b.hp > 0).length;
      if (farmCount2 < 2) {
        const r = tryBuild(st, 'farm');
        if (r.ok) actions.push('built:farm2');
      }
    }

    // B5.41: 3rd farm capacity — contextual trigger
    const _curFoodDays3 = st.population.total > 0 ? (st.resources.food || 0) / st.population.total : 999;
    if (THIRD_FARM_CAPACITY && _curFoodDays3 < 5 && st.population.total >= 10) {
      const farmCount3 = st.base.buildings.filter((b) => b.type === 'farm' && b.hp > 0).length;
      if (farmCount3 === 2) {
        const totalFarmWorkers3 = st.base.buildings
          .filter((b) => b.type === 'farm' && b.hp > 0)
          .reduce((s, b) => s + (b.workers || 0), 0);
        if (totalFarmWorkers3 >= 4) {
          const r = tryBuild(st, 'farm');
          if (r.ok) actions.push('built:farm3');
        }
      }
    }

    // B5.42: Scalable farm capacity — contextual trigger
    if (SCALABLE_FARM_CAPACITY && st.population.total >= 10) {
      const _fc = st.base.buildings.filter((b) => b.type === 'farm' && b.hp > 0).length;
      const _fw = st.base.buildings.filter((b) => b.type === 'farm' && b.hp > 0).reduce((s, b) => s + (b.workers || 0), 0);
      const _fp = realFoodProd(_fw, _fc, st);
      const _fc2 = st.population.total * 0.9;
      if (_fp < _fc2 && _fw >= _fc * 2) {
        const r = tryBuild(st, 'farm');
        if (r.ok) actions.push('built:farm_scalable');
      }
    }

    // extra well (proactive) — trigger was dead code pre-B5.42; st.waterDays is undefined
    if (st.waterDays && st.waterDays < 10 && st.population.total >= 5) {
      const wellCount2 = st.base.buildings.filter((b) => b.type === 'well' && b.hp > 0).length;
      if (wellCount2 < 2) {
        const r = tryBuild(st, 'well');
        if (r.ok) actions.push('built:well2');
      }
    }

    // 3rd well when pop is high — trigger was dead code pre-B5.42; st.waterDays is undefined
    if (st.waterDays && st.waterDays < 12 && st.population.total >= 9) {
      const wellCount3 = st.base.buildings.filter((b) => b.type === 'well' && b.hp > 0).length;
      if (wellCount3 < 3) {
        const r = tryBuild(st, 'well');
        if (r.ok) actions.push('built:well3');
      }
    }

    // HQ upgrade for era progression
    if (st.era >= 2 && st.population.total >= 12) {
      const hasHQ2 = st.base.buildings.some((b) => (b.type === 'hq_central_l2' || b.type === 'hq_central_l3') && b.hp > 0);
      if (!hasHQ2) {
        const r = tryBuild(st, 'hq_central_l2');
        if (r.ok) actions.push('built:hq_l2');
      }
    }

    // defensive buildings in late game
    if (st.era >= 2 && st.day >= 20) {
      const hasBarricade = st.base.buildings.some((b) => b.type === 'barricade' && b.hp > 0);
      if (!hasBarricade && st.defense < 30) {
        const r = tryBuild(st, 'barricade');
        if (r.ok) actions.push('built:barricade');
      }
    }

  }

  // Second explorer recruitment — recruit when capacity exists and survival stable
  {
    const slots = explorerSlotsUnlocked(st, content.balance);
    const living = livingExplorers(st).length;
    const pop = st.population?.total || 0;
    const fDays = pop > 0 ? (st.resources.food || 0) / (pop * 0.9) : 999;
    const wDays = pop > 0 ? (st.resources.water || 0) / (pop * 0.88) : 999;
    const canRecruitNow = st.explorerRecruitReadyDay == null || st.day >= st.explorerRecruitReadyDay;
    const survivalStable = fDays >= 6 && wDays >= 6 && pop >= 4
      && (st.population.injured || 0) === 0 && (st.population.sick || 0) === 0;

    if (slots >= 2 && living < 2 && canRecruitNow && survivalStable) {
      const r = recruitExplorer(st, content);
      if (r.ok) {
        actions.push('recruited:explorer2');
      }
    }
  }

  // 5) expeditions — always use targeted expedition logic
  if (st.day >= 3) {
    const metalNeeded = (st.resources.metal || 0) < 10;
    const exp = tryExpeditionTargeted(st, metalNeeded);
    if (exp.ok) actions.push(`exped:${exp.zone}(${exp.days}d)`);
    else actions.push(`exped:NO:${exp.error}`);
  }

  // Validation asserts
  actions = validateStaffing(st, actions);

  return actions;
}

// ─── main run ───────────────────────────────────────────

async function runSeed(seed, maxDay) {
  const st = newOfficialGame(seed);
  st._seed = seed;
  const dailyLog = [];
  const milestones = {};
  const eventsLog = [];
  const deathsLog = [];
  let verdict = 'OK';
  let verdictReason = '';
  let prevPop = st.population.total;
  let stallCount = 0;

  for (let d = 1; d <= maxDay; d++) {
    // B4L.6: reset emergency med flag each day (will be re-set by botDecide if needed)
    _emergencyMedActive = false;
    const snap = snapshot(st);

    // B4K.3C: PRE-DECISION SYNC — reconcile labor before bot reads it
    const traceDay = (st._seed === 'lt-alpha' && st.day >= 21 && st.day <= 23);
    let traceEntry = traceDay ? { seed: st._seed, day: st.day } : null;
    const invBefore = captureInvariant(st, 'before-pre-sync');
    if (traceEntry) traceEntry.A_beforePreSync = { ...invBefore, wells: (st.base?.buildings || []).filter(b => b.type === 'well' && b.hp > 0).map(b => ({ id: b.id, workers: b.workers })) };
    let traceB = null;
    syncLaborFromColony(st, content);
    const invAfter = captureInvariant(st, 'after-pre-sync');
    INVARIANT_LOG.push({ before: invBefore, after: invAfter, changed: invBefore.idle !== invAfter.idle || invBefore.workforce !== invAfter.workforce || invBefore.sumWorkers !== invAfter.sumWorkers });
    if (traceDay) traceB = { ...invAfter, wells: (st.base?.buildings || []).filter(b => b.type === 'well' && b.hp > 0).map(b => ({ id: b.id, workers: b.workers })) };

    logWellWorkers(st, 'pre-botDecide');

    const dayActions = botDecide(st);

    // B4K.3C: LEGALITY CHECK after bot decisions
    const legality = checkBotLegality(st);
    LEGALITY_LOG.push(legality);

    let traceC = null;
    if (traceDay) {
      traceC = {
        ...captureInvariant(st, 'C'),
        wells: (st.base?.buildings || []).filter(b => b.type === 'well' && b.hp > 0).map(b => ({ id: b.id, workers: b.workers })),
        sumWorkers: (st.base?.buildings || []).reduce((s, b) => s + (b.hp > 0 ? (b.workers || 0) : 0), 0),
        actions: dayActions,
      };
    }

    logWellWorkers(st, 'post-botDecide');
    const beforePop = st.population.total;
    const beforeBldgs = st.base.buildings.length;
    const beforeExp = st.expeditions.length;

    // B5.36: capture zone states before advanceDay for expedition forensic
    const _b536_zonesBefore = {};
    for (const z of (st.zones || [])) {
      if (z.id !== 'camp' && z.type !== 'camp') {
        _b536_zonesBefore[z.id] = { state: z.state, cp: z.controlProgress || 0, inf: z.infectedLeft || 0 };
      }
    }
    const _b536_activeExps = (st.expeditions || []).map(e => ({ id: e.id, zoneId: e.zoneId, depDay: e.departDay }));
    // B5.36: capture expedition starts (departDay === today)
    const _b536_newExps = (st.expeditions || []).filter(e => e.departDay === st.day).map(e => ({
      day: st.day, type: 'expedition_start', zoneId: e.zoneId,
      zoneName: (st.zones.find(z => z.id === e.zoneId) || {}).name || e.zoneId,
      explorerName: (livingExplorers(st).find(x => x.id === e.explorerId) || {}).name || e.explorerId,
    }));

    const res = advanceDay(st, content);

    if (traceDay && traceEntry) {
      traceEntry.B_afterPreSync = traceB;
      traceEntry.C_afterBotDecide = traceC;
      traceEntry.D_beforeAdvanceDay = { pop: beforePop, buildings: beforeBldgs, expeditions: beforeExp };
      traceEntry.E_afterAdvanceDay = captureInvariant(st, 'E');
      traceEntry.E_wells = (st.base?.buildings || []).filter(b => b.type === 'well' && b.hp > 0).map(b => ({ id: b.id, workers: b.workers }));
      traceEntry.E_sumWorkers = (st.base?.buildings || []).reduce((s, b) => s + (b.hp > 0 ? (b.workers || 0) : 0), 0);
      traceEntry.E_workforce = canonicalWorkforce(st.population);
      traceEntry.E_labor = { ...st.population?.labor };
      TRACE_LOG.push(traceEntry);
    }
    markGuideDayAdvanced(st);
    const { maybeRevealEarlyLandmarks } = onbMod;
    maybeRevealEarlyLandmarks(st);

    // collect post-advance data
    const postSnap = snapshot(st);
    const dayLogs = (st.log || []).filter((e) => e.day >= st.day - 1 && e.day <= st.day);

    // detect deaths
    if (postSnap.pop < beforePop) {
      const deathEvents = dayLogs.filter((e) => e.kind === 'bad');
      deathsLog.push({ day: st.day, from: beforePop, to: postSnap.pop, cause: deathEvents.map((e) => e.text).join('; ') || 'desconocida' });
    }

    // detect attacks
    if (res?.attack) {
      eventsLog.push({ day: st.day, type: 'attack', result: res.attack.result, damage: (res.attack.damaged || []).map((d) => d.name) });
    }

    // B5.36: log expedition starts
    eventsLog.push(..._b536_newExps);

    // detect expedition reports
    const reports = res?.expeditionReports || [];
    if (reports.length) {
      for (const r of reports) {
        const _b = _b536_zonesBefore[r.zoneId] || {};
        eventsLog.push({
          day: st.day,
          type: 'expedition',
          outcome: r.outcome,
          zoneId: r.zoneId,
          zoneName: r.zoneName,
          explorerName: r.explorerName,
          controlled: r.controlled,
          secured: r.secured,
          wounded: r.wounded,
          dead: r.dead,
          loot: r.loot,
          revealed: r.revealed,
          stateBefore: _b.state,
          cpBefore: _b.cp,
          infBefore: _b.inf,
          stateAfter: (st.zones.find(z => z.id === r.zoneId) || {}).state,
          cpAfter: (st.zones.find(z => z.id === r.zoneId) || {}).controlProgress || 0,
          infAfter: (st.zones.find(z => z.id === r.zoneId) || {}).infectedLeft || 0,
        });
      }
    }

    // detect events
    const importantLogs = dayLogs.filter((e) => ['bad', 'warn', 'story', 'good'].includes(e.kind));
    for (const log of importantLogs) {
      if (!eventsLog.some((ev) => ev.day === st.day && ev.text === log.text)) {
        eventsLog.push({ day: st.day, type: 'event', text: log.text, kind: log.kind });
      }
    }

    // record milestones
    if (!milestones.firstImmigrant && st.population.total > prevPop && st.population.total >= 4) {
      milestones.firstImmigrant = st.day;
    }
    if (!milestones.pop6 && st.population.total >= 6) milestones.pop6 = st.day;
    if (!milestones.pop9 && st.population.total >= 9) milestones.pop9 = st.day;
    if (!milestones.pop12 && st.population.total >= 12) milestones.pop12 = st.day;
    if (!milestones.pop20 && st.population.total >= 20) milestones.pop20 = st.day;
    if (!milestones.pop32 && st.population.total >= 32) milestones.pop32 = st.day;
    if (!milestones.firstExplorer && (st.explorers || []).length > 0) milestones.firstExplorer = st.day;
    if (!milestones.explorer2 && livingExplorers(st).length >= 2) milestones.explorer2 = st.day;
    if (!milestones.explorer3 && livingExplorers(st).length >= 3) milestones.explorer3 = st.day;
    if (!milestones.firstExpedition && (st.expeditions || []).length > 0) milestones.firstExpedition = st.day;
    if (!milestones.firstControlled && (st.zones || []).filter((z) => z.state === 'controlled').length > 0) {
      milestones.firstControlled = st.day;
    }
    if (!milestones.firstDisease && (st.population.sick || 0) > 0) milestones.firstDisease = st.day;
    if (!milestones.firstInjury && (st.population.injured || 0) > 0) milestones.firstInjury = st.day;
    if (!milestones.firstDeath && deathsLog.length > 0) milestones.firstDeath = st.day;
    if (!milestones.firstAttack && eventsLog.some((e) => e.type === 'attack')) milestones.firstAttack = st.day;
    if (!milestones.firstDefense && (st.base.buildings || []).some((b) => ['watchtower', 'fence', 'barricade'].includes(b.type) && b.hp > 0)) {
      milestones.firstDefense = st.day;
    }
    if (!milestones.firstRepair && (st.stats?.repairs || 0) > 0) milestones.firstRepair = st.day;
    if (!milestones.firstResearch && (st.research?.unlocked || []).length > 0) milestones.firstResearch = st.day;
    if (!milestones.firstTech && (st.research?.unlocked || []).length > 1) milestones.firstTech = st.day;
    if (!milestones.era1 && st.era >= 1) milestones.era1 = st.day;
    if (!milestones.era2 && st.era >= 2) milestones.era2 = st.day;
    if (!milestones.era3 && st.era >= 3) milestones.era3 = st.day;
    if (!milestones.era4 && st.era >= 4) milestones.era4 = st.day;
    if (!milestones.radio && st.base.buildings?.some((b) => b.type === 'radio' && b.hp > 0)) milestones.radio = st.day;
    if (!milestones.mission && (st.missions?.active || []).length > 0) milestones.mission = st.day;
    if (!milestones.faction && eventsLog.some((e) => (e.text || '').includes('facción'))) milestones.faction = st.day;
    if (!milestones.hospital && (st.base.buildings || []).some((b) => ['clinic', 'infirmary'].includes(b.type) && b.hp > 0)) {
      milestones.hospital = st.day;
    }
    if (!milestones.hqUpgrade && (st.base.buildings || []).some((b) => (b.type === 'hq_central_l2' || b.type === 'hq_central_l3') && b.hp > 0)) {
      milestones.hqUpgrade = st.day;
    }

    prevPop = postSnap.pop;

    // check defeat
    if (st.flags.defeated) {
      verdict = 'DERROTA';
      verdictReason = st.flags.defeatReason || 'desconocida';
      dailyLog.push({ ...postSnap, actions: dayActions, result: 'DEFEAT' });
      break;
    }

    // check victory
    if (st.flags.victory) {
      verdict = 'VICTORIA';
      verdictReason = 'victoria alcanzada';
      dailyLog.push({ ...postSnap, actions: dayActions, result: 'VICTORY' });
      break;
    }

    // stall detection
    const progressed = st.base.buildings.length > beforeBldgs || st.expeditions.length > beforeExp || postSnap.pop > beforePop;
    if (!progressed && st.day > 5) stallCount++;
    else stallCount = 0;

    dailyLog.push({ ...postSnap, actions: dayActions });
  }

  return { seed, verdict, verdictReason, dailyLog, milestones, eventsLog, deathsLog };
}

// ─── execute ────────────────────────────────────────────

(async () => {
console.log(`=== PLAYTEST LARGO — D1→D${MAX_DAY} ===`);
console.log(`Seeds: ${SEEDS.join(', ')}\n`);
const phase1Results = [];

for (const seed of SEEDS) {
  console.log(`Ejecutando ${seed}...`);
  const result = await runSeed(seed, MAX_DAY);
  phase1Results.push(result);
  const lastSnap = result.dailyLog[result.dailyLog.length - 1];
  console.log(`  ${seed}: ${result.veredicto || result.verdict} D${lastSnap?.day || '?'} pop=${lastSnap?.pop || '?'} era=${lastSnap?.era || '?'} muertes=${result.deathsLog.length}`);
}

// determine which seeds continue to D100
const survivors = phase1Results.filter((r) => r.verdict === 'OK' || r.verdict === 'VICTORIA');
console.log(`\nSobrevivientes a D${MAX_DAY}: ${survivors.length}/${SEEDS.length}`);

// B4K.3D: Only run Phase 2 if we haven't already reached CONTINUE_DAYS
if (survivors.length >= 3 && MAX_DAY < CONTINUE_DAYS) {
  console.log(`\n=== FASE 2: Continuando 3 runs hasta D${CONTINUE_DAYS} ===\n`);
  const toContinue = survivors.slice(0, 3);
  for (const prev of toContinue) {
    console.log(`Continuando ${prev.seed} desde D${prev.dailyLog.length}...`);
    // create a new game with same seed and advance to current day, then continue
    const st = newOfficialGame(prev.seed);
    for (let d = 1; d <= prev.dailyLog.length; d++) {
      checkOnboardingProgress(st);
      const guide = onboardingStatus(st);
      if (guide?.step?.suggestBuild) tryBuild(st, guide.step.suggestBuild);
      ensureStaffed(st, ['farm', 'well', 'sawmill', 'scrapyard']);
      checkOnboardingProgress(st);
      let obj = currentObjective(st, content);
      const buildMap = { materials_wood: 'sawmill', materials_metal: 'scrapyard', research_hint: 'tech_bench', need_medicine: 'medkit' };
      if (obj?.id && buildMap[obj.id]) tryBuild(st, buildMap[obj.id]);
      if ((obj?.id === 'housing' || obj?.id === 'housing_overflow') && st.day >= 4) tryBuild(st, 'house');
      if (st.day >= 3) tryExpeditionTargeted(st, (st.resources.metal || 0) < 10);
      advanceDay(st, content);
      markGuideDayAdvanced(st);
      onbMod.maybeRevealEarlyLandmarks(st);
    }
    // continue to D100
    const result2 = await runSeed(prev.seed + ':cont', CONTINUE_DAYS);
    // merge milestones
    Object.assign(prev.milestones, result2.milestones);
    prev.phase2 = result2;
    const lastSnap = result2.dailyLog[result2.dailyLog.length - 1];
    console.log(`  ${prev.seed}: ${result2.verdict} D${lastSnap?.day || '?'} pop=${lastSnap?.pop || '?'} era=${lastSnap?.era || '?'} muertes=${result2.deathsLog.length}`);
  }
}

// ─── B4K.3C pre-compute summary stats ──────────────────
const incoherentBefore = INVARIANT_LOG.filter(i => !i.before.coherent).length;
const incoherentAfter = INVARIANT_LOG.filter(i => !i.after.coherent).length;
const changed = INVARIANT_LOG.filter(i => i.changed).length;
const totalViolations = LEGALITY_LOG.reduce((s, l) => s + l.violations.length, 0);

// save full results
const fullResults = {
  timestamp: new Date().toISOString(),
  maxDay: MAX_DAY,
  seeds: SEEDS,
  invariantChanges: changed,
  legalViolations: totalViolations,
  phase1: phase1Results.map((r) => ({
    seed: r.seed,
    verdict: r.verdict,
    verdictReason: r.verdictReason,
    finalDay: r.dailyLog[r.dailyLog.length - 1]?.day || 0,
    finalPop: r.dailyLog[r.dailyLog.length - 1]?.pop || 0,
    finalEra: r.dailyLog[r.dailyLog.length - 1]?.era || 0,
    deaths: r.deathsLog.length,
    milestones: r.milestones,
    eventsCount: r.eventsLog.length,
    dailyLog: r.dailyLog,
    eventsLog: r.eventsLog,
    deathsLog: r.deathsLog,
    phase2: r.phase2 || null,
  })),
};

const outputFilename = `playtest-long-D${MAX_DAY}-results.json`;
writeFileSync(join(root, 'scripts', outputFilename), JSON.stringify(fullResults, null, 2));
console.log(`\nResultados guardados en scripts/${outputFilename}`);

// summary table
console.log('\n=== RESUMEN ===');
console.table(fullResults.phase1.map((r) => ({
  seed: r.seed,
  resultado: r.veredicto || r.verdict,
  'ultimo día': r.finalDay,
  'pop final': r.finalPop,
  'era final': r.finalEra,
  muertes: r.deaths,
  eventos: r.eventsCount,
})));

// Invariant analysis
console.log(`\nINVARIANT:`);
console.log(`  Total days: ${INVARIANT_LOG.length}`);
console.log(`  Incoherent BEFORE pre-sync: ${incoherentBefore}`);
console.log(`  Incoherent AFTER pre-sync: ${incoherentAfter}`);
console.log(`  State changed by pre-sync: ${changed}`);
console.log(`  Expected after=0: ${incoherentAfter === 0 ? 'PASS' : 'FAIL'}`);

// Bot legality
const overassignDays = LEGALITY_LOG.filter(l => l.violations.some(v => v.startsWith('OVERASSIGN'))).length;
const overstaffDays = LEGALITY_LOG.filter(l => l.violations.some(v => v.startsWith('OVERSTAFF'))).length;
console.log(`\nBOT LEGALITY:`);
console.log(`  Total violations: ${totalViolations}`);
console.log(`  Overassignment days: ${overassignDays}`);
console.log(`  Overstaff days: ${overstaffDays}`);
console.log(`  Expected 0 violations: ${totalViolations === 0 ? 'PASS' : 'FAIL'}`);

// Well workers analysis
const wellZeroDays = {};
for (const seed of SEEDS) {
  wellZeroDays[seed] = WELL_WORKERS_LOG.filter(w => w.seed === seed && w.wellWorkers === 0 && w.label === 'post-botDecide').length;
}
console.log(`\nWELL WORKERS (post-botDecide):`);
for (const seed of SEEDS) {
  console.log(`  ${seed}: ${wellZeroDays[seed]} days with well=0`);
}

// Per-seed well worker timeline (days where well drops)
for (const seed of SEEDS) {
  const drops = WELL_WORKERS_LOG.filter(w => w.seed === seed && w.label === 'post-botDecide')
    .filter((w, i, arr) => i > 0 && w.wellWorkers < arr[i-1].wellWorkers);
  if (drops.length) {
    console.log(`  ${seed} drops:`, drops.map(d => `D${d.day}:${d.wellWorkers}`).join(', '));
  }
}

// D21-D23 trace
if (TRACE_LOG.length) {
  console.log(`\nTRACE lt-alpha D21-D23:`);
  for (const t of TRACE_LOG) {
    console.log(`\n--- D${t.day} ---`);
    console.log(`  A (before pre-sync): wf=${t.A_beforePreSync.workforce} sumW=${t.A_beforePreSync.sumWorkers} idle=${t.A_beforePreSync.idle} sick=${t.A_beforePreSync.sick} injured=${t.A_beforePreSync.injured}`);
    console.log(`    wells:`, t.A_beforePreSync.wells?.map(w => `id=${w.id}:w=${w.workers}`).join(' '));
    console.log(`    labor: food=${t.A_beforePreSync.food} water=${t.A_beforePreSync.water} produce=${t.A_beforePreSync.produce} defense=${t.A_beforePreSync.defense} medicine=${t.A_beforePreSync.medicine} build=${t.A_beforePreSync.build} idle=${t.A_beforePreSync.idle}`);
    console.log(`  B (after pre-sync):  wf=${t.B_afterPreSync.workforce} sumW=${t.B_afterPreSync.sumWorkers} idle=${t.B_afterPreSync.idle}`);
    console.log(`    wells:`, t.B_afterPreSync.wells?.map(w => `id=${w.id}:w=${w.workers}`).join(' '));
    console.log(`    labor: food=${t.B_afterPreSync.food} water=${t.B_afterPreSync.water} produce=${t.B_afterPreSync.produce} defense=${t.B_afterPreSync.defense} medicine=${t.B_afterPreSync.medicine} build=${t.B_afterPreSync.build} idle=${t.B_afterPreSync.idle}`);
    if (t.C_afterBotDecide) {
      console.log(`  C (after botDecide): wf=${t.C_afterBotDecide.workforce} sumW=${t.C_afterBotDecide.sumWorkers} idle=${t.C_afterBotDecide.idle}`);
      console.log(`    wells:`, t.C_afterBotDecide.wells?.map(w => `id=${w.id}:w=${w.workers}`).join(' '));
      console.log(`    actions:`, t.C_afterBotDecide.actions?.filter(a => !a.startsWith('ASSERT_')).join('; '));
    }
    if (t.D_beforeAdvanceDay) {
      console.log(`  D (before advanceDay): pop=${t.D_beforeAdvanceDay.pop} buildings=${t.D_beforeAdvanceDay.buildings}`);
    }
    console.log(`  E (after advanceDay): wf=${t.E_afterAdvanceDay.workforce} sumW=${t.E_sumWorkers} idle=${t.E_afterAdvanceDay.idle}`);
    console.log(`    wells:`, t.E_wells?.map(w => `id=${w.id}:w=${w.workers}`).join(' '));
    console.log(`    labor: food=${t.E_labor.food} water=${t.E_labor.water} produce=${t.E_labor.produce} defense=${t.E_labor.defense} medicine=${t.E_labor.medicine} build=${t.E_labor.build} idle=${t.E_labor.idle}`);
  }
}
})();
