/**
 * ZZ-152 — Ayuda consultable (§21.3)
 * Solo temas descubiertos/desbloqueados. Sin spoilers de sistemas futuros.
 */
export function ensureHelpMeta(state) {
  if (!state.meta || typeof state.meta !== 'object') state.meta = {};
  if (!Array.isArray(state.meta.helpSeenTopics)) state.meta.helpSeenTopics = [];
  return state.meta;
}

function seen(state, id) {
  return (state.meta?.helpSeenTopics || []).includes(id);
}

function markSeen(state, id) {
  const meta = ensureHelpMeta(state);
  if (!meta.helpSeenTopics.includes(id)) meta.helpSeenTopics.push(id);
}

function unlocked(state, topic) {
  try {
    return !!topic.when(state);
  } catch {
    return false;
  }
}

/** Temas: id, título, cuerpo HTML, condición. Orden = presentación. */
export const HELP_TOPICS = [
  {
    id: 'controls',
    title: 'Controles',
    when: () => true,
    body: 'Construir: elegís tipo → superficies edificables → fantasma + ✓/✕. Avanzar día resuelve el ciclo. Pan / zoom / recentrar: el mundo es mayor que la pantalla.',
  },
  {
    id: 'resources',
    title: 'Recursos del HUD',
    when: () => true,
    body: 'Comida, agua y madera son lo que veis arriba. Metal y medicinas aparecen cuando tenéis stock. La madera también calienta en frío.',
  },
  {
    id: 'staffing',
    title: 'Trabajadores',
    when: (s) =>
      !!s.flags?.onboardingDone ||
      (s.base?.buildings || []).some((b) => (b.workers || 0) > 0) ||
      (s.day || 1) >= 2,
    body: 'Tocá un edificio para asignar gente (+/−). El panel de colonia es solo resumen: la asignación real es en la ficha del edificio.',
  },
  {
    id: 'explore',
    title: 'Exploración',
    when: (s) => !!s.flags?.guideExplored || (s.day || 1) >= 3 || (s.stats?.expeditions || 0) > 0,
    body: 'Tocá un lugar del mapa o usá el explorador. La ficha muestra riesgo, tiempo y botín probable antes de enviar.',
  },
  {
    id: 'recover',
    title: 'Recuperar territorio',
    when: (s) =>
      !!s.flags?.onboardingDone ||
      (s.day || 1) >= 4 ||
      (s.sectors || []).some((x) => x.status === 'recovering' || x.status === 'recovered'),
    body: 'En Más → Recuperar territorio: ampliá sectores colindantes. Luego podréis construir en sus superficies.',
  },
  {
    id: 'brief',
    title: 'Brief diario',
    when: (s) => (s.day || 1) >= 2 || !!s.flags?.onboardingDone,
    body: 'Tras avanzar día veréis comida/agua (y madera en frío) producida · consumida · balance, más hechos del día.',
  },
  {
    id: 'alerts',
    title: 'Alertas',
    when: (s) => (s.day || 1) >= 6 || !!s.pendingAttack || !!s.pendingCatastrophe || !!s.outbreak?.active,
    body: 'La franja superior orienta (no manda). Tocadla para centrar/abrir ficha cuando haya un lugar concreto (p. ej. reparar).',
  },
  {
    id: 'research',
    title: 'Investigación',
    when: (s) =>
      (s.base?.buildings || []).some((b) => (b.type === 'tech_bench' || b.type === 'lab') && b.hp > 0) ||
      (s.research?.unlocked || []).length > 0,
    body: 'Con banco técnico (o lab) investigáis mejoras en Más. Una tech activa; más staff en banco/lab acelera.',
  },
  {
    id: 'defense',
    title: 'Defensa',
    when: (s) =>
      (s.director?.threat || 0) >= 12 ||
      !!s.pendingAttack ||
      (s.base?.buildings || []).some((b) => ['watchtower', 'barricade', 'bunker', 'fence'].includes(b.type)),
    body: 'Amenaza vs defensa en el HUD. Torres, gente en defensa y munición cuentan. Los avisos de hostiles dan tiempo a preparar.',
  },
  {
    id: 'health',
    title: 'Salud y brotes',
    when: (s) =>
      !!s.outbreak?.active ||
      (s.population?.sick || 0) > 0 ||
      (s.base?.buildings || []).some((b) => ['clinic', 'infirmary', 'medkit'].includes(b.type) && b.hp > 0),
    body: 'Camas médicas y staff sanitario contienen brotes. El semáforo resume la presión sanitaria.',
  },
  {
    id: 'contacts',
    title: 'Contactos',
    when: (s) => (s.factions || []).some((f) => f.discovered),
    body: 'Grupos descubiertos por eventos. En Más → Contactos podéis truequear si la relación lo permite. Sin diplomacia 4X.',
  },
  {
    id: 'vehicles',
    title: 'Vehículos',
    when: (s) => (s.vehiclesOwned || []).length > 0 || (s.base?.buildings || []).some((b) => b.type === 'garage' && b.hp > 0),
    body: 'Garaje y techs desbloquean vehículos. En la ficha de expedición elegís a pie o vehículo (fuel/reparación).',
  },
];

export function visibleHelpTopics(state) {
  return HELP_TOPICS.filter((t) => unlocked(state, t));
}

/** Marca vistos al abrir ayuda (consulta voluntaria). */
export function openHelpTopics(state) {
  const topics = visibleHelpTopics(state);
  topics.forEach((t) => markSeen(state, t.id));
  return topics;
}

export function renderHelpHtml(state) {
  const topics = openHelpTopics(state);
  const items = topics
    .map(
      (t) =>
        `<li><strong>${t.title}</strong> — ${t.body}${
          seen(state, t.id) ? '' : ''
        }</li>`
    )
    .join('');
  return {
    html: `<div class="zz-sheet-panel">
      <h2 class="zz-sheet-panel__title">Ayuda</h2>
      <p class="zz-sheet-panel__lead">Solo lo que ya podéis usar. Sin spoilers de lo que aún no ha aparecido.</p>
      <ul class="zz-help-list">${items}</ul>
    </div>`,
    topics,
  };
}
