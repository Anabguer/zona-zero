# PLAYTEST_PLAN — Pruebas humanas pre-publicación

**Fecha:** 2026-08-16  
**Jugadora objetivo:** Neni (u otra persona) **sin** conocer sistemas internos.  
**Objetivo:** sentir / entender / hacer — **no** revisar 200 checks técnicos.

> Los smokes/E2E validan que el motor no rompe.  
> Estos playtests validan si el **juego** funciona como experiencia.

**Reglas para quien facilita:**

- No explicar “cómo se supone que se juega” salvo bloqueo total.  
- Anotar lo que hace, lo que dice, dónde se atasca, qué ignora.  
- No recalibrar balance durante la sesión.  
- Arte/audio provisionales: decirlo **una vez** al inicio (“placeholder visual/sonoro”).  
- Dispositivo: **móvil landscape real** en PLAYTEST 1–2; desktop opcional en 3–4.

---

## Setup común

| Ítem | Valor |
|------|-------|
| Build | Repo local / harness `dev/harness-zz.html` o `play.php` — **sin deploy** |
| Save | Nueva partida limpia por sesión (salvo Continuar en test dedicado) |
| Sonido | Probar mute ON/OFF al menos una vez |
| Duración | Ver cada playtest |
| Captura | Notas + 3–5 fotos opcionales de momentos de duda (no suite review completa) |

**Frase de arranque sugerida:**

> “Sobrevive y haz crecer el refugio. Jugá como te salga. Si no sabés qué hacer, decilo en voz alta.”

---

## PLAYTEST 1 — Onboarding / D1  
**Duración:** 15–25 min · **Hasta:** completar guía o ~día 3

### Qué observar (pocas preguntas)

1. ¿Entiende que el juego es **horizontal**?  
2. ¿Sigue el coach sin frustrarse?  
3. ¿Construye huerto/pozo y asigna gente sin pedir ayuda?  
4. ¿El brief del día se lee o se pulsa Continuar a ciegas?  
5. ¿Siente que el **mapa** es el juego (no un menú)?

### Señales de éxito

- Completa farm → staff → well → staff → avanzar día.  
- No busca pestañas de app.  
- Dice al menos una intención (“necesito comida/agua”).

### Señales de alarma

- No encuentra cómo construir.  
- No entiende el fantasma / ✓.  
- Abandona antes del día 2.

### No pedir en este playtest

Review de research, victoria, balance, arte fino.

---

## PLAYTEST 2 — Primeros ~10 días  
**Duración:** 35–50 min · **Hasta:** día ~8–12 o primera crisis (ataque/brote/frío)

### Qué observar

1. ¿Quiere pulsar **Avanzar día** otra vez? (“uno más”)  
2. ¿Explora el mapa o se encierra?  
3. ¿Descubre **Recuperar territorio** / Más sin pista?  
4. ¿El staffing se siente trabajo o decisión?  
5. ¿Entiende avisos de amenaza / escasez?  
6. ¿Hay momento muerto (solo avanzar)?

### Señales de éxito

- Al menos 1 expedición.  
- Reacciona a un problema (comida, madera, daño, ataque).  
- Nombra un objetivo propio (“quiero X”).

### Señales de alarma

- Solo avanza días.  
- No toca exploración.  
- Odia asignar trabajadores.  
- No encuentra qué hacer tras el tutorial.

### Nota WATCH (observar, no corregir)

Si no explora y “le va bien”, anotar (WATCH sin_explorar).

---

## PLAYTEST 3 — Partida media  
**Duración:** 60–90 min · **Hasta:** día ~25–40 o primera tech / vehículo / varios sectores

### Qué observar

1. ¿Hay decisiones con tradeoff (expandir vs reforzar vs investigar)?  
2. ¿Más se vuelve un vertedero confuso?  
3. ¿Misiones / contactos / research aparecen en su radar?  
4. ¿Siente crecimiento de la colonia en el **mapa**?  
5. ¿Repetición de eventos molesta?  
6. ¿Quiere seguir mañana?

### Señales de éxito

- Al menos 2 sistemas midgame usados con intención (p.ej. research + expandir, o defensa + exploración).  
- Describe una estrategia (“voy a…”).

### Señales de alarma

- Solo Construir + Avanzar.  
- Abandona por fricción UI.  
- “No sé a qué estoy jugando”.

### Nota WATCH

Si “construir todo” se siente óptimo sin coste, anotar (WATCH sobreexpansión) — **sin retocar knobs en sesión**.

---

## PLAYTEST 4 — Crisis / late game  
**Duración:** 60–120 min (o continuación de save de PT3) · **Hasta:** crisis seria, cerca de victoria, o derrota consciente

### Qué observar

1. ¿Entiende **por qué** va a ganar o perder?  
2. ¿La crisis final (si llega) se siente justa o trampa?  
3. ¿Hay tensión real?  
4. ¿Endless interesa o sobra?  
5. ¿Eras / victoria son ilegibles?

### Señales de éxito

- Puede explicar 1–2 condiciones de victoria o de muerte.  
- Una derrota o un apuro se entiende (“me faltó X”).  
- Quiere otra partida o endless con motivo.

### Señales de alarma

- Victoria/derrota sorpresa total.  
- “El juego me castigó sin avisar”.  
- Late game = solo clics administrativos.

---

## Hoja de captura (una por sesión)

```
PLAYTEST #: __   Fecha: __   Dispositivo: móvil / desktop
Días alcanzados: __
¿Completó objetivo de sesión?: sí / no / parcial

3 cosas que hizo sin ayuda:
1.
2.
3.

3 dudas / atascos:
1.
2.
3.

¿Quiso seguir? sí / no · por qué:

Cita textual memorable:

WATCH observados (si aplica): sobreexpansión / eras / sin explorar / otro:

Prioridad sentida (elegir 1): UX midgame / staffing / objetivos / arte / audio / balance / otro
```

---

## Qué hacer con los resultados

1. Triage a **P0/P1/P2** del `PRE_RELEASE_PLAN.md` (no reabrir 135 fases).  
2. Bugs inequívocos → fix puntual.  
3. WATCH de balance → solo tras ≥2 playtests humanos alineados.  
4. Arte A → planificar ART PASS **expreso**, no mezclar con sistemas.

---

## Fuera de alcance de estos playtests

- Suite E2E completa.  
- Recalibración D100.  
- Deploy.  
- Aprobación de arte final.  
- WIP hub.
