<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/zz-auth.php';
zz_page_require_login();

$slot = max(1, min(3, (int) ($_GET['slot'] ?? 1)));
$isNew = isset($_GET['new']) && (string) $_GET['new'] === '1';
$name = trim((string) ($_GET['name'] ?? 'Refugio 0'));
if ($name === '') {
    $name = 'Refugio 0';
}
$base = zz_public_base();
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" />
  <meta name="theme-color" content="#1a1612" />
  <title>Jugar · Zona Zero</title>
  <link rel="icon" href="<?= htmlspecialchars($base) ?>assets/cover.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="<?= htmlspecialchars($base) ?>css/game.css?v=9" />
</head>
<body class="zz-body zz-body--play">
  <div id="zz-boot" class="zz-boot">Preparando partida…</div>
  <div id="zz-app" class="zz-app" hidden>
    <header class="zz-top">
      <a class="zz-back" data-zz-back href="<?= htmlspecialchars($base) ?>">Slots</a>
      <div class="zz-top__center">
        <strong id="zz-colony">Zona Zero</strong>
        <span id="zz-save-state" class="zz-save-state">Listo</span>
      </div>
      <div class="zz-top__actions">
        <button type="button" class="zz-btn zz-btn--compact zz-sound" id="zz-sound" aria-pressed="true">Sonido</button>
        <button type="button" class="zz-btn zz-btn--compact" id="zz-save">Guardar</button>
      </div>
    </header>

    <p class="zz-coach" id="zz-coach" hidden>
      <span id="zz-coach-text"></span>
      <button type="button" id="zz-coach-dismiss" aria-label="Cerrar">×</button>
    </p>

    <section class="zz-hud" aria-label="Estado">
      <div class="zz-hud__row">
        <div class="zz-hud__pill">
          <span>Día</span>
          <strong id="zz-day">1</strong>
        </div>
        <div class="zz-hud__pill zz-hud__pill--era">
          <span>Era</span>
          <strong id="zz-era">—</strong>
        </div>
        <div class="zz-hud__pop">
          <span class="zz-hud__pop-ico" aria-hidden="true"></span>
          <div>
            <strong id="zz-pop">0</strong>
            <small>Población / camas</small>
          </div>
        </div>
        <div class="zz-weather" id="zz-weather" data-weather="clear" hidden>Despejado</div>
        <div class="zz-hud__combat" aria-label="Estabilidad, amenaza y defensa">
          <div class="zz-hud__meter zz-hud__meter--stab">
            <span>Estab.</span>
            <span></span>
            <strong id="zz-stability">0</strong>
          </div>
          <div class="zz-hud__meter zz-hud__meter--threat">
            <span>Amenaza</span>
            <span></span>
            <strong id="zz-threat">0</strong>
          </div>
          <div class="zz-hud__meter zz-hud__meter--def">
            <span>Defensa</span>
            <span></span>
            <strong id="zz-defense">0</strong>
          </div>
        </div>
      </div>
      <ul class="zz-resources" id="zz-resources"></ul>
    </section>

    <nav class="zz-tabs zz-tabs--dock" aria-label="Vistas">
      <button type="button" class="zz-tab is-active" id="zz-tab-map" data-tab="map">Mapa</button>
      <button type="button" class="zz-tab" id="zz-tab-base" data-tab="base">Base</button>
      <button type="button" class="zz-tab" id="zz-tab-people" data-tab="people">Gente</button>
      <button type="button" class="zz-tab" id="zz-tab-progress" data-tab="progress">Progreso</button>
      <button type="button" class="zz-tab" id="zz-tab-more" data-tab="more">Más</button>
    </nav>

    <main class="zz-main">
      <section class="zz-panel is-active" data-panel="map">
        <div class="zz-map-wrap">
          <svg id="zz-map" class="zz-map" viewBox="0 0 100 100" role="img" aria-label="Mapa de la ciudad"></svg>
        </div>
        <div id="zz-zone-panel" class="zz-side-card"></div>
      </section>

      <section class="zz-panel" data-panel="base">
        <div class="zz-base-wrap">
          <svg id="zz-base" class="zz-base" role="img" aria-label="Asentamiento"></svg>
        </div>
        <div class="zz-build-bar" id="zz-build-bar"></div>
        <p class="zz-hint" id="zz-build-hint">Elige un edificio y toca el terreno libre.</p>
      </section>

      <section class="zz-panel" data-panel="people">
        <div id="zz-people-filters" class="zz-people-filters" aria-label="Filtros"></div>
        <div class="zz-people" id="zz-people"></div>
        <p class="zz-hint">Toca para formar el equipo de expedición. Usa «Sugerir equipo».</p>
      </section>

      <section class="zz-panel" data-panel="progress">
        <div id="zz-progress-panel" class="zz-progress-panel"></div>
      </section>

      <section class="zz-panel" data-panel="more">
        <div id="zz-more" class="zz-more"></div>
      </section>
    </main>

    <aside class="zz-log-wrap">
      <h2>Diario</h2>
      <ul class="zz-log" id="zz-log"></ul>
    </aside>

    <div id="zz-pulse-layer" class="zz-pulse-layer" aria-hidden="true"></div>
    <div id="zz-event-card" class="zz-event-card" hidden></div>
    <div id="zz-attack-card" class="zz-attack-card" hidden></div>

    <footer class="zz-dock">
      <button type="button" class="zz-btn zz-btn--primary zz-btn--wide" id="zz-advance">Avanzar día</button>
    </footer>

    <div id="zz-defeat" class="zz-defeat" hidden>
      <div class="zz-defeat__card">
        <h2>Derrota</h2>
        <p id="zz-defeat-msg"></p>
        <a class="zz-btn zz-btn--primary" href="<?= htmlspecialchars($base) ?>">Volver a slots</a>
      </div>
    </div>

    <div id="zz-victory" class="zz-victory" hidden>
      <div class="zz-victory__card">
        <h2>Victoria</h2>
        <p>Zona Zero está estabilizada. Podéis continuar en modo endless.</p>
        <button type="button" class="zz-btn zz-btn--primary" id="zz-endless">Continuar endless</button>
      </div>
    </div>

    <div id="zz-choice-modal" class="zz-choice" hidden>
      <div class="zz-choice__card">
        <div class="zz-choice__head" id="zz-choice-head"></div>
        <h2 id="zz-choice-title">Decisión</h2>
        <p id="zz-choice-text"></p>
        <div id="zz-choice-actions" class="zz-choice__actions"></div>
      </div>
    </div>
  </div>
  <div id="zz-toast" class="zz-toast" hidden></div>
  <script type="module">
    import { bootGame } from './js/main.js?v=9';
    bootGame({
      slot: <?= (int) $slot ?>,
      mode: <?= $isNew ? "'new'" : "'load'" ?>,
      name: <?= json_encode($name, JSON_UNESCAPED_UNICODE) ?>
    }).catch((err) => {
      const boot = document.getElementById('zz-boot');
      const app = document.getElementById('zz-app');
      if (app) app.setAttribute('hidden', '');
      if (boot) {
        boot.removeAttribute('hidden');
        boot.innerHTML =
          '<p><strong>Error al iniciar</strong></p><p>' +
          String(err && err.message ? err.message : err) +
          '</p><p><a class="zz-btn zz-btn--primary" href="<?= htmlspecialchars($base) ?>">Volver a slots</a></p>';
      }
    });
  </script>
</body>
</html>
