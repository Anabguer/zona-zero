"""
Capturas harness v2 — mapa-4096x2720-B-real.png
zoom=1.0, sin fit, sin contain, sin cover.
"""
import os
from PIL import Image, ImageDraw

MAP = r"W:\juegos\zona-zero\dev\harness-camera\mapa-4096x2720-B-real.png"
OUT = r"W:\juegos\zona-zero\dev\harness-camera"

WORLD_W, WORLD_H = 4096, 2720
NUCLEUS_X, NUCLEUS_Y = 2600, 380
ZOOM = 1.0

VIEWPORTS = [
    ("portrait",  390,  844),
    ("landscape",  844,  390),
    ("desktop",  1366,  768),
]

mapa = Image.open(MAP).convert("RGB")
assert mapa.size == (WORLD_W, WORLD_H), f"Tamano inesperado: {mapa.size}"

def clamp(v, a, b): return max(a, min(b, v))

def render_viewport(name, vp_w, vp_h):
    zoom = ZOOM
    half_w = (vp_w / 2) / zoom
    half_h = (vp_h / 2) / zoom
    cx = clamp(NUCLEUS_X, half_w, WORLD_W - half_w)
    cy = clamp(NUCLEUS_Y, half_h, WORLD_H - half_h)

    # Recorte exacto — sin resize
    x0 = round(cx - half_w)
    y0 = round(cy - half_h)
    x1 = x0 + vp_w
    y1 = y0 + vp_h
    crop = mapa.crop((x0, y0, x1, y1))
    if crop.size != (vp_w, vp_h):
        crop = crop.resize((vp_w, vp_h), Image.NEAREST)

    draw = ImageDraw.Draw(crop)

    # Marcador nucleo
    nx = round((NUCLEUS_X - x0) * zoom)
    ny = round((NUCLEUS_Y - y0) * zoom)
    if 0 <= nx < vp_w and 0 <= ny < vp_h:
        r = 20
        draw.ellipse([nx-r, ny-r, nx+r, ny+r], outline=(240,208,80), width=3)
        draw.line([nx-r,ny,nx+r,ny], fill=(240,208,80), width=2)
        draw.line([nx,ny-r,nx,ny+r], fill=(240,208,80), width=2)
        draw.text((nx+r+4, ny-8), "NUCLEO", fill=(240,208,80))

    # Barra debug
    bar_h = 40
    draw.rectangle([0, vp_h-bar_h, vp_w, vp_h], fill=(0,0,0))
    vis_w = round(vp_w / zoom)
    vis_h = round(vp_h / zoom)
    info = (f"WORLD:4096x2720  cam({round(cx)},{round(cy)})  "
            f"zoom:{zoom:.2f}x  visible:{vis_w}x{vis_h}px")
    draw.text((6, vp_h-bar_h+12), info, fill=(160,230,160))

    # Etiqueta y borde
    labels = {"portrait":"portrait 390x844","landscape":"landscape 844x390","desktop":"desktop 1366x768"}
    draw.rectangle([0,0,vp_w-1,vp_h-1], outline=(80,130,80), width=2)
    draw.rectangle([0,0,160,20], fill=(0,0,0))
    draw.text((5,4), labels[name], fill=(200,240,120))

    path = os.path.join(OUT, f"cap-{name}.png")
    crop.save(path)
    print(f"OK {path}")
    return crop

captures = []
for name, w, h in VIEWPORTS:
    img = render_viewport(name, w, h)
    captures.append((name, img, w, h))

# Montaje
MAX_W = max(w for _,_,w,_ in captures)
PAD = 16
total_h = sum(h for _,_,_,h in captures) + PAD*(len(captures)+1) + 36
montage = Image.new("RGB", (MAX_W+PAD*2, total_h), (8,10,8))
draw = ImageDraw.Draw(montage)
draw.text((PAD, 10), "HARNESS CAMARA — Zona Zero 4096x2720 B-real  |  zoom=1.0", fill=(180,230,180))
y = 46
for name, img, w, h in captures:
    montage.paste(img, (PAD, y))
    y += h + PAD
montage.save(os.path.join(OUT, "montaje-3viewports.png"))
print("OK montaje")
