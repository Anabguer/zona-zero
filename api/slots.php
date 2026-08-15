<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$user = zz_require_user();
$pdo = zz_pdo();
zz_ensure_schema($pdo);
$userId = (int) $user['id'];
zz_migrate_legacy_to_main($pdo, $userId);

$decoded = zz_decode_save_row(zz_fetch_save_row($pdo, $userId, zz_slot_main()));
if (!$decoded) {
    $decoded = zz_decode_save_row(zz_fetch_save_row($pdo, $userId, zz_slot_backup()));
}

$save = null;
if ($decoded) {
    $save = [
        'empty' => false,
        'title' => $decoded['meta']['title'],
        'summary' => $decoded['meta']['summary'],
        'day' => $decoded['meta']['day'],
        'population' => $decoded['meta']['population'],
        'alive' => $decoded['meta']['alive'],
        'updated_at' => $decoded['meta']['updated_at'],
        'save_version' => $decoded['meta']['save_version'],
    ];
}

zz_respond([
    'ok' => true,
    'user' => [
        'id' => (int) $user['id'],
        'nombre' => (string) ($user['nombre'] ?? $user['usuario'] ?? 'Jugador'),
    ],
    'save' => $save,
    // Compat legado (hub antiguo): un solo “slot” lógico
    'slots' => [
        $save
            ? [
                'slot' => 1,
                'empty' => false,
                'title' => $save['title'],
                'summary' => $save['summary'],
                'day' => $save['day'],
                'population' => $save['population'],
                'alive' => $save['alive'],
                'updated_at' => $save['updated_at'],
                'save_version' => $save['save_version'],
            ]
            : [
                'slot' => 1,
                'empty' => true,
                'title' => null,
                'summary' => null,
                'day' => 0,
                'population' => 0,
                'alive' => true,
                'updated_at' => null,
                'save_version' => ZZ_SAVE_VERSION,
            ],
    ],
]);
