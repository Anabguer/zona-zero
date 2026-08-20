/**
 * ZZ-166…172 — Vida ambiental agregada (§32B).
 * Theater, no Sims: sin fichas, sin selección, cap de sprites.
 */
import { svgEl } from './icons.js';
import { createRng, hashSeed } from './rng.js';
import { healthSemaphore } from './outbreaks.js';
import { slotForBuilding, pointBlockedByProp } from './colony-layout.js';

const WORK_TYPES = new Set([
  'farm',
  'greenhouse',
  'well',
  'cistern',
  'workshop',
  'sawmill',
  'kitchen',
  'scrapyard',
  'storage',
  'infirmary',
  'clinic',
  'barricade',
  'watchtower',
  'wall',
  'fence',
  'tech_bench',
  'lab',
]);

export function ambientLifeConfig(content) {
  return content?.balance?.ambientLife || { enabled: false, maxSprites: 16 };
}

/** Semáforo visual: salud + clima + amenaza (capa sobre healthSemaphore). */
export function ambientSemaphore(state) {
  let base = healthSemaphore(state) || 'green';
  const wx = state.weather || 'clear';
  if (wx === 'blizzard' || wx === 'heat') {
    if (base === 'green') base = 'amber';
  }
  if (state.pendingAttack || state.flags?.lastAttackZoneId || state.zones?.some((z) => z._attackFlash)) {
    base = 'red';
  }
  return base;
}

export function ambientSpriteBudget(state, content) {
  const cfg = ambientLifeConfig(content);
  const max = Math.min(20, Math.max(8, cfg.maxSprites || 16));
  const pop = state.population?.total || 0;
  const workers = (state.base?.buildings || []).reduce((n, b) => n + (b.workers || 0), 0);
  // Proporcional: 3 pop → ~3–4; 100 pop → cap
  const raw = Math.ceil(2 + pop * 0.12 + workers * 0.35);
  return Math.min(max, Math.max(2, raw));
}

function cellPos(state, b, bw, bh, scale) {
  const plot = slotForBuilding(state, b);
  if (plot) return { x: plot.lx, y: plot.ly + plot.rh * 0.28 };
  return {
    x: (b.x - bw / 2 + 0.5) * scale,
    y: (b.y - bh / 2 + 0.5) * scale,
  };
}

function nudgeOffProps(state, x, y, rng) {
  for (let i = 0; i < 10; i++) {
    if (!pointBlockedByProp(state, x, y, 1.05)) return { x, y };
    const ang = rng.float(0, Math.PI * 2);
    x += Math.cos(ang) * 1.55;
    y += Math.sin(ang) * 1.15;
  }
  return { x, y };
}

/**
 * Plan de figuras (sin DOM). Roles: work | idle | shelter | sick | repair.
 */
export function planAmbientFigures(state, content, { scale, bw, bh, scatter = 1.2 }) {
  const cfg = ambientLifeConfig(content);
  if (cfg.enabled === false) return { figures: [], semaphore: 'green', budget: 0 };
  const budget = ambientSpriteBudget(state, content);
  const rng = createRng(hashSeed(`ambient:${state.day || 1}:${state.seed || 's'}`));
  const buildings = state.base?.buildings || [];
  const semaphore = ambientSemaphore(state);
  const underAttack = semaphore === 'red' && !!(state.pendingAttack || state.zones?.some((z) => z._attackFlash));
  const wx = state.weather || 'clear';
  const cold = wx === 'cold' || wx === 'blizzard';
  const heat = wx === 'heat';
  const figures = [];

  const hq =
    buildings.find((b) => String(b.type).startsWith('hq_')) ||
    buildings.find((b) => b.type === 'shelter') ||
    buildings[0];
  const hqPos = hq ? cellPos(state, hq, bw, bh, scale) : { x: 0, y: 0 };

  if (underAttack) {
    // ZZ-171: figuras hacia refugio (HQ)
    for (let i = 0; i < budget; i++) {
      const ang = rng.float(0, Math.PI * 2);
      const dist = rng.float(0.4, 1.6) * (scatter * 0.35);
    const pos = nudgeOffProps(
      state,
      hqPos.x + Math.cos(ang) * dist,
      hqPos.y + Math.sin(ang) * dist * 0.7,
      rng
    );
    figures.push({
        role: 'shelter',
        x: pos.x,
        y: pos.y,
        s: rng.float(0.7, 0.95),
      });
    }
    return { figures: paintFigureHues(figures, state), semaphore, budget, underAttack: true, weather: wx };
  }

  // Workers en edificios staffed (ZZ-167)
  const staffed = buildings.filter((b) => (b.workers || 0) > 0 && b.hp > 0 && WORK_TYPES.has(b.type));
  for (const b of staffed) {
    if (figures.length >= budget) break;
    const pos = cellPos(state, b, bw, bh, scale);
    const n = Math.min(b.workers, cold || heat ? 1 : 2);
    for (let i = 0; i < n && figures.length < budget; i++) {
      const ox = rng.float(-0.55, 0.55) * scatter * 0.45;
      const oy = rng.float(-0.35, 0.55) * scatter * 0.4;
      const placed = nudgeOffProps(state, pos.x + ox, pos.y + oy + scatter * 0.15, rng);
      figures.push({
        role: b.repair?.daysLeft > 0 ? 'repair' : 'work',
        buildingId: b.id,
        x: placed.x,
        y: placed.y,
        s: rng.float(0.72, 0.95),
      });
    }
  }

  // Enfermos cerca de infirmary/clinic (ZZ-169)
  const sick = state.population?.sick || 0;
  if (sick > 0 && figures.length < budget) {
    const med = buildings.find((b) => ['infirmary', 'clinic', 'medkit'].includes(b.type) && b.hp > 0);
    const anchor = med ? cellPos(state, med, bw, bh, scale) : hqPos;
    const nSick = Math.min(2, sick, budget - figures.length);
    for (let i = 0; i < nSick; i++) {
      const placed = nudgeOffProps(
        state,
        anchor.x + rng.float(-0.5, 0.5) * scatter * 0.4,
        anchor.y + rng.float(-0.3, 0.4) * scatter * 0.35,
        rng
      );
      figures.push({
        role: 'sick',
        x: placed.x,
        y: placed.y,
        s: 0.8,
      });
    }
  }

  // Idle cerca del patio / HQ
  while (figures.length < budget) {
    const ang = rng.float(0, Math.PI * 2);
    const dist = rng.float(0.8, 2.2) * (scatter * 0.45);
    // Clima extremo: menos idle outdoor
    if ((cold || heat) && rng.chance(0.45)) {
      const placed = nudgeOffProps(
        state,
        hqPos.x + rng.float(-0.4, 0.4) * scatter * 0.3,
        hqPos.y + rng.float(-0.3, 0.3) * scatter * 0.25,
        rng
      );
      figures.push({
        role: 'idle',
        x: placed.x,
        y: placed.y,
        s: rng.float(0.7, 0.9),
      });
    } else {
      const placed = nudgeOffProps(
        state,
        hqPos.x + Math.cos(ang) * dist,
        hqPos.y + Math.sin(ang) * dist * 0.75,
        rng
      );
      figures.push({
        role: 'idle',
        x: placed.x,
        y: placed.y,
        s: rng.float(0.7, 0.95),
      });
    }
  }

  return { figures: paintFigureHues(figures.slice(0, budget), state), semaphore, budget, underAttack: false, weather: wx };
}

function paintFigureHues(figures, state) {
  const sickN = state.population?.sick || 0;
  const injN = state.population?.injured || 0;
  figures.forEach((fig, i) => {
    if (fig.role === 'sick' || i < sickN) fig.hue = 'red';
    else if (i < sickN + injN) fig.hue = 'amber';
    else fig.hue = 'green';
  });
  return figures;
}

function drawPerson(layer, fig, semaphore, personScale = 1) {
  const hue = fig.hue || 'green';
  const g = svgEl('g', {
    class: `zz-ambient-fig zz-ambient-fig--dot zz-ambient-hue--${hue} zz-ambient-sem--${semaphore}`,
    transform: `translate(${fig.x},${fig.y})`,
    'aria-hidden': 'true',
  });
  const s = (fig.s || 0.85) * (personScale || 1);
  const r = Math.max(0.28, 0.34 * s);
  g.appendChild(svgEl('ellipse', { cx: 0, cy: r * 0.55, rx: r * 0.95, ry: r * 0.38, class: 'zz-ambient-shadow' }));
  g.appendChild(svgEl('circle', { cx: 0, cy: 0, r, class: 'zz-ambient-dot' }));
  layer.appendChild(g);
}

function drawRepairScaffold(layer, b, scale, bw, bh, state) {
  if (!(b.repair?.daysLeft > 0) || b.hp <= 0) return;
  const pos = cellPos(state, b, bw, bh, scale);
  const cell = 3.2;
  const g = svgEl('g', {
    class: 'zz-ambient-scaffold',
    transform: `translate(${pos.x - cell / 2},${pos.y - cell / 2})`,
    'aria-hidden': 'true',
  });
  g.appendChild(
    svgEl('line', {
      x1: cell * 0.15,
      y1: cell * 0.75,
      x2: cell * 0.15,
      y2: cell * 0.2,
      class: 'zz-ambient-scaffold-pole',
    })
  );
  g.appendChild(
    svgEl('line', {
      x1: cell * 0.85,
      y1: cell * 0.75,
      x2: cell * 0.85,
      y2: cell * 0.25,
      class: 'zz-ambient-scaffold-pole',
    })
  );
  g.appendChild(
    svgEl('line', {
      x1: cell * 0.12,
      y1: cell * 0.4,
      x2: cell * 0.88,
      y2: cell * 0.38,
      class: 'zz-ambient-scaffold-plank',
    })
  );
  // Chispas estáticas (alternativa reduced-motion OK)
  g.appendChild(svgEl('circle', { cx: cell * 0.55, cy: cell * 0.32, r: cell * 0.04, class: 'zz-ambient-spark' }));
  g.appendChild(svgEl('circle', { cx: cell * 0.62, cy: cell * 0.28, r: cell * 0.03, class: 'zz-ambient-spark' }));
  layer.appendChild(g);
}

function drawBuildDust(layer, state, scale, bw, bh) {
  const ids = state.flags?.justBuiltIds || [];
  if (!ids.length) return;
  const buildings = state.base?.buildings || [];
  for (const id of ids) {
    const b = buildings.find((x) => x.id === id);
    if (!b) continue;
    const pos = cellPos(state, b, bw, bh, scale);
    const g = svgEl('g', {
      class: 'zz-ambient-dust',
      transform: `translate(${pos.x},${pos.y})`,
      'aria-hidden': 'true',
    });
    for (let i = 0; i < 5; i++) {
      g.appendChild(
        svgEl('circle', {
          cx: (i - 2) * 0.35 * scale * 0.25,
          cy: -0.2 * scale * 0.2 - i * 0.08,
          r: 0.18 + i * 0.04,
          class: 'zz-ambient-dust-puff',
        })
      );
    }
    layer.appendChild(g);
  }
}

function drawPerimeterFlash(layer, scale, underAttack) {
  if (!underAttack) return;
  layer.appendChild(
    svgEl('ellipse', {
      cx: 0,
      cy: 0,
      rx: scale * 3.2,
      ry: scale * 2.4,
      class: 'zz-ambient-perimeter-flash',
      fill: 'none',
    })
  );
}

/**
 * Dibuja vida ambiental dentro del layer de asentamiento (coords locales del camp).
 */
export function drawAmbientLife(layer, state, content, geo) {
  const cfg = ambientLifeConfig(content);
  if (cfg.enabled === false) return null;
  const plan = planAmbientFigures(state, content, geo);
  const life = svgEl('g', {
    class: `zz-ambient-life zz-ambient-life--${plan.semaphore}`,
    'aria-hidden': 'true',
  });
  drawPerimeterFlash(life, 1.4, plan.underAttack);
  drawBuildDust(life, state, geo.scale, geo.bw, geo.bh);
  for (const b of state.base?.buildings || []) {
    drawRepairScaffold(life, b, geo.scale, geo.bw, geo.bh, state);
  }
  for (const fig of plan.figures) {
    drawPerson(life, fig, plan.semaphore, geo.personScale || 1);
  }
  layer.appendChild(life);
  return plan;
}

/** Progreso 0…1 de expedición (ida → destino → vuelta implícita en return). */
export function expeditionProgress(ex, day) {
  const depart = ex.departDay != null ? ex.departDay : Math.max(1, (ex.returnDay || day) - 2);
  const ret = ex.returnDay || day + 1;
  const span = Math.max(1, ret - depart);
  const t = (day - depart) / span;
  // Ida hasta ~0.85 del tramo; se queda cerca del destino
  return Math.max(0.08, Math.min(0.92, t * 0.9 + 0.08));
}
