# -*- coding: utf-8 -*-
"""Une el mapa maestro aprobado (arriba) con el nuevo mapa ampliado (abajo).

El mapa nuevo tiene 4096x2720 pero solo usamos su mitad inferior (y >= 1360)
como franja nueva, para que coincida en estilo con el maestro aprobado arriba.
"""
from pathlib import Path
from PIL import Image, ImageFilter

OUT = Path(r"W:\juegos\zona-zero\docs\map-grid-pilot")
APPROVED = OUT / "approved-master" / "00-MAPA_MAESTRO_APROBADO.png"
NUEVO = OUT / "01-scene-v2-clean.png"

maestro = Image.open(APPROVED).convert("RGB")  # 4096x1360
nuevo   = Image.open(NUEVO).convert("RGB")      # 4096x2720

W, H = maestro.size  # 4096 x 1360

# Tomamos la mitad inferior del mapa nuevo (misma altura que el maestro)
franja = nuevo.crop((0, H, W, H * 2))  # y=1360 a y=2720

# Costura: difuminar los ultimos 60px del maestro con los primeros 60px de la franja
SEAM = 80
for y in range(SEAM):
    t = y / (SEAM - 1)  # 0 = top (maestro puro), 1 = bottom (franja pura)
    for x in range(0, W, 4):  # cada 4px para velocidad
        rm, gm, bm = maestro.getpixel((x, H - SEAM + y))
        rf, gf, bf = franja.getpixel((x, y))
        r = int(rm * (1 - t) + rf * t)
        g = int(gm * (1 - t) + gf * t)
        b = int(bm * (1 - t) + bf * t)
        franja.putpixel((x, y), (r, g, b))

# Combinar
ampliado = Image.new("RGB", (W, H * 2))
ampliado.paste(maestro, (0, 0))
ampliado.paste(franja,  (0, H))

out_path = OUT / "approved-master" / "00-MAPA-AMPLIADO-4096x2720.png"
ampliado.save(out_path, "PNG", optimize=True)
print(f"Guardado: {out_path}  {ampliado.size}")

# Tambien guardar solo la franja nueva para revision
franja.save(OUT / "approved-master" / "00-franja-inferior-nueva.png", "PNG", optimize=True)
print("Franja guardada.")
