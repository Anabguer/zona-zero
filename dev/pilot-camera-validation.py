"""
Validación P0 cámara piloto — recortes del mapa maestro (contrato demo-neni).
Genera capturas A–G por viewport sin Playwright.
"""
import json
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAP = os.path.join(
    ROOT,
    "assets",
    "art",
    "terrain",
    "mapa-neni-1819x865-brownmatch-up2x.png",
)
OUT = os.path.join(ROOT, "docs", "review", "pilot-camera-p0")

WORLD_W, WORLD_H = 1819, 865
NUCLEUS_X, NUCLEUS_Y = 1100, 280
ZOOM_MAX = 3.0

VIEWPORTS = [
    ("740x360", 740, 360),
    ("844x390", 844, 390),
    ("932x430", 932, 430),
    ("desktop", 1366, 768),
]


def clamp(v, a, b):
    return max(a, min(b, v))


def zoom_min(vp_w, vp_h):
    return max(vp_w / WORLD_W, vp_h / WORLD_H)


def clamp_cam(cam, vp_w, vp_h):
    zm = zoom_min(vp_w, vp_h)
    cam["zoom"] = clamp(cam["zoom"], zm, ZOOM_MAX)
    half_w = (vp_w / 2) / cam["zoom"]
    half_h = (vp_h / 2) / cam["zoom"]
    vis_w = vp_w / cam["zoom"]
    vis_h = vp_h / cam["zoom"]
    if vis_w >= WORLD_W:
        cam["x"] = WORLD_W / 2
    else:
        cam["x"] = clamp(cam["x"], half_w, WORLD_W - half_w)
    if vis_h >= WORLD_H:
        cam["y"] = WORLD_H / 2
    else:
        cam["y"] = clamp(cam["y"], half_h, WORLD_H - half_h)
    return cam


def view_box(cam, vp_w, vp_h):
    vw = vp_w / cam["zoom"]
    vh = vp_h / cam["zoom"]
    return {
        "x": cam["x"] - vw / 2,
        "y": cam["y"] - vh / 2,
        "w": vw,
        "h": vh,
    }


def render_shot(map_img, vp_w, vp_h, cam, label):
    cam = clamp_cam(dict(cam), vp_w, vp_h)
    vb = view_box(cam, vp_w, vp_h)
    # Mapa up2x → escala lógica 1:1 en coords mundo
    scale = map_img.width / WORLD_W
    x0 = int(round(vb["x"] * scale))
    y0 = int(round(vb["y"] * scale))
    x1 = int(round((vb["x"] + vb["w"]) * scale))
    y1 = int(round((vb["y"] + vb["h"]) * scale))
    crop = map_img.crop((x0, y0, x1, y1)).resize((vp_w, vp_h), Image.LANCZOS)
    draw = ImageDraw.Draw(crop)
    outside = (
        vb["x"] < -0.5
        or vb["y"] < -0.5
        or vb["x"] + vb["w"] > WORLD_W + 0.5
        or vb["y"] + vb["vh"] if False else vb["y"] + vb["h"] > WORLD_H + 0.5
    )
    info = f"{label} z={cam['zoom']:.3f} vb=({vb['x']:.0f},{vb['y']:.0f},{vb['w']:.0f},{vb['h']:.0f})"
    draw.rectangle([0, 0, vp_w - 1, vp_h - 1], outline=(80, 200, 80), width=2)
    draw.rectangle([0, vp_h - 28, vp_w, vp_h], fill=(0, 0, 0))
    draw.text((4, vp_h - 22), info[:90], fill=(180, 240, 180))
    return crop, cam, vb, outside


def main():
    os.makedirs(OUT, exist_ok=True)
    map_img = Image.open(MAP).convert("RGB")
    assert map_img.size[0] / WORLD_W == map_img.size[1] / WORLD_H, map_img.size
    report = []

    for vp_id, vp_w, vp_h in VIEWPORTS:
        zm = zoom_min(vp_w, vp_h)
        d1 = {"x": NUCLEUS_X, "y": NUCLEUS_Y, "zoom": min(ZOOM_MAX, max(zm * 2.5, zm))}
        cam = dict(d1)

        scenarios = [
            ("A-d1-inicial", dict(d1)),
            ("B-pan-left", None),
            ("C-pan-right", None),
            ("D-pan-up", None),
            ("E-pan-down", None),
            ("F-zoom-min", {"x": WORLD_W / 2, "y": WORLD_H / 2, "zoom": zm}),
            ("G-zoom-max", {"x": NUCLEUS_X, "y": NUCLEUS_Y, "zoom": ZOOM_MAX}),
        ]

        for label, preset in scenarios:
            if preset:
                c = dict(preset)
            elif label == "B-pan-left":
                c = {"x": 1e9, "y": NUCLEUS_Y, "zoom": d1["zoom"]}
            elif label == "C-pan-right":
                c = {"x": -1e9, "y": NUCLEUS_Y, "zoom": d1["zoom"]}
            elif label == "D-pan-up":
                c = {"x": NUCLEUS_X, "y": 1e9, "zoom": d1["zoom"]}
            else:
                c = {"x": NUCLEUS_X, "y": -1e9, "zoom": d1["zoom"]}

            img, cam_out, vb, outside = render_shot(map_img, vp_w, vp_h, c, label)
            fname = f"{vp_id}-{label}.png"
            img.save(os.path.join(OUT, fname))
            entry = {
                "viewport": vp_id,
                "shot": label,
                "file": fname,
                "cam": cam_out,
                "viewBox": vb,
                "outsideWorld": outside,
                "zoomMin": zm,
            }
            report.append(entry)
            status = "FAIL outside" if outside else "OK"
            print(f"{status} {fname}")

    with open(os.path.join(OUT, "report.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"\nCapturas en {OUT}")


if __name__ == "__main__":
    main()
