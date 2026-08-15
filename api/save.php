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

$payload = $data['state'] ?? null;
if (!is_array($payload)) {
    zz_respond(['ok' => false, 'error' => 'state_required'], 400);
}

$saveVersion = (int) ($payload['v'] ?? ZZ_SAVE_VERSION);
$day = max(1, (int) ($payload['day'] ?? 1));
$survivors = is_array($payload['survivors'] ?? null) ? $payload['survivors'] : [];
$aliveCount = 0;
foreach ($survivors as $s) {
    if (($s['status'] ?? '') !== 'dead') {
        $aliveCount++;
    }
}
$defeated = !empty($payload['flags']['defeated']);
$isAlive = !$defeated && $aliveCount > 0;
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

$json = json_encode($payload, JSON_UNESCAPED_UNICODE);
if ($json === false) {
    zz_respond(['ok' => false, 'error' => 'json_encode'], 500);
}

$pdo = getDBConnection();
zz_ensure_schema($pdo);

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
    (int) $user['id'],
    $slot,
    $saveVersion,
    mb_substr($title, 0, 120),
    mb_substr($summary, 0, 255),
    $day,
    $aliveCount,
    $isAlive ? 1 : 0,
    $json,
]);

zz_respond([
    'ok' => true,
    'slot' => $slot,
    'day' => $day,
    'population' => $aliveCount,
    'alive' => $isAlive,
]);
