/**
 * Mapa mundo Zona Zero 1.3 — mundo-primero, assets raster + interacción directa.
 */
import { svgEl, paintBuildingGlyph, resolveVisualLevel } from './icons.js';
import { createRng, hashSeed } from './rng.js';
import { artUrl, buildingArtUrl, zoneArtUrl, propArtUrl, FOG_ART, COLONY_YARD_ART, COLONY_YARD_CLEAN_ART, COLONY_DIRT_ART, WORLD_MAP_ART, PILOT_WORLD_MAP_ART, pilotBuildingArtUrl } from './art.js';
import {
  ensureColonyLayout,
  buildingForSlot,
  slotIsVacant,
  slotIsUnlocked,
  slotForBuilding,
  slotFitsType,
  slotBlockedByProp,
} from './colony-layout.js';
import { buildingStructuralState, buildingMaxHp } from './buildings-damage.js';
import { drawAmbientLife, expeditionProgress } from './ambient-life.js';
import { onboardingStatus } from './onboarding.js';
import {
  ensureSectors,
  ptsStr as sectorPtsStr,
  getSector,
  recoveredSurfaces,
} from './sectors.js';
import { settlementScale } from './build-place.js';
import {
  pilotFootprint,
  pilotDebugFootprintPlacements,
  footprintWorldRect,
} from './pilot-footprints.js';
import {
  listBuildableTerrainCells,
  terrainCellToWorld,
  logPilotPlaceDebug,
  getPilotZoneMap,
} from './pilot-terrain.js';

// ── CONTRATO DE CÁMARA REAL (migrado de mundo 100×100) ──────────────────────
// El mundo ahora tiene dimensiones reales en píxeles del mapa maestro.
// 1 unidad de mundo = 1 px del mapa maestro a zoom=1.
const NORMAL_WORLD_W = 4096;
const NORMAL_WORLD_H = 2720;
// Núcleo normal: compat migrada (100×100 → mundo real).
const NORMAL_NUCLEUS_X = 2600;
const NORMAL_NUCLEUS_Y = 380;

// Núcleo piloto Neni — Refugio Central / HQ canónico A (human gate 2026-08-20).
// Anchor terreno (-7,14) → world centro (824,520).
const PILOT_WORLD_W = 1819;
const PILOT_WORLD_H = 865;
const PILOT_NUCLEUS_X = 824;
const PILOT_NUCLEUS_Y = 520;

/** Estilos de colonia comparables (dev/review). */
export const COLONY_STYLES = ['yard', 'dirt', 'iso'];

export function colonyVisualStyle(state) {
  if (typeof document !== 'undefined' && document.body?.classList.contains('zz-body--demo')) {
    const s = state?.flags?.colonyStyle;
    return COLONY_STYLES.includes(s) ? s : 'dirt';
  }
  return 'dirt';
}

export function mapMetrics(svg) {
  // El mundo real puede variar (modo piloto). El viewBox del SVG es una "ventana" sobre el mundo,
  // con contrato 1 unidad de mundo = 1 px del mapa a zoom=1.
  const wide =
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(min-width: 900px)').matches;
  const vbW = Number(svg?.dataset?.zzWorldW || NORMAL_WORLD_W);
  const vbH = Number(svg?.dataset?.zzWorldH || NORMAL_WORLD_H);
  return { vbW, vbH, ox: 0, oy: 0, wide: !!wide };
}

function isPilotNeni(state) {
  return state?.flags?.pilot === 'neni';
}

function worldDimsForState(state) {
  return isPilotNeni(state) ? { w: PILOT_WORLD_W, h: PILOT_WORLD_H } : { w: NORMAL_WORLD_W, h: NORMAL_WORLD_H };
}

function nucleusForState(state) {
  return isPilotNeni(state) ? { x: PILOT_NUCLEUS_X, y: PILOT_NUCLEUS_Y } : { x: NORMAL_NUCLEUS_X, y: NORMAL_NUCLEUS_Y };
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

/** SVG del mapa (o aproximación si aún no está montado). */
function resolveMapSvg(svg) {
  if (svg?.getBoundingClientRect) return svg;
  if (typeof document !== 'undefined') {
    return document.getElementById('zz-map');
  }
  return null;
}

/** Viewport real del mapa en px de pantalla (no window — respeta HUD/full-bleed). */
function mapViewportPx(svg) {
  const el = resolveMapSvg(svg);
  const rect = el?.getBoundingClientRect?.();
  if (rect && rect.width > 1 && rect.height > 1) {
    return { vpW: rect.width, vpH: rect.height };
  }
  return {
    vpW: typeof window !== 'undefined' ? window.innerWidth : 390,
    vpH: typeof window !== 'undefined' ? window.innerHeight : 844,
  };
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
    width: '16',
    height: '16',
  });
  dirtPat.appendChild(svgEl('rect', { width: '16', height: '16', fill: '#2a241c' }));
  const specks = [
    [2, 3, 0.7, '#322c22'],
    [7, 5, 0.55, '#1e1a14'],
    [12, 2, 0.45, '#3a3228'],
    [4, 11, 0.6, '#262018'],
    [10, 13, 0.5, '#342c22'],
    [14, 8, 0.4, '#1a1610'],
    [8, 9, 0.35, '#3c3428'],
    [1, 14, 0.5, '#2e281e'],
  ];
  specks.forEach(([cx, cy, r, fill]) => {
    dirtPat.appendChild(svgEl('circle', { cx: String(cx), cy: String(cy), r: String(r), fill, opacity: '0.55' }));
  });
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

  const earthNoise = svgEl('filter', {
    id: 'zzEarthNoise',
    x: '0%',
    y: '0%',
    width: '100%',
    height: '100%',
    filterUnits: 'objectBoundingBox',
  });
  earthNoise.appendChild(
    svgEl('feTurbulence', {
      type: 'fractalNoise',
      baseFrequency: '0.032 0.045',
      numOctaves: '4',
      seed: '11',
      result: 'n',
    })
  );
  earthNoise.appendChild(
    svgEl('feColorMatrix', {
      in: 'n',
      type: 'matrix',
      values: '0 0 0 0 0.20  0 0 0 0 0.16  0 0 0 0 0.10  0 0 0 0.62 0',
    })
  );
  defs.appendChild(earthNoise);

  const softBlob = svgEl('filter', {
    id: 'zzSoftBlob',
    x: '-25%',
    y: '-25%',
    width: '150%',
    height: '150%',
  });
  softBlob.appendChild(svgEl('feGaussianBlur', { stdDeviation: '1.7' }));
  defs.appendChild(softBlob);

  const campDust = svgEl('radialGradient', { id: 'zzCampDust', cx: '50%', cy: '48%', r: '50%' });
  campDust.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#3a3228', 'stop-opacity': '0.92' }));
  campDust.appendChild(svgEl('stop', { offset: '42%', 'stop-color': '#322a22', 'stop-opacity': '0.55' }));
  campDust.appendChild(svgEl('stop', { offset: '78%', 'stop-color': '#2a241c', 'stop-opacity': '0.18' }));
  campDust.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#241e18', 'stop-opacity': '0' }));
  defs.appendChild(campDust);

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

/** Suelo a pantalla: terreno iso anclado al camp (sin árboles/vallas/coches pintados). */
function drawColonyGround(parent, camp, state) {
  const style = colonyVisualStyle(state);
  const g = svgEl('g', { class: `zz-map-layer zz-map-colony-ground zz-map-colony-ground--${style}`, 'aria-hidden': 'true' });
  const cx = camp?.x || 48;
  const cy = camp?.y || 62;
  const w = 420;
  const h = 240;
  const ox = 0;
  const oy = 0;
  const x = cx - w / 2 + ox;
  const y = cy - h / 2 + oy;
  g.appendChild(svgEl('rect', { x, y, width: w, height: h, fill: '#5a5844', class: 'zz-colony-dirt' }));
  g.appendChild(
    svgEl('image', {
      href: artUrl(COLONY_DIRT_ART),
      x,
      y,
      width: w,
      height: h,
      preserveAspectRatio: 'xMidYMid slice',
      class: 'zz-colony-dirt-art',
    })
  );
  parent.appendChild(g);
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

function drawPropSprite(layer, kind, x, y, s = 1) {
  const k = kind === 'vehicle' ? 'vehicle' : kind === 'tree' ? 'tree' : 'barrel';
  const w = (k === 'tree' ? 5.6 : k === 'vehicle' ? 7.1 : 6.2) * s;
  const h = (k === 'tree' ? 9.4 : k === 'vehicle' ? 5.1 : 5.3) * s;
  layer.appendChild(
    svgEl('image', {
      href: propArtUrl(k),
      x: x - w * 0.5,
      y: y - h * (k === 'tree' ? 0.82 : 0.7),
      width: w,
      height: h,
      preserveAspectRatio: 'xMidYMid meet',
      class: 'zz-colony-prop-img',
    })
  );
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

function plantOnDirt(wrap, slot, style) {
  if (style === 'dirt') return;
  wrap.appendChild(
    svgEl('ellipse', {
      cx: 0,
      cy: slot.rh * 0.4,
      rx: slot.rw * 0.8,
      ry: slot.rh * 0.26,
      class: 'zz-colony-slot-shadow',
    })
  );
}

function isoPt(x, y, z) {
  return [(x - y) * 0.9, (x + y) * 0.46 - z];
}

function isoPoly(corners) {
  return corners.map(([x, y, z]) => isoPt(x, y, z).join(',')).join(' ');
}

/** Ruina isométrica SVG (opción C — sin WebP). */
function drawIsoRuin(parent, slot, rng) {
  const w = slot.rw * 0.92;
  const d = slot.rw * 0.58;
  const h = slot.size === 'l' ? slot.rh * 0.88 : slot.size === 's' ? slot.rh * 0.62 : slot.rh * 0.74;
  const g = svgEl('g', { class: 'zz-colony-iso-building is-vacant' });
  const left = isoPoly([
    [-w / 2, d / 2, 0],
    [-w / 2, d / 2, h],
    [-w / 2, -d / 2, h],
    [-w / 2, -d / 2, 0],
  ]);
  const right = isoPoly([
    [-w / 2, d / 2, 0],
    [-w / 2, d / 2, h],
    [w / 2, d / 2, h],
    [w / 2, d / 2, 0],
  ]);
  const roofH = h + slot.rh * 0.16;
  const top = isoPoly([
    [-w / 2, -d / 2, h],
    [w / 2, -d / 2, h],
    [w / 2, d / 2, h],
    [-w / 2, d / 2, h],
  ]);
  const peak = isoPoly([
    [-w / 2, 0, h],
    [0, 0, roofH],
    [w / 2, 0, h],
  ]);
  g.appendChild(svgEl('polygon', { points: left, class: 'zz-colony-iso-left' }));
  g.appendChild(svgEl('polygon', { points: right, class: 'zz-colony-iso-right' }));
  g.appendChild(svgEl('polygon', { points: top, class: 'zz-colony-iso-roof' }));
  g.appendChild(
    svgEl('polygon', {
      points: peak,
      class: 'zz-colony-iso-peak',
      stroke: '#1a1410',
      'stroke-width': '0.08',
    })
  );
  if (rng.chance(0.5)) {
    const [wx, wy] = isoPt(w * 0.1, d / 2 + 0.02, h * 0.38);
    g.appendChild(
      svgEl('rect', {
        x: wx - 0.14,
        y: wy - 0.18,
        width: 0.28,
        height: 0.26,
        class: 'zz-colony-iso-window',
      })
    );
  }
  parent.appendChild(g);
}

/** Edificio isométrico + icono de función (opción C). */
function drawIsoBuilding(parent, slot, type, vacant) {
  const w = slot.rw * 0.92;
  const d = slot.rw * 0.58;
  const h = vacant ? slot.rh * 0.5 : slot.rh * 0.82;
  const g = svgEl('g', { class: `zz-colony-iso-building ${vacant ? 'is-vacant' : 'is-built'}` });
  const left = isoPoly([
    [-w / 2, d / 2, 0],
    [-w / 2, d / 2, h],
    [-w / 2, -d / 2, h],
    [-w / 2, -d / 2, 0],
  ]);
  const right = isoPoly([
    [-w / 2, d / 2, 0],
    [-w / 2, d / 2, h],
    [w / 2, d / 2, h],
    [w / 2, d / 2, 0],
  ]);
  const top = isoPoly([
    [-w / 2, -d / 2, h],
    [w / 2, -d / 2, h],
    [w / 2, d / 2, h],
    [-w / 2, d / 2, h],
  ]);
  g.appendChild(svgEl('polygon', { points: left, class: 'zz-colony-iso-left' }));
  g.appendChild(svgEl('polygon', { points: right, class: 'zz-colony-iso-right' }));
  g.appendChild(svgEl('polygon', { points: top, class: 'zz-colony-iso-roof' }));
  if (!vacant && type) {
    const badge = svgEl('g', {
      class: 'zz-colony-iso-glyph',
      transform: `translate(0, ${-h - slot.rh * 0.08}) scale(${slot.kind === 'hq' ? 0.42 : 0.34})`,
    });
    paintBuildingGlyph(badge, type, resolveVisualLevel(type));
    g.appendChild(badge);
  }
  parent.appendChild(g);
}

function drawSlotSprite(wrap, slot, type, vacant, unlocked, style, opts = {}) {
  const { spriteScale = 1, ghost = false, ghostValid = null } = opts || {};
  const planted = style === 'dirt';
  const hq = slot.kind === 'hq';
  const farmish = type === 'farm' || type === 'greenhouse';
  const wellish = type === 'well' || type === 'cistern';
  const mulW = hq ? 3.4 : farmish ? 2.5 : wellish ? 1.95 : 2.15;
  const mulH = hq ? 4.1 : farmish ? 2.4 : wellish ? 2.75 : 2.55;
  const imgW = slot.rw * (planted ? mulW : style === 'yard' ? 2.35 : 2.2) * spriteScale;
  const imgH = slot.rh * (planted ? mulH : style === 'yard' ? 2.75 : 2.65) * spriteScale;
  const x = -imgW * 0.5;
  const y = planted ? -imgH * 0.62 : -imgH * 0.9;
  const img = svgEl('image', {
    href: buildingArtUrl(type),
    x,
    y,
    width: imgW,
    height: imgH,
    preserveAspectRatio: 'xMidYMid meet',
    opacity: ghost ? (ghostValid ? '0.88' : '0.55') : undefined,
    class: [
      'zz-colony-slot-img',
      style === 'yard' ? 'zz-colony-slot-img--yard' : '',
      planted ? 'zz-colony-slot-img--planted' : '',
      vacant || !unlocked ? 'is-ruin' : '',
      ghost ? 'zz-pilot-ghost' : '',
      ghost ? (ghostValid ? 'zz-pilot-ghost--ok' : 'zz-pilot-ghost--bad') : '',
    ]
      .filter(Boolean)
      .join(' '),
  });
  wrap.appendChild(img);
  return img;
}

function drawVacantLot(wrap, slot, rng) {
  /* Solar vacío: solo hit. Sin óvalos ni escombros SVG. */
}

function drawCampGround(layer, state) {
  const style = colonyVisualStyle(state);
  if (style === 'dirt') return;
  const g = svgEl('g', { class: `zz-colony-yard zz-colony-yard--${style}`, 'aria-hidden': 'true' });
  if (style === 'yard') {
    g.appendChild(
      svgEl('image', {
        href: artUrl(COLONY_YARD_CLEAN_ART),
        x: -34,
        y: -26,
        width: 68,
        height: 52,
        preserveAspectRatio: 'xMidYMid meet',
        class: 'zz-colony-yard-art',
      })
    );
  } else if (style === 'iso') {
    g.appendChild(
      svgEl('ellipse', {
        cx: 0,
        cy: 1.2,
        rx: 21,
        ry: 14.5,
        class: 'zz-colony-yard-iso-pad',
      })
    );
  }
  layer.appendChild(g);
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
      opacity: '0',
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
  if (state.uiMode !== 'expand') return;
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

function drawColonySlots(layer, state, handlers = {}) {
  const { onSelectSlot } = handlers;
  const layout = ensureColonyLayout(state);
  const buildMode = state.uiMode === 'build' && state.buildMode;
  const style = colonyVisualStyle(state);
  const pilot = state.flags?.pilot === 'neni';
  const spriteScale = pilot ? Number(state.flags?.pilotSpriteScale || 1) : 1;
  const guide = onboardingStatus(state);
  const hintVacantLots = !!guide?.step?.suggestBuild;
  const hintStaffFarm = guide?.step?.wait === 'farmStaffed';
  const hintStaffWell = guide?.step?.wait === 'wellStaffed';
  const group = svgEl('g', { class: `zz-colony-slots zz-colony-slots--${style}` });
  const slots = [...(layout?.slots || [])].sort((a, b) => a.ly - b.ly || a.lx - b.lx);
  slots.forEach((slot) => {
    const b = buildingForSlot(state, slot);
    const vacant = !b;
    const unlocked = slotIsUnlocked(state, slot);
    const selected = state.selectedPlotId === slot.id || (b && state.selectedBuildingId === b.id);
    const wantType = buildMode ? state.buildMode : null;
    const blocked = vacant && slotBlockedByProp(state, slot);
    const canDrop = buildMode && vacant && unlocked && !blocked && slotFitsType(slot, wantType);
    const guideLot =
      !blocked &&
      ((hintVacantLots && vacant && unlocked && slot.kind === 'lot') ||
        (hintStaffFarm && b && (b.type === 'farm' || b.type === 'greenhouse')) ||
        (hintStaffWell && b && (b.type === 'well' || b.type === 'cistern')));
    const rng = createRng(hashSeed(`slot-art:${slot.id}:${state.seed || 's'}`));
    const wrap = svgEl('g', {
      class: [
        'zz-colony-slot',
        `zz-colony-slot--${slot.kind}`,
        vacant ? 'is-vacant' : 'is-built',
        unlocked ? '' : 'is-locked',
        selected ? 'is-selected' : '',
        canDrop ? 'is-buildable' : '',
        blocked ? 'is-blocked' : '',
        guideLot ? 'is-guide-lot' : '',
      ]
        .filter(Boolean)
        .join(' '),
      transform: `translate(${slot.lx},${slot.ly})`,
      'data-slot': slot.id,
      'data-id': b?.id || '',
    });
    plantOnDirt(wrap, slot, style);
    if (style === 'dirt') {
      if (b) {
        drawSlotSprite(wrap, slot, b.type || 'hq_central_l1', false, unlocked, style, { spriteScale });
      }
    } else if (slot.kind === 'lot' && vacant) {
      drawVacantLot(wrap, slot, rng);
    } else if (style === 'iso' && slot.kind === 'lot' && b) {
      drawSlotSprite(wrap, slot, b.type, false, unlocked, style, { spriteScale });
    } else if (style === 'iso' && slot.kind === 'house' && vacant) {
      drawIsoRuin(wrap, slot, rng);
    } else if (style === 'iso' && slot.kind === 'house' && b) {
      drawIsoBuilding(wrap, slot, b.type, false);
    } else if (style === 'iso' && slot.kind === 'hq') {
      drawIsoBuilding(wrap, slot, b?.type || 'hq_central_l1', vacant);
    } else {
      const type = vacant
        ? 'shelter'
        : b?.type || (slot.kind === 'hq' ? 'hq_central_l1' : 'house');
      drawSlotSprite(wrap, slot, type, vacant, unlocked, style, { spriteScale });
    }

    const showGhost =
      pilot &&
      buildMode &&
      state.buildGhost &&
      Number.isFinite(state.buildGhost.x) &&
      Number.isFinite(state.buildGhost.y) &&
      state.buildGhost.x === slot.cell[0] &&
      state.buildGhost.y === slot.cell[1];
    if (showGhost && !b) {
      const ghostValid = !!state.buildGhostValid;
      const wantType = state.buildMode || 'house';
      drawSlotSprite(wrap, slot, wantType, true, unlocked, style, { spriteScale, ghost: true, ghostValid });

      const ghostRx = slot.rw * (style === 'dirt' && slot.kind === 'lot' ? 1.35 : 1);
      const ghostRy = slot.rh * (style === 'dirt' && slot.kind === 'lot' ? 1.05 : 0.85);
      wrap.appendChild(
        svgEl('ellipse', {
          cx: 0,
          cy: slot.rh * 0.1,
          rx: ghostRx,
          ry: ghostRy,
          fill: 'transparent',
          stroke: ghostValid ? '#3ddc6b' : '#e36a6a',
          'stroke-width': 0.22,
          'stroke-dasharray': ghostValid ? '0.3 0.2' : '0.2 0.25',
          opacity: ghostValid ? '0.95' : '0.85',
          class: 'zz-pilot-ghost-outline',
          style: 'pointer-events:none',
        })
      );
    }
    const hit = svgEl('ellipse', {
      cx: 0,
      cy: slot.rh * 0.1,
      rx: slot.rw * (style === 'dirt' && slot.kind === 'lot' ? 1.35 : 1),
      ry: slot.rh * (style === 'dirt' && slot.kind === 'lot' ? 1.05 : 0.85),
      class: 'zz-colony-slot-hit',
      fill: 'transparent',
    });
    wrap.appendChild(hit);
    wrap.style.cursor = 'pointer';
    wrap.style.pointerEvents = 'auto';
    wrap.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      onSelectSlot && onSelectSlot(slot.id);
    });
    group.appendChild(wrap);
  });
  layer.appendChild(group);
}

/** Piloto Neni: edificios + ghost + overlay buildable (coords terreno canónicas). */
function drawPilotBuildingsLayer(parent, state, camp, handlers = {}) {
  if (!camp || !isPilotNeni(state)) return;
  const scale = settlementScale(state);
  const spriteScale = Number(state.flags?.pilotSpriteScale || 1.5);
  const layer = svgEl('g', { class: 'zz-pilot-buildings-layer' });
  const buildings = (state.base?.buildings || []).filter((b) => b.hp > 0);

  const showFpDebug = !!state.flags?.pilotFootprintDebug;
  const buildMode = state.uiMode === 'build' && state.buildMode;

  // Overlay sutil de zonas buildable (solo en modo construir).
  if (buildMode && getPilotZoneMap()) {
    const overlay = svgEl('g', {
      class: 'zz-pilot-buildable-overlay',
      style: 'pointer-events:none',
      opacity: '0.22',
    });
    const cellPx = getPilotZoneMap().cellPx || 24;
    for (const [cx, cy] of listBuildableTerrainCells()) {
      const tl = terrainCellToWorld(cx, cy);
      overlay.appendChild(
        svgEl('rect', {
          x: tl.x,
          y: tl.y,
          width: cellPx,
          height: cellPx,
          fill: 'rgba(110, 130, 70, 0.55)',
          stroke: 'none',
          class: 'zz-pilot-buildable-cell',
        })
      );
    }
    layer.appendChild(overlay);
  }

  // Hit plane = mapa completo (no el rectángulo artificial 28×20).
  if (buildMode) {
    const hit = svgEl('rect', {
      x: 0,
      y: 0,
      width: PILOT_WORLD_W,
      height: PILOT_WORLD_H,
      fill: 'rgba(0,0,0,0.001)',
      class: 'zz-pilot-build-hit zz-settle-ghost-handle',
    });
    hit.style.pointerEvents = 'auto';
    hit.style.cursor = 'crosshair';
    hit.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      handlers.onGhostPointer && handlers.onGhostPointer(ev);
    });
    layer.appendChild(hit);
  }

  buildings
    .slice()
    .sort((a, b) => a.y + (pilotFootprint(a.type)?.h || 1) - (b.y + (pilotFootprint(b.type)?.h || 1)))
    .forEach((b) => {
      const fp = pilotFootprint(b.type);
      if (!fp) return;
      const rect = footprintWorldRect(state, camp, b.x, b.y, fp.w, fp.h, scale);
      if (showFpDebug) drawPilotFootprintOutline(layer, rect, '#8a7a60', 0.35, `${fp.w}×${fp.h}`);
      drawPilotBuildingSprite(layer, b.type, rect, fp, spriteScale);
      if (showFpDebug) {
        logPilotPlaceDebug('render-building', {
          id: b.id,
          type: b.type,
          anchor: { x: b.x, y: b.y },
          worldTL: { x: rect.x, y: rect.y },
          worldCenter: { x: rect.cx, y: rect.cy - rect.h / 2 },
        });
      }
    });

  // Hits: tap corto → sheet; drag → pan (no stopPropagation en down).
  if (!buildMode) {
    buildings.forEach((b) => {
      const fp = pilotFootprint(b.type);
      if (!fp) return;
      const rect = footprintWorldRect(state, camp, b.x, b.y, fp.w, fp.h, scale);
      const hit = svgEl('rect', {
        x: rect.x,
        y: rect.y,
        width: rect.w,
        height: rect.h,
        fill: 'rgba(0,0,0,0.001)',
        class: 'zz-pilot-bldg-hit',
        'data-bldg': b.id,
      });
      hit.style.pointerEvents = 'auto';
      hit.style.cursor = 'pointer';
      let pd = null;
      hit.addEventListener('pointerdown', (ev) => {
        pd = { x: ev.clientX, y: ev.clientY, id: ev.pointerId };
      });
      hit.addEventListener('pointerup', (ev) => {
        if (!pd || pd.id !== ev.pointerId) return;
        const dist = Math.hypot(ev.clientX - pd.x, ev.clientY - pd.y);
        pd = null;
        if (dist > 12) return; // drag → pan; no abrir sheet
        ev.preventDefault();
        ev.stopPropagation();
        handlers.onSelectBuilding && handlers.onSelectBuilding(b.id);
      });
      hit.addEventListener('pointercancel', () => {
        pd = null;
      });
      layer.appendChild(hit);
    });
  }

  if (buildMode && state.buildGhost && Number.isFinite(state.buildGhost.x)) {
    const fp = pilotFootprint(state.buildMode);
    if (fp) {
      const rect = footprintWorldRect(state, camp, state.buildGhost.x, state.buildGhost.y, fp.w, fp.h, scale);
      const ok = !!state.buildGhostValid;
      drawPilotFootprintOutline(
        layer,
        rect,
        ok ? '#6a8f3a' : '#c4783a',
        ok ? 0.32 : 0.28,
        showFpDebug ? `${fp.w}×${fp.h} ghost` : '',
        true,
        ok
      );
      drawPilotBuildingSprite(layer, state.buildMode, rect, fp, spriteScale, { ghost: true, ghostValid: ok });
    }
  }

  if (state.flags?.pilotFootprintDebug) {
    pilotDebugFootprintPlacements(state, camp).forEach((p) => {
      const fp = pilotFootprint(p.type);
      if (!fp) return;
      const rect = footprintWorldRect(state, camp, p.x, p.y, fp.w, fp.h, scale);
      drawPilotFootprintOutline(layer, rect, '#e8c070', 0.22, p.label, true, true);
    });
  }

  parent.appendChild(layer);
}

function drawPilotFootprintOutline(parent, rect, stroke, fillOpacity, label, dashed = false, valid = true) {
  parent.appendChild(
    svgEl('rect', {
      x: rect.x,
      y: rect.y,
      width: rect.w,
      height: rect.h,
      fill: valid ? `rgba(106,143,58,${fillOpacity})` : `rgba(196,120,58,${fillOpacity})`,
      stroke,
      'stroke-width': 2,
      'stroke-dasharray': dashed ? '8 6' : 'none',
      class: 'zz-pilot-footprint-outline',
      style: 'pointer-events:none',
    })
  );
  if (label) {
    const txt = svgEl('text', {
      x: rect.x + 6,
      y: rect.y + 16,
      fill: stroke,
      'font-size': 14,
      'font-family': 'Rajdhani, system-ui, sans-serif',
      'font-weight': 700,
      class: 'zz-pilot-footprint-label',
      style: 'pointer-events:none',
    });
    txt.textContent = label;
    parent.appendChild(txt);
  }
}

function drawPilotBuildingSprite(parent, type, rect, fp, spriteScale, opts = {}) {
  const href = pilotBuildingArtUrl(type);
  if (!href) return;
  const pw = fp.w * rect.scale * spriteScale;
  const ph = fp.h * rect.scale * spriteScale;
  const wx = rect.cx;
  const wy = rect.cy;
  parent.appendChild(
    svgEl('image', {
      href,
      x: wx - pw / 2,
      y: wy - ph,
      width: pw,
      height: ph,
      preserveAspectRatio: 'xMidYMax meet',
      class: [
        'zz-pilot-building-sprite',
        opts.ghost ? 'zz-pilot-ghost' : '',
        opts.ghost ? (opts.ghostValid ? 'zz-pilot-ghost--ok' : 'zz-pilot-ghost--bad') : '',
      ]
        .filter(Boolean)
        .join(' '),
      opacity: opts.ghost ? (opts.ghostValid ? 0.72 : 0.55) : 1,
      style: 'pointer-events:none',
    })
  );
}

/** Hit areas de slots en piloto (tap para elegir anchor). */
function drawPilotSlotHits(layer, state, handlers = {}) {
  const { onSelectSlot } = handlers;
  const layout = ensureColonyLayout(state);
  const buildMode = state.uiMode === 'build' && state.buildMode;
  (layout?.slots || []).forEach((slot) => {
    if (buildMode && !slotFitsType(slot, state.buildMode)) return;
    const wrap = svgEl('g', {
      class: 'zz-pilot-slot-hit',
      transform: `translate(${slot.lx},${slot.ly})`,
      'data-slot': slot.id,
    });
    wrap.appendChild(
      svgEl('ellipse', {
        cx: 0,
        cy: slot.rh * 0.1,
        rx: slot.rw * 1.1,
        ry: slot.rh * 0.95,
        fill: 'transparent',
        class: 'zz-colony-slot-hit',
      })
    );
    wrap.style.cursor = buildMode ? 'crosshair' : 'pointer';
    wrap.style.pointerEvents = 'auto';
    wrap.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      onSelectSlot && onSelectSlot(slot.id);
    });
    layer.appendChild(wrap);
  });
}

function drawSettlementCore(g, state, camp, tier, handlers = {}) {
  const { onSelectSlot } = handlers;
  const layout = ensureColonyLayout(state);
  const style = colonyVisualStyle(state);
  const pilot = state.flags?.pilot === 'neni';
  const layer = svgEl('g', { class: 'zz-map-settlement', transform: `translate(${camp.x},${camp.y})` });
  const bw = state.base.w || 10;
  const bh = state.base.h || 8;

  if (pilot) {
    // Piloto: sin slots/hits residuales del colony-layout (círculos/elipses legacy).
    // Edificios + ghost viven en drawPilotBuildingsLayer (coords terreno).
    g.appendChild(layer);
    return;
  }

  if (!pilot) drawCampGround(layer, state);

  drawColonySlots(layer, state, { onSelectSlot });
  if (!pilot) {
    const props = svgEl('g', { class: 'zz-colony-props', style: 'pointer-events:none' });
    if (style === 'dirt') {
      const deco = [
        ...(layout?.wrecks || []).map((p) => ({
          y: p.y,
          draw: () => drawPropSprite(props, p.kind || 'vehicle', p.x, p.y, p.s || 1),
        })),
        ...(layout?.trees || []).map((t) => ({
          y: t.y,
          draw: () => drawPropSprite(props, 'tree', t.x, t.y, t.s || 1),
        })),
      ].sort((a, b) => a.y - b.y);
      deco.forEach((d) => d.draw());
    } else {
      (layout?.wrecks || []).forEach((p) => drawProp(props, p.kind || 'vehicle', p.x, p.y, p.s || 1));
      (layout?.trees || []).forEach((t) => drawProp(props, 'tree', t.x, t.y, t.s || 1));
    }
    layer.appendChild(props);

    drawAmbientLife(layer, state, handlers?.content || null, {
      scale: 1.15,
      bw,
      bh,
      scatter: style === 'dirt' ? 8.5 : 1.2,
      personScale: style === 'dirt' ? 2.4 : 1.15,
    });
    if (typeof document !== 'undefined' && document.body?.classList.contains('zz-body--demo')) {
      const names = { yard: 'A · PATIO ILUSTRADO', dirt: 'B · TIERRA CONTINUA', iso: 'C · BLOQUES ISO' };
      const tag = svgEl('text', {
        x: 0,
        y: -28,
        'text-anchor': 'middle',
        fill: '#e8c070',
        'font-size': '3.2',
        'font-family': 'Rajdhani, sans-serif',
        'font-weight': '700',
        class: 'zz-colony-style-tag',
        style: 'pointer-events:none',
      });
      tag.textContent = names[style] || style;
      layer.appendChild(tag);
    }
  }
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
  const pilot = state.flags?.pilot === 'neni';
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
  const sw = pilot ? 2.4 : 0.35; // stroke legible en mundo piloto

  // Hit area invisible. El camp no tapa el pan (clic en casitas).
  if (z.type !== 'camp') {
    g.appendChild(svgEl('polygon', { points: polyPts, class: 'zz-zone-hit', fill: 'transparent', stroke: 'none' }));
  }

  if (z.state === 'hostile' || attacked) {
    if (!pilot) {
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
  }
  if (z.state === 'contested') {
    if (!pilot) {
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
          'stroke-width': String(sw),
          'stroke-dasharray': '1.2 0.8',
          class: 'zz-zone-contested-ring',
          opacity: '0.85',
        })
      );
    }
  }
  if (z.state === 'discovered' && !exploreTarget) {
    if (!pilot) {
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
  }
  if (z.state === 'controlled' && z.type !== 'camp') {
    if (!pilot) {
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
  }
  if (exploreTarget && !pilot) {
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
    drawSettlementCore(g, state, z, tier, {
      onSelectSlot: handlers?.onSelectSlot,
      content: handlers?.content,
    });
    if (!pilot) drawSectorOverlays(g, state, z, { onSelectSector });
  } else if (z.state === 'unknown') {
    drawIrregularFog(g, z, rng, (state.day || 1) <= 2);
  } else {
    const zArt = zoneArtUrl(z);
    // Piloto: mundo 1819×865 — el tope 7.2 del mapa 100×100 deja landmarks invisibles.
    const s = pilot ? Math.min(80, Math.max(48, (z.r || 36) * 1.15)) : Math.min(7.2, z.r * 0.9);
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
      // QA colonia: siluetas de exploración se confunden con edificios — ocultar temporalmente.
      if (!(pilot && state.flags?.pilotQaMode)) {
        drawLandmarkSilhouette(g, z, z.type);
      }
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
      const markH = zArt ? s : pilot ? Math.min(70, z.r * 0.85) : Math.min(6.5, z.r * 0.85);
      const short = (z.name || 'Lugar').split(/\s+/).slice(0, 2).join(' ');
      g.appendChild(
        svgEl(
          'text',
          {
            x: z.x,
            y: z.y + markH / 2 + (pilot ? 14 : 1.1),
            'text-anchor': 'middle',
            class: 'zz-zone-mark-label is-focus',
            'font-size': pilot ? '16' : undefined,
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

  if (z.state !== 'unknown' && z.type !== 'camp') {
    g.addEventListener('click', (ev) => {
      if (ev.target?.closest?.('.zz-colony-slot, .zz-settle-bldg')) return;
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
  const pilot = isPilotNeni(state);
  const figScale = pilot ? 10 : 1;

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
    g.appendChild(
      svgEl('path', {
        d,
        class: 'zz-map-route',
        fill: 'none',
        'stroke-width': pilot ? '3' : undefined,
      })
    );
    const t = expeditionProgress(ex, state.day || 1);
    const px = (1 - t) * (1 - t) * camp.x + 2 * (1 - t) * t * mx + t * t * dest.x;
    const py = (1 - t) * (1 - t) * camp.y + 2 * (1 - t) * t * my + t * t * dest.y;
    const fig = svgEl('g', { transform: `translate(${px},${py}) scale(${figScale})`, class: 'zz-map-explorer-marker' });
    fig.appendChild(svgEl('circle', { cx: 0, cy: -1.1, r: 1.1, fill: '#e8c090', stroke: '#5a4030', 'stroke-width': 0.35 }));
    fig.appendChild(svgEl('path', { d: 'M-1.2 0.3 Q0 2.2 1.2 0.3', fill: '#6a5040' }));
    g.appendChild(fig);
    g.appendChild(
      svgEl('text', {
        x: px,
        y: py - 3.0 * figScale,
        'text-anchor': 'middle',
        class: 'zz-map-route-label',
        'font-size': pilot ? '14' : undefined,
      }, [label])
    );
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
  const houses = (state.base?.buildings || []).filter((b) => {
    if (b.hp <= 0) return false;
    const t = String(b.type || '');
    return t.includes('house') || t.includes('shelter') || t.startsWith('hq_') || t === 'block';
  });
  houses.slice(0, 6).forEach((b) => {
    const slot = slotForBuilding(state, b);
    const ox = camp ? camp.x + (slot?.lx || 0) : 40;
    const oy = camp ? camp.y + (slot?.ly || 0) - 2.2 : 45;
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

// ── ZOOM: rango con contrato 1 unidad mundo = 1 px del mapa a zoom=1 ──────────────────────────
const ZOOM_MIN_NORMAL = 0.25;
const ZOOM_MAX = 3.0;

function zoomMinForState(state, svg) {
  const dims = worldDimsForState(state);
  const { vpW, vpH } = mapViewportPx(svg);
  // Contrato demo-neni: visibleW = vpW/zoom. Zoom mínimo = no mostrar exterior del mapa.
  const fitMin = Math.max(vpW / Math.max(1, dims.w), vpH / Math.max(1, dims.h));
  return clamp(fitMin, 0.01, ZOOM_MAX);
}

export function recenterCamera(state) {
  if (!state) return;
  state.mapCamera = state.mapCamera || {};
  const cam = state.mapCamera;
  const nucleus = nucleusForState(state);

  if (isPilotNeni(state)) {
    state.flags = state.flags || {};
    const zmin = zoomMinForState(state, resolveMapSvg());
    const isFirst = !state.flags.pilotNeniCamInitialized;

    if (isFirst) {
      // Cámara inicial canónica: centrada en HQ D (824,532). No reutilizar vistas demo antiguas.
      cam.x = nucleus.x;
      cam.y = nucleus.y;
      cam.zoom = Math.min(ZOOM_MAX, Math.max(zmin * 2.5, zmin));
      state.flags.pilotNeniCamInitialized = true;
    } else {
      // Recentrar (botón): sólo centra en núcleo y deja un zoom razonable.
      cam.x = nucleus.x;
      cam.y = nucleus.y;
      cam.zoom = Math.max(1.0, zmin);
    }
    return;
  }

  // Normal (no piloto)
  cam.x = nucleus.x;
  cam.y = nucleus.y;
  cam.zoom = 1.0;
}

export function clampCamera(state, svg) {
  if (!state?.mapCamera) return;
  const cam = state.mapCamera;
  const el = resolveMapSvg(svg);
  cam.zoom = clamp(cam.zoom || 1.0, zoomMinForState(state, el), ZOOM_MAX);
  const dims = worldDimsForState(state);
  const nucleus = nucleusForState(state);
  const { vpW, vpH } = mapViewportPx(el);
  const halfW = (vpW / 2) / cam.zoom;
  const halfH = (vpH / 2) / cam.zoom;
  const visW = vpW / cam.zoom;
  const visH = vpH / cam.zoom;
  if (visW >= dims.w) {
    cam.x = dims.w / 2;
  } else {
    cam.x = clamp(cam.x ?? nucleus.x, halfW, dims.w - halfW);
  }
  if (visH >= dims.h) {
    cam.y = dims.h / 2;
  } else {
    cam.y = clamp(cam.y ?? nucleus.y, halfH, dims.h - halfH);
  }
}

/** Zoom relativo (factor>1 acerca). */
export function zoomCameraBy(state, factor, svg) {
  if (!state?.mapCamera) return;
  state.mapCamera.zoom = (state.mapCamera.zoom || 1.0) * (Number(factor) || 1);
  clampCamera(state, svg);
}

/** Pan relativo en unidades de mundo (px). */
export function panCameraBy(state, dx, dy, svg) {
  if (!state?.mapCamera) return;
  const nucleus = nucleusForState(state);
  state.mapCamera.x = (state.mapCamera.x || nucleus.x) + (Number(dx) || 0);
  state.mapCamera.y = (state.mapCamera.y || nucleus.y) + (Number(dy) || 0);
  clampCamera(state, svg);
}

export function cameraViewBox(state, m, svg) {
  const el = resolveMapSvg(svg);
  clampCamera(state, el);
  const nucleus = nucleusForState(state);
  const cam = state.mapCamera || { x: nucleus.x, y: nucleus.y, zoom: 1.0 };
  const zoom = clamp(cam.zoom || 1.0, zoomMinForState(state, el), ZOOM_MAX);
  const { vpW, vpH } = mapViewportPx(el);
  const vw = vpW / zoom;
  const vh = vpH / zoom;
  const cx = cam.x ?? nucleus.x;
  const cy = cam.y ?? nucleus.y;
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

/** Fit-mundo: ajusta zoom al "zoom mínimo" de fit y centra en el mundo completo. */
export function fitWorldCamera(state, svg) {
  if (!state?.mapCamera) return;
  const el = resolveMapSvg(svg);
  const dims = worldDimsForState(state);
  const zmin = zoomMinForState(state, el);
  state.mapCamera.x = dims.w / 2;
  state.mapCamera.y = dims.h / 2;
  state.mapCamera.zoom = zmin;
  clampCamera(state, el);
}

export function applyMapCamera(svg, state) {
  if (!svg || !state) return;
  const m = mapMetrics(svg);
  const vb = cameraViewBox(state, m, svg);
  svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
}

/** Bind pan/zoom una sola vez al contenedor del mapa. */
export function bindMapCamera(wrap, getState, onChange) {
  if (!wrap || wrap._zzCamBound) return;
  wrap._zzCamBound = true;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let startX = 0;
  let startY = 0;
  let moved = false;

  const activePointers = new Map(); // pointerId -> {x,y}
  let pinch = null; // { lastDist, u, v, worldMidX, worldMidY, zoom0 }

  const svg = () => wrap.querySelector('svg.zz-map') || wrap.querySelector('svg');
  const pilotTouch = () => getState()?.flags?.pilot === 'neni';

  const markPanned = () => {
    wrap.dataset.zzPanned = '1';
    setTimeout(() => {
      delete wrap.dataset.zzPanned;
    }, 80);
  };

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

  wrap.addEventListener(
    'click',
    (ev) => {
      if (wrap.dataset.zzPanned) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    },
    true
  );

  wrap.addEventListener('pointerdown', (ev) => {
    if (ev.button != null && ev.button !== 0) return;
    const t = ev.target;
    if (t?.closest?.('.zz-settle-ghost-handle')) {
      dragging = false;
      wrap.dataset.zzGhostDrag = '1';
      return;
    }

    const state = getState();
    if (!state?.mapCamera) return;
    const pilot = pilotTouch();

    activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

    // Pinch-to-zoom SOLO en piloto
    if (pilot && activePointers.size === 2) {
      const pts = [...activePointers.values()];
      const a = pts[0];
      const b = pts[1];
      const lastDist = Math.hypot(b.x - a.x, b.y - a.y);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;

      const el = svg();
      const rect = el?.getBoundingClientRect?.();
      if (!el || !rect || rect.width <= 0 || rect.height <= 0) return;

      const u = (midX - rect.left) / rect.width;
      const v = (midY - rect.top) / rect.height;
      const { vpW, vpH } = mapViewportPx(el);
      const zoom0 = state.mapCamera.zoom || 1.0;
      const vw0 = vpW / zoom0;
      const vh0 = vpH / zoom0;
      const worldMidX = state.mapCamera.x + (u - 0.5) * vw0;
      const worldMidY = state.mapCamera.y + (v - 0.5) * vh0;

      pinch = { lastDist, u, v, worldMidX, worldMidY, zoom0 };
      dragging = false;
      moved = false;
      markPanned();
      ev.preventDefault?.();
      return;
    }

    // Sólo arrastre con 1 dedo (o no piloto)
    if (activePointers.size !== 1) return;
    pinch = null;
    dragging = true;
    moved = false;
    lastX = ev.clientX;
    lastY = ev.clientY;
    startX = ev.clientX;
    startY = ev.clientY;
    wrap.setPointerCapture?.(ev.pointerId);
  });

  wrap.addEventListener('pointermove', (ev) => {
    if (wrap.dataset.zzGhostDrag === '1') return;
    const state = getState();
    const el = svg();
    if (!state?.mapCamera || !el) return;

    // actualizar puntero
    if (activePointers.has(ev.pointerId)) {
      activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    }

    const pilot = pilotTouch();

    // Pinch activo
    if (pilot && pinch && activePointers.size === 2) {
      const pts = [...activePointers.values()];
      const a = pts[0];
      const b = pts[1];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      if (!pinch.lastDist || pinch.lastDist <= 0) return;
      const ratio = dist / pinch.lastDist;

      const newZoom = pinch.zoom0 * ratio;
      const { vpW, vpH } = mapViewportPx(el);
      const vw = vpW / newZoom;
      const vh = vpH / newZoom;
      state.mapCamera.zoom = newZoom;
      state.mapCamera.x = pinch.worldMidX - (pinch.u - 0.5) * vw;
      state.mapCamera.y = pinch.worldMidY - (pinch.v - 0.5) * vh;

      clampCamera(state, el);
      applyMapCamera(el, state);
      moved = true;
      // Evitar clicks residuales
      markPanned();
      return;
    }

    if (!dragging) return;
    if (activePointers.size !== 1) return;

    const dx = ev.clientX - lastX;
    const dy = ev.clientY - lastY;
    lastX = ev.clientX;
    lastY = ev.clientY;
    const fromStart = Math.hypot(ev.clientX - startX, ev.clientY - startY);
    if (fromStart > 10) moved = true;

    const m = mapMetrics(el);
    const vb = cameraViewBox(state, m, el);
    const rect = el.getBoundingClientRect();
    const scaleX = vb.w / Math.max(1, rect.width);
    const scaleY = vb.h / Math.max(1, rect.height);
    state.mapCamera.x = (state.mapCamera.x || 50) - dx * scaleX;
    state.mapCamera.y = (state.mapCamera.y || 48) - dy * scaleY;
    clampCamera(state, el);
    applyMapCamera(el, state);
  });

  const endPointer = (ev) => {
    if (wrap.dataset.zzGhostDrag === '1') delete wrap.dataset.zzGhostDrag;

    activePointers.delete(ev.pointerId);

    const pilot = pilotTouch();
    const endedPinch = pilot && pinch && activePointers.size < 2;
    if (endedPinch) {
      pinch = null;
      if (moved) onChange && onChange();
      // markPanned ya se hizo durante el pinch
      return;
    }

    if (!dragging) return;
    dragging = false;
    wrap.releasePointerCapture?.(ev.pointerId);
    if (moved) {
      onChange && onChange();
      markPanned();
    }
  };

  wrap.addEventListener('pointerup', endPointer);
  wrap.addEventListener('pointercancel', endPointer);
}

export function renderMap(svg, state, handlers = {}) {
  if (!svg) return;
  const { onSelectZone, onSelectBuilding, onPlaceCell, onSelectSector, onGhostPointer, onSelectSlot, content } = handlers;
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const pilot = isPilotNeni(state);
  const dims = worldDimsForState(state);
  svg.dataset.zzWorldW = String(dims.w);
  svg.dataset.zzWorldH = String(dims.h);
  const m = mapMetrics(svg);
  if (!state.mapCamera) {
    const nucleus = nucleusForState(state);
    state.mapCamera = { x: nucleus.x, y: nucleus.y, zoom: 1.0 };
  }
  const vb = cameraViewBox(state, m, svg);
  svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  svg.setAttribute('preserveAspectRatio', 'none');

  const tier = colonyVisualTier(state);
  svg.dataset.tier = String(tier);
  svg.dataset.wide = m.wide ? '1' : '0';
  svg.dataset.mode = state.uiMode || '';
  svg.dataset.colonyStyle = colonyVisualStyle(state);
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

  // ── MAPA MAESTRO como fondo del mundo ─────────────────────────────────
  // La imagen ocupa exactamente W×H del mundo en coordenadas de mundo.
  svg.appendChild(
    svgEl('image', {
      href: artUrl(pilot ? PILOT_WORLD_MAP_ART : WORLD_MAP_ART),
      x: '0',
      y: '0',
      width: String(dims.w),
      height: String(dims.h),
      preserveAspectRatio: 'none',
      class: 'zz-world-map-bg',
      style: 'pointer-events:none',
    })
  );

  const worldAttrs = { class: 'zz-map-world' };
  const world = svgEl('g', worldAttrs);
  const zones = state.zones || [];
  const camp = zones.find((z) => z.type === 'camp');
  if (!pilot) {
    // En piloto, el fondo raster ya contiene el terreno; esto duplica/sucede visualmente.
    drawColonyGround(world, camp, state);
  }

  const layer = svgEl('g', { class: 'zz-map-layer zz-map-zones' });
  const ordered = [...zones].sort((a, b) => {
    const rank = { unknown: 0, discovered: 1, hostile: 2, controlled: 3 };
    return (rank[a.state] || 0) - (rank[b.state] || 0);
  });
  const toDraw = ordered;
  toDraw.forEach((z) =>
    drawZone(layer, z, state, tier, {
      onSelectZone,
      onSelectBuilding,
      onSelectSector,
      onSelectSlot,
      content,
    })
  );
  world.appendChild(layer);

  drawExpeditions(world, state);
  svg.appendChild(world);
  if (pilot && camp) {
    drawPilotBuildingsLayer(world, state, camp, {
      onSelectSlot,
      onGhostPointer,
      onSelectBuilding,
    });
  }
  if (!pilot) {
    drawWeather(svg, state.weather, m);
    drawHeatingChimneys(world, state, m);
    drawLegend();
  }
}
