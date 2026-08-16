# Informe de balance — ZZ-178

Generado: 2026-08-16T16:13:22.550Z

## Estado revisión

- **ESTADO REVISIÓN: APROBADA**
- **APROBACIÓN FINAL CHATGPT: SÍ**
- Cierre formal Neni/ChatGPT (2026-08-16). Continuar desde ZZ-180.

## Qué valida esta aprobación (y qué no)

Valida: harness, 6 perfiles GM §36, batches D30/D100, métricas, calibración inicial quietNight/woodHeating, IA place/staff, criterio ZZ-178 = CUMPLE, mala gestión ≠ estrategia viable, needEnergy:false, sin generator/solar.

**NO** demuestra balance final de todos los estilos. No recalibrar a ciegas para igualar porcentajes. Simulación ≠ partida humana.

## Criterio de aceptación

- Perfil mala gestión pierde más (supervivencia D30 < atento/conservador)
- Resultado: **CUMPLE**
- mala gestión D30 supervivencia 0.25 < atento 0.917

## Knobs relevantes (post ZZ-177)

- woodHeating.enabled: true
- woodPerUnprotected…: 0.35
- outbreaks.baseSeedChance: 0.04
- outbreaks.minDay: 8
- attackWarnDays: 1
- needEnergy: false

## Batches

| Perfil | Horiz. | N | Supervivencia | Pop viva | Era | Control | Wood min | Brotes | Ataques | Muertes med. |
|--------|--------|---|---------------|----------|-----|---------|----------|--------|---------|--------------|
| atento | D30 | 24 | 92% | 2.82 | 0 | 2.09 | 0.58 | 0.08 | 0.17 | 28 |
| atento | D100 | 16 | 75% | 4.5 | 0.33 | 8.58 | 0.5 | 0.63 | 1.75 | 30 |
| expansivo | D30 | 24 | 100% | 3.08 | 0 | 1.88 | 0.42 | 0.04 | 0.08 | — |
| expansivo | D100 | 16 | 75% | 4.33 | 0.33 | 4.5 | 0.19 | 0.5 | 1.38 | 86 |
| conservador | D30 | 24 | 92% | 1.95 | 0 | 1.73 | 1 | 0.21 | 0.13 | 24 |
| conservador | D100 | 16 | 63% | 5.1 | 0.6 | 8 | 0.63 | 0.31 | 1.31 | 32 |
| mala_gestion | D30 | 24 | 25% | 1.17 | 0 | 1.83 | 12.21 | 0 | 0.17 | 22 |
| mala_gestion | D100 | 16 | 0% | 0 | 0 | 0 | 11.75 | 0 | 0.31 | 31 |
| sin_explorar | D30 | 24 | 88% | 2.33 | 0 | 1 | 1.46 | 0.08 | 0.04 | 20 |
| sin_explorar | D100 | 16 | 56% | 2.44 | 0.11 | 1 | 0.44 | 0.13 | 1.13 | 66 |
| sobreexpansion | D30 | 24 | 96% | 3.17 | 0 | 1.83 | 0 | 0.04 | 0.33 | 25 |
| sobreexpansion | D100 | 16 | 88% | 4.79 | 0.57 | 5.86 | 0.13 | 0.5 | 1.69 | 60 |

## WATCH (no bugs confirmados — no recalibrar a ciegas)

1. **Sobreexpansión D100 88%** > atento 75% / conservador 63%. Expandirse puede ser válida; no queremos “construye todo ya” dominante sin coste. Antes de tocar balance: IA simplificada, definición del perfil, ventaja real, muestra/semillas.
2. **Eras D100 bajas** (atento/expansivo ~0.33). ¿Balance real vs bot vs métricas? No abaratar eras solo para subir el número.
3. **Sin explorar D100 56%**. OK no muerte inmediata; vigilar coste de oportunidad (encerrarse ≠ óptimo).
4. Conservador 63%: evaluar supervivencia + progreso + recursos + control, no solo una métrica.
5. Mala gestión D100 0%: castigar decisiones, no trampas inevitables.

## Notas de calibración

- Perfiles GM §36 implementados en `scripts/balance-sim.mjs`.
- Sin generator/solar en build order (contrato eléctrico OFF).
- Métricas para calibrar madera / brotes / ataques; no aprueba UX.
- Deuda arte NO BLOQUEANTE · contrato espacial 2.8 intacto.
- Archivado: `docs/review-archive/zz-178/`.
