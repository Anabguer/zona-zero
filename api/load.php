<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$user = zz_require_user();
$pdo = zz_pdo();
zz_ensure_schema($pdo);
$userId = (int) $user['id'];
zz_migrate_legacy_to_main($pdo, $userId);

$recovered = false;
$decoded = zz_decode_save_row(zz_fetch_save_row($pdo, $userId, zz_slot_main()));
if (!$decoded) {
    $decoded = zz_decode_save_row(zz_fetch_save_row($pdo, $userId, zz_slot_backup()));
    if ($decoded) {
        $recovered = true;
        // Restaurar backup → main sin destruir backup
        try {
            zz_upsert_save(
                $pdo,
                $userId,
                zz_slot_main(),
                $decoded['state'],
                (string) ($decoded['meta']['title'] ?? 'Zona Zero'),
                (string) ($decoded['meta']['summary'] ?? ''),
                (int) ($decoded['meta']['day'] ?? 1),
                (int) ($decoded['meta']['population'] ?? 0),
                (bool) ($decoded['meta']['alive'] ?? true)
            );
        } catch (Throwable $e) {
            error_log('Zona Zero restore backup: ' . $e->getMessage());
        }
    }
}

if (!$decoded) {
    zz_respond(['ok' => false, 'error' => 'empty_save'], 404);
}

zz_respond([
    'ok' => true,
    'key' => 'main',
    'recoveredFromBackup' => $recovered,
    'message' => $recovered
        ? 'Recuperamos tu colonia desde una copia de seguridad.'
        : null,
    'meta' => $decoded['meta'],
    'state' => $decoded['state'],
]);
