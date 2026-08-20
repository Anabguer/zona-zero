# -*- coding: utf-8 -*-
"""Piloto sobre la referencia aprobada. NO redibuja el mapa. NO toca el juego."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SRC = Path(
    r"C:\Users\agl03\.cursor\projects\w-juegos-Aqui-hay-tema\assets"
    r"\c__Users_agl03_AppData_Roaming_Cursor_User_workspaceStorage_b48d3d08b528e2539d5bd99cbcac5256_images_ChatGPT_Image_18_ago_2026__08_02_11-34446513-41d9-477e-a681-030a4ecaa3d3.png"
)
LOCAL = Path(r"W:\juegos\zona-zero\docs\map-grid-pilot\approved-reference-pilot")
DRIVE = Path(r"G:\Mi unidad\Juegos\Zona Zero\map-grid-pilot\approved-reference-pilot")

COLS = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
ROWS = [1, 2, 3, 4, 5, 6]
SCALE = 4  # la ilustración aprobada se usa tal cual; solo se agranda para revisar

# Arte primero: códigos según lo que se VE en la referencia (no umbrales de color).
# . edificable  # carretera  = camino tierra  R ruina  V vehículo  T vegetación  O obstáculo
OCC = [
    "TRR=RRO.......OO...T....TT",  # 1
    "RR.=RR=....=...V....=...VV",  # 2
    ".R==..=....=..VV....=.V...",  # 3
    "V#########################",  # 4
    "..=..=.....=........=...TR",  # 5
    "T.....=....=........=T...T",  # 6
]

CLASS = {
    ".": "BUILDABLE",
    "#": "BLOCKED_ROAD",
    "=": "DIRT_PATH",
    "R": "BLOCKED_RUIN",
    "V": "BLOCKED_VEHICLE",
    "T": "BLOCKED_TREE",
    "O": "BLOCKED_OBSTACLE",
}

FILL = {
    "BUILDABLE": (40, 180, 70, 88),
    "BLOCKED_ROAD": (70, 70, 75, 115),
    "DIRT_PATH": (170, 140, 70, 85),
    "BLOCKED_TREE": (20, 80, 30, 100),
    "BLOCKED_VEHICLE": (190, 95, 35, 115),
    "BLOCKED_RUIN": (150, 70, 40, 115),
    "BLOCKED_OBSTACLE": (110, 85, 45, 105),
}

FOOT = {
    "casa": (70, 140, 220, 155),
    "huerto": (90, 170, 50, 155),
    "pozo": (70, 160, 190, 165),
    "taller": (160, 90, 160, 155),
    "edificio": (180, 120, 50, 155),
}


def font(size):
    for p in (r"C:\Windows\Fonts\consola.ttf", r"C:\Windows\Fonts\arial.ttf"):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


def load_clean():
    im = Image.open(SRC).convert("RGB")
    w, h = im.size
    if h < 500:
        raise SystemExit(f"referencia inesperada {w}x{h}")
    # composite: escenario limpio arriba, grid ChatGPT abajo. Corte en la línea clara ~y=341.
    clean = im.crop((0, 0, w, 340))
    up = clean.resize((clean.width * SCALE, clean.height * SCALE), Image.Resampling.LANCZOS)
    return im, clean, up


def occupancy_map():
    if len(OCC) != 6:
        raise SystemExit("OCC rows")
    for i, row in enumerate(OCC, 1):
        if len(row) != 26:
            raise SystemExit(f"fila {i} len={len(row)} {row!r}")
    cells = {}
    for r_i, row in enumerate(OCC):
        for c_i, ch in enumerate(row):
            cid = f"{COLS[c_i]}{ROWS[r_i]}"
            klass = CLASS[ch]
            blocked = klass != "BUILDABLE"
            sector = "west" if c_i < 9 else ("core" if c_i < 18 else "east")
            cells[cid] = {
                "id": cid,
                "col": COLS[c_i],
                "row": ROWS[r_i],
                "occupancy": klass,
                "blocked": blocked,
                "buildable": not blocked,
                "allows": {
                    "farm": not blocked,
                    "building": not blocked,
                    "infra": not blocked,
                },
                "tags": [] if not blocked else [klass.lower()],
                "reason": None if not blocked else klass,
                "sector": sector,
            }
    return cells


def pack(cells):
    taken = set()

    def free(c, r, w, h):
        ids = []
        for rr in range(r, r + h):
            for cc in range(c, c + w):
                if cc < 0 or cc >= 26 or rr < 1 or rr > 6:
                    return None
                cid = f"{COLS[cc]}{rr}"
                if cid in taken or not cells[cid]["buildable"]:
                    return None
                ids.append(cid)
        return ids

    def place(name, w, h, prefer):
        for r in range(1, 7):
            for c in prefer:
                ids = free(c, r, w, h)
                if ids:
                    taken.update(ids)
                    return {"name": name, "w": w, "h": h, "anchor": ids[0], "cells": ids}
        for r in range(1, 7):
            for c in range(26):
                ids = free(c, r, w, h)
                if ids:
                    taken.update(ids)
                    return {"name": name, "w": w, "h": h, "anchor": ids[0], "cells": ids}
        return None

    specs = [
        ("edificio_grande", 3, 3, range(7, 12)),
        ("taller", 3, 2, range(17, 23)),
        ("casa_1", 2, 2, range(7, 12)),
        ("casa_2", 2, 2, range(12, 18)),
        ("casa_3", 2, 2, range(18, 24)),
        ("casa_4", 2, 2, range(3, 8)),
        ("casa_5", 2, 2, range(8, 14)),
        ("casa_6", 2, 2, range(18, 24)),
        ("huerto_1", 2, 2, range(3, 8)),
        ("huerto_2", 2, 2, range(12, 18)),
        ("huerto_3", 2, 2, range(18, 24)),
        ("pozo", 1, 1, range(8, 16)),
    ]
    placed = []
    for name, w, h, pref in specs:
        hit = place(name, w, h, pref)
        if not hit:
            raise SystemExit(f"no cabe {name} {w}x{h}")
        placed.append(hit)
    return placed, taken


def overlay_grid(base):
    W, H = base.size
    cw, ch = W / 26, H / 6
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer, "RGBA")
    f = font(28)
    f2 = font(18)
    for c in range(27):
        x = int(c * cw)
        d.line([(x, 0), (x, H)], fill=(255, 220, 140, 140), width=2)
    for r in range(7):
        y = int(r * ch)
        d.line([(0, y), (W, y)], fill=(255, 220, 140, 140), width=2)
    for c, L in enumerate(COLS):
        d.text((int((c + 0.5) * cw), 10), L, fill=(255, 236, 180, 255), font=f, anchor="mt")
    for r in range(6):
        d.text((18, int((r + 0.5) * ch)), str(ROWS[r]), fill=(255, 236, 180, 255), font=f, anchor="mm")
        for c in range(26):
            d.text(
                (int((c + 0.5) * cw), int((r + 0.88) * ch)),
                f"{COLS[c]}{ROWS[r]}",
                fill=(255, 230, 160, 150),
                font=f2,
                anchor="mm",
            )
    return Image.alpha_composite(base.convert("RGBA"), layer).convert("RGB")


def overlay_occ(base, cells):
    W, H = base.size
    cw, ch = W / 26, H / 6
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer, "RGBA")
    for r in range(6):
        for c in range(26):
            klass = cells[f"{COLS[c]}{ROWS[r]}"]["occupancy"]
            x0, y0 = int(c * cw), int(r * ch)
            d.rectangle([x0, y0, x0 + cw, y0 + ch], fill=FILL[klass])
    tinted = Image.alpha_composite(base.convert("RGBA"), layer).convert("RGB")
    gridded = overlay_grid(tinted)
    bar_h = 52
    out = Image.new("RGB", (W, H + bar_h), (18, 16, 12))
    out.paste(gridded, (0, 0))
    d = ImageDraw.Draw(out)
    f = font(20)
    legend = [
        ("Edificable", FILL["BUILDABLE"][:3]),
        ("Carretera", FILL["BLOCKED_ROAD"][:3]),
        ("Camino tierra", FILL["DIRT_PATH"][:3]),
        ("Árbol", FILL["BLOCKED_TREE"][:3]),
        ("Vehículo", FILL["BLOCKED_VEHICLE"][:3]),
        ("Ruina", FILL["BLOCKED_RUIN"][:3]),
        ("Obstáculo", FILL["BLOCKED_OBSTACLE"][:3]),
    ]
    x = 24
    for lab, col in legend:
        d.rectangle([x, H + 14, x + 22, H + 36], fill=col)
        d.text((x + 30, H + 24), lab, fill=(230, 220, 200), font=f, anchor="lm")
        x += 30 + 12 + int(f.getlength(lab)) + 28
    return out


def overlay_buildings(base, placed):
    W, H = base.size
    cw, ch = W / 26, H / 6
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer, "RGBA")
    f = font(22)
    for p in placed:
        name = p["name"]
        key = "casa"
        if name.startswith("huerto"):
            key = "huerto"
        elif name == "pozo":
            key = "pozo"
        elif name.startswith("edificio"):
            key = "edificio"
        elif name == "taller":
            key = "taller"
        xs, ys = [], []
        for cid in p["cells"]:
            c = COLS.index(cid[0])
            r = int(cid[1:]) - 1
            xs += [c * cw, (c + 1) * cw]
            ys += [r * ch, (r + 1) * ch]
        box = [min(xs) + 8, min(ys) + 8, max(xs) - 8, max(ys) - 8]
        d.rounded_rectangle(box, 12, fill=FOOT[key], outline=(255, 255, 230, 210), width=3)
        d.text(((box[0] + box[2]) / 2, (box[1] + box[3]) / 2), f"{name} {p['w']}×{p['h']}", fill=(255, 255, 240, 255), font=f, anchor="mm")
    return Image.alpha_composite(overlay_grid(base).convert("RGBA"), layer).convert("RGB")


def readme(cells, placed, taken, up_size, orig_size):
    n = len(cells)
    nb = sum(1 for c in cells.values() if c["buildable"])
    kinds = {}
    for c in cells.values():
        kinds[c["occupancy"]] = kinds.get(c["occupancy"], 0) + 1
    lines = [
        "# Piloto de mapa — referencia aprobada",
        "",
        "Este piloto **no redibuja** el escenario. Usa la ilustración aprobada por Neni/ChatGPT",
        "el 18 ago 2026 (composite limpio arriba + grid de ChatGPT abajo).",
        "",
        "No está integrado en Zona Zero. No sustituye el mapa de producción.",
        "",
        "## Archivos",
        "",
        "- `00-approved-source.png` — composite original tal cual se aprobó.",
        "- `01-map-clean.png` — solo el escenario (mitad superior), sin grid.",
        "- `02-map-debug-grid.png` — el mismo escenario + coordenadas A–Z × 1–6.",
        "- `03-map-occupancy.png` — edificable / bloqueado para revisión.",
        "- `04-map-building-test.png` — footprints de prueba (el jugador no los ve).",
        "- `map_grid.json` — ocupación celda a celda.",
        "",
        "## Dimensiones",
        "",
        f"- Recorte limpio original: **{orig_size[0]} × {orig_size[1]}** px.",
        f"- Entrega de revisión: **{up_size[0]} × {up_size[1]}** px (×{SCALE} LANCZOS, sin redibujar).",
        "- Concepto de viewport: mapa más ancho que una pantalla landscape; pan izquierda → derecha.",
        "",
        "## Cuadrícula lógica (invisible en partida)",
        "",
        "- **26 × 6** celdas (A–Z × 1–6) = **156** celdas.",
        "- A1 = noroeste (arriba-izquierda).",
        "- El jugador nunca ve esta rejilla. Solo existe para saber qué hay en cada celda.",
        "",
        "## Ocupación",
        "",
        f"- Edificable: **{nb} / {n}** ({100.0 * nb / n:.1f}%).",
        f"- Bloqueada: **{n - nb}**.",
        "",
    ]
    for k, v in sorted(kinds.items()):
        lines.append(f"- `{k}`: {v}")
    lines += [
        "",
        "Las parcelas vacías son deliberadas. Los caminos de tierra de la ilustración",
        "dividen el terreno; nosotros no pintamos cuadrados artificiales en el fondo.",
        "",
        "## Prueba de colonia (`04`)",
        "",
        f"- Piezas colocadas: **{len(placed)}**.",
        f"- Celdas usadas por footprints: **{len(taken)}**.",
        f"- Edificable que sigue libre después: **{nb - len(taken)}**.",
        "",
    ]
    for p in placed:
        lines.append(f"- `{p['name']}` {p['w']}×{p['h']} ancla {p['anchor']} → {', '.join(p['cells'])}")
    lines += [
        "",
        "Criterio visual: aquí había un lugar antes del desastre; la colonia se reconstruye encima.",
        "No es un escenario lleno de decoración buscando huecos.",
        "",
    ]
    return "\n".join(lines) + "\n"


def save_all(folder: Path, files: dict):
    folder.mkdir(parents=True, exist_ok=True)
    for name, payload in files.items():
        dest = folder / name
        if isinstance(payload, Image.Image):
            payload.save(dest, "PNG", optimize=True)
        elif isinstance(payload, (bytes, bytearray)):
            dest.write_bytes(payload)
        else:
            dest.write_text(payload, encoding="utf-8")
        print(folder.name, name, dest.stat().st_size)


def main():
    original, clean, up = load_clean()
    cells = occupancy_map()
    placed, taken = pack(cells)
    n_build = sum(1 for c in cells.values() if c["buildable"])
    print("buildable", n_build, "/ 156")
    for p in placed:
        print(" ", p["name"], p["anchor"], f"{p['w']}x{p['h']}")

    g01 = up
    g02 = overlay_grid(up)
    g03 = overlay_occ(up, cells)
    g04 = overlay_buildings(up, placed)
    cap = ImageDraw.Draw(g04)
    cap.text(
        (28, up.size[1] - 36),
        f"DEBUG footprints — {len(placed)} piezas · {n_build}/156 edificables · {n_build - len(taken)} siguen libres · el jugador no ve esto",
        fill=(255, 236, 190),
        font=font(24),
    )

    payload = {
        "id": "approved-reference-pilot",
        "title": "Piloto sobre referencia visual aprobada (Neni/ChatGPT, 18 ago 2026)",
        "note": (
            "El fondo es la ilustración aprobada, no un mapa redibujado. "
            "Sin HQ ni edificios de colonia. Rejilla solo para el motor/DEBUG. "
            "No integrado en el juego."
        ),
        "source": "00-approved-source.png",
        "image": "01-map-clean.png",
        "original_crop_px": list(clean.size),
        "image_size": list(up.size),
        "scale": SCALE,
        "viewport_concept": "Landscape más estrecho que el mapa. Pan principal izquierda-derecha.",
        "grid": {
            "cols": COLS,
            "rows": ROWS,
            "origin": "A1 = noroeste (arriba-izquierda)",
            "cell_px_approx": [round(up.size[0] / 26, 1), round(up.size[1] / 6, 1)],
            "debug_only": True,
        },
        "stats": {
            "cells_total": 156,
            "buildable": n_build,
            "blocked": 156 - n_build,
            "buildable_pct": round(100.0 * n_build / 156, 1),
            "demo_pieces": len(placed),
            "demo_cells_used": len(taken),
            "buildable_left_after_demo": n_build - len(taken),
        },
        "footprints_demo": {
            "well": {"w": 1, "h": 1},
            "house_small": {"w": 2, "h": 2},
            "farm": {"w": 2, "h": 2},
            "workshop": {"w": 3, "h": 2},
            "large": {"w": 3, "h": 3},
        },
        "building_test": placed,
        "cells": cells,
    }

    files = {
        "00-approved-source.png": original,
        "01-map-clean.png": g01,
        "02-map-debug-grid.png": g02,
        "03-map-occupancy.png": g03,
        "04-map-building-test.png": g04,
        "map_grid.json": json.dumps(payload, indent=2, ensure_ascii=False),
        "README.md": readme(cells, placed, taken, up.size, clean.size),
    }
    save_all(LOCAL, files)
    save_all(DRIVE, files)


if __name__ == "__main__":
    main()
