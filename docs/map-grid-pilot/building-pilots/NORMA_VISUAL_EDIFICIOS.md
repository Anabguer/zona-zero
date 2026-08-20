# Norma visual de edificios — Zona Zero

**Aprobada:** 18 ago 2026 (tercera prueba de pilotos + terreno maestro).  
**No regenerar** el mapa maestro ni estos 14 assets congelados: casa, taller, Refugio Central I, pozo, huerto, enfermería, almacén, aserradero, invernadero, cisterna, cocina, chatarrería, radio, botiquín. El refugio está en hold humano.

Conjunto congelado: `docs/map-grid-pilot/approved-master/`.

## Referencias maestras (conjunto aprobado)

| Rol | id | Nombre | Footprint |
|-----|----|--------|-----------|
| Terreno | — | Mapa base | 78×18 (`01-map-empty.png`) |
| Vivienda | `house` | Casa | 4×2 |
| Mediano | `workshop` | Taller | 5×2 |
| Grande | `hq_central_l1` | Refugio Central I | 5×4 |
| Agua | `well` | Pozo | 2×1 |
| Comida | `farm` | Huerto | 3×2 |
| Salud | `infirmary` | Enfermería | 4×3 |
| Logística | `storage` | Almacén | 5×3 |
| Industria | `sawmill` | Aserradero | 5×3 |
| Comida | `greenhouse` | Invernadero | 4×3 |
| Agua | `cistern` | Cisterna | 2×2 |
| Servicio | `kitchen` | Cocina | 4×2 |
| Industria | `scrapyard` | Chatarrería | 5×3 |
| Logística | `radio` | Radio | 3×2 |
| Salud | `medkit` | Botiquín | 2×2 |

## Cámara y orientación

- Fachada principal hacia abajo / jugador.
- Eje horizontal paralelo al mapa.
- Cámara **frontal + elevada** (fachada + tejado).
- Misma cantidad de tejado visible que los maestros.
- **No** 3/4 lateral, **no** isométrico de esquina, **no** fachada ortográfica plana.

## Integración

- PNG transparente, sin fondo, sin borde de footprint.
- Base orgánica e irregular (tierra, piedras, tablones, hierba seca, sombra de contacto suave).
- Sin plataforma rectangular ni peana.
- El dibujo no tiene que rellenar el rectángulo lógico.
- **Tierra, piedras, vegetación y grano** de cada edificio nuevo deben fundirse con el terreno maestro.
- Referencia de esa transición: `terrain-iter-match-lote1/03-closeup-dirt-blend.png` (copia: `approved-master/00-TRANSICION_TIERRA_APROBADA.png`).
- No más nítidos ni más “pegatina” que esa prueba.

## Acabado

Misma familia: postapocalipsis habitado, madera, chapa oxidada, reparaciones, luz cálida puntual.

**Nitidez:** el mapa es pictórico. Los edificios no deben “saltar” con microcontraste fotográfico. Los maestros se conservan; al colocarlos sobre el mapa se iguala un poco el grano. Los edificios nuevos se generan ya con ese acabado, no más nítidos que el terreno.

## Iluminación

Misma dirección que los tres maestros (luz alta, contacto suave, interiores cálidos puntuales).
