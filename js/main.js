/**
 * Zona Zero 1.3 — UI mundo-primero (tocar el mundo)
 */
import {
  loadContent,
  createNewState,
  housingCapacity,
  defenseValue,
  summarizeState,
  migrateState,
} from './state.js';
import {
  advanceDay,
  startExpedition,
  placeBuilding,
  RES_LABEL,
  canAfford,
  expeditionPreview,
  startResearch,
  buyVehicle,
  continueEndless,
  adjustCategoryLabor,
  adjustBuildingWorkers,
  autoAssignWorkers,
  resolveBaseAttack,
  syncLaborFromColony,
} from './sim.js';
import { resolvePendingChoice } from './director.js';
import { renderMap, bindMapCamera, recenterCamera, clampCamera, zoomCameraBy, panCameraBy, mapMetrics, cameraViewBox } from './render-map.js';
import {
  ensureBuildGhost,
  setBuildGhostCell,
  snapGhostToWorld,
  ghostPlacementOk,
  clearBuildMode,
  cellToWorld,
  freeBuildableCells,
} from './build-place.js';
import {
  readyExplorers,
  livingExplorers,
  renameExplorer,
  recruitExplorer,
  explorerSlotsUnlocked,
} from './explorers.js';
import { startNewGameFlow, markIntroSeen, DEFAULT_COLONY_NAME, applyIntroArrival } from './intro.js';
import { initOrientationGate, refreshOrientationGate, isGameplayPortraitBlocked } from './orientation.js';
import {
  ensureSectors,
  getSector,
  summarizeRecoveryCost,
  canStartRecovery,
  startSectorRecovery,
  isAdjacentToRecovered,
  COMPONENT_LABEL,
} from './sectors.js';
import { workforce } from './population.js';
import {
  currentObjective,
  laborKeyForBuilding,
  productionPreview,
  buildingWorkerCap,
} from './colony.js';
import { RES_ICONS, renderPortraitSvg, buildingThumb, familyIcon } from './icons.js';
import {
  artUrl,
  buildingArtUrl,
  zoneArtUrl,
  portraitArtUrl,
  RES_ART,
} from './art.js';
import {
  onboardingStatus,
  checkOnboardingProgress,
  advanceOnboarding,
  ensureOnboarding,
  dismissOnboarding,
  markGuideDayAdvanced,
  markGuideExplored,
  maybeRevealEarlyLandmarks,
  suggestedBuildType,
  coachMessage,
} from './onboarding.js';
import * as api from './api.js';
import { initSound, setSoundEnabled, isSoundEnabled, sfx } from './sound.js';

const RES_LABEL_UI = {
  food: 'Comida',
  water: 'Agua',
  wood: 'Madera',
  metal: 'Metal',
  medicine: 'Medicinas',
  fuel: 'Combustible',
  ammo: 'Munición',
};

const LABOR_LABEL = {
  idle: 'Disponibles',
  food: 'Comida',
  water: 'Agua',
  build: 'Construcción',
  produce: 'Producción',
  defense: 'Defensa',
  medicine: 'Medicina',
};

const SKILL_LABEL = {
  explore: 'Explorar',
  loot: 'Saquear',
  fight: 'Combatir',
  resist: 'Resistir',
};

let content = null;
let state = null;
let dirty = false;
let chromeBound = false;
let eventCardTimer = 0;
let saveTimer = 0;
let autosaveInterval = 0;

const $ = (id) => document.getElementById(id);

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toast(text, kind = 'info') {
  const el = $('zz-toast');
  if (!el) return;
  el.textContent = text;
  el.dataset.kind = kind;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.hidden = true;
  }, 2600);
}

function scheduleSave() {
  dirty = true;
  if ($('zz-save-state')) $('zz-save-state').textContent = 'Cambios…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => doSave(), 1200);
}

async function doSave() {
  if (!state) return;
  try {
    const r = await api.saveGame(state, state.colonyName, summarizeState(state));
    if (!r.ok) throw new Error(r.error || 'save');
    dirty = false;
    if ($('zz-save-state')) $('zz-save-state').textContent = 'Guardado';
  } catch (e) {
    if ($('zz-save-state')) $('zz-save-state').textContent = 'Error al guardar';
    toast('No se pudo guardar', 'bad');
  }
}

function startAutosaveLoop() {
  clearInterval(autosaveInterval);
  // Autoguardado periódico (~90s) además del debounce por acción
  autosaveInterval = setInterval(() => {
    if (dirty && state) doSave();
  }, 90000);
  window.addEventListener('pagehide', () => {
    if (dirty && state) {
      // best-effort; navegadores pueden cancelar async
      doSave();
    }
  });
}

function openSheet(html) {
  const sheet = $('zz-sheet');
  const body = $('zz-sheet-body');
  if (!sheet || !body) return;
  body.innerHTML = html;
  sheet.hidden = false;
  body.querySelectorAll('[data-thumb]').forEach((el) => {
    const type = el.getAttribute('data-thumb');
    try {
      el.appendChild(buildingThumb(type, 44));
    } catch {
      /* ignore */
    }
  });
  body.querySelectorAll('[data-labor]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-labor');
      const delta = Number(btn.getAttribute('data-delta') || 0);
      const r = adjustCategoryLabor(state, content, key, delta);
      if (!r.ok) toast(r.error || 'No', 'warn');
      else {
        sfx.click?.();
        scheduleSave();
        paint();
        openPopulationSheet();
      }
    });
  });
  body.querySelectorAll('[data-bworkers]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-bworkers');
      const delta = Number(btn.getAttribute('data-delta') || 0);
      const r = adjustBuildingWorkers(state, content, id, delta);
      if (!r.ok) toast(r.error || 'No', 'warn');
      else {
        sfx.click?.();
        checkOnboardingProgress(state);
        scheduleSave();
        paint();
        openBuildingSheet(id);
      }
    });
  });
  body.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => handleSheetAction(btn.getAttribute('data-action'), btn));
  });
}

function closeSheet() {
  const sheet = $('zz-sheet');
  if (sheet) sheet.hidden = true;
}

function handleSheetAction(action, btn) {
  if (action === 'send-exp') {
    const zoneId = btn.getAttribute('data-zone');
    const exId = state.selectedExplorerId || readyExplorers(state)[0]?.id;
    const r = startExpedition(state, content, zoneId, exId);
    if (!r.ok) toast(r.error, 'bad');
    else {
      sfx.expedition?.();
      toast(`${r.preview.explorerName} en ruta · ${r.preview.days} día(s) · riesgo ${r.preview.category}`, 'good');
      markGuideExplored(state);
      checkOnboardingProgress(state);
      state.uiMode = null;
      scheduleSave();
      closeSheet();
    }
    paint();
    return;
  }
  if (action === 'build-pick') {
    const type = btn.getAttribute('data-build');
    const def = content.buildings[type];
    if (!canAfford(state, def?.cost)) {
      toast('Faltan recursos', 'warn');
      return;
    }
    state.buildMode = type;
    state.uiMode = 'build';
    state.selectedBuildingId = null;
    state.selectedSectorId = null;
    state.buildGhost = null;
    ensureBuildGhost(state);
    closeSheet();
    paint();
    toast(`Mové el fantasma · confirmá con ✓`, 'info');
    return;
  }
  if (action === 'expand-mode') {
    if (state.uiMode === 'expand') {
      state.uiMode = null;
      state.selectedSectorId = null;
      toast('Modo recuperación cerrado', 'info');
    } else {
      state.uiMode = 'expand';
      state.buildMode = null;
      ensureSectors(state);
      toast('Toca una zona colindante para ver cómo recuperarla', 'info');
    }
    closeSheet();
    paint();
    return;
  }
  if (action === 'recover-sector') {
    const id = btn.getAttribute('data-sector');
    const r = startSectorRecovery(state, id);
    if (!r.ok) {
      toast(r.error || 'No se puede recuperar', 'warn');
      return;
    }
    sfx.build?.();
    toast(`Recuperando «${r.sector.name}» · ${r.cost.days} día(s)`, 'good');
    scheduleSave();
    openSectorSheet(id);
    paint();
    return;
  }
  if (action === 'focus-core') {
    state.selectedSectorId = 'core';
    state.uiMode = state.uiMode === 'expand' ? 'expand' : null;
    openSectorSheet('core');
    paint();
    return;
  }
  if (action === 'cancel-build') {
    clearBuildMode(state);
    toast('Construcción cancelada', 'info');
    paint();
    return;
  }
  if (action === 'confirm-build') {
    confirmBuildPlacement();
    return;
  }
  if (action === 'start-explore') {
    const id = btn.getAttribute('data-id');
    state.selectedExplorerId = id;
    state.uiMode = 'explore';
    state.buildMode = null;
    closeSheet();
    toast('Elegid un destino resaltado en el mapa', 'info');
    paint();
    return;
  }
  if (action === 'cancel-explore') {
    state.uiMode = null;
    paint();
    return;
  }
  if (action === 'open-build-from-camp') {
    openBuildSheet();
    return;
  }
  if (action === 'auto-labor') {
    autoAssignWorkers(state, content);
    toast('Asignación automática', 'good');
    scheduleSave();
    openPopulationSheet();
    paint();
    return;
  }
  if (action === 'rename-ex') {
    const id = btn.getAttribute('data-id');
    const name = prompt('Nombre del explorador', livingExplorers(state).find((e) => e.id === id)?.name || '');
    if (name) {
      renameExplorer(state, id, name);
      scheduleSave();
      openExplorerSheet(id);
      paint();
    }
    return;
  }
  if (action === 'recruit-ex') {
    const r = recruitExplorer(state, content);
    if (!r.ok) toast(r.error, 'bad');
    else {
      toast(`${r.explorer.name} reclutado`, 'good');
      scheduleSave();
    }
    paint();
    openMoreSheet();
    return;
  }
  if (action === 'research') {
    const r = startResearch(state, content, btn.getAttribute('data-tech'));
    if (!r.ok) toast(r.error, 'warn');
    else {
      toast('Investigación iniciada', 'good');
      scheduleSave();
    }
    openMoreSheet();
    paint();
    return;
  }
  if (action === 'buy-vehicle') {
    const r = buyVehicle(state, content, btn.getAttribute('data-veh'));
    if (!r.ok) toast(r.error, 'warn');
    else {
      toast('Vehículo disponible', 'good');
      scheduleSave();
    }
    openMoreSheet();
    paint();
    return;
  }
  if (action === 'equip-weapon') {
    const id = btn.getAttribute('data-id');
    const e = state.explorers.find((x) => x.id === id);
    if (e) {
      e.gear = e.gear || {};
      e.gear.weapon = btn.getAttribute('data-val');
      scheduleSave();
      openExplorerSheet(id);
    }
    return;
  }
  if (action === 'equip-vehicle') {
    const id = btn.getAttribute('data-id');
    const e = state.explorers.find((x) => x.id === id);
    if (e) {
      e.vehicleId = btn.getAttribute('data-val') || null;
      scheduleSave();
      openExplorerSheet(id);
    }
  }
}

function categoryDayImpact(key) {
  const labor = state.population?.labor || {};
  const n = labor[key] || 0;
  if (key === 'idle') return { text: 'libres para asignar', deficit: null };
  if (key === 'build') {
    return {
      text: n > 0 ? 'pueden construir' : 'sin mano de obra',
      deficit: n < 1 ? 'Asignad construcción para edificar' : null,
    };
  }
  if (key === 'defense') {
    return {
      text: n > 0 ? `patrulla +${Math.round(n * (content.balance.defensePerAssigned || 2.5))} def` : 'sin patrulla',
      deficit: null,
    };
  }
  if (key === 'medicine') {
    return { text: n > 0 ? 'curan heridos/enfermos' : 'sin cuidado', deficit: null };
  }
  let est = 0;
  let slots = 0;
  let staffed = 0;
  (state.base.buildings || []).forEach((b) => {
    if (b.hp <= 0) return;
    const def = content.buildings[b.type];
    const k = laborKeyForBuilding(def);
    if (k !== key || !def?.produces) return;
    const jobs = Math.max(1, def.jobs || 1);
    slots += jobs;
    staffed += b.workers || 0;
    const ratio = (b.workers || 0) <= 0 ? 0 : Math.min(1.15, (b.workers || 0) / jobs);
    Object.values(def.produces).forEach((v) => {
      est += Math.round(v * ratio);
    });
  });
  const labels = { food: 'comida', water: 'agua', produce: 'mat.' };
  const res = labels[key] || key;
  if (slots === 0) {
    return {
      text: 'sin edificios',
      deficit:
        key === 'food' || key === 'water'
          ? `Construid ${key === 'food' ? 'huerto' : 'pozo'}`
          : 'Construid un edificio de producción',
    };
  }
  if (staffed === 0) {
    return { text: `0 ${res}/día`, deficit: 'Edificios sin trabajadores' };
  }
  return { text: `≈ +${est} ${res}/día`, deficit: staffed < slots ? `Puestos libres ${slots - staffed}` : null };
}

function openPopulationSheet() {
  syncLaborFromColony(state, content);
  const pop = state.population;
  const cap = housingCapacity(state, content.buildings);
  const labor = pop.labor || {};
  const rows = ['idle', 'food', 'water', 'build', 'produce', 'defense', 'medicine']
    .map((k) => {
      const impact = categoryDayImpact(k);
      const steppers =
        k === 'idle'
          ? `<span class="zz-labor-val">${labor[k] || 0}</span>`
          : `<div class="zz-stepper">
              <button type="button" data-labor="${k}" data-delta="-1" aria-label="Menos">−</button>
              <span>${labor[k] || 0}</span>
              <button type="button" data-labor="${k}" data-delta="1" aria-label="Más">+</button>
            </div>`;
      return `<div class="zz-labor-row">
        <div>
          <strong>${LABOR_LABEL[k]}</strong>
          <div class="zz-labor-impact">${escapeHtml(impact.text)}</div>
          ${impact.deficit ? `<div class="zz-labor-deficit">${escapeHtml(impact.deficit)}</div>` : ''}
        </div>
        ${steppers}
      </div>`;
    })
    .join('');
  openSheet(`
    <h2>Colonia ${pop.total} / ${cap}</h2>
    <p>Disponibles <strong>${labor.idle || 0}</strong> · Asignados <strong>${workforce(pop) - (labor.idle || 0)}</strong>
      ${pop.injured || pop.sick ? ` · Heridos ${pop.injured || 0} · Enfermos ${pop.sick || 0}` : ''}</p>
    ${rows}
    <p style="margin-top:0.75rem"><button type="button" class="zz-btn" data-action="auto-labor">Redistribuir automático</button></p>
  `);
}

function openBuildingSheet(id) {
  const b = state.base.buildings.find((x) => x.id === id && x.hp > 0);
  if (!b) return;
  state.selectedBuildingId = id;
  focusBuildingCamera(b.id);
  const def = content.buildings[b.type];
  if (!def) return;
  const key = laborKeyForBuilding(def);
  const cap = buildingWorkerCap(def);
  const workers = b.workers || 0;
  const prev = productionPreview(def, workers);
  const prodLine =
    prev.map((p) => `+${p.amount} ${RES_LABEL_UI[p.key] || p.key}/día`).join(' · ') ||
    (def.defense ? `+${def.defense} defensa` : def.housing ? `+${def.housing} capacidad` : '—');
  const art = buildingArtUrl(b.type);
  const unstaffed = key && workers < 1;

  openSheet(`
    <div class="zz-ctx">
      <div class="zz-ctx__head">
        <img class="zz-ctx__art" src="${art}" alt="" width="64" height="64" />
        <div>
          <h2>${escapeHtml(def.name)}</h2>
          <p>${escapeHtml((def.desc || '').slice(0, 90))}</p>
        </div>
      </div>
      ${
        key
          ? `<div class="zz-ctx__stat">
               <span>Trabajadores</span>
               <div class="zz-stepper">
                 <button type="button" data-bworkers="${b.id}" data-delta="-1" aria-label="Menos">−</button>
                 <span>${workers} / ${cap}</span>
                 <button type="button" data-bworkers="${b.id}" data-delta="1" aria-label="Más">+</button>
               </div>
             </div>
             <p class="zz-ctx__prod">${escapeHtml(prodLine)}</p>
             ${unstaffed ? '<p class="zz-ctx__warn">⚠ Sin personal — no produce</p>' : ''}`
          : `<p class="zz-muted">Estructura pasiva · ${escapeHtml(prodLine)}</p>
             ${
               def.housing
                 ? `<p class="zz-ctx__prod">Vivienda: <strong>${def.housing}</strong> plazas</p>`
                 : ''
             }`
      }
    </div>
  `);
  checkOnboardingProgress(state);
}

function openExplorerSheet(id) {
  const e = state.explorers.find((x) => x.id === id);
  if (!e) return;
  state.selectedExplorerId = id;
  const skills = ['explore', 'loot', 'fight', 'resist']
    .map((k) => {
      const v = e.skills?.[k] || 1;
      return `<div class="zz-skill-row"><span>${SKILL_LABEL[k]}</span><strong>${v}</strong></div>`;
    })
    .join('');
  const stLabel =
    e.status === 'ready' ? 'Disponible' : e.status === 'away' ? 'En ruta' : e.status === 'wounded' ? 'Herido' : 'Caído';
  const xp = Math.min(100, Math.round((e.xp || 0) % 100));
  const level = e.level || 1;
  const portrait = portraitArtUrl(e);
  openSheet(`
    <div class="zz-ctx">
      <div class="zz-explorer-hero">
        <img src="${portrait}" alt="" width="56" height="56" />
        <div>
          <h2 style="margin:0">${escapeHtml(e.name)}</h2>
          <p style="margin:0.15rem 0 0">Explorador · Nv.${level}</p>
          <div class="zz-xp-bar"><i style="width:${xp}%"></i></div>
        </div>
      </div>
      <div class="zz-skill-list">${skills}</div>
      <p>Estado: <strong>${stLabel}</strong></p>
      ${
        e.status === 'ready'
          ? `<button type="button" class="zz-btn zz-btn--primary zz-btn--wide" data-action="start-explore" data-id="${e.id}">Explorar el mapa</button>
             <p class="zz-muted" style="font-size:0.78rem;margin-top:0.35rem">O tocá directamente una zona en el mapa.</p>`
          : e.status === 'away'
            ? '<p class="zz-muted">Está fuera. Veréis su ruta en el mapa.</p>'
            : ''
      }
      <p><button type="button" class="zz-btn zz-btn--compact" data-action="rename-ex" data-id="${e.id}">Renombrar</button></p>
    </div>
  `);
  paint();
}

function openZoneSheet(zoneId) {
  // No competir con el brief diario
  const brief = $('zz-day-brief');
  if (brief && !brief.hidden) brief.hidden = true;
  const z = state.zones.find((x) => x.id === zoneId);
  if (!z || z.state === 'unknown') return;
  state.selectedZoneId = zoneId;

  if (z.type === 'camp' && state.uiMode !== 'explore') {
    openSheet(`
      <div class="zz-ctx">
        <div class="zz-ctx__head">
          <img class="zz-ctx__art" src="${buildingArtUrl('shelter')}" alt="" />
          <div>
            <h2>${escapeHtml(z.name)}</h2>
            <p>Tocá un edificio para gestionarlo. Construí para ampliar.</p>
          </div>
        </div>
        <button type="button" class="zz-btn zz-btn--primary zz-btn--wide" data-action="open-build-from-camp">Construir aquí</button>
      </div>
    `);
    paint();
    return;
  }

  const ex = state.explorers.find((e) => e.id === state.selectedExplorerId) || readyExplorers(state)[0];
  const preview = ex ? expeditionPreview(state, content, zoneId, ex.id) : null;
  const badge =
    z.state === 'controlled' ? 'Controlada' : z.state === 'hostile' ? 'Hostil' : 'Conocida';
  const art = zoneArtUrl(z) || buildingArtUrl('storage');
  const lootIcons = (preview?.lootHint || [])
    .slice(0, 4)
    .map((k) => {
      const key = String(k).toLowerCase();
      const res =
        key.includes('comida') || key.includes('food')
          ? 'food'
          : key.includes('agua') || key.includes('water')
            ? 'water'
            : key.includes('medi')
              ? 'medicine'
              : key.includes('madera') || key.includes('wood')
                ? 'wood'
                : key.includes('metal')
                  ? 'metal'
                  : key.includes('comb') || key.includes('fuel')
                    ? 'fuel'
                    : key.includes('muni') || key.includes('ammo')
                      ? 'ammo'
                      : null;
      return res ? `<img src="${artUrl(RES_ART[res])}" alt="${escapeHtml(k)}" title="${escapeHtml(k)}" />` : `<span>${escapeHtml(k)}</span>`;
    })
    .join('');

  openSheet(`
    <div class="zz-ctx">
      <div class="zz-ctx__head">
        <img class="zz-ctx__art" src="${art}" alt="" />
        <div>
          <h2>${escapeHtml(z.name)}</h2>
          <p>${badge} · Riesgo ${(z.risk * 100).toFixed(0)}%</p>
        </div>
      </div>
      ${
        preview
          ? `<div class="zz-ctx__stats">
               <div class="zz-ctx__stat"><span>Distancia</span><strong>${preview.distance} tramos</strong></div>
               <div class="zz-ctx__stat"><span>Tiempo</span><strong>${preview.days} día${preview.days === 1 ? '' : 's'}</strong></div>
               <div class="zz-ctx__stat"><span>Riesgo</span><strong>${escapeHtml(preview.category || 'medio')}</strong></div>
             </div>
             <div class="zz-ctx__loot">
               <span class="zz-muted">Botín posible</span>
               <div class="zz-loot-row">${lootIcons || '<span>¿?</span>'}</div>
             </div>
             <p class="zz-ctx__explorer">Explorador: <strong>${escapeHtml(preview.explorerName)}</strong> · nivel ${ex.level || 1}</p>
             <button type="button" class="zz-btn zz-btn--primary zz-btn--wide" data-action="send-exp" data-zone="${z.id}" ${
               ex.status !== 'ready' ? 'disabled' : ''
             }>Enviar explorador</button>`
          : '<p>No hay explorador disponible.</p>'
      }
    </div>
  `);
  paint();
}

function openBuildSheet() {
  const suggest = suggestedBuildType(state);
  const list = Object.values(content.buildings)
    .filter((b) => (b.minEra || 0) <= state.era)
    .filter((b) => {
      if (b.upgradeFrom) {
        return state.base.buildings.some((x) => x.type === b.upgradeFrom && x.hp > 0);
      }
      const count = state.base.buildings.filter((x) => x.type === b.id && x.hp > 0).length;
      return b.max == null || count < b.max;
    })
    .slice(0, 18)
    .map((b) => {
      const afford = canAfford(state, b.cost);
      const missing = Object.entries(b.cost || {})
        .filter(([k, v]) => (state.resources[k] || 0) < v)
        .map(([k, v]) => `${v} ${RES_LABEL_UI[k] || k}`)
        .join(', ');
      const reqTech = (b.requires || []).filter((t) => !(state.research.unlocked || []).includes(t));
      const reqBld = b.requiresBuilding && !state.base.buildings.some((x) => x.type === b.requiresBuilding && x.hp > 0);
      const locked = !afford || reqTech.length || reqBld || (state.population.labor?.build || 0) + (state.population.labor?.idle || 0) < 1;
      const cost = Object.entries(b.cost || {})
        .map(([k, v]) => `${v} ${RES_LABEL_UI[k] || k}`)
        .join(' · ');
      const jobs = b.jobs > 0 ? `${b.jobs} puesto${b.jobs > 1 ? 's' : ''}` : 'Pasivo';
      const benefit = b.produces
        ? Object.entries(b.produces)
            .map(([k, v]) => `+${v} ${RES_LABEL_UI[k] || k}/día a plena plantilla`)
            .join(' · ')
        : b.defense
          ? `+${b.defense} defensa`
          : b.housing
            ? `+${b.housing} capacidad`
            : b.desc || '';
      let lockReason = '';
      if (reqBld) lockReason = `Requiere ${content.buildings[b.requiresBuilding]?.name || b.requiresBuilding}`;
      else if (reqTech.length) lockReason = 'Falta investigación';
      else if (!afford) lockReason = `Falta: ${missing}`;
      else if ((state.population.labor?.build || 0) + (state.population.labor?.idle || 0) < 1)
        lockReason = 'Asignad gente a construcción';
      const guided = suggest && (b.id === suggest || b.id.startsWith(suggest));
      return `<button type="button" class="zz-build-card ${locked ? 'is-disabled' : ''} ${guided ? 'is-guide-suggest' : ''}" data-action="build-pick" data-build="${b.id}" ${
        locked ? 'disabled' : ''
      }>
        <img class="zz-build-card__thumb" src="${buildingArtUrl(b.id)}" alt="" width="48" height="48" />
        <span class="zz-build-card__body">
          <strong>${escapeHtml(b.name)}${guided ? ' · ahora' : ''}</strong>
          <span class="zz-build-row zz-build-row--cost"><i>Coste</i> ${cost || 'Gratis'}</span>
          <span class="zz-build-row zz-build-row--gain"><i>Beneficio</i> ${escapeHtml(String(benefit || '—').slice(0, 56))}</span>
          <span class="zz-build-row zz-build-row--jobs"><i>Trabajo</i> ${jobs}</span>
          ${lockReason ? `<span class="zz-build-lock">${escapeHtml(lockReason)}</span>` : '<span class="zz-build-go">Colocar →</span>'}
        </span>
      </button>`;
    })
    .join('');
  openSheet(`
    <h2>Construir</h2>
    <p class="zz-muted" style="font-size:0.82rem">Elegí un edificio → tocá dónde colocarlo en el refugio.</p>
    <div class="zz-build-grid">${list}</div>
  `);
}

function openSectorSheet(id) {
  ensureSectors(state);
  const sector = getSector(state, id);
  if (!sector) return;
  state.selectedSectorId = id;
  const cost = summarizeRecoveryCost(sector);
  const check = canStartRecovery(state, id);
  const adj = isAdjacentToRecovered(state, sector);
  const problems = (sector.components || [])
    .map((c) => `<li><strong>${escapeHtml(COMPONENT_LABEL[c.type] || c.type)}</strong>${
      c.days ? ` · ~${c.days}d` : ''
    }${c.wood ? ` · madera ${c.wood}` : ''}${c.metal ? ` · metal ${c.metal}` : ''}${
      c.labor ? ` · labor ${c.labor}` : ''
    }</li>`)
    .join('');

  let statusLine = '';
  if (sector.status === 'recovered') {
    statusLine = '<p class="zz-ctx__prod">Territorio de la colonia — podéis construir aquí.</p>';
  } else if (sector.status === 'recovering') {
    const left = sector.recover?.daysLeft ?? '?';
    statusLine = `<p class="zz-ctx__prod">Recuperación en curso · ${left} día(s) restante(s). Al terminar: éxito.</p>`;
  } else if (!adj) {
    statusLine = '<p class="zz-ctx__warn">Todavía no colinda con territorio recuperado.</p>';
  }

  const actionBtn =
    sector.status === 'locked' && adj
      ? `<button type="button" class="zz-btn zz-btn--primary zz-btn--wide" data-action="recover-sector" data-sector="${sector.id}" ${
          check.ok ? '' : 'disabled'
        }>Empezar recuperación${cost.days ? ` (~${cost.days}d)` : ''}</button>
         ${check.ok ? '' : `<p class="zz-ctx__warn">${escapeHtml(check.error || '')}</p>`}`
      : '';

  openSheet(`
    <div class="zz-ctx">
      <div class="zz-ctx__head" style="grid-template-columns:1fr">
        <div>
          <h2>${escapeHtml(sector.name)}</h2>
          <p>${escapeHtml(sector.identity || '')}</p>
        </div>
      </div>
      ${statusLine}
      ${
        problems
          ? `<p class="zz-muted" style="margin:0.35rem 0 0.15rem;font-size:0.78rem">Situación</p>
             <ul class="zz-sector-problems">${problems}</ul>`
          : '<p class="zz-muted">Núcleo ya asegurado.</p>'
      }
      ${
        sector.status !== 'recovered'
          ? `<p class="zz-ctx__prod" style="margin-top:0.5rem">Al recuperar: ${escapeHtml(sector.gain || 'Más suelo construible.')}</p>
             <p class="zz-muted" style="font-size:0.78rem">Esfuerzo total: ~${cost.days} día(s)${
                 cost.wood || cost.metal
                   ? ` · madera ${cost.wood || 0} · metal ${cost.metal || 0}`
                   : ''
               } · labor ≥${cost.labor}</p>`
          : ''
      }
      ${actionBtn}
    </div>
  `);
}

function openMoreSheet() {
  const slots = explorerSlotsUnlocked(state, content.balance);
  const living = livingExplorers(state).length;
  const branches = content.researchDoc?.branches || {};
  let techHtml = '';
  Object.entries(branches).forEach(([bid, br]) => {
    techHtml += `<h3 style="margin:0.75rem 0 0.35rem;font-family:var(--zz-display)">${escapeHtml(br.name || bid)}</h3>`;
    (br.techs || []).forEach((t) => {
      const done = (state.research.unlocked || []).includes(t.id);
      const active = state.research.active === t.id;
      const locked = (t.minEra || 0) > state.era || (t.requires || []).some((r) => !(state.research.unlocked || []).includes(r));
      techHtml += `<button type="button" class="zz-tech-card" data-action="research" data-tech="${t.id}" ${
        done || active || locked || state.research.active ? 'disabled' : ''
      }>
        <strong>${escapeHtml(t.name)}</strong>
        <span>${done ? 'Completada' : active ? `En curso ${state.research.progress}/${t.days || 3}` : locked ? 'Bloqueada' : escapeHtml(t.desc || '')}</span>
      </button>`;
    });
  });
  const vehs = (content.vehiclesDoc?.vehicles || [])
    .map((v) => {
      const owned = (state.vehiclesOwned || []).includes(v.id);
      return `<button type="button" class="zz-btn" data-action="buy-vehicle" data-veh="${v.id}" ${
        owned || (v.minEra || 0) > state.era ? 'disabled' : ''
      }>${escapeHtml(v.name)} ${owned ? '(ok)' : ''}</button>`;
    })
    .join(' ');

  openSheet(`
    <h2>Más</h2>
    <p>
      <button type="button" class="zz-btn zz-btn--primary zz-btn--wide" data-action="expand-mode">
        ${state.uiMode === 'expand' ? 'Salir de recuperación' : 'Recuperar territorio'}
      </button>
    </p>
    <p class="zz-muted" style="font-size:0.8rem;margin-top:0.35rem">
      Amplía la colonia sector a sector. Cada zona tiene su propia situación.
    </p>
    <p>Exploradores ${living}/${slots}.
      <button type="button" class="zz-btn zz-btn--compact" data-action="recruit-ex">Reclutar desde población</button>
    </p>
    <p class="zz-muted" style="font-size:0.8rem">${slotHint(slots, living)}</p>
    <h3 style="font-family:var(--zz-display)">Investigación</h3>
    <div class="zz-tech-list">${techHtml}</div>
    <h3 style="margin-top:0.75rem;font-family:var(--zz-display)">Vehículos</h3>
    <p>${vehs || 'Ninguno'}</p>
    <h3 style="margin-top:0.75rem;font-family:var(--zz-display)">Facciones</h3>
    <ul class="zz-factions">${(state.factions || [])
      .map(
        (f) =>
          `<li><strong>${escapeHtml(f.discovered ? f.name : '???')}</strong> <span class="zz-rel zz-rel--${f.relation}">${
            f.discovered ? f.relation : 'desconocida'
          }</span></li>`
      )
      .join('')}</ul>
    <p style="margin-top:0.75rem;color:var(--zz-muted);font-size:0.85rem">Diario: ${(state.log || [])
      .slice(0, 4)
      .map((e) => `D${e.day} ${escapeHtml(e.text)}`)
      .join(' · ')}</p>
  `);
}

function slotHint(slots, living) {
  const cfg = content.balance.explorers || {};
  if (living >= 3 || slots >= 3) return 'Máximo 3 exploradores. Son los únicos individuos.';
  if (slots < 2) {
    const s2 = cfg.slot2 || {};
    return `2ª plaza: población ≥${s2.minPop || 10}, zonas controladas ≥${s2.minControlled || 3}, era ≥${s2.minEra || 1}.`;
  }
  const s3 = cfg.slot3 || {};
  return `3ª plaza: población ≥${s3.minPop || 24}, zonas ≥${s3.minControlled || 5}, era ≥${s3.minEra || 2}.`;
}

function fmtRes(n) {
  const v = Math.round(Number(n) || 0);
  if (v >= 10000) return `${Math.round(v / 1000)}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(v);
}

function paintHud() {
  const pop = state.population;
  const cap = housingCapacity(state, content.buildings);
  if ($('zz-pop')) $('zz-pop').textContent = `${pop.total}/${cap}`;
  if ($('zz-day-label')) $('zz-day-label').textContent = `Día ${state.day}`;
  if ($('zz-colony')) $('zz-colony').textContent = state.colonyName || 'Refugio';
  if ($('zz-era')) {
    const eraName = content.erasDoc?.eras?.[state.era]?.name || `Era ${state.era}`;
    $('zz-era').textContent = eraName;
  }
  if ($('zz-stability')) $('zz-stability').textContent = String(Math.round(state.stability));
  const threat = Math.round(state.director?.threat || 0);
  const def = Math.round(defenseValue(state, content.buildings, content.balance));
  if ($('zz-threat')) {
    $('zz-threat').textContent = String(threat);
    $('zz-threat').title = `Amenaza: ${threat}`;
  }
  if ($('zz-defense')) {
    $('zz-defense').textContent = String(def);
    $('zz-defense').title = `Defensa: ${def}`;
  }
  const threatWrap = document.querySelector('.zz-hud__threat');
  if (threatWrap) {
    // Amenaza visible desde D6 o si ya es relevante
    threatWrap.hidden = (state.day || 1) < 6 && threat < 18;
  }
  document.body.dataset.weather = state.weather || 'clear';
  const w = $('zz-weather');
  if (w) {
    const labels = { clear: 'Despejado', rain: 'Lluvia', storm: 'Tormenta', cold: 'Frío', fog: 'Niebla', heat: 'Calor' };
    w.textContent = labels[state.weather] || state.weather;
    w.dataset.weather = state.weather || 'clear';
  }
  const res = $('zz-resources');
  if (res) {
    const day = state.day || 1;
    const guideOn = !!(state.flags?.onboardingActive && !state.flags?.onboardingDone);
    // D1: solo supervivencia. Madera/metal al construir o desde D2. Medicina cuando hace falta.
    let show = ['food', 'water'];
    if (day >= 2 || state.uiMode === 'build' || state.buildMode || !guideOn) {
      show = ['food', 'water', 'wood', 'metal'];
    }
    if (
      (state.explorers || []).some((e) => e.status === 'wounded' || (e.wounds || 0) > 0) ||
      day >= 4 ||
      (state.resources.medicine || 0) < 2
    ) {
      if (!show.includes('medicine') && day >= 3) show.push('medicine');
    }
    const popN = Math.max(1, pop.total || 1);
    res.innerHTML = '';
    show.forEach((k) => {
      const li = document.createElement('li');
      const val = state.resources[k] || 0;
      const daysLeft = k === 'food' || k === 'water' ? val / popN : Infinity;
      if (daysLeft < 2) li.classList.add('is-crit');
      else if (daysLeft < 4) li.classList.add('is-low');
      const label = RES_LABEL_UI[k] || k;
      li.title = `${label}: ${val}`;
      li.setAttribute('aria-label', `${label}: ${val}`);
      const row = document.createElement('span');
      row.className = 'zz-hud__res-row';
      const img = document.createElement('img');
      img.src = artUrl(RES_ART[k]) || '';
      img.alt = '';
      img.width = 14;
      img.height = 14;
      const strong = document.createElement('strong');
      strong.textContent = fmtRes(val);
      row.appendChild(img);
      row.appendChild(strong);
      const name = document.createElement('em');
      name.className = 'zz-hud__res-name';
      name.textContent = label;
      li.appendChild(row);
      li.appendChild(name);
      li.addEventListener('click', () => {
        toast(`${label}: ${val}`, 'info');
      });
      res.appendChild(li);
    });
  }
  const popBtn = $('zz-open-pop');
  if (popBtn) {
    popBtn.title = `Población ${pop.total} · Capacidad de vivienda ${cap}`;
    popBtn.setAttribute('aria-label', `Población ${pop.total} de ${cap} plazas de vivienda`);
  }
  const popLabel = $('zz-pop-label');
  if (popLabel) popLabel.textContent = 'hab.';
}

function paintExplorers() {
  const rail = $('zz-explorer-rail');
  if (!rail) return;
  rail.innerHTML = '';
  const slots = explorerSlotsUnlocked(state, content.balance);
  livingExplorers(state).forEach((e) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'zz-ex-card' +
      (state.selectedExplorerId === e.id ? ' is-selected' : '') +
      (e.status === 'away' ? ' is-away' : '') +
      (e.status === 'ready' ? ' is-ready' : '') +
      (e.status === 'dead' ? ' is-dead' : '');
    const img = document.createElement('img');
    img.className = 'zz-ex-portrait';
    img.src = portraitArtUrl(e);
    img.alt = '';
    img.width = 40;
    img.height = 40;
    btn.appendChild(img);
    const meta = document.createElement('div');
    meta.innerHTML = `<div class="zz-ex-card__name">${escapeHtml(e.name)}</div>
      <div class="zz-ex-card__st">${e.status === 'ready' ? 'Listo' : e.status === 'away' ? 'En ruta' : 'Herido'} · Nv.${e.level || 1}</div>`;
    btn.appendChild(meta);
    btn.addEventListener('click', () => {
      sfx.click?.();
      openExplorerSheet(e.id);
    });
    rail.appendChild(btn);
  });
  if (livingExplorers(state).length < slots) {
    const tip = document.createElement('button');
    tip.type = 'button';
    tip.className = 'zz-ex-card';
    tip.style.opacity = '0.7';
    tip.innerHTML = `<div></div><div><div class="zz-ex-card__name">Plaza libre</div><div class="zz-ex-card__st">Reclutar · ${livingExplorers(state).length}/${slots}</div></div>`;
    tip.addEventListener('click', () => {
      sfx.click?.();
      openMoreSheet();
    });
    rail.appendChild(tip);
  }
}

function focusBuildingCamera(id) {
  const b = state.base?.buildings?.find((x) => x.id === id && x.hp > 0);
  const camp = state.zones?.find((z) => z.type === 'camp');
  if (!b || !camp) return;
  const w = cellToWorld(state, camp, b.x, b.y);
  state.mapCamera = state.mapCamera || {};
  state.mapCamera.x = w.x;
  state.mapCamera.y = w.y;
  clampCamera(state);
}

function clientToWorld(ev) {
  const el = $('zz-map');
  if (!el) return null;
  const m = mapMetrics(el);
  const vb = cameraViewBox(state, m);
  const rect = el.getBoundingClientRect();
  return {
    x: vb.x + ((ev.clientX - rect.left) / Math.max(1, rect.width)) * vb.w,
    y: vb.y + ((ev.clientY - rect.top) / Math.max(1, rect.height)) * vb.h,
  };
}

function syncGhostValidity() {
  if (!state.buildMode || !state.buildGhost) {
    state.buildGhostValid = false;
    return;
  }
  state.buildGhostValid = ghostPlacementOk(
    state,
    content,
    state.buildMode,
    state.buildGhost.x,
    state.buildGhost.y
  ).ok;
}

function confirmBuildPlacement() {
  if (!state.buildMode || !state.buildGhost) {
    toast('Nada que construir', 'warn');
    return;
  }
  const type = state.buildMode;
  const { x, y } = state.buildGhost;
  const check = ghostPlacementOk(state, content, type, x, y);
  if (!check.ok) {
    toast(check.reason || 'Ubicación inválida', 'warn');
    paint();
    return;
  }
  const r = placeBuilding(state, content, type, x, y);
  if (!r.ok) {
    toast(r.error || 'No se pudo construir', 'warn');
    return;
  }
  sfx.build?.();
  toast(`${content.buildings[type]?.name || type} construido`, 'good');
  clearBuildMode(state);
  checkOnboardingProgress(state);
  scheduleSave();
  paint();
  const b = state.base.buildings.find((bl) => bl.x === x && bl.y === y && bl.type === type);
  if (b) openBuildingSheet(b.id);
}

function paintBuildDock() {
  const advance = $('zz-advance');
  const openBuild = $('zz-open-build');
  const ok = $('zz-build-ok');
  const cancel = $('zz-build-cancel');
  const building = state.uiMode === 'build' && state.buildMode;
  if (ok) ok.hidden = !building;
  if (cancel) cancel.hidden = !building;
  if (advance) advance.hidden = !!building;
  if (openBuild) openBuild.hidden = !!building;
  if (building && ok) {
    syncGhostValidity();
    ok.disabled = !state.buildGhostValid;
    ok.classList.toggle('is-disabled', !state.buildGhostValid);
  }
}

function handleGhostPointer(ev) {
  if (ev.type !== 'pointerdown' && arguments[1]?.phase !== 'down') {
    /* called from render with phase */
  }
  const camp = state.zones?.find((z) => z.type === 'camp');
  if (!camp || !state.buildMode) return;
  const wrap = document.querySelector('.zz-world-map-wrap');
  if (wrap) wrap.dataset.zzGhostDrag = '1';
  let lastPaint = 0;
  const move = (e) => {
    const w = clientToWorld(e);
    if (!w) return;
    snapGhostToWorld(state, camp, w.x, w.y);
    const now = performance.now();
    if (now - lastPaint > 50) {
      lastPaint = now;
      syncGhostValidity();
      paint();
    }
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    if (wrap) delete wrap.dataset.zzGhostDrag;
    syncGhostValidity();
    paint();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  move(ev);
}

function paint() {
  if (!state || !content) return;
  maybeRevealEarlyLandmarks(state);
  checkOnboardingProgress(state);
  syncLaborFromColony(state, content);
  if (state.uiMode === 'build' && state.buildMode) ensureBuildGhost(state);
  syncGhostValidity();
  paintHud();
  paintExplorers();
  paintObjective();
  paintCoach();
  paintModeBanner();
  paintBuildDock();
  const banner = $('zz-recover-banner');
  if (banner) {
    const recovering = state.day < (state.director?.protectionUntil || 0);
    banner.hidden = !recovering;
    if (recovering) {
      banner.textContent = `Recuperación · hasta día ${state.director.protectionUntil}`;
    }
  }
  const wrap = document.querySelector('.zz-world-map-wrap');
  if (wrap) {
    bindMapCamera(wrap, () => state, () => scheduleSave());
  }
  renderMap($('zz-map'), state, {
    onSelectZone: (id) => {
      if (wrap?.dataset.zzPanned) return;
      if (state.uiMode === 'expand' || state.uiMode === 'build') return;
      sfx.click?.();
      openZoneSheet(id);
    },
    onSelectBuilding: (id) => {
      if (wrap?.dataset.zzPanned) return;
      if (state.uiMode === 'expand' || state.uiMode === 'build') return;
      sfx.click?.();
      openBuildingSheet(id);
    },
    onSelectSector: (id) => {
      if (wrap?.dataset.zzPanned) return;
      sfx.click?.();
      openSectorSheet(id);
      paint();
    },
    onGhostPointer: (ev) => {
      handleGhostPointer(ev);
    },
  });
  renderChoiceModal();
  const defeat = $('zz-defeat');
  if (defeat) {
    defeat.hidden = !state.flags.defeated;
    if (state.flags.defeated && $('zz-defeat-msg')) $('zz-defeat-msg').textContent = state.flags.defeatReason || '';
  }
  const victory = $('zz-victory');
  if (victory) victory.hidden = !(state.flags.victory && !state.flags.endless);
}

function paintObjective() {
  const btn = $('zz-mission');
  const text = $('zz-mission-text');
  if (!btn || !text) return;
  // Durante la guía y el bloque D1–D5 no competir con coach/brief
  if (state.flags?.onboardingActive && !state.flags?.onboardingDone) {
    btn.hidden = true;
    return;
  }
  if ((state.day || 1) <= 5) {
    btn.hidden = true;
    return;
  }
  const obj = currentObjective(state, content);
  if (!obj || state.flags?.objectivesOff) {
    btn.hidden = true;
    return;
  }
  btn.hidden = false;
  text.textContent = obj.text;
  btn.dataset.objId = obj.id || '';
}

function overlayBlocksGuide() {
  const choice = $('zz-choice-modal');
  const brief = $('zz-day-brief');
  const event = $('zz-event-card');
  const attack = $('zz-attack-card');
  return (
    (choice && !choice.hidden) ||
    (brief && !brief.hidden) ||
    (event && !event.hidden) ||
    (attack && !attack.hidden) ||
    !!state.pendingChoice
  );
}

function paintCoach() {
  const card = $('zz-coach');
  const text = $('zz-coach-text');
  const cta = $('zz-coach-next');
  const buildBtn = $('zz-open-build');
  const advanceBtn = $('zz-advance');
  const confirmBtn = $('zz-build-ok');
  if (buildBtn) buildBtn.classList.remove('is-guide-pulse');
  if (advanceBtn) advanceBtn.classList.remove('is-guide-pulse');
  if (confirmBtn) confirmBtn.classList.remove('is-guide-pulse');
  if (!card || !text) return;
  ensureOnboarding(state);
  checkOnboardingProgress(state);
  if (overlayBlocksGuide()) {
    card.hidden = true;
    return;
  }
  const st = onboardingStatus(state);
  if (!st) {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  card.classList.add('zz-coach-card--tip');
  text.textContent = coachMessage(state) || st.step.text;
  if (st.step.highlight === 'build' && !state.buildMode) {
    buildBtn?.classList.add('is-guide-pulse');
  }
  if (state.buildMode && (st.step.wait === 'hasFarm' || st.step.wait === 'hasWell')) {
    confirmBtn?.classList.add('is-guide-pulse');
  }
  if (st.step.highlight === 'advance') {
    advanceBtn?.classList.add('is-guide-pulse');
  }
  // Sin cascada Continuar: solo CTA de acción (abrir Construir).
  if (cta) {
    if (st.step.highlight === 'build' && !state.buildMode) {
      cta.hidden = false;
      cta.textContent = 'Construir';
    } else {
      cta.hidden = true;
    }
  }
}

function showDayBrief(brief) {
  const el = $('zz-day-brief');
  if (!el || !brief) return;
  const food = brief.food || {};
  const water = brief.water || {};
  const facts = brief.facts || [];
  const fmt = (n) => {
    const v = Math.round((Number(n) || 0) * 10) / 10;
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  };
  const balClass = (n) => ((n || 0) >= 0 ? 'is-pos' : 'is-neg');
  const factLis = facts.map((f) => `<li class="zz-brief-fact zz-brief-fact--${escapeHtml(f.kind || '')}">${escapeHtml(f.text)}</li>`).join('');
  el.innerHTML = `
    <h3>Día ${brief.day || state.day}</h3>
    <div class="zz-brief-balance">
      <div class="zz-brief-row">
        <span class="zz-brief-label">Comida</span>
        <span>+${fmt(food.produced)}</span>
        <span>−${fmt(food.consumed)}</span>
        <strong class="${balClass(food.balance)}">${(food.balance || 0) >= 0 ? '+' : ''}${fmt(food.balance)}</strong>
      </div>
      <div class="zz-brief-row">
        <span class="zz-brief-label">Agua</span>
        <span>+${fmt(water.produced)}</span>
        <span>−${fmt(water.consumed)}</span>
        <strong class="${balClass(water.balance)}">${(water.balance || 0) >= 0 ? '+' : ''}${fmt(water.balance)}</strong>
      </div>
    </div>
    ${factLis ? `<ul class="zz-brief-facts">${factLis}</ul>` : '<p class="zz-muted zz-brief-quiet">Un día tranquilo en el refugio.</p>'}
    <button type="button" class="zz-btn zz-btn--primary zz-btn--wide" id="zz-brief-ok">Continuar</button>
  `;
  el.hidden = false;
  // Ocultar guía mientras el brief está abierto
  const coach = $('zz-coach');
  if (coach) coach.hidden = true;
  $('zz-brief-ok')?.addEventListener('click', () => {
    el.hidden = true;
    paint();
  });
  clearTimeout(showDayBrief._t);
  // No auto-cerrar demasiado rápido: el brief es ritual
  showDayBrief._t = setTimeout(() => {
    if (!el.hidden) {
      /* dejar al jugador; no forzar */
    }
  }, 20000);
}

function paintModeBanner() {
  const el = $('zz-mode-banner');
  if (!el) return;
  if (state.uiMode === 'build' && state.buildMode) {
    el.hidden = false;
    const name = content.buildings[state.buildMode]?.name || 'edificio';
    const hint = state.buildGhostValid
      ? 'posición válida'
      : 'posición no válida · arrastrá el fantasma';
    el.innerHTML = `Colocá <strong>${escapeHtml(name)}</strong> · ${hint} · arrastrá el fantasma · <button type="button" class="zz-linkish" data-cancel-build>✕ Cancelar</button>`;
    el.querySelector('[data-cancel-build]')?.addEventListener('click', () => {
      clearBuildMode(state);
      paint();
    });
  } else if (state.uiMode === 'explore') {
    el.hidden = false;
    el.textContent = 'Tocá una zona del mapa para explorar';
  } else if (state.uiMode === 'expand') {
    el.hidden = false;
    el.innerHTML =
      'Recuperar territorio · tocá una zona colindante · <button type="button" class="zz-linkish" data-cancel-expand>Listo</button>';
    el.querySelector('[data-cancel-expand]')?.addEventListener('click', () => {
      state.uiMode = null;
      state.selectedSectorId = null;
      paint();
    });
  } else {
    el.hidden = true;
  }
}

function showAttackCard(atk) {
  const card = $('zz-attack-card');
  if (!card || !atk) return;
  const result = atk.result || atk;
  const labels = {
    win: 'Ataque repelido',
    messy: 'Ataque contenido',
    lose: 'El perímetro cede',
  };
  card.className = `zz-attack-card zz-attack-card--${result}`;
  card.innerHTML = `<strong>${labels[result] || 'Ataque'}</strong>
    <p>Intensidad ${atk.intensity ?? '—'} · Muertos ${atk.dead ?? 0} · Heridos ${atk.injured ?? 0}</p>
    <p class="zz-event-fx">${
      result === 'lose'
        ? 'Periodo de recuperación activo. Priorizad comida y defensa.'
        : result === 'messy'
          ? 'Habéis aguantado. Revisad heridos y munición.'
          : 'La defensa ha funcionado.'
    }</p>`;
  card.hidden = false;
  clearTimeout(showAttackCard._t);
  showAttackCard._t = setTimeout(() => {
    card.hidden = true;
  }, 4800);
}

function showEventCard(ev) {
  const family = ev.family || 'scout';
  if (family === 'calma' && (ev.intensity == null || ev.intensity <= 0)) return;
  if (/rutinari|en calma/i.test(ev.name || '')) return;
  const card = $('zz-event-card');
  if (!card) return;
  card.className = `zz-event-card zz-event--${family}`;
  card.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'zz-event-card__head';
  try {
    head.appendChild(familyIcon(family, 20));
  } catch {
    /* ignore */
  }
  const title = document.createElement('strong');
  title.textContent = ev.name || 'Suceso';
  head.appendChild(title);
  const p = document.createElement('p');
  p.textContent = ev.brief || ev.name;
  card.appendChild(head);
  card.appendChild(p);
  card.hidden = false;
  clearTimeout(eventCardTimer);
  eventCardTimer = setTimeout(() => {
    card.hidden = true;
  }, 4200);
}

function ensureChoiceModal() {
  return $('zz-choice-modal');
}

function renderChoiceModal() {
  const modal = ensureChoiceModal();
  if (!modal) return;
  const pending = state.pendingChoice;
  if (!pending || state.flags.defeated) {
    modal.hidden = true;
    return;
  }
  modal.hidden = false;
  $('zz-choice-title').textContent = pending.title || pending.name || 'Decisión';
  $('zz-choice-text').textContent = pending.text || pending.prompt || '';
  const actions = $('zz-choice-actions');
  actions.innerHTML = '';
  (pending.choices || pending.options || []).forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'zz-btn zz-btn--primary';
    btn.textContent = opt.label || opt.text || `Opción ${i + 1}`;
    btn.addEventListener('click', () => {
      const r = resolvePendingChoice(state, content, i);
      if (r.ok && r.attackIntensity) {
        const atk = resolveBaseAttack(state, content, r.attackIntensity, { wasProtected: false });
        showAttackCard(atk);
        sfx.attack?.();
      }
      if (r.ok && r.event) {
        showEventCard({
          name: r.event.name,
          family: r.event.family,
          intensity: r.event.intensity,
          brief: pending.text,
        });
      }
      scheduleSave();
      paint();
    });
    actions.appendChild(btn);
  });
}

function handleAdvanceDay() {
  if (state.pendingChoice) {
    toast('Resolved la decisión pendiente', 'warn');
    return;
  }
  if (state.uiMode === 'build' || state.uiMode === 'explore') {
    state.uiMode = null;
    state.buildMode = null;
  }
  const r = advanceDay(state, content);
  if (!r.ok) {
    toast(r.error || 'No', 'warn');
    return;
  }
  markGuideDayAdvanced(state);
  maybeRevealEarlyLandmarks(state);
  checkOnboardingProgress(state);
  // Durante guía temprana, no apilar eventos encima del brief
  const guideOn = state.flags?.onboardingActive && !state.flags?.onboardingDone;
  if (!guideOn) {
    if (r.director?.event && !r.director.choice && !state.pendingChoice) {
      const ev = r.director.event;
      const brief = r.director.variant?.text || (ev.variants && ev.variants[0]?.text) || ev.name;
      showEventCard({
        name: ev.name,
        family: ev.family,
        intensity: ev.intensity,
        brief,
      });
    }
    if (r.attack) {
      showAttackCard(r.attack);
      sfx.attack?.();
    }
  }
  if (r.brief) showDayBrief(r.brief);
  sfx.click?.();
  scheduleSave();
  paint();
}

function runGuideAction(action) {
  if (action === 'openBuild') {
    openBuildSheet();
    return;
  }
  if (action === 'advanceDay') {
    handleAdvanceDay();
    return;
  }
  if (action === 'focusMarket') {
    const z =
      state.zones.find((x) => x.id === 'market' || x.type === 'supermarket') ||
      state.zones.find((x) => x.state === 'discovered' && x.type !== 'camp');
    if (z) {
      if (z.state === 'unknown') z.state = 'discovered';
      state.selectedZoneId = z.id;
      state.mapCamera = state.mapCamera || {};
      state.mapCamera.x = (z.x + (state.zones.find((c) => c.type === 'camp')?.x || z.x)) / 2;
      state.mapCamera.y = (z.y + (state.zones.find((c) => c.type === 'camp')?.y || z.y)) / 2;
      state.mapCamera.zoom = 1.35;
      clampCamera(state);
      openZoneSheet(z.id);
    }
    paint();
  }
}

function bindChrome() {
  if (chromeBound) return;
  chromeBound = true;
  $('zz-advance')?.addEventListener('click', handleAdvanceDay);
  $('zz-save')?.addEventListener('click', () => doSave());
  $('zz-sound')?.addEventListener('click', () => {
    const on = !isSoundEnabled();
    setSoundEnabled(on);
    $('zz-sound').classList.toggle('is-off', !on);
    $('zz-sound').setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  $('zz-open-pop')?.addEventListener('click', () => {
    sfx.click?.();
    openPopulationSheet();
  });
  $('zz-open-build')?.addEventListener('click', () => {
    sfx.click?.();
    openBuildSheet();
  });
  $('zz-build-ok')?.addEventListener('click', () => {
    sfx.click?.();
    confirmBuildPlacement();
  });
  $('zz-build-cancel')?.addEventListener('click', () => {
    sfx.click?.();
    clearBuildMode(state);
    toast('Construcción cancelada', 'info');
    paint();
  });
  $('zz-open-more')?.addEventListener('click', () => {
    sfx.click?.();
    openMoreSheet();
  });
  $('zz-sheet-close')?.addEventListener('click', closeSheet);
  $('zz-mission')?.addEventListener('click', () => {
    const obj = currentObjective(state, content);
    if (!obj) return;
    openSheet(`
      <div class="zz-ctx">
        <h2>${escapeHtml(obj.title || 'Objetivo')}</h2>
        <p>${escapeHtml(obj.text)}</p>
        <button type="button" class="zz-btn zz-btn--ghost zz-btn--wide" id="zz-objective-dismiss">Ocultar objetivo</button>
      </div>
    `);
    $('zz-objective-dismiss')?.addEventListener('click', () => {
      state.flags.objectivesOff = true;
      closeSheet();
      paint();
    });
  });
  $('zz-coach-next')?.addEventListener('click', () => {
    const result = advanceOnboarding(state);
    if (result?.kind === 'action') {
      runGuideAction(result.action);
      return;
    }
    paint();
  });
  $('zz-recenter')?.addEventListener('click', () => {
    recenterCamera(state);
    paint();
    scheduleSave();
  });
  $('zz-help')?.addEventListener('click', () => {
    const day = state.day || 1;
    const explored = !!state.flags?.guideExplored || day >= 3;
    const staffed = (state.base?.buildings || []).some((b) => (b.workers || 0) > 0);
    const lines = [
      '<li><strong>Construir</strong> — elegís tipo; aparecen superficies edificables (áreas recuperadas, no solares fijos). Movéis el fantasma, el snap es invisible, confirmáis con ✓ o canceláis con ✕.</li>',
      '<li><strong>Avanzar día</strong> — produce, consume y resuelve el día.</li>',
      '<li><strong>Pan / zoom / recentrar</strong> — el mundo es mayor que la pantalla (landscape).</li>',
      '<li><strong>Recuperar territorio</strong> — en Más: ampliá sectores colindantes cuando toque; luego podréis construir en sus superficies.</li>',
    ];
    if (staffed || state.flags?.onboardingDone) {
      lines.push('<li><strong>Tocar un edificio</strong> — asigna trabajadores.</li>');
    }
    if (explored) {
      lines.push('<li><strong>Tocar un lugar</strong> — envía exploradores.</li>');
    }
    lines.push('<li><strong>Comida / agua / madera</strong> — lo que veis en la barra superior.</li>');
    openSheet(`
      <div class="zz-ctx">
        <h2>Ayuda</h2>
        <p class="zz-muted" style="font-size:0.82rem">Solo lo que ya podéis usar.</p>
        <ul class="zz-help-list">${lines.join('')}</ul>
      </div>
    `);
  });
  $('zz-map')?.addEventListener('click', (ev) => {
    if (ev.target === $('zz-map') || ev.target.classList?.contains('zz-map-bg')) {
      if (state.uiMode === 'build' || state.uiMode === 'explore') return;
      closeSheet();
      state.selectedZoneId = null;
      state.selectedBuildingId = null;
      paint();
    }
  });
  $('zz-objective-dismiss')?.addEventListener('click', () => {
    state.flags.objectivesOff = true;
    paint();
  });
  // zoom buttons (ZZ-011)
  $('zz-zoom-in')?.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (!state.mapCamera) return;
    zoomCameraBy(state, 1.12);
    paint();
    scheduleSave();
  });
  $('zz-zoom-out')?.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (!state.mapCamera) return;
    zoomCameraBy(state, 1 / 1.12);
    paint();
    scheduleSave();
  });
  $('zz-endless')?.addEventListener('click', () => {
    continueEndless(state);
    paint();
  });
  if ($('zz-sound')) {
    $('zz-sound').classList.toggle('is-off', !isSoundEnabled());
  }
}

export async function bootGame(opts) {
  const boot = $('zz-boot');
  const app = $('zz-app');
  try {
    content = await loadContent();
  } catch (e) {
    throw new Error('No se pudo cargar content/ (JSON).');
  }
  initSound();

  if (opts.mode === 'new') {
    if (opts.clearExisting) {
      await api.clearGame().catch(() => {});
    }
    state = createNewState(content, opts.name || 'Refugio 0');
    if (opts.fromIntro) {
      markIntroSeen(state);
    }
    const saved = await api.saveGame(state, state.colonyName, summarizeState(state));
    if (!saved.ok) throw new Error(saved.error || 'save_failed');
    dirty = false;
  } else {
    const res = await api.loadGame();
    if (!res.ok) throw new Error(res.error || 'load');
    state = migrateState(res.state, content);
    if (res.recoveredFromBackup) {
      const banner = $('zz-recover-banner');
      if (banner) {
        banner.hidden = false;
        banner.textContent = res.message || 'Recuperamos tu colonia desde una copia de seguridad.';
        setTimeout(() => {
          banner.hidden = true;
        }, 6000);
      }
      toast(res.message || 'Colonia recuperada', 'warn');
    }
  }

  bindChrome();
  startAutosaveLoop();
  initOrientationGate();
  ensureOnboarding(state);
  if (!state.selectedExplorerId) {
    state.selectedExplorerId = livingExplorers(state)[0]?.id || null;
  }
  state.selectedZoneId = null;
  state.selectedBuildingId = null;
  recenterCamera(state);
  paint();
  if (app) app.hidden = false;
  if (boot) boot.hidden = true;
  if (opts.fromIntro) {
    applyIntroArrival();
  }

  window.__zz = {
    getState: () => state,
    getContent: () => content,
    paint,
    clampCam: () => clampCamera(state),
    zoomBy: (f) => {
      zoomCameraBy(state, f);
      paint();
    },
    panBy: (dx, dy) => {
      panCameraBy(state, dx, dy);
      paint();
    },
    place: (type, x, y) => {
      const r = placeBuilding(state, content, type, x, y);
      if (r.ok) {
        checkOnboardingProgress(state);
        paint();
      }
      return r;
    },
    startBuild: (type) => {
      state.buildMode = type;
      state.uiMode = 'build';
      state.buildGhost = null;
      ensureBuildGhost(state);
      syncGhostValidity();
      paint();
      return state.buildGhost;
    },
    setGhost: (x, y) => {
      setBuildGhostCell(state, x, y);
      syncGhostValidity();
      paint();
      return { ghost: state.buildGhost, valid: state.buildGhostValid };
    },
    confirmBuild: () => {
      confirmBuildPlacement();
      return { ok: !state.buildMode };
    },
    cancelBuild: () => {
      clearBuildMode(state);
      paint();
    },
    freeCells: () => freeBuildableCells(state),
    focusBuilding: (id) => {
      focusBuildingCamera(id);
      paint();
    },
    adjustWorkers: (buildingId, delta) => {
      const r = adjustBuildingWorkers(state, content, buildingId, delta);
      if (r.ok) {
        checkOnboardingProgress(state);
        paint();
      }
      return r;
    },
    sendExpedition: (zoneId, explorerId) => {
      const r = startExpedition(state, content, zoneId, explorerId);
      if (r.ok) {
        markGuideExplored(state);
        checkOnboardingProgress(state);
        paint();
      }
      return r;
    },
    recenter: () => {
      recenterCamera(state);
      paint();
    },
    selectBuilding: (id) => {
      openBuildingSheet(id);
      paint();
    },
    selectSector: (id) => {
      openSectorSheet(id);
      paint();
    },
    setExpandMode: (on) => {
      state.uiMode = on ? 'expand' : null;
      if (!on) state.selectedSectorId = null;
      paint();
    },
    startRecovery: (id) => {
      const r = startSectorRecovery(state, id);
      if (r.ok) paint();
      return r;
    },
    refreshOrientation: () => refreshOrientationGate(),
    isPortraitBlocked: () => isGameplayPortraitBlocked(),
  };
}

export async function bootHub(opts = {}) {
  const boot = $('zz-hub-boot');
  const hub = $('zz-hub');
  if (boot) boot.textContent = 'Cargando…';
  try {
    if (opts.demoContinue) {
      await api.clearGame().catch(() => {});
      content = await loadContent();
      const st = createNewState(content, 'Refugio Norte');
      st.day = 4;
      await api.saveGame(st, 'Refugio Norte', 'Día 4 · 3 vivos');
    } else if (opts.demoEmpty) {
      await api.clearGame().catch(() => {});
    }

    const data = await api.fetchSaveStatus();
    if (!data.ok) throw new Error(data.error || 'status');
    const userEl = $('zz-user');
    if (userEl) userEl.textContent = data.user?.nombre || 'Jugador';

    const save = data.save && data.save.empty !== true ? data.save : null;
    const hasSave = !!save;
    const actions = $('zz-hub-actions');
    if (!actions) return;
    const hubRoot = hub || document.body;
    const playUrl = opts.playUrl || 'play.php';
    const beginNew = () =>
      startNewGameFlow(hubRoot, {
        hasSave,
        playUrl,
        colonyName: DEFAULT_COLONY_NAME,
        assetBase: opts.assetBase || 'assets/art/intro/',
      });

    actions.innerHTML = '';
    if (hasSave) {
      const cont = document.createElement('a');
      cont.className = 'zz-btn zz-btn--primary zz-btn--hero';
      cont.href = opts.playUrl
        ? `${String(opts.playUrl).split(/[?#]/)[0]}#load=1`
        : 'play.php';
      cont.textContent = 'Continuar';
      actions.appendChild(cont);

      const meta = document.createElement('p');
      meta.className = 'zz-hub__save-meta';
      meta.textContent = [save.title, save.summary || `Día ${save.day || 1}`].filter(Boolean).join(' · ');
      actions.appendChild(meta);

      const neu = document.createElement('button');
      neu.type = 'button';
      neu.className = 'zz-btn zz-btn--ghost';
      neu.textContent = 'Nueva partida';
      neu.addEventListener('click', beginNew);
      actions.appendChild(neu);
    } else {
      const neu = document.createElement('button');
      neu.type = 'button';
      neu.className = 'zz-btn zz-btn--primary zz-btn--hero';
      neu.textContent = 'Nueva partida';
      neu.addEventListener('click', beginNew);
      actions.appendChild(neu);
    }

    if (boot) boot.hidden = true;
    if (hub) hub.hidden = false;
  } catch (e) {
    if (boot) {
      boot.hidden = false;
      boot.innerHTML =
        '<p><strong>Error al iniciar</strong></p><p>' +
        escapeHtml(e.message || e) +
        '</p><button type="button" class="zz-btn zz-btn--primary" onclick="location.reload()">Reintentar</button>';
    }
    throw e;
  }
}
