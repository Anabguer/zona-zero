/**
 * PLAYTEST LARGO — D1→D50 (y D100 si 3+ sobreviven).
 * Bot legal: construir, asignar, avanzar día, expediciones.
 * NO regala recursos, NO toca balance, NO modifica código del juego.
 *
 *   node scripts/playtest-long.mjs
 *
 * Salida: JSON estructurado en scripts/playtest-long-results.json
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// B4K.3E: Variant A/E support — parse flags before any dynamic imports
const VARIANT = process.argv.includes('--variant=A') ? 'A'
  : process.argv.includes('--variant=E') ? 'E'
  : process.argv.includes('--variant=G') ? 'G'
  : null;
const maxDayArg = process.argv.find(a => a.startsWith('--maxDay='));
const seedsArg = process.argv.find(a => a.startsWith('--seeds='));
const MAX_DAY = maxDayArg ? parseInt(maxDayArg.split('=')[1]) : 50;
const SEEDS = seedsArg ? seedsArg.split('=')[1].split(',') : ['lt-alpha', 'lt-beta', 'lt-gamma', 'lt-delta', 'lt-epsilon'];

// B4K.3E: Patch colony.js for variant A or E BEFORE any imports
// BOTH variants: remove water>=1 protection
// Variant E: additionally swap food↔water order
// Variant G: NO colony.js patch, only balance.json patch
let _savedColonyJs = null;
if (VARIANT === 'A' || VARIANT === 'E') {
  const _colonyPath = join(root, 'js', 'colony.js');
  _savedColonyJs = readFileSync(_colonyPath, 'utf8');
  let _patched = _savedColonyJs
    .replace(
      /if \(key === 'water' && curWorkers <= 1\) continue;\s*\r?\n\s*const take = key === 'water' \? Math\.min\(curWorkers - 1, over\) : Math\.min\(curWorkers, over\);/,
      'const take = Math.min(curWorkers, over);'
    );
  // Variant E: swap food↔water order in cutting loop
  if (VARIANT === 'E') {
    _patched = _patched.replace(
      "const order = ['produce', 'defense', 'medicine', 'build', 'water', 'food'];",
      "const order = ['produce', 'defense', 'medicine', 'build', 'food', 'water'];"
    );
    console.log('B4K.3E VARIANT E: water>=1 REMOVED + food-before-water order');
  } else {
    console.log('B4K.3E VARIANT A (control): water>=1 REMOVED, original order preserved');
  }
  writeFileSync(_colonyPath, _patched);
}

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

// B4K.3G: Patch balance for variant G (natural healing)
if (VARIANT === 'G') {
  content.balance.health.minHealWithoutBeds = 1.0;
  console.log('B4K.3G VARIANT G: minHealWithoutBeds=1.0 (natural healing active)');
}

const { createNewState, housingCapacity, defenseValue } = await import(pathToFileURL(join(root, 'js', 'state.js')).href);
const { installPilotZoneMap } = await import(pathToFileURL(join(root, 'js', 'pilot-terrain.js')).href);
const { remapPilotZones, pilotBuildableTypeIds } = await import(pathToFileURL(join(root, 'js', 'pilot-test.js')).href);
const simModule = await import(pathToFileURL(join(root, 'js', 'sim.js')).href);
const { placeBuilding, adjustBuildingWorkers, startExpedition, expeditionPreview, startResearch, canAfford } = simModule;
let { advanceDay } = simModule;

// B4K.3C C2 mode: neutralize post-outbreak sync at sim.js:1174
// B4K.3D: also neutralize for A/B variants
const C2_MODE = process.argv.includes('--c2');
const NEUTRALIZE_POST_OUTBREAK = C2_MODE || VARIANT === 'A' || VARIANT === 'B' || VARIANT === 'E' || VARIANT === 'G';
if (NEUTRALIZE_POST_OUTBREAK) {
  const { readFileSync: rfs, writeFileSync: wfs, unlinkSync: ufs } = await import('fs');
  const simSrc = rfs(join(root, 'js', 'sim.js'), 'utf8');
  const patched = simSrc.replace(
    '  syncLaborFromColony(state, content);\n  tickResearch(state, content);',
    '  // B4K.3D: post-outbreak sync neutralized for A/B test\n  // syncLaborFromColony(state, content);\n  tickResearch(state, content);'
  );
  const c2Path = join(root, 'js', '_sim-c2.mjs');
  wfs(c2Path, patched);
  const c2Mod = await import(pathToFileURL(c2Path).href);
  advanceDay = c2Mod.advanceDay;
  try { ufs(c2Path); } catch {}
  console.log(`B4K.3D: post-outbreak sync at sim.js:1174 NEUTRALIZED (${VARIANT ? 'variant '+VARIANT : 'c2'})`);
}
const onbMod = await import(pathToFileURL(join(root, 'js', 'onboarding.js')).href);
const { ensureOnboarding, checkOnboardingProgress, onboardingStatus, markGuideDayAdvanced } = onbMod;
const { currentObjective, syncLaborFromColony } = await import(pathToFileURL(join(root, 'js', 'colony.js')).href);
const { workforce: canonicalWorkforce } = await import(pathToFileURL(join(root, 'js', 'population.js')).href);
const { livingExplorers } = await import(pathToFileURL(join(root, 'js', 'explorers.js')).href);
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
// B4L.6: Emergency rotation state (per-seed, reset in runSeed)
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

function tryExpedition(st, preferMetal) {
  const ex = livingExplorers(st).find((e) => e.status === 'ready' && !e.expeditionId);
  if (!ex) return { ok: false, error: 'sin explorador listo' };
  const camp = st.zones.find((z) => z.type === 'camp') || { x: 824, y: 520 };
  const cands = st.zones.filter((z) => z.state !== 'unknown' && z.id !== camp.id && z.type !== 'camp');
  if (!cands.length) return { ok: false, error: 'sin zonas descubiertas' };
  const score = (z) => {
    const d = Math.hypot((z.x ?? 0) - camp.x, (z.y ?? 0) - camp.y);
    const metalBonus = preferMetal && (z.loot?.metal || 0) > 0 ? -100 : 0;
    return d + metalBonus;
  };
  cands.sort((a, b) => score(a) - score(b));
  for (const z of cands.slice(0, 4)) {
    const prev = expeditionPreview(st, content, z.id, ex.id);
    if ((prev.fuel || 0) > (st.resources.fuel || 0)) continue;
    const r = startExpedition(st, content, z.id, ex.id);
    if (r.ok) return { ok: true, zone: z.name, days: prev.days, fuel: prev.fuel || 0, explorer: ex.name };
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
  const foodDays = st.population.total > 0 ? (st.resources.food || 0) / st.population.total : 999;
  const waterDays = st.population.total > 0 ? (st.resources.water || 0) / st.population.total : 999;
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
  const waterRatio = st.waterDays || (pop > 0 ? (st.resources.water || 0) / pop : 999);
  const foodDays = st.foodDays || (pop > 0 ? (st.resources.food || 0) / pop : 999);
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
  const foodRatio = st.foodDays || 999;
  const foodCrisis = foodRatio < 4;
  const foodDanger = foodRatio < 10;
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

  // 2b) ROTATION POLICY — manage material buffers and rotate workers legally
  const woodBuffer = st.resources.wood || 0;
  const metalBuffer = st.resources.metal || 0;
  const foodBuffer = st.resources.food || 0;
  const waterBuffer = st.resources.water || 0;

  // Buffer targets (reasonable for pop 6-9)
  const WOOD_TARGET = 20;
  const WOOD_RESUME = 8;
  const METAL_TARGET = 20;
  const METAL_RESUME = 8;

  const sawmills = st.base.buildings.filter(b => b.type === 'sawmill' && b.hp > 0);
  const scrapyards = st.base.buildings.filter(b => b.type === 'scrapyard' && b.hp > 0);
  const techBenches = st.base.buildings.filter(b => b.type === 'tech_bench' && b.hp > 0);

  // 1. PAUSE sawmill if wood buffer full
  for (const saw of sawmills) {
    if ((saw.workers || 0) > 0 && woodBuffer >= WOOD_TARGET) {
      const r = adjustBuildingWorkers(st, content, saw.id, -1);
      if (r.ok) actions.push('rotate:pause_sawmill');
    }
  }

  // 2. PAUSE scrapyard if metal buffer full
  for (const sc of scrapyards) {
    if ((sc.workers || 0) > 0 && metalBuffer >= METAL_TARGET) {
      const r = adjustBuildingWorkers(st, content, sc.id, -1);
      if (r.ok) actions.push('rotate:pause_scrapyard');
    }
  }

  // 3. RESUME sawmill if wood low
  if (woodBuffer <= WOOD_RESUME) {
    for (const saw of sawmills) {
      if ((saw.workers || 0) === 0 && (st.population.labor?.idle || 0) > 0) {
        const r = adjustBuildingWorkers(st, content, saw.id, 1);
        if (r.ok) actions.push('rotate:resume_sawmill');
        break;
      }
    }
  }

  // 4. RESUME scrapyard if metal low
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

    // extra farm (more aggressive)
    if (st.foodDays < 12 && st.population.total >= 4) {
      const farmCount2 = st.base.buildings.filter((b) => b.type === 'farm' && b.hp > 0).length;
      if (farmCount2 < 2) {
        const r = tryBuild(st, 'farm');
        if (r.ok) actions.push('built:farm2');
      }
    }

    // extra well (proactive)
    if (st.waterDays < 10 && st.population.total >= 5) {
      const wellCount2 = st.base.buildings.filter((b) => b.type === 'well' && b.hp > 0).length;
      if (wellCount2 < 2) {
        const r = tryBuild(st, 'well');
        if (r.ok) actions.push('built:well2');
      }
    }

    // 3rd well when pop is high
    if (st.waterDays < 12 && st.population.total >= 9) {
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

  // 5) expeditions
  if (st.day >= 3) {
    const metalNeeded = (st.resources.metal || 0) < 10;
    const exp = tryExpedition(st, metalNeeded);
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

    // detect expedition reports
    const reports = res?.expeditionReports || [];
    if (reports.length) {
      eventsLog.push({ day: st.day, type: 'expedition', reports: reports.map((r) => ({ outcome: r.outcome, loot: r.loot, dead: r.dead })) });
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
    if (!milestones.radio && st.base.buildings?.some((b) => b.type === 'radio_antenna' && b.hp > 0)) milestones.radio = st.day;
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
console.log(`=== B4K.3E — FASE 1: D1→D${MAX_DAY} ===`);
if (VARIANT === 'A') console.log('VARIANT A (control): water-before-food, NO water>=1');
if (VARIANT === 'E') console.log('VARIANT E (experimental): food-before-water, NO water>=1');
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
      if (st.day >= 3) tryExpedition(st, (st.resources.metal || 0) < 10);
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
  variant: VARIANT,
  neutralizePostOutbreak: NEUTRALIZE_POST_OUTBREAK,
  maxDay: MAX_DAY,
  seeds: SEEDS,
  b4k3c: { mode: C2_MODE ? 'C2' : (VARIANT ? 'A/B' : 'C1'), invariantChanges: changed, legalViolations: totalViolations },
  seeds: SEEDS,
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

// B4K.3E: Variant-aware output naming
const variantTag = VARIANT ? `-${VARIANT === 'A' ? 'control-A' : 'experimental-E'}` : '';
const outputFilename = `b4k3e${variantTag}-D${MAX_DAY}-results.json`;
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

// ─── B4K.3E OUTPUT ─────────────────────────────────────
console.log('\n=== B4K.3E: FOOD/WATER PRIORITY TEST ===');
console.log(`Variant: ${VARIANT || 'none'}`);
console.log(`Post-outbreak sync: ${NEUTRALIZE_POST_OUTBREAK ? 'NEUTRALIZED' : 'ACTIVE'}`);
if (VARIANT === 'A') console.log('Control: water-before-food (original order)');
if (VARIANT === 'E') console.log('Experimental: food-before-water (swapped order)');

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

// Save B4K.3C data
const b4k3cData = {
  mode: C2_MODE ? 'C2' : 'C1',
  timestamp: new Date().toISOString(),
  invariantLog: INVARIANT_LOG,
  legalityLog: LEGALITY_LOG,
  wellWorkersLog: WELL_WORKERS_LOG,
  traceLog: TRACE_LOG,
  summary: {
    incoherentBeforePreSync: incoherentBefore,
    incoherentAfterPreSync: incoherentAfter,
    stateChangedByPreSync: changed,
    totalLegalViolations: totalViolations,
    wellZeroDays,
  },
};
writeFileSync(join(root, 'scripts', `b4k3c-results-${C2_MODE ? 'c2' : 'c1'}.json`), JSON.stringify(b4k3cData, null, 2));
console.log(`\nB4K.3C data saved to scripts/b4k3c-results-${C2_MODE ? 'c2' : 'c1'}.json`);

// B4K.3E: Restore colony.js if it was patched
if (_savedColonyJs !== null) {
  const _colonyPath = join(root, 'js', 'colony.js');
  writeFileSync(_colonyPath, _savedColonyJs);
  console.log('\nB4K.3E: colony.js RESTORED to original');
}
})();
