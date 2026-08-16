/**
 * Mapa mundo Zona Zero 1.3 — mundo-primero, assets raster + interacción directa.
 */
import { svgEl, paintBuildingGlyph, resolveVisualLevel } from './icons.js';
import { createRng, hashSeed } from './rng.js';
import { artUrl, buildingArtUrl, zoneArtUrl, FOG_ART, COLONY_YARD_ART } from './art.js';
import { buildingStructuralState, buildingMaxHp } from './buildings-damage.js';
import { drawAmbientLife, expeditionProgress } from './ambient-life.js';
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
  contested: 'zz-zone--contested',
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
 * Clusters de identidad en coords de mapa (pan legible sin etiquetas).
 * Solo composición — no sistema nuevo.
 */
function drawWorldIdentityCluster(g, cx, cy, kind, rng) {
  if (kind === 'asphalt') {
    const tone = irregularPatch(cx, cy, 7.5, 5.5, rng, 9);
    g.appendChild(svgEl('polygon', { points: ptsStr(tone), class: 'zz-env-tone zz-env-tone--asphalt' }));
    // ZZ-019B: sin franjas rectangulares tipo parking GIS — manchas + props
    for (let i = 0; i < 4; i++) {
      const patch = irregularPatch(
        cx + rng.float(-4.5, 4.5),
        cy + rng.float(-3.2, 3.2),
        rng.float(1.4, 2.6),
        rng.float(0.55, 1.1),
        rng,
        7
      );
      g.appendChild(svgEl('polygon', { points: ptsStr(patch), class: 'zz-env-tone zz-env-tone--asphalt' }));
    }
    drawProp(g, 'vehicle', cx - 2.5, cy - 1.2, 1.2);
    drawProp(g, 'vehicle', cx + 3.0, cy + 1.5, 1.05);
    drawProp(g, 'barrel', cx + 5, cy - 2, 1);
    drawProp(g, 'crate', cx - 5, cy + 2.2, 1);
  } else if (kind === 'urban') {
    const tone = irregularPatch(cx, cy, 7, 6, rng, 10);
    g.appendChild(svgEl('polygon', { points: ptsStr(tone), class: 'zz-env-tone zz-env-tone--urban' }));
    for (let i = 0; i < 6; i++) {
      const x = cx + rng.float(-5, 5);
      const y = cy + rng.float(-4, 4);
      g.appendChild(
        svgEl('rect', {
          x,
          y,
          width: rng.float(2.2, 4.8),
          height: 0.42,
          rx: 0.06,
          class: 'zz-settle-ruin-wall',
          transform: `rotate(${rng.float(-40, 40)} ${x} ${y})`,
        })
      );
    }
    g.appendChild(
      svgEl('rect', {
        x: cx + 1.5,
        y: cy - 2.5,
        width: 0.45,
        height: 4.5,
        class: 'zz-settle-ruin-wall',
        transform: `rotate(8 ${cx} ${cy})`,
      })
    );
    drawProp(g, 'vehicle', cx + 3.5, cy + 2.5, 1.1);
    drawProp(g, 'crate', cx - 2, cy + 2, 1.1);
    drawProp(g, 'barrel', cx - 3.5, cy - 1.5, 0.95);
    for (let i = 0; i < 6; i++) {
      const x = cx + rng.float(-5, 5);
      const y = cy + rng.float(-4, 4);
      g.appendChild(
        svgEl('rect', {
          x: x - 0.4,
          y: y - 0.2,
          width: rng.float(0.6, 1.3),
          height: rng.float(0.25, 0.45),
          class: 'zz-settle-debris',
          transform: `rotate(${rng.float(-35, 35)} ${x} ${y})`,
        })
      );
    }
  } else if (kind === 'green') {
    const tone = irregularPatch(cx, cy, 8, 6.5, rng, 11);
    g.appendChild(svgEl('polygon', { points: ptsStr(tone), class: 'zz-env-tone zz-env-tone--green' }));
    for (let i = 0; i < 5; i++) {
      const patch = irregularPatch(cx + rng.float(-5, 5), cy + rng.float(-4, 4), rng.float(1.2, 2.2), rng.float(0.7, 1.3), rng, 7);
      g.appendChild(svgEl('polygon', { points: ptsStr(patch), class: 'zz-sector-scrub-wild' }));
    }
    drawProp(g, 'tree', cx - 3.2, cy - 1.8, 1.25);
    drawProp(g, 'tree', cx + 3.8, cy + 1.2, 1.1);
    drawProp(g, 'tree', cx + 0.2, cy - 3.5, 0.95);
    drawProp(g, 'tree', cx - 5.0, cy + 2.5, 1.05);
    drawProp(g, 'tree', cx + 5.5, cy - 2.0, 0.9);
  }
}

/**
 * Terreno jugable pintado (no fotografía aérea).
 * ZZ-161: a zoom alto densifica carretera/grietas cerca del camp (LOD barato).
 */
function drawPlayableTerrain(parent, camp, tier, day, zoom = 1.5) {
  const g = svgEl('g', { class: 'zz-map-layer zz-map-play-ground', 'aria-hidden': 'true' });
  const rng = createRng(hashSeed(`play-ground:${camp?.id || 'c'}:${tier}`));
  const early = day <= 2;
  const closeUp = zoom >= 2.55;
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: 100, height: 100, class: 'zz-ground-base', fill: 'url(#zzDirtPat)' }));
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: 100, height: 100, class: 'zz-ground-grain', filter: 'url(#zzSoilGrain)' }));
  if (camp) {
    // Halo muy suave — funde colonia con ciudad, no “isla”
    const rngH = createRng(hashSeed(`halo:${camp.id || 'c'}`));
    const halo = irregularPatch(camp.x, camp.y + 1.0, early ? 28 : 18, early ? 22 : 14, rngH, 11);
    g.appendChild(svgEl('polygon', { points: ptsStr(halo), class: 'zz-ground-camp-halo' }));
  }
  // Calles diseñadas cerca del camp — early siempre; close-up también mid/late (ZZ-161)
  if (camp && (early || closeUp)) {
    const roadRng = createRng(hashSeed(`roads-near:${camp.id || 'c'}:${closeUp ? 'z' : 'e'}`));
    const roadLen = closeUp && !early ? 36 : 56;
    const roadHalf = roadLen / 2;
    // Arterial E–W como franja irregular (no stroke limpio)
    const arterial = [];
    for (let t = 0; t <= 12; t++) {
      const u = t / 12;
      const x = camp.x - roadHalf + u * roadLen;
      const y = camp.y + 0.3 + Math.sin(u * Math.PI * 1.3) * 0.9 + roadRng.float(-0.35, 0.35);
      arterial.push([x, y - (1.1 + roadRng.float(0, 0.35))]);
    }
    for (let t = 12; t >= 0; t--) {
      const u = t / 12;
      const x = camp.x - roadHalf + u * roadLen;
      const y = camp.y + 0.3 + Math.sin(u * Math.PI * 1.3) * 0.9 + roadRng.float(-0.35, 0.35);
      arterial.push([x, y + (1.15 + roadRng.float(0, 0.4))]);
    }
    g.appendChild(svgEl('polygon', { points: ptsStr(arterial), class: 'zz-world-road-fill' }));
    const grimeN = closeUp ? 28 : 18;
    for (let i = 0; i < grimeN; i++) {
      const u = i / Math.max(1, grimeN - 1);
      const x = camp.x - roadHalf + 2 + u * (roadLen - 4) + roadRng.float(-0.8, 0.8);
      const y = camp.y + roadRng.float(-2.4, 2.4);
      g.appendChild(
        svgEl('ellipse', {
          cx: x,
          cy: y,
          rx: roadRng.float(0.55, closeUp ? 1.4 : 1.8),
          ry: roadRng.float(0.22, 0.65),
          class: 'zz-world-road-grime',
        })
      );
    }
    const crackN = closeUp ? 16 : 10;
    for (let i = 0; i < crackN; i++) {
      const x0 = camp.x - roadHalf + 4 + i * ((roadLen - 8) / Math.max(1, crackN - 1));
      g.appendChild(
        svgEl('path', {
          d: `M${x0.toFixed(1)} ${(camp.y + roadRng.float(-0.55, 0.55)).toFixed(1)} L${(x0 + roadRng.float(1.6, 3.8)).toFixed(1)} ${(camp.y + roadRng.float(-0.65, 0.65)).toFixed(1)}`,
          class: 'zz-world-road-crack',
          fill: 'none',
        })
      );
    }
    const spur = irregularPatch(camp.x + 0.8, camp.y - 2, 1.3, 16, roadRng, 9);
    g.appendChild(svgEl('polygon', { points: ptsStr(spur), class: 'zz-world-road-spur' }));

    drawWorldIdentityCluster(g, camp.x - 18, camp.y + 0.5, 'asphalt', roadRng);
    drawWorldIdentityCluster(g, camp.x + 17, camp.y - 2.5, 'urban', roadRng);
    drawWorldIdentityCluster(g, camp.x + 12, camp.y + 15, 'green', roadRng);

    // Close-up: restos urbanos cercanos legibles (no GIS, no city.webp)
    if (closeUp) {
      for (let i = 0; i < 8; i++) {
        const ang = roadRng.float(0, Math.PI * 2);
        const dist = roadRng.float(4.5, 9);
        const x = camp.x + Math.cos(ang) * dist;
        const y = camp.y + Math.sin(ang) * dist;
        g.appendChild(
          svgEl('rect', {
            x: x - 0.7,
            y: y - 0.15,
            width: roadRng.float(1.2, 2.2),
            height: 0.32,
            class: 'zz-ground-ruin-wall zz-ground-ruin-wall--near',
            transform: `rotate(${roadRng.float(-28, 28)} ${x} ${y})`,
            rx: 0.05,
          })
        );
      }
    }
  }
  const farN = early ? 8 : closeUp ? 22 : 18;
  for (let i = 0; i < farN; i++) {
    let x = rng.float(5, 95);
    let y = rng.float(5, 95);
    if (camp && Math.hypot(x - camp.x, y - camp.y) < 7) continue;
    const patch = irregularPatch(x, y, rng.float(1.0, 2.2), rng.float(0.55, 1.1), rng, 7);
    g.appendChild(svgEl('polygon', { points: ptsStr(patch), class: 'zz-ground-dirt-far' }));
  }
  const ruinN = early ? 28 : closeUp ? 24 : 18;
  for (let i = 0; i < ruinN; i++) {
    let x = rng.float(8, 92);
    let y = rng.float(10, 90);
    if (camp && Math.hypot(x - camp.x, y - camp.y) < (early ? 5.5 : closeUp ? 7 : 10)) continue;
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

/** ZZ-160: cubierta aislada + chimenea (sin WebP nuevo). */
function drawInsulatedOverlays(wrap, cell) {
  wrap.appendChild(
    svgEl('path', {
      d: `M${cell * 0.12} ${cell * 0.28} L${cell * 0.5} ${cell * 0.08} L${cell * 0.88} ${cell * 0.28} L${cell * 0.82} ${cell * 0.34} L${cell * 0.5} ${cell * 0.16} L${cell * 0.18} ${cell * 0.34} Z`,
      class: 'zz-settle-insul-roof',
    })
  );
  wrap.appendChild(
    svgEl('rect', {
      x: cell * 0.62,
      y: cell * 0.12,
      width: cell * 0.1,
      height: cell * 0.18,
      rx: 1,
      class: 'zz-settle-insul-chimney',
    })
  );
  wrap.appendChild(
    svgEl('ellipse', {
      cx: cell * 0.67,
      cy: cell * 0.1,
      rx: cell * 0.07,
      ry: cell * 0.04,
      class: 'zz-settle-insul-smoke',
    })
  );
}

/** ZZ-160: escombros cuando destroyed. */
function drawDestroyedRubble(wrap, cell, rng) {
  for (let i = 0; i < 5; i++) {
    wrap.appendChild(
      svgEl('rect', {
        x: cell * (0.15 + rng.float(0, 0.5)),
        y: cell * (0.45 + rng.float(0, 0.28)),
        width: cell * rng.float(0.12, 0.28),
        height: cell * rng.float(0.08, 0.16),
        rx: 1,
        class: 'zz-settle-rubble',
        transform: `rotate(${rng.float(-18, 18)} ${cell * 0.5} ${cell * 0.55})`,
      })
    );
  }
}

/** ZZ-160: grietas / marcas de daño (alternativa estática a animación). */
function drawDamageMarks(wrap, cell, st) {
  const heavy = st === 'critical';
  wrap.appendChild(
    svgEl('path', {
      d: `M${cell * 0.22} ${cell * 0.4} L${cell * 0.38} ${cell * 0.55} L${cell * 0.3} ${cell * 0.7}`,
      class: heavy ? 'zz-settle-crack zz-settle-crack--heavy' : 'zz-settle-crack',
      fill: 'none',
    })
  );
  if (heavy) {
    wrap.appendChild(
      svgEl('path', {
        d: `M${cell * 0.58} ${cell * 0.35} L${cell * 0.72} ${cell * 0.5} L${cell * 0.65} ${cell * 0.68}`,
        class: 'zz-settle-crack zz-settle-crack--heavy',
        fill: 'none',
      })
    );
  }
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
  // Vida legible sin “pintar verde”: lamparilla + 1–2 figuras, no relleno de polígono
  if (z.type === 'camp') return;
  g.appendChild(
    svgEl('circle', {
      cx: z.x + z.r * 0.28,
      cy: z.y - z.r * 0.22,
      r: 0.35 + tier * 0.06,
      class: 'zz-prop-lamp',
      opacity: '0.75',
    })
  );
  if (tier >= 1) {
    const n = Math.min(2, 1 + Math.floor(tier / 2));
    for (let i = 0; i < n; i++) {
      const ox = rng.float(-z.r * 0.25, z.r * 0.25);
      const oy = rng.float(-z.r * 0.15, z.r * 0.2);
      g.appendChild(
        svgEl('circle', {
          cx: z.x + ox,
          cy: z.y + oy - 0.25,
          r: 0.22,
          class: 'zz-settle-person',
          opacity: '0.55',
        })
      );
    }
  }
  if (tier >= 2) {
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
}

function drawProp(layer, kind, x, y, s = 1) {
  if (kind === 'crate') {
    layer.appendChild(svgEl('rect', { x: x - 0.55 * s, y: y - 0.4 * s, width: 1.1 * s, height: 0.8 * s, rx: 0.08, class: 'zz-prop-crate' }));
  } else if (kind === 'barrel') {
    layer.appendChild(svgEl('ellipse', { cx: x, cy: y, rx: 0.45 * s, ry: 0.55 * s, class: 'zz-prop-barrel' }));
  } else if (kind === 'fire') {
    layer.appendChild(svgEl('circle', { cx: x, cy: y, r: 0.45 * s, class: 'zz-prop-fire-glow' }));
    layer.appendChild(svgEl('circle', { cx: x, cy: y, r: 0.22 * s, class: 'zz-prop-fire' }));
  } else if (kind === 'lamp') {
    layer.appendChild(svgEl('rect', { x: x - 0.08 * s, y: y - 0.55 * s, width: 0.16 * s, height: 0.55 * s, fill: '#3a3428' }));
    layer.appendChild(svgEl('circle', { cx: x, cy: y - 0.55 * s, r: 0.22 * s, class: 'zz-prop-lamp' }));
  } else if (kind === 'person') {
    layer.appendChild(svgEl('circle', { cx: x, cy: y - 0.35 * s, r: 0.28 * s, class: 'zz-settle-person' }));
    layer.appendChild(svgEl('rect', { x: x - 0.22 * s, y: y - 0.05 * s, width: 0.44 * s, height: 0.55 * s, rx: 0.08, class: 'zz-settle-person-body' }));
  } else if (kind === 'tree') {
    layer.appendChild(svgEl('ellipse', { cx: x, cy: y + 0.35 * s, rx: 0.55 * s, ry: 0.22 * s, class: 'zz-prop-shadow' }));
    layer.appendChild(svgEl('rect', { x: x - 0.1 * s, y: y - 0.2 * s, width: 0.2 * s, height: 0.7 * s, class: 'zz-prop-tree-trunk' }));
    layer.appendChild(
      svgEl('ellipse', {
        cx: x,
        cy: y - 0.55 * s,
        rx: 0.75 * s,
        ry: 0.55 * s,
        class: 'zz-prop-tree-crown',
      })
    );
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
  } else if (kind === 'sandbag') {
    layer.appendChild(
      svgEl('ellipse', {
        cx: x,
        cy: y,
        rx: 0.7 * s,
        ry: 0.32 * s,
        class: 'zz-prop-sandbag',
      })
    );
  } else if (kind === 'tarp') {
    layer.appendChild(
      svgEl('path', {
        d: `M${x - 0.9 * s} ${y + 0.15 * s} L${x - 0.5 * s} ${y - 0.45 * s} L${x + 0.85 * s} ${y - 0.25 * s} L${x + 0.55 * s} ${y + 0.35 * s} Z`,
        class: 'zz-prop-tarp',
      })
    );
  } else if (kind === 'scrap') {
    layer.appendChild(
      svgEl('path', {
        d: `M${x - 0.7 * s} ${y + 0.2 * s} L${x - 0.2 * s} ${y - 0.35 * s} L${x + 0.55 * s} ${y - 0.1 * s} L${x + 0.4 * s} ${y + 0.35 * s} Z`,
        class: 'zz-prop-scrap',
      })
    );
    layer.appendChild(
      svgEl('rect', {
        x: x - 0.15 * s,
        y: y - 0.05 * s,
        width: 0.55 * s,
        height: 0.18 * s,
        rx: 0.03,
        class: 'zz-prop-scrap-bar',
        transform: `rotate(${12 * s} ${x} ${y})`,
      })
    );
  } else if (kind === 'sign') {
    layer.appendChild(svgEl('rect', { x: x - 0.06 * s, y: y - 0.35 * s, width: 0.12 * s, height: 0.7 * s, class: 'zz-prop-sign-post' }));
    layer.appendChild(
      svgEl('rect', {
        x: x - 0.45 * s,
        y: y - 0.7 * s,
        width: 0.9 * s,
        height: 0.4 * s,
        rx: 0.04,
        class: 'zz-prop-sign',
      })
    );
  } else if (kind === 'fence_post') {
    layer.appendChild(svgEl('rect', { x: x - 0.08 * s, y: y - 0.55 * s, width: 0.16 * s, height: 0.9 * s, class: 'zz-prop-fence-post' }));
    layer.appendChild(
      svgEl('line', {
        x1: x,
        y1: y - 0.2 * s,
        x2: x + 0.85 * s,
        y2: y - 0.05 * s,
        class: 'zz-prop-fence-wire',
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

/** Convex hull 2D (Monotone chain). */
function convexHull(points) {
  const pts = points.map((p) => [p[0], p[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length <= 2) return pts;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/** Blob continuo de una superficie (celdas → contorno orgánico, no celdas). */
function surfaceBlobPoly(cells, scale, bw, bh, rng) {
  if (!cells?.length) return [];
  const corners = [];
  const half = scale * 0.58;
  cells.forEach(([cx, cy]) => {
    const lx = (cx - bw / 2 + 0.5) * scale;
    const ly = (cy - bh / 2 + 0.5) * scale;
    corners.push([lx - half, ly - half * 0.72]);
    corners.push([lx + half, ly - half * 0.72]);
    corners.push([lx + half, ly + half * 0.72]);
    corners.push([lx - half, ly + half * 0.72]);
  });
  let hull = convexHull(corners);
  if (hull.length < 3) return hull;
  // Contorno orgánico: vértices + puntos medios empujados
  const [mx, my] = hull.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
  const ox = mx / hull.length;
  const oy = my / hull.length;
  const organic = [];
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];
    const f = rng.float(1.04, 1.18);
    organic.push([ox + (a[0] - ox) * f, oy + (a[1] - oy) * f]);
    const midX = (a[0] + b[0]) / 2;
    const midY = (a[1] + b[1]) / 2;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const push = scale * rng.float(0.08, 0.28) * (rng.float(0, 1) > 0.5 ? 1 : -0.35);
    organic.push([midX + nx * push, midY + ny * push]);
  }
  return organic;
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

 * Identidad ambiental por sector — 3 lecturas claras al panear:

 * carretera/núcleo · urbano/ruinas · abierto/verde.

 */

function drawSectorIdentity(layer, sec, rng) {

  const local = sec.polyOff || [];

  if (local.length < 3) return;

  const [cx, cy] = polyCentroid(local);

  const recovering = sec.status === 'recovering';



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

  const tone = (cls, rx, ry) => {

    const patch = irregularPatch(cx, cy, rx, ry, rng, 10);

    layer.appendChild(svgEl('polygon', { points: ptsStr(patch), class: cls }));

  };



  switch (sec.id) {

    case 'core': {

      const roadFill = [

        [-12.2, -0.9],

        [-6.5, -1.35],

        [-2.0, -0.55],

        [1.5, -1.1],

        [5.5, -0.45],

        [11.8, -1.0],

        [12.0, 1.15],

        [6.2, 1.55],

        [1.8, 0.95],

        [-2.5, 1.45],

        [-7.0, 0.85],

        [-12.0, 1.2],

      ].map(([x, y]) => [x + rng.float(-0.15, 0.15), y + rng.float(-0.12, 0.12)]);

      layer.appendChild(svgEl('polygon', { points: ptsStr(roadFill), class: 'zz-settle-road-fill' }));

      layer.appendChild(

        svgEl('polygon', {

          points: ptsStr(

            roadFill.map(([x, y]) => [x * 1.01, y + (y >= 0 ? 0.55 : -0.55) + rng.float(-0.08, 0.08)])

          ),

          class: 'zz-settle-road-dirt',

        })

      );

      for (let i = 0; i < 5; i++) {

        const x0 = -9 + i * 4.2;

        layer.appendChild(

          svgEl('path', {

            d: `M${x0} ${rng.float(-0.35, 0.2)} L${x0 + rng.float(1.2, 2.4)} ${rng.float(-0.2, 0.35)}`,

            class: 'zz-settle-road-crack',

            fill: 'none',

          })

        );

      }

      layer.appendChild(

        svgEl('path', {

          d: 'M-8.5 -5.2 L-5.5 -5.5 L-2.8 -4.8 M-2.2 -5.1 L0.5 -4.6',

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

      placeDebris(-3.5, 2.2, 0.8);

      drawProp(layer, 'lamp', 3.2, -2.4, 0.85);

      drawProp(layer, 'crate', -4.5, 2.8, 0.75);

      drawProp(layer, 'barrel', 5.2, 2.6, 0.85);

      break;

    }

    case 'lot_west': {
      tone('zz-env-tone zz-env-tone--asphalt', 9.5, 6.5);
      // ZZ-019B: sin franjas/parking GIS — manchas irregulares + props
      for (let i = 0; i < 5; i++) {
        const patch = irregularPatch(
          cx + rng.float(-6, 6),
          cy + rng.float(-4.5, 4.5),
          rng.float(1.8, 3.2),
          rng.float(0.7, 1.4),
          rng,
          7
        );
        layer.appendChild(svgEl('polygon', { points: ptsStr(patch), class: 'zz-env-tone zz-env-tone--asphalt' }));
      }
      drawProp(layer, 'vehicle', cx - 4.2, cy - 2.5, 1.15);
      drawProp(layer, 'vehicle', cx + 3.2, cy + 0.8, 1.05);
      drawProp(layer, 'vehicle', cx - 1.0, cy + 3.2, 0.9);
      drawProp(layer, 'barrel', cx + 5.5, cy - 1.5, 1);
      drawProp(layer, 'crate', cx - 6.0, cy + 2.2, 1.05);
      placeWall(cx - 8.5, cy + 4.0, 5.5, 0.38, -14);
      for (let i = 0; i < 8; i++) placeDebris(cx + rng.float(-7, 7), cy + rng.float(-5, 5));
      break;
    }

    case 'ruins_east': {

      tone('zz-env-tone zz-env-tone--urban', 8.5, 7);

      for (let i = 0; i < 7; i++) {

        placeWall(cx + rng.float(-6, 6), cy + rng.float(-5, 5), rng.float(2.4, 5.2), 0.4, rng.float(-45, 45));

      }

      placeWall(cx + 2.5, cy - 1.5, 0.45, 4.2, 8);

      placeWall(cx - 3.5, cy + 0.5, 0.4, 3.4, -22);

      placeWall(cx + 0.5, cy + 2.8, 3.8, 0.42, -6);

      drawProp(layer, 'vehicle', cx + 4.5, cy + 3.2, 0.95);

      drawProp(layer, 'crate', cx - 2.0, cy + 2.8, 1.1);

      drawProp(layer, 'barrel', cx + 1.5, cy - 3.2, 0.9);

      for (let i = 0; i < 10; i++) placeDebris(cx + rng.float(-7, 7), cy + rng.float(-6, 6), 1.05);

      break;

    }

    case 'alley_south': {

      tone('zz-env-tone zz-env-tone--alley', 7, 4.5);

      layer.appendChild(

        svgEl('path', {

          d: `M${cx - 9} ${cy} Q${cx} ${cy + 1.4} ${cx + 9} ${cy - 0.5}`,

          class: 'zz-settle-path-dirt zz-sector-alley',

          fill: 'none',

        })

      );

      for (let i = 0; i < 5; i++) {

        layer.appendChild(

          svgEl('path', {

            d: `M${cx - 7 + i * 3.2} ${cy - 2.2} L${cx - 6.5 + i * 3.2} ${cy + 2.0}`,

            class: 'zz-settle-fence-seg',

            fill: 'none',

          })

        );

      }

      for (let i = 0; i < 6; i++) placeDebris(cx + rng.float(-8, 8), cy + rng.float(-2.5, 2.5), 0.9);

      break;

    }

    case 'yard_north': {

      tone('zz-env-tone zz-env-tone--industrial', 7.5, 5.5);

      placeWall(cx - 5, cy + 2.5, 8, 0.32, -5);

      drawProp(layer, 'barrel', cx - 3, cy, 1);

      drawProp(layer, 'crate', cx + 3.5, cy - 1.5, 1);

      for (let i = 0; i < 5; i++) placeDebris(cx + rng.float(-6, 6), cy + rng.float(-4, 4));

      break;

    }

    case 'scrap_sw': {

      tone('zz-env-tone zz-env-tone--scrap', 6.5, 5);

      for (let i = 0; i < 5; i++) {

        drawProp(

          layer,

          i % 2 ? 'barrel' : 'crate',

          cx + rng.float(-4.5, 4.5),

          cy + rng.float(-3.5, 3.5),

          rng.float(0.85, 1.2)

        );

      }

      drawProp(layer, 'vehicle', cx + 1.5, cy - 1.2, 1.1);

      for (let i = 0; i < 8; i++) placeDebris(cx + rng.float(-5.5, 5.5), cy + rng.float(-4.5, 4.5), 1.15);

      break;

    }

    case 'green_se':
    default: {
      tone('zz-env-tone zz-env-tone--green', 9, 7.5);
      for (let i = 0; i < 4; i++) {
        const patch = irregularPatch(cx + rng.float(-5, 5), cy + rng.float(-4, 4), rng.float(1.3, 2.4), rng.float(0.8, 1.4), rng, 7);
        layer.appendChild(svgEl('polygon', { points: ptsStr(patch), class: 'zz-sector-scrub-wild' }));
      }
      drawProp(layer, 'tree', cx - 3.5, cy - 2.2, 1.15);
      drawProp(layer, 'tree', cx + 4.0, cy + 1.5, 1.0);
      drawProp(layer, 'tree', cx + 0.5, cy - 4.0, 0.85);
      drawProp(layer, 'tree', cx - 5.5, cy + 2.8, 0.95);
      placeWall(cx + 5.5, cy - 1.5, 2.8, 0.3, 22);
      for (let i = 0; i < 3; i++) placeDebris(cx + rng.float(-5, 5), cy + rng.float(-4, 4), 0.7);
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
      opacity: '0.32',
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
      opacity: '0.16',
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
    const px = Math.cos(a) * r * 2.4;
    const py = Math.sin(a) * r * 1.7;
    const scrub = irregularPatch(px, py, rng.float(0.35, 0.7), rng.float(0.2, 0.4), rng, 6);
    layer.appendChild(svgEl('polygon', { points: ptsStr(scrub), class: 'zz-settle-scrub' }));
  }

  // ZZ-163: props de colonia — densidad según edificios (lean SVG, sin lluvia de iconos)
  const propN = Math.min(14, 4 + Math.floor(buildings.length * 0.9));
  const propKinds = ['crate', 'barrel', 'sandbag', 'tarp', 'scrap', 'sign', 'fence_post', 'lamp'];
  for (let i = 0; i < propN; i++) {
    const a = (i / propN) * Math.PI * 2 + rng.float(-0.2, 0.2);
    const dist = scale * rng.float(1.1, 2.6);
    const px = Math.cos(a) * dist * 1.15;
    const py = Math.sin(a) * dist * 0.85 + rng.float(-0.4, 0.4);
    const kind = propKinds[i % propKinds.length];
    drawProp(layer, kind, px, py, rng.float(0.75, 1.15));
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
  // ZZ-019B: sombra de contacto + asentamiento (integración barata, sin art pass)
  wrap.appendChild(
    svgEl('ellipse', {
      cx,
      cy: cy + cell * 0.02,
      rx: cell * 0.4,
      ry: cell * 0.12,
      class: 'zz-settle-contact-shadow',
    })
  );
  const pad = irregularPatch(cx, cy, cell * 0.38, cell * 0.14, rng, 8);
  wrap.appendChild(svgEl('polygon', { points: ptsStr(pad), class: 'zz-settle-foundation' }));
  const gravel = irregularPatch(cx, cy + cell * 0.04, cell * 0.44, cell * 0.1, rng, 7);
  wrap.appendChild(svgEl('polygon', { points: ptsStr(gravel), class: 'zz-settle-foundation-gravel' }));
}

/** Solo en modo Construir: una mancha continua por superficie (no celdas/slots). */
function drawBuildableSurfaceHints(layer, state, scale, bw, bh) {
  const group = svgEl('g', { class: 'zz-settle-surfaces', 'aria-hidden': 'true' });
  recoveredSurfaces(state).forEach(({ surface }, idx) => {
    const cells = surface.cells || [];
    if (!cells.length) return;
    const rng = createRng(hashSeed(`surf-blob:${surface.id || idx}`));
    const poly = surfaceBlobPoly(cells, scale, bw, bh, rng);
    if (poly.length < 3) return;
    // Capa suave bajo el borde — menos lectura GIS
    group.appendChild(
      svgEl('polygon', {
        points: ptsStr(poly),
        class: 'zz-settle-surface-area-soft',
      })
    );
    group.appendChild(
      svgEl('polygon', {
        points: ptsStr(poly),
        class: 'zz-settle-surface-area',
      })
    );
  });
  layer.appendChild(group);
}

function drawSettlementCore(g, state, camp, tier, handlers = {}) {
  const { onSelectBuilding, onGhostPointer } = handlers;
  const buildings = state.base?.buildings || [];
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
      const isInsulated = b.type === 'insulated_house';
      const cell = scale * (isHq ? 1.48 : 1.28);
      const selected = state.selectedBuildingId === b.id;
      const st = buildingStructuralState(b, null);
      const maxHp = buildingMaxHp(b, null);
      const hp = b.hp == null ? maxHp : b.hp;
      const highlight = (state.flags?.highlightRepairIds || []).includes(b.id);
      const wrap = svgEl('g', {
        class: `zz-settle-bldg zz-settle-bldg--${st}${selected ? ' is-selected' : ''}${
          highlight ? ' is-repair-focus' : ''
        }${isHq ? ' zz-settle-bldg--hq' : ''}${isInsulated ? ' zz-settle-bldg--insulated' : ''}`,
        transform: `translate(${lx - cell / 2},${ly - cell / 2})`,
        'data-type': b.type,
        'data-id': b.id,
        opacity: st === 'destroyed' ? '0.7' : st === 'critical' ? '0.88' : '1',
      });
      drawBuildingFoundation(wrap, cell, createRng(hashSeed(`found:${b.id}`)));
      if (st === 'destroyed') {
        drawDestroyedRubble(wrap, cell, createRng(hashSeed(`rubble:${b.id}`)));
      } else {
        wrap.appendChild(
          svgEl('image', {
            href: buildingArtUrl(b.type),
            x: 0,
            y: 0,
            width: cell,
            height: cell,
            preserveAspectRatio: 'xMidYMid meet',
            class: `zz-settle-bldg-img zz-settle-bldg-img--${st}`,
          })
        );
        if (isInsulated) drawInsulatedOverlays(wrap, cell);
        if (st === 'damaged' || st === 'critical') {
          drawDamageMarks(wrap, cell, st);
          wrap.appendChild(
            svgEl('rect', {
              x: cell * 0.12,
              y: cell * 0.72,
              width: cell * 0.76,
              height: cell * 0.1,
              rx: 2,
              fill: st === 'critical' ? '#a33' : '#c80',
              opacity: 0.85,
              class: 'zz-settle-bldg-hpbar',
            })
          );
          wrap.appendChild(
            svgEl('rect', {
              x: cell * 0.12,
              y: cell * 0.72,
              width: cell * 0.76 * Math.max(0.05, hp / maxHp),
              height: cell * 0.1,
              rx: 2,
              fill: st === 'critical' ? '#f66' : '#fc6',
              class: 'zz-settle-bldg-hpfill',
            })
          );
        }
      }
      if (highlight) {
        wrap.appendChild(
          svgEl('rect', {
            x: -2,
            y: -2,
            width: cell + 4,
            height: cell + 4,
            fill: 'none',
            stroke: '#e8c060',
            'stroke-width': 2,
            rx: 4,
            class: 'zz-settle-bldg-repair-ring',
          })
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

  drawAmbientLife(layer, state, handlers?.content || null, { scale, bw, bh });

  g.appendChild(layer);
}


function drawIrregularFog(g, z, rng, early = false) {
  const fogG = svgEl('g', { class: 'zz-zone-fog-group', style: 'pointer-events:none' });
  // ZZ-019B D1: sin masas/brumas oscuras — solo restos lejanos que continúan el mundo
  if (early) {
    for (let i = 0; i < 4; i++) {
      const x = z.x + rng.float(-z.r * 0.6, z.r * 0.6);
      const y = z.y + rng.float(-z.r * 0.5, z.r * 0.5);
      const ang = rng.float(-35, 35);
      fogG.appendChild(
        svgEl('rect', {
          x,
          y,
          width: rng.float(1.2, 2.4),
          height: 0.34,
          rx: 0.05,
          class: 'zz-ground-ruin-wall',
          transform: `rotate(${ang} ${x} ${y})`,
        })
      );
      if (rng.chance(0.45)) {
        fogG.appendChild(
          svgEl('rect', {
            x: x + 0.15,
            y: y - 0.05,
            width: 0.32,
            height: rng.float(0.7, 1.3),
            rx: 0.04,
            class: 'zz-ground-ruin-wall',
            transform: `rotate(${ang} ${x} ${y})`,
          })
        );
      }
    }
    g.appendChild(fogG);
    return;
  }
  const uid = String(z.id || 'z').replace(/[^a-zA-Z0-9_-]/g, '');
  const maskId = `fogMask_${uid}`;
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
      opacity: '0.72',
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
        opacity: String(0.28 + i * 0.06),
      })
    );
  }
  fogG.appendChild(veiled);
  g.appendChild(fogG);
}

/** ZZ-162: siluetas por tipo — reconocibles sin ART PASS / sin GIS. */
function drawLandmarkSilhouette(g, z, type) {
  const s = Math.min(6.5, z.r * 0.85);
  const x = z.x - s / 2;
  const y = z.y - s / 2;
  const t = String(type || 'blocks');
  const shadow = () =>
    g.appendChild(
      svgEl('ellipse', {
        cx: z.x,
        cy: z.y + s * 0.32,
        rx: s * 0.36,
        ry: s * 0.1,
        class: 'zz-settle-contact-shadow',
        opacity: '0.28',
      })
    );

  if (t === 'park') {
    shadow();
    g.appendChild(svgEl('ellipse', { cx: z.x, cy: z.y, rx: s * 0.48, ry: s * 0.36, class: 'zz-landmark-park' }));
    g.appendChild(svgEl('circle', { cx: z.x - s * 0.18, cy: z.y - s * 0.05, r: s * 0.14, class: 'zz-landmark-park-tree' }));
    g.appendChild(svgEl('circle', { cx: z.x + s * 0.2, cy: z.y + s * 0.02, r: s * 0.12, class: 'zz-landmark-park-tree' }));
    return;
  }
  if (t === 'industrial' || t === 'warehouse') {
    shadow();
    g.appendChild(svgEl('rect', { x, y: y + s * 0.22, width: s * 0.55, height: s * 0.5, class: 'zz-landmark-ind', rx: 0.15 }));
    g.appendChild(svgEl('rect', { x: x + s * 0.48, y: y + s * 0.05, width: s * 0.38, height: s * 0.68, class: 'zz-landmark-ind', rx: 0.12 }));
    g.appendChild(svgEl('rect', { x: x + s * 0.58, y: y - s * 0.08, width: s * 0.12, height: s * 0.22, class: 'zz-landmark-chimney' }));
    return;
  }
  if (t === 'water_plant') {
    shadow();
    g.appendChild(svgEl('rect', { x: x + s * 0.08, y: y + s * 0.28, width: s * 0.55, height: s * 0.4, class: 'zz-landmark-util', rx: 0.15 }));
    g.appendChild(svgEl('circle', { cx: z.x + s * 0.22, cy: z.y - s * 0.05, r: s * 0.22, class: 'zz-landmark-tank' }));
    g.appendChild(svgEl('circle', { cx: z.x + s * 0.22, cy: z.y - s * 0.05, r: s * 0.12, class: 'zz-landmark-tank-rim' }));
    return;
  }
  if (t === 'substation') {
    shadow();
    g.appendChild(svgEl('rect', { x: x + s * 0.15, y: y + s * 0.3, width: s * 0.7, height: s * 0.35, class: 'zz-landmark-util', rx: 0.1 }));
    g.appendChild(svgEl('line', { x1: z.x - s * 0.2, y1: y + s * 0.15, x2: z.x + s * 0.25, y2: y + s * 0.15, class: 'zz-landmark-wire' }));
    g.appendChild(svgEl('rect', { x: z.x - s * 0.08, y: y + s * 0.05, width: s * 0.1, height: s * 0.28, class: 'zz-landmark-pole' }));
    return;
  }
  if (t === 'apartments') {
    shadow();
    g.appendChild(svgEl('rect', { x: x + s * 0.12, y: y + s * 0.05, width: s * 0.76, height: s * 0.72, class: 'zz-landmark-apt', rx: 0.12 }));
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        g.appendChild(
          svgEl('rect', {
            x: x + s * (0.22 + col * 0.22),
            y: y + s * (0.18 + row * 0.18),
            width: s * 0.12,
            height: s * 0.1,
            class: 'zz-landmark-window',
          })
        );
      }
    }
    return;
  }
  if (t === 'school') {
    shadow();
    g.appendChild(svgEl('rect', { x: x + s * 0.05, y: y + s * 0.28, width: s * 0.9, height: s * 0.42, class: 'zz-landmark-civic', rx: 0.12 }));
    g.appendChild(svgEl('rect', { x: z.x - s * 0.04, y: y + s * 0.02, width: s * 0.08, height: s * 0.3, class: 'zz-landmark-pole' }));
    g.appendChild(svgEl('path', { d: `M${z.x} ${y + s * 0.04} L${z.x + s * 0.22} ${y + s * 0.12} L${z.x} ${y + s * 0.2} Z`, class: 'zz-landmark-flag' }));
    return;
  }
  if (t === 'police') {
    shadow();
    g.appendChild(svgEl('rect', { x: x + s * 0.1, y: y + s * 0.22, width: s * 0.8, height: s * 0.5, class: 'zz-landmark-civic', rx: 0.12 }));
    g.appendChild(svgEl('rect', { x: z.x - s * 0.12, y: y + s * 0.08, width: s * 0.24, height: s * 0.18, class: 'zz-landmark-badge' }));
    g.appendChild(svgEl('circle', { cx: z.x + s * 0.28, cy: y + s * 0.12, r: s * 0.06, class: 'zz-landmark-antenna' }));
    return;
  }
  if (t === 'pharmacy') {
    shadow();
    g.appendChild(svgEl('rect', { x: x + s * 0.15, y: y + s * 0.2, width: s * 0.7, height: s * 0.55, class: 'zz-landmark-shop', rx: 0.12 }));
    g.appendChild(svgEl('path', { d: `M${z.x - s * 0.08} ${z.y} h${s * 0.16} M${z.x} ${z.y - s * 0.08} v${s * 0.16}`, class: 'zz-landmark-cross', fill: 'none' }));
    return;
  }
  if (t === 'hardware' || t === 'workshop') {
    shadow();
    g.appendChild(svgEl('rect', { x: x + s * 0.08, y: y + s * 0.32, width: s * 0.84, height: s * 0.4, class: 'zz-landmark-shed', rx: 0.1 }));
    g.appendChild(svgEl('path', { d: `M${x + s * 0.05} ${y + s * 0.34} L${z.x} ${y + s * 0.12} L${x + s * 0.95} ${y + s * 0.34} Z`, class: 'zz-landmark-shed-roof' }));
    if (t === 'workshop') {
      g.appendChild(svgEl('rect', { x: x + s * 0.7, y: y + s * 0.1, width: s * 0.12, height: s * 0.25, class: 'zz-landmark-chimney' }));
    }
    return;
  }
  if (t === 'offices') {
    shadow();
    g.appendChild(svgEl('rect', { x: x + s * 0.18, y: y + s * 0.08, width: s * 0.64, height: s * 0.7, class: 'zz-landmark-office', rx: 0.08 }));
    for (let row = 0; row < 4; row++) {
      g.appendChild(
        svgEl('rect', {
          x: x + s * 0.28,
          y: y + s * (0.18 + row * 0.14),
          width: s * 0.44,
          height: s * 0.06,
          class: 'zz-landmark-window-row',
        })
      );
    }
    return;
  }
  if (t === 'gas_station') {
    shadow();
    g.appendChild(svgEl('rect', { x: x + s * 0.1, y: y + s * 0.35, width: s * 0.8, height: s * 0.28, class: 'zz-landmark-shed', rx: 0.08 }));
    g.appendChild(svgEl('rect', { x: x + s * 0.2, y: y + s * 0.18, width: s * 0.6, height: s * 0.2, class: 'zz-landmark-canopy' }));
    g.appendChild(svgEl('rect', { x: z.x - s * 0.22, y: y + s * 0.42, width: s * 0.12, height: s * 0.18, class: 'zz-landmark-pump' }));
    g.appendChild(svgEl('rect', { x: z.x + s * 0.1, y: y + s * 0.42, width: s * 0.12, height: s * 0.18, class: 'zz-landmark-pump' }));
    return;
  }
  // Bloques genéricos / fallback
  shadow();
  g.appendChild(svgEl('rect', { x: x + s * 0.1, y: y + s * 0.25, width: s * 0.8, height: s * 0.55, class: 'zz-landmark-bldg', rx: 0.2 }));
  g.appendChild(svgEl('rect', { x: x + s * 0.35, y: y + s * 0.05, width: s * 0.3, height: s * 0.25, class: 'zz-landmark-bldg' }));
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
  if (z.state === 'contested') {
    g.appendChild(
      svgEl('ellipse', {
        cx: z.x,
        cy: z.y,
        rx: z.r * 0.5,
        ry: z.r * 0.38,
        fill: '#c48a2a',
        class: 'zz-zone-tint zz-zone-tint--contested',
        opacity: '0.28',
      })
    );
    g.appendChild(
      svgEl('ellipse', {
        cx: z.x,
        cy: z.y,
        rx: z.r * 0.48,
        ry: z.r * 0.36,
        fill: 'none',
        stroke: '#e8b84a',
        'stroke-width': '0.35',
        'stroke-dasharray': '1.2 0.8',
        class: 'zz-zone-contested-ring',
        opacity: '0.85',
      })
    );
  }
  if (z.state === 'discovered' && !exploreTarget) {
    g.appendChild(
      svgEl('ellipse', {
        cx: z.x,
        cy: z.y,
        rx: z.r * 0.42,
        ry: z.r * 0.32,
        fill: 'none',
        stroke: '#8a7a60',
        'stroke-width': '0.2',
        opacity: '0.35',
        class: 'zz-zone-discovered-edge',
      })
    );
  }
  if (z.state === 'controlled' && z.type !== 'camp') {
    g.appendChild(
      svgEl('ellipse', {
        cx: z.x,
        cy: z.y,
        rx: z.r * 0.46,
        ry: z.r * 0.34,
        fill: 'none',
        stroke: '#c4a882',
        'stroke-width': '0.28',
        opacity: '0.55',
        class: 'zz-zone-owned-ring',
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
    drawSettlementCore(g, state, z, tier, { onSelectBuilding, onGhostPointer, content: handlers?.content });
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
          class: 'zz-settle-contact-shadow',
          opacity: '0.32',
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
      drawLandmarkSilhouette(g, z, z.type);
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
    if (z.state === 'hostile' || z.state === 'contested' || (z.state === 'discovered' && z.risk >= 0.5)) {
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
    const t = expeditionProgress(ex, state.day || 1);
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
  } else if (w === 'cold' || w === 'blizzard') {
    const n = w === 'blizzard' ? 34 : 20;
    for (let i = 0; i < n; i++) {
      g.appendChild(svgEl('circle', { cx: rng.float(3, W - 3), cy: rng.float(3, H - 3), r: rng.float(0.2, 0.55), class: 'zz-map-wx-particle' }));
    }
  } else if (w === 'fog') {
    g.appendChild(svgEl('rect', { x: 0, y: 0, width: W, height: H, class: 'zz-map-wx-particle', opacity: '0.22', fill: '#8a8478' }));
  } else if (w === 'heat') {
    g.appendChild(svgEl('rect', { x: 0, y: 0, width: W, height: H, class: 'zz-map-wx-particle', opacity: '0.12', fill: '#c08040' }));
  }
  // ZZ-170: haze/aliento abstracto adicional (legible sin animación)
  if (w === 'cold' || w === 'blizzard') {
    g.appendChild(
      svgEl('rect', {
        x: 0,
        y: 0,
        width: W,
        height: H,
        class: 'zz-map-wx-haze',
        opacity: w === 'blizzard' ? '0.14' : '0.08',
        fill: '#c8d0d8',
      })
    );
  }
  parent.appendChild(g);
}

/** Chimeneas abstractas si hay calefacción activa (ZZ-047). */
function drawHeatingChimneys(parent, state, m) {
  if (!state.lastHeating?.active || !(state.lastHeating.consumed > 0)) return;
  const g = svgEl('g', { class: 'zz-map-chimneys', 'aria-hidden': 'true' });
  const camp = state.zones?.find((z) => z.type === 'camp');
  (state.base?.buildings || []).forEach((b) => {
    if (b.hp <= 0) return;
    const def = /* content not here */ null;
    void def;
  });
  // Usar edificios con housing en el campamento
  const houses = (state.base?.buildings || []).filter((b) => {
    if (b.hp <= 0) return false;
    const t = String(b.type || '');
    return t.includes('house') || t.includes('shelter') || t.startsWith('hq_') || t === 'block';
  });
  houses.slice(0, 6).forEach((b, i) => {
    const ox = camp ? (camp.x || 50) - 8 + (b.x || 0) * 1.1 : 40 + i * 3;
    const oy = camp ? (camp.y || 50) - 6 + (b.y || 0) * 1.1 : 45;
    g.appendChild(
      svgEl('path', {
        d: `M ${ox} ${oy} q 0.6 -2.2 0.2 -4.2`,
        class: 'zz-map-chimney-smoke',
        fill: 'none',
      })
    );
  });
  if (houses.length) parent.appendChild(g);
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
  const { onSelectZone, onSelectBuilding, onPlaceCell, onSelectSector, onGhostPointer, content } = handlers;
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
  // Terreno jugable pintado — NO fotografía/mapa aéreo city.webp (ZZ-161 LOD por zoom)
  drawPlayableTerrain(world, camp, tier, state.day || 1, state.mapCamera?.zoom || 1.5);
  const grid = drawRoads(world, zones, tier);
  drawUrbanBlocks(world, zones, grid, tier);
  drawRecoveredPaths(world, zones, tier);

  const layer = svgEl('g', { class: 'zz-map-layer zz-map-zones' });
  const ordered = [...zones].sort((a, b) => {
    const rank = { unknown: 0, discovered: 1, hostile: 2, controlled: 3 };
    return (rank[a.state] || 0) - (rank[b.state] || 0);
  });
  ordered.forEach((z) =>
    drawZone(layer, z, state, tier, { onSelectZone, onSelectBuilding, onSelectSector, onGhostPointer, content })
  );
  world.appendChild(layer);

  drawExpeditions(world, state);
  svg.appendChild(world);
  drawWeather(svg, state.weather, m);
  drawHeatingChimneys(world, state, m);
  drawLegend();
}
