# Propuesta de footprints — catálogo real (NO aplicada)

**Fecha:** 18 ago 2026  
**Estado:** jerarquía APROBADA (aserradero 5×3). Solo escala visual. **No** cambia gameplay.  
**Fuentes:** `content/buildings.json`, `INVENTARIO_EDIFICIOS.md`, `GAME_MASTER.md` §4 y §7.

Referencias maestras (fijas): Casa **4×2**, Taller **5×2**, Refugio Central I **5×4**.

Esto es solo escala visual para el grid 78×18. **No** cambia gameplay, costes, capacidades ni las 662 celdas buildable de Neni.

## Núcleo

| id | Nombre | Función | Viejo | Nuevo | Motivo |
|----|--------|---------|-------|-------|--------|
| hq_central_l1 | Refugio Central I | HQ + 6 camas | 2×2 | **5×4** | Maestro. Centro de la colonia. |
| hq_central_l2 | Refugio Central II | Upgrade, 10 camas | 2×2 | 5×4 | In-place. Crece en altura/refuerzo. |
| hq_central_l3 | Refugio Central III | Cuartel, 16 camas | 2×2 | 5×4 | In-place. Más masa, mismo solar. |

## Vivienda

| id | Nombre | Función | Viejo | Nuevo | Motivo |
|----|--------|---------|-------|-------|--------|
| shelter | Refugio | 2 camas, prot. 0 | 1×1 | 3×2 | Más precario que la casa. |
| house | Casa | 4 camas, prot. 1 | 1×1 | **4×2** | Maestro doméstico. |
| insulated_house | Casa aislada | 4 camas, prot. 2 | 1×1 | 4×2 | Misma planta; el aislamiento es visual. |
| block | Bloque | 8 camas, 2 plantas | 2×1 | 4×3 | Más gente en poco suelo; la altura cuenta. |
| block_reinforced | Residencia reforzada | 10–12 camas | no en JSON | 4×3 | Previsto GM. In-place sobre el bloque. |

## Comida y agua

| id | Nombre | Función | Viejo | Nuevo | Motivo |
|----|--------|---------|-------|-------|--------|
| farm | Huerto | Comida, 3 jobs | 1×1 | 3×2 | Tierra de cultivo, no edificio. |
| greenhouse | Invernadero | Comida protegida | 1×1 | 4×3 | Estructura + camas. |
| well | Pozo | Agua | 1×1 | 2×1 | Objeto; 2×1 para que se lea el brocal. |
| cistern | Cisterna | Reserva / lluvia | 1×1 | 2×2 | Depósito, no otro pozo. |
| kitchen | Cocina | Raciones | 1×1 | 4×2 | Escala de casa, no nave. |

## Industria

| id | Nombre | Función | Viejo | Nuevo | Motivo |
|----|--------|---------|-------|-------|--------|
| sawmill | Aserradero | Madera | 1×1 | **5×3** | Cobertizo + troncos. Aprobado (era 4×3). |
| scrapyard | Chatarrería | Metal | 1×1 | 5×3 | El patio de chatarra es el volumen. |
| workshop | Taller | Forja / metal | 1×1 | **5×2** | Maestro mediano. |
| mech_shop | Taller mecánico | Vehículos + metal | 2×1 | 5×3 | Bahía más profunda que el taller. |

## Logística

| id | Nombre | Función | Viejo | Nuevo | Motivo |
|----|--------|---------|-------|-------|--------|
| storage | Almacén | Soft-cap stock | 1×1 | 5×3 | Más superficie que una vivienda. |
| radio | Radio | Señales, max 1 | 1×1 | 3×2 | Caseta + antena. |
| expedition_center | Centro de expediciones | Exploradores, max 1 | 2×1 | 5×3 | Patio y prep. de salidas. |
| garage | Garaje | Vehículos ≥ coche | 2×1 | 5×3 | Bahía donde se lea un coche. |

## Salud

| id | Nombre | Función | Viejo | Nuevo | Motivo |
|----|--------|---------|-------|-------|--------|
| medkit | Botiquín | 1 cama médica | 1×1 | 2×2 | Puesto de curas, no hospital. |
| infirmary | Enfermería | 4 camas | 1×1 | 4×3 | Triaje; entre casa y clínica. |
| clinic | Clínica | 8 camas | 2×1 | 5×3 | Muy activa, sin igualar al HQ 5×4. |

## Defensa

| id | Nombre | Función | Viejo | Nuevo | Motivo |
|----|--------|---------|-------|-------|--------|
| barricade | Barricada | Def baja | 1×1 | 1×2 | Lineal, obstáculo. |
| fence | Cerca | Def media | 1×1 | 1×2 | Tramo de perímetro. |
| watchtower | Atalaya | Def alta | 1×1 | 2×2 | Torre: poco suelo, mucha altura. |
| armory | Armería | Armas + ammo | 1×1 | 4×3 | Taller de armas cerrado. |
| bunker | Búnker | Def muy alta + 2 camas | 2×1 | 4×4 | Masa compacta, menor planta que el HQ. |

## Investigación

| id | Nombre | Función | Viejo | Nuevo | Motivo |
|----|--------|---------|-------|-------|--------|
| tech_bench | Banco técnico | Research básico | 1×1 | 3×2 | Mesa y cobertizo. |
| lab | Laboratorio | Research avanzado | 2×1 | 5×3 | Único y tardío; sin igualar al HQ. |

## No generar

| id | Nombre | Motivo |
|----|--------|--------|
| command | Puesto de mando | Legado HQ en JSON. Contrato v1: no usarlo como edificio nuevo. |
| generator / solar / wall | Electricidad / muro | Fuera de v1. |

## Jerarquía (celdas)

- Objeto / lineal (2–4): pozo, barricada, cerca, cisterna, botiquín, atalaya
- Pequeño (6–8): refugio, huerto, radio, banco técnico, casa, casa aislada, cocina
- Mediano (10–12): taller 10, bloque / invernadero / aserradero / enfermería / armería 12
- Funcional amplio (15): aserradero, chatarrería, mecánico, almacén, expediciones, garaje, clínica, lab
- Grande (16–20): búnker 16, HQ 20
