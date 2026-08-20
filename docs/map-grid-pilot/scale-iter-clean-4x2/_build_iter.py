# -*- coding: utf-8 -*-
"""Piloto de escala 4x2. Limpia vehículos/ruinas grandes de la ilustración APROBADA.
NO redibuja el mapa. NO toca el juego ni el editor de Neni.
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

SRC = Path(r"W:\juegos\zona-zero\docs\map-grid-pilot\approved-reference-pilot\01-map-clean.png")
LOCAL = Path(r"W:\juegos\zona-zero\docs\map-grid-pilot\scale-iter-clean-4x2")
DRIVE = Path(r"G:\Mi unidad\Juegos\Zona Zero\map-grid-pilot\scale-iter-clean-4x2")

COLS, ROWS = 78, 18
RNG = np.random.default_rng(42)


def excel_col(c: int) -> str:
    label = ""
    n = c
    while True:
        label = chr(65 + (n % 26)) + label
        n = n // 26 - 1
        if n < 0:
            break
    return label


def font(size: int):
    for p in (r"C:\Windows\Fonts\consola.ttf", r"C:\Windows\Fonts\arial.ttf"):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


def ellipse_mask(h, w, cx, cy, rx, ry):
    m = np.zeros((h, w), np.uint8)
    cv2.ellipse(m, (int(cx), int(cy)), (int(rx), int(ry)), 0, 0, 360, 255, -1)
    return m


def poly_mask(h, w, pts):
    m = np.zeros((h, w), np.uint8)
    cv2.fillPoly(m, [np.array(pts, dtype=np.int32)], 255)
    return m


def cell_rect(h, w, c0, r0, c1, r1, pad=18):
    """Celdas del grid 26×6 de la referencia aprobada → rectángulo en píxeles.
    c1,r1 exclusivos. pad extra para sombras que se salen de la celda.
    """
    cw, ch = w / 26.0, h / 6.0
    x0 = max(0, int(c0 * cw) - pad)
    y0 = max(0, int(r0 * ch) - pad)
    x1 = min(w, int(c1 * cw) + pad)
    y1 = min(h, int(r1 * ch) + pad)
    m = np.zeros((h, w), np.uint8)
    m[y0:y1, x0:x1] = 255
    return m


def build_mask(h, w):
    """Máscaras a partir de las celdas V/R/O grandes del piloto 26×6, más elipses de desborde."""
    regions = {
        # A4/B4 coche óxido SOBRE la carretera (el coche está más en B que en A)
        "car_left": ellipse_mask(h, w, 240, 810, 135, 75)
        | ellipse_mask(h, w, 200, 860, 90, 50)
        | cell_rect(h, w, 0, 3, 2, 4, pad=8),
        # B1-C3 + A2 cluster de muros NW
        "ruins_nw": cell_rect(h, w, 0, 0, 3, 3, pad=14)
        | ellipse_mask(h, w, 220, 250, 180, 160),
        # E1-F3 muros + G1 molino
        "ruins_mill": cell_rect(h, w, 4, 0, 7, 3, pad=12)
        | ellipse_mask(h, w, 980, 200, 65, 210)
        | ellipse_mask(h, w, 700, 260, 140, 140),
        # O1-P1 obstáculos/rocas grandes norte
        "ruins_mid": cell_rect(h, w, 14, 0, 16, 2, pad=14)
        | ellipse_mask(h, w, 2320, 180, 140, 110),
        # Autobús verde (O3-P3). No incluir la fila de carretera.
        "bus": cell_rect(h, w, 14, 1, 16, 3, pad=10)
        | ellipse_mask(h, w, 2420, 620, 220, 150)
        | ellipse_mask(h, w, 2520, 720, 150, 100),
        # W3 / X3 vehículo derecha
        "car_right": cell_rect(h, w, 22, 2, 24, 3, pad=14)
        | ellipse_mask(h, w, 3480, 700, 130, 80),
        # Y2-Z2 vehículos far-right
        "van_far": cell_rect(h, w, 24, 1, 26, 3, pad=12)
        | ellipse_mask(h, w, 3920, 500, 80, 70),
        # Cobertizo metálico parcela este
        "shed_right": ellipse_mask(h, w, 3680, 340, 120, 100)
        | ellipse_mask(h, w, 3550, 380, 85, 75),
        # Z5 ruina SE (caseta; no comer el pino de Y5)
        "ruin_se": ellipse_mask(h, w, 3820, 970, 115, 95)
        | ellipse_mask(h, w, 3900, 1040, 90, 70)
        | cell_rect(h, w, 25, 4, 26, 6, pad=6),
    }

    m = np.zeros((h, w), np.uint8)
    for part in regions.values():
        m |= part

    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17))
    m = cv2.dilate(m, k, iterations=1)
    k2 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k2, iterations=2)
    return m, regions


def fill_component_from_neighbors(
    img: np.ndarray, mask: np.ndarray, forbidden: np.ndarray, patch: int = 52
) -> np.ndarray:
    """Rellena un hueco copiando parches SOLAPADOS del terreno vecino (ventana Hann)."""
    h, w = mask.shape
    ys, xs = np.where(mask > 0)
    if len(xs) < 30:
        return img

    k = cv2.getStructuringElement(cv2.MORPH_RECT, (patch, patch))
    valid = cv2.erode(((forbidden == 0).astype(np.uint8) * 255), k)
    neigh = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (220, 220)))
    local = (valid > 0) & (neigh > 0)
    lys, lxs = np.where(local)
    if len(lxs) < 12:
        lys, lxs = np.where(valid > 0)
    if len(lxs) < 8:
        bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        filled = cv2.inpaint(bgr, mask, 8, cv2.INPAINT_TELEA)
        return cv2.cvtColor(filled, cv2.COLOR_BGR2RGB)

    n_src = len(lxs)
    imgf = img.astype(np.float32)
    acc = np.zeros_like(imgf)
    wgt = np.zeros((h, w), np.float32)
    win_full = np.outer(np.hanning(patch), np.hanning(patch)).astype(np.float32)
    win_full = np.clip(win_full, 0.04, None)
    step = max(16, patch // 2)

    x0, x1 = max(0, int(xs.min()) - step), min(w, int(xs.max()) + step)
    y0, y1 = max(0, int(ys.min()) - step), min(h, int(ys.max()) + step)

    for y in range(y0, y1, step):
        for x in range(x0, x1, step):
            mh = min(patch, h - y)
            mw = min(patch, w - x)
            if mh < 10 or mw < 10:
                continue
            lm = mask[y : y + mh, x : x + mw]
            if float(lm.mean()) < 8:
                continue
            best_j = 0
            best_score = 1e18
            for _ in range(10):
                j = int(RNG.integers(0, n_src))
                score = abs(int(lys[j]) - y) * 2.2 + abs(int(lxs[j]) - x) * 0.6
                if score < best_score:
                    best_score = score
                    best_j = j
            sy = min(int(lys[best_j]), h - mh)
            sx = min(int(lxs[best_j]), w - mw)
            p = imgf[sy : sy + mh, sx : sx + mw]
            dest = imgf[max(0, y - 12) : min(h, y + mh + 12), max(0, x - 12) : min(w, x + mw + 12)]
            dm = forbidden[max(0, y - 12) : min(h, y + mh + 12), max(0, x - 12) : min(w, x + mw + 12)] == 0
            if dm.any():
                target = dest[dm].mean(axis=0)
                p = p - p.mean(axis=(0, 1)) + target
            ww = win_full[:mh, :mw] * (lm > 0).astype(np.float32)
            acc[y : y + mh, x : x + mw] += p * ww[..., None]
            wgt[y : y + mh, x : x + mw] += ww

    out = imgf.copy()
    sel = wgt > 1e-3
    out[sel] = acc[sel] / wgt[sel][..., None]
    a = (mask > 0).astype(np.float32)
    a = cv2.GaussianBlur(a, (0, 0), 3.5)
    a3 = a[..., None]
    result = np.clip(out * a3 + imgf * (1.0 - a3), 0, 255)
    return result.astype(np.uint8)


def clean_background(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    mask, _regions = build_mask(rgb.shape[0], rgb.shape[1])
    num, labels = cv2.connectedComponents((mask > 0).astype(np.uint8))
    filled = rgb.copy()
    for i in range(1, num):
        part = ((labels == i).astype(np.uint8)) * 255
        area = int(part.sum() // 255)
        patch = 40 if area < 8000 else (48 if area < 25000 else 56)
        filled = fill_component_from_neighbors(filled, part, mask, patch=patch)

    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    edge = cv2.dilate(mask, k) & (~cv2.erode(mask, k))
    if int(edge.sum()) > 0:
        bgr = cv2.cvtColor(filled, cv2.COLOR_RGB2BGR)
        blended = cv2.inpaint(bgr, edge, 4, cv2.INPAINT_TELEA)
        filled = cv2.cvtColor(blended, cv2.COLOR_BGR2RGB)
        keep = mask == 0
        filled[keep] = rgb[keep]
    return filled, mask


# --- Simulación de footprints -------------------------------------------------

# Parcelas marrones estimadas (78x18), evitando carretera (~filas 9-11) y caminos.
PARCELS = {
    # Rectángulos de parcela marrón. Tras limpiar ruinas/vehículos se gana algo de fondo.
    "north_west": (4, 1, 11, 6),
    "north_left": (17, 1, 11, 5),
    "north_mid": (30, 1, 12, 5),
    "north_right_mid": (44, 1, 12, 5),
    "north_right": (58, 1, 10, 5),
    "north_far_right": (69, 1, 8, 5),
    "south_west": (4, 12, 12, 5),
    "south_left": (18, 12, 12, 5),
    "south_mid": (32, 12, 11, 5),
    "south_right_mid": (45, 12, 12, 5),
    "south_right": (58, 12, 11, 5),
    "south_far_right": (70, 12, 7, 5),
}

# Distribución orgánica: no dos filas perfectas. Mezcla 4x2 y 2x4 (rotación).
# (id, kind, col, row, w, h)  — 0-index
PLACEMENTS = [
    # Jerarquía grande donde estaban ruinas NW (comunidad > casa)
    ("edificio_6x4", "special", 4, 1, 6, 4),
    # Viviendas norte, desplazadas
    ("casa_01", "house", 11, 2, 4, 2),
    ("casa_02", "house", 4, 6, 4, 2),
    ("casa_03", "house", 18, 1, 4, 2),
    ("casa_04", "house", 24, 3, 2, 4),
    ("casa_05", "house", 31, 1, 4, 2),
    ("casa_06", "house", 37, 3, 4, 2),
    ("casa_07", "house", 45, 1, 4, 2),
    ("casa_08", "house", 59, 2, 4, 2),
    ("casa_09", "house", 70, 1, 4, 2),
    # Viviendas sur, zigzag
    ("casa_10", "house", 5, 13, 4, 2),
    ("casa_11", "house", 11, 15, 4, 2),
    ("casa_12", "house", 19, 12, 2, 4),
    ("casa_13", "house", 24, 14, 4, 2),
    ("casa_14", "house", 33, 13, 4, 2),
    ("casa_15", "house", 47, 15, 4, 2),
    ("casa_16", "house", 59, 14, 4, 2),
    # Huertos: mezcla 2x2 y 4x3
    ("huerto_01", "farm", 15, 5, 2, 2),
    ("huerto_02", "farm", 50, 1, 2, 2),
    ("huerto_03", "farm", 75, 3, 2, 2),
    ("huerto_04", "farm", 31, 5, 4, 3),
    ("huerto_05", "farm", 38, 13, 4, 3),
    ("huerto_06", "farm", 51, 13, 4, 3),
    # Pozos
    ("pozo_01", "well", 17, 4, 1, 1),
    ("pozo_02", "well", 55, 12, 1, 1),
    # Servicios
    ("taller_01", "workshop", 27, 12, 5, 2),
    ("almacen_01", "warehouse", 70, 12, 5, 3),
    ("clinica_01", "clinic", 63, 14, 5, 3),
    # Edificios de prueba (sin nombre de función)
    ("edificio_4x4", "special", 51, 3, 4, 4),
    ("edificio_5x3", "special", 64, 1, 5, 3),
    ("edificio_5x4", "special", 44, 5, 5, 4),
]

COLOR = {
    "house": (72, 140, 220, 155),
    "farm": (88, 170, 60, 150),
    "well": (70, 170, 190, 175),
    "workshop": (170, 110, 170, 155),
    "warehouse": (150, 95, 70, 155),
    "clinic": (190, 90, 120, 155),
    "special": (190, 130, 55, 155),
}

KIND_ES = {
    "house": "vivienda 4 hab.",
    "farm": "huerto",
    "well": "pozo",
    "workshop": "taller",
    "warehouse": "almacén",
    "clinic": "clínica",
    "special": "edificio prueba",
}


def validate_placements():
    used = {}
    for name, kind, c, r, w, h in PLACEMENTS:
        if c < 0 or r < 0 or c + w > COLS or r + h > ROWS:
            raise SystemExit(f"fuera de grid {name} {c},{r} {w}x{h}")
        for rr in range(r, r + h):
            for cc in range(c, c + w):
                key = (cc, rr)
                if key in used:
                    raise SystemExit(f"solape {name} con {used[key]} en {excel_col(cc)}{rr + 1}")
                used[key] = name
    return used


def overlay_grid(base_rgb, with_labels=True):
    im = Image.fromarray(base_rgb).convert("RGBA")
    W, H = im.size
    cw, ch = W / COLS, H / ROWS
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer, "RGBA")
    f2 = font(16)
    for c in range(COLS + 1):
        x = c * cw
        d.line([(x, 0), (x, H)], fill=(255, 220, 140, 95), width=1)
    for r in range(ROWS + 1):
        y = r * ch
        d.line([(0, y), (W, y)], fill=(255, 220, 140, 95), width=1)
    if with_labels:
        for c in range(COLS):
            d.text(((c + 0.5) * cw, 6), excel_col(c), font=f2, fill=(255, 236, 180, 220), anchor="mt")
        for r in range(ROWS):
            d.text((8, (r + 0.5) * ch), str(r + 1), font=f2, fill=(255, 236, 180, 220), anchor="lm")
    return Image.alpha_composite(im, layer).convert("RGB"), cw, ch


def overlay_sim(base_rgb):
    grid_im, cw, ch = overlay_grid(base_rgb, with_labels=True)
    W, H = grid_im.size
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer, "RGBA")
    f1 = font(22)
    f2 = font(15)
    for _pname, (c, r, w, h) in PARCELS.items():
        x0, y0 = c * cw, r * ch
        x1, y1 = (c + w) * cw, (r + h) * ch
        d.rounded_rectangle(
            [x0 + 2, y0 + 2, x1 - 2, y1 - 2],
            radius=8,
            outline=(220, 200, 150, 70),
            width=2,
        )
    for name, kind, c, r, w, h in PLACEMENTS:
        x0, y0 = c * cw, r * ch
        x1, y1 = (c + w) * cw, (r + h) * ch
        d.rounded_rectangle(
            [x0 + 3, y0 + 3, x1 - 3, y1 - 3],
            radius=9,
            fill=COLOR[kind],
            outline=(255, 245, 225, 225),
            width=3,
        )
        d.text(((x0 + x1) / 2, (y0 + y1) / 2 - 8), name, font=f1, fill=(255, 250, 240, 255), anchor="mm")
        d.text(((x0 + x1) / 2, (y0 + y1) / 2 + 14), f"{w}×{h}", font=f2, fill=(255, 248, 230, 255), anchor="mm")
    used_cells = sum(w * h for *_, w, h in PLACEMENTS)
    parcel_cells = sum(w * h for (_, _, w, h) in PARCELS.values())
    caption = (
        f"Piloto 4×2: 16 viviendas (4×2 / 2×4) + 6 huertos + 2 pozos + taller 5×2 + "
        f"almacén 5×3 + clínica 5×3 + edificios 4×4 / 5×3 / 5×4 / 6×4  |  "
        f"Ocupan {used_cells}  |  Parcelas útiles est. {parcel_cells}  |  Restantes {parcel_cells - used_cells}"
    )
    d.rounded_rectangle([16, H - 48, W - 16, H - 12], radius=10, fill=(0, 0, 0, 130))
    d.text((28, H - 30), caption, font=f2, fill=(255, 236, 190, 255), anchor="lm")
    return Image.alpha_composite(grid_im.convert("RGBA"), layer).convert("RGB"), used_cells, parcel_cells


def write_json(used_cells, parcel_cells):
    houses = [p for p in PLACEMENTS if p[1] == "house"]
    extra_tight = (parcel_cells - used_cells) // 8
    extra_comfort = max(0, (parcel_cells - used_cells - int(0.35 * parcel_cells)) // 8)
    extra_mid = max(0, (int(0.70 * parcel_cells) - used_cells) // 8)
    payload = {
        "id": "scale-iter-clean-4x2",
        "note": (
            "Piloto de revisión. Fondo = ilustración aprobada limpia (sin vehículos ni ruinas grandes). "
            "NO integrado en Zona Zero. 16 viviendas NO es el máximo del mapa."
        ),
        "grid": {"cols": COLS, "rows": ROWS, "cells_total": COLS * ROWS},
        "house_reference": {
            "footprint": "4x2 (o 2x4 rotada)",
            "inhabitants": 4,
            "upgrades_not_in_scope": True,
        },
        "parcel_capacity_cells_estimate": parcel_cells,
        "used_cells": used_cells,
        "free_cells_estimate": parcel_cells - used_cells,
        "occupied_pct_of_useful": round(100.0 * used_cells / parcel_cells, 1),
        "occupied_pct_of_total_grid": round(100.0 * used_cells / (COLS * ROWS), 1),
        "fits_comfortably": True,
        "additional_houses_4x2_estimate": {
            "comfortable_leave_open_land": extra_comfort,
            "moderate_70pct_useful": extra_mid,
            "tight_pack_remaining_parcels": extra_tight,
        },
        "counts": {
            "houses": len(houses),
            "farms": sum(1 for p in PLACEMENTS if p[1] == "farm"),
            "wells": sum(1 for p in PLACEMENTS if p[1] == "well"),
            "services": ["taller_01 5x2", "almacen_01 5x3", "clinica_01 5x3"],
            "test_buildings": ["edificio_4x4", "edificio_5x3", "edificio_5x4", "edificio_6x4"],
        },
        "placements": [],
    }
    for name, kind, c, r, w, h in PLACEMENTS:
        cells = [f"{excel_col(cc)}{rr + 1}" for rr in range(r, r + h) for cc in range(c, c + w)]
        payload["placements"].append(
            {
                "id": name,
                "kind": kind,
                "label_es": KIND_ES[kind],
                "anchor": cells[0],
                "col0": c,
                "row0": r,
                "w": w,
                "h": h,
                "cells": cells,
            }
        )
    return payload


def write_summary(payload):
    extra = payload["additional_houses_4x2_estimate"]
    return f"""# Revisión de escala — fondo limpio + viviendas 4×2

**Solo piloto.** No está integrado en Zona Zero. No cambia gameplay, población ni el editor de Neni.

Fondo: la ilustración aprobada (`approved-reference-pilot/01-map-clean.png`), **sin redibujar**. Se eliminaron vehículos y ruinas grandes, reconstruyendo el terreno con la textura de la zona.

## Qué se quitó del fondo

- Coche oxidado sobre la carretera (izquierda).
- Autobús verde diagonal (centro-derecha).
- Vehículos a la derecha / far-right.
- Cluster de muros de piedra noroeste.
- Segundo cluster de muros + molino/torre oxidada.
- Ruinas de piedra en parcela norte-centro.
- Cobertizo/contenedor metálico y ruina rectangular sureste que ocupaban solar.

Se mantienen carretera, caminos de tierra, parcelas, vegetación y árboles sueltos.

## Cuadrícula

- **78 × 18 = 1.404 celdas** (igual que el piloto anterior).
- Celda ≈ 52,5 × 75,6 px sobre 4096 × 1360.

## Simulación colocada (orgánica, no dos filas)

| Pieza | Footprint | Cantidad |
|---|---|---|
| Vivienda (4 habitantes) | 4×2 o 2×4 rotada | 16 |
| Huerto | 2×2 (×3) y 4×3 (×3) | 6 |
| Pozo | 1×1 | 2 |
| Taller | 5×2 | 1 |
| Almacén | 5×3 | 1 |
| Clínica | 5×3 | 1 |
| Edificio de prueba | 4×4, 5×3, 5×4, 6×4 | 4 |

Las 16 viviendas **no son el máximo** del mapa: son la carga de prueba para ver crecimiento con casas pequeñas de 4 habitantes.

## Capacidad

- Celdas ocupadas por footprints: **{payload["used_cells"]}**
- Celdas útiles estimadas (parcelas marrones, sin carretera): **{payload["parcel_capacity_cells_estimate"]}**
- Celdas restantes en esas parcelas: **{payload["free_cells_estimate"]}**
- Ocupado sobre terreno útil: **{payload["occupied_pct_of_useful"]}%**
- Ocupado sobre el grid completo: **{payload["occupied_pct_of_total_grid"]}%**

**¿Caben cómodamente las 16 viviendas + servicios + 4 edificios de prueba?** Sí. Queda aproximadamente la mitad del terreno de parcela libre, con huecos entre piezas y sin tapar la carretera.

## Viviendas 4×2 adicionales (estimación)

Si cada casa sigue siendo 4×2 (8 celdas) y **no** queremos llenar el mapa:

- Holgado (dejar ~35% de parcelas abiertas): **~{extra["comfortable_leave_open_land"]} casas más**
- Moderado (llenar hasta ~70% de parcelas útiles): **~{extra["moderate_70pct_useful"]} casas más**
- Apretado (usar el resto de parcelas estimadas): **~{extra["tight_pack_remaining_parcels"]} casas más**

Población teórica solo con las 16 de prueba: **64 habitantes**. Con las adicionales holgadas: del orden de **{(16 + extra["comfortable_leave_open_land"]) * 4}**. Esto es capacidad de mapa, no diseño de gameplay.

Neni clasificará después las 1.404 celdas a mano. Esta simulación ignora piedras/decoración pequeña.

## Archivos

1. `01-map-clean-no-vehicles-ruins.png` — fondo limpio
2. `02-map-clean-grid-78x18.png` — fondo limpio + grid
3. `03-capacity-sim-4x2.png` — footprints de prueba
4. `capacity-sim-4x2.json` — datos
5. `RESUMEN.md` — este archivo
"""


def main():
    LOCAL.mkdir(parents=True, exist_ok=True)
    DRIVE.mkdir(parents=True, exist_ok=True)

    used = validate_placements()
    print("placements ok", len(PLACEMENTS), "cells", len(used))

    src = np.array(Image.open(SRC).convert("RGB"))
    print("cleaning", src.shape)
    clean, mask = clean_background(src)

    mask_vis = src.copy()
    mask_vis[mask > 0] = (mask_vis[mask > 0] * 0.35 + np.array([220, 40, 40]) * 0.65).astype(np.uint8)
    Image.fromarray(mask_vis).save(LOCAL / "_mask_preview.png")

    clean_im = Image.fromarray(clean)
    p1 = LOCAL / "01-map-clean-no-vehicles-ruins.png"
    clean_im.save(p1, "PNG", optimize=True)
    print("saved", p1)

    grid_im, _, _ = overlay_grid(clean, with_labels=True)
    p2 = LOCAL / "02-map-clean-grid-78x18.png"
    grid_im.save(p2, "PNG", optimize=True)
    print("saved", p2)

    sim_im, used_cells, parcel_cells = overlay_sim(clean)
    p3 = LOCAL / "03-capacity-sim-4x2.png"
    sim_im.save(p3, "PNG", optimize=True)
    print("saved", p3, "used", used_cells, "parcel", parcel_cells)

    payload = write_json(used_cells, parcel_cells)
    p4 = LOCAL / "capacity-sim-4x2.json"
    p4.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    p5 = LOCAL / "RESUMEN.md"
    p5.write_text(write_summary(payload), encoding="utf-8")

    deliver = [
        "01-map-clean-no-vehicles-ruins.png",
        "02-map-clean-grid-78x18.png",
        "03-capacity-sim-4x2.png",
        "capacity-sim-4x2.json",
        "RESUMEN.md",
    ]
    for name in deliver:
        shutil.copy2(LOCAL / name, DRIVE / name)
        print("drive", DRIVE / name)

    print("DONE used", used_cells, "useful", parcel_cells, "free", parcel_cells - used_cells)


if __name__ == "__main__":
    main()
