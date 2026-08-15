<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/zz-auth.php';
zz_page_require_login();
$user = zz_page_user();
$base = zz_public_base();
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#1a1612" />
  <title>Zona Zero</title>
  <link rel="icon" href="<?= htmlspecialchars($base) ?>assets/cover.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="<?= htmlspecialchars($base) ?>css/game.css?v=12" />
</head>
<body class="zz-body zz-body--hub">
  <div id="zz-hub-boot" class="zz-boot">Cargando slots…</div>
  <div id="zz-hub" class="zz-hub" hidden>
    <header class="zz-hub__head">
      <a class="zz-back" href="/juegos/">← Juegos</a>
      <div class="zz-hub__brand">
        <img src="<?= htmlspecialchars($base) ?>assets/cover.svg" width="72" height="72" alt="" />
        <div>
          <p class="zz-kicker">Intocables · Juegos</p>
          <h1>Zona Zero</h1>
          <p class="zz-lead">El silencio después del colapso. Gestiona, explora, sobrevive.</p>
        </div>
      </div>
      <p class="zz-user">Hola, <strong id="zz-user"><?= htmlspecialchars((string) ($user['nombre'] ?? 'Jugador')) ?></strong></p>
    </header>
    <p class="zz-howto">Elige un slot vacío para <strong>Nueva partida</strong>, o <strong>Continuar</strong> una guardada. Tienes 3 slots.</p>
    <section class="zz-slots" id="zz-slots" aria-label="Slots de partida"></section>
  </div>
  <script type="module">
    import { bootHub } from './js/main.js?v=12';
    bootHub().catch((err) => {
      const el = document.getElementById('zz-hub-boot');
      const hub = document.getElementById('zz-hub');
      if (hub) hub.setAttribute('hidden', '');
      if (el) {
        el.removeAttribute('hidden');
        el.innerHTML =
          '<p><strong>Error al iniciar</strong></p><p>' +
          String(err && err.message ? err.message : err) +
          '</p><button type="button" class="zz-btn zz-btn--primary" onclick="location.reload()">Reintentar</button>';
      }
    });
  </script>
  <script>
    window.addEventListener('error', function (ev) {
      var el = document.getElementById('zz-hub-boot');
      if (el && String(el.textContent || '').indexOf('Cargando') === 0) {
        el.removeAttribute('hidden');
        el.textContent = 'Error JS: ' + (ev.message || 'módulo no cargó');
      }
    });
  </script>
</body>
</html>
