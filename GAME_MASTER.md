# ZONA ZERO — GAME_MASTER

Documento maestro compartido (Cursor ↔ ChatGPT).  
Repositorio: `Anabguer/zona-zero` · rama `main`.

---

## 1. Diseño aprobado (reglas funcionales)

Estas reglas guían el juego. No deben cambiarse unilateralmente en código sin actualizar este documento.

### Fantasía y bucle
- Supervivencia postapocalíptica en ciudad: gestionar un refugio, explorar, construir, expandir control territorial y sobrevivir a amenazas variables.
- Bucle: abrir → gestionar → mandar expediciones → recibir botín/riesgo → construir → expandirse → sobrevivir → guardar → continuar.
- Juego web (navegador), móvil + ordenador. Sin APK.

### Población
- Partida típica empieza con ~3 supervivientes.
- La colonia **debe poder crecer a 50+**.
- Si existe tope técnico, es configurable (`balance.maxSurvivors`), nunca un `12` hardcodeado en lógica.

### Recursos principales (con utilidad real)
- **comida**, **agua**, **madera**, **metal**, **medicinas**, **combustible**, **munición**.
- Consumo diario relevante (comida/agua; combustible de base/expediciones).
- Producción vía edificios; botín vía expediciones/eventos.

### Mapa y territorio
- Mapa de ciudad con zonas: desconocida / descubierta / controlada.
- Expediciones con duración, riesgo, botín variable, heridas y muerte permanente.
- Posibilidad de controlar nuevas zonas.

### Base
- Asentamiento con parcelas; edificios colocables y reorganizables en lo esencial.
- Capacidad de vivienda ligada a refugios.

### Director / aleatoriedad
- **No** hay guion fijo tipo «día 5 = evento A».
- Eventos con condiciones, pesos, intensidad, cooldown y variantes.
- La dificultad puede matar, pero no debe mandar amenazas absurdas al inicio.
- No todos los días deben traer un evento importante.

### Persistencia
- 3 slots de partida.
- Guardado versionado.
- Auth reutiliza Intocables Universe.

### Presentación
- Estilo minimalista postapocalíptico; SVG/CSS.
- Sin emojis como gráficos principales del juego.

---

## 2. Implementación actual (técnica)

| Campo | Valor |
|-------|--------|
| Versión técnica | **0.2.1** |
| Ubicación local | `W:\juegos\zona-zero\` |
| URL | https://intocables13.com/juegos/zona-zero/ |
| Biblioteca | https://intocables13.com/juegos/ |
| Repo | https://github.com/Anabguer/zona-zero (privado) |
| Stack | HTML / CSS / JS / PHP / MySQL |
| Prefijo SQL | `zona_zero_*` |
| `save_version` / `v` | **2** |
| `maxSurvivors` (balance) | **80** (configurable) |

### Cubierto en el MVP actual
- Hub 3 slots + nueva/continuar/borrar
- Recursos: comida, agua, madera, metal, medicinas, combustible, munición
- Consumo diario comida/agua/combustible; producción por edificios (huerto, pozo, taller, aserradero, clínica, generador…)
- Expediciones gastan combustible; botín multi-recurso
- Mapa SVG + base SVG; Director ampliado (~30 eventos con variantes)
- Noches tranquilas posibles (`quietNightChance`)
- Migración de partidas v1 (`scrap`→metal, `meds`→medicine)
- Derrota por extinción / presión de supervivencia

### Arquitectura
- Cliente: simulación + UI (`js/`)
- Contenido: `content/*.json`
- API PHP: `api/` + tabla `zona_zero_saves`
- Auth: includes Intocables (local `/intocables/includes`, prod `/includes`)

---

## 3. Pendientes relevantes

- Ampliar sistemas futuros del diseño largo (más zonas, enemigos detallados, mejoras profundas, etc.)
- Balance fino tras partidas reales en producción
- Arte/identidad visual más rica (sin romper SVG minimalista)

---

## 4. Changelog

### 0.2.1
- **Fix crítico UI:** `display:grid/flex` anulaba el atributo HTML `hidden` → overlay **Derrota** visible al iniciar y hub podía quedarse en «Cargando slots»
- CSS: `[hidden]{display:none!important}` + `.zz-defeat/.zz-boot/.zz-app/.zz-toast:not([hidden])`
- Arranque: partida nueva abre en pestaña **Gente**, guía con nº de supervivientes, errores de boot/API visibles con reintento
- Cache bust assets `?v=5`
- Pruebas: `scripts/e2e-play.mjs`, `scripts/e2e-hidden-dom.mjs`, harness `dev/` + Playwright UI

### 0.2.0
- Eliminado tope hardcodeado de 12; `maxSurvivors` en `balance.json` (80)
- Recursos ampliados al set aprobado; edificios/zonas/eventos/consumo alineados
- Director: más eventos/variantes + noches sin evento importante
- `GAME_MASTER.md` sincronizado (diseño / implementación / pendientes)
- `save_version` 2 + migración legacy

### 0.1.0-mvp
- Primera versión jugable desplegada + repo GitHub
