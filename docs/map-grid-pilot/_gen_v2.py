# -*- coding: utf-8 -*-
"""Piloto visual v2. No toca el juego. Genera escena + grid + occupancy + JSON."""
from __future__ import annotations

import json
import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(r"W:\juegos\zona-zero")
ART = ROOT / "assets" / "art"
OUT = ROOT / "docs" / "map-grid-pilot"
DRIVE = Path(r"G:\Mi unidad\Juegos\Zona Zero\map-grid-pilot")

W, H = 3840, 1080
COLS = list("ABCDEFGHIJKLMNOPQRSTUVWX")
ROWS = [1, 2, 3, 4, 5, 6]
NC, NR = len(COLS), len(ROWS)
CW, CH = W / NC, H / NR  # 160 x 180

# mask codes
M_DIRT, M_ASPHALT, M_PATH, M_TREE, M_VEHICLE, M_RUIN, M_OBS = range(7)
CLASS_NAME = {
    M_DIRT: "BUILDABLE",
    M_ASPHALT: "BLOCKED_ROAD",
    M_PATH: "BLOCKED_DIRT_PATH",
    M_TREE: "BLOCKED_TREE",
    M_VEHICLE: "BLOCKED_VEHICLE",
    M_RUIN: "BLOCKED_RUIN",
    M_OBS: "BLOCKED_OBSTACLE",
}
PRIORITY = [M_VEHICLE, M_RUIN, M_TREE, M_OBS, M_ASPHALT, M_PATH, M_DIRT]


def rng(seed=13):
    return random.Random(seed)


def load_rgb(p):
    return Image.open(p).convert("RGB")


def load_rgba(p):
    im = Image.open(p).convert("RGBA")
    # near-black backdrop -> transparent
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 0 and r < 18 and g < 18 and b < 18:
                px[x, y] = (r, g, b, 0)
    return im


def tile(src, w, h, ox=0, oy=0):
    out = Image.new("RGB", (w, h))
    sw, sh = src.size
    y = -oy
    while y < h:
        x = -ox
        while x < w:
            out.paste(src, (x, y))
            x += sw
        y += sh
    return out


def lerp(a, b, t):
    return a + (b - a) * t


def col_px(c):
    return int(c * CW)


def row_px(r):
    return int(r * CH)


def cell_center(c, r):
    return (int((c + 0.5) * CW), int((r + 0.5) * CH))


def paste_rgba(base, sprite, cx, cy, scale, mask=None, code=None, rot=0):
    sp = sprite.copy()
    if rot:
        sp = sp.rotate(rot, resample=Image.Resampling.BICUBIC, expand=True)
    nw = max(8, int(sp.width * scale))
    nh = max(8, int(sp.height * scale))
    sp = sp.resize((nw, nh), Image.Resampling.LANCZOS)
    x = int(cx - nw / 2)
    y = int(cy - nh * 0.72)
    base.paste(sp, (x, y), sp)
    if mask is not None and code is not None:
        # block around the trunk/body, not the full tall sprite
        bw, bh = int(nw * 0.55), int(nh * 0.28)
        bx = int(cx - bw / 2)
        by = int(cy - bh * 0.15)
        ImageDraw.Draw(mask).ellipse([bx, by, bx + bw, by + bh], fill=code)


def stroke_poly(draw_img, draw_mask, pts, width, fill_img, fill_mask, jitter=0):
    d = ImageDraw.Draw(draw_img)
    m = ImageDraw.Draw(draw_mask)
    if jitter:
        rnd = rng(7)
        pts = [(x + rnd.randint(-jitter, jitter), y + rnd.randint(-jitter, jitter)) for x, y in pts]
    d.line(pts, fill=fill_img, width=width, joint="curve")
    m.line(pts, fill=fill_mask, width=width, joint="curve")


def bezier(p0, p1, p2, n=48):
    pts = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0]
        y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]
        pts.append((int(x), int(y)))
    return pts


def lr_gradient():
    g = Image.new("L", (W, 1))
    gp = g.load()
    for x in range(W):
        t = x / (W - 1)
        if t < 0.40:
            v = 0
        elif t < 0.58:
            v = int(255 * (t - 0.40) / 0.18)
        else:
            v = 255
        gp[x, 0] = v
    return g.resize((W, H), Image.Resampling.BILINEAR)


def build_ground():
    dirt = load_rgb(ART / "terrain" / "colony-dirt.png")
    dust = load_rgb(ART / "terrain" / "colony-dust-v1.png")
    iso = load_rgb(ART / "terrain" / "colony-iso-world-v3.png")
    dirt = ImageEnhance.Color(dirt).enhance(0.72)
    dirt = ImageEnhance.Contrast(dirt).enhance(1.08)
    left = tile(dirt, W, H, 40, 18)
    mid = tile(iso, W, H, 220, 80)
    mid = ImageEnhance.Color(mid).enhance(0.45)
    right = tile(dust, W, H, 90, 40)
    right = ImageEnhance.Color(right).enhance(0.5)
    right = ImageEnhance.Brightness(right).enhance(0.92)
    cool = Image.new("RGB", (W, H), (70, 78, 82))
    right = Image.blend(right, cool, 0.18)
    blended = Image.composite(right, left, lr_gradient())
    out = Image.blend(blended, mid, 0.08)
    return out


def paint_dirt_track(img, mask, pts, width):
    """Camino de tierra integrado: rodadas, no un marcador plano."""
    m = ImageDraw.Draw(mask)
    m.line(pts, fill=M_PATH, width=max(width, int(CW * 0.55)), joint="curve")
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.line(pts, fill=(96, 80, 60, 110), width=width, joint="curve")
    d.line(pts, fill=(118, 100, 76, 70), width=max(10, width - 16), joint="curve")
    off = max(3, width // 7)
    d.line([(x, y - off) for x, y in pts], fill=(72, 58, 42, 140), width=2, joint="curve")
    d.line([(x, y + off) for x, y in pts], fill=(68, 54, 40, 140), width=2, joint="curve")
    layer = layer.filter(ImageFilter.GaussianBlur(0.8))
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


def paint_roads(img, mask):
    rnd = rng(21)
    # Asfalto SOLO en la fila 4 (tercio inferior), con una onda suave.
    y0 = int(3.50 * CH)
    pts = []
    for i in range(0, W + 1, 32):
        wave = math.sin(i / 520.0) * 14 + math.sin(i / 210.0) * 7
        dip = 10 if i < 480 else 0
        rise = -8 if i > 3100 else 0
        pts.append((i, int(y0 + wave + dip + rise)))
    asphalt_w = int(CH * 0.52)
    stroke_poly(img, mask, pts, asphalt_w + 8, (40, 40, 42), M_ASPHALT)
    stroke_poly(img, mask, pts, asphalt_w, (56, 54, 52), M_ASPHALT)

    d = ImageDraw.Draw(img)
    stroke_poly(img, mask, [(x, y - asphalt_w // 2 + 3) for x, y in pts[::2]], 5, (84, 74, 58), M_ASPHALT)
    stroke_poly(img, mask, [(x, y + asphalt_w // 2 - 3) for x, y in pts[::2]], 5, (78, 70, 56), M_ASPHALT)

    for _ in range(70):
        i = rnd.randrange(len(pts))
        x, y = pts[i]
        x += rnd.randint(-30, 30)
        y += rnd.randint(-asphalt_w // 3, asphalt_w // 3)
        d.line([(x, y), (x + rnd.randint(-40, 40), y + rnd.randint(-12, 12))], fill=(30, 30, 28), width=1)
    for _ in range(18):
        i = rnd.randrange(len(pts))
        x, y = pts[i]
        rw, rh = rnd.randint(10, 28), rnd.randint(6, 14)
        d.ellipse([x - rw, y - rh, x + rw, y + rh], fill=(36, 34, 32))

    dash = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dd = ImageDraw.Draw(dash)
    for i in range(8, len(pts) - 8, 6):
        x0, y0_ = pts[i]
        x1, y1 = pts[i + 2]
        dd.line([(x0, y0_), (x1, y1)], fill=(210, 200, 170, 38), width=3)
    img = Image.alpha_composite(img.convert("RGBA"), dash).convert("RGB")

    path_w = int(CW * 0.38)
    img = paint_dirt_track(img, mask, bezier((int(7.12 * CW), 8), (int(7.40 * CW), int(2.4 * CH)), (int(6.92 * CW), H - 8), 36), path_w)
    img = paint_dirt_track(img, mask, bezier((int(16.15 * CW), 6), (int(15.75 * CW), int(3.1 * CH)), (int(16.28 * CW), H - 6), 36), path_w)
    img = paint_dirt_track(img, mask, bezier((int(3.4 * CW), int(3.15 * CH)), (int(3.55 * CW), int(2.2 * CH)), (int(3.2 * CW), int(1.55 * CH)), 12), int(path_w * 0.8))
    img = paint_dirt_track(img, mask, bezier((int(20.1 * CW), int(4.35 * CH)), (int(20.4 * CW), int(4.9 * CH)), (int(21.2 * CW), int(5.45 * CH)), 12), int(path_w * 0.8))

    d = ImageDraw.Draw(img)
    for _ in range(50):
        x = rnd.randint(0, W - 1)
        y = rnd.randint(0, H - 1)
        if mask.getpixel((x, y)) == M_PATH:
            d.line([(x, y), (x + rnd.randint(-14, 14), y + rnd.randint(-5, 5))], fill=(100, 82, 60), width=1)
    return img


def stamp_cell(mask, c, r, code):
    x0, y0 = int(c * CW), int(r * CH)
    ImageDraw.Draw(mask).ellipse(
        [x0 + CW * 0.18, y0 + CH * 0.22, x0 + CW * 0.82, y0 + CH * 0.82],
        fill=code,
    )


def draw_small_ruin(img, mask, cells, brick=(124, 78, 56)):
    """Restos bajos e irregulares. No es una casa ni un edificio de jugador."""
    xs = [col_px(c) for c, r in cells]
    ys = [row_px(r) for c, r in cells]
    x0, y0 = min(xs) + 10, min(ys) + 28
    x1, y1 = max(xs) + int(CW) - 12, max(ys) + int(CH) - 14
    d = ImageDraw.Draw(img)
    m = ImageDraw.Draw(mask)
    m.rectangle([x0, y0, x1, y1], fill=M_RUIN)
    rnd = rng(int(x0) + 3)
    # muro en L, hundido
    d.polygon(
        [
            (x0, y1 - 18),
            (x0, y0 + 20),
            (x0 + 22, y0 + 8),
            (x0 + 28, y0 + 36),
            (x0 + 18, y1 - 8),
        ],
        fill=brick,
    )
    d.polygon(
        [
            (x0 + 8, y1 - 22),
            (x1 - 24, y1 - 30),
            (x1 - 10, y1 - 8),
            (x0 + 6, y1 - 4),
        ],
        fill=(96, 62, 46),
    )
    for _ in range(22):
        rx = rnd.randint(x0 - 8, x1)
        ry = rnd.randint(y0 + 10, y1 + 8)
        rw = rnd.randint(7, 20)
        d.rectangle(
            [rx, ry, rx + rw, ry + rnd.randint(4, 10)],
            fill=(rnd.randint(88, 118), rnd.randint(58, 78), rnd.randint(42, 58)),
        )


def draw_fence(img, mask, x0, y0, x1, y1):
    d = ImageDraw.Draw(img)
    m = ImageDraw.Draw(mask)
    m.rectangle([x0, y0, x1, y1], fill=M_OBS)
    posts = list(range(x0, x1, 28))
    for i, x in enumerate(posts):
        if i in (2, 5):
            continue  # broken gaps
        d.rectangle([x, y0, x + 6, y1], fill=(92, 68, 42))
        d.rectangle([x + 1, y0, x + 3, y1], fill=(130, 98, 62))
    d.line([(x0, y0 + 10), (x1 - 20, y0 + 12)], fill=(108, 82, 52), width=4)
    d.line([(x0 + 8, y1 - 14), (x1 - 40, y1 - 16)], fill=(100, 76, 48), width=3)


def draw_post(img, mask, cx, cy):
    d = ImageDraw.Draw(img)
    m = ImageDraw.Draw(mask)
    m.ellipse([cx - 16, cy - 10, cx + 16, cy + 14], fill=M_OBS)
    d.polygon([(cx - 5, cy + 10), (cx + 5, cy + 10), (cx + 3, cy - 52), (cx - 3, cy - 52)], fill=(58, 52, 46))
    d.ellipse([cx - 7, cy - 58, cx + 7, cy - 46], fill=(70, 64, 56))


def draw_scrap_blob(img, mask, cx, cy):
    d = ImageDraw.Draw(img)
    m = ImageDraw.Draw(mask)
    m.ellipse([cx - 38, cy - 22, cx + 42, cy + 26], fill=M_OBS)
    d.ellipse([cx - 36, cy - 16, cx + 40, cy + 22], fill=(86, 70, 54))
    d.polygon([(cx - 20, cy), (cx - 4, cy - 18), (cx + 16, cy - 8), (cx + 8, cy + 12)], fill=(110, 78, 52))
    d.rectangle([cx + 6, cy - 6, cx + 28, cy + 10], fill=(72, 78, 70))


def classify_cells(mask):
    cells = {}
    pix = mask.load()
    for r in range(NR):
        for c in range(NC):
            x0, y0 = int(c * CW), int(r * CH)
            x1, y1 = int((c + 1) * CW), int((r + 1) * CH)
            counts = [0] * 7
            step = 4
            n = 0
            for y in range(y0, y1, step):
                for x in range(x0, x1, step):
                    counts[pix[min(x, W - 1), min(y, H - 1)]] += 1
                    n += 1
            chosen = M_DIRT
            for code in PRIORITY:
                frac = counts[code] / n
                if code == M_DIRT:
                    continue
                thresh = 0.16 if code in (M_TREE, M_VEHICLE, M_RUIN, M_OBS) else 0.28
                if frac >= thresh:
                    chosen = code
                    break
            else:
                # majority among remaining
                chosen = max(range(7), key=lambda k: counts[k])
            cid = f"{COLS[c]}{ROWS[r]}"
            klass = CLASS_NAME[chosen]
            blocked = chosen != M_DIRT
            sector = "west_rural" if c < 8 else ("core" if c < 16 else "east_periurban")
            terrain = {
                M_DIRT: "dirt",
                M_ASPHALT: "road",
                M_PATH: "dirt_path",
                M_TREE: "trees",
                M_VEHICLE: "vehicle",
                M_RUIN: "ruin",
                M_OBS: "obstacle",
            }[chosen]
            cells[cid] = {
                "id": cid,
                "col": COLS[c],
                "row": ROWS[r],
                "terrain": terrain,
                "occupancy": klass,
                "occupied": blocked,
                "blocked": blocked,
                "buildable": not blocked,
                "allows": {
                    "farm": not blocked,
                    "building": not blocked,
                    "infra": not blocked,
                },
                "tags": [] if not blocked else [terrain],
                "reason": None if not blocked else terrain,
                "landmark": None,
                "sector": sector,
                "road": chosen in (M_ASPHALT, M_PATH),
                "vegetation": chosen == M_TREE,
                "ruins": chosen == M_RUIN,
            }
    return cells


def pack_footprints(cells):
    taken = set()

    def free(c, r, w, h):
        ids = []
        for rr in range(r, r + h):
            for cc in range(c, c + w):
                if cc < 0 or cc >= NC or rr < 1 or rr > NR:
                    return None
                cid = f"{COLS[cc]}{rr}"
                if cid in taken or not cells[cid]["buildable"]:
                    return None
                ids.append(cid)
        return ids

    def place(name, w, h, prefer_cols=None):
        cols = prefer_cols if prefer_cols is not None else range(NC)
        for r in range(1, NR + 1):
            for c in cols:
                ids = free(c, r, w, h)
                if ids:
                    taken.update(ids)
                    return {"name": name, "w": w, "h": h, "anchor": ids[0], "cells": ids}
        return None

    placed = []
    specs = [
        ("edificio_grande", 3, 3, range(8, 15)),
        ("taller", 3, 2, range(17, 22)),
        ("huerto_1", 2, 3, range(2, 7)),
        ("casa_1", 2, 2, range(0, 7)),
        ("casa_2", 2, 2, range(0, 7)),
        ("casa_3", 2, 2, range(8, 15)),
        ("casa_4", 2, 2, range(8, 15)),
        ("casa_5", 2, 2, range(16, 24)),
        ("casa_6", 2, 2, range(16, 24)),
        ("huerto_2", 2, 2, range(9, 16)),
        ("huerto_3", 2, 2, range(16, 24)),
        ("pozo", 1, 1, range(8, 16)),
    ]
    for name, w, h, pref in specs:
        hit = place(name, w, h, pref) or place(name, w, h)
        if hit:
            placed.append(hit)
    return placed, taken


def font(size):
    for p in (
        r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\segoeui.ttf",
    ):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


def overlay_grid(base, cells=None):
    im = base.convert("RGBA")
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer, "RGBA")
    f = font(18)
    for c in range(NC + 1):
        x = int(c * CW)
        d.line([(x, 0), (x, H)], fill=(255, 220, 140, 120), width=1)
    for r in range(NR + 1):
        y = int(r * CH)
        d.line([(0, y), (W, y)], fill=(255, 220, 140, 120), width=1)
    for c, L in enumerate(COLS):
        d.text((int((c + 0.5) * CW), 10), L, fill=(255, 232, 170, 255), font=f, anchor="mt")
    for r in range(NR):
        d.text((16, int((r + 0.5) * CH)), str(ROWS[r]), fill=(255, 232, 170, 255), font=f, anchor="mm")
    return Image.alpha_composite(im, layer).convert("RGB")


FILL = {
    "BUILDABLE": (40, 180, 70, 92),
    "BLOCKED_ROAD": (70, 70, 75, 110),
    "BLOCKED_DIRT_PATH": (160, 130, 70, 90),
    "BLOCKED_TREE": (20, 70, 30, 100),
    "BLOCKED_VEHICLE": (180, 90, 30, 110),
    "BLOCKED_RUIN": (140, 70, 40, 110),
    "BLOCKED_OBSTACLE": (110, 80, 40, 100),
}


def overlay_occupancy(base, cells):
    im = base.convert("RGBA")
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer, "RGBA")
    for r in range(NR):
        for c in range(NC):
            cid = f"{COLS[c]}{ROWS[r]}"
            x0, y0 = int(c * CW), int(r * CH)
            d.rectangle([x0, y0, x0 + CW, y0 + CH], fill=FILL[cells[cid]["occupancy"]])
    grid = overlay_grid(Image.alpha_composite(im, layer).convert("RGB"))
    return grid


FOOT_COLOR = {
    "casa": (70, 140, 220, 150),
    "huerto": (90, 170, 50, 150),
    "pozo": (70, 160, 190, 160),
    "edificio": (180, 120, 50, 155),
    "taller": (160, 90, 160, 150),
}


def overlay_buildings(base, placed):
    im = base.convert("RGBA")
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer, "RGBA")
    f = font(16)
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
        color = FOOT_COLOR[key]
        ids = p["cells"]
        xs, ys = [], []
        for cid in ids:
            c = COLS.index(cid[0])
            r = int(cid[1:]) - 1
            xs += [c * CW, (c + 1) * CW]
            ys += [r * CH, (r + 1) * CH]
        box = [min(xs) + 6, min(ys) + 6, max(xs) - 6, max(ys) - 6]
        d.rounded_rectangle(box, 10, fill=color, outline=(255, 255, 230, 200), width=2)
        label = f"{name} {p['w']}x{p['h']}"
        d.text(((box[0] + box[2]) / 2, (box[1] + box[3]) / 2), label, fill=(255, 255, 240, 255), font=f, anchor="mm")
    gridded = overlay_grid(base).convert("RGBA")
    return Image.alpha_composite(gridded, layer).convert("RGB")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    print("ground...")
    img = build_ground()
    mask = Image.new("L", (W, H), M_DIRT)

    print("roads...")
    img = paint_roads(img, mask)

    print("props...")
    car = load_rgba(ART / "props" / "car-wreck.png")
    tree = load_rgba(ART / "props" / "tree-dead.png")
    scrap = load_rgba(ART / "props" / "scrap-pile.png")

    # ruinas pequeñas = escombros, no cajas ni HQ
    paste_rgba(img, scrap, *cell_center(0, 0), 0.30, mask, M_RUIN, rot=-18)
    paste_rgba(img, scrap, int(1.15 * CW), int(0.72 * CH), 0.22, mask, M_RUIN, rot=25)
    stamp_cell(mask, 0, 0, M_RUIN)
    stamp_cell(mask, 1, 0, M_RUIN)
    paste_rgba(img, scrap, *cell_center(22, 5), 0.28, mask, M_RUIN, rot=12)
    paste_rgba(img, scrap, *cell_center(23, 5), 0.20, mask, M_RUIN, rot=-8)
    stamp_cell(mask, 22, 5, M_RUIN)
    stamp_cell(mask, 23, 5, M_RUIN)

    # fence remnant south of road, far left
    draw_fence(img, mask, int(0.15 * CW), int(4.15 * CH), int(2.2 * CW), int(4.55 * CH))
    draw_post(img, mask, *cell_center(20, 2))  # U3
    draw_post(img, mask, *cell_center(22, 4))  # W5
    draw_scrap_blob(img, mask, *cell_center(5, 5))  # F6

    # trees at parcel edges
    for (c, r, sc, rot) in [
        (0, 1, 0.28, -8),
        (6, 0, 0.26, 6),
        (23, 2, 0.25, 10),
        (7, 5, 0.23, 0),
    ]:
        paste_rgba(img, tree, *cell_center(c, r), sc, mask, M_TREE, rot)

    # vehicles on/near the asphalt — scale vs cell (~160px) so a car is ~1.5 cells
    cx, cy = cell_center(2, 3)  # C4
    paste_rgba(img, car, cx + 20, cy + 8, 0.34, mask, M_VEHICLE, rot=-6)
    # second vehicle, industrial right, slightly larger / greener
    van = ImageEnhance.Color(car).enhance(0.7)
    van = ImageEnhance.Brightness(van).enhance(0.9)
    vx, vy = cell_center(15, 3)  # P4
    paste_rgba(img, van, vx - 10, vy + 4, 0.38, mask, M_VEHICLE, rot=18)

    scrap_s = scrap
    paste_rgba(img, scrap_s, *cell_center(18, 4), 0.22, mask, M_OBS, rot=12)  # S5

    # Forzar ocupación de la celda del tronco/prop (el sprite es más alto que la celda)
    for c, r in [(0, 1), (6, 0), (23, 2), (7, 5)]:
        stamp_cell(mask, c, r, M_TREE)
    for c, r in [(2, 3), (3, 3), (14, 3), (15, 3)]:
        stamp_cell(mask, c, r, M_VEHICLE)
    stamp_cell(mask, 5, 5, M_OBS)  # F6 scrap blob
    stamp_cell(mask, 18, 4, M_OBS)  # S5
    stamp_cell(mask, 20, 2, M_OBS)
    stamp_cell(mask, 22, 4, M_OBS)
    # Caminos verticales: que dividan parcelas también al sur de la carretera
    for r in (0, 1, 2, 4):
        stamp_cell(mask, 7, r, M_PATH)
        stamp_cell(mask, 16, r, M_PATH)
    stamp_cell(mask, 16, 5, M_PATH)

    # Marcas de aparcamiento muy tenues a la derecha (solo identidad visual, no bloquean)
    park = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(park)
    for i in range(4):
        x = int(18.4 * CW) + i * 28
        y = int(1.35 * CH)
        pd.line([(x, y), (x + 18, y + 48)], fill=(180, 180, 170, 28), width=2)
    img = Image.alpha_composite(img.convert("RGBA"), park).convert("RGB")

    # grit overlay
    img = ImageEnhance.Contrast(img).enhance(1.04)
    img = img.filter(ImageFilter.UnsharpMask(radius=1, percent=40, threshold=2))

    clean_path = OUT / "01-scene-v2-clean.png"
    img.save(clean_path, "PNG", optimize=True)
    print("saved", clean_path, img.size)

    print("classify...")
    cells = classify_cells(mask)
    n_build = sum(1 for c in cells.values() if c["buildable"])
    print("buildable", n_build, "/", NC * NR)

    placed, taken = pack_footprints(cells)
    for p in placed:
        print(" ", p["name"], p["anchor"], p["w"], "x", p["h"], len(p["cells"]))

    grid_img = overlay_grid(img)
    grid_img.save(OUT / "02-scene-v2-debug-grid.png", "PNG", optimize=True)

    occ = overlay_occupancy(img, cells)
    # legend strip
    occ2 = Image.new("RGB", (W, H + 46), (18, 16, 12))
    occ2.paste(occ, (0, 0))
    d = ImageDraw.Draw(occ2)
    f = font(16)
    legend = [
        ("Tierra edificable", FILL["BUILDABLE"][:3]),
        ("Carretera", FILL["BLOCKED_ROAD"][:3]),
        ("Camino tierra", FILL["BLOCKED_DIRT_PATH"][:3]),
        ("Árbol", FILL["BLOCKED_TREE"][:3]),
        ("Vehículo", FILL["BLOCKED_VEHICLE"][:3]),
        ("Ruina", FILL["BLOCKED_RUIN"][:3]),
        ("Obstáculo", FILL["BLOCKED_OBSTACLE"][:3]),
    ]
    x = 20
    for lab, col in legend:
        d.rectangle([x, H + 12, x + 18, H + 30], fill=col)
        d.text((x + 24, H + 21), lab, fill=(230, 220, 200), font=f, anchor="lm")
        x += 18 + 8 + int(f.getlength(lab)) + 28
    occ2.save(OUT / "03-scene-v2-occupancy.png", "PNG", optimize=True)

    test = overlay_buildings(overlay_grid(img), placed)
    cap = ImageDraw.Draw(test)
    cap.text(
        (24, H - 28),
        f"DEBUG footprints — {len(placed)} piezas · {n_build}/{NC*NR} celdas edificables · el jugador no ve esto",
        fill=(255, 236, 190),
        font=font(18),
    )
    test.save(OUT / "04-scene-v2-building-test.png", "PNG", optimize=True)

    payload = {
        "id": "pilot-v2",
        "title": "Escena piloto v2 — mapa horizontal, cuadrícula lógica invisible",
        "note": (
            "Arte primero, rejilla después. El fondo NO incluye HQ ni edificios de jugador. "
            "El jugador nunca ve la cuadrícula. No está integrado en el juego. "
            "Referencia de composición: 00-referencia-chatgpt-mapa-horizontal.png (no copiada literalmente)."
        ),
        "image": "01-scene-v2-clean.png",
        "image_size": [W, H],
        "viewport_concept": "Dos pantallas landscape (~1920x1080) una al lado de la otra. Pan principal izquierda-derecha.",
        "grid": {
            "cols": COLS,
            "rows": ROWS,
            "origin": "A1 = noroeste (arriba-izquierda)",
            "cell_px_approx": [round(CW, 1), round(CH, 1)],
            "debug_only": True,
        },
        "sectors": {
            "west_rural": "Izquierda: terreno seco, carretera, coche, ruina pequeña, caminos de tierra.",
            "core": "Centro: grandes explanadas de tierra divididas por caminos.",
            "east_periurban": "Derecha: suelo más gris/periférico, sigue habiendo mucha tierra edificable.",
        },
        "footprints_demo": {
            "well": {"w": 1, "h": 1},
            "house_small": {"w": 2, "h": 2},
            "farm": {"w": 2, "h": 2},
            "farm_long": {"w": 2, "h": 3},
            "workshop": {"w": 3, "h": 2},
            "large": {"w": 3, "h": 3},
        },
        "stats": {
            "cells_total": NC * NR,
            "buildable": n_build,
            "blocked": NC * NR - n_build,
            "buildable_pct": round(100.0 * n_build / (NC * NR), 1),
            "demo_pieces": len(placed),
            "demo_cells_used": len(taken),
            "buildable_left_after_demo": n_build - len(taken),
        },
        "building_test": placed,
        "cells": cells,
    }
    (OUT / "map_grid_v2.json").write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print("json ok")

    DRIVE.mkdir(parents=True, exist_ok=True)
    names = [
        "01-scene-v2-clean.png",
        "02-scene-v2-debug-grid.png",
        "03-scene-v2-occupancy.png",
        "04-scene-v2-building-test.png",
        "map_grid_v2.json",
    ]
    for name in names:
        src = OUT / name
        dst = DRIVE / name
        dst.write_bytes(src.read_bytes())
        print("drive", name, dst.stat().st_size)


if __name__ == "__main__":
    main()
