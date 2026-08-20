"""
Capturas de evidencia de la migración al juego real.
Simula el comportamiento del SVG migrado:
- Fondo = mapa maestro A+B (4096x2720)
- Cámara centrada en NUCLEUS (2600, 380)
- zoom=1.0 — sin fit, sin contain
- 3 viewports: portrait, landscape, desktop
- Overlay de info de debug (como el juego mostraría)
"""
import os
from PIL import Image, ImageDraw

MAP  = r"W:\juegos\zona-zero\dev\harness-camera\mapa-4096x2720-B-real.png"
OUT  = r"W:\juegos\zona-zero\dev\harness-camera"

WORLD_W, WORLD_H = 4096, 2720
NUCLEUS_X, NUCLEUS_Y = 2600, 380
ZOOM = 1.0

VIEWPORTS = [
    ("portrait",  390,  844),
    ("landscape",  844,  390),
    ("desktop",  1366,  768),
]

mapa = Image.open(MAP).convert("RGB")

def clamp(v, a, b): return max(a, min(b, v))

def render(name, vp_w, vp_h):
    zoom = ZOOM
    half_w = (vp_w / 2) / zoom
    half_h = (vp_h / 2) / zoom
    cx = clamp(NUCLEUS_X, half_w, WORLD_W - half_w)
    cy = clamp(NUCLEUS_Y, half_h, WORLD_H - half_h)

    x0 = round(cx - half_w)
    y0 = round(cy - half_h)
    x1 = x0 + vp_w
    y1 = y0 + vp_h

    crop = mapa.crop((x0, y0, x1, y1))
    if crop.size != (vp_w, vp_h):
        crop = crop.resize((vp_w, vp_h), Image.NEAREST)

    draw = ImageDraw.Draw(crop)

    # Overlay de gameplay (simulado): fondo semitransparente
    overlay = Image.new("RGBA", (vp_w, vp_h), (0,0,0,0))
    od = ImageDraw.Draw(overlay)

    # Zona de núcleo: círculo amarillo (camp marker)
    nx = round((NUCLEUS_X - x0) * zoom)
    ny = round((NUCLEUS_Y - y0) * zoom)
    if 0 <= nx < vp_w and 0 <= ny < vp_h:
        # Halo del camp (como en el juego)
        r_halo = 55
        od.ellipse([nx-r_halo,ny-r_halo,nx+r_halo,ny+r_halo],
                   fill=(100,160,80,30), outline=(180,220,120,120), width=2)
        # Marker central
        od.ellipse([nx-8,ny-8,nx+8,ny+8], fill=(220,190,80,200), outline=(255,230,100,255), width=2)
        od.text((nx+12, ny-6), "REFUGIO CENTRAL", fill=(240,220,100,255))

    # HUD superior (dock) — simulado
    od.rectangle([0,0,vp_w,36], fill=(10,12,10,180))
    od.text((8,10), "ZONA ZERO  |  Dia 1  |  Poblacion: 4", fill=(180,200,160,255))

    # HUD inferior (dock) — simulado
    od.rectangle([0,vp_h-44,vp_w,vp_h], fill=(10,12,10,200))
    vis_w = round(vp_w / zoom)
    vis_h = round(vp_h / zoom)
    debug_txt = (f"[CAM] x:{round(cx)} y:{round(cy)}  zoom:{zoom:.2f}x  "
                 f"visible:{vis_w}x{vis_h}px mundo  WORLD:4096x2720")
    od.text((8,vp_h-32), debug_txt, fill=(120,200,120,255))

    # Componer
    crop_rgba = crop.convert("RGBA")
    crop_rgba = Image.alpha_composite(crop_rgba, overlay)
    out_img = crop_rgba.convert("RGB")

    # Etiqueta viewport y borde
    d2 = ImageDraw.Draw(out_img)
    d2.rectangle([0,0,vp_w-1,vp_h-1], outline=(80,140,80), width=2)

    path = os.path.join(OUT, f"game-cap-{name}.png")
    out_img.save(path)
    print(f"OK {path}")
    return out_img

captures = []
for name, w, h in VIEWPORTS:
    img = render(name, w, h)
    captures.append((name, img, w, h))

# Montaje comparativo
MAX_W = max(w for _,_,w,_ in captures)
PAD = 16
total_h = sum(h for _,_,_,h in captures) + PAD*(len(captures)+1) + 36
montage = Image.new("RGB", (MAX_W+PAD*2, total_h), (8,10,8))
draw = ImageDraw.Draw(montage)
draw.text((PAD, 10), "ZONA ZERO — Camara migrada 4096x2720  |  zoom=1.0  |  portrait / landscape / desktop", fill=(180,230,180))
y = 46
for name, img, w, h in captures:
    montage.paste(img, (PAD, y))
    y += h + PAD
montage.save(os.path.join(OUT, "game-montaje-3viewports.png"))
print("OK montaje final")
