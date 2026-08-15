/**
 * Base / asentamiento — terreno jugable, no cuadrícula de editor.
 */
import { drawBuildingOnCell, svgEl } from './icons.js';

export function renderBase(svg, state, { onCellClick } = {}) {
  if (!svg) return;
  const ns = 'http://www.w3.org/2000/svg';
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const cell = 40;
  const pad = 16;
  const w = state.base.w * cell + pad * 2;
  const h = state.base.h * cell + pad * 2;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

  const defs = svgEl('defs');
  const dirt = svgEl('pattern', { id: 'zzDirt', width: 12, height: 12, patternUnits: 'userSpaceOnUse' });
  dirt.appendChild(svgEl('rect', { width: 12, height: 12, fill: '#2a241c' }));
  dirt.appendChild(svgEl('circle', { cx: 3, cy: 4, r: 0.8, fill: '#332c22', opacity: 0.6 }));
  dirt.appendChild(svgEl('circle', { cx: 9, cy: 9, r: 0.6, fill: '#1e1a14', opacity: 0.5 }));
  defs.appendChild(dirt);
  const pathPat = svgEl('pattern', { id: 'zzPath', width: 8, height: 8, patternUnits: 'userSpaceOnUse' });
  pathPat.appendChild(svgEl('rect', { width: 8, height: 8, fill: '#3a342c' }));
  pathPat.appendChild(svgEl('rect', { width: 8, height: 1, y: 3.5, fill: '#4a4238', opacity: 0.5 }));
  defs.appendChild(pathPat);
  svg.appendChild(defs);

  // terreno
  svg.appendChild(svgEl('rect', { width: w, height: h, class: 'zz-base-ground', fill: 'url(#zzDirt)' }));

  // borde del asentamiento
  svg.appendChild(
    svgEl('rect', {
      x: pad - 6,
      y: pad - 6,
      width: state.base.w * cell + 12,
      height: state.base.h * cell + 12,
      class: 'zz-base-fence',
      rx: 8,
      fill: 'none',
    })
  );

  // caminos internos (cruz)
  const pathG = svgEl('g', { class: 'zz-base-paths' });
  const midX = pad + (state.base.w / 2) * cell - cell / 2;
  const midY = pad + (state.base.h / 2) * cell - cell / 2;
  pathG.appendChild(
    svgEl('rect', {
      x: midX + 8,
      y: pad,
      width: cell - 16,
      height: state.base.h * cell,
      fill: 'url(#zzPath)',
      opacity: 0.85,
    })
  );
  pathG.appendChild(
    svgEl('rect', {
      x: pad,
      y: midY + 8,
      width: state.base.w * cell,
      height: cell - 16,
      fill: 'url(#zzPath)',
      opacity: 0.85,
    })
  );
  svg.appendChild(pathG);

  // detalles: piedras / maleza
  const clutter = svgEl('g', { class: 'zz-base-clutter', 'aria-hidden': 'true' });
  for (let i = 0; i < 10; i++) {
    const cx = pad + ((i * 37) % (state.base.w * cell));
    const cy = pad + ((i * 53) % (state.base.h * cell));
    clutter.appendChild(
      svgEl('circle', { cx, cy, r: 1.5 + (i % 3), class: 'zz-base-pebble' })
    );
  }
  svg.appendChild(clutter);

  // celdas (sutiles; más visibles en modo construir)
  const cells = svgEl('g', { class: 'zz-base-cells' + (state.buildMode ? ' is-build' : '') });
  for (let y = 0; y < state.base.h; y++) {
    for (let x = 0; x < state.base.w; x++) {
      const rx = pad + x * cell;
      const ry = pad + y * cell;
      const occupied = state.base.buildings.some((bb) => bb.x === x && bb.y === y);
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', String(rx + 1));
      rect.setAttribute('y', String(ry + 1));
      rect.setAttribute('width', String(cell - 2));
      rect.setAttribute('height', String(cell - 2));
      rect.setAttribute('rx', '5');
      rect.setAttribute(
        'class',
        'zz-base-cell' + (occupied ? ' is-filled' : '') + (state.buildMode && !occupied ? ' is-buildable' : '')
      );
      rect.style.cursor = state.buildMode && !occupied ? 'pointer' : 'default';
      rect.addEventListener('click', () => onCellClick && onCellClick(x, y));
      cells.appendChild(rect);
    }
  }
  svg.appendChild(cells);

  // edificios encima
  const bldgLayer = svgEl('g', { class: 'zz-base-buildings' });
  state.base.buildings.forEach((b) => {
    const rx = pad + b.x * cell;
    const ry = pad + b.y * cell;
    bldgLayer.appendChild(drawBuildingOnCell(ns, b.type, rx, ry, cell));
  });
  svg.appendChild(bldgLayer);

  // etiqueta
  svg.appendChild(
    svgEl(
      'text',
      {
        x: pad,
        y: h - 4,
        class: 'zz-base-caption',
      },
      [state.buildMode ? 'Toca una parcela libre' : 'Vuestro refugio']
    )
  );
}
