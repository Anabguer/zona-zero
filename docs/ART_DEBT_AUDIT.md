# ART_DEBT_AUDIT — Deuda visual pre-publicación

**Fecha:** 2026-08-16  
**Importante:** Hasta ZZ-183 la deuda artística era **NO BLOQUEANTE PARA DESARROLLO**.  
Eso **no** significa “arte aprobado para release”.

> Para publicación, el arte se reclasifica.  
> **NO** se ejecuta ART PASS en esta entrega.

**Inventario de assets actuales (`assets/art/`):**

| Carpeta | Ficheros | Notas |
|---------|----------|-------|
| buildings/ | 9 webp | vs ~31 defs → mayoría icon/SVG runtime |
| ui/ | 8 webp | recursos + pop |
| terrain/ | 3 webp + 1 png | incluye `city.webp` **no** como GIS de juego |
| zones/ | 3 webp | hospital, station, supermarket |
| portraits/ | 2 webp | exploradores |
| intro/ | 3 jpg | cine |
| landmarks/ | **0** (carpeta ausente) | landmarks = siluetas tipadas lean |

---

## Clasificación

- **A — necesario antes de publicar** (calidad mínima de producto / no “placeholder evidente”)  
- **B — mejora importante** (refuerza fantasía y lectura)  
- **C — polish opcional** (post-release o pase fino)

---

## Inventario por capa

| # | Ítem | Estado actual (lectura) | Clase | Notas |
|---|------|-------------------------|-------|-------|
| 1 | **Terreno / suelo colonia** | Procedural + yard webp; lectura OK anti-GIS | **A** | Close-up/LOD lean; aún no “escenario final” |
| 2 | **Carretera** | Integración básica post-019B | **A** | Deuda explícita post-019B: bordes, suciedad, zoom |
| 3 | **Edificios (siluetas/identidad)** | Mix webp + painters SVG; 9 assets | **A** | Muchos tipos sin art dedicado; `insulated_house` deuda silueta |
| 4 | **HQ / camp D1** | camp-d1 / shelter webp | **B** | Funcional; reforzar identidad “refugio” |
| 5 | **Landmarks** | Tipados lean; 3 zone webp; sin set landmarks/ | **A** | Silueta > asset incorrecto (criterio ZZ-165); set incompleto |
| 6 | **Integración edificio–suelo** | Sombras contacto baratas | **A** | Deuda post-019B abierta |
| 7 | **Sombras / contacto** | Lean | **B** | Parte de integración |
| 8 | **Superficies construibles** | Lógica APROBADA; viz highlight | **B** | Pulido artístico, no reabrir contrato |
| 9 | **Habitantes ambientales** | Figuras SVG cap≤16 | **B** | Theater OK; no Sims; art pass figura/ropa |
| 10 | **Props colonia** | Densidad por crecimiento lean | **B** | Evitar confeti; art pass pecios/cajas |
| 11 | **Vegetación** | Escasa / procedural | **B** | Atmósfera |
| 12 | **Ruinas / escombros** | Lean daño/LOD | **B** | |
| 13 | **Daño edificios** | Filtros/grietas/HP en mundo | **A/B** | Critical/destroyed deben seguir inequívocos; art refuerza |
| 14 | **Construcción (FX)** | Just-built / polvo lean | **C** | |
| 15 | **Reparación (FX)** | Scaffold/sparks lean | **C** | |
| 16 | **Clima visual** | Labels + algo de atmósfera | **B** | Frío/calor/lluvia más legibles en mundo |
| 17 | **Ataques / horda visual** | Flash / figuras→refugio | **B** | Legible; no espectáculo |
| 18 | **Fog** | fog.webp + lógica | **B** | Sin GIS permanente |
| 19 | **Efectos generales** | Mínimos | **C** | |
| 20 | **Iconos UI / recursos** | webp food/water/wood… | **B** | Coherencia set |
| 21 | **HUD / paneles** | CSS game + world | **B** | Debe seguir videojuego, no ERP |
| 22 | **Intro** | 3 jpg | **B** | Calidad narrativa pre-pub |
| 23 | **Victoria / derrota** | Overlays texto | **A** | Pantallas de cierre = primera impresión de “producto” |
| 24 | **Hub / portada** | WIP local no aprobado | **A*** | *Si se publica hub: art + UX hub; si no, fuera de alcance hasta decisión |
| 25 | **Portraits explorador** | 2 webp | **C** | |
| 26 | **city.webp** | Presente, no GIS | **C** | No reactivar como mapa |

---

## Resumen por prioridad

### A — antes de publicar (mínimo producto)

1. Carretera creíble en zoom juego.  
2. Integración edificio–suelo (contacto/sombra) en colonia principal.  
3. Identidad visual de edificios **frecuentes** (HQ, farm, well, shelter/house, defensa básica, storage) — no hace falta 31 arts perfectos el día 1, sí los del loop diario.  
4. Landmarks clave del seed (mercado, hospital, estación…) reconocibles sin mentir semánticamente.  
5. Pantallas victoria/derrota con presencia de producto (no overlay debug).  
6. Hub/portada **si** entra en el paquete de publicación (decisión humana).

### B — importante pre-release

- Props / vegetación / ruinas con criterio.  
- Habitantes ambientales un grado más “colonia viva”.  
- Clima + ataques más legibles.  
- HUD/paneles cohesión.  
- Intro.  
- Silueta `insulated_house` diferenciada sin abrir ficha.

### C — polish / post

- FX construcción/reparación.  
- Portraits.  
- Efectos ornamentales.  
- city.webp residual.

---

## Principios (no negociar en ART PASS futuro)

1. **Contrato espacial 2.8 intacto** (no GIS, no solares prefijados, no patio fijo).  
2. Silueta correcta > asset bonito semánticamente incorrecto.  
3. Progresión visual **emergente** (densidad/props), no decorados por era.  
4. Vida ambiental ≠ Sims.  
5. Beeps actuales ≠ audio final (ver auditoría audio en PRE_RELEASE_AUDIT).  
6. ART PASS es **fase expresa**, no se cuela en hotfix ZZ-184.

---

## Relación con desarrollo

| Etapa | Tratamiento del arte |
|-------|----------------------|
| ZZ-012…183 | Deuda **NO BLOQUEANTE para avanzar sistemas** |
| Pre-publicación | Deuda **reclasificada A/B/C** para release |
| Publicación | Requiere decisión Neni: qué A es obligatorio en v1 |

**No** se autoriza publicar con el arte actual solo porque el gate funcional esté APROBADO.

---

## Hallazgos humanos PT1-A (2026-08-16) — sin ART PASS

Sesión Neni **interrumpida** por viewport móvil (`docs/review-mobile-pt1a/PT1A_VIEWPORT_MOBILE.md`). Arte observado en D1 (registrar, no ejecutar):

| Observación Neni | Clase | Nota |
|------------------|-------|------|
| Rayas / banding visual | A/B | Terreno / render; no fix ahora |
| Superficies/zonas visualmente raras | B | Highlight buildable / lectura |
| Elementos provisionales evidentes | A | Refuerza necesidad ART PASS A |
| Composición poco natural | A/B | Integración edificio–suelo + props |

**Portada (feedback Neni, propuesta pendiente de aprobación):**

- Quiere **logo gráfico** como héroe.  
- Quitar redundancia: texto «Zona Zero» + kicker «Intocables · Supervivencia».  
- Mock local: `docs/review-mobile-pt1a/05-hub-logo-proposal.png` — **no deploy**.

**Intro:** feedback positivo; no tocar estructura.
