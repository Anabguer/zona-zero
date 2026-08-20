from PIL import Image, ImageDraw, ImageFont
import os


def fit_into_box(img, box_w, box_h):
    """Redimensiona una imagen manteniendo proporción para que quepa en box."""
    w, h = img.size
    scale = min(box_w / w, box_h / h)
    nw = max(1, int(round(w * scale)))
    nh = max(1, int(round(h * scale)))
    return img.resize((nw, nh), Image.Resampling.LANCZOS)


def ensure_font(size=32):
    # Intento de cargar una fuente razonable en Windows.
    # Si falla, caeremos a la fuente por defecto.
    for p in [
        r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\seguisl.ttf",
    ]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size=size)
    return ImageFont.load_default()


def main():
    repo = r"W:\juegos\zona-zero"
    out_dir = os.path.join(repo, "docs", "review")
    drive_dir = r"G:\Mi unidad\Juegos\Zona Zero\Review"

    desktop_path = os.path.join(out_dir, "desktop.png")
    mobile_path = os.path.join(out_dir, "mobile.png")
    gameplay_path = os.path.join(out_dir, "gameplay.png")
    contact_path = os.path.join(out_dir, "review-contact-sheet.jpg")
    index_path = os.path.join(out_dir, "index.html")

    desktop = Image.open(desktop_path).convert("RGB")
    mobile = Image.open(mobile_path).convert("RGB")
    gameplay = Image.open(gameplay_path).convert("RGB")

    bg = (18, 16, 12)  # #12100c
    W = 1200
    top_h = 430
    bottom_h = 900
    H = top_h + bottom_h
    sheet = Image.new("RGB", (W, H), bg)
    draw = ImageDraw.Draw(sheet)
    font_title = ensure_font(34)
    font_note = ensure_font(22)

    # Layout:
    # - Top row: Desktop | Gameplay
    # - Bottom row: Mobile (centrado)
    pad = 18
    box_w = (W - 3 * pad) // 2
    box_top_y = pad
    box_top_h = top_h - 2 * pad

    desktop_box = (pad, box_top_y, pad + box_w, box_top_y + box_top_h)
    gameplay_box = (pad * 2 + box_w, box_top_y, pad * 2 + box_w * 2, box_top_y + box_top_h)
    mobile_box = (pad, pad + top_h, W - pad, H - pad)

    def paste_labeled(img, box, title, note):
        x0, y0, x1, y1 = box
        bw, bh = x1 - x0, y1 - y0
        # Cabecera dentro de la caja.
        header_h = 56
        img_area_h = max(1, bh - header_h)
        fitted = fit_into_box(img, bw, img_area_h)
        # Fondo de la caja (ligeramente más clara para separación).
        draw.rounded_rectangle([x0, y0, x1, y1], radius=18, fill=(26, 23, 18), outline=(60, 55, 45), width=2)
        # Título/nota.
        tx = x0 + 18
        ty = y0 + 12
        draw.text((tx, ty), title, fill=(232, 224, 212), font=font_title)
        draw.text((tx, ty + 38), note, fill=(154, 144, 128), font=font_note)
        # Pegar imagen centrada bajo cabecera.
        ix = x0 + (bw - fitted.size[0]) // 2
        iy = y0 + header_h + (img_area_h - fitted.size[1]) // 2
        sheet.paste(fitted, (ix, iy))

    paste_labeled(
        desktop,
        desktop_box,
        "Piloto Neni · Desktop",
        "1366×768 · Casa + Pozo + Almacén",
    )
    paste_labeled(
        gameplay,
        gameplay_box,
        "Piloto Neni · Gameplay",
        "pan/zoom · vista limpia",
    )
    paste_labeled(
        mobile,
        mobile_box,
        "Piloto Neni · Móvil (portrait)",
        "390×844 · construcción",
    )

    os.makedirs(out_dir, exist_ok=True)
    sheet.save(contact_path, format="JPEG", quality=85)

    # Reescribe índice de galería (obligatorio para que coincida con las capturas actuales).
    index_html = """<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/><title>Review piloto Neni · Zona Zero</title>
<style>
body{margin:0;background:#12100c;color:#e8e0d4;font-family:system-ui,sans-serif;padding:1.5rem}
h1{font-size:1.4rem;margin:0 0 1rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1rem}
figure{margin:0;background:#1a1612;border-radius:10px;overflow:hidden;border:1px solid #333}
img{width:100%;display:block;aspect-ratio:16/9;object-fit:cover;background:#000}
figcaption{padding:.55rem .7rem;font-size:.85rem}
figcaption strong{display:block}
figcaption span{color:#9a9080;font-size:.75rem}
</style></head><body>
<h1>Zona Zero · piloto Neni</h1>
<div class="grid">
<figure><img src="desktop.png" alt="Piloto Neni · Desktop"/><figcaption><strong>Piloto Neni · Desktop</strong><span>piloto=neni · 1366×768 · Casa + Pozo + Almacén</span></figcaption></figure>
<figure><img src="mobile.png" alt="Piloto Neni · Móvil"/><figcaption><strong>Piloto Neni · Móvil</strong><span>piloto=neni · 390×844 · construcción</span></figcaption></figure>
<figure><img src="gameplay.png" alt="Piloto Neni · Gameplay"/><figcaption><strong>Piloto Neni · Gameplay</strong><span>piloto=neni · pan/zoom · vista limpia</span></figcaption></figure>
</div>
</body></html>
"""
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(index_html)

    os.makedirs(drive_dir, exist_ok=True)
    # Copia sustitutiva (sin mover) al drive local.
    for src in [desktop_path, mobile_path, gameplay_path, contact_path]:
        dst = os.path.join(drive_dir, os.path.basename(src))
        # Reescribe si existe.
        if os.path.exists(dst):
            os.remove(dst)
        # Para evitar recomprimir para png, copiamos el archivo en bytes cuando aplica.
        # Como aquí solo manejamos PNG/JPG de manera directa, usamos copia binaria.
        with open(src, "rb") as fsrc:
            with open(dst, "wb") as fdst:
                fdst.write(fsrc.read())

    print("OK contact sheet:", contact_path)


if __name__ == "__main__":
    main()

