/**
 * Mapa mundo Zona Zero 1.3 — mundo-primero, assets raster + interacción directa.
 */
import { svgEl, paintBuildingGlyph, resolveVisualLevel } from './icons.js';
import { createRng, hashSeed } from './rng.js';
import { artUrl, buildingArtUrl, zoneArtUrl, TERRAIN_ART, FOG_ART, COLONY_YARD_ART } from './art.js';
import {
  ensureSectors,
  ptsStr as sectorPtsStr,
  getSector,
  recoveredSurfaces,
} from './sectors.js';

const VB_SQ = 100;

export function mapMetrics(svg) {
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

  // Grano de tierra (textura jugable, no foto aérea)
  const soilFilter = svgEl('filter', {
    id: 'zzSoilGrain',
    x: '0%',
    y: '0%',
    width: '100%',
    height: '100%',
    filterUnits: 'objectBoundingBox',
  });
  soilFilter.appendChild(
    svgEl('feTurbulence', {
      type: 'fractalNoise',
      baseFrequency: '0.9',
      numOctaves: '3',
      seed: '7',
      result: 'noise',
    })
  );
  soilFilter.appendChild(
    svgEl('feColorMatrix', {
      type: 'matrix',
      values: '0 0 0 0 0.12  0 0 0 0 0.1  0 0 0 0 0.07  0 0 0 0.35 0',
      in: 'noise',
      result: 'grain',
    })
  );
  soilFilter.appendChild(svgEl('feBlend', { in: 'SourceGraphic', in2: 'grain', mode: 'multiply' }));
  defs.appendChild(soilFilter);

  const dirtPat = svgEl('pattern', {
    id: 'zzDirtPat',
    patternUnits: 'userSpaceOnUse',
    width: '8',
    height: '8',
  });
  dirtPat.appendChild(svgEl('rect', { width: '8', height: '8', fill: '#2a241c' }));
  dirtPat.appendChild(svgEl('circle', { cx: '1.5', cy: '2', r: '0.6', fill: '#322c22', opacity: '0.5' }));
  dirtPat.appendChild(svgEl('circle', { cx: '5.5', cy: '5.5', r: '0.5', fill: '#1e1a14', opacity: '0.45' }));
  dirtPat.appendChild(svgEl('circle', { cx: '4', cy: '1', r: '0.4', fill: '#3a3228', opacity: '0.35' }));
  defs.appendChild(dirtPat);

  const packedPat = svgEl('pattern', {
    id: 'zzPackedPat',
    patternUnits: 'userSpaceOnUse',
    width: '6',
    height: '6',
  });
  packedPat.appendChild(svgEl('rect', { width: '6', height: '6', fill: '#3e3428' }));
  packedPat.appendChild(svgEl('circle', { cx: '2', cy: '2.5', r: '0.45', fill: '#4a4034', opacity: '0.4' }));
  packedPat.appendChild(svgEl('circle', { cx: '4.5', cy: '4', r: '0.35', fill: '#32281e', opacity: '0.35' }));
  defs.appendChild(packedPat);

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

/** Calles rotas — D1: sin tramos cerca del camp (evita look GIS/Maps). */
function drawRoads(parent, zones, tier) {
  const g = svgEl('g', { class: 'zz-map-layer zz-map-roads', 'aria-hidden': 'true' });
  if (tier <= 0) {
    parent.appendChild(g);
    return streetCorridors(zones);
  }
  const rng = createRng(hashSeed('roads-broken'));
  const camp = zones.find((z) => z.type === 'camp');
  const early = tier <= 0;
  const anchors = zones.filter((z) => z.type === 'camp' || z.state === 'discovered' || z.state === 'controlled');
  const pts = anchors.length ? anchors : camp ? [camp] : [{ x: 48, y: 62 }];
  pts.forEach((a) => {
    if (a.type === 'camp') return;
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
  });
  parent.appendChild(g);
  return streetCorridors(zones);
}

/**
 * Terreno jugable pintado (no fotografía aérea).
 * Suelo texturizado + restos lejanos — sin manchas GIS ni mapa.
 */
function drawPlayableTerrain(parent, camp, tier, day) {
  const g = svgEl('g', { class: 'zz-map-layer zz-map-play-ground', 'aria-hidden': 'true' });
  const rng = createRng(hashSeed(`play-ground:${camp?.id || 'c'}:${tier}`));
  const early = day <= 2;
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: 100, height: 100, class: 'zz-ground-base', fill: 'url(#zzDirtPat)' }));
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: 100, height: 100, class: 'zz-ground-grain', filter: 'url(#zzSoilGrain)' }));
  if (camp) {
    // Halo muy suave — funde colonia con ciudad, no “isla”
    const rngH = createRng(hashSeed(`halo:${camp.id || 'c'}`));
    const halo = irregularPatch(camp.x, camp.y + 1.0, early ? 28 : 18, early ? 22 : 14, rngH, 11);
    g.appendChild(svgEl('polygon', { points: ptsStr(halo), class: 'zz-ground-camp-halo' }));
  }
  // Calles diseñadas cerca del camp (estructura visual del mundo — no jugables)
  if (camp && early) {
    // Eje E–W principal (carretera apocalíptica)
    g.appendChild(
      svgEl('path', {
        d: `M${(camp.x - 26).toFixed(1)} ${(camp.y + 0.4).toFixed(1)} Q${camp.x.toFixed(1)} ${(camp.y + 1.2).toFixed(1)} ${(camp.x + 26).toFixed(1)} ${(camp.y + 0.2).toFixed(1)}`,
        class: 'zz-map-street-path zz-map-street-path--arterial',
        fill: 'none',
        'stroke-width': '3.2',
        opacity: '0.55',
      })
    );
    // Ramal N–S débil
    g.appendChild(
      svgEl('path', {
        d: `M${(camp.x + 0.6).toFixed(1)} ${(camp.y - 18).toFixed(1)} Q${(camp.x - 0.5).toFixed(1)} ${camp.y.toFixed(1)} ${(camp.x + 1.2).toFixed(1)} ${(camp.y + 18).toFixed(1)}`,
        class: 'zz-map-street-path',
        fill: 'none',
        'stroke-width': '2.2',
        opacity: '0.42',
      })
    );
    const roadRng = createRng(hashSeed(`roads-near:${camp.id || 'c'}`));
    for (let i = 0; i < 3; i++) {
      const ang = roadRng.float(0.2, Math.PI * 2);
      const x1 = camp.x + Math.cos(ang) * roadRng.float(8, 12);
      const y1 = camp.y + Math.sin(ang) * roadRng.float(6, 10);
      const x2 = camp.x + Math.cos(ang) * roadRng.float(20, 30);
      const y2 = camp.y + Math.sin(ang) * roadRng.float(16, 26);
      const mx = (x1 + x2) / 2 + roadRng.float(-2, 2);
      const my = (y1 + y2) / 2 + roadRng.float(-2, 2);
      g.appendChild(
        svgEl('path', {
          d: `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`,
          class: 'zz-map-street-path',
          fill: 'none',
          'stroke-width': '1.6',
          opacity: '0.35',
        })
      );
    }
  }
  const farN = early ? 22 : 22;
  for (let i = 0; i < farN; i++) {
    let x = rng.float(5, 95);
    let y = rng.float(5, 95);
    if (camp && Math.hypot(x - camp.x, y - camp.y) < 7) continue;
    g.appendChild(
      svgEl('ellipse', {
        cx: x,
        cy: y,
        rx: rng.float(1.0, 2.0),
        ry: rng.float(0.6, 1.2),
        class: 'zz-ground-dirt-far',
        transform: `rotate(${rng.float(-25, 25)} ${x} ${y})`,
      })
    );
  }
  const ruinN = early ? 28 : 18;
  for (let i = 0; i < ruinN; i++) {
    let x = rng.float(8, 92);
    let y = rng.float(10, 90);
    // Ruinas del mundo cerca del camp (no jugables) — ciudad continua
    if (camp && Math.hypot(x - camp.x, y - camp.y) < (early ? 5.5 : 10)) continue;
    const ang = rng.float(-35, 35);
    const w = rng.float(1.4, 2.4);
    g.appendChild(
      svgEl('rect', {
        x,
        y,
        width: w,
        height: 0.36,
        class: 'zz-ground-ruin-wall',
        transform: `rotate(${ang} ${x} ${y})`,
        rx: 0.06,
      })
    );
    if (rng.chance(0.5)) {
      g.appendChild(
        svgEl('rect', {
          x: x + w * 0.05,
          y: y - 0.05,
          width: 0.36,
          height: rng.float(0.8, 1.4),
          class: 'zz-ground-ruin-wall',
          transform: `rotate(${ang} ${x} ${y})`,
          rx: 0.06,
        })
      );
    }
  }
  parent.appendChild(g);
}

/** Ruinas urbanas — en D1 se omiten (el suelo jugable ya aporta restos lejanos). */
function drawUrbanBlocks(parent, zones, _grid, tier) {
  if (tier <= 0) return;
  const g = svgEl('g', { class: 'zz-map-layer zz-map-blocks', 'aria-hidden': 'true' });
  const rng = createRng(hashSeed('ruins-scatter'));
  const camp = zones.find((z) => z.type === 'camp');
  const n = 36;
  for (let i = 0; i < n; i++) {
    let x = rng.float(6, 94);
    let y = rng.float(8, 92);
    if (camp) {
      const d = Math.hypot(x - camp.x, y - camp.y);
      if (d < 12) continue;
    }
    const w = rng.float(1.4, 3.6);
    const h = rng.float(1.1, 3.0);
    const skew = rng.float(-0.4, 0.4);
    const pts = [
      [x, y],
      [x + w + skew, y + rng.float(-0.3, 0.3)],
      [x + w * 0.9, y + h],
      [x - skew * 0.5, y + h * 0.95],
    ];
    g.appendChild(svgEl('polygon', { points: ptsStr(pts), class: 'zz-map-ruin-foot' }));
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
    // Pecio compuesto (óxido / chatarra) — no silueta-icono
    layer.appendChild(
      svgEl('ellipse', {
        cx: x,
        cy: y + 0.35 * s,
        rx: 1.6 * s,
        ry: 0.45 * s,
        class: 'zz-prop-shadow',
      })
    );
    layer.appendChild(
      svgEl('path', {
        d: `M${x - 1.6 * s} ${y - 0.15 * s}
            L${x - 0.9 * s} ${y - 0.55 * s}
            L${x + 0.4 * s} ${y - 0.5 * s}
            L${x + 1.55 * s} ${y - 0.1 * s}
            L${x + 1.4 * s} ${y + 0.45 * s}
            L${x - 1.45 * s} ${y + 0.5 * s} Z`,
        class: 'zz-prop-vehicle',
      })
    );
    layer.appendChild(
      svgEl('path', {
        d: `M${x - 0.7 * s} ${y - 0.5 * s}
            L${x + 0.15 * s} ${y - 0.85 * s}
            L${x + 0.55 * s} ${y - 0.45 * s}
            L${x - 0.55 * s} ${y - 0.15 * s} Z`,
        class: 'zz-prop-vehicle-cab',
      })
    );
    layer.appendChild(svgEl('circle', { cx: x - 0.85 * s, cy: y + 0.48 * s, r: 0.28 * s, class: 'zz-prop-vehicle-wheel' }));
    layer.appendChild(svgEl('circle', { cx: x + 0.9 * s, cy: y + 0.5 * s, r: 0.26 * s, class: 'zz-prop-vehicle-wheel' }));
    layer.appendChild(
      svgEl('rect', {
        x: x + 0.2 * s,
        y: y - 0.05 * s,
        width: 0.7 * s,
        height: 0.22 * s,
        rx: 0.04,
        class: 'zz-prop-vehicle-rust',
        transform: `rotate(-12 ${x} ${y})`,
      })
    );
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

/** Centro aproximado de un polígono local (camp-relative). */
function polyCentroid(poly) {
  if (!poly?.length) return [0, 0];
  let sx = 0;
  let sy = 0;
  poly.forEach(([x, y]) => {
    sx += x;
    sy += y;
  });
  return [sx / poly.length, sy / poly.length];
}

/**
 * Identidad ambiental por sector — el mundo existe debajo; el status no es una placa.
 * Recuperados: más limpios/iluminados. No recuperados: ruinas/escombros/bloqueos visibles.
 */
function drawSectorIdentity(layer, sec, rng) {
  const local = sec.polyOff || [];
  if (local.length < 3) return;
  const [cx, cy] = polyCentroid(local);
  const recovered = sec.status === 'recovered';
  const recovering = sec.status === 'recovering';
  const dens = recovered ? 0.35 : recovering ? 0.7 : 1;

  // Variación de suelo muy sutil (nunca oscurecer como placa)
  if (sec.id !== 'core' && !recovered) {
    for (let i = 0; i < 2; i++) {
      const a = rng.float(0, Math.PI * 2);
      const r = rng.float(2, 5);
      const px = cx + Math.cos(a) * r * 0.4;
      const py = cy + Math.sin(a) * r * 0.35;
      layer.appendChild(
        svgEl('ellipse', {
          cx: px,
          cy: py,
          rx: rng.float(2.5, 4),
          ry: rng.float(1.6, 2.6),
          class: 'zz-sector-soil zz-sector-soil--wild',
          transform: `rotate(${rng.float(-28, 28)} ${px} ${py})`,
        })
      );
    }
  }

  const placeWall = (x, y, w, h, ang) => {
    layer.appendChild(
      svgEl('rect', {
        x,
        y,
        width: w,
        height: h,
        rx: 0.08,
        class: 'zz-settle-ruin-wall',
        transform: `rotate(${ang} ${x} ${y})`,
      })
    );
  };
  const placeDebris = (x, y, s = 1) => {
    layer.appendChild(
      svgEl('rect', {
        x: x - 0.4 * s,
        y: y - 0.18 * s,
        width: rng.float(0.55, 1.2) * s,
        height: rng.float(0.22, 0.4) * s,
        rx: 0.06,
        class: 'zz-settle-debris',
        transform: `rotate(${rng.float(-40, 40)} ${x} ${y})`,
      })
    );
  };

  switch (sec.id) {
    case 'core': {
      // Carretera E–W estructural (solo visual) — parte el núcleo; superficies a lados/sur
      layer.appendChild(
        svgEl('path', {
          d: 'M-11 0.35 Q-2 1.1 0 0.2 Q3 -0.4 11 0.15',
          class: 'zz-settle-road-asphalt',
          fill: 'none',
        })
      );
      layer.appendChild(
        svgEl('path', {
          d: 'M-10.5 0.35 Q-2 1.1 0 0.2 Q3 -0.4 10.5 0.15',
          class: 'zz-settle-road-edge',
          fill: 'none',
        })
      );
      // Vallas rotas / restos (futuro perímetro — solo visual)
      layer.appendChild(
        svgEl('path', {
          d: 'M-8.5 -5.2 L-5.5 -5.5 L-2.8 -4.8',
          class: 'zz-settle-fence-seg',
          fill: 'none',
        })
      );
      layer.appendChild(
        svgEl('path', {
          d: 'M6.5 -5.0 L9.2 -4.6 L11.0 -5.4',
          class: 'zz-settle-fence-seg',
          fill: 'none',
        })
      );
      placeWall(-1.2, -3.6, 2.4, 0.32, -8);
      placeWall(0.8, -3.2, 1.6, 0.28, 12);
      placeDebris(-0.4, -2.8, 0.9);
      placeDebris(1.1, -2.4, 0.7);
      drawProp(layer, 'lamp', 3.2, -2.4, 0.85);
      drawProp(layer, 'crate', -4.5, 2.8, 0.75);
      placeDebris(-5.2, 4.1, 0.65);
      placeDebris(5.5, 3.2, 0.7);
      placeDebris(4.8, -4.5, 0.6);
      break;
    }
    case 'lot_west': {
      // Aparcamiento: franjas asfalto tenues + pecios
      for (let i = 0; i < 3; i++) {
        layer.appendChild(
          svgEl('rect', {
            x: cx - 7 + i * 0.15,
            y: cy - 4.5 + i * 2.6,
            width: 11,
            height: 1.15,
            rx: 0.1,
            class: 'zz-sector-asphalt',
            transform: `rotate(${-8 + i * 2} ${cx} ${cy})`,
          })
        );
      }
      // Marcas de parking rotas (no GIS)
      for (let i = 0; i < 4; i++) {
        layer.appendChild(
          svgEl('rect', {
            x: cx - 5.5 + i * 2.8,
            y: cy - 3.8,
            width: 0.18,
            height: 1.0,
            class: 'zz-sector-park-mark',
            transform: `rotate(-8 ${cx} ${cy})`,
          })
        );
      }
      drawProp(layer, 'vehicle', cx - 3.5, cy - 2.2, 1.05);
      drawProp(layer, 'vehicle', cx + 2.8, cy + 1.5, 0.95);
      drawProp(layer, 'barrel', cx + 5.2, cy - 1.2, 0.95);
      drawProp(layer, 'crate', cx - 5.5, cy + 2.8, 1);
      placeWall(cx - 8, cy + 3.5, 4.5, 0.35, -12);
      for (let i = 0; i < 5; i++) placeDebris(cx + rng.float(-6, 6), cy + rng.float(-4, 4));
      break;
    }
    case 'ruins_east': {
      for (let i = 0; i < 5; i++) {
        placeWall(cx + rng.float(-5, 5), cy + rng.float(-4, 4), rng.float(2.2, 4.5), 0.38, rng.float(-40, 40));
      }
      placeWall(cx + 2, cy - 1, 0.4, 3.2, 12);
      placeWall(cx - 3, cy + 1.5, 0.35, 2.6, -18);
      for (let i = 0; i < 5 * dens; i++) placeDebris(cx + rng.float(-6, 6), cy + rng.float(-5, 5));
      if (!recovered) drawProp(layer, 'crate', cx - 1.5, cy + 2.5, 1.05);
      break;
    }
    case 'alley_south': {
      for (let i = 0; i < 4; i++) {
        layer.appendChild(
          svgEl('rect', {
            x: cx - 1.2 + i * 2.4,
            y: cy - 0.8,
            width: 0.22,
            height: 1.8,
            class: 'zz-settle-fence-seg',
            transform: `rotate(${rng.float(-12, 12)} ${cx} ${cy})`,
          })
        );
      }
      layer.appendChild(
        svgEl('path', {
          d: `M${cx - 8} ${cy} Q${cx} ${cy + 1.2} ${cx + 8} ${cy - 0.4}`,
          class: 'zz-settle-path-dirt zz-sector-alley',
          fill: 'none',
        })
      );
      for (let i = 0; i < 4 * dens; i++) placeDebris(cx + rng.float(-7, 7), cy + rng.float(-2, 2), 0.85);
      break;
    }
    case 'yard_north': {
      for (let i = 0; i < 6; i++) {
        layer.appendChild(
          svgEl('ellipse', {
            cx: cx + rng.float(-5, 5),
            cy: cy + rng.float(-3, 3),
            rx: rng.float(0.5, 1.1),
            ry: rng.float(0.35, 0.7),
            class: 'zz-settle-scrub',
          })
        );
      }
      placeWall(cx - 4, cy + 2, 6.5, 0.28, -6);
      if (!recovered) for (let i = 0; i < 4; i++) placeDebris(cx + rng.float(-5, 5), cy + rng.float(-3, 3));
      break;
    }
    case 'scrap_sw': {
      for (let i = 0; i < 4; i++) {
        drawProp(layer, i % 2 ? 'barrel' : 'crate', cx + rng.float(-4, 4), cy + rng.float(-3, 3), rng.float(0.8, 1.15));
      }
      for (let i = 0; i < 7 * dens; i++) placeDebris(cx + rng.float(-5, 5), cy + rng.float(-4, 4), 1.1);
      break;
    }
    case 'green_se':
    default: {
      for (let i = 0; i < 8; i++) {
        layer.appendChild(
          svgEl('ellipse', {
            cx: cx + rng.float(-5, 5),
            cy: cy + rng.float(-4, 4),
            rx: rng.float(0.6, 1.4),
            ry: rng.float(0.4, 0.9),
            class: recovered ? 'zz-settle-scrub' : 'zz-sector-scrub-wild',
          })
        );
      }
      if (!recovered) {
        placeWall(cx + 3, cy - 2, 3.5, 0.32, 25);
        for (let i = 0; i < 3; i++) placeDebris(cx + rng.float(-4, 4), cy + rng.float(-3, 3));
      }
      break;
    }
  }

  if (recovering) {
    layer.appendChild(
      svgEl('ellipse', {
        cx,
        cy,
        rx: 5.5,
        ry: 4,
        class: 'zz-sector-recovering-glow',
      })
    );
  }
}

/**
 * Patio / entorno de colonia: mundo continuo con identidad por zona.
 * Sin rellenos-polígono permanentes (evita lectura GIS/tablero).
 */
function drawSettlementYard(layer, buildings, scale, bw, bh, rng, ox, oy, spanX, spanY, day, state, camp) {
  ensureSectors(state);
  const sectors = state.sectors || [];

  // Suelo continuo bajo toda la colonia (no solo HQ) — pan sigue viendo textura de lugar
  const groundW = 58;
  const groundH = 48;
  layer.appendChild(
    svgEl('image', {
      href: artUrl(COLONY_YARD_ART),
      x: -groundW / 2 - 4,
      y: -groundH / 2,
      width: groundW,
      height: groundH,
      opacity: '0.48',
      preserveAspectRatio: 'xMidYMid slice',
      class: 'zz-settle-yard-art zz-settle-yard-art--wide',
      style: 'pointer-events:none',
    })
  );
  // Refuerzo suave bajo HQ (misma textura, un poco más presente)
  const yardW = scale * 6.5;
  const yardH = yardW * 1.0;
  layer.appendChild(
    svgEl('image', {
      href: artUrl(COLONY_YARD_ART),
      x: -yardW / 2,
      y: -yardH / 2 + scale * 0.08,
      width: yardW,
      height: yardH,
      opacity: '0.22',
      preserveAspectRatio: 'xMidYMid slice',
      class: 'zz-settle-yard-art',
      style: 'pointer-events:none',
    })
  );

  sectors.forEach((sec) => {
    const secRng = createRng(hashSeed(`sec-id:${sec.id}:${camp?.id || 'c'}`));
    drawSectorIdentity(layer, sec, secRng);
  });

  for (let i = 0; i < 9; i++) {
    const a = rng.float(0, Math.PI * 2);
    const r = scale * rng.float(0.55, 1.35);
    layer.appendChild(
      svgEl('ellipse', {
        cx: Math.cos(a) * r * 2.4,
        cy: Math.sin(a) * r * 1.7,
        rx: rng.float(0.28, 0.55),
        ry: rng.float(0.16, 0.32),
        class: 'zz-settle-scrub',
      })
    );
  }

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
}

/** Overlays solo en expand / selección / recovering — no GIS permanente */
function drawSectorOverlays(g, state, camp, { onSelectSector } = {}) {
  ensureSectors(state);
  const expand = state.uiMode === 'expand';
  const selected = state.selectedSectorId;
  const layer = svgEl('g', { class: 'zz-map-sectors', transform: `translate(${camp.x},${camp.y})` });

  state.sectors.forEach((sec) => {
    const local = sec.polyOff || [];
    if (local.length < 3) return;
    const pts = local.map(([x, y]) => `${x},${y}`).join(' ');
    const hit = svgEl('polygon', {
      points: pts,
      class: 'zz-sector-hit',
      fill: 'transparent',
      stroke: 'none',
    });
    hit.style.cursor = expand || selected ? 'pointer' : 'default';
    hit.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      onSelectSector && onSelectSector(sec.id);
    });
    layer.appendChild(hit);

    const isSel = sec.id === selected;
    // Expand: solo candidatos locked (+ recovering). Recuperados sin contorno (evita “isla”).
    const show =
      isSel || sec.status === 'recovering' || (expand && sec.status === 'locked');
    if (!show) return;

    let cls = 'zz-sector-outline';
    if (sec.status === 'recovered') cls += ' zz-sector-outline--recovered';
    else if (sec.status === 'recovering') cls += ' zz-sector-outline--recovering';
    else cls += ' zz-sector-outline--locked';
    if (isSel) cls += ' is-selected';
    else if (expand) cls += ' is-expand';

    layer.appendChild(svgEl('polygon', { points: pts, class: cls }));

    // Etiqueta solo si aporta (selección o recovering) — no cartelera de mapa
    if (isSel || sec.status === 'recovering') {
      const [cx, cy] = polyCentroid(local);
      const label = svgEl('text', {
        x: cx,
        y: cy,
        class: 'zz-sector-label',
        'text-anchor': 'middle',
      });
      label.textContent = sec.status === 'recovering' ? `${sec.name}…` : sec.name;
      layer.appendChild(label);
    }
  });

  g.appendChild(layer);
}

function drawBuildingFoundation(wrap, cell, rng) {
  const cx = cell * 0.5;
  const cy = cell * 0.9;
  const pad = irregularPatch(cx, cy, cell * 0.38, cell * 0.14, rng, 8);
  wrap.appendChild(svgEl('polygon', { points: ptsStr(pad), class: 'zz-settle-foundation' }));
}

/** Solo en modo Construir: revelar superficies edificables (no parcelas permanentes). */
function drawBuildableSurfaceHints(layer, state, scale, bw, bh) {
  const group = svgEl('g', { class: 'zz-settle-surfaces', 'aria-hidden': 'true' });
  recoveredSurfaces(state).forEach(({ surface }) => {
    const cells = surface.cells || [];
    if (!cells.length) return;
    cells.forEach(([cx, cy]) => {
      const lx = (cx - bw / 2 + 0.5) * scale;
      const ly = (cy - bh / 2 + 0.5) * scale;
      const s = scale * 0.92;
      group.appendChild(
        svgEl('ellipse', {
          cx: lx,
          cy: ly + s * 0.12,
          rx: s * 0.46,
          ry: s * 0.28,
          class: 'zz-settle-surface-pad',
        })
      );
    });
  });
  layer.appendChild(group);
}

function drawSettlementCore(g, state, camp, tier, { onSelectBuilding, onGhostPointer } = {}) {
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

  // Escala D1: edificio y terreno en la misma “unidad” visual
  const scale = day <= 2 ? (wide ? 4.6 : 4.3) : day <= 5 ? 3.6 : 2.95 + life * 0.18;
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
  const spanX = Math.max(scale * 2.9, (maxX - minX) / 2 + scale * 1.55);
  const spanY = Math.max(scale * 2.45, (maxY - minY) / 2 + scale * 1.35);

  drawSettlementYard(layer, buildings, scale, bw, bh, rng, ox, oy, spanX, spanY, day, state, camp);

  const buildMode = state.uiMode === 'build' && state.buildMode;
  if (buildMode) {
    drawBuildableSurfaceHints(layer, state, scale, bw, bh);
  }
  if (buildMode && state.buildGhost) {
    const gx = state.buildGhost.x;
    const gy = state.buildGhost.y;
    const lx = (gx - bw / 2 + 0.5) * scale;
    const ly = (gy - bh / 2 + 0.5) * scale;
    const cell = scale * 1.28;
    const valid = !!state.buildGhostValid;
    const wrap = svgEl('g', {
      class: `zz-settle-ghost-handle${valid ? ' is-valid' : ' is-invalid'}`,
      transform: `translate(${lx - cell / 2},${ly - cell / 2})`,
      'data-ghost': '1',
    });
    wrap.appendChild(
      svgEl('ellipse', {
        cx: cell / 2,
        cy: cell * 0.78,
        rx: cell * 0.42,
        ry: cell * 0.16,
        class: valid ? 'zz-settle-ghost-pad is-valid' : 'zz-settle-ghost-pad is-invalid',
      })
    );
    wrap.appendChild(
      svgEl('image', {
        href: buildingArtUrl(state.buildMode),
        x: 0,
        y: 0,
        width: cell,
        height: cell,
        opacity: valid ? '0.78' : '0.45',
        class: 'zz-settle-ghost',
        preserveAspectRatio: 'xMidYMid meet',
      })
    );
    // Handle amplio para arrastrar el ghost (no construye al soltar)
    wrap.appendChild(
      svgEl('rect', {
        x: -cell * 0.08,
        y: -cell * 0.08,
        width: cell * 1.16,
        height: cell * 1.16,
        class: 'zz-settle-ghost-hit',
        fill: 'transparent',
      })
    );
    if (onGhostPointer) {
      wrap.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        onGhostPointer(ev, { phase: 'down', camp, scale, bw, bh });
      });
    }
    layer.appendChild(wrap);
  }

  [...buildings]
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .forEach((b) => {
      const lx = (b.x - bw / 2 + 0.5) * scale;
      const ly = (b.y - bh / 2 + 0.5) * scale;
      const isHq = String(b.type).startsWith('hq_');
      const cell = scale * (isHq ? 1.48 : 1.28);
      const selected = state.selectedBuildingId === b.id;
      const wrap = svgEl('g', {
        class: `zz-settle-bldg${selected ? ' is-selected' : ''}${isHq ? ' zz-settle-bldg--hq' : ''}`,
        transform: `translate(${lx - cell / 2},${ly - cell / 2})`,
        'data-type': b.type,
        'data-id': b.id,
      });
      drawBuildingFoundation(wrap, cell, createRng(hashSeed(`found:${b.id}`)));
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


function drawIrregularFog(g, z, rng, early = false) {
  const fogG = svgEl('g', { class: 'zz-zone-fog-group', style: 'pointer-events:none' });
  const uid = String(z.id || 'z').replace(/[^a-zA-Z0-9_-]/g, '');
  const maskId = `fogMask_${uid}`;
  const defs = svgEl('defs', {});
  const mask = svgEl('mask', { id: maskId, maskUnits: 'userSpaceOnUse' });
  mask.appendChild(svgEl('rect', { x: z.x - z.r * 1.6, y: z.y - z.r * 1.5, width: z.r * 3.2, height: z.r * 3, fill: '#000' }));
  const blobN = early ? 4 : 7;
  for (let i = 0; i < blobN; i++) {
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
      opacity: early ? '0.55' : '0.92',
      preserveAspectRatio: 'xMidYMid slice',
      class: 'zz-zone-fog-tex',
    })
  );
  // En D1 no añadir elipses-blob encima (parecen nodos GIS al borde del encuadre)
  if (!early) {
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
  const { onSelectZone, onSelectBuilding, onPlaceCell, onSelectSector, onGhostPointer } = handlers || {};
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
    drawSettlementCore(g, state, z, tier, { onSelectBuilding, onGhostPointer });
    drawSectorOverlays(g, state, z, { onSelectSector });
  } else if (z.state === 'unknown') {
    drawIrregularFog(g, z, rng, (state.day || 1) <= 2);
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

const ZOOM_MIN = 1.45;
const ZOOM_MAX = 3.85;

export function recenterCamera(state) {
  if (!state) return;
  const camp = state.zones?.find((z) => z.type === 'camp');
  state.mapCamera = state.mapCamera || {};
  if (camp) {
    state.mapCamera.x = camp.x;
    // Ligero sesgo hacia abajo para mostrar acceso + espacio de crecimiento
    state.mapCamera.y = camp.y + (state.day <= 2 ? 0.6 : 0);
  } else {
    state.mapCamera.x = 50;
    state.mapCamera.y = 50;
  }
  const day = state.day || 1;
  const wide =
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(min-width: 900px)').matches;
  // ZZ-018 ronda: D1 más cerca (HQ + entorno); pan para lo lejano
  if (day <= 1) state.mapCamera.zoom = wide ? 2.85 : 3.05;
  else if (day <= 3) state.mapCamera.zoom = wide ? 2.35 : 2.55;
  else if (day <= 5) state.mapCamera.zoom = 2.15;
  else state.mapCamera.zoom = 1.75;
}

export function clampCamera(state) {
  if (!state?.mapCamera) return;
  const day = state.day || 1;
  // Zoom out permitido para lectura global; min deja margen de alejamiento
  const minZ = day <= 2 ? 1.65 : day <= 5 ? 1.5 : ZOOM_MIN;
  state.mapCamera.zoom = clamp(state.mapCamera.zoom || 1.4, minZ, ZOOM_MAX);
  const camp = state.zones?.find((z) => z.type === 'camp');
  if (camp) {
    const maxDist = day <= 2 ? 42 : day <= 5 ? 48 : 55;
    const dx = (state.mapCamera.x || camp.x) - camp.x;
    const dy = (state.mapCamera.y || camp.y) - camp.y;
    const d = Math.hypot(dx, dy);
    if (d > maxDist) {
      state.mapCamera.x = camp.x + (dx / d) * maxDist;
      state.mapCamera.y = camp.y + (dy / d) * maxDist;
    }
  }
  state.mapCamera.x = clamp(state.mapCamera.x ?? 50, 4, 96);
  state.mapCamera.y = clamp(state.mapCamera.y ?? 50, 4, 96);
}

/** Zoom relativo (±) respetando clamp D1. factor>1 acerca. */
export function zoomCameraBy(state, factor) {
  if (!state?.mapCamera) return;
  const f = Number(factor) || 1;
  state.mapCamera.zoom = (state.mapCamera.zoom || 1) * f;
  clampCamera(state);
}

/** Pan relativo en unidades de mundo. */
export function panCameraBy(state, dx, dy) {
  if (!state?.mapCamera) return;
  state.mapCamera.x = (state.mapCamera.x || 50) + (Number(dx) || 0);
  state.mapCamera.y = (state.mapCamera.y || 50) + (Number(dy) || 0);
  clampCamera(state);
}

export function cameraViewBox(state, m) {
  clampCamera(state);
  const cam = state.mapCamera || { x: 50, y: 48, zoom: 1.4 };
  const day = state.day || 1;
  const minZ = day <= 2 ? 1.65 : day <= 5 ? 1.5 : ZOOM_MIN;
  const zoom = clamp(cam.zoom || 1.4, minZ, ZOOM_MAX);
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
      zoomCameraBy(state, factor);
      applyMapCamera(svg(), state);
      onChange && onChange();
    },
    { passive: false }
  );

  wrap.addEventListener('pointerdown', (ev) => {
    if (ev.button != null && ev.button !== 0) return;
    const t = ev.target;
    // Ghost: mover edificio, no pan (§9.6)
    if (t?.closest?.('.zz-settle-ghost-handle')) {
      dragging = false;
      wrap.dataset.zzGhostDrag = '1';
      return;
    }
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
    if (wrap.dataset.zzGhostDrag === '1') return;
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
    if (wrap.dataset.zzGhostDrag === '1') {
      delete wrap.dataset.zzGhostDrag;
    }
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
  const { onSelectZone, onSelectBuilding, onPlaceCell, onSelectSector, onGhostPointer } = handlers;
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
      fill: '#12100e',
      class: 'zz-map-bg',
    })
  );

  const worldAttrs = { class: 'zz-map-world' };
  const world = svgEl('g', worldAttrs);
  const zones = state.zones || [];
  const camp = zones.find((z) => z.type === 'camp');
  // Terreno jugable pintado — NO fotografía/mapa aéreo city.webp
  drawPlayableTerrain(world, camp, tier, state.day || 1);
  const grid = drawRoads(world, zones, tier);
  drawUrbanBlocks(world, zones, grid, tier);
  drawRecoveredPaths(world, zones, tier);

  const layer = svgEl('g', { class: 'zz-map-layer zz-map-zones' });
  const ordered = [...zones].sort((a, b) => {
    const rank = { unknown: 0, discovered: 1, hostile: 2, controlled: 3 };
    return (rank[a.state] || 0) - (rank[b.state] || 0);
  });
  ordered.forEach((z) =>
    drawZone(layer, z, state, tier, { onSelectZone, onSelectBuilding, onSelectSector, onGhostPointer })
  );
  world.appendChild(layer);

  drawExpeditions(world, state);
  svg.appendChild(world);
  drawWeather(svg, state.weather, m);
  drawLegend();
}
