# -*- coding: utf-8 -*-
"""Genera la franja inferior nueva (4096x1360) y la une al mapa maestro aprobado.

El resultado es 00-MAPA-AMPLIADO-4096x2720.png, listo para revision.
No toca el mapa maestro aprobado.
"""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT     = Path(r"W:\juegos\zona-zero")
ART      = ROOT / "assets" / "art"
TERRAIN  = ART / "terrain"
PROPS    = ART / "props"
OUT_DIR  = ROOT / "docs" / "map-grid-pilot" / "approved-master"

W, H = 4096, 1360   # mismas dimensiones que el mapa maestro


# ---------------------------------------------------------------------------
# Utilidades basicas (igual que _gen_v2.py)
# ---------------------------------------------------------------------------

def rng(seed=77):
    return random.Random(seed)


def load_rgb(p):
    return Image.open(p).convert("RGB")


def load_rgba(p):
    im = Image.open(p).convert("RGBA")
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


def bezier(p0, p1, p2, n=48):
    pts = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0]
        y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]
        pts.append((int(x), int(y)))
    return pts


# ---------------------------------------------------------------------------
# Terreno base (igual logica que build_ground de _gen_v2 pero con offsets
# distintos para que no quede identico al tile superior)
# ---------------------------------------------------------------------------

def build_ground_franja():
    dirt = load_rgb(TERRAIN / "colony-dirt.png")
    dust = load_rgb(TERRAIN / "colony-dust-v1.png")
    iso  = load_rgb(TERRAIN / "colony-iso-world-v3.png")
    straw = load_rgb(TERRAIN / "colony-straw-v1.png")

    dirt  = ImageEnhance.Color(dirt).enhance(0.70)
    dirt  = ImageEnhance.Contrast(dirt).enhance(1.06)

    # Offsets diferentes -> pattern distinto al mapa superior
    left  = tile(dirt,  W, H, ox=180, oy=90)
    mid   = tile(iso,   W, H, ox=340, oy=200)
    mid   = ImageEnhance.Color(mid).enhance(0.42)
    right = tile(dust,  W, H, ox=60,  oy=130)
    right = ImageEnhance.Color(right).enhance(0.48)
    right = ImageEnhance.Brightness(right).enhance(0.90)

    # Zona sureste ligeramente mas seca (straw)
    se    = tile(straw, W, H, ox=20, oy=40)
    se    = ImageEnhance.Color(se).enhance(0.35)
    se    = ImageEnhance.Brightness(se).enhance(0.88)

    # Gradiente: izquierda dirt, derecha dust
    grad_lr = Image.new("L", (W, 1))
    gp = grad_lr.load()
    for x in range(W):
        t = x / (W - 1)
        v = int(255 * max(0.0, min(1.0, (t - 0.35) / 0.30)))
        gp[x, 0] = v
    grad_lr = grad_lr.resize((W, H), Image.Resampling.BILINEAR)

    blended = Image.composite(right, left, grad_lr)

    # Toque de straw en esquina inferior derecha
    grad_se = Image.new("L", (W, H), 0)
    gs = ImageDraw.Draw(grad_se)
    gs.ellipse([W * 2 // 3, H // 2, W + 200, H + 200], fill=120)
    grad_se = grad_se.filter(ImageFilter.GaussianBlur(radius=220))
    blended = Image.composite(se, blended, grad_se)

    out = Image.blend(blended, mid, 0.07)
    return out


# ---------------------------------------------------------------------------
# Caminos de tierra (continuan desde el mapa superior)
# ---------------------------------------------------------------------------

def paint_dirt_track(img, pts, width):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.line(pts, fill=(96, 80, 60, 110), width=width, joint="curve")
    d.line(pts, fill=(118, 100, 76, 70), width=max(10, width - 16), joint="curve")
    off = max(3, width // 7)
    d.line([(x, y - off) for x, y in pts], fill=(72, 58, 42, 140), width=2, joint="curve")
    d.line([(x, y + off) for x, y in pts], fill=(68, 54, 40, 140), width=2, joint="curve")
    layer = layer.filter(ImageFilter.GaussianBlur(0.8))
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


def add_paths(img):
    CW = W / 78   # misma cuadricula logica 78 columnas
    path_w = int(CW * 0.38)

    # Continuacion de los dos caminos verticales del mapa superior
    # (col 7 y col 16 aprox en grid de 78 cols)
    img = paint_dirt_track(img,
        bezier((int(7.12 * CW), 0), (int(7.35 * CW), int(0.5 * H)), (int(6.95 * CW), H), 36),
        path_w)
    img = paint_dirt_track(img,
        bezier((int(16.15 * CW), 0), (int(15.85 * CW), int(0.55 * H)), (int(16.20 * CW), H), 36),
        path_w)

    # Camino diagonal que cruza la zona central (nuevo en esta franja)
    img = paint_dirt_track(img,
        bezier((int(20 * CW), 0), (int(35 * CW), int(0.45 * H)), (int(48 * CW), H), 30),
        path_w)

    # Pequeno ramal lateral derecha
    img = paint_dirt_track(img,
        bezier((int(55 * CW), int(0.3 * H)), (int(60 * CW), int(0.65 * H)), (int(62 * CW), H), 14),
        int(path_w * 0.7))

    return img


# ---------------------------------------------------------------------------
# Detalles: piedras, escombros, vegetacion seca
# ---------------------------------------------------------------------------

def add_details(img):
    d = ImageDraw.Draw(img)
    rn = rng(42)

    # Piedras dispersas
    for _ in range(180):
        x = rn.randint(0, W - 1)
        y = rn.randint(0, H - 1)
        rw = rn.randint(4, 18)
        rh = rn.randint(3, 11)
        shade = rn.randint(78, 125)
        d.ellipse([x, y, x + rw, y + rh],
                  fill=(shade, int(shade * 0.82), int(shade * 0.58)))

    # Manchas de hierba seca
    for _ in range(90):
        x = rn.randint(0, W - 40)
        y = rn.randint(0, H - 20)
        for _ in range(rn.randint(3, 7)):
            dx = rn.randint(-12, 12)
            dy = rn.randint(-6, 6)
            d.line([(x + dx, y + dy), (x + dx + rn.randint(-8, 8), y + dy - rn.randint(6, 14))],
                   fill=(88, 82, 44), width=1)

    return img


# ---------------------------------------------------------------------------
# Costura: difumina el borde superior de la franja para que encaje
# ---------------------------------------------------------------------------

def blend_seam(franja: Image.Image, mapa_maestro: Image.Image) -> Image.Image:
    """Aplica un gradiente vertical en el top de la franja para suavizar la union."""
    franja_arr = franja.convert("RGBA")
    maestro_strip = mapa_maestro.crop((0, mapa_maestro.height - 80, W, mapa_maestro.height))
    maestro_strip = maestro_strip.resize((W, 80), Image.Resampling.LANCZOS)

    # Mascara: opaco arriba (muestra maestro), transparente abajo (muestra franja)
    mask = Image.new("L", (W, 80))
    for y in range(80):
        v = int(255 * (1.0 - y / 79.0))
        ImageDraw.Draw(mask).line([(0, y), (W, y)], fill=v)

    blend = Image.composite(maestro_strip.convert("RGBA"),
                             franja_arr.crop((0, 0, W, 80)),
                             mask)
    franja_arr.paste(blend, (0, 0))
    return franja_arr.convert("RGB")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("Generando terreno franja inferior...")
    franja = build_ground_franja()

    print("Anadiendo caminos...")
    franja = add_paths(franja)

    print("Anadiendo detalles...")
    franja = add_details(franja)

    # Toque final de contraste/nitidez igual que el mapa maestro
    franja = ImageEnhance.Contrast(franja).enhance(1.04)
    franja = franja.filter(ImageFilter.UnsharpMask(radius=1, percent=40, threshold=2))

    print("Cargando mapa maestro...")
    maestro = Image.open(OUT_DIR / "00-MAPA_MAESTRO_APROBADO.png").convert("RGB")

    print("Suavizando costura...")
    franja = blend_seam(franja, maestro)

    print("Uniendo mapas...")
    mapa_ampliado = Image.new("RGB", (W, H * 2))
    mapa_ampliado.paste(maestro, (0, 0))
    mapa_ampliado.paste(franja,  (0, H))

    out_path = OUT_DIR / "00-MAPA-AMPLIADO-4096x2720.png"
    mapa_ampliado.save(out_path, "PNG", optimize=True)
    print(f"Guardado: {out_path}  ({mapa_ampliado.size})")

    # Tambien guardamos solo la franja para revision
    franja_path = OUT_DIR / "00-franja-inferior-nueva.png"
    franja.save(franja_path, "PNG", optimize=True)
    print(f"Franja sola: {franja_path}")


if __name__ == "__main__":
    main()
