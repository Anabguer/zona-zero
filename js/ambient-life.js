/**
 * ZZ-166…172 — Vida ambiental agregada (§32B).
 * Theater, no Sims: sin fichas, sin selección, cap de sprites.
 */
import { svgEl } from './icons.js';
import { createRng, hashSeed } from './rng.js';
import { healthSemaphore } from './outbreaks.js';

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

function cellPos(b, bw, bh, scale) {
  return {
    x: (b.x - bw / 2 + 0.5) * scale,
    y: (b.y - bh / 2 + 0.5) * scale,
  };
}

/**
 * Plan de figuras (sin DOM). Roles: work | idle | shelter | sick | repair.
 */
export function planAmbientFigures(state, content, { scale, bw, bh }) {
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
  const hqPos = hq ? cellPos(hq, bw, bh, scale) : { x: 0, y: 0 };

  if (underAttack) {
    // ZZ-171: figuras hacia refugio (HQ)
    for (let i = 0; i < budget; i++) {
      const ang = rng.float(0, Math.PI * 2);
      const dist = rng.float(0.4, 1.6) * (scale * 0.35);
      figures.push({
        role: 'shelter',
        x: hqPos.x + Math.cos(ang) * dist,
        y: hqPos.y + Math.sin(ang) * dist * 0.7,
        s: rng.float(0.7, 0.95),
      });
    }
    return { figures, semaphore, budget, underAttack: true, weather: wx };
  }

  // Workers en edificios staffed (ZZ-167)
  const staffed = buildings.filter((b) => (b.workers || 0) > 0 && b.hp > 0 && WORK_TYPES.has(b.type));
  for (const b of staffed) {
    if (figures.length >= budget) break;
    const pos = cellPos(b, bw, bh, scale);
    const n = Math.min(b.workers, cold || heat ? 1 : 2);
    for (let i = 0; i < n && figures.length < budget; i++) {
      const ox = rng.float(-0.55, 0.55) * scale * 0.45;
      const oy = rng.float(-0.35, 0.55) * scale * 0.4;
      figures.push({
        role: b.repair?.daysLeft > 0 ? 'repair' : 'work',
        buildingId: b.id,
        x: pos.x + ox,
        y: pos.y + oy + scale * 0.15,
        s: rng.float(0.72, 0.95),
      });
    }
  }

  // Enfermos cerca de infirmary/clinic (ZZ-169)
  const sick = state.population?.sick || 0;
  if (sick > 0 && figures.length < budget) {
    const med = buildings.find((b) => ['infirmary', 'clinic', 'medkit'].includes(b.type) && b.hp > 0);
    const anchor = med ? cellPos(med, bw, bh, scale) : hqPos;
    const nSick = Math.min(2, sick, budget - figures.length);
    for (let i = 0; i < nSick; i++) {
      figures.push({
        role: 'sick',
        x: anchor.x + rng.float(-0.5, 0.5) * scale * 0.4,
        y: anchor.y + rng.float(-0.3, 0.4) * scale * 0.35,
        s: 0.8,
      });
    }
  }

  // Idle cerca del patio / HQ
  while (figures.length < budget) {
    const ang = rng.float(0, Math.PI * 2);
    const dist = rng.float(0.8, 2.2) * (scale * 0.45);
    // Clima extremo: menos idle outdoor
    if ((cold || heat) && rng.chance(0.45)) {
      figures.push({
        role: 'idle',
        x: hqPos.x + rng.float(-0.4, 0.4) * scale * 0.3,
        y: hqPos.y + rng.float(-0.3, 0.3) * scale * 0.25,
        s: rng.float(0.7, 0.9),
      });
    } else {
      figures.push({
        role: 'idle',
        x: hqPos.x + Math.cos(ang) * dist,
        y: hqPos.y + Math.sin(ang) * dist * 0.75,
        s: rng.float(0.7, 0.95),
      });
    }
  }

  return { figures: figures.slice(0, budget), semaphore, budget, underAttack: false, weather: wx };
}

function drawPerson(layer, fig, semaphore) {
  const g = svgEl('g', {
    class: `zz-ambient-fig zz-ambient-fig--${fig.role} zz-ambient-sem--${semaphore}`,
    transform: `translate(${fig.x},${fig.y})`,
    'aria-hidden': 'true',
  });
  const s = fig.s || 0.85;
  g.appendChild(svgEl('ellipse', { cx: 0, cy: 0.35 * s, rx: 0.35 * s, ry: 0.12 * s, class: 'zz-ambient-shadow' }));
  g.appendChild(svgEl('circle', { cx: 0, cy: -0.35 * s, r: 0.26 * s, class: 'zz-ambient-head' }));
  g.appendChild(
    svgEl('rect', {
      x: -0.2 * s,
      y: -0.08 * s,
      width: 0.4 * s,
      height: 0.5 * s,
      rx: 0.08,
      class: 'zz-ambient-body',
    })
  );
  if (fig.role === 'sick') {
    g.appendChild(svgEl('circle', { cx: 0.22 * s, cy: -0.55 * s, r: 0.12 * s, class: 'zz-ambient-sick-dot' }));
  }
  layer.appendChild(g);
}

function drawRepairScaffold(layer, b, scale, bw, bh) {
  if (!(b.repair?.daysLeft > 0) || b.hp <= 0) return;
  const pos = cellPos(b, bw, bh, scale);
  const cell = scale * 1.15;
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
    const pos = cellPos(b, bw, bh, scale);
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
  drawPerimeterFlash(life, geo.scale, plan.underAttack);
  drawBuildDust(life, state, geo.scale, geo.bw, geo.bh);
  for (const b of state.base?.buildings || []) {
    drawRepairScaffold(life, b, geo.scale, geo.bw, geo.bh);
  }
  for (const fig of plan.figures) {
    drawPerson(life, fig, plan.semaphore);
  }
  // Frío: aliento abstracto sobre 1–2 figuras outdoor
  if (plan.weather === 'cold' || plan.weather === 'blizzard') {
    plan.figures.slice(0, 3).forEach((fig) => {
      if (fig.role === 'shelter') return;
      life.appendChild(
        svgEl('ellipse', {
          cx: fig.x + 0.25,
          cy: fig.y - 0.55,
          rx: 0.22,
          ry: 0.1,
          class: 'zz-ambient-breath',
        })
      );
    });
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
