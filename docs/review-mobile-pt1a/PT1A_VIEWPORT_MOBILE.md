# PT1-A — P0 viewport / PWA / portada (implementado)

| Campo | Valor |
|-------|--------|
| Fecha | 2026-08-16 |
| Código | **PT1-A** |
| Veredicto viewport (harness) | **Chrome propio ≤25% en 800×360** |
| Deploy | Playtest autorizado (esta entrega) |
| Capturas | `docs/review-mobile-pt1a/` |

---

## Medidas BEFORE → AFTER (800×360 browser-normal, harness)

| | HUD | Dock | Chrome propio | % alto |
|--|-----|------|---------------|--------|
| BEFORE | 77.5 | 53.3 | 130.8 | **36.3%** |
| AFTER | 37.5 | 40.1 | 77.6 | **21.6%** |

740×360: mismo chrome **21.6%**.  
Coach tip (mismo texto, solo CSS): ~109 → **72** px; lateral, no cambia pacing.

## Qué se hizo

1. **PWA**: `manifest.webmanifest` (standalone + landscape), icons, `sw.js`, meta iOS, CTA hub secundario (oculto si instalada / dismissed).
2. **Fullscreen**: una sola petición tras primer gesto; sin bucles.
3. **HUD landscape Compact B**: fila top (Inicio/?/♪/G/colonia) → **Más**; banda densa día+pop+recursos.
4. **Dock**: secundarios icon+label corto; Avanzar → «Día ›»; targets ≥~36 px.
5. **Portada logo-first**: logo gráfico; sin kicker «Intocables · Supervivencia» ni título texto redundante.
6. **NO** tocado: onboarding huerto / WATCH-ONBOARDING-PACING / ART PASS / balance.

## Principio producto

PWA = experiencia **recomendada**. Navegador normal también debe ser jugable (chrome propio ≤~25% en landscape corto).

## WATCH abierto

- **WATCH-ONBOARDING-PACING** — reevaluar en PLAYTEST 1 reiniciado.

## Reinicio playtest

Tras esta entrega: **PARAR**. Reiniciar PLAYTEST 1 desde **Nueva partida** (browser + PWA).
