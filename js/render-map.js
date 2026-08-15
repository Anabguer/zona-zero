/**
 * Mapa mundo Zona Zero 1.3 — mundo-primero, assets raster + interacción directa.
 */
import { svgEl, paintBuildingGlyph, resolveVisualLevel } from './icons.js';
import { createRng, hashSeed } from './rng.js';
import { artUrl, buildingArtUrl, zoneArtUrl, TERRAIN_ART, FOG_ART } from './art.js';

const VB_SQ = 100;

function mapMetrics(svg) {
  // Mundo lógico 100×100; el SVG llena el viewport (slice) — sin bandas negras.
  const wide =
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(min-width: 900px)').matches;
  return { vbW: 100, vbH: 100, ox: 0, oy: 0, wide: !!wide };
}
const STATE_CLASS = {
  unknown: 'zz-zone--unknown',
  discovered: 'zz-zone--discovered',
  controlled: 'zz-zone--controlled',
  hostile: 'zz-zone--hostile',
};

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function ptsStr(pts) {
  return pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
}

/** Nivel de desarrollo visual de la colonia (0–3) — día + edificios */
export function colonyVisualTier(state) {
  const pop = state.population?.total || 0;
  const bld = (state.base?.buildings || []).filter((b) => b.hp > 0).length;
  const ctrl = (state.zones || []).filter((z) => z.state === 'controlled').length;
  const day = state.day || 1;
  let score = 0;
  if (day >= 8 || bld >= 5 || pop >= 6) score = 1;
  if (day >= 15 || bld >= 9 || pop >= 12 || ctrl >= 3) score = 2;
  if (day >= 28 || bld >= 14 || pop >= 22 || ctrl >= 5) score = 3;
  return score;
}

function districtPlot(z, seed = 0) {
  const rng = createRng(hashSeed(`plot:${z.id}:${seed}`));
  const hw = z.r * rng.float(0.78, 0.98);
  const hh = z.r * rng.float(0.62, 0.88);
  const skew = rng.float(-0.12, 0.12) * z.r;
  const inset = rng.float(0.04, 0.14) * z.r;
  return [
    [z.x - hw + rng.float(-inset, inset), z.y - hh + rng.float(-inset * 0.5, inset)],
    [z.x + hw + skew + rng.float(-inset, inset), z.y - hh + rng.float(-inset, inset * 0.5)],
    [z.x + hw + rng.float(-inset * 0.5, inset), z.y + hh + rng.float(-inset, inset)],
    [z.x - hw - skew + rng.float(-inset, inset), z.y + hh + rng.float(-inset * 0.5, inset)],
  ];
}

function addDefs(svg, tier) {
  const defs = svgEl('defs');

  const sky = svgEl('linearGradient', { id: 'zzMapSky', x1: '0', y1: '0', x2: '0', y2: '1' });
  // Más cielo / menos marrón plano
  sky.appendChild(svgEl('stop', { offset: '0%', 'stop-color': tier >= 2 ? '#3a4a52' : '#2c3438' }));
  sky.appendChild(svgEl('stop', { offset: '40%', 'stop-color': '#1a1e22' }));
  sky.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#0c0e10' }));
  defs.appendChild(sky);

  const haze = svgEl('radialGradient', { id: 'zzMapHaze', cx: '48%', cy: '42%', r: '55%' });
  haze.appendChild(svgEl('stop', { offset: '0%', 'stop-color': tier >= 1 ? '#4a6a48' : '#3a3220', 'stop-opacity': tier >= 1 ? '0.22' : '0.18' }));
  haze.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#0e0c0a', 'stop-opacity': '0' }));
  defs.appendChild(haze);

  const safeGlow = svgEl('radialGradient', { id: 'zzSafeGlow', cx: '50%', cy: '50%', r: '50%' });
  safeGlow.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#a8d4a0', 'stop-opacity': '0.28' }));
  safeGlow.appendChild(svgEl('stop', { offset: '55%', 'stop-color': '#3d6a48', 'stop-opacity': '0.12' }));
  safeGlow.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#3d5c42', 'stop-opacity': '0' }));
  defs.appendChild(safeGlow);

  const lifeGlow = svgEl('radialGradient', { id: 'zzLifeGlow', cx: '50%', cy: '50%', r: '50%' });
  lifeGlow.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#c8e070', 'stop-opacity': '0.35' }));
  lifeGlow.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#5a8a40', 'stop-opacity': '0' }));
  defs.appendChild(lifeGlow);

  const hostTint = svgEl('radialGradient', { id: 'zzHostTint', cx: '50%', cy: '50%', r: '50%' });
  hostTint.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#e05040', 'stop-opacity': '0.4' }));
  hostTint.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#a03020', 'stop-opacity': '0' }));
  defs.appendChild(hostTint);

  const fogGrad = svgEl('linearGradient', { id: 'zzFogGrad', x1: '0', y1: '0', x2: '1', y2: '1' });
  fogGrad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#1a1c20', 'stop-opacity': '0.88' }));
  fogGrad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#0a0c0e', 'stop-opacity': '0.96' }));
  defs.appendChild(fogGrad);

  const attackPulse = svgEl('radialGradient', { id: 'zzAttackGlow', cx: '50%', cy: '50%', r: '50%' });
  attackPulse.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#ff6040', 'stop-opacity': '0.55' }));
  attackPulse.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#ff6040', 'stop-opacity': '0' }));
  defs.appendChild(attackPulse);

  svg.appendChild(defs);
}

function streetCorridors(zones) {
  const xs = new Set([12, 28, 48, 68, 84]);
  const ys = new Set([14, 32, 48, 62, 78, 90]);
  zones.forEach((z) => {
    xs.add(Math.round(z.x / 4) * 4);
    ys.add(Math.round(z.y / 4) * 4);
  });
  return {
    xs: [...xs].sort((a, b) => a - b).filter((v) => v > 4 && v < 96),
    ys: [...ys].sort((a, b) => a - b).filter((v) => v > 4 && v < 96),
  };
}

function drawRecoveredPaths(parent, zones, tier) {
  // Rutas entre zonas controladas retiradas: aportaban aspecto GIS (líneas discontinuas)
}

/** Calles rotas — no rejilla ortogonal completa (evita look GIS). */
function drawRoads(parent, zones, tier) {
  const g = svgEl('g', { class: 'zz-map-layer zz-map-roads', 'aria-hidden': 'true' });
  const rng = createRng(hashSeed('roads-broken'));
  const camp = zones.find((z) => z.type === 'camp');
  const early = tier <= 0;
  // Pocos tramos irregulares cerca del campamento y landmarks
  const anchors = zones.filter((z) => z.type === 'camp' || z.state === 'discovered' || z.state === 'controlled');
  const pts = anchors.length ? anchors : camp ? [camp] : [{ x: 48, y: 62 }];
  pts.forEach((a, ai) => {
    const len = early ? rng.float(10, 18) : rng.float(14, 28);
    const ang = rng.float(0, Math.PI * 2);
    const x1 = a.x + Math.cos(ang) * len * 0.15;
    const y1 = a.y + Math.sin(ang) * len * 0.15;
    const x2 = a.x + Math.cos(ang) * len;
    const y2 = a.y + Math.sin(ang) * len;
    const mx = (x1 + x2) / 2 + rng.float(-2.5, 2.5);
    const my = (y1 + y2) / 2 + rng.float(-2.5, 2.5);
    const d = `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    g.appendChild(
      svgEl('path', {
        d,
        class: 'zz-map-street-path',
        fill: 'none',
        'stroke-width': early ? 1.6 : 2.1,
        opacity: early ? '0.35' : '0.45',
      })
    );
    // Tramo perpendicular corto (solar / cruce muerto)
    if (rng.chance(0.55)) {
      const px = a.x + rng.float(-6, 6);
      const py = a.y + rng.float(-5, 5);
      g.appendChild(
        svgEl('path', {
          d: `M${px.toFixed(1)} ${py.toFixed(1)} l${rng.float(4, 9).toFixed(1)} ${rng.float(-2, 2).toFixed(1)}`,
          class: 'zz-map-street-path',
          fill: 'none',
          'stroke-width': 1.2,
          opacity: '0.28',
        })
      );
    }
  });
  parent.appendChild(g);
  return streetCorridors(zones);
}

/** Ruinas y solares irregulares — no manzana GIS. */
function drawUrbanBlocks(parent, zones, _grid, tier) {
  const g = svgEl('g', { class: 'zz-map-layer zz-map-blocks', 'aria-hidden': 'true' });
  const rng = createRng(hashSeed('ruins-scatter'));
  const camp = zones.find((z) => z.type === 'camp');
  const early = tier <= 0;
  const n = early ? 28 : 48;
  for (let i = 0; i < n; i++) {
    let x = rng.float(6, 94);
    let y = rng.float(8, 92);
    if (camp) {
      const d = Math.hypot(x - camp.x, y - camp.y);
      // Hueco alrededor del refugio para que respire
      if (d < (early ? 14 : 11)) continue;
    }
    const w = rng.float(1.4, early ? 3.2 : 4.2);
    const h = rng.float(1.1, early ? 2.6 : 3.6);
    const skew = rng.float(-0.4, 0.4);
    const pts = [
      [x, y],
      [x + w + skew, y + rng.float(-0.3, 0.3)],
      [x + w * 0.9, y + h],
      [x - skew * 0.5, y + h * 0.95],
    ];
    g.appendChild(svgEl('polygon', { points: ptsStr(pts), class: 'zz-map-ruin-foot' }));
    if (rng.chance(0.55)) {
      g.appendChild(
        svgEl('rect', {
          x: x + w * 0.15,
          y: y + h * 0.2,
          width: w * rng.float(0.35, 0.55),
          height: h * rng.float(0.4, 0.7),
          class: rng.chance(0.3) ? 'zz-map-bldg zz-map-bldg--tall' : 'zz-map-bldg zz-map-bldg--low',
          transform: `rotate(${rng.float(-8, 8)} ${x + w / 2} ${y + h / 2})`,
          rx: 0.12,
        })
      );
    }
    if (rng.chance(0.35)) {
      g.appendChild(
        svgEl('rect', {
          x: x + rng.float(0, w * 0.5),
          y: y + h + 0.2,
          width: rng.float(1.1, 2.0),
          height: 0.45,
          class: 'zz-map-car',
          rx: 0.12,
        })
      );
    }
    if (rng.chance(0.4)) {
      g.appendChild(
        svgEl('ellipse', {
          cx: x + rng.float(0, w),
          cy: y + rng.float(0, h),
          rx: rng.float(0.5, 1.2),
          ry: rng.float(0.35, 0.8),
          class: 'zz-map-scrub',
        })
      );
    }
  }
  parent.appendChild(g);
}

function footprintsForType(type, z, rng) {
  const r = z.r * 0.55;
  const items = [];
  const pushRect = (ox, oy, w, h, kind) => items.push({ x: z.x + ox, y: z.y + oy, w, h, kind });
  switch (type) {
    case 'park':
      pushRect(-r * 0.5, r * 0.1, r * 0.3, r * 0.2, 'low');
      break;
    case 'industrial':
    case 'workshop':
      pushRect(-r * 0.55, -r * 0.2, r * 0.65, r * 0.4, 'mid');
      pushRect(r * 0.1, -r * 0.35, r * 0.4, r * 0.5, 'tall');
      break;
    case 'camp':
      // El núcleo se pinta aparte con edificios reales
      break;
    default:
      for (let i = 0; i < 3 + (type === 'blocks' ? 2 : 0); i++) {
        pushRect(-r * 0.5 + i * r * 0.28, -r * 0.35 + rng.float(-0.08, 0.08) * r, r * 0.2, r * rng.float(0.3, 0.55), i === 1 ? 'tall' : 'mid');
      }
  }
  return items;
}

function drawLifeInControlled(g, z, tier, rng) {
  // Sin puntos verdes decorativos — la vida se lee por landmarks/iluminación
  if (z.type === 'camp') return;
  if (tier < 2) return;
  // Un solo parche de maleza, no lluvia de círculos
  g.appendChild(
    svgEl('ellipse', {
      cx: z.x + rng.float(-z.r * 0.3, z.r * 0.3),
      cy: z.y + rng.float(-z.r * 0.25, z.r * 0.25),
      rx: rng.float(0.6, 1.1),
      ry: rng.float(0.4, 0.7),
      class: 'zz-map-life-tree',
      opacity: '0.35',
    })
  );
}

function drawProp(layer, kind, x, y, s = 1) {
  if (kind === 'crate') {
    layer.appendChild(svgEl('rect', { x: x - 0.55 * s, y: y - 0.4 * s, width: 1.1 * s, height: 0.8 * s, rx: 0.08, class: 'zz-prop-crate' }));
  } else if (kind === 'barrel') {
    layer.appendChild(svgEl('ellipse', { cx: x, cy: y, rx: 0.45 * s, ry: 0.55 * s, class: 'zz-prop-barrel' }));
  } else   if (kind === 'fire') {
    layer.appendChild(svgEl('circle', { cx: x, cy: y, r: 0.45 * s, class: 'zz-prop-fire-glow' }));
    layer.appendChild(svgEl('circle', { cx: x, cy: y, r: 0.22 * s, class: 'zz-prop-fire' }));
  } else if (kind === 'lamp') {
    layer.appendChild(svgEl('rect', { x: x - 0.08 * s, y: y - 0.55 * s, width: 0.16 * s, height: 0.55 * s, fill: '#3a3428' }));
    layer.appendChild(svgEl('circle', { cx: x, cy: y - 0.55 * s, r: 0.22 * s, class: 'zz-prop-lamp' }));
  } else if (kind === 'person') {
    layer.appendChild(svgEl('circle', { cx: x, cy: y - 0.35 * s, r: 0.28 * s, class: 'zz-settle-person' }));
    layer.appendChild(svgEl('rect', { x: x - 0.22 * s, y: y - 0.05 * s, width: 0.44 * s, height: 0.55 * s, rx: 0.08, class: 'zz-settle-person-body' }));
  } else if (kind === 'vehicle') {
    layer.appendChild(svgEl('rect', { x: x - 1.5 * s, y: y - 0.55 * s, width: 3 * s, height: 1.1 * s, rx: 0.2, class: 'zz-prop-vehicle' }));
    layer.appendChild(svgEl('circle', { cx: x - 0.9 * s, cy: y + 0.55 * s, r: 0.35 * s, fill: '#1a1a1a' }));
    layer.appendChild(svgEl('circle', { cx: x + 0.9 * s, cy: y + 0.55 * s, r: 0.35 * s, fill: '#1a1a1a' }));
  }
}

function irregularPatch(cx, cy, rx, ry, rng, n = 7) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.float(-0.2, 0.2);
    const pr = rng.float(0.72, 1.08);
    pts.push([cx + Math.cos(a) * rx * pr, cy + Math.sin(a) * ry * pr]);
  }
  return pts;
}

function drawSettlementYard(layer, buildings, scale, bw, bh, rng) {
  // Sin mancha geométrica: solo suelo bajo cada edificio + restos locales
  buildings.forEach((b) => {
    const lx = (b.x - bw / 2 + 0.5) * scale;
    const ly = (b.y - bh / 2 + 0.5) * scale;
    const patch = irregularPatch(lx, ly + scale * 0.15, scale * 0.55, scale * 0.38, rng, 7);
    layer.appendChild(svgEl('polygon', { points: ptsStr(patch), class: 'zz-settle-yard-patch' }));
  });
  // Escombros y cajas alrededor del cluster (no perímetro)
  if (buildings.length) {
    const xs = buildings.map((b) => (b.x - bw / 2 + 0.5) * scale);
    const ys = buildings.map((b) => (b.y - bh / 2 + 0.5) * scale);
    const ox = (Math.min(...xs) + Math.max(...xs)) / 2;
    const oy = (Math.min(...ys) + Math.max(...ys)) / 2;
    for (let i = 0; i < 3; i++) {
      const x = ox + rng.float(-scale * 1.4, scale * 1.4);
      const y = oy + rng.float(-scale * 1.0, scale * 1.0);
      layer.appendChild(
        svgEl('rect', {
          x,
          y,
          width: rng.float(0.35, 0.7),
          height: rng.float(0.2, 0.35),
          class: 'zz-settle-rubble',
          transform: `rotate(${rng.float(-30, 30)} ${x} ${y})`,
        })
      );
    }
    // Un solo tramo de valla improvisada
    layer.appendChild(
      svgEl('line', {
        x1: ox - scale * 1.5,
        y1: oy + scale * 0.9,
        x2: ox - scale * 0.6,
        y2: oy + scale * 1.15,
        class: 'zz-settle-fence-seg',
      })
    );
  }
}

function drawSettlementCore(g, state, camp, tier, { onSelectBuilding, onPlaceCell } = {}) {
  const buildings = (state.base?.buildings || []).filter((b) => b.hp > 0);
  if (!buildings.length && state.uiMode !== 'build') return;
  const layer = svgEl('g', { class: 'zz-map-settlement', transform: `translate(${camp.x},${camp.y})` });
  const life = Math.min(3, tier + Math.floor(buildings.length / 5));
  const bw = state.base.w || 10;
  const bh = state.base.h || 8;
  const day = state.day || 1;
  const rng = createRng(hashSeed(`yard:${camp.id || 'camp'}:${tier}`));
  const wide =
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(min-width: 900px)').matches;

  // Escala protagonista D1 (desktop un poco más)
  const scale = day <= 2 ? (wide ? 5.1 : 4.7) : day <= 5 ? 3.8 : 2.95 + life * 0.18;
  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;
  if (buildings.length) {
    minX = Infinity;
    maxX = -Infinity;
    minY = Infinity;
    maxY = -Infinity;
    buildings.forEach((b) => {
      const lx = (b.x - bw / 2 + 0.5) * scale;
      const ly = (b.y - bh / 2 + 0.5) * scale;
      minX = Math.min(minX, lx);
      maxX = Math.max(maxX, lx);
      minY = Math.min(minY, ly);
      maxY = Math.max(maxY, ly);
    });
  }
  const ox = buildings.length ? (minX + maxX) / 2 : 0;
  const oy = buildings.length ? (minY + maxY) / 2 : 0;
  const spanX = Math.max(scale * 2.2, (maxX - minX) / 2 + scale * 1.1);
  const spanY = Math.max(scale * 1.8, (maxY - minY) / 2 + scale * 0.95);

  drawSettlementYard(layer, buildings, scale, bw, bh, rng);

  if (buildings.length >= 2) {
    const pts = buildings.map((b) => [(b.x - bw / 2 + 0.5) * scale, (b.y - bh / 2 + 0.5) * scale]);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const mx = (a[0] + b[0]) / 2 + rng.float(-0.35, 0.35);
      const my = (a[1] + b[1]) / 2 + rng.float(-0.35, 0.35);
      layer.appendChild(
        svgEl('path', {
          d: `M${a[0]} ${a[1]} Q${mx} ${my} ${b[0]} ${b[1]}`,
          class: 'zz-settle-path-dirt',
          fill: 'none',
        })
      );
    }
  }

  // Props discretos (sin “marcadores”)
  drawProp(layer, 'crate', ox - spanX * 0.55, oy + spanY * 0.28, 0.85);
  drawProp(layer, 'barrel', ox + spanX * 0.52, oy + spanY * 0.2, 0.8);
  drawProp(layer, 'fire', ox - spanX * 0.05, oy + spanY * 0.12, 0.9);

  const buildMode = state.uiMode === 'build' && state.buildMode;
  let ghost = null;
  if (buildMode) {
    const gw = scale * 1.2;
    ghost = svgEl('image', {
      href: buildingArtUrl(state.buildMode),
      x: 0,
      y: 0,
      width: gw,
      height: gw,
      opacity: '0.65',
      class: 'zz-settle-ghost',
      style: 'pointer-events:none',
      preserveAspectRatio: 'xMidYMid meet',
    });
    ghost.setAttribute('visibility', 'hidden');
    layer.appendChild(ghost);
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        if (buildings.some((b) => b.x === x && b.y === y)) continue;
        const near = buildings.some((b) => Math.abs(b.x - x) + Math.abs(b.y - y) <= 2);
        if (!near && buildings.length) continue;
        const lx = (x - bw / 2 + 0.5) * scale;
        const ly = (y - bh / 2 + 0.5) * scale;
        const cell = scale * 0.95;
        const slot = svgEl('rect', {
          x: lx - cell / 2,
          y: ly - cell / 2,
          width: cell,
          height: cell,
          class: 'zz-settle-slot',
          rx: 0.25,
        });
        slot.style.cursor = 'pointer';
        slot.addEventListener('pointerenter', () => {
          ghost.setAttribute('visibility', 'visible');
          ghost.setAttribute('x', String(lx - gw / 2));
          ghost.setAttribute('y', String(ly - gw / 2));
        });
        slot.addEventListener('pointerleave', () => {
          ghost.setAttribute('visibility', 'hidden');
        });
        slot.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          onPlaceCell && onPlaceCell(x, y);
        });
        layer.appendChild(slot);
      }
    }
  }

  [...buildings]
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .forEach((b) => {
      const lx = (b.x - bw / 2 + 0.5) * scale;
      const ly = (b.y - bh / 2 + 0.5) * scale;
      const cell = scale * 1.4;
      const selected = state.selectedBuildingId === b.id;
      const wrap = svgEl('g', {
        class: `zz-settle-bldg${selected ? ' is-selected' : ''}`,
        transform: `translate(${lx - cell / 2},${ly - cell / 2})`,
        'data-type': b.type,
        'data-id': b.id,
      });
      wrap.appendChild(
        svgEl('ellipse', { cx: cell * 0.5, cy: cell * 0.9, rx: cell * 0.36, ry: cell * 0.11, fill: '#000', opacity: 0.4 })
      );
      wrap.appendChild(
        svgEl('image', {
          href: buildingArtUrl(b.type),
          x: 0,
          y: 0,
          width: cell,
          height: cell,
          preserveAspectRatio: 'xMidYMid meet',
          class: 'zz-settle-bldg-img',
        })
      );
      wrap.style.cursor = 'pointer';
      wrap.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        onSelectBuilding && onSelectBuilding(b.id);
      });
      layer.appendChild(wrap);
    });

  g.appendChild(layer);
}


function drawIrregularFog(g, z, rng) {
  const fogG = svgEl('g', { class: 'zz-zone-fog-group', style: 'pointer-events:none' });
  const uid = String(z.id || 'z').replace(/[^a-zA-Z0-9_-]/g, '');
  const maskId = `fogMask_${uid}`;
  // Máscara irregular (no rectángulo): varias elipses solapadas
  const defs = svgEl('defs', {});
  const mask = svgEl('mask', { id: maskId, maskUnits: 'userSpaceOnUse' });
  mask.appendChild(svgEl('rect', { x: z.x - z.r * 1.6, y: z.y - z.r * 1.5, width: z.r * 3.2, height: z.r * 3, fill: '#000' }));
  for (let i = 0; i < 7; i++) {
    mask.appendChild(
      svgEl('ellipse', {
        cx: z.x + rng.float(-z.r * 0.45, z.r * 0.45),
        cy: z.y + rng.float(-z.r * 0.4, z.r * 0.4),
        rx: z.r * rng.float(0.5, 1.05),
        ry: z.r * rng.float(0.42, 0.9),
        fill: '#fff',
        opacity: String(0.55 + (i % 3) * 0.12),
      })
    );
  }
  defs.appendChild(mask);
  fogG.appendChild(defs);
  const veiled = svgEl('g', { mask: `url(#${maskId})` });
  veiled.appendChild(
    svgEl('image', {
      href: artUrl(FOG_ART),
      x: z.x - z.r * 1.35,
      y: z.y - z.r * 1.25,
      width: z.r * 2.7,
      height: z.r * 2.5,
      opacity: '0.92',
      preserveAspectRatio: 'xMidYMid slice',
      class: 'zz-zone-fog-tex',
    })
  );
  for (let i = 0; i < 4; i++) {
    veiled.appendChild(
      svgEl('ellipse', {
        cx: z.x + rng.float(-z.r * 0.3, z.r * 0.3),
        cy: z.y + rng.float(-z.r * 0.25, z.r * 0.25),
        rx: z.r * rng.float(0.4, 0.85),
        ry: z.r * rng.float(0.35, 0.7),
        class: 'zz-zone-fog-blob',
        opacity: String(0.35 + i * 0.08),
      })
    );
  }
  fogG.appendChild(veiled);
  g.appendChild(fogG);
}

function drawLandmarkSilhouette(g, z, kind) {
  // Siluetas SVG si no hay asset (bloques, parque, etc.)
  const s = Math.min(6.5, z.r * 0.85);
  const x = z.x - s / 2;
  const y = z.y - s / 2;
  if (kind === 'park') {
    g.appendChild(svgEl('ellipse', { cx: z.x, cy: z.y, rx: s * 0.45, ry: s * 0.35, class: 'zz-landmark-park' }));
  } else if (kind === 'industrial') {
    g.appendChild(svgEl('rect', { x, y: y + s * 0.2, width: s * 0.55, height: s * 0.55, class: 'zz-landmark-ind', rx: 0.2 }));
    g.appendChild(svgEl('rect', { x: x + s * 0.5, y, width: s * 0.35, height: s * 0.75, class: 'zz-landmark-ind', rx: 0.15 }));
  } else {
    g.appendChild(svgEl('rect', { x: x + s * 0.1, y: y + s * 0.25, width: s * 0.8, height: s * 0.55, class: 'zz-landmark-bldg', rx: 0.2 }));
    g.appendChild(svgEl('rect', { x: x + s * 0.35, y: y + s * 0.05, width: s * 0.3, height: s * 0.25, class: 'zz-landmark-bldg' }));
  }
}

function drawInfectedMarkers(g, z, rng) {
  const n = Math.min(5, z.infectedLeft || 0);
  for (let i = 0; i < n; i++) {
    const ox = rng.float(-z.r * 0.45, z.r * 0.45);
    const oy = rng.float(-z.r * 0.35, z.r * 0.35);
    const ig = svgEl('g', { class: 'zz-map-infected', transform: `translate(${z.x + ox},${z.y + oy})` });
    ig.appendChild(svgEl('circle', { cx: 0, cy: -0.6, r: 0.55, fill: '#6a3030' }));
    ig.appendChild(svgEl('path', { d: 'M-0.7 0.2 Q0 1.4 0.7 0.2', fill: '#5a2828' }));
    g.appendChild(ig);
  }
}

function drawZone(layer, z, state, tier, handlers) {
  const { onSelectZone, onSelectBuilding, onPlaceCell } = handlers || {};
  const selected = state.selectedZoneId === z.id;
  const attacked = state.flags?.lastAttackZoneId === z.id || z._attackFlash;
  const exploreMode = state.uiMode === 'explore';
  const exploreTarget = exploreMode && z.state !== 'unknown' && z.type !== 'camp';
  const g = svgEl('g', {
    class: [
      'zz-zone',
      STATE_CLASS[z.state] || '',
      selected ? 'is-selected' : '',
      z.risk >= 0.45 && z.state !== 'controlled' ? 'is-risky' : '',
      attacked ? 'is-attacked' : '',
      exploreTarget ? 'is-explore-target' : '',
    ]
      .filter(Boolean)
      .join(' '),
    'data-id': z.id,
    'data-type': z.type,
  });
  g.style.cursor = z.state === 'unknown' ? 'default' : 'pointer';

  const plot = districtPlot(z);
  const polyPts = ptsStr(plot);
  const rng = createRng(hashSeed(`zvis:${z.id}:${tier}`));

  // Hit area invisible (nunca stroke/fill visibles)
  g.appendChild(svgEl('polygon', { points: polyPts, class: 'zz-zone-hit', fill: 'transparent', stroke: 'none' }));

  if (z.state === 'hostile' || attacked) {
    g.appendChild(
      svgEl('ellipse', {
        cx: z.x,
        cy: z.y,
        rx: z.r * 0.55,
        ry: z.r * 0.42,
        fill: attacked ? 'url(#zzAttackGlow)' : 'url(#zzHostTint)',
        class: 'zz-zone-tint',
        opacity: '0.4',
      })
    );
  }
  if (exploreTarget) {
    g.appendChild(
      svgEl('ellipse', {
        cx: z.x,
        cy: z.y,
        rx: z.r * 0.5,
        ry: z.r * 0.4,
        class: 'zz-zone-explore-ring',
        fill: 'none',
      })
    );
  }

  if (z.type === 'camp') {
    drawSettlementCore(g, state, z, tier, { onSelectBuilding, onPlaceCell });
  } else if (z.state === 'unknown') {
    drawIrregularFog(g, z, rng);
  } else {
    const zArt = zoneArtUrl(z);
    const s = Math.min(7.2, z.r * 0.9);
    if (zArt) {
      g.appendChild(
        svgEl('ellipse', {
          cx: z.x,
          cy: z.y + s * 0.35,
          rx: s * 0.38,
          ry: s * 0.12,
          fill: '#000',
          opacity: '0.35',
        })
      );
      g.appendChild(
        svgEl('image', {
          href: zArt,
          x: z.x - s / 2,
          y: z.y - s / 2 - 0.3,
          width: s,
          height: s,
          preserveAspectRatio: 'xMidYMid meet',
          class: `zz-zone-landmark${z.state === 'controlled' ? ' is-owned' : ''}${selected ? ' is-selected' : ''}`,
          style: 'pointer-events:none',
        })
      );
    } else {
      const kind =
        z.type === 'park' ? 'park' : z.type === 'industrial' || z.type === 'warehouse' ? 'industrial' : 'blocks';
      drawLandmarkSilhouette(g, z, kind);
      if (selected) {
        g.appendChild(
          svgEl('ellipse', {
            cx: z.x,
            cy: z.y,
            rx: s * 0.42,
            ry: s * 0.32,
            class: 'zz-landmark-focus',
            fill: 'none',
          })
        );
      }
      if (z.state === 'controlled') {
        g.appendChild(svgEl('circle', { cx: z.x + 1.8, cy: z.y - 1.2, r: 0.35, class: 'zz-prop-lamp' }));
      }
    }
    // Etiqueta discreta solo al seleccionar
    if (selected) {
      const markH = zArt ? s : Math.min(6.5, z.r * 0.85);
      const short = (z.name || 'Lugar').split(/\s+/).slice(0, 2).join(' ');
      g.appendChild(
        svgEl(
          'text',
          {
            x: z.x,
            y: z.y + markH / 2 + 1.1,
            'text-anchor': 'middle',
            class: 'zz-zone-mark-label is-focus',
          },
          [short]
        )
      );
    }
    if (z.state === 'hostile' || (z.state === 'discovered' && z.risk >= 0.5)) {
      drawInfectedMarkers(g, z, rng);
    }
    if (z.state === 'controlled') {
      drawLifeInControlled(g, z, tier, rng);
    }
  }

  if (z.state !== 'unknown') {
    g.addEventListener('click', (ev) => {
      if (ev.target?.closest?.('.zz-settle-bldg, .zz-settle-slot')) return;
      ev.preventDefault();
      onSelectZone && onSelectZone(z.id);
    });
  }
  layer.appendChild(g);
}

function drawExpeditions(svg, state) {
  const list = state.expeditions?.length ? state.expeditions : state.expedition ? [state.expedition] : [];
  if (!list.length) return;
  const camp = state.zones.find((z) => z.type === 'camp') || state.zones.find((z) => z.state === 'controlled');
  if (!camp) return;

  list.forEach((ex, idx) => {
    const dest = state.zones.find((z) => z.id === ex.zoneId);
    if (!dest) return;
    const explorer = (state.explorers || []).find((e) => e.id === ex.explorerId);
    const label = explorer ? explorer.name : 'Expedición';
    const g = svgEl('g', { class: 'zz-map-expedition' });
    const bend = (idx % 2 === 0 ? 1 : -1) * (0.08 + idx * 0.02);
    const mx = (camp.x + dest.x) / 2 + (dest.y - camp.y) * bend;
    const my = (camp.y + dest.y) / 2 - (dest.x - camp.x) * bend;
    const d = `M${camp.x} ${camp.y} Q${mx} ${my} ${dest.x} ${dest.y}`;
    g.appendChild(svgEl('path', { d, class: 'zz-map-route', fill: 'none' }));
    const t = 0.5;
    const px = (1 - t) * (1 - t) * camp.x + 2 * (1 - t) * t * mx + t * t * dest.x;
    const py = (1 - t) * (1 - t) * camp.y + 2 * (1 - t) * t * my + t * t * dest.y;
    const fig = svgEl('g', { transform: `translate(${px},${py})`, class: 'zz-map-explorer-marker' });
    fig.appendChild(svgEl('circle', { cx: 0, cy: -1.1, r: 1.1, fill: '#e8c090', stroke: '#5a4030', 'stroke-width': 0.35 }));
    fig.appendChild(svgEl('path', { d: 'M-1.2 0.3 Q0 2.2 1.2 0.3', fill: '#6a5040' }));
    g.appendChild(fig);
    g.appendChild(svgEl('text', { x: px, y: py - 3.0, 'text-anchor': 'middle', class: 'zz-map-route-label' }, [label]));
    svg.appendChild(g);
  });
}

function drawWeather(parent, weather, m) {
  const w = weather || 'clear';
  const g = svgEl('g', { class: `zz-map-weather zz-map-weather--${w}`, 'aria-hidden': 'true' });
  const rng = createRng(hashSeed(`wx:${w}`));
  const W = m.vbW;
  const H = m.vbH;
  if (w === 'rain' || w === 'storm') {
    const n = w === 'storm' ? 36 : 22;
    for (let i = 0; i < n; i++) {
      const x = rng.float(2, W - 2);
      const y = rng.float(2, H - 2);
      const len = w === 'storm' ? rng.float(2.5, 4.5) : rng.float(1.8, 3.2);
      g.appendChild(svgEl('line', { x1: x, y1: y, x2: x - len * 0.25, y2: y + len, class: 'zz-map-wx-particle' }));
    }
  } else if (w === 'cold') {
    for (let i = 0; i < 20; i++) {
      g.appendChild(svgEl('circle', { cx: rng.float(3, W - 3), cy: rng.float(3, H - 3), r: rng.float(0.2, 0.45), class: 'zz-map-wx-particle' }));
    }
  } else if (w === 'fog') {
    g.appendChild(svgEl('rect', { x: 0, y: 0, width: W, height: H, class: 'zz-map-wx-particle', opacity: '0.22', fill: '#8a8478' }));
  } else if (w === 'heat') {
    g.appendChild(svgEl('rect', { x: 0, y: 0, width: W, height: H, class: 'zz-map-wx-particle', opacity: '0.12', fill: '#c08040' }));
  }
  parent.appendChild(g);
}

function drawLegend() {
  /* Leyenda retirada: el estado de zona se lee por luz/borde/niebla */
}

const ZOOM_MIN = 1.55;
const ZOOM_MAX = 3.35;

export function recenterCamera(state) {
  if (!state) return;
  const camp = state.zones?.find((z) => z.type === 'camp');
  state.mapCamera = state.mapCamera || {};
  if (camp) {
    state.mapCamera.x = camp.x;
    state.mapCamera.y = camp.y;
  } else {
    state.mapCamera.x = 50;
    state.mapCamera.y = 50;
  }
  const day = state.day || 1;
  const wide =
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(min-width: 900px)').matches;
  if (day <= 1) state.mapCamera.zoom = wide ? 3.15 : 3.05;
  else if (day <= 3) state.mapCamera.zoom = wide ? 2.55 : 2.45;
  else if (day <= 5) state.mapCamera.zoom = 2.1;
  else state.mapCamera.zoom = 1.65;
}

export function clampCamera(state) {
  if (!state?.mapCamera) return;
  state.mapCamera.zoom = clamp(state.mapCamera.zoom || 1.4, ZOOM_MIN, ZOOM_MAX);
  const camp = state.zones?.find((z) => z.type === 'camp');
  if (camp) {
    const day = state.day || 1;
    const maxDist = day <= 2 ? 12 : day <= 5 ? 18 : 26;
    const dx = (state.mapCamera.x || camp.x) - camp.x;
    const dy = (state.mapCamera.y || camp.y) - camp.y;
    const d = Math.hypot(dx, dy);
    if (d > maxDist) {
      state.mapCamera.x = camp.x + (dx / d) * maxDist;
      state.mapCamera.y = camp.y + (dy / d) * maxDist;
    }
  }
  state.mapCamera.x = clamp(state.mapCamera.x ?? 50, 8, 92);
  state.mapCamera.y = clamp(state.mapCamera.y ?? 50, 8, 92);
}

export function cameraViewBox(state, m) {
  clampCamera(state);
  const cam = state.mapCamera || { x: 50, y: 48, zoom: 1.4 };
  const zoom = clamp(cam.zoom || 1.4, ZOOM_MIN, ZOOM_MAX);
  const vw = m.vbW / zoom;
  const vh = m.vbH / zoom;
  const worldW = 100;
  const worldH = 100;
  let cx = cam.x ?? 50;
  let cy = cam.y ?? 48;
  cx = clamp(cx, vw / 2, worldW - vw / 2);
  cy = clamp(cy, vh / 2, worldH - vh / 2);
  return {
    x: cx - vw / 2,
    y: cy - vh / 2,
    w: vw,
    h: vh,
    zoom,
    cx,
    cy,
  };
}

export function applyMapCamera(svg, state) {
  if (!svg || !state) return;
  const m = mapMetrics(svg);
  const vb = cameraViewBox(state, m);
  svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
}

/** Bind pan/zoom una sola vez al contenedor del mapa. */
export function bindMapCamera(wrap, getState, onChange) {
  if (!wrap || wrap._zzCamBound) return;
  wrap._zzCamBound = true;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let moved = false;

  const svg = () => wrap.querySelector('svg.zz-map') || wrap.querySelector('svg');

  wrap.addEventListener(
    'wheel',
    (ev) => {
      const state = getState();
      if (!state?.mapCamera) return;
      ev.preventDefault();
      const factor = ev.deltaY > 0 ? 0.9 : 1.1;
      state.mapCamera.zoom = clamp((state.mapCamera.zoom || 1) * factor, ZOOM_MIN, ZOOM_MAX);
      clampCamera(state);
      applyMapCamera(svg(), state);
      onChange && onChange();
    },
    { passive: false }
  );

  wrap.addEventListener('pointerdown', (ev) => {
    if (ev.button != null && ev.button !== 0) return;
    // no pan si tocamos edificio/zona interactiva (salvo fondo)
    const t = ev.target;
    if (t?.closest?.('.zz-settle-bldg, .zz-settle-slot, .zz-zone-hit, .zz-zone-poly, .zz-ex-card')) {
      // zonas sí permiten pan con drag: marcamos y vemos si hay movimiento
    }
    dragging = true;
    moved = false;
    lastX = ev.clientX;
    lastY = ev.clientY;
    wrap.setPointerCapture?.(ev.pointerId);
  });
  wrap.addEventListener('pointermove', (ev) => {
    if (!dragging) return;
    const state = getState();
    const el = svg();
    if (!state?.mapCamera || !el) return;
    const dx = ev.clientX - lastX;
    const dy = ev.clientY - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
    lastX = ev.clientX;
    lastY = ev.clientY;
    const m = mapMetrics(el);
    const vb = cameraViewBox(state, m);
    const rect = el.getBoundingClientRect();
    const scaleX = vb.w / Math.max(1, rect.width);
    const scaleY = vb.h / Math.max(1, rect.height);
    state.mapCamera.x = (state.mapCamera.x || 50) - dx * scaleX;
    state.mapCamera.y = (state.mapCamera.y || 48) - dy * scaleY;
    clampCamera(state);
    applyMapCamera(el, state);
  });
  const endDrag = (ev) => {
    if (!dragging) return;
    dragging = false;
    wrap.releasePointerCapture?.(ev.pointerId);
    if (moved) {
      wrap.dataset.zzPanned = '1';
      onChange && onChange();
      setTimeout(() => {
        delete wrap.dataset.zzPanned;
      }, 0);
    }
  };
  wrap.addEventListener('pointerup', endDrag);
  wrap.addEventListener('pointercancel', endDrag);
}

export function renderMap(svg, state, handlers = {}) {
  if (!svg) return;
  const { onSelectZone, onSelectBuilding, onPlaceCell } = handlers;
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const m = mapMetrics(svg);
  if (!state.mapCamera) state.mapCamera = { x: 50, y: 48, zoom: 1.15 };
  const vb = cameraViewBox(state, m);
  svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');

  const tier = colonyVisualTier(state);
  svg.dataset.tier = String(tier);
  svg.dataset.wide = m.wide ? '1' : '0';
  svg.dataset.mode = state.uiMode || '';
  addDefs(svg, tier);

  const pad = 40;
  svg.appendChild(
    svgEl('rect', {
      x: vb.x - pad,
      y: vb.y - pad,
      width: vb.w + pad * 2,
      height: vb.h + pad * 2,
      fill: tier <= 0 ? '#08090a' : '#0c0e10',
      class: 'zz-map-bg',
    })
  );
  // Terreno ilustrado
  const terrain = svgEl('image', {
    href: artUrl(TERRAIN_ART),
    x: -8,
    y: -8,
    width: 116,
    height: 116,
    preserveAspectRatio: 'xMidYMid slice',
    class: 'zz-map-terrain',
    opacity: tier <= 0 ? '0.88' : tier === 1 ? '0.9' : '0.92',
    style: 'pointer-events:none',
  });
  svg.appendChild(terrain);
  svg.appendChild(
    svgEl('rect', {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      fill: 'url(#zzMapHaze)',
      class: 'zz-map-ground',
      style: 'pointer-events:none',
    })
  );

  const worldAttrs = { class: 'zz-map-world' };
  const world = svgEl('g', worldAttrs);

  const zones = state.zones || [];
  const grid = drawRoads(world, zones, tier);
  drawUrbanBlocks(world, zones, grid, tier);
  drawRecoveredPaths(world, zones, tier);

  const layer = svgEl('g', { class: 'zz-map-layer zz-map-zones' });
  const ordered = [...zones].sort((a, b) => {
    const rank = { unknown: 0, discovered: 1, hostile: 2, controlled: 3 };
    return (rank[a.state] || 0) - (rank[b.state] || 0);
  });
  ordered.forEach((z) => drawZone(layer, z, state, tier, { onSelectZone, onSelectBuilding, onPlaceCell }));
  world.appendChild(layer);

  drawExpeditions(world, state);
  svg.appendChild(world);
  drawWeather(svg, state.weather, m);
  drawLegend();
}
