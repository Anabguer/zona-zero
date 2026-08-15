/**
 * Zona Zero 1.2 — UI mundo continuo (población colectiva + exploradores)
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
import { renderMap, bindMapCamera } from './render-map.js';
import {
  readyExplorers,
  livingExplorers,
  renameExplorer,
  recruitExplorer,
  explorerSlotsUnlocked,
} from './explorers.js';
import { workforce } from './population.js';
import {
  currentObjective,
  laborKeyForBuilding,
  productionPreview,
  buildingWorkerCap,
} from './colony.js';
import { RES_ICONS, renderPortraitSvg, buildingThumb, familyIcon } from './icons.js';
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
let slot = 1;
let dirty = false;
let chromeBound = false;
let eventCardTimer = 0;
let saveTimer = 0;

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
    const r = await api.saveSlot(slot, state, state.colonyName, summarizeState(state));
    if (!r.ok) throw new Error(r.error || 'save');
    dirty = false;
    if ($('zz-save-state')) $('zz-save-state').textContent = 'Guardado';
  } catch (e) {
    if ($('zz-save-state')) $('zz-save-state').textContent = 'Error al guardar';
    toast('No se pudo guardar', 'bad');
  }
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
      toast(`${r.preview.explorerName} en ruta`, 'good');
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
    // Centrar cámara en el refugio
    const camp = state.zones.find((z) => z.type === 'camp');
    if (camp && state.mapCamera) {
      state.mapCamera.x = camp.x;
      state.mapCamera.y = camp.y;
      state.mapCamera.zoom = Math.max(state.mapCamera.zoom || 1, 1.6);
    }
    closeSheet();
    toast(`Colocad ${def?.name || type} en una parcela libre del refugio`, 'info');
    paint();
    return;
  }
  if (action === 'cancel-build') {
    state.buildMode = null;
    state.uiMode = null;
    toast('Construcción cancelada', 'info');
    paint();
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

function openPopulationSheet() {
  syncLaborFromColony(state, content);
  const pop = state.population;
  const cap = housingCapacity(state, content.buildings);
  const labor = pop.labor || {};
  const rows = ['idle', 'food', 'water', 'build', 'produce', 'defense', 'medicine']
    .map((k) => {
      const steppers =
        k === 'idle'
          ? `<span class="zz-labor-val">${labor[k] || 0}</span>`
          : `<div class="zz-stepper">
              <button type="button" data-labor="${k}" data-delta="-1" aria-label="Menos">−</button>
              <span>${labor[k] || 0}</span>
              <button type="button" data-labor="${k}" data-delta="1" aria-label="Más">+</button>
            </div>`;
      return `<div class="zz-labor-row"><div><strong>${LABOR_LABEL[k]}</strong></div>${steppers}</div>`;
    })
    .join('');
  openSheet(`
    <h2>Población ${pop.total} / ${cap}</h2>
    <p>Disponibles: <strong>${labor.idle || 0}</strong> · Heridos ${pop.injured || 0} · Enfermos ${pop.sick || 0}</p>
    <p class="zz-muted" style="font-size:0.8rem">Asignación numérica. Comida/agua/producción van a edificios con puestos.</p>
    ${rows}
    <p style="margin-top:0.75rem"><button type="button" class="zz-btn" data-action="auto-labor">Redistribuir automático</button></p>
  `);
}

function openBuildingSheet(id) {
  const b = state.base.buildings.find((x) => x.id === id && x.hp > 0);
  if (!b) return;
  state.selectedBuildingId = id;
  const def = content.buildings[b.type];
  if (!def) return;
  const key = laborKeyForBuilding(def);
  const cap = buildingWorkerCap(def);
  const workers = b.workers || 0;
  const prev = productionPreview(def, workers)
    .map((p) => `${p.amount} ${RES_LABEL_UI[p.key] || p.key}/día`)
    .join(' · ');
  const scaleHint = [0, 1, Math.min(2, cap), cap]
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((n) => {
      const bits = productionPreview(def, n)
        .map((p) => `${p.amount} ${RES_LABEL_UI[p.key] || p.key}`)
        .join(', ');
      return `${n} → ${bits || '0'}`;
    })
    .join('<br/>');

  openSheet(`
    <div class="zz-build-card__art" data-thumb="${b.type}"></div>
    <h2>${escapeHtml(def.name)}</h2>
    <p>${escapeHtml(def.desc || '')}</p>
    ${
      key
        ? `<p><strong>Trabajadores: ${workers} / ${cap}</strong></p>
           <div class="zz-stepper zz-stepper--lg">
             <button type="button" data-bworkers="${b.id}" data-delta="-1">−</button>
             <span>TRABAJADORES</span>
             <button type="button" data-bworkers="${b.id}" data-delta="1">+</button>
           </div>
           <p class="zz-muted" style="margin-top:0.5rem;font-size:0.82rem">Producción ahora: ${prev || 'ninguna'}</p>
           <p class="zz-prod-scale">${scaleHint}</p>`
        : '<p class="zz-muted">Sin puestos de trabajo (estructura pasiva).</p>'
    }
  `);
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
  openSheet(`
    <h2>${escapeHtml(e.name)}</h2>
    <p>Explorador · Nv.${e.level || 1}</p>
    <div class="zz-skill-list">${skills}</div>
    <p>Estado: <strong>${stLabel}</strong></p>
    ${
      e.status === 'ready'
        ? `<button type="button" class="zz-btn zz-btn--primary zz-btn--wide" data-action="start-explore" data-id="${e.id}">Mandar a explorar</button>`
        : e.status === 'away'
          ? '<p class="zz-muted">Está fuera. Veréis su marcador en el mapa.</p>'
          : ''
    }
    <p style="margin-top:0.5rem">
      <button type="button" class="zz-btn zz-btn--compact" data-action="rename-ex" data-id="${e.id}">Renombrar</button>
    </p>
  `);
  paint();
}

function openZoneSheet(zoneId) {
  const z = state.zones.find((x) => x.id === zoneId);
  if (!z || z.state === 'unknown') return;
  state.selectedZoneId = zoneId;

  if (z.type === 'camp' && state.uiMode !== 'explore') {
    openSheet(`
      <h2>${escapeHtml(z.name)}</h2>
      <p>Vuestro refugio. Tocad un edificio para asignar trabajadores, o Construir para ampliar.</p>
      <button type="button" class="zz-btn zz-btn--primary zz-btn--wide" data-action="open-build-from-camp">Construir aquí</button>
    `);
    // bind open-build via action
    paint();
    return;
  }

  const ex = state.explorers.find((e) => e.id === state.selectedExplorerId) || readyExplorers(state)[0];
  const preview = ex ? expeditionPreview(state, content, zoneId, ex.id) : null;
  const badge =
    z.state === 'controlled' ? 'Control' : z.state === 'hostile' ? 'Hostil' : 'Conocido';
  const ctrlPct = Math.round((z.controlProgress || 0) * 100);
  const exploring = state.uiMode === 'explore';
  openSheet(`
    <h2>${escapeHtml(z.name)}</h2>
    <p><span class="zz-zone-badge zz-zone-badge--${z.state}">${badge}</span>
      Riesgo base ${(z.risk * 100).toFixed(0)}% · Infectados ~${z.infectedLeft || 0}
      ${z.state !== 'controlled' ? ` · Control ${ctrlPct}%` : ''}</p>
    ${
      preview
        ? `<p>Distancia <strong>${preview.distance}</strong> · Tiempo <strong>${preview.days} día(s)</strong></p>
           <p>Riesgo <strong>${preview.category}</strong> (${Math.round(preview.risk * 100)}%)</p>
           <p>Posible botín: ${(preview.lootHint || []).join(', ') || 'incierto'}</p>
           <p>Explorador: <strong>${escapeHtml(preview.explorerName)}</strong></p>
           <button type="button" class="zz-btn zz-btn--primary zz-btn--wide" data-action="send-exp" data-zone="${z.id}" ${
            ex.status !== 'ready' ? 'disabled' : ''
          }>Enviar a ${escapeHtml(ex.name)}</button>
           ${exploring ? '<p style="margin-top:0.4rem"><button type="button" class="zz-btn" data-action="cancel-explore">Cancelar selección</button></p>' : ''}`
        : '<p>No hay explorador disponible.</p>'
    }
  `);
  paint();
}

function openBuildSheet() {
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
      const jobs = b.jobs > 0 ? `Trabajadores 0–${b.jobs}` : 'Sin puestos';
      let lockReason = '';
      if (reqBld) lockReason = `Requiere ${content.buildings[b.requiresBuilding]?.name || b.requiresBuilding}`;
      else if (reqTech.length) lockReason = 'Falta investigación';
      else if (!afford) lockReason = `Falta: ${missing}`;
      else if ((state.population.labor?.build || 0) + (state.population.labor?.idle || 0) < 1)
        lockReason = 'Asignad gente a construcción';
      return `<button type="button" class="zz-build-card ${locked ? 'is-disabled' : ''}" data-action="build-pick" data-build="${b.id}" ${
        locked ? 'disabled' : ''
      }>
        <span class="zz-build-card__art" data-thumb="${b.id}"></span>
        <span class="zz-build-card__body">
          <strong>${escapeHtml(b.name)}</strong>
          <em>${escapeHtml(b.desc || '')}</em>
          <span class="zz-build-card__meta">${jobs}</span>
          <span class="zz-build-cost">${cost || 'Gratis'}</span>
          ${lockReason ? `<span class="zz-build-lock">${escapeHtml(lockReason)}</span>` : '<span class="zz-build-go">Construir</span>'}
        </span>
      </button>`;
    })
    .join('');
  openSheet(`
    <h2>Construir</h2>
    <p>Elegid un edificio y colocadlo en el refugio.</p>
    <p class="zz-muted" style="font-size:0.8rem">Mano de obra construcción: ${state.population.labor?.build || 0} (+ disponibles ${state.population.labor?.idle || 0})</p>
    <div class="zz-build-grid">${list}</div>
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

function paintHud() {
  const pop = state.population;
  const cap = housingCapacity(state, content.buildings);
  if ($('zz-pop')) $('zz-pop').textContent = `${pop.total}/${cap}`;
  if ($('zz-day-label')) $('zz-day-label').textContent = `Día ${state.day}`;
  if ($('zz-colony')) $('zz-colony').textContent = state.colonyName;
  if ($('zz-era')) {
    const eraName = content.erasDoc?.eras?.[state.era]?.name || `Era ${state.era}`;
    $('zz-era').textContent = eraName;
  }
  if ($('zz-stability')) $('zz-stability').textContent = String(Math.round(state.stability));
  if ($('zz-threat')) $('zz-threat').textContent = String(Math.round(state.director?.threat || 0));
  if ($('zz-defense')) $('zz-defense').textContent = String(Math.round(defenseValue(state, content.buildings, content.balance)));
  document.body.dataset.weather = state.weather || 'clear';
  const w = $('zz-weather');
  if (w) {
    const labels = { clear: 'Despejado', rain: 'Lluvia', storm: 'Tormenta', cold: 'Frío', fog: 'Niebla', heat: 'Calor' };
    w.textContent = labels[state.weather] || state.weather;
    w.dataset.weather = state.weather || 'clear';
    w.hidden = false;
  }
  const res = $('zz-resources');
  if (res) {
    const order = content.balance.resourceOrder || Object.keys(RES_LABEL_UI);
    res.innerHTML = '';
    order.forEach((k) => {
      const li = document.createElement('li');
      try {
        li.appendChild(RES_ICONS[k]?.(18) || document.createTextNode(''));
      } catch {
        /* ignore */
      }
      const lab = document.createElement('span');
      lab.textContent = RES_LABEL_UI[k] || k;
      const strong = document.createElement('strong');
      strong.textContent = String(state.resources[k] || 0);
      li.appendChild(lab);
      li.appendChild(strong);
      res.appendChild(li);
    });
  }
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
      (e.status === 'dead' ? ' is-dead' : '');
    const portrait = renderPortraitSvg(
      { id: e.id, name: e.name, portraitSeed: e.portraitSeed },
      36
    );
    btn.appendChild(portrait);
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

function paint() {
  if (!state || !content) return;
  syncLaborFromColony(state, content);
  paintHud();
  paintExplorers();
  paintObjective();
  paintModeBanner();
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
      sfx.click?.();
      openZoneSheet(id);
    },
    onSelectBuilding: (id) => {
      if (wrap?.dataset.zzPanned) return;
      sfx.click?.();
      openBuildingSheet(id);
    },
    onPlaceCell: (x, y) => {
      if (!state.buildMode) return;
      const type = state.buildMode;
      const r = placeBuilding(state, content, type, x, y);
      if (!r.ok) {
        toast(r.error || 'No se pudo construir', 'warn');
        return;
      }
      sfx.build?.();
      toast(`${content.buildings[type]?.name || type} colocado`, 'good');
      state.buildMode = null;
      state.uiMode = null;
      scheduleSave();
      paint();
      const b = state.base.buildings.find((bl) => bl.x === x && bl.y === y && bl.type === type);
      if (b && laborKeyForBuilding(content.buildings[b.type])) openBuildingSheet(b.id);
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
  const el = $('zz-objective');
  if (!el) return;
  const obj = currentObjective(state, content);
  if (!obj || state.flags?.objectivesOff) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.innerHTML = `<strong>${escapeHtml(obj.title)}</strong><span>${escapeHtml(obj.text)}</span>`;
}

function paintModeBanner() {
  const el = $('zz-mode-banner');
  if (!el) return;
  if (state.uiMode === 'build' && state.buildMode) {
    el.hidden = false;
    el.textContent = `Colocad ${content.buildings[state.buildMode]?.name || 'edificio'} · arrastrad para mirar · tocad parcela`;
  } else if (state.uiMode === 'explore') {
    el.hidden = false;
    el.textContent = 'Modo exploración · destinos resaltados · tocad uno';
  } else {
    el.hidden = true;
  }
}

function showDayBrief(brief) {
  const card = $('zz-day-brief');
  if (!card || !brief?.important || !brief.lines?.length) {
    if (card) card.hidden = true;
    return;
  }
  card.innerHTML = `<strong>DÍA ${brief.day}</strong><ul>${brief.lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`;
  card.hidden = false;
  clearTimeout(showDayBrief._t);
  showDayBrief._t = setTimeout(() => {
    card.hidden = true;
  }, 5200);
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
  if (r.director?.quiet) {
    /* silencio intencional */
  } else if (r.director?.event && !r.director.choice && !state.pendingChoice) {
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
  if (r.brief) showDayBrief(r.brief);
  sfx.click?.();
  scheduleSave();
  paint();
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
  $('zz-open-more')?.addEventListener('click', () => {
    sfx.click?.();
    openMoreSheet();
  });
  $('zz-sheet-close')?.addEventListener('click', closeSheet);
  $('zz-map')?.addEventListener('click', (ev) => {
    if (ev.target === $('zz-map') || ev.target.classList?.contains('zz-map-bg')) {
      if (state.uiMode === 'build' || state.uiMode === 'explore') return;
      closeSheet();
    }
  });
  $('zz-objective-dismiss')?.addEventListener('click', () => {
    state.flags.objectivesOff = true;
    paint();
  });
  // zoom buttons
  $('zz-zoom-in')?.addEventListener('click', () => {
    if (!state.mapCamera) return;
    state.mapCamera.zoom = Math.min(2.4, (state.mapCamera.zoom || 1) * 1.15);
    paint();
  });
  $('zz-zoom-out')?.addEventListener('click', () => {
    if (!state.mapCamera) return;
    state.mapCamera.zoom = Math.max(0.55, (state.mapCamera.zoom || 1) / 1.15);
    paint();
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
  slot = opts.slot;
  initSound();

  if (opts.mode === 'new') {
    state = createNewState(content, opts.name || 'Refugio 0');
    const saved = await api.saveSlot(slot, state, state.colonyName, summarizeState(state));
    if (!saved.ok) throw new Error(saved.error || 'save_failed');
    dirty = false;
  } else {
    const res = await api.loadSlot(slot);
    if (!res.ok) throw new Error(res.error || 'load');
    state = migrateState(res.state, content);
  }

  bindChrome();
  if (!state.selectedExplorerId) {
    state.selectedExplorerId = livingExplorers(state)[0]?.id || null;
  }
  seedZone();
  paint();
  if (app) app.hidden = false;
  if (boot) boot.hidden = true;
  toast(
    state.flags.defeated
      ? 'Esta partida ya terminó en derrota'
      : state.flags.victory && !state.flags.endless
        ? 'Victoria alcanzada'
        : `Día ${state.day} · ${state.population.total} habitantes`,
    state.flags.defeated ? 'bad' : 'good'
  );

  window.__zz = {
    getState: () => state,
    getContent: () => content,
    paint,
    place: (type, x, y) => {
      const r = placeBuilding(state, content, type, x, y);
      if (r.ok) paint();
      return r;
    },
    sendExpedition: (zoneId, explorerId) => {
      const r = startExpedition(state, content, zoneId, explorerId);
      if (r.ok) paint();
      return r;
    },
  };
}

function seedZone() {
  const z =
    state.zones.find((x) => x.state === 'discovered' && x.type !== 'camp') ||
    state.zones.find((x) => x.state !== 'unknown' && x.type !== 'camp');
  if (z) state.selectedZoneId = z.id;
}

export async function bootHub() {
  const boot = $('zz-hub-boot');
  const hub = $('zz-hub');
  if (boot) boot.textContent = 'Cargando slots…';
  try {
    const data = await api.fetchSlots();
    if (!data.ok) throw new Error(data.error || 'slots');
    const userEl = $('zz-user');
    if (userEl) userEl.textContent = data.user?.nombre || 'Jugador';
    const grid = $('zz-slots');
    if (!grid) return;
    grid.innerHTML = '';
    data.slots.forEach((s) => {
      const card = document.createElement('article');
      card.className = 'zz-slot' + (s.empty ? ' is-empty' : '') + (!s.alive && !s.empty ? ' is-dead' : '');
      card.innerHTML = s.empty
        ? `<h2>Slot ${s.slot}</h2><p>Vacío</p><button type="button" class="zz-btn zz-btn--primary" data-new="${s.slot}">Nueva partida</button>`
        : `<h2>${escapeHtml(s.title || 'Zona Zero')}</h2>
           <p>${escapeHtml(s.summary || '')}</p>
           <div class="zz-slot__actions">
             <a class="zz-btn zz-btn--primary" href="play.php?slot=${s.slot}">Continuar</a>
             <button type="button" class="zz-btn" data-new="${s.slot}">Reiniciar</button>
             <button type="button" class="zz-btn zz-btn--ghost" data-del="${s.slot}">Borrar</button>
           </div>`;
      grid.appendChild(card);
    });
    grid.querySelectorAll('[data-new]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sl = btn.getAttribute('data-new');
        const name = prompt('Nombre del refugio', 'Refugio 0') || 'Refugio 0';
        window.location.href = `play.php?slot=${sl}&new=1&name=${encodeURIComponent(name)}`;
      });
    });
    grid.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Borrar partida?')) return;
        await api.deleteSlot(Number(btn.getAttribute('data-del')));
        bootHub();
      });
    });
    if (boot) boot.hidden = true;
    if (hub) hub.hidden = false;
  } catch (e) {
    if (boot) boot.textContent = 'Error: ' + (e.message || e);
    throw e;
  }
}
