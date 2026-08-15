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
  adjustLabor,
  autoAssignWorkers,
  resolveBaseAttack,
} from './sim.js';
import { resolvePendingChoice } from './director.js';
import { renderMap } from './render-map.js';
import {
  readyExplorers,
  livingExplorers,
  renameExplorer,
  recruitExplorer,
  explorerSlotsUnlocked,
} from './explorers.js';
import { clearLaborManual, workforce } from './population.js';
import { RES_ICONS, renderPortraitSvg, buildingThumb, familyIcon, FAMILY_ICONS } from './icons.js';
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
  // Rebind interactive bits
  body.querySelectorAll('[data-labor]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-labor');
      const delta = Number(btn.getAttribute('data-delta') || 0);
      const r = adjustLabor(state, key, delta, content.balance);
      if (!r.ok) toast(r.error || 'No', 'warn');
      else {
        sfx.click?.();
        scheduleSave();
        paint();
        openPopulationSheet();
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
      scheduleSave();
      closeSheet();
    }
    paint();
    return;
  }
  if (action === 'build') {
    state.buildMode = btn.getAttribute('data-build');
    toast('Tocad una parcela libre en el núcleo (próximo zoom). Usad colocación rápida.', 'info');
    // Colocación rápida en primera celda libre
    const type = state.buildMode;
    outer: for (let y = 0; y < state.base.h; y++) {
      for (let x = 0; x < state.base.w; x++) {
        if (!state.base.buildings.some((b) => b.x === x && b.y === y && b.hp > 0)) {
          const r = placeBuilding(state, content, type, x, y);
          if (r.ok) {
            sfx.build?.();
            toast('Construido', 'good');
            state.buildMode = null;
            scheduleSave();
            paint();
            openBuildSheet();
            return;
          }
        }
      }
    }
    toast('No hay parcela o faltan recursos/mano de obra', 'warn');
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
  const pop = state.population;
  const cap = housingCapacity(state, content.buildings);
  const labor = pop.labor || {};
  const rows = ['idle', 'food', 'water', 'build', 'produce', 'defense', 'medicine']
    .map((k) => {
      const steppers =
        k === 'idle'
          ? `<span>${labor[k] || 0}</span>`
          : `<div class="zz-stepper">
              <button type="button" data-labor="${k}" data-delta="-1">−</button>
              <span>${labor[k] || 0}</span>
              <button type="button" data-labor="${k}" data-delta="1">+</button>
            </div>`;
      return `<div class="zz-labor-row"><div><strong>${LABOR_LABEL[k]}</strong></div>${steppers}</div>`;
    })
    .join('');
  openSheet(`
    <h2>Población ${pop.total} / ${cap}</h2>
    <p>Fuerza laboral: ${workforce(pop)} · Heridos ${pop.injured || 0} · Enfermos ${pop.sick || 0}</p>
    ${rows}
    <p style="margin-top:0.75rem"><button type="button" class="zz-btn" data-action="auto-labor">Redistribuir automático</button></p>
  `);
}

function openExplorerSheet(id) {
  const e = state.explorers.find((x) => x.id === id);
  if (!e) return;
  state.selectedExplorerId = id;
  const skills = Object.entries(e.skills || {})
    .map(([k, v]) => `<span>${SKILL_LABEL[k] || k} ${'●'.repeat(v)}${'○'.repeat(5 - v)}</span>`)
    .join('');
  const stLabel =
    e.status === 'ready' ? 'Listo' : e.status === 'away' ? 'En ruta' : e.status === 'wounded' ? 'Herido' : 'Caído';
  openSheet(`
    <h2>${escapeHtml(e.name)}</h2>
    <p>Explorador · Nv.${e.level || 1} · ${stLabel}</p>
    <div class="zz-skill-mini">${skills}</div>
    <p>
      <button type="button" class="zz-btn zz-btn--compact" data-action="rename-ex" data-id="${e.id}">Renombrar</button>
      <button type="button" class="zz-btn zz-btn--compact" data-action="equip-weapon" data-id="${e.id}" data-val="basic">Arma básica</button>
      <button type="button" class="zz-btn zz-btn--compact" data-action="equip-weapon" data-id="${e.id}" data-val="improved">Arma mejorada</button>
    </p>
    <p class="zz-muted">Tocad un lugar del mapa para enviarlo. Cerrad este panel cuando no lo necesitéis.</p>
  `);
  paint();
}

function openZoneSheet(zoneId) {
  const z = state.zones.find((x) => x.id === zoneId);
  if (!z || z.state === 'unknown') return;
  state.selectedZoneId = zoneId;
  const ex = state.explorers.find((e) => e.id === state.selectedExplorerId) || readyExplorers(state)[0];
  const preview = ex ? expeditionPreview(state, content, zoneId, ex.id) : null;
  const badge =
    z.state === 'controlled' ? 'Control' : z.state === 'hostile' ? 'Hostil' : 'Conocido';
  const ctrlPct = Math.round((z.controlProgress || 0) * 100);
  openSheet(`
    <h2>${escapeHtml(z.name)}</h2>
    <p><span class="zz-zone-badge zz-zone-badge--${z.state}">${badge}</span>
      Riesgo base ${(z.risk * 100).toFixed(0)}% · Infectados ~${z.infectedLeft || 0}
      ${z.state !== 'controlled' ? ` · Control ${ctrlPct}%` : ''}</p>
    ${
      z.state === 'controlled'
        ? '<p>Territorio vuestro. Podéis avanzar desde aquí o enviar patrulla ligera.</p>'
        : preview
          ? `<p>Explorador: <strong>${escapeHtml(preview.explorerName)}</strong> (${preview.explorerStatus})</p>
             <p>Distancia ${preview.distance} · ${preview.days} día(s) · Riesgo <strong>${preview.category}</strong> (${Math.round(
              preview.risk * 100
            )}%)</p>
             <p>Enfoque: ${escapeHtml(preview.note || preview.focus || '')}</p>
             <p>Botín probable: ${(preview.lootHint || []).join(', ') || 'incierto'} · Combustible ${preview.fuel}</p>
             <button type="button" class="zz-btn zz-btn--primary zz-btn--wide" data-action="send-exp" data-zone="${z.id}" ${
              ex.status !== 'ready' ? 'disabled' : ''
            }>Enviar a ${escapeHtml(ex.name)}</button>
             <p class="zz-muted" style="margin-top:0.5rem;font-size:0.8rem">Otro explorador cambia el riesgo y el botín. Zonas hostiles tardan más.</p>`
          : '<p>No hay explorador disponible. Curad heridas o esperad el retorno.</p>'
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
    .slice(0, 16)
    .map((b) => {
      const afford = canAfford(state, b.cost);
      const cost = Object.entries(b.cost || {})
        .map(([k, v]) => `${v} ${RES_LABEL_UI[k] || k}`)
        .join(' · ');
      return `<button type="button" class="zz-build-btn ${afford ? '' : 'is-disabled'}" data-action="build" data-build="${b.id}">
        <strong>${escapeHtml(b.name)}</strong>
        <span class="zz-build-desc">${escapeHtml(b.desc || '')}</span>
        <span class="zz-build-cost">${cost || 'Gratis'}</span>
      </button>`;
    })
    .join('');
  openSheet(`<h2>Construir</h2><p>Mano de obra construcción: ${state.population.labor?.build || 0} (+ idle ${state.population.labor?.idle || 0})</p><div class="zz-build-bar" style="display:grid;gap:0.4rem">${list}</div>`);
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
  paintHud();
  paintExplorers();
  const banner = $('zz-recover-banner');
  if (banner) {
    const recovering = state.day < (state.director?.protectionUntil || 0);
    banner.hidden = !recovering;
    if (recovering) {
      banner.textContent = `Recuperación · hasta día ${state.director.protectionUntil}`;
    }
  }
  renderMap($('zz-map'), state, {
    onSelectZone: (id) => {
      sfx.click?.();
      openZoneSheet(id);
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
  updateCoach();
}

function updateCoach() {
  const coach = $('zz-coach');
  const text = $('zz-coach-text');
  if (!coach || !text || state.flags.coach?.dismissed) {
    if (coach) coach.hidden = true;
    return;
  }
  const c = state.flags.coach || {};
  if (!c.explore && readyExplorers(state).length) {
    text.textContent = 'Tocad una zona conocida y enviad a vuestro explorador.';
    coach.hidden = false;
    return;
  }
  if (!c.labor) {
    text.textContent = 'Tocad la población del HUD para asignar trabajo con + / −.';
    coach.hidden = false;
    return;
  }
  if (!c.build) {
    text.textContent = 'Con madera y metal, usad Construir abajo.';
    coach.hidden = false;
    return;
  }
  coach.hidden = true;
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
        const atk = resolveBaseAttack(state, content, r.attackIntensity);
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
  const before = {
    food: state.resources.food,
    water: state.resources.water,
    pop: state.population.total,
    day: state.day,
  };
  const r = advanceDay(state, content);
  if (!r.ok) {
    toast(r.error || 'No', 'warn');
    return;
  }
  if (state.flags.coach) {
    if (state.expeditionsDone || state.stats.expeditions) state.flags.coach.explore = true;
    state.flags.coach.labor = true;
    if (state.stats.buildingsBuilt > 3) state.flags.coach.build = true;
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
  } else {
    const dFood = Math.round((state.resources.food || 0) - (before.food || 0));
    const dWater = Math.round((state.resources.water || 0) - (before.water || 0));
    const dPop = (state.population.total || 0) - (before.pop || 0);
    if (Math.abs(dFood) >= 2 || Math.abs(dWater) >= 2 || dPop) {
      const bits = [];
      if (dFood) bits.push(`comida ${dFood > 0 ? '+' : ''}${dFood}`);
      if (dWater) bits.push(`agua ${dWater > 0 ? '+' : ''}${dWater}`);
      if (dPop) bits.push(`población ${dPop > 0 ? '+' : ''}${dPop}`);
      toast(`Día ${state.day}: ${bits.join(' · ')}`, dPop < 0 || dFood < -3 ? 'warn' : 'info');
    }
  }
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
  // Cerrar panel al tocar el mapa (fondo), no las zonas
  $('zz-map')?.addEventListener('click', (ev) => {
    if (ev.target === $('zz-map') || ev.target.classList?.contains('zz-map-bg')) closeSheet();
  });
  $('zz-coach-dismiss')?.addEventListener('click', () => {
    state.flags.coach.dismissed = true;
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

// silence unused
void FAMILY_ICONS;
void buildingThumb;
void resolveBaseAttack;
void clearLaborManual;
