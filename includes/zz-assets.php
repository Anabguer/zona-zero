<?php
declare(strict_types=1);

/**
 * VersiÃ³n Ãºnica de assets JS/CSS para cache-bust coherente del grafo ES modules.
 * Subir SIEMPRE todo js/ (+ entry PHP) al cambiar esta constante.
 */
const ZZ_ASSET_V = '89';

function zz_asset_v(): string
{
    return ZZ_ASSET_V;
}

/**
 * Import map: cada /juegos/zona-zero/js/*.js â†’ mismo URL con ?v=ZZ_ASSET_V.
 * AsÃ­ los imports relativos hijos (./sim.js) no reutilizan cachÃ© de 30d incompatible
 * con un main.js?v=N nuevo.
 *
 * @return array<string, string>
 */
function zz_js_import_map(string $publicBase): array
{
    $base = rtrim($publicBase, '/');
    $dir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'js';
    $imports = [];
    $files = glob($dir . DIRECTORY_SEPARATOR . '*.js');
    if (!is_array($files)) {
        return $imports;
    }
    $v = zz_asset_v();
    foreach ($files as $file) {
        $name = basename($file);
        $abs = $base . '/js/' . $name;
        $imports[$abs] = $abs . '?v=' . $v;
    }
    return $imports;
}

function zz_print_js_importmap(string $publicBase): void
{
    $payload = ['imports' => zz_js_import_map($publicBase)];
    echo '<script type="importmap">';
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    echo '</script>' . "\n";
}

function zz_css_href(string $publicBase, string $file): string
{
    return htmlspecialchars($publicBase . 'css/' . ltrim($file, '/'), ENT_QUOTES, 'UTF-8')
        . '?v=' . rawurlencode(zz_asset_v());
}

function zz_js_entry_href(string $rel = './js/main.js'): string
{
    return htmlspecialchars($rel, ENT_QUOTES, 'UTF-8') . '?v=' . rawurlencode(zz_asset_v());
}

