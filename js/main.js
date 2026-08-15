/**
 * Zona Zero 1.1 — experiencia de juego (UI principal)
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
  unassignWorker,
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
  familyIcon,
  FAMILY_ICONS,
} from './icons.js';
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
  parts: 'Piezas',
  tools: 'Herramientas',
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

const WEATHER_LABEL = {
  clear: 'Despejado',
  rain: 'Lluvia',
  storm: 'Tormenta',
  fog: 'Niebla',
  cold: 'Frío',
  heat: 'Calor',
};

const WEAPON_OPTS = [
  { id: 'none', label: 'Sin arma' },
  { id: 'basic', label: 'Básica' },
  { id: 'improved', label: 'Mejorada' },
];

const ARMOR_OPTS = [
  { id: 'none', label: 'Sin armadura' },
  { id: 'light', label: 'Ligera' },
  { id: 'heavy', label: 'Pesada' },
];

const PEOPLE_FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'libres', label: 'Libres' },
  { id: 'heridos', label: 'Heridos' },
  { id: 'explorar', label: 'Explorar', skill: 'scout' },
  { id: 'construir', label: 'Construir', skill: 'build' },
  { id: 'producir', label: 'Producir', skill: 'produce' },
  { id: 'defender', label: 'Defender', skill: 'fight' },
];

const COACH_ORDER = ['foodWarn', 'pickPeople', 'sendExp', 'waitReturn', 'firstBuild', 'done'];

const ATTACK_LABEL = {
  win: 'Ataque repelido',
  messy: 'Ataque contenido con pérdidas',
  lose: 'El perímetro cede',
};

let content = null;
let state = null;
let slot = 1;
let saveTimer = null;
let dirty = false;
let activeTab = 'map';
let peopleFilter = 'todos';
let peopleSort = 'scout';
let pulseSelector = null;
let lastExpeditionResult = null;
let lastAttackResult = null;
let eventCardTimer = null;
let chromeBound = false;

const $ = (id) => document.getElementById(id);

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function appRoot() {
  return $('zz-app') || document.body;
}

function ensureEl(id, tag, className, parent) {
  let el = $(id);
  if (el) return el;
  el = document.createElement(tag || 'div');
  el.id = id;
  if (className) el.className = className;
  (parent || appRoot()).appendChild(el);
  return el;
}

function toast(msg, kind = 'info') {
  const el = ensureEl('zz-toast', 'div', 'zz-toast', document.body);
  el.textContent = msg;
  el.dataset.kind = kind;
  el.hidden = false;
  if (kind === 'good') sfx.good?.();
  else if (kind === 'bad') sfx.bad?.();
  else if (kind === 'warn') sfx.alert?.();
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.hidden = true;
  }, 2800);
}

function flashBody(kind = 'era') {
  document.body.classList.remove('zz-flash', 'zz-flash--era', 'zz-flash--victory', 'zz-flash--attack');
  void document.body.offsetWidth;
  document.body.classList.add('zz-flash', `zz-flash--${kind}`);
  clearTimeout(flashBody._t);
  flashBody._t = setTimeout(() => {
    document.body.classList.remove('zz-flash', 'zz-flash--era', 'zz-flash--victory', 'zz-flash--attack');
  }, 900);
}

function scheduleSave() {
  dirty = true;
  const st = $('zz-save-state');
  if (st) st.textContent = 'Cambios sin guardar…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveNow(true), 1600);
}

async function saveNow(quiet = false) {
  if (!state) return;
  try {
    const res = await api.saveSlot(slot, state, state.colonyName, summarizeState(state));
    if (res.ok) {
      dirty = false;
      const st = $('zz-save-state');
      if (st) st.textContent = 'Guardado';
      if (!quiet) toast('Partida guardada', 'good');
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
  Object.entries(content.researchDoc?.branches || {}).forEach(([branchId, br]) => {
    (br.techs || []).forEach((t) => list.push({ ...t, branch: br.name, branchId }));
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

function techStatus(tech) {
  if ((state.research.unlocked || []).includes(tech.id)) return 'unlocked';
  if (state.research.active === tech.id) return 'active';
  if ((tech.minEra || 0) > state.era) return 'locked';
  if (tech.requires?.some((r) => !(state.research.unlocked || []).includes(r))) return 'locked';
  return 'available';
}

function eraName(idx = state.era) {
  const eras = content?.erasDoc?.eras || [];
  const e = eras[idx];
  return e?.name || `Era ${idx}`;
}

function traitName(s) {
  const t = (content.survivorsDoc?.traits || []).find((x) => x.id === s.traitId);
  return t?.name || null;
}

function jobLabel(s) {
  if (!s.jobBuildingId) return null;
  const b = state.base.buildings.find((x) => x.id === s.jobBuildingId);
  return b ? content.buildings[b.type]?.name || b.type : null;
}

function isFree(s) {
  return s.status !== 'dead' && (s.busyUntilDay || 0) <= state.day;
}

function expeditionMax() {
  return (
    (content.balance.expeditionMaxSurvivors || 3) +
    ((state.research?.unlocked || []).includes('log_bigger_teams') ? 1 : 0)
  );
}

function ensureCoach() {
  if (!state.flags) state.flags = {};
  const c = state.flags.coach;
  if (!c || typeof c !== 'object') {
    state.flags.coach = { step: 'foodWarn', dismissed: false };
    return state.flags.coach;
  }
  if (!c.step) {
    // migrar coach antiguo (people/explore/build)
    let step = 'foodWarn';
    if (c.dismissed) step = 'done';
    else if (c.build) step = 'done';
    else if (c.explore) step = 'firstBuild';
    else if (c.people) step = 'sendExp';
    state.flags.coach = { step, dismissed: !!c.dismissed };
  }
  return state.flags.coach;
}

function coachAdvance(to) {
  const c = ensureCoach();
  if (c.dismissed || c.step === 'done') return;
  const from = COACH_ORDER.indexOf(c.step);
  const dest = COACH_ORDER.indexOf(to);
  if (dest >= 0 && dest > from) c.step = to;
}

function syncCoachFromState() {
  const c = ensureCoach();
  if (c.dismissed || c.step === 'done') return;
  const food = state.resources.food || 0;
  const pop = allLiving(state).length;
  const foodOk = food >= Math.max(3, pop);
  if (c.step === 'foodWarn' && foodOk) coachAdvance('pickPeople');
  if (state.selectedSurvivorIds?.length >= 1) coachAdvance('sendExp');
  if (state.expedition) coachAdvance('waitReturn');
  if (!state.expedition && state.stats?.expeditions > 0) coachAdvance('firstBuild');
  if ((state.stats?.buildingsBuilt || 0) > 3) coachAdvance('done');
}

function clearPulse() {
  document.querySelectorAll('.zz-pulse').forEach((el) => el.classList.remove('zz-pulse'));
  pulseSelector = null;
}

function applyPulse(selector) {
  clearPulse();
  pulseSelector = selector;
  if (!selector) return;
  document.querySelectorAll(selector).forEach((el) => el.classList.add('zz-pulse'));
}

function coachMessage() {
  const c = ensureCoach();
  if (c.dismissed || c.step === 'done' || state.flags.defeated) return null;
  const food = state.resources.food || 0;
  const pop = allLiving(state).length;
  switch (c.step) {
    case 'foodWarn':
      if (food < Math.max(3, pop)) {
        return {
          text: 'La comida es crítica. Priorizad recolección o enviad una expedición a sectores con botín.',
          pulse: '#zz-resources [data-res="food"], #zz-tab-map',
        };
      }
      return {
        text: 'Tenéis reservas. Formad un equipo en Gente: mirad quién explora y defiende mejor.',
        pulse: '#zz-tab-people',
      };
    case 'pickPeople':
      return {
        text: 'En Gente, elegid hasta 3 libres. Usad «Sugerir equipo» si dudáis.',
        pulse: '#zz-tab-people, #zz-suggest-team, #zz-people-filters',
      };
    case 'sendExp':
      return {
        text: 'En el Mapa, abrid un sector conocido, equipad el equipo y pulsad Enviar.',
        pulse: '#zz-tab-map, #zz-send-exp, #zz-zone-panel',
      };
    case 'waitReturn':
      return {
        text: 'La expedición está fuera. Avanzad el día hasta que regresen.',
        pulse: '#zz-advance',
      };
    case 'firstBuild':
      return {
        text: 'Con madera y metal, construid en Base. Autoasignar coloca a la gente en trabajos.',
        pulse: '#zz-tab-base, #zz-build-bar .zz-build-btn--auto',
      };
    default:
      return null;
  }
}

function renderCoach() {
  syncCoachFromState();
  const box = ensureEl('zz-coach', 'p', 'zz-coach');
  if (!box.querySelector('#zz-coach-text')) {
    box.innerHTML = `<span id="zz-coach-text"></span><button type="button" id="zz-coach-dismiss" aria-label="Cerrar">×</button>`;
    const dismiss = box.querySelector('#zz-coach-dismiss');
    if (dismiss && !dismiss._zzBound) {
      dismiss._zzBound = true;
      dismiss.addEventListener('click', () => {
        ensureCoach().dismissed = true;
        clearPulse();
        renderCoach();
        scheduleSave();
      });
    }
  }
  const text = $('zz-coach-text');
  const tip = coachMessage();
  if (!tip || !text) {
    box.hidden = true;
    clearPulse();
    return;
  }
  text.textContent = tip.text;
  box.hidden = false;
  applyPulse(tip.pulse);
}

function setWeatherAttr() {
  document.body.dataset.weather = state.weather || 'clear';
  const badge = $('zz-weather');
  if (badge) {
    const w = state.weather || 'clear';
    badge.textContent = WEATHER_LABEL[w] || w;
    badge.dataset.weather = w;
    badge.hidden = false;
  }
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

  setWeatherAttr();

  const res = $('zz-resources');
  if (res) {
    res.innerHTML = '';
    const order = content.balance.resourceOrder || Object.keys(state.resources);
    order.forEach((k) => {
      if (state.resources[k] == null) return;
      const li = document.createElement('li');
      li.dataset.res = k;
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
    }
  }

  const soundBtn = $('zz-sound');
  if (soundBtn) {
    const on = isSoundEnabled();
    soundBtn.textContent = on ? 'Sonido' : 'Mudo';
    soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    soundBtn.classList.toggle('is-off', !on);
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

function hpBarHtml(s) {
  const hp = Math.max(0, Math.round(s.hp || 0));
  const max = Math.max(hp, 100);
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  const cls = hp <= 30 ? 'is-low' : hp <= 60 ? 'is-mid' : 'is-ok';
  return `<div class="zz-hp ${cls}" title="PV ${hp}"><i style="width:${pct}%"></i><span>${hp}</span></div>`;
}

function filteredPeople() {
  let list = [...state.survivors];
  const f = PEOPLE_FILTERS.find((x) => x.id === peopleFilter) || PEOPLE_FILTERS[0];
  if (f.id === 'libres') list = list.filter((s) => isFree(s) && s.status !== 'wounded');
  else if (f.id === 'heridos') list = list.filter((s) => s.status === 'wounded');
  else if (f.skill) {
    list = list.filter((s) => s.status !== 'dead');
    peopleSort = f.skill;
  }
  list.sort((a, b) => {
    if (a.status === 'dead' && b.status !== 'dead') return 1;
    if (b.status === 'dead' && a.status !== 'dead') return -1;
    return (b.skills[peopleSort] || 0) - (a.skills[peopleSort] || 0);
  });
  return list;
}

function suggestTeam() {
  const max = expeditionMax();
  const free = livingSurvivors(state).filter((s) => isFree(s));
  const scored = free
    .map((s) => ({
      s,
      score: (s.skills.scout || 0) * 1.2 + (s.skills.fight || 0) * 1.1 + (s.skills.gather || 0) * 0.3,
    }))
    .sort((a, b) => b.score - a.score);
  const picked = scored.slice(0, max).map((x) => x.s);
  picked.forEach((s) => {
    if (s.jobBuildingId) unassignWorker(state, s.id);
  });
  state.selectedSurvivorIds = picked.map((s) => s.id);
  if (state.selectedSurvivorIds.length) {
    coachAdvance('sendExp');
    toast(`Equipo sugerido: ${state.selectedSurvivorIds.length}`, 'good');
  } else {
    toast('Nadie libre para explorar', 'warn');
  }
}

function renderPeopleFilters() {
  let wrap = $('zz-people-filters');
  const panel = document.querySelector('[data-panel="people"]');
  if (!wrap && panel) {
    wrap = document.createElement('div');
    wrap.id = 'zz-people-filters';
    wrap.className = 'zz-people-filters';
    panel.insertBefore(wrap, panel.firstChild);
  }
  if (!wrap) return;
  wrap.innerHTML = '';
  PEOPLE_FILTERS.forEach((f) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'zz-chip' + (peopleFilter === f.id ? ' is-active' : '');
    btn.textContent = f.label;
    btn.addEventListener('click', () => {
      peopleFilter = f.id;
      if (f.skill) peopleSort = f.skill;
      sfx.click?.();
      paint();
    });
    wrap.appendChild(btn);
  });

  let suggest = $('zz-suggest-team');
  if (!suggest) {
    suggest = document.createElement('button');
    suggest.type = 'button';
    suggest.id = 'zz-suggest-team';
    suggest.className = 'zz-btn zz-btn--compact zz-suggest-team';
    wrap.after(suggest);
  }
  suggest.textContent = 'Sugerir equipo';
  if (!suggest._zzBound) {
    suggest._zzBound = true;
    suggest.addEventListener('click', () => {
      suggestTeam();
      scheduleSave();
      paint();
    });
  }
}

function renderPeople() {
  renderPeopleFilters();
  const list = $('zz-people');
  if (!list) return;
  list.innerHTML = '';
  filteredPeople().forEach((s) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'zz-person' +
      (state.selectedSurvivorIds.includes(s.id) ? ' is-selected' : '') +
      (s.status === 'dead' ? ' is-dead' : '') +
      (s.status === 'wounded' ? ' is-wounded' : '');
    btn.disabled = s.status === 'dead';

    const busy = (s.busyUntilDay || 0) > state.day ? ' · en expedición' : '';
    const job = jobLabel(s);
    const trait = traitName(s);
    const statusLabel =
      s.status === 'dead' ? 'Caído' : s.status === 'wounded' ? 'Herido' : isFree(s) ? 'Libre' : 'Ocupado';

    const avatarWrap = document.createElement('span');
    avatarWrap.className = 'zz-person__avatar';
    avatarWrap.appendChild(renderPortraitSvg(s, 52));

    const meta = document.createElement('span');
    meta.className = 'zz-person__meta';
    meta.innerHTML = `
      <span class="zz-person__head">
        <strong>${escapeHtml(s.name)}</strong>
        <span class="zz-person__status">${escapeHtml(statusLabel)}${busy}</span>
      </span>
      <span class="zz-person__sub">
        ${trait ? `<em>${escapeHtml(trait)}</em>` : '<em>Sin rasgo</em>'}
        ${job ? ` · ${escapeHtml(job)}` : ' · Sin trabajo'}
      </span>
      ${hpBarHtml(s)}
      <div class="zz-skills">${skillBarsHtml(s)}</div>`;

    btn.appendChild(avatarWrap);
    btn.appendChild(meta);
    meta.querySelectorAll('[data-skill]').forEach((el) => {
      el.replaceWith(skillIcon(el.getAttribute('data-skill'), 13));
    });

    btn.addEventListener('click', () => {
      if (s.status === 'dead') return;
      sfx.click?.();
      const i = state.selectedSurvivorIds.indexOf(s.id);
      if (i >= 0) state.selectedSurvivorIds.splice(i, 1);
      else {
        const max = expeditionMax();
        if (state.selectedSurvivorIds.length >= max) state.selectedSurvivorIds.shift();
        state.selectedSurvivorIds.push(s.id);
      }
      if (state.selectedSurvivorIds.length >= 1) coachAdvance('sendExp');
      scheduleSave();
      paint();
    });
    list.appendChild(btn);
  });
}

function buildingMetaLine(b) {
  const bits = [];
  if (b.produces) {
    const prod = Object.entries(b.produces)
      .map(([k, v]) => `+${v} ${RES_LABEL_UI[k] || RES_LABEL[k] || k}`)
      .join(', ');
    bits.push(prod);
  }
  if (b.jobs) bits.push(`${b.jobs} puestos`);
  if (b.defense) bits.push(`Def +${b.defense}`);
  if (b.housing) bits.push(`Camas +${b.housing}`);
  if (b.minEra) bits.push(`Era ${b.minEra}+`);
  if (b.upgradeFrom) {
    const from = content.buildings[b.upgradeFrom]?.name || b.upgradeFrom;
    bits.push(`Mejora de ${from}`);
  }
  return bits.join(' · ');
}

function renderBuildBar() {
  const bar = $('zz-build-bar');
  if (!bar) return;
  bar.innerHTML = '';

  const autoBtn = document.createElement('button');
  autoBtn.type = 'button';
  autoBtn.className = 'zz-build-btn zz-build-btn--auto';
  autoBtn.innerHTML =
    '<strong>Autoasignar</strong><span class="zz-build-desc">Trabajadores a producción</span>';
  autoBtn.addEventListener('click', () => {
    const r = autoAssignWorkers(state, content);
    if (r.ok) {
      toast(`Asignados: ${r.assigned}`, 'good');
      scheduleSave();
    } else toast(r.error || 'Nada que asignar', 'warn');
    paint();
  });
  bar.appendChild(autoBtn);

  Object.values(content.buildings).forEach((b) => {
    if (b.category === 'core' && String(b.id).startsWith('hq_central') && b.id !== 'hq_central_l1') {
      // mostrar mejoras HQ
    }
    const afford = canAfford(state, b.cost);
    const eraOk = (b.minEra || 0) <= state.era;
    const count = state.base.buildings.filter((x) => x.type === b.id && x.hp > 0).length;
    const maxed = b.max != null && count >= b.max;
    // Ocultar mejoras si no existe el edificio base
    if (b.upgradeFrom) {
      const hasFrom = state.base.buildings.some((x) => x.type === b.upgradeFrom && x.hp > 0);
      if (!hasFrom) return;
    }
    // Ocultar edificios ya al máximo (salvo HQ visible)
    if (maxed && !String(b.id).includes('hq_central')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.build = b.id;
    btn.className =
      'zz-build-btn' +
      (state.buildMode === b.id ? ' is-selected zz-pulse' : '') +
      (!afford || !eraOk ? ' is-disabled' : '');
    btn.appendChild(buildingThumb(b.id, 40));
    const name = document.createElement('strong');
    name.textContent = b.name;
    btn.appendChild(name);
    const desc = document.createElement('span');
    desc.className = 'zz-build-desc';
    desc.textContent = b.desc || buildingMetaLine(b);
    btn.appendChild(desc);
    const meta = document.createElement('span');
    meta.className = 'zz-build-meta';
    meta.textContent = buildingMetaLine(b);
    btn.appendChild(meta);
    const cost = document.createElement('span');
    cost.className = 'zz-build-cost';
    cost.textContent = costText(b.cost) || 'Gratis';
    btn.appendChild(cost);
    btn.addEventListener('click', () => {
      sfx.click?.();
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
    .slice(0, 10)
    .map(
      (e) =>
        `<li class="zz-log__item zz-log__item--${e.kind}"><span>D${e.day}</span>${escapeHtml(e.text)}</li>`
    )
    .join('');
}

function equipRecommended() {
  if (!state.equipment) state.equipment = { weapon: 'none', armor: 'none', vehicleId: null };
  state.equipment.weapon = 'improved';
  state.equipment.armor = 'heavy';
  const owned = state.vehiclesOwned || [];
  const vehList = content.vehiclesDoc?.vehicles || [];
  let best = null;
  let bestScore = -1;
  owned.forEach((id) => {
    const v = vehList.find((x) => x.id === id);
    if (!v) return;
    const score = (v.protection || 0) * 2 + (v.speedBonus || 0) * 10 + (v.cargoBonus || 0) * 5;
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  });
  state.equipment.vehicleId = best;
  toast('Equipo recomendado aplicado', 'good');
}

function lootKeysForZone(z) {
  const bias = z.loot || content.locationsDoc?.locationTypes?.[z.type]?.lootBias || {};
  const keys = Object.keys(bias).map((k) => (k === 'scrap' ? 'metal' : k));
  return [...new Set(keys)].slice(0, 5);
}

function renderExpeditionResultCard(panel) {
  if (!lastExpeditionResult) return false;
  const r = lastExpeditionResult;
  panel.innerHTML = `
    <div class="zz-exp-result zz-exp-result--${escapeHtml(r.kind || 'info')}">
      <span class="zz-zone-badge">Regreso</span>
      <h3>${escapeHtml(r.zoneName || 'Expedición')}</h3>
      <p>${escapeHtml(r.text)}</p>
      <button type="button" class="zz-btn zz-btn--compact" id="zz-dismiss-exp-result">Entendido</button>
    </div>`;
  const btn = panel.querySelector('#zz-dismiss-exp-result');
  if (btn) {
    btn.addEventListener('click', () => {
      lastExpeditionResult = null;
      paint();
    });
  }
  return true;
}

function renderExpeditionPanel() {
  const panel = $('zz-zone-panel');
  if (!panel) return;

  if (lastExpeditionResult && renderExpeditionResultCard(panel)) return;

  const z = state.zones.find((x) => x.id === state.selectedZoneId);
  if (!z || z.state === 'unknown') {
    panel.innerHTML =
      '<p class="zz-muted">Toca un sector conocido en el mapa. La niebla aún oculta el resto.</p>';
    return;
  }

  const ex = state.expedition;
  if (ex) {
    const ez = state.zones.find((x) => x.id === ex.zoneId) || z;
    const left = Math.max(0, ex.returnDay - state.day);
    panel.innerHTML = `
      <div class="zz-exp-status">
        <span class="zz-zone-badge zz-zone-badge--hostile">En ruta</span>
        <h3>${escapeHtml(ez.name)}</h3>
        <p>Equipo: ${(ex.survivorIds || [])
          .map((id) => state.survivors.find((s) => s.id === id)?.name || '?')
          .join(', ')}</p>
        <p class="zz-muted">Vuelven el día ${ex.returnDay} · ${left === 0 ? 'hoy al avanzar' : `${left} día(s)`}</p>
        <p class="zz-muted">Riesgo estimado: ${Math.round((ex.risk || 0) * 100)}%</p>
      </div>`;
    return;
  }

  if (!state.equipment) state.equipment = { weapon: 'none', armor: 'none', vehicleId: null };
  const badge = ZONE_STATE_LABEL[z.state] || z.state;
  const preview = expeditionPreview(state, content, z.id, state.selectedSurvivorIds);
  const progress = Math.round((z.controlProgress || 0) * 100);
  const typeName = content.locationsDoc?.locationTypes?.[z.type]?.name || z.type;
  const loot = lootKeysForZone(z);
  const teamNames = state.selectedSurvivorIds
    .map((id) => state.survivors.find((s) => s.id === id)?.name)
    .filter(Boolean);
  const canSend = !state.flags.defeated && z.id !== 'camp' && z.type !== 'camp';

  const weaponHtml = WEAPON_OPTS.map(
    (o) =>
      `<button type="button" class="zz-chip${state.equipment.weapon === o.id ? ' is-active' : ''}" data-weapon="${o.id}">${o.label}</button>`
  ).join('');
  const armorHtml = ARMOR_OPTS.map(
    (o) =>
      `<button type="button" class="zz-chip${state.equipment.armor === o.id ? ' is-active' : ''}" data-armor="${o.id}">${o.label}</button>`
  ).join('');
  const vehOpts = [
    `<option value="">A pie</option>`,
    ...(state.vehiclesOwned || []).map((id) => {
      const v = content.vehiclesDoc?.vehicles?.find((x) => x.id === id);
      const sel = state.equipment.vehicleId === id ? ' selected' : '';
      return `<option value="${escapeHtml(id)}"${sel}>${escapeHtml(v?.name || id)}</option>`;
    }),
  ].join('');

  panel.innerHTML = `
    <span class="zz-zone-badge zz-zone-badge--${z.state}">${badge}</span>
    <h3>${escapeHtml(z.name)}</h3>
    <p class="zz-muted">${escapeHtml(typeName)} · Distancia ~${preview?.days || 1} día(s)</p>
    <p class="zz-muted">Riesgo <strong>${preview?.category || '—'}</strong> (${Math.round((preview?.risk || z.risk) * 100)}%)</p>
    <p class="zz-muted">Control: ${progress}%</p>
    <div class="zz-progress"><i style="width:${progress}%"></i></div>
    ${
      z.infectedLeft != null && z.state !== 'controlled'
        ? `<p class="zz-muted">Infectados estimados: ${z.infectedLeft}</p>`
        : ''
    }
    <p class="zz-loot-keys">Botín probable: ${
      loot.length
        ? loot.map((k) => RES_LABEL_UI[k] || RES_LABEL[k] || k).join(', ')
        : 'incierto'
    }</p>
    <p class="zz-muted">Equipo: ${teamNames.length ? teamNames.join(', ') : 'nadie seleccionado'}</p>
    <div class="zz-equip">
      <div class="zz-equip__row"><span>Arma</span><div class="zz-chips">${weaponHtml}</div></div>
      <div class="zz-equip__row"><span>Armadura</span><div class="zz-chips">${armorHtml}</div></div>
      <div class="zz-equip__row"><span>Vehículo</span>
        <select id="zz-veh-select" class="zz-select">${vehOpts}</select>
      </div>
    </div>
    <div class="zz-exp-actions">
      <button type="button" class="zz-btn zz-btn--compact" id="zz-equip-rec">Equipar recomendado</button>
      <button type="button" class="zz-btn zz-btn--primary" id="zz-send-exp" ${canSend ? '' : 'disabled'}>Enviar</button>
    </div>`;

  panel.querySelectorAll('[data-weapon]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.equipment.weapon = btn.getAttribute('data-weapon');
      sfx.click?.();
      paint();
    });
  });
  panel.querySelectorAll('[data-armor]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.equipment.armor = btn.getAttribute('data-armor');
      sfx.click?.();
      paint();
    });
  });
  const vehSel = panel.querySelector('#zz-veh-select');
  if (vehSel) {
    vehSel.addEventListener('change', () => {
      state.equipment.vehicleId = vehSel.value || null;
      paint();
    });
  }
  const rec = panel.querySelector('#zz-equip-rec');
  if (rec) {
    rec.addEventListener('click', () => {
      equipRecommended();
      scheduleSave();
      paint();
    });
  }
  const send = panel.querySelector('#zz-send-exp');
  if (send) {
    send.addEventListener('click', () => {
      const r = startExpedition(state, content, z.id, state.selectedSurvivorIds);
      if (!r.ok) toast(r.error, 'bad');
      else {
        coachAdvance('waitReturn');
        sfx.expedition?.();
        toast('Expedición enviada', 'good');
        scheduleSave();
      }
      paint();
    });
  }
}

function showEventCard(ev) {
  // Calma / rutina: no modal — solo diario
  const family = ev.family || 'scout';
  const intensity = ev.intensity == null ? 1 : ev.intensity;
  if (family === 'calma' && intensity <= 0) return;
  if (/rutinari|en calma|noche en calma/i.test(ev.name || '')) return;

  const card = ensureEl('zz-event-card', 'div', 'zz-event-card');
  card.className = `zz-event-card zz-event--${family}`;
  card.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'zz-event-card__head';
  try {
    head.appendChild(familyIcon(family, 20));
  } catch {
    const fn = FAMILY_ICONS[family];
    if (fn) head.appendChild(fn(20));
  }
  const title = document.createElement('strong');
  title.textContent = ev.name || 'Suceso';
  head.appendChild(title);
  const p = document.createElement('p');
  p.textContent = ev.brief || ev.desc || ev.name || 'Algo ocurre en la zona.';
  card.appendChild(head);
  card.appendChild(p);
  card.hidden = false;
  clearTimeout(eventCardTimer);
  eventCardTimer = setTimeout(() => {
    card.hidden = true;
  }, 4200);
}

function showAttackCard(result) {
  lastAttackResult = result;
  const card = ensureEl('zz-attack-card', 'div', 'zz-attack-card');
  card.className = `zz-attack-card zz-attack-card--${result}`;
  card.innerHTML = `<strong>${ATTACK_LABEL[result] || 'Ataque'}</strong><p>Revisad heridos, defensa y el diario.</p>`;
  card.hidden = false;
  sfx.attack?.();
  flashBody('attack');
  clearTimeout(showAttackCard._t);
  showAttackCard._t = setTimeout(() => {
    card.hidden = true;
  }, 3500);
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
      <div class="zz-choice__head" id="zz-choice-head"></div>
      <h2 id="zz-choice-title">Decisión</h2>
      <p id="zz-choice-text"></p>
      <div id="zz-choice-actions" class="zz-choice__actions"></div>
    </div>`;
  document.body.appendChild(modal);
  return modal;
}

function renderChoiceModal() {
  const modal = ensureChoiceModal();
  const pending = state.pendingChoice;
  if (!pending || state.flags.defeated) {
    modal.hidden = true;
    return;
  }
  const family = pending.family || 'scout';
  const card = modal.querySelector('.zz-choice__card');
  if (card) {
    card.className = `zz-choice__card zz-event--${family}`;
  }
  const head = $('zz-choice-head');
  if (head) {
    head.innerHTML = '';
    try {
      head.appendChild(familyIcon(family, 22));
    } catch {
      /* ignore */
    }
    const famLab = document.createElement('span');
    famLab.textContent = family;
    head.appendChild(famLab);
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
        const logBefore = state.log.length;
        const r = resolvePendingChoice(state, content, c.id);
        if (r?.attackIntensity) {
          const atk = resolveBaseAttack(state, content, r.attackIntensity);
          showAttackCard(atk);
        }
        const newLogs = state.log.slice(0, Math.max(0, state.log.length - logBefore)).reverse();
        newLogs
          .filter((e) => e.kind !== 'story')
          .slice(0, 3)
          .forEach((e) => toast(e.text, e.kind === 'bad' ? 'bad' : e.kind === 'warn' ? 'warn' : 'good'));
        scheduleSave();
        paint();
      });
      actions.appendChild(btn);
    });
  }
  modal.hidden = false;
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
  appRoot().appendChild(el);
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

function renderVictory() {
  const el = ensureVictoryOverlay();
  const show = !!(state.flags.victory && !state.flags.endless && !state.flags.defeated);
  el.hidden = !show;
}

function nextEraObjectives() {
  const eras = content.erasDoc?.eras || [];
  const next = eras[state.era + 1];
  if (!next) return [];
  const u = next.unlock || {};
  const pop = allLiving(state).length;
  const controlled = state.zones.filter((z) => z.state === 'controlled').length;
  const tech = (state.research.unlocked || []).length;
  const items = [];
  if (u.minPop != null) {
    items.push({
      label: `Población ${pop}/${u.minPop}`,
      ok: pop >= u.minPop,
    });
  }
  if (u.minControlled != null) {
    items.push({
      label: `Sectores controlados ${controlled}/${u.minControlled}`,
      ok: controlled >= u.minControlled,
    });
  }
  if (u.minResearch != null) {
    items.push({
      label: `Tecnologías ${tech}/${u.minResearch}`,
      ok: tech >= u.minResearch,
    });
  }
  if (u.minDay != null) {
    items.push({
      label: `Día ${state.day}/${u.minDay}`,
      ok: state.day >= u.minDay,
    });
  }
  return items;
}

function renderProgress() {
  let panel = document.querySelector('[data-panel="progress"]');
  if (!panel) {
    const main = document.querySelector('.zz-main');
    if (!main) return;
    panel = document.createElement('section');
    panel.className = 'zz-panel';
    panel.dataset.panel = 'progress';
    panel.innerHTML = '<div id="zz-progress-panel" class="zz-progress-panel"></div>';
    main.appendChild(panel);
  }
  let box = $('zz-progress-panel');
  if (!box) {
    box = document.createElement('div');
    box.id = 'zz-progress-panel';
    box.className = 'zz-progress-panel';
    panel.appendChild(box);
  }
  const eras = content.erasDoc?.eras || [];
  const track = document.createElement('div');
  track.className = 'zz-era-track';
  eras.forEach((e, idx) => {
    const node = document.createElement('div');
    node.className =
      'zz-era-node' +
      (idx < state.era ? ' is-done' : '') +
      (idx === state.era ? ' is-current' : '') +
      (idx > state.era ? ' is-locked' : '');
    node.innerHTML = `<strong>${idx}</strong><span>${escapeHtml(e.name)}</span>`;
    track.appendChild(node);
  });

  const objs = nextEraObjectives();
  const list = document.createElement('ul');
  list.className = 'zz-objectives';
  if (!objs.length) {
    const li = document.createElement('li');
    li.className = 'is-ok';
    li.textContent = 'Máxima era alcanzada. Mantened la zona estable.';
    list.appendChild(li);
  } else {
    objs.forEach((o) => {
      const li = document.createElement('li');
      li.className = o.ok ? 'is-ok' : 'is-pending';
      li.textContent = (o.ok ? '✓ ' : '○ ') + o.label;
      list.appendChild(li);
    });
  }

  box.innerHTML = '';
  box.appendChild(track);
  const h = document.createElement('h3');
  h.textContent = objs.length ? `Objetivos → ${eraName(state.era + 1)}` : 'Objetivos';
  box.appendChild(h);
  box.appendChild(list);
}

function notifyNewFactions() {
  if (!state.flags.seenFactions) state.flags.seenFactions = {};
  (state.factions || []).forEach((f) => {
    if (f.discovered && !state.flags.seenFactions[f.id]) {
      state.flags.seenFactions[f.id] = true;
      toast(`Contacto: ${f.name}`, 'info');
      sfx.discover?.();
    }
  });
}

function renderMore() {
  const box = $('zz-more');
  if (!box) return;
  box.innerHTML = '';

  const researchSec = document.createElement('section');
  researchSec.className = 'zz-more__sec';
  researchSec.innerHTML = '<h3>Investigación</h3>';
  if (state.research.active) {
    const active = allTechs().find((t) => t.id === state.research.active);
    const p = document.createElement('p');
    p.className = 'zz-muted';
    p.textContent = `En curso: ${active?.name || state.research.active} (${state.research.progress}/${
      active?.days || '?'
    })`;
    researchSec.appendChild(p);
  }
  Object.entries(content.researchDoc?.branches || {}).forEach(([, br]) => {
    const branch = document.createElement('div');
    branch.className = 'zz-research-branch';
    branch.innerHTML = `<h4>${escapeHtml(br.name)}</h4>`;
    const grid = document.createElement('div');
    grid.className = 'zz-research-grid';
    (br.techs || []).forEach((t) => {
      const st = techStatus(t);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `zz-tech-card is-${st}`;
      card.disabled = st !== 'available';
      card.innerHTML = `<strong>${escapeHtml(t.name)}</strong>
        <span>${escapeHtml(t.desc || '')}</span>
        <span class="zz-build-cost">${
          st === 'unlocked'
            ? 'Desbloqueada'
            : st === 'active'
              ? 'En curso'
              : st === 'locked'
                ? 'Bloqueada'
                : `${escapeHtml(costText(t.cost))} · ${t.days || 1}d`
        }</span>`;
      if (st === 'available') {
        card.addEventListener('click', () => {
          const r = startResearch(state, content, t.id);
          if (!r.ok) toast(r.error, 'bad');
          else {
            toast(`Investigando: ${t.name}`, 'good');
            scheduleSave();
          }
          paint();
        });
      }
      grid.appendChild(card);
    });
    branch.appendChild(grid);
    researchSec.appendChild(branch);
  });
  box.appendChild(researchSec);

  const vehSec = document.createElement('section');
  vehSec.className = 'zz-more__sec';
  vehSec.innerHTML = '<h3>Vehículos</h3>';
  const vehList = document.createElement('div');
  vehList.className = 'zz-more__list';
  (content.vehiclesDoc?.vehicles || []).forEach((v) => {
    const owned = (state.vehiclesOwned || []).includes(v.id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.disabled = owned || (v.minEra || 0) > state.era;
    btn.className = 'zz-more__item' + (owned || !canAfford(state, v.cost) ? ' is-disabled' : '');
    btn.innerHTML = `<strong>${escapeHtml(v.name)}</strong>
      <span>Vel +${Math.round((v.speedBonus || 0) * 100)}% · Carga +${Math.round(
      (v.cargoBonus || 0) * 100
    )}% · Prot ${v.protection || 0} · Combustible/viaje ${v.fuelPerTrip || 0}</span>
      <span class="zz-build-cost">${
        owned ? 'Poseído' : (v.minEra || 0) > state.era ? `Era ${v.minEra}` : escapeHtml(costText(v.cost))
      }</span>`;
    if (!owned) {
      btn.addEventListener('click', () => {
        const r = buyVehicle(state, content, v.id);
        if (!r.ok) toast(r.error, 'bad');
        else {
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

  notifyNewFactions();
  const facSec = document.createElement('section');
  facSec.className = 'zz-more__sec';
  facSec.innerHTML = '<h3>Facciones</h3>';
  const facList = document.createElement('ul');
  facList.className = 'zz-factions';
  (state.factions || []).forEach((f) => {
    const li = document.createElement('li');
    const rel = RELATION_LABEL[f.relation] || f.relation || '—';
    li.innerHTML = `<strong>${escapeHtml(f.discovered ? f.name : 'Grupo desconocido')}</strong>
      <span class="zz-rel zz-rel--${escapeHtml(f.relation || 'neutral')}">${escapeHtml(rel)}</span>
      <span>${f.discovered ? escapeHtml(f.trait || 'Sin detalle') : 'Aún no contactados'}</span>`;
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
  renderProgress();
  renderCoach();
  renderChoiceModal();
  renderVictory();
  if (pulseSelector) applyPulse(pulseSelector);

  renderMap($('zz-map'), state, {
    onSelectZone: (id) => {
      state.selectedZoneId = id;
      sfx.click?.();
      paint();
    },
  });
  renderBase($('zz-base'), state, {
    onCellClick: (x, y) => {
      if (!state.buildMode || state.flags.defeated) return;
      const r = placeBuilding(state, content, state.buildMode, x, y);
      if (!r.ok) toast(r.error, 'bad');
      else {
        coachAdvance('done');
        state.buildMode = null;
        sfx.build?.();
        toast('El asentamiento crece', 'good');
        const wrap = document.querySelector('.zz-base-wrap');
        if (wrap) {
          wrap.classList.add('zz-built-flash');
          setTimeout(() => wrap.classList.remove('zz-built-flash'), 700);
        }
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
  clearPulse();
  syncCoachFromState();
  const tip = coachMessage();
  if (tip?.pulse) applyPulse(tip.pulse);
  renderCoach();
}

function captureExpeditionResult(logBefore, hadExpedition, zoneName) {
  if (!hadExpedition || state.expedition) return;
  const entries = state.log.slice(0, Math.max(0, state.log.length - logBefore));
  const hit = entries.find((e) =>
    /Regreso|Fracaso|Retirada|no vuelve|cae limpiando|no regresa/i.test(e.text)
  );
  if (hit) {
    lastExpeditionResult = {
      text: hit.text,
      kind: hit.kind,
      zoneName: zoneName || 'Expedición',
    };
    if (hit.kind === 'good') sfx.good?.();
    else if (hit.kind === 'bad') sfx.bad?.();
    else sfx.alert?.();
    coachAdvance('firstBuild');
  }
}

function handleAdvanceDay() {
  if (state.pendingChoice) {
    toast('Resolved la decisión pendiente', 'warn');
    paint();
    return;
  }
  const eraBefore = state.era;
  const hadExpedition = !!state.expedition;
  const expZoneName = hadExpedition
    ? state.zones.find((z) => z.id === state.expedition.zoneId)?.name || 'Expedición'
    : null;
  const logBefore = state.log.length;
  const victoryBefore = !!state.flags.victory;

  const r = advanceDay(state, content);
  if (!r.ok) {
    toast(r.error, 'bad');
    paint();
    return;
  }

  captureExpeditionResult(logBefore, hadExpedition, expZoneName);

  if (state.era > eraBefore) {
    sfx.era?.();
    toast(`Nueva era: ${eraName()}`, 'good');
    flashBody('era');
  }

  if (r.director?.attackIntensity || (r.director?.event && r.director.attackIntensity)) {
    /* resolveBaseAttack already ran inside advanceDay; detect via log */
  }
  const newLogs = state.log.slice(0, Math.max(0, state.log.length - logBefore));
  const attackLog = newLogs.find((e) => /Ataque|perímetro cede|ataque/i.test(e.text));
  if (attackLog) {
    const kind = /repelido/i.test(attackLog.text)
      ? 'win'
      : /pérdidas|contenido/i.test(attackLog.text)
        ? 'messy'
        : 'lose';
    showAttackCard(kind);
  }

  if (r.director?.event && !r.director.choice && !state.pendingChoice) {
    const ev = r.director.event;
    showEventCard({
      name: ev.name,
      family: ev.family,
      intensity: ev.intensity,
      brief: (ev.variants && ev.variants[0]?.text) || ev.name,
    });
  }

  if (!victoryBefore && state.flags.victory && !state.flags.endless) {
    sfx.victory?.();
    flashBody('victory');
    toast('Victoria: Zona Zero estabilizada', 'good');
  }

  if (!attackLog && !lastExpeditionResult) {
    const latest = newLogs.find((e) => e.kind !== 'story');
    if (latest && (latest.kind === 'bad' || latest.kind === 'warn' || latest.kind === 'good')) {
      toast(latest.text, latest.kind === 'bad' ? 'bad' : latest.kind === 'warn' ? 'warn' : 'good');
    } else if (state.era === eraBefore) {
      toast(`Amanece el día ${state.day}`, 'info');
    }
  }

  if (hadExpedition && !state.expedition) coachAdvance('firstBuild');
  scheduleSave();
  paint();
}

function bindChrome() {
  if (chromeBound) return;
  chromeBound = true;

  const advance = $('zz-advance');
  if (advance) advance.addEventListener('click', () => handleAdvanceDay());

  const saveBtn = $('zz-save');
  if (saveBtn) saveBtn.addEventListener('click', () => saveNow());

  document.querySelectorAll('.zz-tab[data-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      sfx.click?.();
      setTab(tab.dataset.tab);
    });
  });

  const soundBtn = $('zz-sound');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      const next = !isSoundEnabled();
      setSoundEnabled(next);
      if (next) sfx.click?.();
      renderHud();
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

function seedSelection() {
  if (!state.selectedSurvivorIds.length) {
    const free = livingSurvivors(state).filter((s) => isFree(s));
    const pick = [...free].sort(
      (a, b) => b.skills.scout + b.skills.fight - (a.skills.scout + a.skills.fight)
    )[0];
    if (pick) state.selectedSurvivorIds = [pick.id];
  }
  if (!state.selectedZoneId) {
    const z =
      state.zones.find((x) => x.state === 'discovered' && x.id !== 'camp') ||
      state.zones.find((x) => x.state === 'hostile') ||
      state.zones.find(
        (x) => x.state === 'discovered' || (x.state === 'controlled' && x.id !== 'camp')
      );
    if (z) state.selectedZoneId = z.id;
  }
}

function ensureDomExtras() {
  ensureEl('zz-toast', 'div', 'zz-toast', document.body).hidden = true;
  ensureEl('zz-event-card', 'div', 'zz-event-card', appRoot()).hidden = true;
  ensureEl('zz-attack-card', 'div', 'zz-attack-card', appRoot()).hidden = true;
  if (!$('zz-weather')) {
    const hud = document.querySelector('.zz-hud__row');
    const badge = document.createElement('div');
    badge.id = 'zz-weather';
    badge.className = 'zz-weather';
    badge.hidden = true;
    if (hud) hud.appendChild(badge);
  }
  if (!$('zz-sound')) {
    const top = document.querySelector('.zz-top');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'zz-sound';
    btn.className = 'zz-btn zz-btn--compact zz-sound';
    btn.textContent = 'Sonido';
    if (top) top.appendChild(btn);
  }
  ensureChoiceModal();
  ensureVictoryOverlay();
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
  initSound();

  if (opts.mode === 'new') {
    state = createNewState(content, opts.name || 'Refugio 0');
    if (!livingSurvivors(state).length) {
      throw new Error('Estado inicial sin supervivientes');
    }
    if (state.flags.defeated) {
      throw new Error('Estado inicial marcado como derrota (bug)');
    }
    ensureCoach();
    state.flags.coach.step = 'foodWarn';
    try {
      const saved = await api.saveSlot(slot, state, state.colonyName, summarizeState(state));
      if (!saved.ok) throw new Error(saved.error || 'save_failed');
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

  ensureDomExtras();
  bindChrome();
  seedSelection();
  setTab(opts.mode === 'new' && !state.flags.defeated ? 'people' : 'map');
  paint();

  if (defeat && !state.flags.defeated) defeat.setAttribute('hidden', '');
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

  // API de prueba (harness / Playwright) — no altera reglas de juego
  window.__zz = {
    getState: () => state,
    getContent: () => content,
    paint: () => paint(),
    place(type, x, y) {
      const r = placeBuilding(state, content, type, x, y);
      if (r.ok) {
        state.buildMode = null;
        paint();
      }
      return r;
    },
    grant(res) {
      Object.entries(res || {}).forEach(([k, v]) => {
        if (state.resources[k] != null) state.resources[k] += v;
      });
      paint();
    },
    discoverAll() {
      (state.zones || []).forEach((z) => {
        if (z.state === 'unknown') z.state = 'discovered';
      });
      paint();
    },
    controlNear() {
      (state.zones || []).forEach((z) => {
        if (z.state === 'discovered' && (z.risk || 0) < 0.4) z.state = 'controlled';
      });
      paint();
    },
    seedColony() {
      state.resources.wood = Math.max(state.resources.wood || 0, 120);
      state.resources.metal = Math.max(state.resources.metal || 0, 90);
      state.resources.food = Math.max(state.resources.food || 0, 50);
      state.resources.water = Math.max(state.resources.water || 0, 50);
      state.resources.fuel = Math.max(state.resources.fuel || 0, 20);
      const plan = [
        ['shelter', 1, 3],
        ['shelter', 3, 1],
        ['house', 3, 3],
        ['farm', 0, 2],
        ['farm', 1, 4],
        ['well', 4, 2],
        ['storage', 0, 4],
        ['workshop', 4, 0],
        ['clinic', 4, 4],
        ['watchtower', 2, 0],
        ['generator', 0, 0],
        ['garage', 4, 1],
        ['barricade', 0, 1],
        ['radio', 1, 0],
      ];
      plan.forEach(([type, x, y]) => {
        if (!content.buildings[type]) return;
        if (state.base.buildings.some((b) => b.x === x && b.y === y && b.hp > 0)) return;
        const cost = content.buildings[type].cost || {};
        Object.entries(cost).forEach(([k, v]) => {
          state.resources[k] = Math.max(state.resources[k] || 0, v + 4);
        });
        livingSurvivors(state).forEach((s) => {
          s.busyUntilDay = 0;
        });
        placeBuilding(state, content, type, x, y);
      });
      const names = ['Nora', 'Leo', 'Mara', 'Toni', 'Iker', 'Sara', 'Paz', 'Hugo', 'Vera'];
      names.forEach((name, i) => {
        if (allLiving(state).length >= 14) return;
        state.survivors.push({
          id: `dev_${i}_${name}`,
          name,
          status: 'ok',
          hp: 100,
          maxHp: 100,
          traitId: null,
          skills: { scout: 1 + (i % 3), fight: 1 + (i % 2), gather: 2, build: 1 + (i % 4), produce: 2 },
          xp: { scout: 0, gather: 0, build: 0, produce: 0, fight: 0 },
          jobBuildingId: null,
          busyUntilDay: 0,
          ageGroup: 'adult',
        });
      });
      state.day = Math.max(state.day, 18);
      paint();
      return state.base.buildings.length;
    },
  };
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
    else if (msg === 'db_connection' || msg === 'db_schema') {
      human = 'Error de base de datos. Reintenta en un momento.';
    } else if (msg && msg !== 'slots') human += ' (' + msg + ')';
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
