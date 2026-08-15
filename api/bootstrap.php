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
    // 1 = main, 2 = backup (interno). Slot 3 legado solo lectura/migración.
    return $slot >= 1 && $slot <= 3;
}

/** Keys lógicas GAME_MASTER §31.7 / Ap. E */
function zz_slot_main(): int
{
    return 1;
}

function zz_slot_backup(): int
{
    return 2;
}

function zz_payload_valid(?array $payload): bool
{
    if (!is_array($payload)) {
        return false;
    }
    if (!isset($payload['v']) && !isset($payload['day'])) {
        return false;
    }
    $day = (int) ($payload['day'] ?? 0);
    if ($day < 1) {
        return false;
    }
    if (!isset($payload['resources']) || !is_array($payload['resources'])) {
        return false;
    }
    if (!isset($payload['base']) || !is_array($payload['base'])) {
        return false;
    }
    return true;
}

function zz_fetch_save_row(PDO $pdo, int $userId, int $slot): ?array
{
    $st = $pdo->prepare(
        'SELECT save_version, title, summary, day_num, population, is_alive, payload, updated_at
         FROM zona_zero_saves WHERE user_id = ? AND slot = ? LIMIT 1'
    );
    $st->execute([$userId, $slot]);
    $row = $st->fetch();
    return $row ?: null;
}

function zz_decode_save_row(?array $row): ?array
{
    if (!$row) {
        return null;
    }
    $state = json_decode((string) $row['payload'], true);
    if (!zz_payload_valid(is_array($state) ? $state : null)) {
        return null;
    }
    return [
        'state' => $state,
        'meta' => [
            'title' => $row['title'],
            'summary' => $row['summary'],
            'day' => (int) $row['day_num'],
            'population' => (int) $row['population'],
            'alive' => (bool) (int) $row['is_alive'],
            'save_version' => (int) $row['save_version'],
            'updated_at' => $row['updated_at'],
        ],
    ];
}

function zz_upsert_save(
    PDO $pdo,
    int $userId,
    int $slot,
    array $payload,
    string $title,
    string $summary,
    int $day,
    int $population,
    bool $isAlive
): void {
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        throw new RuntimeException('json_encode');
    }
    $st = $pdo->prepare(
        'INSERT INTO zona_zero_saves
          (user_id, slot, save_version, title, summary, day_num, population, is_alive, payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          save_version = VALUES(save_version),
          title = VALUES(title),
          summary = VALUES(summary),
          day_num = VALUES(day_num),
          population = VALUES(population),
          is_alive = VALUES(is_alive),
          payload = VALUES(payload)'
    );
    $st->execute([
        $userId,
        $slot,
        (int) ($payload['v'] ?? ZZ_SAVE_VERSION),
        mb_substr($title, 0, 120),
        mb_substr($summary, 0, 255),
        $day,
        $population,
        $isAlive ? 1 : 0,
        $json,
    ]);
}

/**
 * Migración puntual: si main vacío, promover el mejor slot legado (1..3) a main.
 * Backup = segundo mejor si existe.
 */
function zz_migrate_legacy_to_main(PDO $pdo, int $userId): void
{
    $main = zz_decode_save_row(zz_fetch_save_row($pdo, $userId, zz_slot_main()));
    if ($main) {
        return;
    }
    $candidates = [];
    for ($s = 1; $s <= 3; $s++) {
        $decoded = zz_decode_save_row(zz_fetch_save_row($pdo, $userId, $s));
        if ($decoded) {
            $candidates[] = ['slot' => $s] + $decoded;
        }
    }
    if (!$candidates) {
        return;
    }
    usort($candidates, static function ($a, $b) {
        $da = (int) ($a['meta']['day'] ?? 0);
        $db = (int) ($b['meta']['day'] ?? 0);
        if ($da !== $db) {
            return $db <=> $da;
        }
        return strcmp((string) ($b['meta']['updated_at'] ?? ''), (string) ($a['meta']['updated_at'] ?? ''));
    });
    $best = $candidates[0];
    if ((int) $best['slot'] !== zz_slot_main()) {
        zz_upsert_save(
            $pdo,
            $userId,
            zz_slot_main(),
            $best['state'],
            (string) ($best['meta']['title'] ?? 'Zona Zero'),
            (string) ($best['meta']['summary'] ?? ''),
            (int) ($best['meta']['day'] ?? 1),
            (int) ($best['meta']['population'] ?? 0),
            (bool) ($best['meta']['alive'] ?? true)
        );
    }
    if (isset($candidates[1])) {
        $sec = $candidates[1];
        $backup = zz_decode_save_row(zz_fetch_save_row($pdo, $userId, zz_slot_backup()));
        if (!$backup) {
            zz_upsert_save(
                $pdo,
                $userId,
                zz_slot_backup(),
                $sec['state'],
                (string) ($sec['meta']['title'] ?? 'Zona Zero'),
                (string) ($sec['meta']['summary'] ?? ''),
                (int) ($sec['meta']['day'] ?? 1),
                (int) ($sec['meta']['population'] ?? 0),
                (bool) ($sec['meta']['alive'] ?? true)
            );
        }
    }
}
