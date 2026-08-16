/**
 * Base / asentamiento — terreno jugable, no cuadrícula de editor.
 */
import { drawBuildingOnCell, resolveVisualLevel, svgEl } from './icons.js';
import { allLiving } from './state.js';

export function renderBase(svg, state, { onCellClick } = {}) {
  if (!svg) return;
  const ns = 'http://www.w3.org/2000/svg';
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const cell = 40;
  const pad = 18;
  const bw = state.base.w;
  const bh = state.base.h;
  const fieldW = bw * cell;
  const fieldH = bh * cell;
  const w = fieldW + pad * 2;
  const h = fieldH + pad * 2;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

  const living = typeof allLiving === 'function' ? allLiving(state) : (state.survivors || []).filter((s) => s.status !== 'dead');
  const pop = living.length;
  const buildMode = !!state.buildMode;

  const defs = svgEl('defs');

  // Tierra / hormigón
  const dirt = svgEl('pattern', { id: 'zzDirt', width: 16, height: 16, patternUnits: 'userSpaceOnUse' });
  dirt.appendChild(svgEl('rect', { width: 16, height: 16, fill: '#2a241c' }));
  dirt.appendChild(svgEl('circle', { cx: 3, cy: 4, r: 1, fill: '#332c22', opacity: 0.55 }));
  dirt.appendChild(svgEl('circle', { cx: 11, cy: 10, r: 0.8, fill: '#1e1a14', opacity: 0.5 }));
  dirt.appendChild(svgEl('circle', { cx: 8, cy: 2, r: 0.5, fill: '#3a3228', opacity: 0.4 }));
  defs.appendChild(dirt);

  const concrete = svgEl('pattern', { id: 'zzConcrete', width: 20, height: 20, patternUnits: 'userSpaceOnUse' });
  concrete.appendChild(svgEl('rect', { width: 20, height: 20, fill: '#2e2a26' }));
  concrete.appendChild(svgEl('path', { d: 'M0 10h20M10 0v20', fill: 'none', stroke: '#3a3530', 'stroke-width': 0.6, opacity: 0.5 }));
  defs.appendChild(concrete);

  const pathPat = svgEl('pattern', { id: 'zzPath', width: 8, height: 8, patternUnits: 'userSpaceOnUse' });
  pathPat.appendChild(svgEl('rect', { width: 8, height: 8, fill: '#3a342c' }));
  pathPat.appendChild(svgEl('rect', { width: 8, height: 1, y: 3.5, fill: '#4a4238', opacity: 0.55 }));
  defs.appendChild(pathPat);

  svg.appendChild(defs);

  // Terreno base
  svg.appendChild(svgEl('rect', { width: w, height: h, class: 'zz-base-ground', fill: 'url(#zzDirt)' }));

  // Parches de hormigón en esquinas / plaza
  const patches = svgEl('g', { class: 'zz-base-concrete', opacity: 0.55 });
  patches.appendChild(
    svgEl('rect', {
      x: pad + fieldW * 0.55,
      y: pad + fieldH * 0.08,
      width: fieldW * 0.38,
      height: fieldH * 0.28,
      rx: 4,
      fill: 'url(#zzConcrete)',
    })
  );
  patches.appendChild(
    svgEl('rect', {
      x: pad + 4,
      y: pad + fieldH * 0.62,
      width: fieldW * 0.32,
      height: fieldH * 0.3,
      rx: 4,
      fill: 'url(#zzConcrete)',
    })
  );
  svg.appendChild(patches);

  // Valla / perímetro del asentamiento
  const fenceG = svgEl('g', { class: 'zz-base-fence-group' });
  fenceG.appendChild(
    svgEl('rect', {
      x: pad - 8,
      y: pad - 8,
      width: fieldW + 16,
      height: fieldH + 16,
      class: 'zz-base-fence',
      rx: 6,
      fill: 'none',
    })
  );
  // Postes
  const postStep = cell;
  for (let px = pad - 8; px <= pad + fieldW + 8; px += postStep) {
    for (const py of [pad - 8, pad + fieldH + 8]) {
      fenceG.appendChild(svgEl('circle', { cx: px, cy: py, r: 2.2, fill: '#5a4a38', stroke: '#8a7a60', 'stroke-width': 0.8 }));
    }
  }
  for (let py = pad; py <= pad + fieldH; py += postStep) {
    for (const px of [pad - 8, pad + fieldW + 8]) {
      fenceG.appendChild(svgEl('circle', { cx: px, cy: py, r: 2.2, fill: '#5a4a38', stroke: '#8a7a60', 'stroke-width': 0.8 }));
    }
  }
  // Puerta sur (abertura)
  const gateX = pad + fieldW / 2 - 14;
  fenceG.appendChild(
    svgEl('rect', {
      x: gateX,
      y: pad + fieldH + 4,
      width: 28,
      height: 6,
      rx: 1,
      fill: '#3a3228',
      stroke: '#6a5a48',
      'stroke-width': 1,
    })
  );
  svg.appendChild(fenceG);

  // Caminos en cruz
  const pathG = svgEl('g', { class: 'zz-base-paths' });
  const midX = pad + Math.floor(bw / 2) * cell;
  const midY = pad + Math.floor(bh / 2) * cell;
  pathG.appendChild(
    svgEl('rect', {
      x: midX + 6,
      y: pad,
      width: cell - 12,
      height: fieldH,
      fill: 'url(#zzPath)',
      opacity: 0.9,
    })
  );
  pathG.appendChild(
    svgEl('rect', {
      x: pad,
      y: midY + 6,
      width: fieldW,
      height: cell - 12,
      fill: 'url(#zzPath)',
      opacity: 0.9,
    })
  );
  // Intersección
  pathG.appendChild(
    svgEl('circle', {
      cx: midX + cell / 2,
      cy: midY + cell / 2,
      r: 6,
      fill: '#3a342c',
      opacity: 0.7,
    })
  );
  svg.appendChild(pathG);

  // Ambiente: maleza, cajas, barriles, farolas
  const ambient = svgEl('g', { class: 'zz-base-ambient', 'aria-hidden': 'true' });
  const scrubSpots = [
    [0.12, 0.15],
    [0.88, 0.2],
    [0.18, 0.78],
    [0.82, 0.85],
    [0.7, 0.45],
    [0.3, 0.55],
  ];
  scrubSpots.forEach(([fx, fy], i) => {
    const cx = pad + fx * fieldW;
    const cy = pad + fy * fieldH;
    ambient.appendChild(svgEl('ellipse', { cx, cy, rx: 4 + (i % 3), ry: 2.5, fill: '#3a4a28', opacity: 0.55 }));
    ambient.appendChild(svgEl('circle', { cx: cx - 2, cy: cy - 1, r: 1.5, fill: '#4a5a30', opacity: 0.5 }));
  });

  // Cajas
  const crateSpots = [
    [0.08, 0.42],
    [0.92, 0.55],
    [0.45, 0.12],
  ];
  crateSpots.forEach(([fx, fy]) => {
    const cx = pad + fx * fieldW;
    const cy = pad + fy * fieldH;
    ambient.appendChild(svgEl('rect', { x: cx - 5, y: cy - 4, width: 10, height: 8, rx: 1, fill: '#5a4a38', stroke: '#8a7a60', 'stroke-width': 0.8 }));
    ambient.appendChild(svgEl('path', { d: `M${cx - 5} ${cy}h10`, fill: 'none', stroke: '#6a5a48', 'stroke-width': 0.7 }));
  });

  // Barriles
  const barrelSpots = [
    [0.22, 0.28],
    [0.78, 0.72],
  ];
  barrelSpots.forEach(([fx, fy]) => {
    const cx = pad + fx * fieldW;
    const cy = pad + fy * fieldH;
    ambient.appendChild(svgEl('ellipse', { cx, cy: cy + 5, rx: 4, ry: 2, fill: '#2a2825' }));
    ambient.appendChild(svgEl('rect', { x: cx - 4, y: cy - 5, width: 8, height: 10, rx: 2, fill: '#4a4035', stroke: '#7a6a55', 'stroke-width': 0.9 }));
    ambient.appendChild(svgEl('ellipse', { cx, cy: cy - 5, rx: 4, ry: 1.8, fill: '#5a5045' }));
  });

  // Farolas
  const lampSpots = [
    [0.05, 0.5],
    [0.95, 0.5],
    [0.5, 0.05],
  ];
  lampSpots.forEach(([fx, fy]) => {
    const cx = pad + fx * fieldW;
    const cy = pad + fy * fieldH;
    ambient.appendChild(svgEl('path', { d: `M${cx} ${cy + 8}V${cy - 6}`, fill: 'none', stroke: '#5a5048', 'stroke-width': 1.4 }));
    ambient.appendChild(svgEl('circle', { cx, cy: cy - 7, r: 2.4, fill: '#f0c070', opacity: 0.75 }));
    ambient.appendChild(svgEl('circle', { cx, cy: cy - 7, r: 5, fill: '#f0c070', opacity: 0.12 }));
  });

  // Vehículo aparcado
  if ((state.vehiclesOwned || []).length > 0) {
    const vx = pad + fieldW * 0.72;
    const vy = pad + fieldH * 0.18;
    const veh = svgEl('g', { class: 'zz-base-vehicle', transform: `translate(${vx},${vy})` });
    veh.appendChild(svgEl('path', { d: 'M0 10h28l-3-7h-6l-3-4H8L5 3H0z', fill: '#4a4538', stroke: '#8a7a60', 'stroke-width': 1 }));
    veh.appendChild(svgEl('rect', { x: 8, y: 1, width: 8, height: 5, fill: '#2a3538', opacity: 0.7 }));
    veh.appendChild(svgEl('circle', { cx: 6, cy: 11, r: 2.5, fill: '#2a2825', stroke: '#6a5a48', 'stroke-width': 0.8 }));
    veh.appendChild(svgEl('circle', { cx: 22, cy: 11, r: 2.5, fill: '#2a2825', stroke: '#6a5a48', 'stroke-width': 0.8 }));
    ambient.appendChild(veh);
  }

  // Tiendas / actividad si hay mucha población
  if (pop >= 6) {
    const tentN = Math.min(4, Math.floor(pop / 4));
    for (let i = 0; i < tentN; i++) {
      const tx = pad + ((0.15 + i * 0.2) % 0.85) * fieldW;
      const ty = pad + (0.68 + (i % 2) * 0.1) * fieldH;
      ambient.appendChild(svgEl('path', { d: `M${tx} ${ty}l6-8 6 8H${tx}z`, fill: '#5a4a3a', stroke: '#8a7060', 'stroke-width': 0.9, opacity: 0.7 }));
    }
  }

  svg.appendChild(ambient);

  // Piedras sueltas
  const clutter = svgEl('g', { class: 'zz-base-clutter', 'aria-hidden': 'true' });
  for (let i = 0; i < 12; i++) {
    const cx = pad + ((i * 37 + 11) % fieldW);
    const cy = pad + ((i * 53 + 19) % fieldH);
    clutter.appendChild(svgEl('circle', { cx, cy, r: 1.2 + (i % 3) * 0.4, class: 'zz-base-pebble' }));
  }
  svg.appendChild(clutter);

  // Celdas: casi invisibles salvo modo construir
  const cells = svgEl('g', { class: 'zz-base-cells' + (buildMode ? ' is-build' : '') });
  const occupied = new Set(
    (state.base.buildings || []).filter((bb) => bb.hp > 0).map((bb) => `${bb.x},${bb.y}`)
  );

  const ghostLayer = svgEl('g', {
    class: 'zz-base-ghost-layer',
    'pointer-events': 'none',
  });

  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const rx = pad + x * cell;
      const ry = pad + y * cell;
      const isOcc = occupied.has(`${x},${y}`);
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', String(rx + 1));
      rect.setAttribute('y', String(ry + 1));
      rect.setAttribute('width', String(cell - 2));
      rect.setAttribute('height', String(cell - 2));
      rect.setAttribute('rx', '4');
      rect.setAttribute(
        'class',
        'zz-base-cell' + (isOcc ? ' is-filled' : '') + (buildMode && !isOcc ? ' is-buildable' : '')
      );
      if (buildMode && !isOcc) {
        rect.setAttribute('stroke-dasharray', '3 2');
        rect.addEventListener('mouseenter', () => {
          while (ghostLayer.firstChild) ghostLayer.removeChild(ghostLayer.firstChild);
          const preview = svgEl('g', { class: 'zz-base-ghost', opacity: 0.4 });
          preview.appendChild(
            drawBuildingOnCell(ns, state.buildMode, rx, ry, cell, resolveVisualLevel(state.buildMode))
          );
          ghostLayer.appendChild(preview);
        });
        rect.addEventListener('mouseleave', () => {
          while (ghostLayer.firstChild) ghostLayer.removeChild(ghostLayer.firstChild);
        });
      }
      rect.style.cursor = buildMode && !isOcc ? 'pointer' : 'default';
      rect.addEventListener('click', () => onCellClick && onCellClick(x, y));
      cells.appendChild(rect);
    }
  }
  svg.appendChild(cells);
  svg.appendChild(ghostLayer);

  // Edificios
  const bldgLayer = svgEl('g', { class: 'zz-base-buildings' });
  (state.base.buildings || []).forEach((b) => {
    const rx = pad + b.x * cell;
    const ry = pad + b.y * cell;
    const level = resolveVisualLevel(b.type);
    const hp = b.hp ?? 100;
    const st = hp <= 0 ? 'destroyed' : hp < 35 ? 'critical' : hp < 70 ? 'damaged' : 'ok';
    if (st === 'destroyed') {
      const rubble = svgEl('g', { class: 'zz-base-rubble', opacity: 0.5 });
      rubble.appendChild(
        svgEl('rect', {
          x: rx + 6,
          y: ry + 10,
          width: cell - 12,
          height: cell - 16,
          fill: '#3a342c',
          stroke: '#6a5a48',
          'stroke-width': 1,
          rx: 2,
        })
      );
      bldgLayer.appendChild(rubble);
      return;
    }
    const g = drawBuildingOnCell(ns, b.type, rx, ry, cell, level);
    if (st !== 'ok' && g?.setAttribute) {
      g.setAttribute('opacity', st === 'critical' ? '0.75' : '0.9');
      g.setAttribute('class', `${g.getAttribute('class') || ''} zz-bldg--${st}`);
    }
    bldgLayer.appendChild(g);
  });
  svg.appendChild(bldgLayer);

  // Población visual: puntos cerca de edificios de vivienda / HQ
  const popDots = Math.min(20, pop);
  if (popDots > 0) {
    const popG = svgEl('g', { class: 'zz-base-pop', 'aria-hidden': 'true' });
    const anchors = (state.base.buildings || [])
      .filter((b) => b.hp > 0 && /shelter|house|block|hq_central/.test(b.type))
      .map((b) => ({ x: pad + b.x * cell + cell / 2, y: pad + b.y * cell + cell - 4 }));
    const fallback = [{ x: pad + fieldW / 2, y: pad + fieldH * 0.75 }];
    const spots = anchors.length ? anchors : fallback;
    for (let i = 0; i < popDots; i++) {
      const a = spots[i % spots.length];
      const ox = ((i * 17) % 18) - 9;
      const oy = ((i * 11) % 10) - 2;
      const cx = a.x + ox;
      const cy = a.y + oy;
      // figura mínima: cabeza + cuerpo
      popG.appendChild(svgEl('circle', { cx, cy: cy - 2.5, r: 1.4, fill: '#c4a882', opacity: 0.85 }));
      popG.appendChild(svgEl('ellipse', { cx, cy: cy + 1, rx: 1.6, ry: 2.2, fill: '#6a5a48', opacity: 0.8 }));
    }
    svg.appendChild(popG);
  }

  // Caption
  const caption = buildMode
    ? 'Toca una parcela libre para construir'
    : pop > 0
      ? `Vuestro refugio · ${pop} alma${pop === 1 ? '' : 's'}`
      : 'Vuestro refugio';
  svg.appendChild(
    svgEl(
      'text',
      {
        x: pad,
        y: h - 3,
        class: 'zz-base-caption',
      },
      [caption]
    )
  );
}
