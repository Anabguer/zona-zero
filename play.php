<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/zz-auth.php';
zz_page_require_login();

$isNew = isset($_GET['new']) && (string) $_GET['new'] === '1';
$clear = isset($_GET['clear']) && (string) $_GET['clear'] === '1';
$fromIntro = isset($_GET['intro']) && (string) $_GET['intro'] === '1';
$name = trim((string) ($_GET['name'] ?? 'Refugio Norte'));
if ($name === '') {
    $name = 'Refugio Norte';
}
$base = zz_public_base();
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" />
  <meta name="theme-color" content="#12100c" />
  <title>Jugar · Zona Zero</title>
  <link rel="icon" href="<?= htmlspecialchars($base) ?>assets/cover.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="<?= htmlspecialchars($base) ?>css/game.css?v=23" />
  <link rel="stylesheet" href="<?= htmlspecialchars($base) ?>css/world.css?v=23" />
</head>
<body class="zz-body zz-body--play zz-body--world zz-body--v13">
  <div id="zz-boot" class="zz-boot">Preparando partida…</div>
  <div id="zz-app" class="zz-world zz-world--overlay" hidden>
    <!-- MUNDO: protagonista full-bleed -->
    <main class="zz-world-stage" id="zz-stage">
      <div class="zz-world-map-wrap" id="zz-map-wrap">
        <div id="zz-recover-banner" class="zz-recover-banner" hidden>Recuperación</div>
        <div class="zz-map-zoom" aria-label="Zoom">
          <button type="button" id="zz-zoom-out" title="Alejar">−</button>
          <button type="button" id="zz-recenter" title="Recentrar">⌂</button>
          <button type="button" id="zz-zoom-in" title="Acercar">+</button>
        </div>
        <svg id="zz-map" class="zz-map" viewBox="0 0 100 100" role="img" aria-label="Zona Zero"></svg>
      </div>
    </main>

    <!-- HUD overlay superior -->
    <header class="zz-hud" id="zz-hud">
      <div class="zz-hud__row zz-hud__row--top">
        <a class="zz-back" data-zz-back href="<?= htmlspecialchars($base) ?>">Inicio</a>
        <div class="zz-hud__title">
          <strong id="zz-colony">Zona Zero</strong>
          <span id="zz-day-label">Día 1</span>
        </div>
        <div class="zz-hud__actions">
          <button type="button" class="zz-btn zz-btn--ghost zz-btn--icon" id="zz-help" title="Ayuda">?</button>
          <button type="button" class="zz-btn zz-btn--ghost zz-btn--icon" id="zz-sound" aria-pressed="true" title="Sonido">♪</button>
          <button type="button" class="zz-btn zz-btn--ghost zz-btn--icon" id="zz-save" title="Guardar">💾</button>
        </div>
      </div>
      <div class="zz-hud__row zz-hud__row--stats">
        <button type="button" class="zz-hud__pop" id="zz-open-pop" title="Población actual / plazas de vivienda">
          <img src="<?= htmlspecialchars($base) ?>assets/art/ui/pop.webp" alt="" width="18" height="18" />
          <span class="zz-hud__pop-wrap">
            <strong id="zz-pop">0/0</strong>
            <em class="zz-hud__pop-label" id="zz-pop-label">hab.</em>
          </span>
        </button>
        <ul class="zz-hud__res" id="zz-resources" aria-label="Recursos"></ul>
        <div class="zz-hud__threat" title="Amenaza y defensa" hidden>
          <span class="zz-hud__pill zz-hud__pill--threat" title="Amenaza"><strong id="zz-threat">0</strong></span>
          <span class="zz-hud__pill zz-hud__pill--def" title="Defensa"><strong id="zz-defense">0</strong></span>
        </div>
      </div>
      <button type="button" class="zz-mission" id="zz-mission" hidden>
        <span class="zz-mission__ico" aria-hidden="true">◎</span>
        <span id="zz-mission-text">—</span>
      </button>
      <p class="zz-mode-banner" id="zz-mode-banner" hidden></p>
    </header>

    <!-- Coach / onboarding -->
    <div id="zz-coach" class="zz-coach-card" hidden>
      <p id="zz-coach-text"></p>
      <button type="button" class="zz-btn zz-btn--primary zz-btn--wide" id="zz-coach-next">Continuar</button>
    </div>

    <!-- Exploradores: rail compacto overlay -->
    <div class="zz-explorer-rail" id="zz-explorer-rail" aria-label="Exploradores"></div>

    <!-- Sheet contextual (edificio / zona / construir) -->
    <aside id="zz-sheet" class="zz-sheet" hidden>
      <div class="zz-sheet__handle" aria-hidden="true"></div>
      <button type="button" class="zz-sheet__close" id="zz-sheet-close" aria-label="Cerrar">×</button>
      <div id="zz-sheet-body" class="zz-sheet__body"></div>
    </aside>

    <div id="zz-pulse-layer" class="zz-pulse-layer" aria-hidden="true"></div>
    <div id="zz-event-card" class="zz-event-card" hidden></div>
    <div id="zz-attack-card" class="zz-attack-card" hidden></div>
    <div id="zz-day-brief" class="zz-day-brief" hidden></div>

    <footer class="zz-world-dock">
      <button type="button" class="zz-btn zz-btn--ghost zz-btn--dock-sec" id="zz-open-build">Construir</button>
      <button type="button" class="zz-btn zz-btn--primary zz-btn--wide" id="zz-advance">Avanzar día</button>
      <button type="button" class="zz-btn zz-btn--ghost zz-btn--dock-sec" id="zz-open-more">Más</button>
    </footer>

    <div id="zz-defeat" class="zz-defeat" hidden>
      <div class="zz-defeat__card"><h2>Derrota</h2><p id="zz-defeat-msg"></p><a class="zz-btn zz-btn--primary" data-zz-back href="<?= htmlspecialchars($base) ?>">Volver</a></div>
    </div>
    <div id="zz-victory" class="zz-victory" hidden>
      <div class="zz-victory__card">
        <h2>Victoria</h2>
        <p>Zona Zero está estabilizada.</p>
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
  <!-- hidden compatibility targets -->
  <span id="zz-era" hidden></span>
  <span id="zz-weather" hidden></span>
  <span id="zz-stability" hidden></span>
  <details id="zz-objective-fold" hidden><summary></summary><p id="zz-objective"></p></details>
  <script type="module">
    import { bootGame } from './js/main.js?v=23';
    bootGame({
      mode: <?= $isNew ? "'new'" : "'load'" ?>,
      name: <?= json_encode($name, JSON_UNESCAPED_UNICODE) ?>,
      clearExisting: <?= $clear ? 'true' : 'false' ?>,
      fromIntro: <?= $fromIntro ? 'true' : 'false' ?>,
    }).catch((e) => {
      const boot = document.getElementById('zz-boot');
      if (boot) boot.textContent = 'Error: ' + (e?.message || e);
      console.error(e);
    });
  </script>
</body>
</html>
