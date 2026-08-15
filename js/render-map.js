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

function drawRoads(parent, zones, tier) {
  const g = svgEl('g', { class: 'zz-map-layer zz-map-roads', 'aria-hidden': 'true' });
  const { xs, ys } = streetCorridors(zones);
  const mainX = new Set([28, 48, 68]);
  const mainY = new Set([32, 48, 62]);
  const roadFill = tier >= 2 ? '#4a453c' : '#3a352c';

  ys.forEach((y) => {
    const h = mainY.has(y) ? 2.4 : 1.35;
    g.appendChild(svgEl('rect', { x: 2, y: y - h / 2, width: 96, height: h, fill: roadFill, class: mainY.has(y) ? 'zz-map-avenue' : 'zz-map-street-fill', opacity: 0.9 }));
  });
  xs.forEach((x) => {
    const w = mainX.has(x) ? 2.4 : 1.35;
    g.appendChild(svgEl('rect', { x: x - w / 2, y: 2, width: w, height: 96, fill: roadFill, class: mainX.has(x) ? 'zz-map-avenue' : 'zz-map-street-fill', opacity: 0.88 }));
  });
  // Marcas de carril en avenidas (detalle ligero)
  if (tier >= 1) {
    mainY.forEach((y) => {
      for (let x = 8; x < 92; x += 6) {
        g.appendChild(svgEl('rect', { x, y: y - 0.15, width: 2.2, height: 0.3, fill: '#6a6458', opacity: 0.35 }));
      }
    });
  }
  parent.appendChild(g);
  return { xs, ys };
}

function drawUrbanBlocks(parent, zones, grid, tier) {
  const g = svgEl('g', { class: 'zz-map-layer zz-map-blocks', 'aria-hidden': 'true' });
  const rng = createRng(hashSeed('cityblocks'));
  const { xs, ys } = grid;
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const x0 = xs[i] + 0.9;
      const y0 = ys[j] + 0.9;
      const w = xs[i + 1] - xs[i] - 1.8;
      const h = ys[j + 1] - ys[j] - 1.8;
      if (w < 2 || h < 2) continue;
      const nearZone = zones.some((z) => z.x > x0 && z.x < x0 + w && z.y > y0 && z.y < y0 + h);
      if (nearZone && rng.chance(0.4)) continue;
      g.appendChild(svgEl('rect', { x: x0, y: y0, width: w, height: h, rx: 0.3, class: 'zz-map-block' }));
      // Edificios de fondo densos (menos densidad cerca del campamento)
      const cols = Math.max(1, Math.floor(w / 2.6));
      const rows = Math.max(1, Math.floor(h / 2.8));
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (rng.chance(0.4)) continue;
          const bw = w / cols - 0.35;
          const bh = h / rows - 0.35;
          const bx = x0 + c * (w / cols) + 0.15;
          const by = y0 + r * (h / rows) + 0.15;
          const tall = rng.chance(0.25);
          g.appendChild(
            svgEl('rect', {
              x: bx,
              y: by + (tall ? 0 : bh * 0.25),
              width: bw,
              height: tall ? bh : bh * 0.75,
              class: tall ? 'zz-map-bldg zz-map-bldg--tall' : 'zz-map-bldg zz-map-bldg--mid',
              rx: 0.15,
            })
          );
        }
      }
      // Ruinas / coches / maleza
      if (rng.chance(0.45)) {
        g.appendChild(
          svgEl('rect', {
            x: x0 + rng.float(0.2, w * 0.6),
            y: y0 + h - 0.9,
            width: rng.float(1.2, 2.2),
            height: 0.55,
            class: 'zz-map-car',
            rx: 0.15,
          })
        );
      }
      // Sin círculos-árbol decorativos (ruido GIS)
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

function drawSettlementCore(g, state, camp, tier, { onSelectBuilding, onPlaceCell } = {}) {
  const buildings = (state.base?.buildings || []).filter((b) => b.hp > 0);
  if (!buildings.length && state.uiMode !== 'build') return;
  const layer = svgEl('g', { class: 'zz-map-settlement', transform: `translate(${camp.x},${camp.y})` });
  const life = Math.min(3, tier + Math.floor(buildings.length / 5));
  const bw = state.base.w || 10;
  const bh = state.base.h || 8;

  // Escala legible fija; el suelo se adapta al cluster de edificios
  const scale = 2.55 + life * 0.22;
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
  const pad = scale * 1.35;
  const groundRx = Math.max(camp.r * 0.32, (maxX - minX) / 2 + pad);
  const groundRy = Math.max(camp.r * 0.26, (maxY - minY) / 2 + pad * 0.9);
  const ox = buildings.length ? (minX + maxX) / 2 : 0;
  const oy = buildings.length ? (minY + maxY) / 2 : 0;

  const groundPts = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - 0.15;
    const wobble = 0.86 + ((i * 37) % 5) * 0.04 + (i % 2) * 0.05;
    groundPts.push([ox + Math.cos(a) * groundRx * wobble, oy + Math.sin(a) * groundRy * wobble]);
  }
  layer.appendChild(
    svgEl('polygon', {
      points: groundPts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' '),
      class: `zz-settle-ground zz-settle-ground--t${tier}`,
    })
  );
  layer.appendChild(
    svgEl('ellipse', {
      cx: ox - groundRx * 0.2,
      cy: oy + groundRy * 0.1,
      rx: groundRx * 0.3,
      ry: groundRy * 0.22,
      class: 'zz-settle-dirt',
    })
  );
  layer.appendChild(
    svgEl('ellipse', {
      cx: ox + groundRx * 0.25,
      cy: oy - groundRy * 0.08,
      rx: groundRx * 0.24,
      ry: groundRy * 0.18,
      class: 'zz-settle-dirt',
    })
  );

  layer.appendChild(
    svgEl('path', {
      d: `M ${(ox - groundRx * 0.55).toFixed(2)} ${(oy + groundRy * 0.12).toFixed(2)} Q ${ox.toFixed(2)} ${oy.toFixed(2)} ${(ox + groundRx * 0.5).toFixed(2)} ${(oy - groundRy * 0.08).toFixed(2)}`,
      class: 'zz-settle-path-line',
      fill: 'none',
    })
  );
  layer.appendChild(
    svgEl('path', {
      d: `M ${(ox - groundRx * 0.08).toFixed(2)} ${(oy - groundRy * 0.5).toFixed(2)} Q ${(ox + 0.2).toFixed(2)} ${oy.toFixed(2)} ${(ox + groundRx * 0.12).toFixed(2)} ${(oy + groundRy * 0.48).toFixed(2)}`,
      class: 'zz-settle-path-line',
      fill: 'none',
    })
  );

  drawProp(layer, 'crate', ox - groundRx * 0.42, oy + groundRy * 0.28, 0.95);
  drawProp(layer, 'barrel', ox + groundRx * 0.4, oy + groundRy * 0.22, 0.95);
  if (tier <= 0) {
    drawProp(layer, 'fire', ox - groundRx * 0.1, oy + groundRy * 0.05, 1);
    drawProp(layer, 'crate', ox + groundRx * 0.2, oy - groundRy * 0.25, 0.85);
  }
  if (life >= 1) {
    drawProp(layer, 'lamp', ox - groundRx * 0.35, oy - groundRy * 0.22, 0.95);
    drawProp(layer, 'barrel', ox - groundRx * 0.48, oy - groundRy * 0.05, 0.85);
  }
  if (life >= 2) {
    drawProp(layer, 'lamp', ox + groundRx * 0.35, oy - groundRy * 0.15, 0.9);
    drawProp(layer, 'crate', ox + groundRx * 0.05, oy + groundRy * 0.35, 1.05);
  }
  if (life >= 3 || (state.vehiclesOwned || []).length) {
    drawProp(layer, 'vehicle', ox + groundRx * 0.28, oy + groundRy * 0.02, 0.95);
  }

  const buildMode = state.uiMode === 'build' && state.buildMode;
  let ghost = null;
  if (buildMode) {
    ghost = svgEl('image', {
      href: buildingArtUrl(state.buildMode),
      x: 0,
      y: 0,
      width: scale,
      height: scale,
      opacity: '0.55',
      class: 'zz-settle-ghost',
      style: 'pointer-events:none',
      preserveAspectRatio: 'xMidYMid meet',
    });
    ghost.setAttribute('visibility', 'hidden');
    layer.appendChild(ghost);
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        if (buildings.some((b) => b.x === x && b.y === y)) continue;
        const lx = (x - bw / 2 + 0.5) * scale;
        const ly = (y - bh / 2 + 0.5) * scale;
        const cell = scale * 0.88;
        const slot = svgEl('rect', {
          x: lx - cell / 2,
          y: ly - cell / 2,
          width: cell,
          height: cell,
          class: 'zz-settle-slot',
          rx: 0.12,
        });
        slot.style.cursor = 'pointer';
        slot.addEventListener('pointerenter', () => {
          ghost.setAttribute('visibility', 'visible');
          ghost.setAttribute('x', String(lx - scale / 2));
          ghost.setAttribute('y', String(ly - scale / 2));
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
      const cell = scale * 1.2;
      const selected = state.selectedBuildingId === b.id;
      const wrap = svgEl('g', {
        class: `zz-settle-bldg${selected ? ' is-selected' : ''}`,
        transform: `translate(${lx - cell / 2},${ly - cell / 2})`,
        'data-type': b.type,
        'data-id': b.id,
      });
      wrap.appendChild(
        svgEl('ellipse', { cx: cell * 0.5, cy: cell * 0.88, rx: cell * 0.34, ry: cell * 0.1, fill: '#000', opacity: 0.38 })
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
      const needsStaff = ['farm', 'greenhouse', 'well', 'cistern', 'workshop', 'sawmill', 'kitchen', 'infirmary', 'clinic'].includes(
        b.type
      );
      if (needsStaff && (b.workers || 0) < 1) {
        wrap.appendChild(
          svgEl('circle', {
            cx: cell * 0.82,
            cy: cell * 0.18,
            r: Math.max(0.28, cell * 0.08),
            class: 'zz-settle-warn-dot',
          })
        );
      }
      if (selected && (b.workers || 0) > 0) {
        wrap.appendChild(
          svgEl(
            'text',
            {
              x: cell * 0.82,
              y: cell * 0.22,
              class: 'zz-settle-workers',
              'text-anchor': 'middle',
            },
            [String(b.workers)]
          )
        );
      }
      wrap.style.cursor = 'pointer';
      wrap.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        onSelectBuilding && onSelectBuilding(b.id);
      });
      layer.appendChild(wrap);
    });

  // Huertos: el asset farm.webp ya es parcela; no añadir overlays verdes extra

  const pop = state.population?.total || 0;
  const personN = Math.min(
    life >= 3 ? 6 : life >= 2 ? 4 : life >= 1 ? 3 : 2,
    Math.max(0, Math.floor(pop / 5) + (tier <= 0 ? 2 : 0))
  );
  for (let i = 0; i < personN; i++) {
    const a = (i / Math.max(1, personN)) * Math.PI * 2 + 0.35;
    const rr = Math.min(groundRx, groundRy) * (0.28 + (i % 3) * 0.07);
    drawProp(layer, 'person', ox + Math.cos(a) * rr, oy + Math.sin(a) * rr * 0.65, 0.75);
  }

  const defenses = buildings.filter((b) => ['barricade', 'fence', 'watchtower', 'wall', 'bunker'].includes(b.type)).length;
  if (defenses > 0 || life >= 2) {
    const segs = Math.min(7, 2 + defenses);
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2 + 0.2 * (i % 3);
      const a1 = a0 + 0.22 + (i % 2) * 0.1;
      const rx = groundRx * (1.04 + (i % 3) * 0.02);
      const ry = groundRy * (1.04 + ((i + 1) % 3) * 0.02);
      layer.appendChild(
        svgEl('line', {
          x1: ox + Math.cos(a0) * rx,
          y1: oy + Math.sin(a0) * ry,
          x2: ox + Math.cos(a1) * rx,
          y2: oy + Math.sin(a1) * ry,
          class: 'zz-settle-fence',
        })
      );
    }
  }

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

  // Hit area casi invisible — sin overlays de control verdes
  g.appendChild(svgEl('polygon', { points: polyPts, class: 'zz-zone-plot zz-zone-poly' }));

  if (z.state === 'hostile' || attacked) {
    g.appendChild(
      svgEl('ellipse', {
        cx: z.x,
        cy: z.y,
        rx: z.r * 0.7,
        ry: z.r * 0.55,
        fill: attacked ? 'url(#zzAttackGlow)' : 'url(#zzHostTint)',
        class: 'zz-zone-tint',
        opacity: '0.55',
      })
    );
  }
  if (exploreTarget) {
    g.appendChild(
      svgEl('ellipse', {
        cx: z.x,
        cy: z.y,
        rx: z.r * 0.75,
        ry: z.r * 0.6,
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
          class: `zz-zone-landmark${z.state === 'controlled' ? ' is-owned' : ''}`,
          style: 'pointer-events:none',
        })
      );
    } else {
      const kind =
        z.type === 'park' ? 'park' : z.type === 'industrial' || z.type === 'warehouse' ? 'industrial' : 'blocks';
      drawLandmarkSilhouette(g, z, kind);
      if (z.state === 'controlled') {
        g.appendChild(svgEl('circle', { cx: z.x + 1.8, cy: z.y - 1.2, r: 0.4, class: 'zz-prop-lamp' }));
      }
    }
    // Etiqueta solo al seleccionar (la ficha lleva el nombre completo)
    if (selected) {
      const markH = zArt ? s : Math.min(6.5, z.r * 0.85);
      g.appendChild(
        svgEl(
          'text',
          {
            x: z.x,
            y: z.y + markH / 2 + 1.2,
            'text-anchor': 'middle',
            class: 'zz-zone-mark-label is-focus',
          },
          [z.name || 'Zona']
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
    const label = explorer ? `${explorer.name} · vuelve D${ex.returnDay}` : `Expedición · D${ex.returnDay}`;
    const g = svgEl('g', { class: 'zz-map-expedition' });
    const bend = (idx % 2 === 0 ? 1 : -1) * (0.08 + idx * 0.02);
    const mx = (camp.x + dest.x) / 2 + (dest.y - camp.y) * bend;
    const my = (camp.y + dest.y) / 2 - (dest.x - camp.x) * bend;
    const d = `M${camp.x} ${camp.y} Q${mx} ${my} ${dest.x} ${dest.y}`;
    g.appendChild(svgEl('path', { d, class: 'zz-map-route', fill: 'none' }));
    const t = 0.45 + idx * 0.08;
    const px = (1 - t) * (1 - t) * camp.x + 2 * (1 - t) * t * mx + t * t * dest.x;
    const py = (1 - t) * (1 - t) * camp.y + 2 * (1 - t) * t * my + t * t * dest.y;
    // Marcador explorador (figura simple)
    const fig = svgEl('g', { transform: `translate(${px},${py})`, class: 'zz-map-explorer-marker' });
    fig.appendChild(svgEl('circle', { cx: 0, cy: -1.1, r: 1.1, fill: '#e8c090', stroke: '#5a4030', 'stroke-width': 0.35 }));
    fig.appendChild(svgEl('path', { d: 'M-1.2 0.3 Q0 2.2 1.2 0.3', fill: '#6a5040' }));
    g.appendChild(fig);
    g.appendChild(svgEl('text', { x: px, y: py - 3.2, 'text-anchor': 'middle', class: 'zz-map-route-label' }, [label]));
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

export function cameraViewBox(state, m) {
  const cam = state.mapCamera || { x: 50, y: 48, zoom: 1 };
  const zoom = clamp(cam.zoom || 1, 0.55, 2.4);
  const vw = m.vbW / zoom;
  const vh = m.vbH / zoom;
  // Mundo lógico ~0–100 (+ offset desktop en el group)
  const worldW = 100;
  const worldH = 100;
  let cx = cam.x ?? 50;
  let cy = cam.y ?? 48;
  cx = clamp(cx, vw / 2 - (m.ox || 0), worldW - vw / 2 + (m.ox || 0) + 20);
  cy = clamp(cy, vh / 2 - (m.oy || 0), worldH - vh / 2 + 20);
  return {
    x: cx - vw / 2 - (m.ox || 0),
    y: cy - vh / 2 - (m.oy || 0),
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
      state.mapCamera.zoom = clamp((state.mapCamera.zoom || 1) * factor, 0.55, 2.4);
      applyMapCamera(svg(), state);
      onChange && onChange();
    },
    { passive: false }
  );

  wrap.addEventListener('pointerdown', (ev) => {
    if (ev.button != null && ev.button !== 0) return;
    // no pan si tocamos edificio/zona interactiva (salvo fondo)
    const t = ev.target;
    if (t?.closest?.('.zz-settle-bldg, .zz-settle-slot, .zz-zone-poly, .zz-ex-card')) {
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
    opacity: tier <= 0 ? '0.72' : tier === 1 ? '0.82' : '0.9',
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
