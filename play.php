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
  <meta name="theme-color" content="#0b0f0c" />
  <title>Jugar · Zona Zero</title>
  <link rel="icon" href="<?= htmlspecialchars($base) ?>assets/cover.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="<?= htmlspecialchars($base) ?>css/game.css?v=5" />
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
      <button type="button" class="zz-btn zz-btn--compact" id="zz-save">Guardar</button>
    </header>

    <p class="zz-howto" id="zz-howto">
      <strong>Cómo jugar:</strong>
      1) Pestaña <em>Gente</em> → elige hasta 3 ·
      2) Pestaña <em>Mapa</em> → toca una zona descubierta ·
      3) <em>Enviar expedición</em> ·
      4) <em>Avanzar día</em> hasta que vuelvan ·
      5) Pestaña <em>Base</em> → construye.
    </p>

    <section class="zz-hud" aria-label="Estado">
      <div class="zz-hud__stat"><span>Día</span><strong id="zz-day">1</strong></div>
      <div class="zz-hud__stat"><span>Población</span><strong id="zz-pop">0</strong></div>
      <div class="zz-hud__stat"><span>Amenaza</span><strong id="zz-threat">0</strong></div>
      <div class="zz-hud__stat"><span>Defensa</span><strong id="zz-defense">0</strong></div>
      <ul class="zz-resources" id="zz-resources"></ul>
    </section>

    <nav class="zz-tabs" aria-label="Vistas">
      <button type="button" class="zz-tab is-active" id="zz-tab-map" data-tab="map">Mapa</button>
      <button type="button" class="zz-tab" id="zz-tab-base" data-tab="base">Base</button>
      <button type="button" class="zz-tab" id="zz-tab-people" data-tab="people">Gente</button>
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
        <p class="zz-hint">Elige un edificio y toca una parcela libre.</p>
      </section>

      <section class="zz-panel" data-panel="people">
        <div class="zz-people" id="zz-people"></div>
        <p class="zz-hint">Toca para seleccionar equipo de expedición (máx. 3).</p>
      </section>
    </main>

    <aside class="zz-log-wrap">
      <h2>Diario</h2>
      <ul class="zz-log" id="zz-log"></ul>
    </aside>

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
  </div>
  <div id="zz-toast" class="zz-toast" hidden></div>
  <script type="module">
    import { bootGame } from './js/main.js?v=5';
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
