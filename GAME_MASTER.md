# ZONA ZERO — GAME_MASTER

> **PENDIENTE DE SINCRONIZAR CON EL GAME_MASTER v0.1 DE CHATGPT**
>
> Este archivo no sustituye el documento funcional aprobado por ChatGPT.
> Las reglas de diseño definitivas llegarán al sincronizar `GAME_MASTER_DIA_0_v0.1.md`.
> Lo que sigue describe **estado técnico** e implementación actual, no reglas funcionales nuevas “aprobadas”.
>
> **Fuente compartida Cursor ↔ ChatGPT:** repositorio GitHub privado `Anabguer/zona-zero` (rama `main`).

## Estado técnico

| Campo | Valor |
|-------|--------|
| Nombre | Zona Zero |
| Versión técnica | 0.1.0-mvp |
| Ubicación local | `W:\juegos\zona-zero\` |
| URL producción | https://intocables13.com/juegos/zona-zero/ |
| Biblioteca juegos | https://intocables13.com/juegos/ |
| Repositorio | `https://github.com/Anabguer/zona-zero` (privado) |
| Rama | `main` |
| Último commit | `e94c6e7` — docs: record GitHub repo and latest MVP commit in GAME_MASTER |
| Stack | HTML / CSS / JS / PHP / MySQL |
| Prefijo SQL | `zona_zero_*` |
| Auth | Sesión Intocables Universe |
| Slots de partida | 3 |

## Funcionalidades implementadas (MVP)

- Biblioteca `/juegos/` + card **Juegos** en portal Intocables
- Nueva partida / 3 slots / guardar / cargar / borrar slot
- ~3 supervivientes iniciales, población, recursos, consumo diario
- Base con cuadrícula, construcción y capacidad de vivienda
- Mapa SVG: zonas desconocidas / descubiertas / controladas
- Expediciones con tiempo, riesgo, botín, heridas y muerte permanente
- Infectados, producción, control territorial, eventos vía Director (pesos/condiciones/cooldowns; sin guion fijo por día)
- Derrota posible; guardado versionado (`save_version` / `v` en JSON)

## Decisiones técnicas (aprobadas para implementación)

- Simulación en cliente; persistencia JSON en MySQL (`zona_zero_saves`)
- Contenido/balance en `content/*.json` (separado de la lógica)
- Mapa y base en SVG + CSS (sin emojis como gráficos principales)
- Sin APK / sin Vite obligatorio
- Proyecto fuera de `/anabel/`: vive en `/juegos/zona-zero/`
- Auth reutiliza Intocables (no cuentas duplicadas del juego)

## Pendientes relevantes

- Sustituir/sincronizar este documento con el GAME_MASTER v0.1 completo de ChatGPT
- Ampliar contenido, arte y sistemas futuros del diseño aprobado
- Ajustes finos de balance tras más partidas reales en producción
- Verificar guardado en Hostalia con sesión de usuario real (3 slots)

## Flujo de trabajo

1. Cursor implementa
2. Actualiza este `GAME_MASTER.md` (estado / changelog / pendientes)
3. Prueba
4. Commit + push a `Anabguer/zona-zero`

ChatGPT revisa el mismo repositorio y este documento.

## Changelog

### 0.1.0-mvp
- Primera versión jugable del bucle abrir → gestionar → expedición → construir → sobrevivir → guardar
- Desplegado en Hostalia: `/juegos/` y `/juegos/zona-zero/`
- Card **Juegos** en portal Intocables + redirect login `/juegos` permitido
- Auth Intocables resuelta (rutas local `intocables/includes` y prod `/includes`)
- Repositorio GitHub privado `Anabguer/zona-zero` creado y vinculado como fuente compartida
