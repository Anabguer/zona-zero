<?php
declare(strict_types=1);

/**
 * Auth de página (HTML) reutilizando Intocables.
 */

function zz_htdocs_root(): string
{
    // .../juegos/zona-zero/includes → zona-zero → juegos → htdocs
    return dirname(__DIR__, 3);
}

function zz_find_includes_dir(): ?string
{
    $htdocs = zz_htdocs_root();
    $candidates = [
        $htdocs . DIRECTORY_SEPARATOR . 'intocables' . DIRECTORY_SEPARATOR . 'includes',
        $htdocs . DIRECTORY_SEPARATOR . 'includes',
    ];
    foreach ($candidates as $dir) {
        if (is_file($dir . DIRECTORY_SEPARATOR . 'auth.php')) {
            return $dir;
        }
    }
    return null;
}

function zz_auth_boot(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $dir = zz_find_includes_dir();
    if ($dir === null) {
        http_response_code(500);
        echo 'Auth Intocables no disponible.';
        exit;
    }
    require_once $dir . DIRECTORY_SEPARATOR . 'database.php';
    require_once $dir . DIRECTORY_SEPARATOR . 'auth.php';
    $done = true;
}

function zz_login_url(): string
{
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $isLocal = (
        $host === 'localhost'
        || strpos($host, '127.0.0.1') !== false
        || strpos($host, 'localhost') !== false
    );
    return $isLocal ? '/intocables/login.php' : '/login.php';
}

function zz_page_require_login(): void
{
    zz_auth_boot();
    if (!isLoggedIn()) {
        $here = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http')
            . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost')
            . ($_SERVER['REQUEST_URI'] ?? '/juegos/zona-zero/');
        header('Location: ' . zz_login_url() . '?redirect=' . rawurlencode($here));
        exit;
    }
}

function zz_page_user(): array
{
    zz_auth_boot();
    return getCurrentUser() ?: [];
}

function zz_public_base(): string
{
    return '/juegos/zona-zero/';
}
