# -*- coding: utf-8 -*-
"""Renderiza el JSON del editor sobre el mapa de fondo y guarda PNG."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

JSON_PATH = Path(r"W:\juegos\zona-zero\docs\mapa-zona-zero (1).json")
BG_PATH   = Path(r"W:\juegos\zona-zero\docs\map-grid-pilot\grid-editor\mapa-chatgpt.png")
OUT_PATH  = Path(r"W:\juegos\zona-zero\docs\map-grid-pilot\grid-editor\render-layout.png")

BUILDING_COLORS = {
    'house':      (58,  106, 176),
    'hq':         (138,  58, 176),
    'shelter':    (90,   90, 176),
    'kitchen':    (176, 122,  42),
    'infirmary':  (176,  64,  64),
    'medkit':     (176,  96,  96),
    'radio':      (64,  112, 128),
    'workshop':   (128,  96,  32),
    'sawmill':    (112,  72,  24),
    'scrapyard':  (96,   96,  96),
    'greenhouse': (48,  104,  48),
    'farm':       (64,  112,  48),
    'storage':    (112,  88,  56),
    'cistern':    (48,   96, 128),
    'well':       (40,   72,  96),
}

data = json.loads(JSON_PATH.read_text(encoding='utf-8'))
COLS = data['cols']
ROWS = data['rows']
grid = data['grid']
buildings = data['buildings']

bg = Image.open(BG_PATH).convert('RGBA')
W, H = bg.size
cw = W / COLS
ch = H / ROWS

canvas = bg.copy()
overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(overlay)

# Celdas pintadas
for r in range(ROWS):
    for c in range(COLS):
        v = grid[r][c] if r < len(grid) and c < len(grid[r]) else ''
        if not v:
            continue
        x0, y0 = c * cw, r * ch
        x1, y1 = x0 + cw, y0 + ch
        if v == 'forest':
            d.rectangle([x0, y0, x1, y1], fill=(20, 80, 20, 110))
            d.rectangle([x0+1, y0+1, x1-1, y1-1], outline=(58, 138, 58, 160), width=1)
        elif v == 'build':
            d.rectangle([x0, y0, x1, y1], fill=(70, 140, 30, 80))
            d.rectangle([x0+1, y0+1, x1-1, y1-1], outline=(110, 180, 50, 140), width=1)

# Grid lines
for c in range(COLS + 1):
    x = c * cw
    d.line([(x, 0), (x, H)], fill=(200, 160, 80, 40), width=1)
for r in range(ROWS + 1):
    y = r * ch
    d.line([(0, y), (W, y)], fill=(200, 160, 80, 40), width=1)

# Edificios
try:
    font_big = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", max(9, int(ch * 0.32)))
    font_sm  = ImageFont.truetype("C:/Windows/Fonts/arial.ttf",   max(7, int(ch * 0.22)))
except:
    font_big = ImageFont.load_default()
    font_sm  = font_big

for b in buildings:
    bid  = b['bid']
    col, row = b['col'], b['row']
    bw,  bh  = b['w'],  b['h']
    name = b['name']
    x0 = col * cw
    y0 = row * ch
    x1 = x0 + bw * cw
    y1 = y0 + bh * ch
    r, g, bl = BUILDING_COLORS.get(bid, (100, 100, 180))
    d.rectangle([x0, y0, x1, y1], fill=(r, g, bl, 160))
    d.rectangle([x0+2, y0+2, x1-2, y1-2], outline=(min(r+60,255), min(g+60,255), min(bl+60,255), 220), width=2)
    # Texto centrado
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2
    # Sombra
    d.text((mx+1, my-int(ch*0.08)+1), name, font=font_big, fill=(0,0,0,200), anchor='mm')
    d.text((mx, my-int(ch*0.08)),     name, font=font_big, fill=(255,255,220,255), anchor='mm')
    fp_label = f"{bw}×{bh}"
    d.text((mx+1, my+int(ch*0.22)+1), fp_label, font=font_sm, fill=(0,0,0,180), anchor='mm')
    d.text((mx,   my+int(ch*0.22)),   fp_label, font=font_sm, fill=(220,220,160,200), anchor='mm')

canvas = Image.alpha_composite(canvas, overlay)
canvas.convert('RGB').save(OUT_PATH, 'PNG', optimize=True)
print(f"Guardado: {OUT_PATH}  ({W}x{H})")

# Estadisticas
build_cells = sum(1 for r in grid for v in r if v == 'build')
forest_cells = sum(1 for r in grid for v in r if v == 'forest')
used = sum(b['w'] * b['h'] for b in buildings)
print(f"Celdas construibles: {build_cells}")
print(f"Celdas bosque: {forest_cells}")
print(f"Edificios colocados: {len(buildings)}")
print(f"Celdas usadas por edificios: {used} / {build_cells} construibles")
print(f"Celdas libres: {build_cells - used}")
