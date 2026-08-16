# PLAYTEST SESSION 1+2 — Guía de ejecución (Neni)

**Fecha:** 2026-08-16  
**Marco:** PRE_RELEASE_PLAN APROBADO · ZZ-183 APROBADA · **deploy playtest interno AUTORIZADO** (no release público)  
**Dispositivo:** móvil **en horizontal (landscape)**  
**Regla de oro:** Neni juega como jugadora. **Sin checklist técnica** mientras juega.

> Arte y sonido son **provisionales**. Decírselo **una sola vez** al empezar, y no insistir.

**Frase de arranque (facilitador → Neni):**

> «Sobrevive y haz crecer el refugio. Jugá como te salga. Si no sabés qué hacer, decilo en voz alta.»

**Build playtest producción (2026-08-16):**  
`https://intocables13.com/juegos/zona-zero/`  
Requiere login Intocables. Móvil en **horizontal**.  
Cache assets: `?v=40`. Si ves algo antiguo: recarga forzada una vez.

---

## 0. Antes de empezar (facilitador · 5 min)

1. Abrir la URL de producción de playtest (arriba).  
2. Girar el móvil a **horizontal**. Si aparece «Gira tu dispositivo», es correcto.  
3. Tener a mano la **hoja de notas** (§4) — al final de cada playtest, no durante el tutorial.  
4. No explicar: ghost, staffing, Más, eras, victoria, balance.

---

## 1. Cómo ejecutar PLAYTEST 1

### Ruta (producto completo: portada → intro → juego)

1. Abrir en el móvil:  
   **`https://intocables13.com/juegos/zona-zero/`**
2. Iniciar sesión Intocables si lo pide.
3. En la portada: **Nueva partida** (si avisa de borrar partida anterior, aceptar solo si estáis de acuerdo en empezar limpio).
4. Seguir la **intro** (o saltarla si el juego lo ofrece — anotar si la salta).
5. Jugar en horizontal.

### Ruta alternativa estable (sin login · solo juego + intro)

Si el login/PHP desde el móvil falla o complica el playtest:

1. En el PC del repo, servir archivos estáticos, p. ej.:  
   `npx --yes serve -l 8765 "W:\juegos\zona-zero"`
2. En el móvil (misma Wi‑Fi):  
   `http://<IP-del-PC>:8765/dev/harness-zz.html#intro=1&new=1&clear=1&name=Refugio%20Norte`
3. Esto **salta la portada** pero incluye intro + partida nueva limpia + save en el navegador (mock).  
4. Anotar en la hoja: «entrada = harness (sin hub)».

### Qué hace Neni en PLAYTEST 1

- Jugar libremente la primera experiencia.
- Objetivo implícito del juego (no se lo digáis): llegar a entender el refugio el primer día.
- Duración orientativa: **15–25 min**.

### Dónde PARAR PLAYTEST 1

Parar cuando ocurra **lo primero** de:

1. Ha completado la guía inicial del juego **y** ha avanzado al **menos al día 2** (idealmente día 2–3), **o**
2. Han pasado ~25 min, **o**
3. Está claramente atascada / frustrada y no quiere seguir.

**Al parar:**

- Pulsar **G** (guardar) si lo ve, o no insistir.
- **No** borrar la partida si vais a hacer PLAYTEST 2 el mismo día.
- Rellenar la hoja §4 (PLAYTEST 1).
- Descanso breve.

---

## 2. Cómo continuar PLAYTEST 2

### Misma sesión (recomendado)

1. Seguir con la **misma partida** (no Nueva partida).
2. Si cerró el navegador:  
   - Ruta hub: portada → **Continuar**.  
   - Ruta harness:  
     `http://<IP>:8765/dev/harness-zz.html#load=1`  
     (sin `clear=1`).
3. Seguir jugando en horizontal.

### Qué observar en PLAYTEST 2 (sin decirle la lista)

El facilitador mira en silencio:

- ¿Quiere otro «Avanzar día»?
- ¿Explora el mapa o se queda en el campamento?
- ¿Encuentra sola cosas en **Más** / mapa?
- ¿Asignar gente se siente pesado?
- ¿Hay un rato en el que solo avanza días?
- Primera crisis (escasez, frío, aviso raro, ataque…) si aparece.

Duración orientativa: **35–50 min** adicionales, o hasta **día ~8–12**, o hasta la **primera crisis** clara.

### Dónde PARAR PLAYTEST 2

Parar cuando ocurra **lo primero** de:

1. Día **~10–12**, **o**
2. Primera crisis serio (ataque / brote / frío fuerte / quedarse sin comida-agua), **o**
3. ~50 min de juego en este bloque, **o**
4. Neni quiere parar.

Luego: guardar si puede + hoja §4 (PLAYTEST 2).

---

## 3. Qué NO hacer en estos playtests

- No fixes de staffing / Más / victoria «por si acaso».
- No ART PASS, no balance, no mecánicas nuevas.
- No deploy.
- No explicar sistemas que el juego debería enseñar.
- No pedir review de 200 puntos técnicos.

---

## 4. Método sencillo de observaciones

**Durante el juego:** el facilitador anota en bruto (frases de Neni, atascos, sorpresas).  
**Al final de cada playtest:** 2 minutos con esta hoja (una por playtest).

```
PLAYTEST: 1 / 2     Fecha: ________     Entrada: hub / harness
Dispositivo: móvil landscape     Días al parar: ____

En una frase: ¿qué estaba intentando hacer al final?

¿Quiso seguir?  sí / no / regular

3 cosas que entendió o hizo sola:
1.
2.
3.

3 dudas o atascos:
1.
2.
3.

¿Algo que quiso hacer y no pudo?

¿Algo aburrido o repetitivo?

¿Algo que le gustó / sorprendió?

Cita textual (si hay):

Prioridad sentida (elegir UNA):
[ ] no sé qué hacer
[ ] demasiados toques / menús
[ ] no encuentro cosas en el mapa
[ ] el juego me guía bien
[ ] quiero seguir mañana
[ ] otro: ________
```

Opcional: 2–3 capturas solo de momentos de duda (no galería de review).

Pasar las hojas a Cursor/ChatGPT después — **no** durante la partida.

---

## 5. Bloqueos técnicos reales (sin arreglar código ahora)

| Bloqueo | ¿Impide PT1–2? | Qué hacer |
|---------|----------------|-----------|
| **Producción desactualizada** (no ha habido deploy post ZZ-183) | Sí, si se usa prod | **No usar prod.** Usar repo local / harness. |
| **Móvil no alcanza el PC/servidor** (Wi‑Fi / firewall) | Sí | Verificar misma red; abrir puerto; o jugar en el propio PC en landscape (emulación peor, pero desbloquea). |
| **Login Intocables** falla en móvil | Solo ruta hub | Usar **ruta harness** (§1 alternativa). |
| **Portrait** bloquea con «Gira tu dispositivo» | No — es diseño | Girar a horizontal. |
| **Hub Continuar** no E2E’d | No para PT1 (Nueva partida) | En PT2, si Continuar falla → anotar como hallazgo; usar `#load=1` en harness. |
| **Arte / beeps provisionales** | No | Aviso único al inicio. |
| **Placement / staffing confusos** | No (son objeto del playtest) | Observar; no «arreglar» a mitad de sesión. |

**Ningún bloqueo de código se considera imprescindible de fixar antes del playtest**, salvo que al abrir la URL elegida el juego **no arranque** (pantalla negra / error). En ese caso: parar, informar, y solo entonces valorar un arreglo mínimo.

---

## 6. Tras PLAYTEST 1+2

1. Entregar hojas + notas brutas.  
2. Triage a P0/P1 del PRE_RELEASE_PLAN (humano + Cursor).  
3. **Seguir sin deploy** hasta: playtests · P0/P1 · ART PASS A · regresión final · **orden expresa**.

---

## Referencias

- `docs/PLAYTEST_PLAN.md` — protocolo completo PT1–4  
- `docs/PRE_RELEASE_PLAN.md` — marco aprobado  
- `docs/PRE_RELEASE_AUDIT.md` · `docs/ART_DEBT_AUDIT.md`
