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
  <meta name="theme-color" content="#12100c" />
  <title>Zona Zero</title>
  <link rel="icon" href="<?= htmlspecialchars($base) ?>assets/cover.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="<?= htmlspecialchars($base) ?>css/game.css?v=40" />
  <link rel="stylesheet" href="<?= htmlspecialchars($base) ?>css/hub.css?v=40" />
</head>
<body class="zz-body zz-body--hub">
  <div id="zz-hub-boot" class="zz-boot">Cargando…</div>
  <div id="zz-hub" class="zz-hub" hidden>
    <div class="zz-hub__atmosphere" aria-hidden="true"></div>
    <header class="zz-hub__top">
      <a class="zz-back" href="/juegos/">← Juegos</a>
      <p class="zz-user">Hola, <strong id="zz-user"><?= htmlspecialchars((string) ($user['nombre'] ?? 'Jugador')) ?></strong></p>
    </header>
    <main class="zz-hub__hero">
      <p class="zz-hub__kicker">Intocables · Supervivencia</p>
      <h1 class="zz-hub__brand">Zona Zero</h1>
      <p class="zz-hub__tag">El silencio después del colapso. Gestiona, explora, sobrevive.</p>
      <div class="zz-hub__actions" id="zz-hub-actions" aria-label="Empezar"></div>
    </main>
  </div>
  <script type="module">
    import { bootHub } from './js/main.js?v=40';
    bootHub().catch(() => {});
  </script>
</body>
</html>
