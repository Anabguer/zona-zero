# -*- coding: utf-8 -*-
from pathlib import Path

src = Path(r"W:\juegos\zona-zero\docs\map-grid-pilot\_gen_v2.py").read_text(encoding="utf-8", errors="replace")

# Dimensiones dobles
src = src.replace("W, H = 3840, 1080", "W, H = 4096, 2720")

# Salida a carpeta temporal para no pisar los aprobados
src = src.replace(
    r"OUT = ROOT / 'docs' / 'map-grid-pilot'",
    r"OUT = ROOT / 'docs' / 'map-grid-pilot' / '_ampliado_tmp'"
)

# Desactivar copia a Drive
src = src.replace("DRIVE.mkdir(parents=True, exist_ok=True)", "pass  # DRIVE skip")
src = src.replace(
    "for name in names:\n        src = OUT / name",
    "for name in []:\n        src = OUT / name"
)

out = Path(r"W:\juegos\zona-zero\docs\map-grid-pilot\_gen_ampliado.py")
out.write_text(src, encoding="utf-8")
print("Escrito:", out)
