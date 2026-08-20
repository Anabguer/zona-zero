from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import json

img_path = Path(r"W:\juegos\zona-zero\docs\map-grid-pilot\approved-reference-pilot\01-map-clean.png")
out_dir = Path(r"W:\juegos\zona-zero\docs\map-grid-pilot\capacity-test")
drive_dir = Path(r"G:\Mi unidad\Juegos\Zona Zero\map-grid-pilot\capacity-test")
out_dir.mkdir(parents=True, exist_ok=True)
drive_dir.mkdir(parents=True, exist_ok=True)

im = Image.open(img_path).convert("RGBA")
W, H = im.size
COLS, ROWS = 78, 18
CW, CH = W / COLS, H / ROWS

parcels = {
    "north_west": (4, 1, 10, 5),
    "north_left": (17, 1, 10, 4),
    "north_mid": (30, 1, 10, 4),
    "north_right_mid": (44, 1, 10, 4),
    "north_right": (58, 1, 10, 4),
    "north_far_right": (70, 1, 7, 4),
    "south_west": (4, 12, 11, 5),
    "south_left": (18, 12, 11, 5),
    "south_mid": (31, 12, 11, 5),
    "south_right_mid": (44, 12, 11, 5),
    "south_right": (58, 12, 11, 5),
    "south_far_right": (71, 12, 6, 5),
}

placements = [
    ("casa_01", "house", 4, 1, 3, 3), ("casa_02", "house", 8, 1, 3, 3),
    ("casa_03", "house", 17, 1, 3, 3), ("casa_04", "house", 21, 1, 3, 3),
    ("casa_05", "house", 30, 1, 3, 3), ("casa_06", "house", 34, 1, 3, 3),
    ("casa_07", "house", 44, 1, 3, 3), ("casa_08", "house", 48, 1, 3, 3),
    ("casa_09", "house", 4, 12, 3, 3), ("casa_10", "house", 8, 12, 3, 3),
    ("casa_11", "house", 18, 12, 3, 3), ("casa_12", "house", 22, 12, 3, 3),
    ("casa_13", "house", 31, 12, 3, 3), ("casa_14", "house", 35, 12, 3, 3),
    ("casa_15", "house", 58, 12, 3, 3), ("casa_16", "house", 62, 12, 3, 3),
    ("huerto_01", "farm", 55, 1, 2, 2), ("huerto_02", "farm", 58, 1, 2, 2),
    ("huerto_03", "farm", 70, 1, 2, 2), ("huerto_04", "farm", 68, 12, 2, 2),
    ("huerto_05", "farm", 48, 12, 2, 2), ("huerto_06", "farm", 71, 12, 2, 2),
    ("pozo_01", "well", 43, 1, 1, 1), ("pozo_02", "well", 54, 12, 1, 1),
    ("taller_01", "workshop", 40, 1, 3, 2), ("almacen_01", "workshop", 65, 12, 3, 2),
    ("clinica_01", "clinic", 74, 12, 3, 2),
    ("edificio_01", "special", 51, 1, 3, 3), ("edificio_02", "special", 64, 1, 3, 3),
    ("edificio_03", "special", 44, 12, 3, 3), ("edificio_04", "special", 50, 12, 3, 3),
]

used = {}
for name, kind, c, r, w, h in placements:
    for rr in range(r, r + h):
        for cc in range(c, c + w):
            key = (cc, rr)
            if key in used:
                raise SystemExit(f"overlap {name} with {used[key]} at {key}")
            used[key] = name

parcel_capacity = sum(w * h for (_, _, w, h) in parcels.values())
used_cells = sum(w * h for _, _, _, _, w, h in placements)
free_cells = parcel_capacity - used_cells

COLOR = {
    "house": (72, 140, 220, 150),
    "farm": (88, 170, 60, 150),
    "well": (70, 170, 190, 165),
    "workshop": (170, 110, 170, 150),
    "clinic": (190, 90, 120, 150),
    "special": (190, 130, 55, 150),
}

layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(layer, "RGBA")
try:
    f1 = ImageFont.truetype(r"C:\Windows\Fonts\consola.ttf", 24)
    f2 = ImageFont.truetype(r"C:\Windows\Fonts\consola.ttf", 16)
except Exception:
    f1 = ImageFont.load_default()
    f2 = f1

for _pname, (c, r, w, h) in parcels.items():
    x0, y0 = c * CW, r * CH
    x1, y1 = (c + w) * CW, (r + h) * CH
    d.rounded_rectangle([x0 + 3, y0 + 3, x1 - 3, y1 - 3], radius=8, outline=(220, 200, 150, 90), width=2)

for name, kind, c, r, w, h in placements:
    x0, y0 = c * CW, r * CH
    x1, y1 = (c + w) * CW, (r + h) * CH
    d.rounded_rectangle([x0 + 4, y0 + 4, x1 - 4, y1 - 4], radius=10, fill=COLOR[kind], outline=(255, 245, 225, 220), width=3)
    d.text(((x0 + x1) / 2, (y0 + y1) / 2 - 8), name, font=f1, fill=(255, 250, 240, 255), anchor="mm")
    d.text(((x0 + x1) / 2, (y0 + y1) / 2 + 16), f"{w}x{h}", font=f2, fill=(255, 248, 230, 255), anchor="mm")

for c in range(COLS + 1):
    x = c * CW
    d.line([(x, 0), (x, H)], fill=(255, 220, 140, 100), width=1)
for r in range(ROWS + 1):
    y = r * CH
    d.line([(0, y), (W, y)], fill=(255, 220, 140, 100), width=1)

def excel_col(c):
    label = ""
    n = c
    while True:
        label = chr(65 + (n % 26)) + label
        n = n // 26 - 1
        if n < 0:
            break
    return label

for c in range(COLS):
    d.text(((c + 0.5) * CW, 8), excel_col(c), font=f2, fill=(255, 236, 180, 220), anchor="mt")
for r in range(ROWS):
    d.text((10, (r + 0.5) * CH), str(r + 1), font=f2, fill=(255, 236, 180, 220), anchor="lm")

caption = (
    "Prueba 3x3: 16 viviendas 3x3 + 6 huertos 2x2 + 2 pozos 1x1 + "
    "2 talleres/almacenes 3x2 + 1 clinica 3x2 + 4 edificios 3x3 | "
    f"Ocupan {used_cells} celdas | Parcelas marrones estimadas {parcel_capacity} | Libres {free_cells}"
)
d.rounded_rectangle([18, H - 50, W - 18, H - 14], radius=10, fill=(0, 0, 0, 120))
d.text((30, H - 32), caption, font=f2, fill=(255, 236, 190, 255), anchor="lm")

out = Image.alpha_composite(im, layer).convert("RGB")
out_file = out_dir / "01-capacity-sim-3x3.png"
out.save(out_file, "PNG", optimize=True)

payload = {
    "grid": {"cols": COLS, "rows": ROWS},
    "parcel_capacity_cells_estimate": parcel_capacity,
    "used_cells": used_cells,
    "free_cells_estimate": free_cells,
    "placements": []
}
for name, kind, c, r, w, h in placements:
    cells = []
    for rr in range(r, r + h):
        for cc in range(c, c + w):
            cells.append(f"{excel_col(cc)}{rr + 1}")
    payload["placements"].append({
        "id": name,
        "kind": kind,
        "anchor": cells[0],
        "w": w,
        "h": h,
        "cells": cells,
    })

json_path = out_dir / "capacity-sim-3x3.json"
json_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
for name in ["01-capacity-sim-3x3.png", "capacity-sim-3x3.json"]:
    (drive_dir / name).write_bytes((out_dir / name).read_bytes())
print("saved", out_file)
print("used", used_cells, "parcel", parcel_capacity, "free", free_cells)






