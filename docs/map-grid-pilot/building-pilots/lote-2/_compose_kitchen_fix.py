# -*- coding: utf-8 -*-
"""Solo cocina lote 2 corregida. No regenera aserradero/invernadero/cisterna ni los 7."""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

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
KITCHEN_RAW = Path(
    r"C:\Users\agl03\.cursor\projects\w-juegos-zona-zero\assets\pilot-kitchen-lote2b-raw.png"
)

FROZEN10 = [
    {"id": "house", "name": "Casa", "c": 36, "r": 2, "w": 4, "h": 2, "png": ROOT / "01-house-4x2.png"},
    {"id": "workshop", "name": "Taller", "c": 36, "r": 6, "w": 5, "h": 2, "png": ROOT / "01-workshop-5x2.png"},
    {"id": "hq_central_l1", "name": "HQ I", "c": 42, "r": 2, "w": 5, "h": 4, "png": ROOT / "01-hq-5x4.png"},
    {"id": "storage", "name": "Almacén", "c": 18, "r": 2, "w": 5, "h": 3, "png": ROOT / "lote-1" / "01-storage-5x3.png"},
    {"id": "infirmary", "name": "Enfermería", "c": 24, "r": 2, "w": 4, "h": 3, "png": ROOT / "lote-1" / "01-infirmary-4x3.png"},
    {"id": "farm", "name": "Huerto", "c": 18, "r": 6, "w": 3, "h": 2, "png": ROOT / "lote-1" / "01-farm-3x2.png"},
    {"id": "well", "name": "Pozo", "c": 22, "r": 6, "w": 2, "h": 1, "png": ROOT / "lote-1" / "01-well-2x1.png"},
    {"id": "sawmill", "name": "Aserradero", "c": 11, "r": 2, "w": 5, "h": 3, "png": OUT / "01-sawmill-5x3.png"},
    {"id": "greenhouse", "name": "Invernadero", "c": 29, "r": 2, "w": 4, "h": 3, "png": OUT / "01-greenhouse-4x3.png"},
    {"id": "cistern", "name": "Cisterna", "c": 24, "r": 6, "w": 2, "h": 2, "png": OUT / "01-cistern-2x2.png"},
]

KITCHEN = {
    "id": "kitchen",
    "name": "Cocina",
    "c": 11,
    "r": 6,
    "w": 4,
    "h": 2,
}


def prep(p, cw, ch, build, occupied):
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


def match_map(spr: Image.Image) -> Image.Image:
    spr = spr.filter(ImageFilter.GaussianBlur(radius=0.7))
    spr = ImageEnhance.Sharpness(spr).enhance(0.78)
    spr = ImageEnhance.Contrast(spr).enhance(0.93)
    return spr


def drop_black_stage(im: Image.Image) -> Image.Image:
    import numpy as np

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

    occupied = {}
    kitchen = dict(KITCHEN)
    for p in FROZEN10 + [kitchen]:
        prep(p, cw, ch, build, occupied)

    sprites = {}
    cut = drop_black_stage(chroma_magenta(Image.open(KITCHEN_RAW)))
    fw = kitchen["fp_box"][2] - kitchen["fp_box"][0]
    fh = kitchen["fp_box"][3] - kitchen["fp_box"][1]
    png_name = "01-kitchen-4x2.png"
    cut.save(OUT / png_name, "PNG")
    kitchen["asset"] = png_name
    sprites["kitchen"] = match_map(scale_to_footprint(cut, fw, fh))
    print("asset", png_name, cut.size, "on-map", sprites["kitchen"].size, "anchor", kitchen["anchor"], "fp", f"{kitchen['w']}x{kitchen['h']}")

    for p in FROZEN10:
        cut_f = Image.open(p["png"]).convert("RGBA")
        fw = p["fp_box"][2] - p["fp_box"][0]
        fh = p["fp_box"][3] - p["fp_box"][1]
        sprites[p["id"]] = match_map(scale_to_footprint(cut_f, fw, fh))

    visual = m.copy()
    debug = m.copy()
    ddbg = ImageDraw.Draw(debug, "RGBA")
    x0, y0, x1, y1 = kitchen["fp_box"]
    ddbg.rounded_rectangle(
        [x0 + 2, y0 + 2, x1 - 2, y1 - 2],
        radius=8,
        fill=(180, 90, 60, 90),
        outline=(255, 245, 225, 220),
        width=3,
    )
    ddbg.text(
        ((x0 + x1) / 2, y0 + 14),
        f"Cocina {kitchen['w']}×{kitchen['h']}",
        font=font(16),
        fill=(255, 248, 230, 255),
        anchor="mt",
    )

    draw_order = sorted(FROZEN10 + [kitchen], key=lambda p: p["fp_box"][3])
    for p in draw_order:
        paste(visual, sprites[p["id"]], p["fp_box"])
        paste(debug, sprites[p["id"]], p["fp_box"])

    crop_k = (
        max(0, x0 - 90),
        max(0, y0 - 220),
        min(W, x1 + 90),
        min(H, y1 + 140),
    )

    visual.convert("RGB").save(OUT / "02-review-map.png", "PNG", optimize=True)
    visual.crop(crop_k).convert("RGB").save(OUT / "02b-review-kitchen-closeup.png", "PNG", optimize=True)
    debug.convert("RGB").save(OUT / "03-review-debug-kitchen.png", "PNG", optimize=True)
    debug.crop(crop_k).convert("RGB").save(OUT / "03b-debug-kitchen-closeup.png", "PNG", optimize=True)

    meta = json.loads((OUT / "lote2.json").read_text(encoding="utf-8"))
    meta["note"] = "Lote 2: aserradero/invernadero/cisterna CONGELADOS. Cocina corregida pendiente de revisión."
    meta["kitchen_revision"] = "lote2b-servicio-comunitario"
    for p in meta["pilots"]:
        if p["id"] == "kitchen":
            p["anchor"] = kitchen["anchor"]
            p["asset"] = png_name
            p["footprint"] = "4x2"
            p["status"] = "pending_review"
        else:
            p["status"] = "frozen"
    (OUT / "lote2.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")

    copies = [
        "01-kitchen-4x2.png",
        "02-review-map.png",
        "02b-review-kitchen-closeup.png",
        "03-review-debug-kitchen.png",
        "03b-debug-kitchen-closeup.png",
        "lote2.json",
    ]
    for name in copies:
        shutil.copy2(OUT / name, DRIVE_L2 / name)
        print("drive", name)


if __name__ == "__main__":
    main()
