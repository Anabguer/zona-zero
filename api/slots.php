<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$user = zz_require_user();
$pdo = zz_pdo();
zz_ensure_schema($pdo);

$st = $pdo->prepare(
    'SELECT slot, save_version, title, summary, day_num, population, is_alive, updated_at
     FROM zona_zero_saves WHERE user_id = ? ORDER BY slot ASC'
);
$st->execute([(int) $user['id']]);
$rows = $st->fetchAll();

$slots = [];
for ($i = 1; $i <= 3; $i++) {
    $slots[$i] = [
        'slot' => $i,
        'empty' => true,
        'title' => null,
        'summary' => null,
        'day' => 0,
        'population' => 0,
        'alive' => true,
        'updated_at' => null,
        'save_version' => ZZ_SAVE_VERSION,
    ];
}
foreach ($rows as $r) {
    $s = (int) $r['slot'];
    if ($s < 1 || $s > 3) {
        continue;
    }
    $slots[$s] = [
        'slot' => $s,
        'empty' => false,
        'title' => $r['title'],
        'summary' => $r['summary'],
        'day' => (int) $r['day_num'],
        'population' => (int) $r['population'],
        'alive' => (bool) (int) $r['is_alive'],
        'updated_at' => $r['updated_at'],
        'save_version' => (int) $r['save_version'],
    ];
}

zz_respond([
    'ok' => true,
    'user' => [
        'id' => (int) $user['id'],
        'nombre' => (string) ($user['nombre'] ?? $user['usuario'] ?? 'Jugador'),
    ],
    'slots' => array_values($slots),
]);
