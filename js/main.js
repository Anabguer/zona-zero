/**
 * Zona Zero — UI principal
 */
import {
  loadContent,
  createNewState,
  livingSurvivors,
  housingCapacity,
  defenseValue,
  summarizeState,
  migrateState,
} from './state.js';
import { advanceDay, startExpedition, placeBuilding, RES_LABEL } from './sim.js';
import { renderMap } from './render-map.js';
import { renderBase } from './render-base.js';
import * as api from './api.js';

const RES_LABEL_UI = {
  food: 'Comida',
  water: 'Agua',
  wood: 'Madera',
  metal: 'Metal',
  medicine: 'Medicinas',
  fuel: 'Combustible',
  ammo: 'Munición',
};

let content = null;
let state = null;
let slot = 1;
let saveTimer = null;
let dirty = false;

const $ = (id) => document.getElementById(id);

function toast(msg, kind = 'info') {
  const el = $('zz-toast');
  if (!el) return;
  el.textContent = msg;
  el.dataset.kind = kind;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.hidden = true;
  }, 2800);
}

function scheduleSave() {
  dirty = true;
  $('zz-save-state').textContent = 'Cambios sin guardar…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveNow(), 1600);
}

async function saveNow() {
  if (!state) return;
  try {
    const res = await api.saveSlot(slot, state, state.colonyName, summarizeState(state));
    if (res.ok) {
      dirty = false;
      $('zz-save-state').textContent = 'Guardado';
      toast('Partida guardada', 'good');
    } else {
      toast(res.error || 'Error al guardar', 'bad');
    }
  } catch (e) {
    if (e.message !== 'auth') toast('No se pudo guardar', 'bad');
  }
}

function renderHud() {
  const alive = livingSurvivors(state);
  $('zz-day').textContent = String(state.day);
  $('zz-pop').textContent = `${alive.length}/${housingCapacity(state, content.buildings, content.balance)}`;
  $('zz-threat').textContent = String(state.director.threat);
  $('zz-defense').textContent = String(defenseValue(state, content.balance));
  const res = $('zz-resources');
  res.innerHTML = '';
  const order = content.balance.resourceOrder || Object.keys(state.resources);
  order.forEach((k) => {
    if (state.resources[k] == null) return;
    const v = state.resources[k];
    const li = document.createElement('li');
    li.innerHTML = `<span class="zz-res-ico zz-res-ico--${k}" aria-hidden="true"></span><strong>${v}</strong><span>${RES_LABEL_UI[k] || RES_LABEL[k] || k}</span>`;
    res.appendChild(li);
  });
  $('zz-colony').textContent = state.colonyName;
  if (state.flags.defeated) {
    $('zz-defeat').hidden = false;
    $('zz-defeat-msg').textContent = state.flags.defeatReason || 'Habéis perdido.';
  } else {
    $('zz-defeat').hidden = true;
  }
}

function renderPeople() {
  const list = $('zz-people');
  list.innerHTML = '';
  state.survivors.forEach((s) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'zz-person' + (state.selectedSurvivorIds.includes(s.id) ? ' is-selected' : '') + (s.status === 'dead' ? ' is-dead' : '');
    btn.disabled = s.status === 'dead';
    const busy = s.busyUntilDay > state.day ? ` · expedición` : '';
    btn.innerHTML = `
      <span class="zz-person__avatar" data-status="${s.status}"></span>
      <span class="zz-person__meta">
        <strong>${s.name}</strong>
        <small>PV ${Math.max(0, Math.round(s.hp))} · ${s.status}${busy}</small>
        <small>E${Math.round(s.skills.scout)} C${Math.round(s.skills.fight)} B${Math.round(s.skills.build)} R${Math.round(s.skills.gather)}</small>
      </span>`;
    btn.addEventListener('click', () => {
      if (s.status === 'dead') return;
      const i = state.selectedSurvivorIds.indexOf(s.id);
      if (i >= 0) state.selectedSurvivorIds.splice(i, 1);
      else {
        if (state.selectedSurvivorIds.length >= (content.balance.expeditionMaxSurvivors || 3)) {
          state.selectedSurvivorIds.shift();
        }
        state.selectedSurvivorIds.push(s.id);
      }
      paint();
    });
    list.appendChild(btn);
  });
}

function renderBuildBar() {
  const bar = $('zz-build-bar');
  bar.innerHTML = '';
  Object.values(content.buildings).forEach((b) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'zz-build-btn' + (state.buildMode === b.id ? ' is-selected' : '');
    const cost = Object.entries(b.cost || {})
      .map(([k, v]) => `${v} ${RES_LABEL_UI[k] || RES_LABEL[k] || k}`)
      .join(' · ');
    btn.innerHTML = `<strong>${b.name}</strong><small>${cost}</small>`;
    btn.title = b.desc;
    btn.addEventListener('click', () => {
      state.buildMode = state.buildMode === b.id ? null : b.id;
      paint();
    });
    bar.appendChild(btn);
  });
}

function renderLog() {
  const box = $('zz-log');
  box.innerHTML = state.log
    .slice(0, 24)
    .map((e) => `<li class="zz-log__item zz-log__item--${e.kind}"><span>D${e.day}</span>${escapeHtml(e.text)}</li>`)
    .join('');
}

function renderExpeditionPanel() {
  const z = state.zones.find((x) => x.id === state.selectedZoneId);
  const panel = $('zz-zone-panel');
  if (!z || z.state === 'unknown') {
    panel.innerHTML = '<p class="zz-muted">Selecciona una zona descubierta o controlada en el mapa.</p>';
    return;
  }
  const ex = state.expedition;
  panel.innerHTML = `
    <h3>${escapeHtml(z.name)}</h3>
    <p class="zz-muted">Estado: <strong>${z.state}</strong> · Riesgo base ${(z.risk * 100) | 0}%</p>
    <p>${ex ? `Expedición en curso → día ${ex.returnDay}` : 'Elige gente y envía una expedición automática.'}</p>
    <button type="button" class="zz-btn zz-btn--primary" id="zz-send-exp" ${ex || state.flags.defeated ? 'disabled' : ''}>Enviar expedición</button>
  `;
  const send = $('zz-send-exp');
  if (send) {
    send.addEventListener('click', () => {
      const r = startExpedition(state, content, z.id, state.selectedSurvivorIds);
      if (!r.ok) toast(r.error, 'bad');
      else {
        toast('Expedición enviada', 'good');
        scheduleSave();
      }
      paint();
    });
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function paint() {
  renderHud();
  renderPeople();
  renderBuildBar();
  renderLog();
  renderExpeditionPanel();
  renderMap($('zz-map'), state, {
    onSelectZone: (id) => {
      state.selectedZoneId = id;
      paint();
    },
  });
  renderBase($('zz-base'), state, {
    onCellClick: (x, y) => {
      if (!state.buildMode || state.flags.defeated) return;
      const r = placeBuilding(state, content, state.buildMode, x, y);
      if (!r.ok) toast(r.error, 'bad');
      else {
        state.buildMode = null;
        toast('Edificio colocado', 'good');
        scheduleSave();
      }
      paint();
    },
  });
}

function bindChrome() {
  $('zz-advance').addEventListener('click', () => {
    const r = advanceDay(state, content);
    if (!r.ok) toast(r.error, 'bad');
    else {
      toast(`Día ${state.day}`, 'info');
      scheduleSave();
    }
    paint();
  });
  $('zz-save').addEventListener('click', () => saveNow());
  $('zz-tab-map').addEventListener('click', () => setTab('map'));
  $('zz-tab-base').addEventListener('click', () => setTab('base'));
  $('zz-tab-people').addEventListener('click', () => setTab('people'));
  document.querySelectorAll('[data-zz-back]').forEach((a) => {
    a.addEventListener('click', (ev) => {
      if (dirty && !confirm('Hay cambios sin guardar. ¿Salir igual?')) ev.preventDefault();
    });
  });
}

function setTab(name) {
  document.querySelectorAll('.zz-tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === name));
  document.querySelectorAll('.zz-panel').forEach((p) => p.classList.toggle('is-active', p.dataset.panel === name));
}

export async function bootGame(opts) {
  content = await loadContent();
  slot = opts.slot;
  if (opts.mode === 'new') {
    state = createNewState(content, opts.name || 'Refugio 0');
    await saveNow();
  } else {
    const res = await api.loadSlot(slot);
    if (!res.ok) throw new Error(res.error || 'load');
    state = migrateState(res.state, content.balance);
  }
  bindChrome();
  setTab('map');
  paint();
  $('zz-app').hidden = false;
  $('zz-boot').hidden = true;
}

// Hub de slots en index
export async function bootHub() {
  const boot = $('zz-hub-boot');
  const hub = $('zz-hub');
  try {
    const data = await api.fetchSlots();
    if (!data.ok) throw new Error(data.error || 'slots');
    $('zz-user').textContent = data.user?.nombre || 'Jugador';
    const grid = $('zz-slots');
    grid.innerHTML = '';
    data.slots.forEach((s) => {
      const card = document.createElement('article');
      card.className = 'zz-slot' + (s.empty ? ' is-empty' : '') + (!s.alive && !s.empty ? ' is-dead' : '');
      card.innerHTML = s.empty
        ? `<h2>Slot ${s.slot}</h2><p>Vacío</p><button type="button" class="zz-btn zz-btn--primary" data-new="${s.slot}">Nueva partida</button>`
        : `<h2>${escapeHtml(s.title || 'Zona Zero')}</h2>
           <p>${escapeHtml(s.summary || '')}</p>
           <p class="zz-muted">Actualizado: ${escapeHtml(s.updated_at || '—')}</p>
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
        const sl = Number(btn.getAttribute('data-del'));
        if (!confirm('¿Borrar este slot?')) return;
        await api.deleteSlot(sl);
        bootHub();
      });
    });
    boot.hidden = true;
    hub.hidden = false;
  } catch (e) {
    if (e.message !== 'auth') {
      boot.textContent = 'No se pudieron cargar los slots. ¿Estás conectado a Intocables?';
    }
  }
}
