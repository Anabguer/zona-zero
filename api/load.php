<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$user = zz_require_user();
$slot = (int) ($_GET['slot'] ?? 0);
if (!zz_slot_valid($slot)) {
    zz_respond(['ok' => false, 'error' => 'slot_invalid'], 400);
}

$pdo = zz_pdo();
zz_ensure_schema($pdo);

$st = $pdo->prepare(
    'SELECT save_version, title, summary, day_num, population, is_alive, payload, updated_at
     FROM zona_zero_saves WHERE user_id = ? AND slot = ? LIMIT 1'
);
$st->execute([(int) $user['id'], $slot]);
$row = $st->fetch();
if (!$row) {
    zz_respond(['ok' => false, 'error' => 'empty_slot'], 404);
}

$state = json_decode((string) $row['payload'], true);
if (!is_array($state)) {
    zz_respond(['ok' => false, 'error' => 'corrupt_save'], 500);
}

zz_respond([
    'ok' => true,
    'slot' => $slot,
    'meta' => [
        'title' => $row['title'],
        'summary' => $row['summary'],
        'day' => (int) $row['day_num'],
        'population' => (int) $row['population'],
        'alive' => (bool) (int) $row['is_alive'],
        'save_version' => (int) $row['save_version'],
        'updated_at' => $row['updated_at'],
    ],
    'state' => $state,
]);
