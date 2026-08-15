<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    zz_respond(['ok' => false, 'error' => 'method'], 405);
}

$user = zz_require_user();
$pdo = zz_pdo();
zz_ensure_schema($pdo);
$userId = (int) $user['id'];

// Borra main + backup (Nueva partida tras confirmación). No expone slots.
$st = $pdo->prepare('DELETE FROM zona_zero_saves WHERE user_id = ? AND slot IN (?, ?)');
$st->execute([$userId, zz_slot_main(), zz_slot_backup()]);

zz_respond(['ok' => true, 'cleared' => true]);
