/**
 * Mapa de ciudad — sectores urbanos SVG (no diagrama de nodos).
 */
import { svgEl } from './icons.js';

const STATE_CLASS = {
  unknown: 'zz-zone--unknown',
  discovered: 'zz-zone--discovered',
  controlled: 'zz-zone--controlled',
  hostile: 'zz-zone--hostile',
};

/** Siluetas de manzana por id (offsets relativos al centro) */
function sectorShape(z) {
  const r = z.r * 0.92;
  // polígono irregular tipo manzana urbana
  const pts = [
    [z.x - r * 0.85, z.y - r * 0.55],
    [z.x - r * 0.2, z.y - r * 0.95],
    [z.x + r * 0.7, z.y - r * 0.7],
    [z.x + r * 0.95, z.y + r * 0.15],
    [z.x + r * 0.45, z.y + r * 0.9],
    [z.x - r * 0.55, z.y + r * 0.85],
    [z.x - r * 0.95, z.y + r * 0.1],
  ];
  return pts.map((p) => p.join(',')).join(' ');
}

function addCityBackdrop(svg) {
  // cielo / horizonte polvoriento
  const sky = svgEl('defs');
  const grad = svgEl('linearGradient', { id: 'zzMapSky', x1: '0', y1: '0', x2: '0', y2: '1' });
  grad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#2a241c' }));
  grad.appendChild(svgEl('stop', { offset: '55%', 'stop-color': '#1a1612' }));
  grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#12100e' }));
  sky.appendChild(grad);
  const haze = svgEl('radialGradient', { id: 'zzMapHaze', cx: '50%', cy: '40%', r: '60%' });
  haze.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#3a3020', 'stop-opacity': '0.35' }));
  haze.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#12100e', 'stop-opacity': '0' }));
  sky.appendChild(haze);
  svg.appendChild(sky);

  svg.appendChild(svgEl('rect', { width: 100, height: 100, fill: 'url(#zzMapSky)', class: 'zz-map-bg' }));
  svg.appendChild(svgEl('rect', { width: 100, height: 100, fill: 'url(#zzMapHaze)' }));

  // calles principales
  const roads = svgEl('g', { class: 'zz-map-roads' });
  [
    'M5 48 H95',
    'M5 62 H95',
    'M48 5 V95',
    'M32 8 V92',
    'M68 8 V92',
    'M8 28 H92',
    'M12 78 H88',
  ].forEach((d) => {
    roads.appendChild(svgEl('path', { d, class: 'zz-map-road' }));
  });
  svg.appendChild(roads);

  // solares / ruinas de fondo
  const ruins = svgEl('g', { class: 'zz-map-ruins', 'aria-hidden': 'true' });
  const blocks = [
    [8, 8, 14, 10],
    [78, 10, 12, 9],
    [10, 84, 16, 8],
    [80, 82, 11, 9],
    [40, 6, 10, 7],
  ];
  blocks.forEach(([x, y, w, h]) => {
    ruins.appendChild(svgEl('rect', { x, y, width: w, height: h, class: 'zz-map-ruin' }));
  });
  // vegetación muerta
  [[15, 55], [88, 40], [55, 90], [22, 18]].forEach(([x, y]) => {
    ruins.appendChild(
      svgEl('circle', { cx: x, cy: y, r: 2.2, class: 'zz-map-scrub' })
    );
  });
  svg.appendChild(ruins);
}

function buildingSilhouettes(g, z) {
  const count = z.state === 'controlled' ? 4 : z.state === 'discovered' ? 3 : 2;
  const baseY = z.y + z.r * 0.15;
  for (let i = 0; i < count; i++) {
    const bw = z.r * (0.22 + (i % 3) * 0.06);
    const bh = z.r * (0.35 + ((i * 2) % 4) * 0.08);
    const bx = z.x - z.r * 0.45 + i * z.r * 0.28;
    const by = baseY - bh;
    g.appendChild(
      svgEl('rect', {
        x: bx,
        y: by,
        width: bw,
        height: bh,
        class: 'zz-zone-sil',
        rx: 0.4,
      })
    );
    if (z.state === 'controlled' && i === 1) {
      g.appendChild(
        svgEl('rect', {
          x: bx + bw * 0.25,
          y: by + bh * 0.35,
          width: bw * 0.2,
          height: bh * 0.2,
          class: 'zz-zone-window',
        })
      );
    }
  }
}

export function renderMap(svg, state, { onSelectZone } = {}) {
  if (!svg) return;
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  addCityBackdrop(svg);

  // caminos entre zonas (calles secundarias)
  const links = svgEl('g', { class: 'zz-map-links' });
  state.zones.forEach((z) => {
    (z.neighbors || []).forEach((nid) => {
      const n = state.zones.find((x) => x.id === nid);
      if (!n || z.id > n.id) return;
      links.appendChild(
        svgEl('line', {
          x1: z.x,
          y1: z.y,
          x2: n.x,
          y2: n.y,
          class: 'zz-map-link',
        })
      );
    });
  });
  svg.appendChild(links);

  // sectores
  const layer = svgEl('g', { class: 'zz-map-zones' });
  state.zones.forEach((z) => {
    const g = svgEl('g', {
      class: `zz-zone ${STATE_CLASS[z.state] || ''} ${state.selectedZoneId === z.id ? 'is-selected' : ''} ${z.risk >= 0.45 ? 'is-risky' : ''}`,
      'data-id': z.id,
    });
    g.style.cursor = z.state === 'unknown' ? 'default' : 'pointer';

    const poly = svgEl('polygon', {
      points: sectorShape(z),
      class: 'zz-zone-poly',
    });
    g.appendChild(poly);

    if (z.state === 'controlled') {
      g.appendChild(
        svgEl('polygon', {
          points: sectorShape(z),
          class: 'zz-zone-halo',
        })
      );
    }

    if (z.state === 'hostile') {
      g.appendChild(
        svgEl('path', {
          d: `M${z.x} ${z.y - z.r * 0.75} l2.2 4.2 h-4.4 z`,
          class: 'zz-zone-danger',
        })
      );
    }

    if (z.state === 'unknown') {
      g.appendChild(
        svgEl('polygon', {
          points: sectorShape(z),
          class: 'zz-zone-fog',
        })
      );
      g.appendChild(
        svgEl('text', {
          x: z.x,
          y: z.y + 1.5,
          'text-anchor': 'middle',
          class: 'zz-zone-q',
        }, ['?'])
      );
    } else {
      buildingSilhouettes(g, z);
      if (z.risk >= 0.45 && z.state === 'discovered') {
        g.appendChild(
          svgEl('path', {
            d: `M${z.x} ${z.y - z.r * 0.75} l2.2 4.2 h-4.4 z`,
            class: 'zz-zone-danger',
          })
        );
      }
      g.appendChild(
        svgEl('text', {
          x: z.x,
          y: z.y + z.r * 0.95 + 3.5,
          'text-anchor': 'middle',
          class: 'zz-zone-label',
        }, [z.name])
      );
      if (z.state === 'controlled') {
        g.appendChild(
          svgEl('circle', {
            cx: z.x,
            cy: z.y - z.r * 0.72,
            r: 2.2,
            class: 'zz-zone-beacon',
          })
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
  });
  svg.appendChild(layer);

  // leyenda compacta
  const legend = svgEl('g', { class: 'zz-map-legend', transform: 'translate(3,88)' });
  [
    ['#3d5c42', 'Control'],
    ['#8a6a38', 'Conocido'],
    ['#a05030', 'Hostil'],
    ['#2a2826', 'Niebla'],
  ].forEach(([c, t], i) => {
    legend.appendChild(svgEl('rect', { x: i * 24, y: 0, width: 4, height: 4, rx: 0.6, fill: c }));
    legend.appendChild(
      svgEl('text', { x: i * 24 + 6, y: 3.6, class: 'zz-map-legend-t' }, [t])
    );
  });
  svg.appendChild(legend);
}
