# -*- coding: utf-8 -*-
"""
Genera el Bloque B del mapa Zona Zero.
- Mismas texturas y escala que el Bloque A (mapa maestro 4096x1360).
- Composicion diferente: caminos distintos, parcelas distintas, vegetacion variada.
- Blending de costura con el borde inferior del Bloque A.
- Produce: mapa-4096x2720-B-real.png (A intacto arriba + B nuevo abajo).
"""
from __future__ import annotations
import math, random
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

ROOT  = Path(r"W:\juegos\zona-zero")
ART   = ROOT / "assets" / "art"
OUT   = Path(r"W:\juegos\zona-zero\dev\harness-camera")
MAP_A = ROOT / "docs" / "map-grid-pilot" / "approved-master" / "00-MAPA_MAESTRO_APROBADO.png"

W, H = 4096, 1360  # tamano de cada bloque — identico a A

M_DIRT, M_PATH = 0, 2

def rng(seed=99): return random.Random(seed)

def load_rgb(p): return Image.open(p).convert("RGB")
def load_rgba(p): return Image.open(p).convert("RGBA")

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

def clamp(v, a, b): return max(a, min(b, v))

# ── GROUND ─────────────────────────────────────────────────────────────────
def build_ground_b():
    """
    Mismo proceso que build_ground() del original.
    Usa EXACTAMENTE las mismas texturas y misma logica de mezcla.
    Solo cambian los offsets de tile para variar el patron, NO la paleta.
    """
    dirt = load_rgb(ART / "terrain" / "colony-dirt.png")
    dust = load_rgb(ART / "terrain" / "colony-dust-v1.png")
    iso  = load_rgb(ART / "terrain" / "colony-iso-world-v3.png")

    # Mismos ajustes de color que el original
    dirt = ImageEnhance.Color(dirt).enhance(0.72)
    dirt = ImageEnhance.Contrast(dirt).enhance(1.08)

    # Offsets distintos para variar el patron sin cambiar la paleta
    left  = tile(dirt, W, H, ox=200, oy=240)
    mid   = tile(iso,  W, H, ox=380, oy=140)
    mid   = ImageEnhance.Color(mid).enhance(0.45)
    right = tile(dust, W, H, ox=280, oy=110)
    right = ImageEnhance.Color(right).enhance(0.50)
    right = ImageEnhance.Brightness(right).enhance(0.92)

    # Gradiente lateral IDENTICO al original — misma familia visual
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
    grad = g.resize((W, H), Image.Resampling.BILINEAR)

    # Mismo tono frio del original (70,78,82)
    cool = Image.new("RGB", (W, H), (70, 78, 82))
    right = Image.blend(right, cool, 0.18)
    blended = Image.composite(right, left, grad)
    out = Image.blend(blended, mid, 0.08)
    return out

# ── CAMINOS ────────────────────────────────────────────────────────────────
def bezier(p0, p1, p2, n=48):
    pts = []
    for i in range(n + 1):
        t = i / n; u = 1 - t
        pts.append((
            int(u*u*p0[0] + 2*u*t*p1[0] + t*t*p2[0]),
            int(u*u*p0[1] + 2*u*t*p1[1] + t*t*p2[1]),
        ))
    return pts

def paint_dirt_track(img, pts, width):
    layer = Image.new("RGBA", (W, H), (0,0,0,0))
    d = ImageDraw.Draw(layer)
    d.line(pts, fill=(96,80,60,115), width=width, joint="curve")
    d.line(pts, fill=(118,100,76,72), width=max(10, width-18), joint="curve")
    off = max(3, width // 7)
    d.line([(x, y-off) for x,y in pts], fill=(72,58,42,140), width=2, joint="curve")
    d.line([(x, y+off) for x,y in pts], fill=(68,54,40,140), width=2, joint="curve")
    layer = layer.filter(ImageFilter.GaussianBlur(0.9))
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")

def paint_wide_track(img, pts, width):
    """Camino mas ancho, secundario — tierra compactada."""
    layer = Image.new("RGBA", (W, H), (0,0,0,0))
    d = ImageDraw.Draw(layer)
    d.line(pts, fill=(88,72,52,130), width=width, joint="curve")
    d.line(pts, fill=(108,90,68,80), width=max(12, width-24), joint="curve")
    layer = layer.filter(ImageFilter.GaussianBlur(1.2))
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")

def add_paths_b(img):
    """
    Caminos del Bloque B.
    Los caminos verticales de A llegan al borde inferior de A (y=1360 del mundo).
    En B esos mismos caminos continuan desde y=0 del bloque (= y=1360 del mundo),
    con pequenas desviaciones plausibles.

    Caminos verticales de A (en coordenadas A, CW=170px col):
      - col ~7  x≈1190   (camino vertical izq)
      - col ~16 x≈2720   (camino vertical der)
    Estos x deben coincidir en el borde superior de B (y=0 de este bloque).
    """
    r = rng(42)

    # ── Caminos verticales que continuan desde A ──
    # Camino izquierdo: x≈1190 en A → continua en B con ligera deriva
    img = paint_dirt_track(img,
        bezier((1190, 0), (1160, H//2), (1195+r.randint(-20,20), H)),
        width=52)

    # Camino derecho: x≈2720 en A → continua
    img = paint_dirt_track(img,
        bezier((2720, 0), (2750, H//2), (2715+r.randint(-20,20), H)),
        width=52)

    # ── Camino horizontal secundario en el tercio superior de B ──
    # (no hay asfalto — tierra compactada)
    y_sec = int(H * 0.30)
    sec_pts = []
    for i in range(0, W+1, 48):
        wave = math.sin(i/480)*18 + math.sin(i/195)*8
        sec_pts.append((i, int(y_sec + wave)))
    img = paint_wide_track(img, sec_pts, width=80)

    # ── Caminos menores diagonales (parcelas) ──
    img = paint_dirt_track(img,
        bezier((0, int(H*0.12)), (int(W*0.18), int(H*0.38)), (int(W*0.32), int(H*0.28))),
        width=38)
    img = paint_dirt_track(img,
        bezier((int(W*0.55), int(H*0.10)), (int(W*0.62), int(H*0.48)), (int(W*0.58), int(H*0.72))),
        width=36)
    img = paint_dirt_track(img,
        bezier((int(W*0.72), int(H*0.20)), (int(W*0.80), int(H*0.60)), (int(W*0.78), H-10)),
        width=36)
    img = paint_dirt_track(img,
        bezier((int(W*0.35), int(H*0.55)), (int(W*0.50), int(H*0.72)), (int(W*0.45), H-8)),
        width=34)

    # ── Camino corto transversal ──
    img = paint_dirt_track(img,
        bezier((int(W*0.32), int(H*0.28)), (int(W*0.44), int(H*0.26)), (int(W*0.56), int(H*0.24))),
        width=32)

    # Detalles de rodadas
    d = ImageDraw.Draw(img)
    for _ in range(60):
        x = r.randint(0, W-1)
        y = r.randint(0, H-1)
        d.line([(x,y),(x+r.randint(-16,16), y+r.randint(-6,6))], fill=(100,82,60), width=1)
    return img

# ── VEGETACION Y PROPS ─────────────────────────────────────────────────────
def paste_rgba_b(base, sprite, cx, cy, scale, rot=0):
    sp = sprite.copy()
    if rot: sp = sp.rotate(rot, resample=Image.Resampling.BICUBIC, expand=True)
    nw = max(8, int(sp.width * scale))
    nh = max(8, int(sp.height * scale))
    sp = sp.resize((nw, nh), Image.Resampling.LANCZOS)
    x = int(cx - nw/2)
    y = int(cy - nh*0.72)
    base.paste(sp, (x,y), sp)

def add_props_b(img):
    tree  = load_rgba(ART / "props" / "tree-dead.png")
    scrap = load_rgba(ART / "props" / "scrap-pile.png")
    car   = load_rgba(ART / "props" / "car-wreck.png")
    r = rng(77)

    # Arboles — principalmente en bordes y esquinas, pocos en centro (espacio buildable)
    tree_positions = [
        # Borde izq
        (r.randint(20,120), r.randint(40,200), 0.55+r.random()*0.25),
        (r.randint(20,100), r.randint(600,800), 0.50+r.random()*0.20),
        (r.randint(30,130), r.randint(1000,1200), 0.55+r.random()*0.20),
        # Borde der
        (W-r.randint(40,180), r.randint(80,300), 0.52+r.random()*0.22),
        (W-r.randint(30,120), r.randint(700,950), 0.48+r.random()*0.20),
        (W-r.randint(50,200), r.randint(1050,1250), 0.55+r.random()*0.20),
        # Grupos perimetrales
        (r.randint(200,420), r.randint(20,80), 0.45+r.random()*0.18),
        (r.randint(1800,2000), r.randint(30,100), 0.42+r.random()*0.18),
        (r.randint(3200,3500), r.randint(40,120), 0.48+r.random()*0.18),
        (r.randint(800,1000), H-r.randint(40,120), 0.50+r.random()*0.18),
        (r.randint(2200,2500), H-r.randint(50,130), 0.52+r.random()*0.18),
        (r.randint(3500,3800), H-r.randint(40,110), 0.48+r.random()*0.18),
        # Algunos interiores aislados (bordes de parcela)
        (r.randint(350,550), r.randint(380,480), 0.40+r.random()*0.16),
        (r.randint(2900,3100), r.randint(550,680), 0.42+r.random()*0.16),
        (r.randint(1400,1600), r.randint(950,1100), 0.38+r.random()*0.15),
    ]
    for cx, cy, sc in tree_positions:
        paste_rgba_b(img, tree, cx, cy, sc, rot=r.randint(-12,12))

    # Chatarra/scrap — solo en bordes, 4-5 piezas
    for _ in range(5):
        cx = r.choice([r.randint(30,200), W-r.randint(30,200)])
        cy = r.randint(100, H-100)
        paste_rgba_b(img, scrap, cx, cy, 0.22+r.random()*0.10, rot=r.randint(-30,30))

    # Coches abandonados — 2-3 en zonas de camino
    for _ in range(3):
        cx = r.choice([1190+r.randint(-60,60), 2720+r.randint(-60,60)])
        cy = r.randint(int(H*0.4), int(H*0.7))
        paste_rgba_b(img, car, cx, cy, 0.32+r.random()*0.10, rot=r.randint(-20,20))

    return img

# ── RUIDO DE SUPERFICIE ────────────────────────────────────────────────────
def add_surface_detail(img):
    """
    Piedras, erosion y variaciones de tierra para dar la misma riqueza visual que A.
    """
    d = ImageDraw.Draw(img)
    r = rng(55)

    # Piedras pequenas (mismo rango de tamano que en A)
    for _ in range(1800):
        x = r.randint(0, W-1)
        y = r.randint(0, H-1)
        w2 = r.randint(3, 22)
        h2 = r.randint(2, 12)
        bright = r.randint(95,155)
        col = (bright + r.randint(-8,8), bright - r.randint(10,25), bright - r.randint(20,40))
        col = tuple(max(0, min(255, c)) for c in col)
        d.ellipse([x, y, x+w2, y+h2], fill=col)

    # Grupos de grava (acumulaciones)
    for _ in range(60):
        gx = r.randint(0, W-80)
        gy = r.randint(0, H-60)
        for _ in range(r.randint(5,14)):
            ox = r.randint(0,80); oy = r.randint(0,60)
            w2 = r.randint(4,16); h2 = r.randint(3,9)
            v = r.randint(100,140)
            d.ellipse([gx+ox, gy+oy, gx+ox+w2, gy+oy+h2], fill=(v, v-18, v-32))

    # Lineas de erosion / rodadas menores
    for _ in range(350):
        x = r.randint(0, W-1)
        y = r.randint(0, H-1)
        d.line([(x,y),(x+r.randint(-40,40), y+r.randint(-10,10))],
               fill=(r.randint(78,112), r.randint(62,90), r.randint(45,70)), width=1)

    # Mancha de tierra mas oscura (variacion de parcela)
    for _ in range(12):
        cx = r.randint(200, W-200)
        cy = r.randint(100, H-100)
        rw = r.randint(80,260); rh = r.randint(50,160)
        patch = Image.new("RGBA", (W, H), (0,0,0,0))
        pd = ImageDraw.Draw(patch)
        col_dark = (r.randint(72,100), r.randint(58,80), r.randint(40,62), r.randint(18,45))
        pd.ellipse([cx-rw, cy-rh, cx+rw, cy+rh], fill=col_dark)
        patch = patch.filter(ImageFilter.GaussianBlur(r.randint(18,38)))
        img = Image.alpha_composite(img.convert("RGBA"), patch).convert("RGB")

    return img

# ── BLENDING DE COSTURA ────────────────────────────────────────────────────
def match_tone_to_a(img_b: Image.Image, bloque_a: Image.Image) -> Image.Image:
    """
    Ajusta el tono global de B para que coincida con el tono promedio de A.
    Calcula el color medio de A y aplica una correccion multiplicativa a B.
    """
    import numpy as np
    a_arr = np.array(bloque_a, dtype=float)
    b_arr = np.array(img_b, dtype=float)

    # Tono medio de A y de B
    mean_a = a_arr.reshape(-1, 3).mean(axis=0)   # [R, G, B]
    mean_b = b_arr.reshape(-1, 3).mean(axis=0)

    # Factor de correccion por canal
    factor = mean_a / np.maximum(mean_b, 1.0)

    # Aplicar correccion (suavizada hacia 1.0 para no sobrepasar)
    factor = np.clip(factor, 0.6, 1.6)
    b_corrected = np.clip(b_arr * factor, 0, 255).astype(np.uint8)
    return Image.fromarray(b_corrected)


def blend_seam(bloque_a: Image.Image, bloque_b: Image.Image, band=400) -> Image.Image:
    """
    Blending costura A/B.
    Estrategia: los primeros `band` px de B se blend con la franja inferior de A.
    Gradiente coseno suave. A queda intacto en disco.
    """
    a = bloque_a.copy()
    b = match_tone_to_a(bloque_b, bloque_a)

    # Mascara gradiente coseno
    mask = Image.new("L", (W, band))
    for y in range(band):
        t = y / (band - 1)
        cos_t = (1 - math.cos(t * math.pi)) / 2
        v = int(cos_t * 255)
        mask.paste(v, (0, y, W, y + 1))

    # Estira la franja inferior de A para cubrir `band` px (puede ser mayor que la franja original)
    # Usamos los últimos `band` px de A
    strip_a_src = a.crop((0, max(0, H - band), W, H))
    if strip_a_src.height < band:
        strip_a_src = strip_a_src.resize((W, band), Image.Resampling.BILINEAR)
    strip_b = b.crop((0, 0, W, band))

    blended = Image.composite(strip_b, strip_a_src, mask)
    b.paste(blended, (0, 0))
    return a, b

# ── MAIN ───────────────────────────────────────────────────────────────────
def main():
    print("Cargando Bloque A...")
    bloque_a = load_rgb(MAP_A)
    if bloque_a.size != (W, H):
        raise ValueError(f"Bloque A tiene tamano inesperado: {bloque_a.size}")

    print("Generando terreno Bloque B...")
    img_b = build_ground_b()

    print("Pintando caminos Bloque B...")
    img_b = add_paths_b(img_b)

    print("Anadiendo detalle de superficie...")
    img_b = add_surface_detail(img_b)

    print("Anadiendo props (vegetacion, chatarra)...")
    img_b = add_props_b(img_b)

    print("Blending de costura...")
    a_blend, b_blend = blend_seam(bloque_a, img_b, band=320)

    print("Componiendo mapa 4096x2720...")
    mundo = Image.new("RGB", (W, H*2))
    mundo.paste(a_blend, (0, 0))
    mundo.paste(b_blend, (0, H))

    out_path = OUT / "mapa-4096x2720-B-real.png"
    mundo.save(out_path, optimize=True)
    print(f"Guardado: {out_path}  {mundo.size}")

    # -- Evidencia 1: mapa completo reducido para revision
    preview_w = 1200
    preview_h = int(1200 * (H*2) / W)
    preview = mundo.resize((preview_w, preview_h), Image.Resampling.LANCZOS)
    d = ImageDraw.Draw(preview)
    # Linea de union en el preview
    seam_y_preview = int(H / (H*2) * preview_h)
    d.line([(0, seam_y_preview), (preview_w, seam_y_preview)], fill=(240,80,80), width=2)
    d.text((8, seam_y_preview+4), "union A/B (blending 140px)", fill=(240,80,80))
    preview.save(OUT / "preview-mundo-completo.png")
    print("Guardado: preview-mundo-completo.png")

    # -- Evidencia 2: closeup de la union
    seam_top    = max(0, H - 220)
    seam_bottom = min(H*2, H + 220)
    closeup = mundo.crop((W//4, seam_top, W*3//4, seam_bottom))
    closeup.save(OUT / "closeup-union-AB.png")
    print("Guardado: closeup-union-AB.png")

    print("Listo.")

if __name__ == "__main__":
    main()
