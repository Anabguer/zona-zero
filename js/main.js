/**
 * Zona Zero v1 — UI principal
 */
import {
  loadContent,
  createNewState,
  livingSurvivors,
  allLiving,
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
  autoAssignWorkers,
  expeditionPreview,
  startResearch,
  buyVehicle,
  continueEndless,
  assignWorker,
  resolveBaseAttack,
} from './sim.js';
import { resolvePendingChoice } from './director.js';
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
  hostile: 'Hostil',
  unknown: 'Desconocido',
};

const RELATION_LABEL = {
  friendly: 'Amistad',
  allied: 'Aliados',
  neutral: 'Neutral',
  wary: 'Cautela',
  hostile: 'Hostil',
  enemy: 'Enemigos',
};

let content = null;
let state = null;
let slot = 1;
let saveTimer = null;
let dirty = false;
let activeTab = 'map';

const $ = (id) => document.getElementById(id);

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function ensureCoach() {
  if (!state.flags.coach) {
    state.flags.coach = {
      people: false,
      explore: false,
      build: false,
      more: false,
      dismissed: false,
    };
  }
}

function eraName() {
  const eras = content?.erasDoc?.eras || [];
  const e = eras[state.era];
  return e?.name || `Era ${state.era}`;
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
  const st = $('zz-save-state');
  if (st) st.textContent = 'Cambios sin guardar…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveNow(), 1600);
}

async function saveNow() {
  if (!state) return;
  try {
    const res = await api.saveSlot(slot, state, state.colonyName, summarizeState(state));
    if (res.ok) {
      dirty = false;
      const st = $('zz-save-state');
      if (st) st.textContent = 'Guardado';
      toast('Partida guardada', 'good');
    } else {
      toast(res.error || 'Error al guardar', 'bad');
    }
  } catch (e) {
    if (e.message !== 'auth') toast('No se pudo guardar', 'bad');
  }
}

function costText(cost) {
  return Object.entries(cost || {})
    .map(([k, v]) => `${v} ${RES_LABEL_UI[k] || RES_LABEL[k] || k}`)
    .join(' · ');
}

function allTechs() {
  const list = [];
  Object.values(content.researchDoc?.branches || {}).forEach((br) => {
    (br.techs || []).forEach((t) => list.push({ ...t, branch: br.name }));
  });
  return list;
}

function canStartTech(tech) {
  if ((state.research.unlocked || []).includes(tech.id)) return false;
  if (state.research.active) return false;
  if ((tech.minEra || 0) > state.era) return false;
  if (tech.requires?.some((r) => !(state.research.unlocked || []).includes(r))) return false;
  return true;
}

function ensureChoiceModal() {
  let modal = $('zz-choice-modal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'zz-choice-modal';
  modal.className = 'zz-choice';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="zz-choice__card">
      <h2 id="zz-choice-title">Decisión</h2>
      <p id="zz-choice-text"></p>
      <div id="zz-choice-actions" class="zz-choice__actions"></div>
    </div>`;
  document.body.appendChild(modal);
  return modal;
}

function ensureVictoryOverlay() {
  let el = $('zz-victory');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'zz-victory';
  el.className = 'zz-victory';
  el.hidden = true;
  el.innerHTML = `
    <div class="zz-victory__card">
      <h2>Victoria</h2>
      <p>Zona Zero está estabilizada. Podéis continuar en modo endless.</p>
      <button type="button" class="zz-btn zz-btn--primary" id="zz-endless">Continuar endless</button>
    </div>`;
  (document.getElementById('zz-app') || document.body).appendChild(el);
  const btn = el.querySelector('#zz-endless');
  if (btn) {
    btn.addEventListener('click', () => {
      const r = continueEndless(state);
      if (!r.ok) toast(r.error, 'bad');
      else {
        toast('Modo endless activado', 'good');
        scheduleSave();
      }
      paint();
    });
  }
  return el;
}

function renderChoiceModal() {
  const modal = ensureChoiceModal();
  const pending = state.pendingChoice;
  if (!pending || state.flags.defeated) {
    modal.hidden = true;
    return;
  }
  const title = $('zz-choice-title');
  const text = $('zz-choice-text');
  const actions = $('zz-choice-actions');
  if (title) title.textContent = pending.name || 'Decisión';
  if (text) text.textContent = pending.text || '';
  if (actions) {
    actions.innerHTML = '';
    (pending.choices || []).forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'zz-btn zz-btn--primary';
      btn.textContent = c.label || c.text || c.id;
      btn.addEventListener('click', () => {
        const r = resolvePendingChoice(state, content, c.id);
        if (r?.attackIntensity) resolveBaseAttack(state, content, r.attackIntensity);
        scheduleSave();
        paint();
      });
      actions.appendChild(btn);
    });
  }
  modal.hidden = false;
}

function renderVictory() {
  const el = ensureVictoryOverlay();
  const show = !!(state.flags.victory && !state.flags.endless && !state.flags.defeated);
  el.hidden = !show;
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
    msg = 'Selecciona supervivientes para la expedición (mira quién explora o produce mejor).';
  } else if (activeTab === 'map' && !c.explore) {
    msg = 'Explora un sector conocido y envía una expedición. Mira el riesgo del equipo.';
  } else if (activeTab === 'base' && !c.build) {
    const wood = state.resources.wood || 0;
    msg =
      wood < 4
        ? 'Necesitas madera para construir. Explora o asigna trabajadores.'
        : 'Elige un edificio y tócalo sobre el terreno libre. Usa Auto-asignar.';
  } else if (activeTab === 'more' && !c.more) {
    msg = 'Aquí investigáis tecnologías, compráis vehículos y seguís las facciones.';
  }
  if (!msg) {
    box.hidden = true;
    return;
  }
  text.textContent = msg;
  box.hidden = false;
}

function renderHud() {
  const alive = allLiving(state);
  const cap = housingCapacity(state, content.buildings);
  const dayEl = $('zz-day');
  const eraEl = $('zz-era');
  const popEl = $('zz-pop');
  const stabEl = $('zz-stability');
  const threatEl = $('zz-threat');
  const defEl = $('zz-defense');
  if (dayEl) dayEl.textContent = String(state.day);
  if (eraEl) eraEl.textContent = eraName();
  if (popEl) popEl.textContent = `${alive.length}/${cap}`;
  if (stabEl) stabEl.textContent = String(Math.round(state.stability || 0));
  if (threatEl) threatEl.textContent = String(Math.round(state.director?.threat || 0));
  if (defEl) defEl.textContent = String(defenseValue(state, content.buildings, content.balance));

  const res = $('zz-resources');
  if (res) {
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
  }

  const colony = $('zz-colony');
  if (colony) colony.textContent = state.colonyName;

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
    const meta = SKILL_META[key] || { label: key, color: '#888' };
    const best = key === bestKey ? ' is-best' : '';
    return `<div class="zz-skill${best}" title="${meta.label}">
      <span class="zz-skill-ico-wrap" data-skill="${key}"></span>
      <span class="zz-skill__bar"><i style="width:${pct}%;background:${meta.color}"></i></span>
      <span class="zz-skill__val">${val}</span>
    </div>`;
  }).join('');
}

function expeditionMax() {
  return (
    (content.balance.expeditionMaxSurvivors || 3) +
    ((state.research?.unlocked || []).includes('log_bigger_teams') ? 1 : 0)
  );
}

function renderPeople() {
  const list = $('zz-people');
  if (!list) return;
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
    const job =
      s.jobBuildingId &&
      (() => {
        const b = state.base.buildings.find((x) => x.id === s.jobBuildingId);
        return b ? content.buildings[b.type]?.name || b.type : null;
      })();
    const statusLabel =
      s.status === 'dead' ? 'Caído' : s.status === 'wounded' ? 'Herido' : 'Listo';

    const avatarWrap = document.createElement('span');
    avatarWrap.appendChild(renderPortraitSvg(s, 52));

    const meta = document.createElement('span');
    meta.className = 'zz-person__meta';
    meta.innerHTML = `
      <span class="zz-person__head">
        <strong>${escapeHtml(s.name)}</strong>
        <span class="zz-person__status">PV ${Math.max(0, Math.round(s.hp))} · ${statusLabel}${busy}${
      job ? ` · ${escapeHtml(job)}` : ''
    }</span>
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
        const max = expeditionMax();
        if (state.selectedSurvivorIds.length >= max) state.selectedSurvivorIds.shift();
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
  if (!bar) return;
  bar.innerHTML = '';

  const autoBtn = document.createElement('button');
  autoBtn.type = 'button';
  autoBtn.className = 'zz-build-btn zz-build-btn--auto';
  autoBtn.innerHTML = '<strong>Auto-asignar</strong><span class="zz-build-desc">Trabajadores a producción</span>';
  autoBtn.addEventListener('click', () => {
    const r = autoAssignWorkers(state, content);
    if (r.ok) {
      toast(`Asignados: ${r.assigned}`, 'good');
      scheduleSave();
    }
    paint();
  });
  bar.appendChild(autoBtn);

  Object.values(content.buildings).forEach((b) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const afford = canAfford(state, b.cost);
    btn.className =
      'zz-build-btn' +
      (state.buildMode === b.id ? ' is-selected' : '') +
      (!afford ? ' is-disabled' : '');
    btn.appendChild(buildingThumb(b.id, 40));
    const name = document.createElement('strong');
    name.textContent = b.name;
    btn.appendChild(name);
    const desc = document.createElement('span');
    desc.className = 'zz-build-desc';
    desc.textContent = b.desc || '';
    btn.appendChild(desc);
    const cost = document.createElement('span');
    cost.className = 'zz-build-cost';
    cost.textContent = costText(b.cost);
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
  if (!box) return;
  box.innerHTML = state.log
    .slice(0, 14)
    .map(
      (e) =>
        `<li class="zz-log__item zz-log__item--${e.kind}"><span>D${e.day}</span>${escapeHtml(e.text)}</li>`
    )
    .join('');
}

function renderExpeditionPanel() {
  const panel = $('zz-zone-panel');
  if (!panel) return;
  const z = state.zones.find((x) => x.id === state.selectedZoneId);
  if (!z || z.state === 'unknown') {
    panel.innerHTML =
      '<p class="zz-muted">Toca un sector conocido en el mapa. La niebla aún oculta el resto.</p>';
    return;
  }
  const ex = state.expedition;
  const badge = ZONE_STATE_LABEL[z.state] || z.state;
  const preview = expeditionPreview(state, content, z.id, state.selectedSurvivorIds);
  const progress = Math.round((z.controlProgress || 0) * 100);
  const riskLine = preview
    ? `Riesgo ${preview.category} (${Math.round(preview.risk * 100)}%) · ${preview.days} día(s)`
    : `Riesgo base ${Math.round(z.risk * 100)}%`;

  panel.innerHTML = `
    <span class="zz-zone-badge zz-zone-badge--${z.state}">${badge}</span>
    <h3>${escapeHtml(z.name)}</h3>
    <p class="zz-muted">${riskLine}</p>
    <p class="zz-muted">Control: ${progress}%</p>
    <div class="zz-progress"><i style="width:${progress}%"></i></div>
    <p>${
      ex
        ? `Expedición en curso → vuelven el día ${ex.returnDay}`
        : 'Elige gente en la pestaña Gente y envía una expedición.'
    }</p>
    <button type="button" class="zz-btn zz-btn--primary" id="zz-send-exp" ${
      ex || state.flags.defeated || z.id === 'camp' || z.type === 'camp' ? 'disabled' : ''
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

function renderMore() {
  const box = $('zz-more');
  if (!box) return;
  box.innerHTML = '';

  const researchSec = document.createElement('section');
  researchSec.className = 'zz-more__sec';
  researchSec.innerHTML = `<h3>Investigación</h3>`;
  if (state.research.active) {
    const active = allTechs().find((t) => t.id === state.research.active);
    const p = document.createElement('p');
    p.className = 'zz-muted';
    p.textContent = `En curso: ${active?.name || state.research.active} (${state.research.progress}/${
      active?.days || '?'
    })`;
    researchSec.appendChild(p);
  }
  const techList = document.createElement('div');
  techList.className = 'zz-more__list';
  allTechs()
    .filter((t) => canStartTech(t))
    .slice(0, 12)
    .forEach((t) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'zz-more__item' + (canAfford(state, t.cost) ? '' : ' is-disabled');
      btn.innerHTML = `<strong>${escapeHtml(t.name)}</strong>
        <span>${escapeHtml(t.desc || '')}</span>
        <span class="zz-build-cost">${escapeHtml(costText(t.cost))} · ${t.days || 1}d</span>`;
      btn.addEventListener('click', () => {
        const r = startResearch(state, content, t.id);
        if (!r.ok) toast(r.error, 'bad');
        else {
          ensureCoach();
          state.flags.coach.more = true;
          toast(`Investigando: ${t.name}`, 'good');
          scheduleSave();
        }
        paint();
      });
      techList.appendChild(btn);
    });
  if (!techList.childNodes.length) {
    const empty = document.createElement('p');
    empty.className = 'zz-muted';
    empty.textContent = state.research.active
      ? 'Esperad a completar la investigación actual.'
      : 'No hay tecnologías disponibles ahora.';
    researchSec.appendChild(empty);
  } else {
    researchSec.appendChild(techList);
  }
  box.appendChild(researchSec);

  const vehSec = document.createElement('section');
  vehSec.className = 'zz-more__sec';
  vehSec.innerHTML = `<h3>Vehículos</h3>`;
  const vehList = document.createElement('div');
  vehList.className = 'zz-more__list';
  (content.vehiclesDoc?.vehicles || []).forEach((v) => {
    const owned = (state.vehiclesOwned || []).includes(v.id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.disabled = owned;
    btn.className = 'zz-more__item' + (owned || !canAfford(state, v.cost) ? ' is-disabled' : '');
    btn.innerHTML = `<strong>${escapeHtml(v.name)}</strong>
      <span>${owned ? 'Ya lo tenéis' : `Era ${v.minEra || 0} · combustible/viaje ${v.fuelPerTrip || 0}`}</span>
      <span class="zz-build-cost">${owned ? 'Poseído' : escapeHtml(costText(v.cost))}</span>`;
    if (!owned) {
      btn.addEventListener('click', () => {
        const r = buyVehicle(state, content, v.id);
        if (!r.ok) toast(r.error, 'bad');
        else {
          ensureCoach();
          state.flags.coach.more = true;
          toast(`Disponible: ${v.name}`, 'good');
          scheduleSave();
        }
        paint();
      });
    }
    vehList.appendChild(btn);
  });
  vehSec.appendChild(vehList);
  box.appendChild(vehSec);

  const facSec = document.createElement('section');
  facSec.className = 'zz-more__sec';
  facSec.innerHTML = `<h3>Facciones</h3>`;
  const facList = document.createElement('ul');
  facList.className = 'zz-factions';
  (state.factions || []).forEach((f) => {
    const li = document.createElement('li');
    const rel = RELATION_LABEL[f.relation] || f.relation || '—';
    li.innerHTML = `<strong>${escapeHtml(f.discovered ? f.name : 'Grupo desconocido')}</strong>
      <span>${escapeHtml(rel)}${f.discovered ? ` · ${escapeHtml(f.trait || '')}` : ''}</span>`;
    facList.appendChild(li);
  });
  if (!facList.childNodes.length) {
    const empty = document.createElement('p');
    empty.className = 'zz-muted';
    empty.textContent = 'Aún no hay contactos regionales.';
    facSec.appendChild(empty);
  } else {
    facSec.appendChild(facList);
  }
  box.appendChild(facSec);
}

function paint() {
  if (!state || !content) return;
  renderHud();
  renderPeople();
  renderBuildBar();
  renderLog();
  renderExpeditionPanel();
  renderMore();
  renderCoach();
  renderChoiceModal();
  renderVictory();
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

function setTab(name) {
  activeTab = name;
  document.querySelectorAll('.zz-tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === name));
  document.querySelectorAll('.zz-panel').forEach((p) => p.classList.toggle('is-active', p.dataset.panel === name));
  renderCoach();
}

function bindChrome() {
  const advance = $('zz-advance');
  if (advance) {
    advance.addEventListener('click', () => {
      if (state.pendingChoice) {
        toast('Resolved la decisión pendiente', 'warn');
        paint();
        return;
      }
      const r = advanceDay(state, content);
      if (!r.ok) toast(r.error, 'bad');
      else {
        const latest = state.log.find((e) => e.day === state.day && e.kind !== 'story');
        if (latest && (latest.kind === 'bad' || latest.kind === 'warn' || latest.kind === 'good')) {
          toast(latest.text, latest.kind === 'bad' ? 'bad' : latest.kind === 'warn' ? 'warn' : 'good');
        } else {
          toast(`Amanece el día ${state.day}`, 'info');
        }
        scheduleSave();
      }
      paint();
    });
  }
  const saveBtn = $('zz-save');
  if (saveBtn) saveBtn.addEventListener('click', () => saveNow());

  const tabMap = $('zz-tab-map');
  const tabBase = $('zz-tab-base');
  const tabPeople = $('zz-tab-people');
  const tabMore = $('zz-tab-more');
  if (tabMap) tabMap.addEventListener('click', () => setTab('map'));
  if (tabBase) tabBase.addEventListener('click', () => setTab('base'));
  if (tabPeople) tabPeople.addEventListener('click', () => setTab('people'));
  if (tabMore) tabMore.addEventListener('click', () => setTab('more'));

  const dismiss = $('zz-coach-dismiss');
  if (dismiss) {
    dismiss.addEventListener('click', () => {
      ensureCoach();
      state.flags.coach.dismissed = true;
      renderCoach();
      scheduleSave();
    });
  }

  const endless = $('zz-endless');
  if (endless) {
    endless.addEventListener('click', () => {
      const r = continueEndless(state);
      if (!r.ok) toast(r.error, 'bad');
      else {
        toast('Modo endless activado', 'good');
        scheduleSave();
      }
      paint();
    });
  }

  document.querySelectorAll('[data-zz-back]').forEach((a) => {
    a.addEventListener('click', (ev) => {
      if (dirty && !confirm('Hay cambios sin guardar. ¿Salir igual?')) ev.preventDefault();
    });
  });
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
    state = migrateState(res.state, content);
    ensureCoach();
  }
  ensureChoiceModal();
  ensureVictoryOverlay();
  bindChrome();
  if (!state.selectedSurvivorIds.length) {
    const first = livingSurvivors(state)[0];
    if (first) state.selectedSurvivorIds = [first.id];
  }
  if (!state.selectedZoneId) {
    const z =
      state.zones.find((x) => x.state === 'discovered' && x.id !== 'camp') ||
      state.zones.find((x) => x.state === 'hostile') ||
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
      : state.flags.victory && !state.flags.endless
        ? 'Victoria alcanzada'
        : `Día ${state.day} · ${allLiving(state).length} supervivientes`,
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
