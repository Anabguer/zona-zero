/**
 * Mapa mundo Zona Zero 1.2.1 — capas optimizadas, ciudad protagonista,
 * territorio vivo al controlar, núcleo con edificios reconocibles.
 */
import { svgEl, paintBuildingGlyph, resolveVisualLevel } from './icons.js';
import { createRng, hashSeed } from './rng.js';

const VB_SQ = 100;

function mapMetrics(svg) {
  const wide =
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(min-width: 900px)').matches;
  if (wide) {
    return { vbW: 160, vbH: 90, ox: 30, oy: -2, wide: true };
  }
  return { vbW: 100, vbH: 100, ox: 0, oy: 0, wide: false };
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

/** Nivel de desarrollo visual de la colonia (0–3) */
export function colonyVisualTier(state) {
  const pop = state.population?.total || 0;
  const bld = (state.base?.buildings || []).filter((b) => b.hp > 0).length;
  const ctrl = (state.zones || []).filter((z) => z.state === 'controlled').length;
  const day = state.day || 1;
  let score = 0;
  if (day >= 8 || bld >= 5 || pop >= 6) score = 1;
  if (day >= 25 || bld >= 10 || pop >= 18 || ctrl >= 4) score = 2;
  if (day >= 50 || bld >= 16 || pop >= 40 || ctrl >= 8) score = 3;
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
  if (tier < 1) return;
  const controlled = zones.filter((z) => z.state === 'controlled');
  if (controlled.length < 2) return;
  const g = svgEl('g', { class: 'zz-map-layer zz-map-life-paths', 'aria-hidden': 'true' });
  for (let i = 0; i < controlled.length; i++) {
    for (let j = i + 1; j < controlled.length; j++) {
      const a = controlled[i];
      const b = controlled[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist > 38) continue;
      const linked =
        (a.neighbors || []).includes(b.id) || (b.neighbors || []).includes(a.id) || dist < 26;
      if (!linked) continue;
      g.appendChild(
        svgEl('line', {
          x1: a.x,
          y1: a.y,
          x2: b.x,
          y2: b.y,
          class: 'zz-map-life-path',
          opacity: tier >= 2 ? 0.7 : 0.45,
        })
      );
    }
  }
  parent.appendChild(g);
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
      // Edificios de fondo densos
      const cols = Math.max(1, Math.floor(w / 2.2));
      const rows = Math.max(1, Math.floor(h / 2.4));
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (rng.chance(0.25)) continue;
          const bw = w / cols - 0.35;
          const bh = h / rows - 0.35;
          const bx = x0 + c * (w / cols) + 0.15;
          const by = y0 + r * (h / rows) + 0.15;
          const tall = rng.chance(0.3);
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
      if (rng.chance(0.35)) {
        g.appendChild(
          svgEl('circle', {
            cx: x0 + rng.float(0.3, w - 0.3),
            cy: y0 + rng.float(0.3, h - 0.3),
            r: rng.float(0.35, 0.7),
            class: 'zz-map-tree',
            opacity: tier >= 1 ? 0.55 : 0.35,
          })
        );
      }
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
  // Vegetación, cultivos, luces — territorio recuperado con vida
  const nTrees = 4 + tier * 3;
  for (let i = 0; i < nTrees; i++) {
    g.appendChild(
      svgEl('circle', {
        cx: z.x + rng.float(-z.r * 0.7, z.r * 0.7),
        cy: z.y + rng.float(-z.r * 0.55, z.r * 0.55),
        r: rng.float(0.45, 0.95),
        class: 'zz-map-life-tree',
      })
    );
  }
  if (tier >= 1) {
    // Parcelas de cultivo
    for (let i = 0; i < 2 + tier; i++) {
      const cx = z.x + rng.float(-z.r * 0.5, z.r * 0.5);
      const cy = z.y + rng.float(-z.r * 0.4, z.r * 0.45);
      g.appendChild(svgEl('rect', { x: cx - 1.5, y: cy - 1, width: 3, height: 2, rx: 0.2, class: 'zz-map-crop' }));
      for (let k = 0; k < 3; k++) {
        g.appendChild(svgEl('line', { x1: cx - 1.2 + k * 0.9, y1: cy - 0.7, x2: cx - 1.2 + k * 0.9, y2: cy + 0.7, class: 'zz-map-crop-row' }));
      }
    }
  }
  if (tier >= 1) {
    // Luces cálidas
    for (let i = 0; i < 2 + tier * 2 + (tier >= 3 ? 3 : 0); i++) {
      g.appendChild(
        svgEl('circle', {
          cx: z.x + rng.float(-z.r * 0.6, z.r * 0.6),
          cy: z.y + rng.float(-z.r * 0.5, z.r * 0.5),
          r: 0.55 + tier * 0.18,
          class: 'zz-map-life-light',
        })
      );
    }
  }
  if (tier >= 2) {
    g.appendChild(svgEl('ellipse', { cx: z.x, cy: z.y, rx: z.r * 0.85, ry: z.r * 0.7, fill: 'url(#zzLifeGlow)', class: 'zz-zone-life-halo', opacity: tier >= 3 ? 0.75 : 0.55 }));
    for (let i = 0; i < 1 + tier; i++) {
      g.appendChild(
        svgEl('circle', {
          cx: z.x + rng.float(-z.r * 0.4, z.r * 0.4),
          cy: z.y + rng.float(-z.r * 0.35, z.r * 0.35),
          r: 0.4,
          class: 'zz-settle-person',
        })
      );
    }
  }
}

function drawSettlementCore(g, state, camp, tier, { onSelectBuilding, onPlaceCell } = {}) {
  const buildings = (state.base?.buildings || []).filter((b) => b.hp > 0);
  if (!buildings.length && state.uiMode !== 'build') return;
  const layer = svgEl('g', { class: 'zz-map-settlement', transform: `translate(${camp.x},${camp.y})` });
  const life = Math.min(3, tier + Math.floor(buildings.length / 5));
  // Plaza / terreno vivo — más denso con más edificios
  const groundRx = camp.r * (0.78 + life * 0.06);
  const groundRy = camp.r * (0.62 + life * 0.05);
  layer.appendChild(svgEl('ellipse', { cx: 0, cy: 0, rx: groundRx, ry: groundRy, class: 'zz-settle-ground' }));
  if (life >= 1) {
    layer.appendChild(
      svgEl('ellipse', {
        cx: 0,
        cy: 0,
        rx: groundRx * 1.05,
        ry: groundRy * 1.08,
        fill: 'url(#zzSafeGlow)',
        opacity: String(0.35 + life * 0.12),
      })
    );
  }
  // Caminos
  layer.appendChild(svgEl('rect', { x: -0.55, y: -groundRy * 0.85, width: 1.1, height: groundRy * 1.7, class: 'zz-settle-path' }));
  layer.appendChild(svgEl('rect', { x: -groundRx * 0.85, y: -0.55, width: groundRx * 1.7, height: 1.1, class: 'zz-settle-path' }));

  const bw = state.base.w || 10;
  const bh = state.base.h || 8;
  // Escala generosa: edificios deben leerse en el mundo
  const scale = (camp.r * (2.9 + life * 0.15)) / Math.max(bw, bh);

  if (state.uiMode === 'build' && state.buildMode) {
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        const occupied = buildings.some((b) => b.x === x && b.y === y);
        if (occupied) continue;
        const lx = (x - bw / 2 + 0.5) * scale;
        const ly = (y - bh / 2 + 0.5) * scale;
        const cell = scale * 0.88;
        const slot = svgEl('rect', {
          x: lx - cell / 2,
          y: ly - cell / 2,
          width: cell,
          height: cell,
          class: 'zz-settle-slot',
          rx: 0.2,
        });
        slot.style.cursor = 'pointer';
        slot.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          onPlaceCell && onPlaceCell(x, y);
        });
        layer.appendChild(slot);
      }
    }
  }

  const SHORT = {
    farm: 'Huerto',
    well: 'Pozo',
    shelter: 'Refugio',
    house: 'Casa',
    workshop: 'Taller',
    watchtower: 'Torre',
    storage: 'Almacén',
    clinic: 'Clínica',
    infirmary: 'Enferm.',
    medkit: 'Botiquín',
    barricade: 'Barricada',
    fence: 'Valla',
    sawmill: 'Aserradero',
    greenhouse: 'Invern.',
    hq_central_l1: 'HQ',
    hq_central_l2: 'HQ',
    hq_central_l3: 'HQ',
  };

  buildings.forEach((b) => {
    const lx = (b.x - bw / 2 + 0.5) * scale;
    const ly = (b.y - bh / 2 + 0.5) * scale;
    const cell = scale * 0.98;
    const selected = state.selectedBuildingId === b.id;
    const wrap = svgEl('g', {
      class: `zz-settle-bldg${selected ? ' is-selected' : ''}`,
      transform: `translate(${lx - cell / 2},${ly - cell / 2}) scale(${cell / 40})`,
      'data-type': b.type,
      'data-id': b.id,
    });
    wrap.appendChild(svgEl('ellipse', { cx: 20, cy: 36, rx: 14, ry: 4, fill: '#000', opacity: 0.28 }));
    paintBuildingGlyph(wrap, b.type, resolveVisualLevel(b.type));
    const label = SHORT[b.type];
    if (label && (tier >= 0 || buildings.length <= 8)) {
      wrap.appendChild(
        svgEl('text', {
          x: 20,
          y: 44,
          'text-anchor': 'middle',
          class: 'zz-settle-bldg-label',
        }, [label])
      );
    }
    if ((b.workers || 0) > 0) {
      wrap.appendChild(
        svgEl('text', {
          x: 33,
          y: 9,
          class: 'zz-settle-workers',
          'text-anchor': 'middle',
        }, [String(b.workers)])
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

  // Cultivos si hay farm
  const farms = buildings.filter((b) => ['farm', 'greenhouse', 'kitchen'].includes(b.type)).length;
  for (let i = 0; i < farms; i++) {
    const cx = -camp.r * 0.35 + i * 1.8;
    const cy = camp.r * 0.42;
    layer.appendChild(svgEl('rect', { x: cx - 1.4, y: cy - 0.9, width: 2.8, height: 1.8, rx: 0.15, class: 'zz-map-crop' }));
    layer.appendChild(svgEl('line', { x1: cx - 1, y1: cy - 0.6, x2: cx - 1, y2: cy + 0.6, class: 'zz-map-crop-row' }));
    layer.appendChild(svgEl('line', { x1: cx, y1: cy - 0.6, x2: cx, y2: cy + 0.6, class: 'zz-map-crop-row' }));
    layer.appendChild(svgEl('line', { x1: cx + 1, y1: cy - 0.6, x2: cx + 1, y2: cy + 0.6, class: 'zz-map-crop-row' }));
  }

  const pop = state.population?.total || 0;
  const personN = Math.min(14, Math.max(0, Math.floor(pop / 3) + life));
  for (let i = 0; i < personN; i++) {
    const a = (i / Math.max(1, personN)) * Math.PI * 2;
    const rr = camp.r * (0.28 + (i % 4) * 0.07);
    layer.appendChild(
      svgEl('circle', {
        cx: Math.cos(a) * rr,
        cy: Math.sin(a) * rr * 0.65,
        r: 0.4,
        class: 'zz-settle-person',
      })
    );
  }
  const hasWorkshop = buildings.some((b) => ['workshop', 'garage', 'lab', 'sawmill'].includes(b.type));
  if (hasWorkshop) {
    layer.appendChild(svgEl('circle', { cx: camp.r * 0.22, cy: -camp.r * 0.5, r: 1.0, class: 'zz-map-smoke' }));
    layer.appendChild(svgEl('circle', { cx: camp.r * 0.3, cy: -camp.r * 0.65, r: 0.65, class: 'zz-map-smoke' }));
  }
  const defenses = buildings.filter((b) => ['barricade', 'fence', 'watchtower', 'wall', 'bunker'].includes(b.type)).length;
  if (defenses > 0 || life >= 1) {
    layer.appendChild(
      svgEl('ellipse', {
        cx: 0,
        cy: 0,
        rx: groundRx * (1.02 + Math.min(0.12, defenses * 0.03)),
        ry: groundRy * (1.02 + Math.min(0.1, defenses * 0.025)),
        class: 'zz-settle-fence',
      })
    );
  }
  // Luces según progreso
  const lights = 1 + life + Math.min(4, Math.floor(buildings.length / 3));
  for (let i = 0; i < lights; i++) {
    const a = (i / lights) * Math.PI * 2 + 0.3;
    layer.appendChild(
      svgEl('circle', {
        cx: Math.cos(a) * groundRx * 0.55,
        cy: Math.sin(a) * groundRy * 0.5,
        r: 0.55 + (i % 2) * 0.2,
        class: 'zz-map-life-light',
      })
    );
  }
  // Vehículo aparcado si hay garage o flota
  if ((state.vehiclesOwned || []).length || buildings.some((b) => b.type === 'garage')) {
    const vx = groundRx * 0.55;
    const vy = groundRy * 0.15;
    layer.appendChild(svgEl('rect', { x: vx - 1.6, y: vy - 0.7, width: 3.2, height: 1.4, rx: 0.25, fill: '#3a4548', stroke: '#8a9aa0', 'stroke-width': 0.15 }));
    layer.appendChild(svgEl('circle', { cx: vx - 1.0, cy: vy + 0.75, r: 0.45, fill: '#1a1a1a' }));
    layer.appendChild(svgEl('circle', { cx: vx + 1.0, cy: vy + 0.75, r: 0.45, fill: '#1a1a1a' }));
  }

  g.appendChild(layer);
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
      z.state === 'controlled' && tier >= 2 ? 'is-recovered' : '',
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

  if (z.state === 'controlled') {
    g.appendChild(svgEl('ellipse', { cx: z.x, cy: z.y, rx: z.r * 1.05, ry: z.r * 0.9, class: 'zz-zone-halo', fill: 'url(#zzSafeGlow)' }));
  }
  if (z.state === 'hostile' || attacked) {
    g.appendChild(svgEl('ellipse', { cx: z.x, cy: z.y, rx: z.r * 0.95, ry: z.r * 0.85, fill: attacked ? 'url(#zzAttackGlow)' : 'url(#zzHostTint)', class: 'zz-zone-tint' }));
  }
  if (exploreTarget) {
    g.appendChild(
      svgEl('ellipse', {
        cx: z.x,
        cy: z.y,
        rx: z.r * 1.02,
        ry: z.r * 0.88,
        class: 'zz-zone-explore-ring',
        fill: 'none',
      })
    );
  }

  g.appendChild(svgEl('polygon', { points: polyPts, class: 'zz-zone-plot zz-zone-poly' }));

  if (z.type === 'camp') {
    drawSettlementCore(g, state, z, tier, { onSelectBuilding, onPlaceCell });
  } else if (z.state !== 'unknown') {
    const fps = footprintsForType(z.type, z, rng);
    if (z.type === 'park') {
      g.appendChild(svgEl('ellipse', { cx: z.x, cy: z.y, rx: z.r * 0.5, ry: z.r * 0.38, class: 'zz-map-park' }));
    }
    fps.forEach((b) => {
      g.appendChild(svgEl('rect', { x: b.x, y: b.y, width: b.w, height: b.h, class: `zz-zone-sil zz-map-bldg--${b.kind}`, rx: 0.2 }));
      if (z.state === 'controlled') {
        g.appendChild(
          svgEl('rect', {
            x: b.x + b.w * 0.2,
            y: b.y + b.h * 0.25,
            width: Math.max(0.25, b.w * 0.15),
            height: Math.max(0.25, b.h * 0.15),
            class: 'zz-zone-window',
          })
        );
      }
    });
  }

  if (z.state === 'controlled') {
    drawLifeInControlled(g, z, tier, rng);
  }

  if (z.state === 'unknown') {
    g.appendChild(svgEl('polygon', { points: polyPts, class: 'zz-zone-fog' }));
  } else {
    if (z.state === 'hostile' || (z.state === 'discovered' && z.risk >= 0.45)) {
      // Señal discreta: infectados en el terreno, sin triángulos grandes
      drawInfectedMarkers(g, z, rng);
    }
    if (z.state === 'controlled' && z.type !== 'camp' && tier >= 1) {
      // Bandera/luz mínima en edificio alto, no círculo flotante dominante
      const tipY = z.y - z.r * 0.55;
      g.appendChild(svgEl('circle', { cx: z.x, cy: tipY, r: 0.55, class: 'zz-zone-beacon' }));
    }
    // Etiqueta solo si seleccionado o controlado/descubierto — edificios del núcleo se reconocen solos
    if (z.type !== 'camp' || selected || state.uiMode === 'build') {
      g.appendChild(
        svgEl('text', { x: z.x, y: z.y + z.r * 0.92 + 2.8, 'text-anchor': 'middle', class: 'zz-zone-label' }, [z.name])
      );
    }
  }

  if (z.state !== 'unknown') {
    g.addEventListener('click', (ev) => {
      // no abrir zona si el click vino de un edificio/celda
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
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const tier = colonyVisualTier(state);
  svg.dataset.tier = String(tier);
  svg.dataset.wide = m.wide ? '1' : '0';
  svg.dataset.mode = state.uiMode || '';
  addDefs(svg, tier);

  // Fondo grande para poder hacer pan fuera del mundo
  const pad = 40;
  svg.appendChild(
    svgEl('rect', {
      x: vb.x - pad,
      y: vb.y - pad,
      width: vb.w + pad * 2,
      height: vb.h + pad * 2,
      fill: 'url(#zzMapSky)',
      class: 'zz-map-bg',
    })
  );
  svg.appendChild(
    svgEl('rect', {
      x: -(m.ox || 0),
      y: -(m.oy || 0),
      width: m.vbW,
      height: m.vbH,
      fill: 'url(#zzMapHaze)',
      class: 'zz-map-ground',
    })
  );

  const worldAttrs = { class: 'zz-map-world' };
  if (m.ox || m.oy) worldAttrs.transform = `translate(${m.ox},${m.oy})`;
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
