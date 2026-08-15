<?php
declare(strict_types=1);

/**
 * Bootstrap Zona Zero: auth + PDO de Intocables (local o Hostalia).
 * No usa getDBConnection() (hace die() HTML); conecta con JSON de error.
 */

const ZZ_SAVE_VERSION = 2;

function zz_send_json_headers(): void
{
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: no-store');
    }
}

function zz_find_intocables_includes(): ?string
{
    // .../juegos/zona-zero/api → zona-zero → juegos → htdocs
    $htdocs = dirname(__DIR__, 3);
    $candidates = [
        $htdocs . DIRECTORY_SEPARATOR . 'intocables' . DIRECTORY_SEPARATOR . 'includes',
        $htdocs . DIRECTORY_SEPARATOR . 'includes',
    ];
    foreach ($candidates as $dir) {
        if (is_file($dir . DIRECTORY_SEPARATOR . 'auth.php') && is_file($dir . DIRECTORY_SEPARATOR . 'database.php')) {
            return $dir;
        }
    }
    return null;
}

function zz_bootstrap(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    zz_send_json_headers();
    $inc = zz_find_intocables_includes();
    if ($inc === null) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'auth_includes_missing']);
        exit;
    }
    require_once $inc . DIRECTORY_SEPARATOR . 'database.php';
    require_once $inc . DIRECTORY_SEPARATOR . 'auth.php';
    $done = true;
}

function zz_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    zz_bootstrap();
    if (!defined('DB_HOST') || !defined('DB_NAME') || !defined('DB_USER')) {
        zz_respond(['ok' => false, 'error' => 'db_config_missing'], 500);
    }
    try {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            defined('DB_PASSWORD') ? DB_PASSWORD : '',
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_CASE => PDO::CASE_LOWER,
                PDO::ATTR_TIMEOUT => 8,
            ]
        );
    } catch (Throwable $e) {
        error_log('Zona Zero DB: ' . $e->getMessage());
        zz_respond(['ok' => false, 'error' => 'db_connection'], 500);
    }
    return $pdo;
}

function zz_require_user(): array
{
    zz_bootstrap();
    if (!isLoggedIn()) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'auth_required', 'login' => zz_login_url()], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $user = getCurrentUser();
    if (!$user || empty($user['id'])) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'auth_required', 'login' => zz_login_url()], JSON_UNESCAPED_UNICODE);
        exit;
    }
    return $user;
}

function zz_login_url(): string
{
    $host = $_SERVER['HTTP_HOST'] ?? 'intocables13.com';
    $isLocal = (
        $host === 'localhost'
        || strpos($host, '127.0.0.1') !== false
        || strpos($host, 'localhost') !== false
    );
    if ($isLocal) {
        return '/intocables/login.php';
    }
    return '/login.php';
}

function zz_json_input(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function zz_respond(array $payload, int $code = 200): void
{
    zz_send_json_headers();
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function zz_ensure_schema(PDO $pdo): void
{
    static $ready = false;
    if ($ready) {
        return;
    }
    try {
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS `zona_zero_saves` (
              `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
              `user_id` INT UNSIGNED NOT NULL,
              `slot` TINYINT UNSIGNED NOT NULL,
              `save_version` INT NOT NULL DEFAULT 1,
              `title` VARCHAR(120) DEFAULT NULL,
              `summary` VARCHAR(255) DEFAULT NULL,
              `day_num` INT NOT NULL DEFAULT 1,
              `population` INT NOT NULL DEFAULT 0,
              `is_alive` TINYINT(1) NOT NULL DEFAULT 1,
              `payload` LONGTEXT NOT NULL,
              `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              PRIMARY KEY (`id`),
              UNIQUE KEY `uk_zona_zero_user_slot` (`user_id`, `slot`),
              KEY `idx_zona_zero_user` (`user_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    } catch (Throwable $e) {
        error_log('Zona Zero schema: ' . $e->getMessage());
        zz_respond(['ok' => false, 'error' => 'db_schema'], 500);
    }
    $ready = true;
}

function zz_slot_valid(int $slot): bool
{
    return $slot >= 1 && $slot <= 3;
}
