from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter


ROOT = Path(r"W:\juegos\zona-zero\docs\map-grid-pilot")
BUILDING_PILOTS = ROOT / "building-pilots"

sys.path.insert(0, str(BUILDING_PILOTS))
from _compose import COLS, paste, scale_to_footprint  # noqa: E402

# Colores medidos empiricamente:
# Tierra mapa maestro: [109, 77, 38]
# Base sprites:        [ 89, 62, 38]
# Factor correccion por canal (solo R y G necesitan subir):
_CORR_R = 109.0 / 89.0
_CORR_G = 77.0 / 62.0
_CORR_B = 1.0  # B ya coincide


def match_map(spr: Image.Image, map_patch: Image.Image | None = None) -> Image.Image:
    """Integra el sprite con el terreno maestro.

    1. Correccion de color global (R, G) para acercar tierra sprite al mapa.
    2. Si se pasa map_patch (trozo del mapa en esa posicion), blendea la zona
       inferior del sprite con la textura real del mapa para integrar la base.
    3. Suavizado final leve.
    """
    has_alpha = spr.mode == "RGBA"
    alpha = spr.split()[3] if has_alpha else None

    arr = np.array(spr.convert("RGB")).astype(np.float32)

    # 1. Correccion de color global
    arr[:, :, 0] = np.clip(arr[:, :, 0] * _CORR_R, 0, 255)
    arr[:, :, 1] = np.clip(arr[:, :, 1] * _CORR_G, 0, 255)

    # 2. Blend de textura en franja inferior (base de tierra, ultimo 30% del sprite)
    if map_patch is not None:
        h, w = arr.shape[:2]
        blend_start = int(h * 0.70)
        # Redimensionar patch del mapa al mismo size que la franja
        patch = map_patch.resize((w, h - blend_start), Image.Resampling.LANCZOS)
        patch_arr = np.array(patch.convert("RGB")).astype(np.float32)

        # Mascara de alpha para no tocar zonas transparentes
        if alpha is not None:
            alpha_arr = np.array(alpha.resize((w, h), Image.Resampling.LANCZOS)).astype(np.float32)
            blend_alpha = alpha_arr[blend_start:] / 255.0
        else:
            blend_alpha = np.ones((h - blend_start, w), dtype=np.float32)

        # Peso de blend: 0.35 en la franja de tierra (conserva algo del sprite original)
        blend_w = 0.35
        franja = arr[blend_start:]
        # Blend solo donde hay pixel opaco
        for c in range(3):
            franja[:, :, c] = np.where(
                blend_alpha > 0.5,
                franja[:, :, c] * (1 - blend_w) + patch_arr[:, :, c] * blend_w,
                franja[:, :, c],
            )
        arr[blend_start:] = franja

    corrected = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")
    if has_alpha:
        corrected.putalpha(alpha)

    corrected = corrected.filter(ImageFilter.GaussianBlur(radius=0.5))
    corrected = ImageEnhance.Sharpness(corrected).enhance(0.85)
    corrected = ImageEnhance.Contrast(corrected).enhance(0.96)
    return corrected


def cw_ch(map_w: int, map_h: int) -> tuple[float, float]:
    cw = map_w / COLS
    ch = map_h / 18
    return cw, ch


def fp_box(c: int, r: int, w: int, h: int, cw: float, ch: float) -> tuple[float, float, float, float]:
    return (
        c * cw,
        r * ch,
        (c + w) * cw,
        (r + h) * ch,
    )


def build_assets():
    approved = ROOT / "approved-master" / "buildings"
    hold_shelter = ROOT / "building-pilots" / "lote-3" / "01-shelter-3x2.png"

    return {
        "hq_central_l1": (approved / "01-hq-5x4.png"),
        "house":          (approved / "01-house-4x2.png"),
        "workshop":       (approved / "01-workshop-5x2.png"),
        "storage":        (approved / "01-storage-5x3.png"),
        "infirmary":      (approved / "01-infirmary-4x3.png"),
        "kitchen":        (approved / "01-kitchen-4x2.png"),
        "farm":           (approved / "01-farm-3x2.png"),
        "well":           (approved / "01-well-2x1.png"),
        "sawmill":        (approved / "01-sawmill-5x3.png"),
        "greenhouse":     (approved / "01-greenhouse-4x3.png"),
        "cistern":        (approved / "01-cistern-2x2.png"),
        "scrapyard":      (approved / "01-scrapyard-5x3.png"),
        "radio":          (approved / "01-radio-3x2.png"),
        "medkit":         (approved / "01-medkit-2x2.png"),
        "shelter":        hold_shelter,
    }


def placements():
    # Grid 78x18. Tres franjas para evitar solapamientos al escalar.
    return [
        # Franja superior (r=1): edificios grandes
        ("hq_central_l1", "Refugio Central", 2,  1, 5, 4),
        ("sawmill",        "aserradero",      9,  1, 5, 3),
        ("storage",        "almacen",         16, 1, 5, 3),
        ("infirmary",      "enfermeria",      23, 1, 4, 3),
        ("greenhouse",     "invernadero",     29, 1, 4, 3),
        ("workshop",       "taller",          35, 1, 5, 2),
        ("scrapyard",      "chatarrera",      42, 1, 5, 3),
        # Franja media (r=7): medianos
        ("house",          "casa",            2,  7, 4, 2),
        ("kitchen",        "cocina",          8,  7, 4, 2),
        ("shelter",        "refugio",         14, 7, 3, 2),
        ("radio",          "radio",           19, 7, 3, 2),
        ("farm",           "huerto",          24, 7, 3, 2),
        # Franja baja (r=12): pequenos
        ("cistern",        "cisterna",        2,  12, 2, 2),
        ("well",           "pozo",            6,  12, 2, 1),
        ("medkit",         "botiquin",        10, 12, 2, 2),
    ]


def recomposite(scale: float, out_path: Path, base_map_path: Path):
    base = Image.open(base_map_path).convert("RGBA")
    W, H = base.size
    cw, ch = cw_ch(W, H)

    assets = build_assets()
    parts = placements()
    parts_sorted = sorted(parts, key=lambda p: (p[3] + p[5], p[2]))

    canvas = base.copy()
    base_rgb = base.convert("RGB")

    for key, _name, c, r, w, h in parts_sorted:
        cut = Image.open(assets[key]).convert("RGBA")

        fw = w * cw * scale
        fh = h * ch * scale

        scaled = scale_to_footprint(cut, fw, fh)

        # Extraer el patch del mapa en la posicion donde va este sprite
        box = fp_box(c, r, w, h, cw, ch)
        x0, y0, x1, y1 = [int(v) for v in box]
        sw, sh = scaled.size
        # Patch del mapa en esa zona (puede ser mas pequeno que el sprite escalado)
        map_patch = base_rgb.crop((x0, y0, min(x0 + sw, W), min(y0 + sh, H)))

        spr = match_map(scaled, map_patch)
        paste(canvas, spr, box)

    canvas.convert("RGB").save(out_path, "PNG", optimize=True)


def main():
    out_dir = ROOT / "scale-comparison"
    out_dir.mkdir(parents=True, exist_ok=True)

    base_map = ROOT / "approved-master" / "00-MAPA_MAESTRO_APROBADO.png"

    for label, s in [("1_5x", 1.5), ("2x", 2.0)]:
        out = out_dir / f"todos-edificios-{label}.png"
        recomposite(s, out, base_map)
        print(f"Generado: {out}")


if __name__ == "__main__":
    main()
