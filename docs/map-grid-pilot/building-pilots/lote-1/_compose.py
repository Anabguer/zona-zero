# -*- coding: utf-8 -*-
"""Lote 1: well, farm, infirmary, storage sobre mapa. NO toca maestros ni JSON Neni."""
from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(r"W:\juegos\zona-zero\docs\map-grid-pilot\building-pilots")
sys.path.insert(0, str(ROOT))
from _compose import (  # noqa: E402
    COLS,
    DRIVE,
    MAP_PNG,
    NENI_JSON,
    chroma_magenta,
    excel_col,
    font,
    load_buildable,
    paste,
    rect_ok,
    scale_to_footprint,
)

OUT = ROOT / "lote-1"
DRIVE_L1 = Path(r"G:\Mi unidad\Juegos\Zona Zero\map-grid-pilot\building-pilots\lote-1")
ASSETS = Path(r"C:\Users\agl03\.cursor\projects\w-juegos-Aqui-hay-tema\assets")
RAW = {
    "well": ASSETS / "pilot-well-lote1-raw.png",
    "farm": ASSETS / "pilot-farm-lote1-raw.png",
    "infirmary": ASSETS / "pilot-infirmary-lote1-raw.png",
    "storage": ASSETS / "pilot-storage-lote1-raw.png",
}
MASTERS = [
    {"id": "house", "name": "Casa", "c": 36, "r": 2, "w": 4, "h": 2, "png": ROOT / "01-house-4x2.png"},
    {"id": "workshop", "name": "Taller", "c": 36, "r": 6, "w": 5, "h": 2, "png": ROOT / "01-workshop-5x2.png"},
    {"id": "hq_central_l1", "name": "HQ I", "c": 42, "r": 2, "w": 5, "h": 4, "png": ROOT / "01-hq-5x4.png"},
]


def match_map(spr: Image.Image) -> Image.Image:
    spr = spr.filter(ImageFilter.GaussianBlur(radius=0.7))
    spr = ImageEnhance.Sharpness(spr).enhance(0.78)
    spr = ImageEnhance.Contrast(spr).enhance(0.93)
    return spr


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    DRIVE_L1.mkdir(parents=True, exist_ok=True)
    build = load_buildable()
    m = Image.open(MAP_PNG).convert("RGBA")
    W, H = m.size
    cw, ch = W / COLS, H / 18

    lote = [
        {"id": "storage", "name": "Almacén", "c": 18, "r": 2, "w": 5, "h": 3, "raw": RAW["storage"]},
        {"id": "infirmary", "name": "Enfermería", "c": 24, "r": 2, "w": 4, "h": 3, "raw": RAW["infirmary"]},
        {"id": "farm", "name": "Huerto", "c": 18, "r": 6, "w": 3, "h": 2, "raw": RAW["farm"]},
        {"id": "well", "name": "Pozo", "c": 22, "r": 6, "w": 2, "h": 1, "raw": RAW["well"]},
    ]

    occupied = {}
    for p in MASTERS + lote:
        ok, cells = rect_ok(build, p["c"], p["r"], p["w"], p["h"])
        if not ok:
            raise SystemExit(f"fuera de buildable Neni: {p['id']} {excel_col(p['c'])}{p['r']+1}")
        for cell in cells:
            if cell in occupied:
                raise SystemExit(f"solape {p['id']} / {occupied[cell]}")
            occupied[cell] = p["id"]
        p["anchor"] = f"{excel_col(p['c'])}{p['r']+1}"
        p["fp_box"] = (
            p["c"] * cw,
            p["r"] * ch,
            (p["c"] + p["w"]) * cw,
            (p["r"] + p["h"]) * ch,
        )

    sprites = {}
    for p in lote:
        cut = chroma_magenta(Image.open(p["raw"]))
        fw = p["fp_box"][2] - p["fp_box"][0]
        fh = p["fp_box"][3] - p["fp_box"][1]
        png_name = f"01-{p['id']}-{p['w']}x{p['h']}.png"
        cut.save(OUT / png_name, "PNG")
        p["asset"] = png_name
        spr = match_map(scale_to_footprint(cut, fw, fh))
        sprites[p["id"]] = spr
        print("asset", png_name, cut.size, "on-map", spr.size, "anchor", p["anchor"])

    for p in MASTERS:
        cut = Image.open(p["png"]).convert("RGBA")
        fw = p["fp_box"][2] - p["fp_box"][0]
        fh = p["fp_box"][3] - p["fp_box"][1]
        sprites[p["id"]] = match_map(scale_to_footprint(cut, fw, fh))

    visual = m.copy()
    debug = m.copy()
    ddbg = ImageDraw.Draw(debug, "RGBA")
    f2 = font(16)
    colors = {
        "well": (90, 160, 190, 90),
        "farm": (110, 150, 70, 90),
        "infirmary": (200, 90, 90, 90),
        "storage": (170, 140, 70, 90),
    }
    for p in lote:
        x0, y0, x1, y1 = p["fp_box"]
        ddbg.rounded_rectangle(
            [x0 + 2, y0 + 2, x1 - 2, y1 - 2],
            radius=8,
            fill=colors[p["id"]],
            outline=(255, 245, 225, 220),
            width=3,
        )
        ddbg.text(
            ((x0 + x1) / 2, y0 + 14),
            f"{p['name']} {p['w']}×{p['h']}",
            font=f2,
            fill=(255, 248, 230, 255),
            anchor="mt",
        )

    draw_order = sorted(MASTERS + lote, key=lambda p: p["fp_box"][3])
    for p in draw_order:
        paste(visual, sprites[p["id"]], p["fp_box"])
        paste(debug, sprites[p["id"]], p["fp_box"])

    xs = [p["fp_box"][0] for p in lote] + [p["fp_box"][2] for p in lote]
    ys = [p["fp_box"][1] for p in lote] + [p["fp_box"][3] for p in lote]
    crop = (
        max(0, min(xs) - 160),
        max(0, min(ys) - 200),
        min(W, max(xs) + 180),
        min(H, max(ys) + 110),
    )

    visual.convert("RGB").save(OUT / "02-review-map.png", "PNG", optimize=True)
    visual.crop(crop).convert("RGB").save(OUT / "02b-review-closeup.png", "PNG", optimize=True)
    debug.convert("RGB").save(OUT / "03-review-debug-footprints.png", "PNG", optimize=True)
    debug.crop(crop).convert("RGB").save(OUT / "03b-debug-closeup.png", "PNG", optimize=True)

    meta = {
        "lote": 1,
        "note": "Primer lote de tipos distintos. Maestros no regenerados. NO gameplay.",
        "farm_upgrades": "El catálogo no tiene niveles de huerto; greenhouse es edificio aparte. Se mantiene 3×2.",
        "sawmill_footprint": "5x3 aprobado",
        "pilots": [
            {
                "id": p["id"],
                "name": p["name"],
                "footprint": f"{p['w']}x{p['h']}",
                "anchor": p["anchor"],
                "asset": p["asset"],
            }
            for p in lote
        ],
        "masters_on_map_for_scale": [
            {"id": p["id"], "anchor": p["anchor"], "footprint": f"{p['w']}x{p['h']}"}
            for p in MASTERS
        ],
    }
    (OUT / "lote1.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")

    readme = """# Lote 1 — tipos distintos (NO gameplay)

Pozo 2×1, huerto 3×2, enfermería 4×3, almacén 5×3.
Misma norma que los maestros. PNG maestros no se tocaron.

El huerto no tiene niveles en el catálogo actual; el invernadero es otro edificio.

- `02-review-map.png` — mapa completo (incluye maestros a la derecha, solo escala)
- `02b-review-closeup.png` — closeup de los 4, sin etiquetas
- `03-review-debug-footprints.png` / `03b-debug-closeup.png` — footprints de los 4
"""
    (OUT / "README.md").write_text(readme, encoding="utf-8")

    for f in OUT.iterdir():
        if f.is_file():
            shutil.copy2(f, DRIVE_L1 / f.name)
            print("drive", f.name)


if __name__ == "__main__":
    main()
