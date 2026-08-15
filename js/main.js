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
import { advanceDay, startExpedition, placeBuilding, RES_LABEL, canAfford } from './sim.js';
import { renderMap } from './render-map.js';
import { renderBase } from './render-base.js';
import {
  RES_ICONS,
  SKILL_META,
  SKILL_ORDER,
  skillIcon,
  renderPortraitSvg,
  buildingThumb,
} from './icons.js';
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

const ZONE_STATE_LABEL = {
  controlled: 'Vuestro',
  discovered: 'Explorado',
  unknown: 'Desconocido',
};

let content = null;
let state = null;
let slot = 1;
let saveTimer = null;
let dirty = false;
let activeTab = 'map';

const $ = (id) => document.getElementById(id);

function ensureCoach() {
  if (!state.flags.coach) {
    state.flags.coach = {
      people: false,
      explore: false,
      build: false,
      dismissed: false,
    };
  }
}

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

function renderCoach() {
  const box = $('zz-coach');
  const text = $('zz-coach-text');
  if (!box || !text || state.flags.defeated) {
    if (box) box.hidden = true;
    return;
  }
  ensureCoach();
  const c = state.flags.coach;
  if (c.dismissed) {
    box.hidden = true;
    return;
  }
  let msg = '';
  if (activeTab === 'people' && !c.people) {
    msg = 'Selecciona supervivientes para la expedición (mira quién explora mejor).';
  } else if (activeTab === 'map' && !c.explore) {
    msg = 'Explora una zona cercana conocida y envía una expedición.';
  } else if (activeTab === 'base' && !c.build) {
    const wood = state.resources.wood || 0;
    msg =
      wood < 4
        ? 'Necesitas madera para construir. Explora o produce en el asentamiento.'
        : 'Elige un edificio y tócalo sobre el terreno libre.';
  }
  if (!msg) {
    box.hidden = true;
    return;
  }
  text.textContent = msg;
  box.hidden = false;
}

function renderHud() {
  const alive = livingSurvivors(state);
  const cap = housingCapacity(state, content.buildings, content.balance);
  $('zz-day').textContent = String(state.day);
  $('zz-pop').textContent = `${alive.length}/${cap}`;
  $('zz-threat').textContent = String(state.director.threat);
  $('zz-defense').textContent = String(defenseValue(state, content.balance));
  const res = $('zz-resources');
  res.innerHTML = '';
  const order = content.balance.resourceOrder || Object.keys(state.resources);
  order.forEach((k) => {
    if (state.resources[k] == null) return;
    const li = document.createElement('li');
    li.title = RES_LABEL_UI[k] || RES_LABEL[k] || k;
    const icoFn = RES_ICONS[k];
    if (icoFn) li.appendChild(icoFn(18));
    const strong = document.createElement('strong');
    strong.textContent = String(state.resources[k]);
    li.appendChild(strong);
    const lab = document.createElement('span');
    lab.textContent = RES_LABEL_UI[k] || RES_LABEL[k] || k;
    li.appendChild(lab);
    res.appendChild(li);
  });
  $('zz-colony').textContent = state.colonyName;
  const defeat = $('zz-defeat');
  if (defeat) {
    if (state.flags.defeated) {
      defeat.removeAttribute('hidden');
      const msg = $('zz-defeat-msg');
      if (msg) msg.textContent = state.flags.defeatReason || 'Habéis perdido.';
    } else {
      defeat.setAttribute('hidden', '');
      const msg = $('zz-defeat-msg');
      if (msg) msg.textContent = '';
    }
  }
}

function skillBarsHtml(s) {
  const bestKey = SKILL_ORDER.reduce((a, b) => ((s.skills[b] || 0) > (s.skills[a] || 0) ? b : a));
  return SKILL_ORDER.map((key) => {
    const val = Math.round(s.skills[key] || 0);
    const pct = Math.max(6, Math.min(100, (val / 10) * 100));
    const meta = SKILL_META[key];
    const best = key === bestKey ? ' is-best' : '';
    return `<div class="zz-skill${best}" title="${meta.label}">
      <span class="zz-skill-ico-wrap" data-skill="${key}"></span>
      <span class="zz-skill__bar"><i style="width:${pct}%;background:${meta.color}"></i></span>
      <span class="zz-skill__val">${val}</span>
    </div>`;
  }).join('');
}

function renderPeople() {
  const list = $('zz-people');
  list.innerHTML = '';
  state.survivors.forEach((s) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'zz-person' +
      (state.selectedSurvivorIds.includes(s.id) ? ' is-selected' : '') +
      (s.status === 'dead' ? ' is-dead' : '');
    btn.disabled = s.status === 'dead';
    const busy = s.busyUntilDay > state.day ? ' · en expedición' : '';
    const statusLabel =
      s.status === 'dead' ? 'Caído' : s.status === 'wounded' ? 'Herido' : 'Listo';

    const avatarWrap = document.createElement('span');
    avatarWrap.appendChild(renderPortraitSvg(s, 52));

    const meta = document.createElement('span');
    meta.className = 'zz-person__meta';
    meta.innerHTML = `
      <span class="zz-person__head">
        <strong>${escapeHtml(s.name)}</strong>
        <span class="zz-person__status">PV ${Math.max(0, Math.round(s.hp))} · ${statusLabel}${busy}</span>
      </span>
      <div class="zz-skills">${skillBarsHtml(s)}</div>`;

    btn.appendChild(avatarWrap);
    btn.appendChild(meta);
    meta.querySelectorAll('[data-skill]').forEach((el) => {
      el.replaceWith(skillIcon(el.getAttribute('data-skill'), 13));
    });

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
      ensureCoach();
      if (state.selectedSurvivorIds.length >= 1) state.flags.coach.people = true;
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
    const afford = canAfford(state, b.cost);
    btn.className =
      'zz-build-btn' +
      (state.buildMode === b.id ? ' is-selected' : '') +
      (!afford ? ' is-disabled' : '');
    const costBits = Object.entries(b.cost || {})
      .map(([k, v]) => `${v} ${RES_LABEL_UI[k] || k}`)
      .join(' · ');
    btn.appendChild(buildingThumb(b.id, 40));
    const name = document.createElement('strong');
    name.textContent = b.name;
    btn.appendChild(name);
    const desc = document.createElement('span');
    desc.className = 'zz-build-desc';
    desc.textContent = b.desc;
    btn.appendChild(desc);
    const cost = document.createElement('span');
    cost.className = 'zz-build-cost';
    cost.textContent = costBits;
    btn.appendChild(cost);
    btn.addEventListener('click', () => {
      state.buildMode = state.buildMode === b.id ? null : b.id;
      paint();
    });
    bar.appendChild(btn);
  });
  const hint = $('zz-build-hint');
  if (hint) {
    hint.textContent = state.buildMode
      ? 'Toca una parcela libre del terreno para construir.'
      : 'Elige un edificio y tócalo sobre el terreno libre.';
  }
}

function renderLog() {
  const box = $('zz-log');
  box.innerHTML = state.log
    .slice(0, 12)
    .map(
      (e) =>
        `<li class="zz-log__item zz-log__item--${e.kind}"><span>D${e.day}</span>${escapeHtml(e.text)}</li>`
    )
    .join('');
}

function renderExpeditionPanel() {
  const z = state.zones.find((x) => x.id === state.selectedZoneId);
  const panel = $('zz-zone-panel');
  if (!z || z.state === 'unknown') {
    panel.innerHTML =
      '<p class="zz-muted">Toca un sector conocido en el mapa. La niebla aún oculta el resto.</p>';
    return;
  }
  const ex = state.expedition;
  const badge = ZONE_STATE_LABEL[z.state] || z.state;
  const riskPct = (z.risk * 100) | 0;
  const riskNote = z.risk >= 0.45 ? ' · peligroso' : '';
  panel.innerHTML = `
    <span class="zz-zone-badge zz-zone-badge--${z.state}">${badge}</span>
    <h3>${escapeHtml(z.name)}</h3>
    <p class="zz-muted">Riesgo ${riskPct}%${riskNote}</p>
    <p>${
      ex
        ? `Expedición en curso → vuelven el día ${ex.returnDay}`
        : 'Elige gente en la pestaña Gente y envía una expedición.'
    }</p>
    <button type="button" class="zz-btn zz-btn--primary" id="zz-send-exp" ${
      ex || state.flags.defeated || z.id === 'camp' ? 'disabled' : ''
    }>Enviar expedición</button>
  `;
  const send = $('zz-send-exp');
  if (send) {
    send.addEventListener('click', () => {
      const r = startExpedition(state, content, z.id, state.selectedSurvivorIds);
      if (!r.ok) toast(r.error, 'bad');
      else {
        ensureCoach();
        state.flags.coach.explore = true;
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
  renderCoach();
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
        ensureCoach();
        state.flags.coach.build = true;
        state.buildMode = null;
        toast('El asentamiento crece', 'good');
        scheduleSave();
      }
      paint();
    },
  });
}

function bindChrome() {
  $('zz-advance').addEventListener('click', () => {
    const beforeLog = state.log[0]?.text;
    const r = advanceDay(state, content);
    if (!r.ok) toast(r.error, 'bad');
    else {
      const latest = state.log.find((e) => e.day === state.day && e.kind !== 'story');
      if (latest && (latest.kind === 'bad' || latest.kind === 'warn' || latest.kind === 'good')) {
        toast(latest.text, latest.kind === 'bad' ? 'bad' : latest.kind === 'warn' ? 'warn' : 'good');
      } else {
        toast(`Amanece el día ${state.day}`, 'info');
      }
      void beforeLog;
      scheduleSave();
    }
    paint();
  });
  $('zz-save').addEventListener('click', () => saveNow());
  $('zz-tab-map').addEventListener('click', () => setTab('map'));
  $('zz-tab-base').addEventListener('click', () => setTab('base'));
  $('zz-tab-people').addEventListener('click', () => setTab('people'));
  const dismiss = $('zz-coach-dismiss');
  if (dismiss) {
    dismiss.addEventListener('click', () => {
      ensureCoach();
      state.flags.coach.dismissed = true;
      renderCoach();
      scheduleSave();
    });
  }
  document.querySelectorAll('[data-zz-back]').forEach((a) => {
    a.addEventListener('click', (ev) => {
      if (dirty && !confirm('Hay cambios sin guardar. ¿Salir igual?')) ev.preventDefault();
    });
  });
}

function setTab(name) {
  activeTab = name;
  document.querySelectorAll('.zz-tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === name));
  document.querySelectorAll('.zz-panel').forEach((p) => p.classList.toggle('is-active', p.dataset.panel === name));
  renderCoach();
}

export async function bootGame(opts) {
  const boot = $('zz-boot');
  const app = $('zz-app');
  const defeat = $('zz-defeat');
  if (defeat) {
    defeat.hidden = true;
    const msg = $('zz-defeat-msg');
    if (msg) msg.textContent = '';
  }
  try {
    content = await loadContent();
  } catch (e) {
    throw new Error('No se pudo cargar content/ (JSON). Revisa red o deploy.');
  }
  slot = opts.slot;
  if (opts.mode === 'new') {
    state = createNewState(content, opts.name || 'Refugio 0');
    if (!livingSurvivors(state).length) {
      throw new Error('Estado inicial sin supervivientes');
    }
    if (state.flags.defeated) {
      throw new Error('Estado inicial marcado como derrota (bug)');
    }
    ensureCoach();
    try {
      const saved = await api.saveSlot(slot, state, state.colonyName, summarizeState(state));
      if (!saved.ok) {
        throw new Error(saved.error || 'save_failed');
      }
      dirty = false;
      if ($('zz-save-state')) $('zz-save-state').textContent = 'Guardado';
    } catch (e) {
      if (e.message === 'auth') throw e;
      throw new Error('No se pudo guardar la partida nueva: ' + (e.message || e));
    }
  } else {
    const res = await api.loadSlot(slot);
    if (!res.ok) throw new Error(res.error || 'load');
    state = migrateState(res.state, content.balance);
    ensureCoach();
  }
  bindChrome();
  if (!state.selectedSurvivorIds.length) {
    const first = livingSurvivors(state)[0];
    if (first) state.selectedSurvivorIds = [first.id];
  }
  if (!state.selectedZoneId) {
    const z =
      state.zones.find((x) => x.state === 'discovered' && x.id !== 'camp') ||
      state.zones.find((x) => x.state === 'discovered' || (x.state === 'controlled' && x.id !== 'camp'));
    if (z) state.selectedZoneId = z.id;
  }
  setTab(opts.mode === 'new' && !state.flags.defeated ? 'people' : 'map');
  paint();
  if (defeat && !state.flags.defeated) {
    defeat.setAttribute('hidden', '');
  }
  if (app) app.removeAttribute('hidden');
  if (boot) boot.setAttribute('hidden', '');
  toast(
    state.flags.defeated
      ? 'Esta partida ya terminó en derrota'
      : `Día ${state.day} · ${livingSurvivors(state).length} supervivientes`,
    state.flags.defeated ? 'bad' : 'good'
  );
}

export async function bootHub() {
  const boot = $('zz-hub-boot');
  const hub = $('zz-hub');
  if (boot) boot.textContent = 'Cargando slots…';
  try {
    const data = await api.fetchSlots();
    if (!data.ok) {
      throw new Error(data.error || 'slots');
    }
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
    if (boot) boot.setAttribute('hidden', '');
    if (hub) hub.removeAttribute('hidden');
  } catch (e) {
    const msg = String(e && e.message ? e.message : e);
    if (msg === 'auth') {
      if (boot) boot.textContent = 'Redirigiendo al login…';
      return;
    }
    let human = 'No se pudieron cargar los slots.';
    if (msg === 'timeout') human = 'La API tardó demasiado (timeout). Reintenta.';
    else if (msg === 'network') human = 'Error de red al hablar con la API.';
    else if (msg === 'db_connection' || msg === 'db_schema') human = 'Error de base de datos. Reintenta en un momento.';
    else if (msg && msg !== 'slots') human += ' (' + msg + ')';
    if (boot) {
      boot.removeAttribute('hidden');
      boot.innerHTML =
        human +
        ' <button type="button" class="zz-btn zz-btn--primary" id="zz-retry-slots">Reintentar</button>';
      const btn = document.getElementById('zz-retry-slots');
      if (btn) btn.addEventListener('click', () => bootHub());
    }
    if (hub) hub.setAttribute('hidden', '');
  }
}
