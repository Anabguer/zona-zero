/**
 * Mapa ciudad Zona Zero 1.1 — tejido urbano denso (no diagrama de nodos).
 *
 * CSS (game.css):
 *   .zz-map-bg, .zz-map-ground
 *   .zz-map-roads, .zz-map-avenue, .zz-map-street, .zz-map-street-fill
 *   .zz-map-blocks, .zz-map-block, .zz-map-bldg, .zz-map-bldg--tall|mid|low
 *   .zz-map-park, .zz-map-tree, .zz-map-shed, .zz-map-ruin, .zz-map-car, .zz-map-debris
 *   .zz-map-zones, .zz-zone, .zz-zone--unknown|discovered|hostile|controlled
 *   .zz-zone-plot, .zz-zone-fog, .zz-zone-q, .zz-zone-sil, .zz-zone-window
 *   .zz-zone-halo, .zz-zone-beacon, .zz-zone-danger, .zz-zone-label, .zz-zone-tint
 *   .zz-zone.is-selected, .zz-zone.is-risky
 *   .zz-map-expedition, .zz-map-route, .zz-map-route-marker, .zz-map-route-label
 *   .zz-map-weather, .zz-map-weather--clear|rain|storm|cold|fog|heat
 *   .zz-map-wx-particle, .zz-map-legend, .zz-map-legend-t
 */
import { svgEl } from './icons.js';
import { createRng, hashSeed } from './rng.js';

const STATE_CLASS = {
  unknown: 'zz-zone--unknown',
  discovered: 'zz-zone--discovered',
  controlled: 'zz-zone--controlled',
  hostile: 'zz-zone--hostile',
};

const VB = 100;

/* ── helpers ─────────────────────────────────────────── */

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function ptsStr(pts) {
  return pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
}

/** Manzana urbana (rectángulo irregular), no hexágono */
function districtPlot(z, seed = 0) {
  const rng = createRng(hashSeed(`plot:${z.id}:${seed}`));
  const hw = z.r * rng.float(0.78, 0.98);
  const hh = z.r * rng.float(0.62, 0.88);
  const skew = rng.float(-0.12, 0.12) * z.r;
  const inset = rng.float(0.04, 0.14) * z.r;
  // Esquinas con leve irregularidad (manzana real, no hex)
  return [
    [z.x - hw + rng.float(-inset, inset), z.y - hh + rng.float(-inset * 0.5, inset)],
    [z.x + hw + skew + rng.float(-inset, inset), z.y - hh + rng.float(-inset, inset * 0.5)],
    [z.x + hw + rng.float(-inset * 0.5, inset), z.y + hh + rng.float(-inset, inset)],
    [z.x - hw - skew + rng.float(-inset, inset), z.y + hh + rng.float(-inset * 0.5, inset)],
  ];
}

function plotBounds(pts) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  pts.forEach(([x, y]) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

/* ── defs / fondo ───────────────────────────────────── */

function addDefs(svg) {
  const defs = svgEl('defs');

  const sky = svgEl('linearGradient', { id: 'zzMapSky', x1: '0', y1: '0', x2: '0', y2: '1' });
  sky.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#2c261e' }));
  sky.appendChild(svgEl('stop', { offset: '45%', 'stop-color': '#1a1612' }));
  sky.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#0e0c0a' }));
  defs.appendChild(sky);

  const haze = svgEl('radialGradient', { id: 'zzMapHaze', cx: '48%', cy: '42%', r: '58%' });
  haze.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#3a3220', 'stop-opacity': '0.28' }));
  haze.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#0e0c0a', 'stop-opacity': '0' }));
  defs.appendChild(haze);

  const safeGlow = svgEl('radialGradient', { id: 'zzSafeGlow', cx: '50%', cy: '50%', r: '50%' });
  safeGlow.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#6dff9a', 'stop-opacity': '0.45' }));
  safeGlow.appendChild(svgEl('stop', { offset: '70%', 'stop-color': '#3d5c42', 'stop-opacity': '0.18' }));
  safeGlow.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#3d5c42', 'stop-opacity': '0' }));
  defs.appendChild(safeGlow);

  const hostTint = svgEl('radialGradient', { id: 'zzHostTint', cx: '50%', cy: '50%', r: '50%' });
  hostTint.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#e06040', 'stop-opacity': '0.35' }));
  hostTint.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#a04028', 'stop-opacity': '0' }));
  defs.appendChild(hostTint);

  const fogGrad = svgEl('linearGradient', { id: 'zzFogGrad', x1: '0', y1: '0', x2: '0', y2: '1' });
  fogGrad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#12100e', 'stop-opacity': '0.82' }));
  fogGrad.appendChild(svgEl('stop', { offset: '55%', 'stop-color': '#0e0c0a', 'stop-opacity': '0.9' }));
  fogGrad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#0a0908', 'stop-opacity': '0.95' }));
  defs.appendChild(fogGrad);

  svg.appendChild(defs);
}

/* ── tejido urbano base ──────────────────────────────── */

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

function drawRoads(parent, zones) {
  const g = svgEl('g', { class: 'zz-map-roads', 'aria-hidden': 'true' });
  const { xs, ys } = streetCorridors(zones);
  const mainX = new Set([28, 48, 68]);
  const mainY = new Set([32, 48, 62, 78]);

  // Avenidas (polígonos de calzada)
  ys.forEach((y) => {
    const thick = mainY.has(y) ? 2.4 : 1.15;
    g.appendChild(
      svgEl('rect', {
        x: 3,
        y: y - thick / 2,
        width: 94,
        height: thick,
        class: mainY.has(y) ? 'zz-map-avenue' : 'zz-map-street-fill',
        rx: 0.15,
      })
    );
  });
  xs.forEach((x) => {
    const thick = mainX.has(x) ? 2.2 : 1.05;
    g.appendChild(
      svgEl('rect', {
        x: x - thick / 2,
        y: 3,
        width: thick,
        height: 94,
        class: mainX.has(x) ? 'zz-map-avenue' : 'zz-map-street-fill',
        rx: 0.15,
      })
    );
  });

  // Marcas centrales en avenidas
  mainY.forEach((y) => {
    g.appendChild(
      svgEl('line', {
        x1: 6,
        y1: y,
        x2: 94,
        y2: y,
        class: 'zz-map-street',
        'stroke-dasharray': '1.2 1.8',
      })
    );
  });

  parent.appendChild(g);
  return { xs, ys };
}

function cellOccupied(cx, cy, zones, margin = 1.2) {
  return zones.some((z) => {
    const dx = Math.abs(cx - z.x);
    const dy = Math.abs(cy - z.y);
    return dx < z.r * 0.95 * margin && dy < z.r * 0.85 * margin;
  });
}

function drawUrbanBlocks(parent, zones, grid) {
  const g = svgEl('g', { class: 'zz-map-blocks', 'aria-hidden': 'true' });
  const rng = createRng(hashSeed(`city:${zones.map((z) => z.id).join(',')}`));
  const { xs, ys } = grid;

  // Manzanas entre calles
  for (let yi = 0; yi < ys.length - 1; yi++) {
    for (let xi = 0; xi < xs.length - 1; xi++) {
      const x0 = xs[xi] + 0.7;
      const y0 = ys[yi] + 0.7;
      const x1 = xs[xi + 1] - 0.7;
      const y1 = ys[yi + 1] - 0.7;
      const w = x1 - x0;
      const h = y1 - y0;
      if (w < 2.5 || h < 2.5) continue;

      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      if (cellOccupied(cx, cy, zones, 0.75)) continue;

      const pad = rng.float(0.15, 0.45);
      g.appendChild(
        svgEl('rect', {
          x: x0 + pad,
          y: y0 + pad,
          width: w - pad * 2,
          height: h - pad * 2,
          class: 'zz-map-block',
          rx: 0.2,
        })
      );

      // Huellas de edificios dentro de la manzana
      const cols = Math.max(1, Math.floor(w / 3.2));
      const rows = Math.max(1, Math.floor(h / 2.8));
      const gw = (w - pad * 2 - 0.4) / cols;
      const gh = (h - pad * 2 - 0.4) / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (rng.chance(0.18)) continue;
          const bw = gw * rng.float(0.55, 0.88);
          const bh = gh * rng.float(0.5, 0.9);
          const bx = x0 + pad + 0.2 + c * gw + (gw - bw) * rng.float(0.1, 0.5);
          const by = y0 + pad + 0.2 + r * gh + (gh - bh) * rng.float(0.05, 0.4);
          const tall = bh > gh * 0.72 ? 'tall' : bh > gh * 0.55 ? 'mid' : 'low';
          g.appendChild(
            svgEl('rect', {
              x: bx,
              y: by,
              width: bw,
              height: bh,
              class: `zz-map-bldg zz-map-bldg--${tall}`,
              rx: 0.12,
            })
          );
        }
      }
    }
  }

  // Parques / industriales / ruinas anclados a tipología de zona cercana
  zones.forEach((z) => {
    const local = createRng(hashSeed(`fabric:${z.id}`));
    if (z.type === 'park' || (z.type !== 'industrial' && local.chance(0.12))) {
      const px = clamp(z.x + local.float(-z.r * 1.4, z.r * 1.4), 6, 94);
      const py = clamp(z.y + local.float(-z.r * 1.2, z.r * 1.2), 6, 94);
      if (!cellOccupied(px, py, zones, 0.55) || z.type === 'park') {
        const pw = local.float(4, 7);
        const ph = local.float(3.2, 5.5);
        g.appendChild(
          svgEl('rect', {
            x: px - pw / 2,
            y: py - ph / 2,
            width: pw,
            height: ph,
            class: 'zz-map-park',
            rx: 0.8,
          })
        );
        for (let t = 0; t < 5; t++) {
          g.appendChild(
            svgEl('circle', {
              cx: px + local.float(-pw * 0.35, pw * 0.35),
              cy: py + local.float(-ph * 0.35, ph * 0.35),
              r: local.float(0.35, 0.65),
              class: 'zz-map-tree',
            })
          );
        }
      }
    }

    if (z.type === 'industrial' || z.type === 'warehouse' || z.type === 'workshop') {
      const sx = clamp(z.x + local.float(z.r * 0.9, z.r * 1.6) * (local.chance(0.5) ? 1 : -1), 5, 92);
      const sy = clamp(z.y + local.float(-2, 4), 5, 94);
      if (!cellOccupied(sx, sy, [z], 1.1)) {
        g.appendChild(
          svgEl('rect', {
            x: sx - 3.5,
            y: sy - 1.6,
            width: local.float(5.5, 8),
            height: local.float(2.4, 3.4),
            class: 'zz-map-shed',
            rx: 0.15,
          })
        );
      }
    }

    // Ruinas y escombros cerca de cada distrito
    for (let i = 0; i < 3; i++) {
      const ang = local.float(0, Math.PI * 2);
      const dist = z.r * local.float(1.05, 1.55);
      const rx = clamp(z.x + Math.cos(ang) * dist, 4, 96);
      const ry = clamp(z.y + Math.sin(ang) * dist, 4, 96);
      if (cellOccupied(rx, ry, zones, 0.7)) continue;
      g.appendChild(
        svgEl('rect', {
          x: rx,
          y: ry,
          width: local.float(1.2, 2.8),
          height: local.float(0.9, 2.2),
          class: 'zz-map-ruin',
          transform: `rotate(${local.float(-18, 18)} ${rx} ${ry})`,
        })
      );
    }

    // Coches abandonados / debris
    for (let i = 0; i < 2; i++) {
      const ang = local.float(0, Math.PI * 2);
      const dist = z.r * local.float(0.95, 1.35);
      const cx = clamp(z.x + Math.cos(ang) * dist, 3, 97);
      const cy = clamp(z.y + Math.sin(ang) * dist, 3, 97);
      g.appendChild(
        svgEl('rect', {
          x: cx,
          y: cy,
          width: local.float(0.7, 1.3),
          height: local.float(0.35, 0.55),
          class: 'zz-map-car',
          rx: 0.08,
          transform: `rotate(${local.float(-40, 40)} ${cx} ${cy})`,
        })
      );
      g.appendChild(
        svgEl('rect', {
          x: cx + local.float(-1.5, 1.5),
          y: cy + local.float(-1.2, 1.2),
          width: local.float(0.25, 0.55),
          height: local.float(0.2, 0.4),
          class: 'zz-map-debris',
        })
      );
    }
  });

  parent.appendChild(g);
}

/** Calles finas entre vecinos — parecen vial, no aristas de grafo */
function drawStreetLinks(parent, zones) {
  const g = svgEl('g', { class: 'zz-map-links', 'aria-hidden': 'true' });
  zones.forEach((z) => {
    (z.neighbors || []).forEach((nid) => {
      if (z.id >= nid) return;
      const n = zones.find((x) => x.id === nid);
      if (!n) return;
      // polilínea ortogonal suave (calle)
      const mx = (z.x + n.x) / 2;
      const my = (z.y + n.y) / 2;
      const d =
        Math.abs(z.x - n.x) > Math.abs(z.y - n.y)
          ? `M${z.x} ${z.y} H${mx} V${n.y} H${n.x}`
          : `M${z.x} ${z.y} V${my} H${n.x} V${n.y}`;
      g.appendChild(svgEl('path', { d, class: 'zz-map-link' }));
    });
  });
  parent.appendChild(g);
}

/* ── siluetas por tipo de zona ───────────────────────── */

function footprintsForType(type, z, rng) {
  const r = z.r;
  const items = [];

  const pushRect = (ox, oy, w, h, kind = 'mid') => {
    items.push({
      x: z.x + ox,
      y: z.y + oy,
      w,
      h,
      kind,
    });
  };

  switch (type) {
    case 'apartments':
    case 'offices':
      for (let i = 0; i < 5; i++) {
        pushRect(-r * 0.55 + i * r * 0.24, -r * 0.55, r * 0.18, r * (0.45 + (i % 3) * 0.12), i % 2 ? 'tall' : 'mid');
      }
      break;
    case 'supermarket':
    case 'mall':
    case 'warehouse':
      pushRect(-r * 0.55, -r * 0.25, r * 1.05, r * 0.42, 'low');
      pushRect(-r * 0.2, -r * 0.55, r * 0.35, r * 0.28, 'mid');
      break;
    case 'hospital':
      pushRect(-r * 0.5, -r * 0.35, r * 0.95, r * 0.55, 'mid');
      pushRect(-r * 0.12, -r * 0.7, r * 0.22, r * 0.35, 'tall');
      break;
    case 'pharmacy':
    case 'hardware':
      pushRect(-r * 0.4, -r * 0.2, r * 0.75, r * 0.4, 'low');
      pushRect(r * 0.15, -r * 0.45, r * 0.28, r * 0.3, 'mid');
      break;
    case 'gas_station':
      pushRect(-r * 0.45, -r * 0.1, r * 0.55, r * 0.32, 'low');
      pushRect(r * 0.15, -r * 0.35, r * 0.28, r * 0.22, 'mid');
      // marquesina
      pushRect(-r * 0.5, -r * 0.42, r * 0.7, r * 0.12, 'low');
      break;
    case 'industrial':
    case 'workshop':
    case 'substation':
    case 'water_plant':
      pushRect(-r * 0.6, -r * 0.15, r * 0.7, r * 0.35, 'low');
      pushRect(r * 0.05, -r * 0.25, r * 0.5, r * 0.45, 'mid');
      pushRect(-r * 0.15, -r * 0.55, r * 0.18, r * 0.3, 'tall');
      break;
    case 'park':
      // pocos edificios; el parque se pinta aparte
      pushRect(-r * 0.55, r * 0.15, r * 0.35, r * 0.22, 'low');
      pushRect(r * 0.15, r * 0.2, r * 0.28, r * 0.18, 'low');
      break;
    case 'police':
    case 'station':
    case 'school':
      pushRect(-r * 0.55, -r * 0.3, r * 1.05, r * 0.5, 'mid');
      pushRect(-r * 0.25, -r * 0.55, r * 0.45, r * 0.28, 'tall');
      break;
    case 'camp':
      pushRect(-r * 0.4, -r * 0.15, r * 0.35, r * 0.28, 'low');
      pushRect(r * 0.05, -r * 0.25, r * 0.32, r * 0.35, 'mid');
      pushRect(-r * 0.15, -r * 0.5, r * 0.22, r * 0.22, 'mid');
      break;
    default:
      for (let i = 0; i < 3; i++) {
        pushRect(
          -r * 0.45 + i * r * 0.32,
          -r * 0.35 + rng.float(-0.1, 0.1) * r,
          r * 0.22,
          r * rng.float(0.28, 0.5),
          i === 1 ? 'tall' : 'mid'
        );
      }
  }
  return items;
}

function drawDistrictBuildings(g, z) {
  const rng = createRng(hashSeed(`sil:${z.id}`));
  const footprints = footprintsForType(z.type, z, rng);

  if (z.type === 'park') {
    g.appendChild(
      svgEl('ellipse', {
        cx: z.x,
        cy: z.y - z.r * 0.05,
        rx: z.r * 0.55,
        ry: z.r * 0.4,
        class: 'zz-map-park',
      })
    );
    for (let i = 0; i < 7; i++) {
      g.appendChild(
        svgEl('circle', {
          cx: z.x + rng.float(-z.r * 0.4, z.r * 0.4),
          cy: z.y + rng.float(-z.r * 0.3, z.r * 0.25),
          r: rng.float(0.4, 0.75),
          class: 'zz-map-tree',
        })
      );
    }
  }

  footprints.forEach((b, i) => {
    g.appendChild(
      svgEl('rect', {
        x: b.x,
        y: b.y,
        width: b.w,
        height: b.h,
        class: `zz-zone-sil zz-map-bldg--${b.kind}`,
        rx: 0.2,
      })
    );
    if (z.state === 'controlled') {
      const winN = b.kind === 'tall' ? 3 : b.kind === 'mid' ? 2 : 1;
      for (let w = 0; w < winN; w++) {
        g.appendChild(
          svgEl('rect', {
            x: b.x + b.w * (0.15 + w * 0.28),
            y: b.y + b.h * (0.2 + (i % 2) * 0.15),
            width: Math.max(0.25, b.w * 0.12),
            height: Math.max(0.25, b.h * 0.12),
            class: 'zz-zone-window',
          })
        );
      }
    }
  });
}

/* ── zonas / distritos ───────────────────────────────── */

function drawZone(layer, z, state, onSelectZone) {
  const selected = state.selectedZoneId === z.id;
  const g = svgEl('g', {
    class: [
      'zz-zone',
      STATE_CLASS[z.state] || '',
      selected ? 'is-selected' : '',
      z.risk >= 0.45 && z.state !== 'controlled' ? 'is-risky' : '',
    ]
      .filter(Boolean)
      .join(' '),
    'data-id': z.id,
    'data-type': z.type,
  });
  g.style.cursor = z.state === 'unknown' ? 'default' : 'pointer';

  const plot = districtPlot(z);
  const polyPts = ptsStr(plot);

  if (z.state === 'controlled') {
    const b = plotBounds(plot);
    g.appendChild(
      svgEl('ellipse', {
        cx: z.x,
        cy: z.y,
        rx: b.w * 0.72,
        ry: b.h * 0.72,
        class: 'zz-zone-halo',
        fill: 'url(#zzSafeGlow)',
      })
    );
  }

  if (z.state === 'hostile') {
    g.appendChild(
      svgEl('ellipse', {
        cx: z.x,
        cy: z.y,
        rx: z.r * 0.95,
        ry: z.r * 0.85,
        fill: 'url(#zzHostTint)',
        class: 'zz-zone-tint',
      })
    );
  }

  g.appendChild(svgEl('polygon', { points: polyPts, class: 'zz-zone-plot zz-zone-poly' }));

  // Edificios siempre debajo de la niebla (silueta tenue en unknown)
  drawDistrictBuildings(g, z);

  if (z.state === 'unknown') {
    // Niebla urbana: cubre la manzana; sin "?" ni nodos
    g.appendChild(svgEl('polygon', { points: polyPts, class: 'zz-zone-fog' }));
  } else {
    if (z.state === 'hostile' || (z.state === 'discovered' && z.risk >= 0.45)) {
      g.appendChild(
        svgEl('path', {
          d: `M${z.x} ${z.y - z.r * 0.78} l2.1 3.8 h-4.2 z`,
          class: 'zz-zone-danger',
        })
      );
    }

    if (z.state === 'controlled') {
      g.appendChild(
        svgEl('circle', {
          cx: z.x,
          cy: z.y - z.r * 0.78,
          r: 1.8,
          class: 'zz-zone-beacon',
        })
      );
      g.appendChild(
        svgEl('circle', {
          cx: z.x,
          cy: z.y - z.r * 0.78,
          r: 0.7,
          class: 'zz-zone-beacon',
          fill: '#fff8e0',
          opacity: '0.9',
        })
      );
    }

    g.appendChild(
      svgEl(
        'text',
        {
          x: z.x,
          y: z.y + z.r * 0.92 + 3.2,
          'text-anchor': 'middle',
          class: 'zz-zone-label',
        },
        [z.name]
      )
    );
  }

  if (z.state !== 'unknown') {
    g.addEventListener('click', (ev) => {
      ev.preventDefault();
      onSelectZone && onSelectZone(z.id);
    });
  }

  layer.appendChild(g);
}

/* ── expedición ──────────────────────────────────────── */

function drawExpedition(svg, state) {
  const list = state.expeditions?.length
    ? state.expeditions
    : state.expedition
      ? [state.expedition]
      : [];
  if (!list.length) return;
  const camp =
    state.zones.find((z) => z.id === 'camp' || z.type === 'camp') ||
    state.zones.find((z) => z.state === 'controlled');
  if (!camp) return;

  list.forEach((ex, idx) => {
    const dest = state.zones.find((z) => z.id === ex.zoneId);
    if (!dest) return;
    const explorer = (state.explorers || []).find((e) => e.id === ex.explorerId || (ex.survivorIds || [])[0]);
    const label = explorer ? `${explorer.name} · D${ex.returnDay}` : `Expedición · D${ex.returnDay}`;

    const g = svgEl('g', { class: 'zz-map-expedition' });
    const bend = (idx % 2 === 0 ? 1 : -1) * (0.08 + idx * 0.02);
    const mx = (camp.x + dest.x) / 2 + (dest.y - camp.y) * bend;
    const my = (camp.y + dest.y) / 2 - (dest.x - camp.x) * bend;
    const d = `M${camp.x} ${camp.y} Q${mx} ${my} ${dest.x} ${dest.y}`;
    g.appendChild(svgEl('path', { d, class: 'zz-map-route', fill: 'none' }));
    const t = 0.45 + idx * 0.08;
    const px = (1 - t) * (1 - t) * camp.x + 2 * (1 - t) * t * mx + t * t * dest.x;
    const py = (1 - t) * (1 - t) * camp.y + 2 * (1 - t) * t * my + t * t * dest.y;
    g.appendChild(svgEl('circle', { cx: px, cy: py, r: 1.8, class: 'zz-map-route-marker' }));
    g.appendChild(
      svgEl('text', { x: px, y: py - 2.8, 'text-anchor': 'middle', class: 'zz-map-route-label' }, [label])
    );
    svg.appendChild(g);
  });
}

/* ── clima ───────────────────────────────────────────── */

function drawWeather(svg, weather) {
  const w = weather || 'clear';
  const g = svgEl('g', {
    class: `zz-map-weather zz-map-weather--${w}`,
    'aria-hidden': 'true',
  });

  const rng = createRng(hashSeed(`wx:${w}`));
  if (w === 'rain' || w === 'storm') {
    const n = w === 'storm' ? 28 : 18;
    for (let i = 0; i < n; i++) {
      const x = rng.float(4, 96);
      const y = rng.float(4, 92);
      const len = w === 'storm' ? rng.float(2.5, 4.5) : rng.float(1.8, 3.2);
      g.appendChild(
        svgEl('line', {
          x1: x,
          y1: y,
          x2: x - len * 0.25,
          y2: y + len,
          class: 'zz-map-wx-particle',
        })
      );
    }
  } else if (w === 'cold') {
    for (let i = 0; i < 16; i++) {
      g.appendChild(
        svgEl('circle', {
          cx: rng.float(5, 95),
          cy: rng.float(5, 95),
          r: rng.float(0.2, 0.45),
          class: 'zz-map-wx-particle',
        })
      );
    }
  } else if (w === 'fog') {
    g.appendChild(
      svgEl('rect', {
        x: 0,
        y: 0,
        width: VB,
        height: VB,
        class: 'zz-map-wx-particle',
        opacity: '0.22',
        fill: '#8a8478',
      })
    );
  } else if (w === 'heat') {
    g.appendChild(
      svgEl('rect', {
        x: 0,
        y: 0,
        width: VB,
        height: VB,
        class: 'zz-map-wx-particle',
        opacity: '0.12',
        fill: '#c08040',
      })
    );
  }

  svg.appendChild(g);
}

/* ── leyenda ─────────────────────────────────────────── */

function drawLegend(svg) {
  const legend = svgEl('g', { class: 'zz-map-legend', transform: 'translate(3,91)' });
  [
    ['#3d6a48', 'Control'],
    ['#8a6a38', 'Conocido'],
    ['#a05030', 'Hostil'],
    ['#2a2826', 'Niebla'],
  ].forEach(([c, t], i) => {
    legend.appendChild(svgEl('rect', { x: i * 24, y: 0, width: 3.5, height: 3.5, rx: 0.5, fill: c }));
    legend.appendChild(svgEl('text', { x: i * 24 + 5, y: 3.1, class: 'zz-map-legend-t' }, [t]));
  });
  svg.appendChild(legend);
}

/* ── export ──────────────────────────────────────────── */

export function renderMap(svg, state, { onSelectZone } = {}) {
  if (!svg) return;
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  if (!svg.getAttribute('viewBox')) {
    svg.setAttribute('viewBox', '0 0 100 100');
  }

  addDefs(svg);

  svg.appendChild(svgEl('rect', { width: VB, height: VB, fill: 'url(#zzMapSky)', class: 'zz-map-bg' }));
  svg.appendChild(svgEl('rect', { width: VB, height: VB, fill: 'url(#zzMapHaze)', class: 'zz-map-ground' }));

  const zones = state.zones || [];
  const grid = drawRoads(svg, zones);
  drawUrbanBlocks(svg, zones, grid);
  drawStreetLinks(svg, zones);

  const layer = svgEl('g', { class: 'zz-map-zones' });
  zones.forEach((z) => drawZone(layer, z, state, onSelectZone));
  svg.appendChild(layer);

  drawExpedition(svg, state);
  drawWeather(svg, state.weather);
  drawLegend(svg);
}
