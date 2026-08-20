# -*- coding: utf-8 -*-
"""Lote 2: cistern, kitchen, greenhouse, sawmill. NO toca maestros, lote 1 ni JSON Neni."""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(r"W:\juegos\zona-zero\docs\map-grid-pilot\building-pilots")
sys.path.insert(0, str(ROOT))
from _compose import (  # noqa: E402
    COLS,
    chroma_magenta,
    excel_col,
    font,
    load_buildable,
    paste,
    rect_ok,
    scale_to_footprint,
)

MAP_PNG = Path(
    r"W:\juegos\zona-zero\docs\map-grid-pilot\terrain-iter-match-lote1\01-map-empty.png"
)
OUT = ROOT / "lote-2"
DRIVE_L2 = Path(r"G:\Mi unidad\Juegos\Zona Zero\map-grid-pilot\building-pilots\lote-2")
ASSETS = Path(r"C:\Users\agl03\.cursor\projects\w-juegos-zona-zero\assets")
RAW = {
    "cistern": ASSETS / "pilot-cistern-lote2-raw.png",
    "kitchen": ASSETS / "pilot-kitchen-lote2-raw.png",
    "greenhouse": ASSETS / "pilot-greenhouse-lote2-raw.png",
    "sawmill": ASSETS / "pilot-sawmill-lote2-raw.png",
}

FROZEN = [
    {"id": "house", "name": "Casa", "c": 36, "r": 2, "w": 4, "h": 2, "png": ROOT / "01-house-4x2.png"},
    {"id": "workshop", "name": "Taller", "c": 36, "r": 6, "w": 5, "h": 2, "png": ROOT / "01-workshop-5x2.png"},
    {"id": "hq_central_l1", "name": "HQ I", "c": 42, "r": 2, "w": 5, "h": 4, "png": ROOT / "01-hq-5x4.png"},
    {"id": "storage", "name": "Almacén", "c": 18, "r": 2, "w": 5, "h": 3, "png": ROOT / "lote-1" / "01-storage-5x3.png"},
    {"id": "infirmary", "name": "Enfermería", "c": 24, "r": 2, "w": 4, "h": 3, "png": ROOT / "lote-1" / "01-infirmary-4x3.png"},
    {"id": "farm", "name": "Huerto", "c": 18, "r": 6, "w": 3, "h": 2, "png": ROOT / "lote-1" / "01-farm-3x2.png"},
    {"id": "well", "name": "Pozo", "c": 22, "r": 6, "w": 2, "h": 1, "png": ROOT / "lote-1" / "01-well-2x1.png"},
]


def match_map(spr: Image.Image) -> Image.Image:
    spr = spr.filter(ImageFilter.GaussianBlur(radius=0.7))
    spr = ImageEnhance.Sharpness(spr).enhance(0.78)
    spr = ImageEnhance.Contrast(spr).enhance(0.93)
    return spr


def drop_black_stage(im: Image.Image) -> Image.Image:
    """Quita peana negra conectada al borde (artefacto de generación)."""
    arr = np.array(im.convert("RGBA"))
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    lum = (r.astype(np.int16) + g.astype(np.int16) + b.astype(np.int16)) / 3
    dark = (lum < 28) & (a > 0)
    mag = (r > 170) & (b > 150) & (g < 110)
    kill = dark | mag
    h, w = kill.shape
    seen = np.zeros((h, w), dtype=bool)
    stack = []
    for x in range(w):
        if kill[0, x]:
            stack.append((0, x))
        if kill[h - 1, x]:
            stack.append((h - 1, x))
    for y in range(h):
        if kill[y, 0]:
            stack.append((y, 0))
        if kill[y, w - 1]:
            stack.append((y, w - 1))
    while stack:
        y, x = stack.pop()
        if y < 0 or y >= h or x < 0 or x >= w or seen[y, x] or not kill[y, x]:
            continue
        seen[y, x] = True
        stack.extend(((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)))
    arr[:, :, 3] = np.where(seen, 0, a)
    out = Image.fromarray(arr, "RGBA")
    bbox = out.getbbox()
    return out.crop(bbox) if bbox else out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    DRIVE_L2.mkdir(parents=True, exist_ok=True)
    build = load_buildable()
    m = Image.open(MAP_PNG).convert("RGBA")
    W, H = m.size
    cw, ch = W / COLS, H / 18

    lote = [
        {"id": "sawmill", "name": "Aserradero", "c": 11, "r": 2, "w": 5, "h": 3, "raw": RAW["sawmill"]},
        {"id": "greenhouse", "name": "Invernadero", "c": 29, "r": 2, "w": 4, "h": 3, "raw": RAW["greenhouse"]},
        {"id": "kitchen", "name": "Cocina", "c": 11, "r": 6, "w": 4, "h": 2, "raw": RAW["kitchen"]},
        {"id": "cistern", "name": "Cisterna", "c": 24, "r": 6, "w": 2, "h": 2, "raw": RAW["cistern"]},
    ]

    occupied = {}
    for p in FROZEN + lote:
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
        cut = drop_black_stage(chroma_magenta(Image.open(p["raw"])))
        fw = p["fp_box"][2] - p["fp_box"][0]
        fh = p["fp_box"][3] - p["fp_box"][1]
        png_name = f"01-{p['id']}-{p['w']}x{p['h']}.png"
        cut.save(OUT / png_name, "PNG")
        p["asset"] = png_name
        spr = match_map(scale_to_footprint(cut, fw, fh))
        sprites[p["id"]] = spr
        print("asset", png_name, cut.size, "on-map", spr.size, "anchor", p["anchor"])

    for p in FROZEN:
        cut = Image.open(p["png"]).convert("RGBA")
        fw = p["fp_box"][2] - p["fp_box"][0]
        fh = p["fp_box"][3] - p["fp_box"][1]
        sprites[p["id"]] = match_map(scale_to_footprint(cut, fw, fh))

    visual = m.copy()
    debug = m.copy()
    ddbg = ImageDraw.Draw(debug, "RGBA")
    f2 = font(16)
    colors = {
        "sawmill": (150, 110, 70, 90),
        "greenhouse": (70, 140, 90, 90),
        "kitchen": (180, 90, 60, 90),
        "cistern": (80, 130, 160, 90),
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

    draw_order = sorted(FROZEN + lote, key=lambda p: p["fp_box"][3])
    for p in draw_order:
        paste(visual, sprites[p["id"]], p["fp_box"])
        paste(debug, sprites[p["id"]], p["fp_box"])

    left = [p for p in lote if p["id"] in ("sawmill", "kitchen")]
    xs = [p["fp_box"][0] for p in left] + [p["fp_box"][2] for p in left]
    ys = [p["fp_box"][1] for p in left] + [p["fp_box"][3] for p in left]
    crop_l2 = (
        max(0, min(xs) - 80),
        max(0, min(ys) - 200),
        min(W, max(xs) + 80),
        min(H, max(ys) + 140),
    )
    allb = FROZEN + lote
    xs_a = [p["fp_box"][0] for p in allb] + [p["fp_box"][2] for p in allb]
    ys_a = [p["fp_box"][1] for p in allb] + [p["fp_box"][3] for p in allb]
    crop_all = (
        max(0, min(xs_a) - 120),
        max(0, min(ys_a) - 220),
        min(W, max(xs_a) + 160),
        min(H, max(ys_a) + 100),
    )

    visual.convert("RGB").save(OUT / "02-review-map.png", "PNG", optimize=True)
    visual.crop(crop_l2).convert("RGB").save(OUT / "02b-review-closeup.png", "PNG", optimize=True)
    visual.crop(crop_all).convert("RGB").save(OUT / "02c-review-with-frozen.png", "PNG", optimize=True)
    debug.convert("RGB").save(OUT / "03-review-debug-footprints.png", "PNG", optimize=True)
    debug.crop(crop_l2).convert("RGB").save(OUT / "03b-debug-closeup.png", "PNG", optimize=True)

    meta = {
        "lote": 2,
        "note": "Cuatro tipos distintos. Maestros y lote 1 no regenerados. NO gameplay.",
        "terrain_master": "docs/map-grid-pilot/terrain-iter-match-lote1/01-map-empty.png",
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
        "frozen_on_map_for_scale": [
            {"id": p["id"], "anchor": p["anchor"], "footprint": f"{p['w']}x{p['h']}"}
            for p in FROZEN
        ],
    }
    (OUT / "lote2.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")

    readme = """# Lote 2 — tipos distintos (NO gameplay)

Cisterna **2×2**, cocina **4×2**, invernadero **4×3**, aserradero **5×3**.
Misma norma que el conjunto congelado. PNG maestros y lote 1 no se tocaron.

Ninguno tiene niveles. El invernadero es otro edificio, no evolución del huerto.

Anclas (buildable Neni, sin solape con los 7 congelados):
- aserradero L3
- invernadero AD3
- cocina L7
- cisterna Y7 (junto al pozo, no pegada a la cocina)

- `02-review-map.png` — mapa maestro + 7 congelados + estos 4
- `02b-review-closeup.png` — closeup aserradero + cocina
- `02c-review-with-frozen.png` — franja norte (lote 2 junto a los 7)
- `03-review-debug-footprints.png` / `03b-debug-closeup.png` — footprints del lote 2
"""
    (OUT / "README.md").write_text(readme, encoding="utf-8")

    for f in OUT.iterdir():
        if f.is_file():
            shutil.copy2(f, DRIVE_L2 / f.name)
            print("drive", f.name)


if __name__ == "__main__":
    main()
