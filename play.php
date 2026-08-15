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
  <link rel="stylesheet" href="<?= htmlspecialchars($base) ?>css/game.css?v=16" />
  <link rel="stylesheet" href="<?= htmlspecialchars($base) ?>css/world.css?v=16" />
</head>
<body class="zz-body zz-body--play zz-body--world">
  <div id="zz-boot" class="zz-boot">Preparando partida…</div>
  <div id="zz-app" class="zz-world" hidden>
    <header class="zz-world-top">
      <a class="zz-back" data-zz-back href="<?= htmlspecialchars($base) ?>">Slots</a>
      <div class="zz-world-top__mid">
        <strong id="zz-colony">Zona Zero</strong>
        <span id="zz-day-label">Día 1</span>
      </div>
      <div class="zz-world-top__actions">
        <button type="button" class="zz-btn zz-btn--compact zz-sound" id="zz-sound" aria-pressed="true">Audio</button>
        <button type="button" class="zz-btn zz-btn--compact" id="zz-save">Guardar</button>
      </div>
    </header>

    <details class="zz-objective-fold" id="zz-objective-fold">
      <summary>Misión</summary>
      <p class="zz-objective" id="zz-objective" hidden></p>
    </details>
    <p class="zz-mode-banner" id="zz-mode-banner" hidden></p>

    <!-- HUD compacto: una franja -->
    <section class="zz-chip-hud zz-chip-hud--dense" aria-label="Estado">
      <button type="button" class="zz-chip-hud__pop" id="zz-open-pop" title="Población">
        <span class="zz-ico zz-ico--pop" aria-hidden="true"></span>
        <strong id="zz-pop">0/0</strong>
      </button>
      <ul class="zz-chip-hud__res" id="zz-resources"></ul>
      <div class="zz-chip-hud__meta">
        <span id="zz-era" class="zz-chip-hud__era">—</span>
        <span id="zz-weather" class="zz-weather" data-weather="clear" hidden>—</span>
        <span class="zz-chip-hud__m" title="Estabilidad"><i></i><strong id="zz-stability">0</strong></span>
        <span class="zz-chip-hud__m zz-chip-hud__m--threat" title="Amenaza"><i></i><strong id="zz-threat">0</strong></span>
        <span class="zz-chip-hud__m zz-chip-hud__m--def" title="Defensa"><i></i><strong id="zz-defense">0</strong></span>
      </div>
    </section>

    <main class="zz-world-stage">
      <div class="zz-world-map-wrap">
        <div id="zz-recover-banner" class="zz-recover-banner" hidden>Recuperación</div>
        <div class="zz-map-zoom" aria-label="Zoom">
          <button type="button" id="zz-zoom-out" title="Alejar">−</button>
          <button type="button" id="zz-zoom-in" title="Acercar">+</button>
        </div>
        <svg id="zz-map" class="zz-map" viewBox="0 0 100 100" role="img" aria-label="Zona Zero"></svg>
      </div>
      <div class="zz-explorer-rail" id="zz-explorer-rail" aria-label="Exploradores"></div>
    </main>

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
  <script type="module">
    import { bootGame } from './js/main.js?v=16';
    const params = new URLSearchParams(location.search);
    bootGame({
      slot: <?= (int) $slot ?>,
      mode: <?= $isNew ? "'new'" : "'load'" ?>,
      name: <?= json_encode($name, JSON_UNESCAPED_UNICODE) ?>,
    }).catch((e) => {
      const boot = document.getElementById('zz-boot');
      if (boot) boot.textContent = 'Error: ' + (e && e.message ? e.message : e);
      console.error(e);
    });
  </script>
</body>
</html>
