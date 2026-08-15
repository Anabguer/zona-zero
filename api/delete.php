<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    zz_respond(['ok' => false, 'error' => 'method'], 405);
}

$user = zz_require_user();
$data = zz_json_input();
$slot = (int) ($data['slot'] ?? 0);
if (!zz_slot_valid($slot)) {
    zz_respond(['ok' => false, 'error' => 'slot_invalid'], 400);
}

$pdo = zz_pdo();
zz_ensure_schema($pdo);
$st = $pdo->prepare('DELETE FROM zona_zero_saves WHERE user_id = ? AND slot = ?');
$st->execute([(int) $user['id'], $slot]);

zz_respond(['ok' => true, 'slot' => $slot]);
