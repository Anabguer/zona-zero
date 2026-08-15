<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    zz_respond(['ok' => false, 'error' => 'method'], 405);
}

$user = zz_require_user();
$data = zz_json_input();
$payload = $data['state'] ?? null;
if (!is_array($payload) || !zz_payload_valid($payload)) {
    zz_respond(['ok' => false, 'error' => 'state_invalid'], 400);
}

$day = max(1, (int) ($payload['day'] ?? 1));
$popTotal = (int) ($payload['population']['total'] ?? 0);
$survivors = is_array($payload['survivors'] ?? null) ? $payload['survivors'] : [];
$aliveCount = 0;
foreach ($survivors as $s) {
    if (($s['status'] ?? '') !== 'dead') {
        $aliveCount++;
    }
}
if ($aliveCount <= 0 && $popTotal > 0) {
    $aliveCount = $popTotal;
}
$defeated = !empty($payload['flags']['defeated']);
$isAlive = !$defeated && ($aliveCount > 0 || $popTotal > 0);
if ($aliveCount <= 0) {
    $aliveCount = max(0, $popTotal);
}
$title = trim((string) ($data['title'] ?? $payload['colonyName'] ?? 'Zona Zero'));
if ($title === '') {
    $title = 'Zona Zero';
}
$summary = trim((string) ($data['summary'] ?? ''));
if ($summary === '') {
    $summary = $isAlive
        ? ('Día ' . $day . ' · ' . $aliveCount . ' vivos')
        : ('Derrota · Día ' . $day);
}

$pdo = zz_pdo();
zz_ensure_schema($pdo);
$userId = (int) $user['id'];
zz_migrate_legacy_to_main($pdo, $userId);

$mainSlot = zz_slot_main();
$backupSlot = zz_slot_backup();
$mainRow = zz_fetch_save_row($pdo, $userId, $mainSlot);
$mainDecoded = zz_decode_save_row($mainRow);

try {
    $pdo->beginTransaction();
    // Rotación segura: solo si main actual es válida, copiar → backup antes de escribir
    if ($mainDecoded) {
        zz_upsert_save(
            $pdo,
            $userId,
            $backupSlot,
            $mainDecoded['state'],
            (string) ($mainDecoded['meta']['title'] ?? $title),
            (string) ($mainDecoded['meta']['summary'] ?? $summary),
            (int) ($mainDecoded['meta']['day'] ?? $day),
            (int) ($mainDecoded['meta']['population'] ?? $aliveCount),
            (bool) ($mainDecoded['meta']['alive'] ?? $isAlive)
        );
    }
    zz_upsert_save($pdo, $userId, $mainSlot, $payload, $title, $summary, $day, $aliveCount, $isAlive);
    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Zona Zero save: ' . $e->getMessage());
    zz_respond(['ok' => false, 'error' => 'save_failed'], 500);
}

zz_respond([
    'ok' => true,
    'key' => 'main',
    'day' => $day,
    'population' => $aliveCount,
    'alive' => $isAlive,
]);
