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
  safeGlow.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#8dffb0', 'stop-opacity': '0.5' }));
  safeGlow.appendChild(svgEl('stop', { offset: '55%', 'stop-color': '#3d6a48', 'stop-opacity': '0.22' }));
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

function drawSettlementCore(g, state, camp, tier) {
  const buildings = (state.base?.buildings || []).filter((b) => b.hp > 0);
  if (!buildings.length) return;
  const layer = svgEl('g', { class: 'zz-map-settlement', transform: `translate(${camp.x},${camp.y})` });
  // Plaza / terreno vivo
  layer.appendChild(svgEl('ellipse', { cx: 0, cy: 0, rx: camp.r * 0.85, ry: camp.r * 0.7, class: 'zz-settle-ground' }));
  if (tier >= 1) {
    layer.appendChild(svgEl('ellipse', { cx: 0, cy: 0, rx: camp.r * 0.9, ry: camp.r * 0.75, fill: 'url(#zzSafeGlow)', opacity: 0.65 }));
  }
  // Caminos en cruz del núcleo
  layer.appendChild(svgEl('rect', { x: -0.7, y: -camp.r * 0.55, width: 1.4, height: camp.r * 1.1, class: 'zz-settle-path' }));
  layer.appendChild(svgEl('rect', { x: -camp.r * 0.55, y: -0.7, width: camp.r * 1.1, height: 1.4, class: 'zz-settle-path' }));

  const bw = state.base.w || 10;
  const bh = state.base.h || 8;
  // Escala generosa: edificios del núcleo deben leerse en el mundo
  const scale = (camp.r * 2.6) / Math.max(bw, bh);

  buildings.forEach((b) => {
    const lx = (b.x - bw / 2 + 0.5) * scale;
    const ly = (b.y - bh / 2 + 0.5) * scale;
    const cell = scale * 0.92;
    const wrap = svgEl('g', {
      class: 'zz-settle-bldg',
      transform: `translate(${lx - cell / 2},${ly - cell / 2}) scale(${cell / 40})`,
      'data-type': b.type,
    });
    // Sombra
    wrap.appendChild(svgEl('ellipse', { cx: 20, cy: 36, rx: 14, ry: 4, fill: '#000', opacity: 0.25 }));
    paintBuildingGlyph(wrap, b.type, resolveVisualLevel(b.type));
    layer.appendChild(wrap);
  });

  // Densidad poblacional: figuras + humo de talleres
  const pop = state.population?.total || 0;
  const personN = Math.min(12, Math.max(0, Math.floor(pop / 4) + (tier >= 2 ? 2 : 0)));
  for (let i = 0; i < personN; i++) {
    const a = (i / Math.max(1, personN)) * Math.PI * 2;
    const rr = camp.r * (0.35 + (i % 3) * 0.08);
    layer.appendChild(
      svgEl('circle', {
        cx: Math.cos(a) * rr,
        cy: Math.sin(a) * rr * 0.7,
        r: 0.45,
        class: 'zz-settle-person',
      })
    );
  }
  const hasWorkshop = buildings.some((b) => ['workshop', 'garage', 'lab'].includes(b.type));
  if (hasWorkshop && tier >= 1) {
    layer.appendChild(svgEl('circle', { cx: camp.r * 0.2, cy: -camp.r * 0.55, r: 1.1, class: 'zz-map-smoke' }));
    layer.appendChild(svgEl('circle', { cx: camp.r * 0.28, cy: -camp.r * 0.7, r: 0.7, class: 'zz-map-smoke' }));
  }
  const defenses = buildings.filter((b) => ['barricade', 'fence', 'watchtower', 'wall'].includes(b.type)).length;
  if (defenses > 0 || tier >= 1) {
    layer.appendChild(
      svgEl('ellipse', {
        cx: 0,
        cy: 0,
        rx: camp.r * (0.95 + Math.min(0.2, defenses * 0.04)),
        ry: camp.r * (0.78 + Math.min(0.15, defenses * 0.03)),
        class: 'zz-settle-fence',
      })
    );
  }
  if (tier >= 2) {
    layer.appendChild(svgEl('circle', { cx: camp.r * 0.35, cy: -camp.r * 0.4, r: 0.85, class: 'zz-map-life-light' }));
    layer.appendChild(svgEl('circle', { cx: -camp.r * 0.4, cy: camp.r * 0.25, r: 0.85, class: 'zz-map-life-light' }));
  }
  if (tier >= 3) {
    layer.appendChild(svgEl('circle', { cx: 0, cy: -camp.r * 0.15, r: 1.1, class: 'zz-map-life-light' }));
    layer.appendChild(svgEl('circle', { cx: camp.r * 0.5, cy: camp.r * 0.1, r: 0.7, class: 'zz-map-life-light' }));
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

function drawZone(layer, z, state, tier, onSelectZone) {
  const selected = state.selectedZoneId === z.id;
  const attacked = state.flags?.lastAttackZoneId === z.id || z._attackFlash;
  const g = svgEl('g', {
    class: [
      'zz-zone',
      STATE_CLASS[z.state] || '',
      selected ? 'is-selected' : '',
      z.risk >= 0.45 && z.state !== 'controlled' ? 'is-risky' : '',
      attacked ? 'is-attacked' : '',
      z.state === 'controlled' && tier >= 2 ? 'is-recovered' : '',
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

  g.appendChild(svgEl('polygon', { points: polyPts, class: 'zz-zone-plot zz-zone-poly' }));

  if (z.type === 'camp') {
    drawSettlementCore(g, state, z, tier);
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
      g.appendChild(svgEl('path', { d: `M${z.x} ${z.y - z.r * 0.78} l2.1 3.8 h-4.2 z`, class: 'zz-zone-danger' }));
      drawInfectedMarkers(g, z, rng);
    }
    if (z.state === 'controlled') {
      g.appendChild(svgEl('circle', { cx: z.x, cy: z.y - z.r * 0.78, r: 1.6, class: 'zz-zone-beacon' }));
    }
    // Etiqueta solo si seleccionado o controlado/descubierto — edificios del núcleo se reconocen solos
    if (z.type !== 'camp' || selected) {
      g.appendChild(
        svgEl('text', { x: z.x, y: z.y + z.r * 0.92 + 2.8, 'text-anchor': 'middle', class: 'zz-zone-label' }, [z.name])
      );
    }
  }

  if (z.state !== 'unknown') {
    g.addEventListener('click', (ev) => {
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

function drawLegend(parent, m) {
  const y = m.vbH - 8;
  const legend = svgEl('g', { class: 'zz-map-legend', transform: `translate(4,${y})` });
  [
    ['#3d8a52', 'Control'],
    ['#c4a050', 'Conocido'],
    ['#c05030', 'Hostil'],
    ['#1a1c20', 'Niebla'],
  ].forEach(([c, t], i) => {
    legend.appendChild(svgEl('rect', { x: i * 26, y: 0, width: 3.5, height: 3.5, rx: 0.5, fill: c }));
    legend.appendChild(svgEl('text', { x: i * 26 + 5, y: 3.1, class: 'zz-map-legend-t' }, [t]));
  });
  parent.appendChild(legend);
}

export function renderMap(svg, state, { onSelectZone } = {}) {
  if (!svg) return;
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const m = mapMetrics(svg);
  svg.setAttribute('viewBox', `0 0 ${m.vbW} ${m.vbH}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const tier = colonyVisualTier(state);
  svg.dataset.tier = String(tier);
  svg.dataset.wide = m.wide ? '1' : '0';
  addDefs(svg, tier);

  svg.appendChild(svgEl('rect', { width: m.vbW, height: m.vbH, fill: 'url(#zzMapSky)', class: 'zz-map-bg' }));
  svg.appendChild(svgEl('rect', { width: m.vbW, height: m.vbH, fill: 'url(#zzMapHaze)', class: 'zz-map-ground' }));

  const world = svgEl('g', {
    class: 'zz-map-world',
    transform: m.ox || m.oy ? `translate(${m.ox},${m.oy})` : undefined,
  });

  const zones = state.zones || [];
  const grid = drawRoads(world, zones, tier);
  drawUrbanBlocks(world, zones, grid, tier);
  drawRecoveredPaths(world, zones, tier);

  const layer = svgEl('g', { class: 'zz-map-layer zz-map-zones' });
  const ordered = [...zones].sort((a, b) => {
    const rank = { unknown: 0, discovered: 1, hostile: 2, controlled: 3 };
    return (rank[a.state] || 0) - (rank[b.state] || 0);
  });
  ordered.forEach((z) => drawZone(layer, z, state, tier, onSelectZone));
  world.appendChild(layer);

  drawExpeditions(world, state);
  svg.appendChild(world);
  drawWeather(svg, state.weather, m);
  drawLegend(svg, m);
}
