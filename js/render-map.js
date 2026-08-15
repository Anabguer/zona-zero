/** Render mapa ciudad SVG */
const STATE_CLASS = {
  unknown: 'zz-zone--unknown',
  discovered: 'zz-zone--discovered',
  controlled: 'zz-zone--controlled',
};

export function renderMap(svg, state, { onSelectZone } = {}) {
  if (!svg) return;
  const ns = 'http://www.w3.org/2000/svg';
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const bg = document.createElementNS(ns, 'rect');
  bg.setAttribute('x', '0');
  bg.setAttribute('y', '0');
  bg.setAttribute('width', '100');
  bg.setAttribute('height', '100');
  bg.setAttribute('class', 'zz-map-bg');
  svg.appendChild(bg);

  // Niebla / grid urbano sutil
  for (let i = 0; i < 6; i++) {
    const line = document.createElementNS(ns, 'path');
    const x = 10 + i * 15;
    line.setAttribute('d', `M${x} 5 V95`);
    line.setAttribute('class', 'zz-map-grid');
    svg.appendChild(line);
  }
  for (let i = 0; i < 5; i++) {
    const line = document.createElementNS(ns, 'path');
    const y = 12 + i * 16;
    line.setAttribute('d', `M5 ${y} H95`);
    line.setAttribute('class', 'zz-map-grid');
    svg.appendChild(line);
  }

  // Conexiones
  state.zones.forEach((z) => {
    (z.neighbors || []).forEach((nid) => {
      const n = state.zones.find((x) => x.id === nid);
      if (!n || z.id > n.id) return;
      const path = document.createElementNS(ns, 'line');
      path.setAttribute('x1', z.x);
      path.setAttribute('y1', z.y);
      path.setAttribute('x2', n.x);
      path.setAttribute('y2', n.y);
      path.setAttribute('class', 'zz-map-link');
      svg.appendChild(path);
    });
  });

  state.zones.forEach((z) => {
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('class', `zz-zone ${STATE_CLASS[z.state] || ''} ${state.selectedZoneId === z.id ? 'is-selected' : ''}`);
    g.setAttribute('data-id', z.id);
    g.style.cursor = z.state === 'unknown' ? 'default' : 'pointer';

    if (z.state === 'unknown') {
      const fog = document.createElementNS(ns, 'circle');
      fog.setAttribute('cx', z.x);
      fog.setAttribute('cy', z.y);
      fog.setAttribute('r', z.r);
      fog.setAttribute('class', 'zz-zone-fog');
      g.appendChild(fog);
      const q = document.createElementNS(ns, 'text');
      q.setAttribute('x', z.x);
      q.setAttribute('y', z.y + 1.5);
      q.setAttribute('text-anchor', 'middle');
      q.setAttribute('class', 'zz-zone-q');
      q.textContent = '?';
      g.appendChild(q);
    } else {
      const building = document.createElementNS(ns, 'path');
      const s = z.r * 0.55;
      building.setAttribute(
        'd',
        `M${z.x - s} ${z.y + s * 0.7} V${z.y - s * 0.2} L${z.x} ${z.y - s} L${z.x + s} ${z.y - s * 0.2} V${z.y + s * 0.7} Z`
      );
      building.setAttribute('class', 'zz-zone-building');
      g.appendChild(building);

      const ring = document.createElementNS(ns, 'circle');
      ring.setAttribute('cx', z.x);
      ring.setAttribute('cy', z.y);
      ring.setAttribute('r', z.r);
      ring.setAttribute('class', 'zz-zone-ring');
      g.appendChild(ring);

      const label = document.createElementNS(ns, 'text');
      label.setAttribute('x', z.x);
      label.setAttribute('y', z.y + z.r + 5);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('class', 'zz-zone-label');
      label.textContent = z.name;
      g.appendChild(label);
    }

    if (z.state !== 'unknown') {
      g.addEventListener('click', (ev) => {
        ev.preventDefault();
        onSelectZone && onSelectZone(z.id);
      });
    }
    svg.appendChild(g);
  });
}
