# -*- coding: utf-8 -*-
"""Componer pilotos de edificios sobre el mapa limpio + celdas buildable de Neni.
NO toca gameplay ni el JSON de clasificación.
"""
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

NENI_JSON = Path(r"W:\juegos\zona-zero\docs\map-grid-pilot\scale-iter-clean-4x2\map_grid-neni.json")
MAP_PNG = Path(r"W:\juegos\zona-zero\docs\map-grid-pilot\scale-iter-clean-4x2\01-map-clean-no-vehicles-ruins.png")
OUT = Path(r"W:\juegos\zona-zero\docs\map-grid-pilot\building-pilots")
DRIVE = Path(r"G:\Mi unidad\Juegos\Zona Zero\map-grid-pilot\building-pilots")
RAW = {
    "house": Path(r"C:\Users\agl03\.cursor\projects\w-juegos-Aqui-hay-tema\assets\pilot-house-elev2-raw.png"),
    "workshop": Path(r"C:\Users\agl03\.cursor\projects\w-juegos-Aqui-hay-tema\assets\pilot-workshop-elev2-raw.png"),
    "hq": Path(r"C:\Users\agl03\.cursor\projects\w-juegos-Aqui-hay-tema\assets\pilot-hq-elev2-raw.png"),
}

COLS, ROWS = 78, 18


def excel_col(c: int) -> str:
    label = ""
    n = c
    while True:
        label = chr(65 + (n % 26)) + label
        n = n // 26 - 1
        if n < 0:
            break
    return label


def col_idx(cid: str):
    m = re.match(r"^([A-Z]+)(\d+)$", cid)
    letters, row = m.group(1), int(m.group(2))
    c = 0
    for ch in letters:
        c = c * 26 + (ord(ch) - 64)
    return c - 1, row - 1


def font(size: int):
    for p in (r"C:\Windows\Fonts\consola.ttf", r"C:\Windows\Fonts\arial.ttf"):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


def chroma_magenta(im: Image.Image) -> Image.Image:
    """Quitar fondo #FF00FF y el halo púrpura de la base, sin comer madera/óxido/luz cálida."""
    arr = np.array(im.convert("RGBA"))
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    mn = np.minimum(r, b)
    mx = np.maximum(r, b)

    key = (r > 170) & (b > 150) & (g < 110)
    # spill: r y b por encima de g (magenta), aunque sea oscuro
    key |= (mn > g + 22) & (mx > 45) & (g < 95)
    key |= (g < 18) & (mx > 55) & (mn > 20) & ((r + b) > 3 * g + 40)

    keep = ~key
    excess = np.maximum(0, mn - g)
    despill = keep & (excess > 6) & (g < 150)
    r2 = r.copy()
    b2 = b.copy()
    r2[despill] = np.clip(r[despill] - excess[despill], 0, 255)
    b2[despill] = np.clip(b[despill] - excess[despill], 0, 255)

    lum = (r2 + g + b2) / 3
    dead = keep & (excess > 22) & (g < 45) & (lum < 40)
    alpha = np.where(key | dead, 0, 255).astype(np.uint8)

    arr[:, :, 0] = r2.astype(np.uint8)
    arr[:, :, 2] = b2.astype(np.uint8)
    arr[:, :, 3] = alpha
    out = Image.fromarray(arr, "RGBA")

    mask = np.array(out.split()[-1].filter(ImageFilter.GaussianBlur(radius=0.45)))
    mask[key | dead] = 0
    still_mag = (mn > g + 18) & (mx > 70) & (g < 85)
    mask[still_mag] = 0
    out.putalpha(Image.fromarray(mask, "L"))
    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)
    return out


def scale_to_footprint(sprite: Image.Image, fw: float, fh: float) -> Image.Image:
    """Fachada frontal: el ANCHO del sprite ≈ ancho del footprint.
    Tejado+fachada pueden sobresalir hacia el norte."""
    sw, sh = sprite.size
    s = (fw * 1.06) / sw
    if sh * s < fh * 1.05:
        s = (fh * 1.05) / sh
        if sw * s > fw * 1.16:
            s = (fw * 1.16) / sw
    nw, nh = max(8, int(sw * s)), max(8, int(sh * s))
    return sprite.resize((nw, nh), Image.Resampling.LANCZOS)


def paste(base: Image.Image, spr: Image.Image, fp_box):
    """Apoyar el sprite en el borde inferior-centro del footprint."""
    x0, y0, x1, y1 = fp_box
    cx = (x0 + x1) / 2
    # el contacto va un poco por encima del borde sur de la celda
    by = y1 - max(3, (y1 - y0) * 0.03)
    px = int(cx - spr.width / 2)
    py = int(by - spr.height)
    # sombra de contacto suave (elipse, no plataforma)
    shad = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shad)
    sw, sh = spr.size
    ey1 = py + sh - 1
    ey0 = ey1 - max(10, int(sh * 0.055))
    sd.ellipse(
        [px + int(sw * 0.10), ey0, px + int(sw * 0.90), ey1 + 4],
        fill=(28, 16, 10, 78),
    )
    shad = shad.filter(ImageFilter.GaussianBlur(radius=7))
    base.alpha_composite(shad)
    base.alpha_composite(spr, (px, py))
    return px, py, px + spr.width, py + spr.height


def fh_margin(fh):
    return fh * 0.08


def load_buildable():
    data = json.loads(NENI_JSON.read_text(encoding="utf-8"))
    s = set()
    for cid in data["cells"]:
        s.add(col_idx(cid))
    return s


def rect_ok(build, c, r, w, h):
    cells = [(c + dc, r + dr) for dr in range(h) for dc in range(w)]
    return all(cell in build for cell in cells), cells


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    DRIVE.mkdir(parents=True, exist_ok=True)
    build = load_buildable()
    m = Image.open(MAP_PNG).convert("RGBA")
    W, H = m.size
    cw, ch = W / COLS, H / ROWS

    # Cluster norte-centro, todos sobre buildable Neni, sin solape.
    pilots = [
        {"id": "house", "name": "Casa", "kind": "house", "c": 36, "r": 2, "w": 4, "h": 2, "raw": RAW["house"]},
        {"id": "workshop", "name": "Taller", "kind": "workshop", "c": 36, "r": 6, "w": 5, "h": 2, "raw": RAW["workshop"]},
        {"id": "hq_central_l1", "name": "Refugio Central I", "kind": "hq", "c": 42, "r": 2, "w": 5, "h": 4, "raw": RAW["hq"]},
    ]

    occupied = {}
    for p in pilots:
        ok, cells = rect_ok(build, p["c"], p["r"], p["w"], p["h"])
        if not ok:
            raise SystemExit(f"footprint fuera de buildable Neni: {p['id']} {excel_col(p['c'])}{p['r']+1}")
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
    for p in pilots:
        cut = chroma_magenta(Image.open(p["raw"]))
        fw = p["fp_box"][2] - p["fp_box"][0]
        fh = p["fp_box"][3] - p["fp_box"][1]
        spr = scale_to_footprint(cut, fw, fh)
        sprites[p["id"]] = spr
        png_name = f"01-{p['kind']}-{p['w']}x{p['h']}.png"
        cut_path = OUT / png_name
        # asset limpio recortado, sin reescalar a mapa (alta res)
        cut.save(cut_path, "PNG")
        p["asset"] = png_name
        print("asset", png_name, cut.size, "on-map", spr.size)

    # hoja de assets sobre fondo oscuro (solo review)
    sheet_w = 1600
    sheet = Image.new("RGBA", (sheet_w, 720), (28, 24, 18, 255))
    dsheet = ImageDraw.Draw(sheet)
    f1 = font(22)
    f2 = font(16)
    x = 40
    for p in pilots:
        spr = sprites[p["id"]].copy()
        # caber en columna
        max_h = 520
        if spr.height > max_h:
            s = max_h / spr.height
            spr = spr.resize((int(spr.width * s), max_h), Image.Resampling.LANCZOS)
        sheet.alpha_composite(spr, (x + (480 - spr.width) // 2, 80 + (520 - spr.height) // 2))
        dsheet.text((x + 240, 40), f"{p['name']}  {p['w']}×{p['h']}", font=f1, fill=(240, 230, 210), anchor="mt")
        dsheet.text((x + 240, 680), p["id"], font=f2, fill=(180, 170, 150), anchor="mt")
        x += 520
    sheet.convert("RGB").save(OUT / "00-pilot-sheet.png", "PNG", optimize=True)

    visual = m.copy()
    debug = m.copy()
    ddbg = ImageDraw.Draw(debug, "RGBA")
    # footprints debug
    colors = {
        "house": (72, 140, 220, 90),
        "workshop": (170, 110, 170, 90),
        "hq_central_l1": (190, 130, 55, 90),
    }
    for p in pilots:
        x0, y0, x1, y1 = p["fp_box"]
        ddbg.rounded_rectangle(
            [x0 + 2, y0 + 2, x1 - 2, y1 - 2],
            radius=8,
            fill=colors[p["id"]],
            outline=(255, 245, 225, 220),
            width=3,
        )
        ddbg.text(
            ((x0 + x1) / 2, y0 + 16),
            f"{p['name']} {p['w']}×{p['h']}",
            font=f2,
            fill=(255, 248, 230, 255),
            anchor="mt",
        )

    draw_order = sorted(pilots, key=lambda p: p["fp_box"][3])
    for p in draw_order:
        paste(visual, sprites[p["id"]], p["fp_box"])
        paste(debug, sprites[p["id"]], p["fp_box"])

    # crop review: más margen al norte porque el tejado sube
    xs = [p["fp_box"][0] for p in pilots] + [p["fp_box"][2] for p in pilots]
    ys = [p["fp_box"][1] for p in pilots] + [p["fp_box"][3] for p in pilots]
    crop = (
        max(0, min(xs) - 180),
        max(0, min(ys) - 280),
        min(W, max(xs) + 220),
        min(H, max(ys) + 120),
    )

    visual.convert("RGB").save(OUT / "02-review-map.png", "PNG", optimize=True)
    visual.crop(crop).convert("RGB").save(OUT / "02b-review-closeup.png", "PNG", optimize=True)
    debug.convert("RGB").save(OUT / "03-review-debug-footprints.png", "PNG", optimize=True)
    debug.crop(crop).convert("RGB").save(OUT / "03b-debug-closeup.png", "PNG", optimize=True)

    meta = {
        "note": "Pilotos visuales v3 FRONTAL + CÁMARA ELEVADA. NO integrados. JSON buildable de Neni no modificado.",
        "orientation": "elevated-front (not ortho facade, not isometric-3/4)",
        "grid": {"cols": COLS, "rows": ROWS},
        "buildable_source": "map_grid-neni.json",
        "pilots": [
            {
                "id": p["id"],
                "name": p["name"],
                "footprint": f"{p['w']}x{p['h']}",
                "anchor": p["anchor"],
                "asset": p["asset"],
                "inhabitants_reference": 4 if p["id"] == "house" else None,
            }
            for p in pilots
        ],
    }
    (OUT / "pilots.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")

    readme = """# Pilotos visuales v3 — frontal + cámara elevada (NO gameplay)

Misma identidad (casa / taller / HQ). Fachada hacia el jugador, eje paralelo al mapa.
Cámara más alta: tejado y profundidad visibles. **No** 3/4 lateral. **No** fachada ortográfica.

Inventario: `INVENTARIO_EDIFICIOS.md`.

| Piloto | id | Footprint | Asset |
|--------|----|-----------|-------|
| Vivienda | house | 4×2 | `01-house-4x2.png` |
| Mediano | workshop | 5×2 | `01-workshop-5x2.png` |
| Grande | hq_central_l1 | 5×4 | `01-hq-5x4.png` |

Sobre celdas buildable de Neni (AK3, AK7, AQ3).

- `02-review-map.png` / `02b-review-closeup.png` — sin grid, sin footprints, sin etiquetas
- `03-review-debug-footprints.png` / `03b-debug-closeup.png` — con rectángulo lógico

No integrar. Parar a revisión.
"""
    (OUT / "README.md").write_text(readme, encoding="utf-8")

    for f in OUT.iterdir():
        if f.is_file():
            shutil.copy2(f, DRIVE / f.name)
            print("drive", f.name)


if __name__ == "__main__":
    main()
