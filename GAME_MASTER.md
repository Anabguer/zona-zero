# ZONA ZERO — GAME MASTER / MEGA PLAN

**Versión de diseño:** 1.2  
**Estado:** Corrección arquitectónica 1.2 aplicada — **muestra artística pendiente de aprobación**  
**Plataforma:** Web responsive (móvil + escritorio)  
**Stack objetivo:** HTML/CSS/JS + PHP + MySQL, sin APK  
**Repositorio:** `Anabguer/zona-zero`  
**Hosting:** Intocables / Hostalia  
**URL objetivo:** `/juegos/zona-zero/`

> ### CORRECCIÓN 1.2 (sustituye diseños incompatibles)
> - **Población colectiva** (números + labor con +/−). Prohibido gestionar individualmente a toda la colonia.
> - **Exploradores** (máx. 3) son los únicos personajes individuales. **No hay patrullas.**
> - **UI mundo continuo** sin pestañas principales `Mapa | Base | Gente | Más`.
> - Dirección artística objetivo: `docs/art-direction/` (aprobar antes del lote final de assets).

---

## 0. REGLA MAESTRA

Zona Zero debe ser un juego de **gestión indirecta, expansión territorial y supervivencia emergente**.

La experiencia que debe provocar es:

> Veo mi pequeña Zona Zero. Necesito recursos. Veo una zona interesante. Mando a mi explorador. Mientras tanto gestiono población y producción con números. El explorador vuelve. Consigo recursos. Construyo. Mi asentamiento cambia. Crece la población. Desbloqueo cosas. Puedo mandar varios exploradores a la vez. Conquisto ciudad. Ocurre algo inesperado. Pierdo recursos/gente/territorio. Me reorganizo y sigo.

No es un RPG de colonia. No se controla a cada habitante. No hay campaña lineal. No hay misiones idénticas en todas las partidas.

---

# 1. PILARES DE DISEÑO

## 1.1 Gestión indirecta

El jugador decide **qué**, **quién** y **dónde**. El sistema resuelve la acción.

Acciones típicas:
- ajustar labor colectiva (comida / agua / construcción / producción / defensa / medicina / disponibles);
- elegir **un explorador** y un destino de expedición;
- construir;
- producir;
- defender;
- investigar;
- ocupar una zona;
- comerciar;
- responder a eventos.

No hay movimiento manual de unidades ni combate táctico controlado unidad por unidad.  
**Prohibido (1.2):** lista de toda la colonia, caras/nombres/habilidades de cada habitante, pestaña Gente, asignación manual trabajador-a-edificio.

## 1.2 Crecimiento visible

La evolución debe verse físicamente:
- más edificios;
- más territorio controlado;
- más población;
- mejores defensas;
- carreteras/rutas utilizadas;
- vehículos;
- zonas iluminadas/seguras;
- edificios reparados;
- actividad en la base.

## 1.3 Riesgo real

La colonia puede retroceder mucho.

Ejemplo válido:
- población 52 → ataque + enfermedad → población 31 → escasez → población 24 → recuperación → población 40.

No debe existir crecimiento garantizado.

## 1.4 Imprevisibilidad controlada

No usar aleatoriedad absurda ni guion fijo.

El Director analiza el estado real de la colonia y escoge situaciones apropiadas dentro de un rango de intensidad.

## 1.5 Poca microgestión, muchas decisiones

Debe haber bastantes sistemas y recursos, pero la interfaz debe permitir entenderlos de un vistazo.

---

# 2. ESTRUCTURA DE PARTIDA

## 2.1 Inicio

Nueva partida:
- 3 supervivientes;
- Refugio Central nivel 1;
- capacidad aproximada 4;
- pequeña reserva de comida y agua;
- materiales mínimos;
- equipamiento pobre;
- solo el sector inicial es seguro;
- 2–4 localizaciones próximas parcialmente conocidas;
- resto cubierto por niebla/incertidumbre.

El mapa, localizaciones, distribución de recursos, nombres, eventos y parte de las amenazas se generan por semilla.

## 2.2 Escala esperada

Orientación, NO límites rígidos:
- Inicio: 3–8 habitantes.
- Comunidad pequeña: 8–20.
- Asentamiento: 20–50.
- Zona consolidada: 50–100.
- Gran comunidad: 100+.

La capacidad depende de infraestructura, no de un hardcode pequeño.

## 2.3 Victoria

Existe un objetivo de victoria lejano: **Estabilizar Zona Zero**.

Requisitos conceptuales:
- controlar una parte importante del mapa principal;
- alcanzar población estable elevada;
- garantizar comida y agua sostenibles;
- disponer de hospital/sanidad avanzada;
- energía estable;
- defensa avanzada;
- mantener rutas/logística;
- completar una cadena final variable de estabilización regional;
- sobrevivir a una crisis final adaptativa.

La cadena final tendrá variantes para no ser idéntica en todas las partidas.

Tras la victoria:

**ZONA ZERO ESTÁ ESTABILIZADA**

Opciones:
- Continuar partida (endless);
- Nueva partida.

---

# 3. TIEMPO Y RITMO

## 3.1 Unidad temporal

El juego trabaja en días, con acciones que pueden durar fracciones de día/tiempo real según interfaz.

El jugador puede avanzar el tiempo, pero las expediciones también deben ser apropiadas para sesiones móviles cortas.

## 3.2 Expediciones

Duraciones escaladas por distancia:
- cercanas: rápidas;
- medias: moderadas;
- lejanas: largas;
- vehículo + combustible: reduce duración y aumenta alcance/carga.

No convertir los temporizadores en monetización ni esperas artificiales.

## 3.3 Ritmo de presión

El Director alterna:
- calma;
- señales;
- presión;
- crisis;
- recuperación.

Nunca evento grave tras evento grave indefinidamente salvo que la propia situación del jugador haya creado una espiral de crisis.

---

# 4. RECURSOS

## 4.1 Recursos principales

1. **Comida** — consumo poblacional, expediciones, reservas.
2. **Agua** — consumo crítico, agricultura, ciertos edificios.
3. **Madera** — construcción temprana, reparaciones, calefacción eventual.
4. **Metal** — construcción avanzada, herramientas, defensas.
5. **Medicinas** — heridas, enfermedades, eventos sanitarios.
6. **Combustible** — vehículos, generadores y logística avanzada.
7. **Munición** — defensa y expediciones peligrosas.

## 4.2 Recursos secundarios desbloqueables

Solo cuando tengan función clara:
- energía (capacidad producida/consumida, no necesariamente inventario);
- piezas mecánicas;
- herramientas/equipamiento como categorías;
- protección.

Evitar recursos basura.

## 4.3 Escasez

Cada recurso debe poder provocar decisiones.

Ejemplos:
- falta agua → mortalidad/abandono/producción reducida;
- falta comida → hambre y caída de población;
- falta medicina → heridas duran más;
- falta combustible → expediciones lejanas a pie;
- falta munición → defensa menos eficaz;
- falta madera/metal → expansión frenada.

---

# 5. POBLACIÓN COLECTIVA + EXPLORADORES

> **1.2:** Esta sección sustituye el diseño anterior de gestión individual de todos los supervivientes y cualquier sistema de patrullas.

## 5.1 Población colectiva

La colonia puede llegar a 50, 100 o más habitantes. Se gestiona solo con números.

Ejemplo de UI:

**Población: 46 / 58**
- Disponibles: 8
- Comida: 10
- Agua: 5
- Construcción: 6
- Producción: 7
- Defensa: 8
- Medicina: 2

El jugador ajusta con `− / +`.  
El sistema redistribuye automáticamente ante muertes, enfermedad, crecimiento, ataques, etc., respetando prioridades de `balance.laborPriorities` / `laborTargets` y overrides manuales.

No existen:
- lista de todos los supervivientes;
- nombres/caras/habilidades de cada habitante;
- pestaña Gente;
- asignación manual trabajador→edificio.

Nacimientos, inmigración y bajas modifican el contador total (y heridos/enfermos agregados). Dependientes pueden restar fuerza laboral sin micromanejo.

## 5.2 Exploradores (únicos personajes)

Máximo **3 exploradores activos**.

Progresión de plazas (centralizada en `balance.explorers`, calibrable por simulación):
- inicio: 1 plaza;
- slot 2: umbrales de población / territorio / era;
- slot 3: umbrales avanzados.

Cada explorador tiene:
- retrato propio;
- nombre procedural **editable**;
- nivel / XP;
- estado (`ready` / `away` / `wounded` / `dead`);
- equipamiento ligero;
- vehículo opcional.

### Habilidades (escala 1–5, visual simple)
- Explorar
- Saquear
- Combatir
- Resistir

**Aprender haciendo** (progresión lenta a propósito):
- explorar zonas → Explorar;
- recuperar recursos → Saquear;
- enfrentarse a infectados → Combatir;
- expediciones difíciles / heridas / clima adverso → Resistir.

### Muerte del explorador
Permanente. Se pierde el personaje y su experiencia. El equipo puede recuperarse o no según azar/balance.  
Se puede reclutar un sustituto desde la población (el nuevo empieza verde).  
Debe doler perder un veterano — sin convertir el juego entero en historia de personajes.

## 5.3 Población natural

Sin gestionar parejas. El sistema global calcula nacimientos/inmigración con vivienda, estabilidad, comida/agua y seguridad. Los dependientes son abstracción, no fichas.

---

# 6. VIVIENDA, MORAL Y ESTABILIDAD

## 6.1 Vivienda

Cada alojamiento aporta capacidad.

Sin plazas:
- se frena inmigración;
- disminuye crecimiento natural;
- puede bajar estabilidad;
- en situaciones graves algunos abandonan.

## 6.2 Estabilidad comunitaria

Usar un indicador global sencillo, no Sims individual.

Factores positivos:
- comida/agua;
- vivienda;
- seguridad;
- sanidad;
- victorias/descubrimientos.

Negativos:
- hambre;
- muchas muertes;
- hacinamiento;
- ataques;
- enfermedad;
- crisis prolongadas.

Puede afectar productividad, llegadas y abandono.

---

# 7. BASE / CONSTRUCCIÓN

## 7.1 Vista

La base es un terreno visual, no una tabla.

Internamente puede usar grid, pero visualmente debe mostrar:
- suelo;
- caminos;
- vallas;
- vegetación/ruinas;
- edificios ilustrados;
- actividad ambiental ligera.

## 7.2 Colocación

Flujo:
1. elegir edificio;
2. ver coste y beneficio;
3. mostrar footprint fantasma;
4. tocar/clicar ubicación;
5. construir si hay recursos/espacio.

Permitir mover edificios cuando sea razonable, con coste cero o pequeño según balance.

## 7.3 Edificios iniciales y progresión

### Núcleo
- Refugio Central N1–N3: centro, capacidad/funciones generales.

### Vivienda
- Choza/refugio improvisado;
- Vivienda;
- Bloque acondicionado.

### Recursos
- Huerto;
- Pozo/colector;
- Leñera/aserradero;
- Recuperador de metal;
- Almacén.

### Producción
- Taller;
- Cocina/comedor;
- Depósito de agua;
- Invernadero;
- Taller mecánico.

### Salud
- Botiquín/puesto médico;
- Enfermería;
- Clínica/hospital.

### Seguridad
- Barricada;
- Valla;
- Torre de vigilancia;
- Armería;
- Puesto defensivo.

### Información/logística
- Radio;
- Centro de expediciones;
- Garaje;
- Centro de mando.

### Energía
- Generador;
- instalación mejorada/alternativa renovable en progresión avanzada.

### Investigación
- Mesa técnica;
- Laboratorio/centro técnico.

Cada familia tendrá 2–3 niveles o mejoras claras, no 15.

---

# 8. TRABAJADORES Y PRODUCCIÓN

Los edificios productivos tienen plazas de trabajo.

Interacción rápida:
- 0/2 trabajadores;
- botones +/- o asignación automática/manual;
- sugerencia de mejores trabajadores sin obligar a aceptarla.

La producción depende de:
- trabajadores;
- habilidad;
- edificio;
- mejoras;
- estabilidad;
- eventos/clima.

Debe existir botón/función opcional **Autoasignar** para reducir microgestión con poblaciones grandes.

---

# 9. MAPA DE CIUDAD

## 9.1 Objetivo visual

Mapa SVG estilizado y responsive con sensación de ciudad real simplificada.

Debe incluir:
- carreteras;
- manzanas;
- edificios;
- solares;
- parques/vegetación;
- ruinas;
- sectores.

No usar círculos genéricos como diseño final.

## 9.2 Estados territoriales

- Desconocido: niebla/silueta.
- Detectado: información parcial.
- Explorado: información conocida.
- Hostil: peligro claro.
- Controlado: halo/iluminación/identidad Zona Zero.
- Perdido/contestado: control degradado.

La transformación a controlado debe ser visualmente satisfactoria.

## 9.3 Tipos de localización

- viviendas;
- supermercado;
- farmacia;
- hospital;
- taller;
- gasolinera;
- almacén;
- ferretería;
- comisaría;
- estación/bus;
- colegio;
- parque;
- nave industrial;
- edificio de oficinas;
- centro comercial;
- depósito de agua;
- subestación/infraestructura;
- localizaciones especiales procedurales.

Cada tipo define tendencias de botín, riesgo y eventos, nunca resultado fijo.

## 9.4 Control territorial

Explorar no equivale automáticamente a conquistar.

Una zona puede requerir:
- limpiar infectados;
- asegurar accesos;
- completar expedición;
- gastar recursos;
- instalar puesto de control.

Controlar zonas amplía seguridad, alcance y posibilidades.

---

# 10. EXPEDICIONES

## 10.1 Flujo (1.2)

1. tocar destino en el mundo;
2. elegir **uno** de los exploradores disponibles;
3. elegir equipamiento si procede;
4. elegir vehículo si existe;
5. ENVIAR.

No seleccionar 7 habitantes. El explorador lidera; el sistema puede calcular apoyo humano interno sin UI.

Antes de enviar (simple):
- distancia;
- duración;
- peligro estimado;
- botín probable/conocido;
- estado del explorador;
- equipo;
- vehículo.

Durante: el explorador se ve en el mapa (ruta / marcador). Varios exploradores pueden estar fuera a la vez.

Después: informe breve (botín, heridas, muerte, descubrimientos, control territorial).

## 10.2 Riesgo

Considera peligro local, skills del explorador, equipo, vehículo, clima, información previa.  
Mostrar categoría: Bajo / Moderado / Alto / Extremo.

## 10.3 Botín

Tablas por tipo de lugar + modificadores + rareza. Nunca resultado fijo idéntico.

## 10.4 Equipamiento rápido

No inventario RPG. Categorías ligeras (arma / protección / vehículo).

---
- sin arma / arma básica / arma mejorada;
- sin protección / ligera / reforzada;
- vehículo si disponible.

Botón opcional “Equipar recomendado”.

---

# 11. VEHÍCULOS

Desbloqueo medio.

Tipos simplificados:
- bicicleta/carrito (sin combustible, carga limitada);
- coche;
- furgoneta;
- vehículo reforzado avanzado.

Aportan:
- velocidad;
- alcance;
- capacidad de carga;
- posible protección.

Consumen combustible y pueden averiarse.

No simulación mecánica compleja.

---

# 12. INFECTADOS Y COMBATE ABSTRACTO

## 12.1 Tipos

Pocos tipos claramente diferenciados:
- común;
- rápido;
- resistente;
- horda;
- especial raro.

No crear bestiario enorme.

## 12.2 Resolución

Combate automático basado en fuerza de ambos grupos + variabilidad limitada.

Resultado:
- victoria limpia;
- heridas;
- bajas;
- retirada;
- pérdida de equipo;
- fracaso;
- zona limpiada.

## 12.3 Ataques a base

El jugador prepara, no controla.

Defensa depende de:
- población asignada;
- habilidad;
- estructuras;
- munición;
- armas;
- alertas previas;
- intensidad.

Mostrar visualmente el ataque y después un informe claro.

---

# 13. DIRECTOR DE PARTIDA

## 13.1 Función

Es el cerebro que evita campaña fija y aleatoriedad injusta.

## 13.2 Índices internos

Calcular al menos:

### Fuerza de colonia
Combina:
- población funcional;
- defensa;
- armamento;
- edificios;
- territorio;
- reservas;
- tecnología.

### Fragilidad
- hambre/sed;
- heridos;
- escasez medicina;
- baja estabilidad;
- daños;
- pérdidas recientes.

### Momentum
Mide si el jugador lleva demasiado tiempo creciendo sin presión o encadenando derrotas.

### Tensión
Valor dinámico 0–100.

## 13.3 Presupuesto de amenaza

Cada evento tiene coste/intensidad.

El Director genera un presupuesto permitido según:
- progreso;
- fuerza;
- fragilidad;
- tensión;
- tiempo desde última crisis.

No seleccionar eventos fuera de rango salvo eventos especiales con advertencia/preparación.

## 13.4 Cooldowns

- global de crisis;
- por familia;
- por evento;
- protección relativa tras desastre grave.

## 13.5 Noches/días tranquilos

Debe ser posible que no pase nada importante.

La ausencia de evento también forma parte del ritmo.

---

# 14. EVENTOS — SISTEMA DE CONTENIDO

## 14.1 Volumen objetivo inicial

Implementar **mínimo 80 eventos base**, organizados en al menos 15 familias, con variantes/resultados procedurales. Esto debe producir cientos de combinaciones reales sin escribir cientos de historias completas.

Familias mínimas:
1. hallazgos;
2. radio;
3. supervivientes;
4. hambre/agua;
5. enfermedad;
6. accidentes;
7. clima;
8. infectados;
9. ataques;
10. infraestructura;
11. comercio;
12. rumores/pistas;
13. conflictos comunitarios abstractos;
14. oportunidades de expansión;
15. catástrofes.

## 14.2 Plantillas variables

Cada evento puede parametrizar:
- localización;
- recurso;
- cantidad;
- peligro;
- participantes;
- duración;
- resultado;
- secuela.

## 14.3 Decisiones

Algunos eventos ofrecen 2–3 decisiones.

No todos. Evitar fatiga de ventanas.

## 14.4 Memoria narrativa

Flags simples permiten consecuencias futuras.

Ejemplo:
- ayudaste a grupo desconocido → flag;
- semanas después aparece comercio/rescate/problema relacionado.

No crear novela rígida.

## 14.5 Antirrepetición

- cooldown;
- historial de familias;
- penalización de peso por repetición reciente;
- variantes;
- exclusiones mutuas.

---

# 15. CLIMA Y CATÁSTROFES

Sistema progresivo, desbloqueado tras primeros días.

Tipos:
- lluvia fuerte;
- ola de calor;
- frío;
- tormenta;
- incendio;
- contaminación/niebla peligrosa;
- fallo de infraestructura;
- gran horda.

Las catástrofes fuertes pueden destruir edificios y matar población.

Deben existir contramedidas:
- reservas;
- mejoras;
- defensas;
- energía;
- medicina;
- información previa.

Algunas llegan con señales, otras son más repentinas.

---

# 16. OTROS ASENTAMIENTOS / FACCIONES

Desbloqueo medio-tardío.

Generar 3–6 grupos por partida con rasgos globales:
- amistoso;
- comerciante;
- aislacionista;
- oportunista;
- hostil;
- variable.

Relación simplificada: hostil / tensa / neutral / amistosa / aliada.

Acciones:
- comerciar;
- ayudar;
- pedir ayuda;
- intercambiar información;
- negociar paso;
- conflicto/ataque abstracto.

No diplomacia 4X profunda.

---

# 17. INVESTIGACIÓN Y DESBLOQUEOS

No árbol gigantesco.

Cuatro ramas:
- Supervivencia;
- Construcción;
- Logística;
- Defensa.

Ejemplos:
- mejores cultivos;
- almacenamiento;
- filtros de agua;
- construcción reforzada;
- expediciones mayores;
- reparación de vehículos;
- radio avanzada;
- defensas;
- energía;
- sanidad.

Los desbloqueos requieren combinación de tiempo/recursos/infraestructura, no solo puntos abstractos.

---

# 18. PROGRESIÓN POR ERAS (NO GUION FIJO)

Las eras desbloquean sistemas, NO eventos obligatorios.

## Era 0 — Sobrevivir
3–8 personas. Agua/comida/refugio/exploración cercana.

## Era 1 — Asegurar
8–20. Producción básica, defensa, primeras zonas controladas, radio.

## Era 2 — Expandir
20–50. Varias expediciones, sanidad, talleres, vehículos básicos, amenazas mayores.

## Era 3 — Consolidar
50–100. Infraestructura, facciones, energía, producción avanzada, grandes ataques.

## Era 4 — Estabilizar
100+. Red territorial, logística, crisis regionales, condiciones de victoria.

La entrada en era depende de varios indicadores, no de “día 20”.

---

# 19. DERROTA Y RECUPERACIÓN

Derrota cuando:
- población llega a 0;
- o el Refugio Central queda perdido y no existe posibilidad válida de recuperación.

No perder automáticamente por quedarse temporalmente sin un recurso si aún existe una vía real de supervivencia.

Antes de derrota pueden existir estados críticos.

Pantalla de derrota muestra:
- días sobrevividos;
- máxima población;
- territorio máximo;
- causa principal;
- estadísticas curiosas;
- semilla;
- Nueva partida.

---

# 20. INTERFAZ / UX

## 20.1 Filosofía

Debe parecer videojuego mirando **Zona Zero**, NO una app con pestañas ni un dashboard.

## 20.2 HUD

Compacto permanente con iconografía propia:
- población/capacidad (tocable → labor colectiva);
- comida, agua, madera, metal, medicinas, combustible, munición;
- día / era / clima / estabilidad / amenaza / defensa (secundario).

No debe parecer una tabla.

## 20.3 Navegación (1.2) — sin pestañas principales

**Prohibido como estructura principal:** `Mapa | Base | Gente | Más`.

La pantalla principal es el **mundo continuo** (ciudad + territorio + asentamiento).

Desde ahí:
- tocar edificio → panel contextual;
- tocar zona → información / enviar explorador;
- tocar explorador → ficha pequeña;
- tocar población → gestión colectiva +/−;
- tocar recursos → detalle;
- investigación / facciones / vehículos → sheet “Más” u overlay.

Móvil: bottom sheets. Escritorio: panel lateral si hay espacio.  
Acciones globales mínimas en dock: Construir · Avanzar día · Más.

## 20.4 Población (sustituye “Gente”)

Solo números y steppers. Sin lista de personas.

## 20.5 Diario

Secundario. Eventos relevantes = cards. Sin spam de rutina.

## 20.6 Tutorial

Contextual:
1. comida corta;
2. población (asignar);
3. zona cercana;
4. enviar explorador;
5. construir.

---

# 21. DIRECCIÓN ARTÍSTICA

## 21.0 Aprobación pendiente

Muestra real en `docs/art-direction/` (`sample-mobile.png`, `sample-desktop.png`, `index.html`).  
**No producir el lote final de assets hasta aprobación explícita:** “Sí, quiero que Zona Zero se vea así.”

## 21.1 Paleta

No monocromo verde. Tierra/ocre, hormigón, metal, vegetación apagada, luces cálidas; verde solo para control/éxito; ámbar aviso; rojo peligro. Sin púrpura neón.

## 21.2 Estilo

Indie gestión postapocalíptica: minimalista pero **rico**, legible en móvil, SVG/CSS ligeros.  
No wireframe, no emojis, no cajas con letras, no círculos gigantes como zonas, no aspecto dashboard.

## 21.3 Assets obligatorios (tras aprobación)

Set coherente de SVG/arte propio:

### Recursos
7 iconos principales + secundarios.

### Edificios
Ilustración individual por tipo y nivel visual relevante (refugios, viviendas, huertos, pozos, almacenes, taller, clínica, generadores, defensas, investigación, garaje, avanzados).

### Mundo / mapa
Calles, manzanas, solares, vegetación, ruinas, coches abandonados, niebla, control/peligro, límites urbanos. Localizaciones integradas en la ciudad (no círculos-nodo).

### Base / núcleo
Terreno, caminos, vallas, cada construcción, estados dañado/mejorado — integrado visualmente en el mismo mundo cuando sea posible (zoom/detalle OK).

### Exploradores
Retratos propios (procedurales o set pequeño). **No** retratos para toda la población.

### Infectados / vehículos / UI
Siluetas de tipos, vehículos por categoría, botones/alertas/skills/estados/investigación.

No emojis como arte principal. No cajas con letras. No placeholders.

---

# 22. SONIDO

Opcional pero recomendado si puede hacerse con assets propios/licencia segura:
- click suave;
- construcción;
- expedición enviada/regresa;
- alerta;
- ataque;
- éxito;
- ambiente sutil.

Control de volumen/mute.

No bloquear implementación si sonido complica licencias.

---

# 23. BALANCE — PRINCIPIOS

## 23.1 Inicio difícil pero legible

El jugador debe tener varias necesidades desde el inicio, pero una ruta viable.

## 23.2 No snowball infinito

Más población implica:
- más producción;
- pero también más consumo;
- mayor territorio;
- mayor exposición;
- amenazas potencialmente mayores.

## 23.3 No death spiral automática

Después de pérdidas graves, el Director reduce temporalmente presión extrema para permitir recuperación, sin regalar recursos automáticamente.

## 23.4 Números configurables

TODOS los números importantes fuera de la lógica:
- consumos;
- costes;
- producción;
- botín;
- riesgos;
- cooldowns;
- probabilidades;
- capacidad;
- daños;
- tiempos;
- umbrales de era;
- Director.

---

# 24. SIMULACIÓN AUTOMÁTICA OBLIGATORIA

Cursor debe crear un **simulador/headless** del motor para balance.

Debe poder ejecutar cientos/miles de partidas automatizadas con estrategias simples.

Perfiles mínimos:
- conservador;
- expansivo;
- equilibrado;
- mala gestión intencionada.

Métricas:
- supervivencia a 10/30/60/120 días;
- población media/máxima;
- causas de derrota;
- recursos que bloquean demasiado;
- frecuencia de eventos;
- pérdidas;
- tiempo hasta eras;
- posibilidad de victoria.

Objetivo inicial de calibración, ajustable tras juego humano:
- jugador razonable puede perder partidas;
- primeras partidas no deben morir sistemáticamente en 2–3 días;
- mala gestión debe castigarse claramente;
- llegar a endgame debe requerir una partida larga y competente.

No falsear pruebas para alcanzar porcentajes: ajustar balance y documentar resultados.

---

# 25. TESTS OBLIGATORIOS

## Automatizados
- estado inicial;
- consumos;
- producción;
- construcción;
- capacidad;
- expediciones;
- riesgo;
- muerte;
- control territorial;
- Director;
- cooldowns;
- eventos;
- guardado/migración;
- derrota;
- victoria;
- continuidad post-victoria.

## E2E navegador
- crear cada slot;
- guardar/cargar;
- jugar flujo completo;
- construir;
- expedición;
- evento;
- avanzar;
- derrota;
- responsive móvil y escritorio.

No considerar “probado” un juego solo por smoke tests unitarios.

---

# 26. GUARDADO

3 slots.

Servidor/MySQL como fuente fiable vinculada a auth Intocables.

Guardar:
- versión;
- semilla;
- estado;
- mapa;
- población;
- edificios;
- expediciones;
- eventos/flags;
- relaciones;
- investigación;
- historial necesario;
- victoria/endless.

Autosave + guardado explícito.

Migraciones versionadas y pequeñas.

---

# 27. ARQUITECTURA

Mantener separación clara:

- `state/` estado y selectores;
- `sim/` simulación;
- `director/` eventos/dificultad;
- `render/` UI/mapa/base;
- `api/` cliente servidor;
- `content/` datos/balance/eventos;
- `assets/` arte;
- `tests/`;
- `tools/sim/` simulador headless.

Evitar monolitos gigantes.

PHP fino para auth/save/load.

---

# 28. CONTENIDO INICIAL OBJETIVO

Para considerar Zona Zero “juego completo v1” antes de entregarlo a la jugadora:

- 7 recursos principales funcionales;
- 20+ edificios/mejoras contando niveles/variantes útiles;
- 15+ tipos de localización;
- 5 habilidades/especialidades simples;
- sistema procedural de supervivientes;
- crecimiento natural + llegadas;
- 4+ tipos de infectado;
- ataques;
- 4+ vehículos/categorías;
- 4 ramas de investigación;
- 80+ eventos base en 15+ familias;
- clima/catástrofes;
- 3–6 facciones procedurales;
- 5 eras de progreso;
- victoria + endless;
- arte propio completo para todo lo visible;
- tutorial contextual;
- simulador de balance;
- tests E2E.

Estos son mínimos de contenido, no obligación de inflar artificialmente el juego.

---

# 29. COSAS PROHIBIDAS

- campaña lineal idéntica;
- misión obligatoria idéntica en cada partida;
- controlar personaje directamente;
- combate manual;
- 200 recursos sin función;
- árbol tecnológico gigantesco;
- hojas RPG complejas;
- emojis como arte principal;
- interfaz tipo Excel/admin;
- dificultad basada solo en día;
- amenazas imposibles sin preparación razonable;
- proteger siempre al jugador;
- monetización, anuncios, energía premium;
- APK;
- dependencias servidor Node innecesarias;
- hardcodes importantes dispersos por JS.

---

# 30. FLUJO CURSOR ↔ CHATGPT

`GAME_MASTER.md` en GitHub es la fuente de verdad.

Cursor:
- implementa;
- mantiene estado técnico/changelog;
- no cambia reglas aprobadas unilateralmente;
- commit/push.

ChatGPT:
- revisa repo;
- diseña cambios con la usuaria;
- convierte decisiones en especificaciones;
- revisa coherencia.

Las propuestas nuevas se marcan como PROPUESTA hasta aprobación.

---

# 31. ORDEN DE IMPLEMENTACIÓN INTERNA PARA CURSOR

Cursor puede dividir internamente el trabajo como necesite, pero NO debe pedir aprobación fase por fase.

Orden recomendado:
1. auditar MVP actual contra este documento;
2. plan de migración sin romper saves si es viable;
3. consolidar arquitectura/config;
4. motor de población/recursos/producción;
5. base y edificios;
6. ciudad/control territorial;
7. expediciones/equipamiento;
8. combate/ataques;
9. Director/eventos;
10. clima/catástrofes;
11. vehículos;
12. investigación;
13. facciones;
14. eras/victoria/endless;
15. UX completa;
16. arte/assets;
17. tutorial;
18. simulador y balance;
19. tests E2E;
20. optimización móvil;
21. deploy;
22. documentación/commit/push.

Puede trabajar por bloques técnicos, pero la entrega al usuario debe hacerse al terminar el conjunto, salvo bloqueo real.

---

# 32. CRITERIO DE ENTREGA

NO entregar simplemente porque “compila”.

Antes de decir que está terminado, Cursor debe:
- jugar manualmente una partida real durante suficiente tiempo para alcanzar varios desbloqueos;
- ejecutar simulaciones largas;
- comprobar que puede perder;
- comprobar que puede recuperarse de crisis;
- comprobar que la progresión no se bloquea;
- verificar victoria mediante test/simulación;
- probar móvil y escritorio;
- comprobar que visualmente parece juego;
- desplegar producción;
- revisar consola/API;
- guardar/cargar;
- actualizar GAME_MASTER;
- commit/push.

---

# 33. RESULTADO DESEADO

Zona Zero v1 debe permitir que una persona pueda jugar durante muchas horas sin conocer de memoria la partida.

La diversión no depende de una historia fija sino de la combinación de:
- mapa procedural;
- necesidades;
- gestión;
- expansión;
- población;
- riesgo;
- Director;
- eventos variables;
- pérdidas;
- recuperación;
- progresión.

La pregunta constante del jugador debe ser:

> “Vale… ¿qué necesito ahora y a quién mando a por ello?”

Y periódicamente el juego debe responder:

> “Pues ahora tienes otro problema.”

---

# 34. DECISIONES APROBADAS DE PRODUCTO

- Nombre: **Zona Zero**.
- Web, no APK.
- Móvil + escritorio.
- 3 slots.
- Login/guardado persistente mediante ecosistema Intocables.
- Inicio con aproximadamente 3 supervivientes.
- Población escalable a 50/100+ si infraestructura lo permite.
- Supervivientes funcionales, no protagonistas.
- Muerte permanente.
- Habilidades simples y progresivas.
- Bastantes recursos, sin exceso absurdo.
- Construcción física/visual de base.
- Ciudad visual minimalista.
- Conquista territorial satisfactoria.
- Expediciones automáticas: elegir quién + dónde, sin control manual.
- Sorpresas en resultados.
- Enemigos/ataques.
- Catástrofes.
- Posibilidad de pérdidas masivas y derrota.
- No partidas cortas por diseño.
- Eventos no lineales.
- Director adaptativo.
- Victoria lejana + opción de continuar infinitamente.
- Arte propio, no emojis.
- GitHub como fuente compartida.

---

# 35. CHANGELOG DE DISEÑO

## v1.0
- Consolidación del diseño integral.
- Define juego completo, no MVP incremental.
- Añade victoria + endless.
- Define eras, facciones, vehículos, investigación, clima y catástrofes.
- Define Director adaptativo y volumen mínimo de contenido.
- Define dirección artística y set de assets.
- Añade simulador headless y criterios de balance/prueba.


---

# ESTADO TÉCNICO E IMPLEMENTACIÓN (Cursor)

**Versión técnica:** 1.2.0-arch — corrección arquitectónica (arte pendiente de aprobación)  
**Repo:** Anabguer/zona-zero · `main`  
**Local:** `W:\juegos\zona-zero\`  
**URL:** https://intocables13.com/juegos/zona-zero/  
**Stack:** HTML/CSS/JS + PHP + MySQL · sin APK · 3 slots · auth Intocables  
**Prefijo SQL:** `zona_zero_*`  
**save_version / v:** **4** · cache assets `?v=10`

## Arquitectura real (1.2)
- Cliente: `js/` state, sim, director, population, explorers, render-map, render-base, icons, sound, api, main, rng, util
- UI: `play.php` mundo continuo + `css/world.css` (sin pestañas Gente)
- Contenido: `content/*.json` — `balance.explorers` / laborTargets; buildings×32; locations×18; events×110; research; vehicles; infected; factions; eras
- Muestra artística: `docs/art-direction/`
- API PHP + `zona_zero_saves`
- Tools: balance-sim, screenshots, manual-play, harness

## Decisiones 1.2 (sustituyen gente individual / patrullas)
- Población = contador + pools de labor (+/−) + redistribución automática
- Exploradores máx. 3; skills Explorar/Saquear/Combatir/Resistir; muerte permanente; reclutamiento desde población
- Expediciones = 1 explorador por salida; varias en paralelo
- UI sin tabs Mapa/Base/Gente; sheets contextuales
- Migración saves v3→v4 (supervivientes → population + 1 explorador)

## Pendiente (tras “Sí, se ve así”)
- Lote artístico completo alineado a `docs/art-direction/sample-*.png`
- Integración visual mundo+núcleo al nivel de la muestra
- Recalibración balance-sim con población colectiva
- Pulido / pruebas / producción

## Balance (última calibración conocida = v1, pre-1.2)
- ~360 partidas headless @60/120d — **requiere re-sim tras 1.2**
- Ver `scripts/balance-report.json`

## Changelog técnico
### 1.2.0-arch
- Población colectiva + exploradores; save v4
- UX mundo continuo (play.php / world.css / main.js)
- GAME_MASTER actualizado (sección 5/10/20/21)
- Muestra artística en docs/art-direction (parada de aprobación)

### 1.1.0 — Game Experience
- Mapa ciudad, base terreno, sonido, onboarding, cards, etc.

### 1.0.0 / 0.3.x–0.1.0
- Implementación v1 + MVP + fix Derrota

