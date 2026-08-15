# -*- coding: utf-8 -*-
"""Generate Zona Zero content JSON files."""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

OUT = Path(r"W:\juegos\zona-zero\content")


def ev(
    id_,
    name,
    family,
    intensity,
    cooldown,
    weight,
    min_day,
    variants,
    *,
    min_era=0,
    max_era=4,
    conditions=None,
    choices=None,
):
    e = {
        "id": id_,
        "name": name,
        "family": family,
        "intensity": intensity,
        "cooldown": cooldown,
        "weight": weight,
        "minDay": min_day,
        "minEra": min_era,
        "maxEra": max_era,
        "conditions": conditions or {},
        "variants": [{"text": t, "effects": fx} for t, fx in variants],
    }
    if choices:
        e["choices"] = choices
    return e


def build_events():
    E = []

    # ── calma ──────────────────────────────────────────────────────────────
    E += [
        ev("calma_noche_tranquila", "Noche en calma", "calma", 0, 1, 12, 1, [
            ("Los infectados se oyen lejos. La colonia respira.", {}),
            ("Fogatas bajas y turnos cortos. Descansáis mejor.", {"stabilityDelta": 1}),
            ("Una noche fría pero estable. Nadie llama a la puerta.", {}),
        ]),
        ev("calma_turno_rutina", "Turno rutinario", "calma", 0, 0, 14, 1, [
            ("La noche pasa sin incidentes dignos de anotar.", {}),
            ("Solo viento y distancias. Nadie se mueve cerca.", {}),
            ("Vigilancia rutinaria. Sin novedades en el perímetro.", {}),
        ]),
        ev("calma_historias_fuego", "Historias al fuego", "calma", 0, 5, 4, 2, [
            ("Alguien cuenta una historia absurda y la tensión baja.", {"stabilityDelta": 1}),
            ("Repasáis nombres de los que ya no están. Silencio respetuoso.", {}),
            ("Una canción a media voz mantiene despiertos a los de guardia.", {"stabilityDelta": 1}),
        ], conditions={"minPop": 2, "maxThreat": 50}),
        ev("calma_cielo_despejado", "Cielo despejado", "calma", 0, 4, 5, 1, [
            ("El horizonte se ve limpio. Buen momento para planear.", {"weather": "clear"}),
            ("Sin niebla ni tormenta. Las rutas se leen mejor.", {"weather": "clear", "researchBonus": 1}),
            ("El sol seco ayuda a tender ropa y redes.", {"weather": "clear", "stabilityDelta": 1}),
        ], conditions={"maxThreat": 40}),
        ev("calma_descanso_merecido", "Descanso merecido", "calma", 0, 6, 3, 3, [
            ("Tras días duros, el turno pasa sin sobresaltos.", {"stabilityDelta": 2}),
            ("Alguien reparte café amargo. El ánimo sube un punto.", {"stabilityDelta": 1}),
            ("Nadie discute. Raro, y bienvenido.", {"stabilityDelta": 1}),
        ], conditions={"minPop": 3, "minStability": 20}),
    ]

    # ── hallazgos ──────────────────────────────────────────────────────────
    E += [
        ev("hallazgo_mochila_perimetro", "Mochila en el perímetro", "hallazgos", 1, 4, 4, 2, [
            ("Una mochila abandonada junto a la valla.", {"loot": {"food": [1, 3], "water": [0, 2]}}),
            ("Restos de un campamento improvisado: algo útil queda.", {"loot": {"food": [2, 4], "medicine": [0, 1]}}),
            ("Una riñonera con latas y un filtro viejo.", {"loot": {"food": [1, 2], "water": [1, 2]}}),
        ], conditions={"maxThreat": 55}),
        ev("hallazgo_vehiculo_piezas", "Vehículo destrozado", "hallazgos", 1, 6, 3, 3, [
            ("Un coche quemado aún guarda piezas.", {"loot": {"metal": [2, 4], "fuel": [0, 2]}}),
            ("Desmontáis un eje usable del chasis.", {"loot": {"metal": [3, 5]}}),
            ("El depósito no está del todo seco.", {"loot": {"fuel": [1, 3], "metal": [1, 2]}}),
        ], conditions={"minControlled": 1}),
        ev("hallazgo_lena_muro", "Leña apilada", "hallazgos", 1, 5, 3, 2, [
            ("Leña seca tras un muro derruido.", {"loot": {"wood": [2, 5]}}),
            ("Tablones de un tejado caído, listos para cortar.", {"loot": {"wood": [3, 6]}}),
            ("Palés olvidados en un solar.", {"loot": {"wood": [2, 4], "metal": [0, 1]}}),
        ], choices=[
            {"id": "llevar", "label": "Llevar todo", "effects": {"loot": {"wood": [3, 5]}, "threatDelta": 1}},
            {"id": "poco", "label": "Solo lo necesario", "effects": {"loot": {"wood": [1, 2]}}},
        ]),
        ev("hallazgo_caja_militar", "Caja militar", "hallazgos", 2, 9, 2, 5, [
            ("Munición olvidada en una zona controlada.", {"loot": {"ammo": [1, 3], "metal": [0, 2]}}),
            ("Un botiquín de campaña incompleto pero útil.", {"loot": {"medicine": [1, 3], "ammo": [0, 1]}}),
            ("Raciones de combate y un cargador medio.", {"loot": {"food": [2, 3], "ammo": [1, 2]}}),
        ], conditions={"minControlled": 2}, min_era=1),
        ev("hallazgo_bidon_sotano", "Bidón medio lleno", "hallazgos", 1, 7, 3, 3, [
            ("Combustible en un sótano cercano.", {"loot": {"fuel": [2, 4]}}),
            ("Un depósito doméstico aún tiene gasolina.", {"loot": {"fuel": [1, 3], "metal": [0, 1]}}),
            ("Garrafas etiquetadas: una sigue sellada.", {"loot": {"fuel": [2, 3]}}),
        ]),
        ev("hallazgo_escondite_pared", "Escondite intacto", "hallazgos", 2, 11, 2, 7, [
            ("Tras una pared falsa: agua, comida y un poco de todo.", {"loot": {"food": [2, 4], "water": [2, 4], "medicine": [0, 2], "ammo": [0, 1]}}),
            ("Una caja fuerte forzada a medias. El botín merece el riesgo.", {"loot": {"metal": [2, 4], "ammo": [1, 2], "medicine": [1, 2]}}),
            ("Despensa de emergencia sellada desde el colapso.", {"loot": {"food": [3, 5], "water": [2, 3]}}),
        ], conditions={"minControlled": 3}, choices=[
            {"id": "abrir", "label": "Abrir con cuidado", "effects": {"loot": {"food": [2, 4], "water": [1, 3]}, "threatDelta": 1}},
            {"id": "dejar", "label": "Marcar y volver después", "effects": {"setFlag": "cache_marked", "researchBonus": 1}},
            {"id": "forzar", "label": "Forzar ya", "effects": {"loot": {"food": [3, 6], "ammo": [0, 2]}, "damageSurvivor": 8}},
        ]),
        ev("hallazgo_farmacia_saqueada", "Farmacia saqueada", "hallazgos", 2, 10, 2, 6, [
            ("Estantes vacíos… salvo un cajón oculto.", {"loot": {"medicine": [2, 4], "water": [0, 1]}}),
            ("Jeringuillas y vendas útiles.", {"loot": {"medicine": [1, 3]}}),
            ("Alguien llegó antes. Solo restos.", {"loot": {"medicine": [0, 2], "metal": [0, 1]}}),
        ], conditions={"minControlled": 1}),
    ]

    # ── radio ──────────────────────────────────────────────────────────────
    E += [
        ev("radio_estatica_corta", "Estática corta", "radio", 1, 5, 3, 2, [
            ("Un chasquido en la banda civil. Nadie responde.", {}),
            ("Oís tres palabras antes de que muera la señal.", {"setFlag": "radio_heard"}),
            ("Alguien tararea una frecuencia conocida. Silencio.", {}),
        ], choices=[
            {"id": "escuchar", "label": "Seguir escuchando", "effects": {"setFlag": "radio_heard", "researchBonus": 1}},
            {"id": "apagar", "label": "Apagar la radio", "effects": {"stabilityDelta": 1}},
        ]),
        ev("radio_sos_lejano", "SOS lejano", "radio", 2, 8, 3, 4, [
            ("Un SOS débil pide agua al norte.", {"discoverZone": True, "setFlag": "sos_north"}),
            ("Coordenadas a medias: una zona sin cartografiar.", {"discoverZone": True}),
            ("La señal se corta tras pedir medicinas.", {"discoverZone": True, "threatDelta": 1}),
        ], choices=[
            {"id": "responder", "label": "Intentar responder", "effects": {"setFlag": "radio_reply", "stabilityDelta": 1}},
            {"id": "ignorar", "label": "No comprometer la posición", "effects": {"stabilityDelta": -1}},
        ]),
        ev("radio_bando_militar", "Banda militar", "radio", 2, 10, 2, 6, [
            ("Fragmentos de un protocolo de evacuación obsoleto.", {"researchBonus": 2}),
            ("Códigos de frecuencia útiles para el taller.", {"loot": {"metal": [0, 1]}, "researchBonus": 1}),
            ("Advertencia de zona caliente al este.", {"threatDelta": 2, "discoverZone": True}),
        ], min_era=1),
        ev("radio_musica_fantasma", "Música fantasma", "radio", 1, 7, 2, 3, [
            ("Una emisora muerta reproduce un bucle de canciones.", {"stabilityDelta": 2}),
            ("Alguien llora al reconocer la melodía.", {"stabilityDelta": 1}),
            ("La música atrae miradas al cielo. Nadie ataca.", {}),
        ], conditions={"maxThreat": 45}),
        ev("radio_interferencia", "Interferencia hostil", "radio", 3, 9, 2, 8, [
            ("Alguien jammea vuestra frecuencia. Os han oído.", {"threatDelta": 4, "setFlag": "radio_compromised"}),
            ("Una voz amenaza con visitar el refugio.", {"threatDelta": 5}),
            ("Ruido blanco intenso. Perdéis una noche de escucha.", {"stabilityDelta": -1}),
        ], conditions={"requiresFlag": "radio_heard"}, min_era=1, choices=[
            {"id": "cambiar", "label": "Cambiar de banda", "effects": {"clearFlag": "radio_compromised", "loot": {"metal": [0, 1]}}},
            {"id": "silencio", "label": "Radio en silencio 48h", "effects": {"threatDelta": -1, "stabilityDelta": -1}},
        ]),
        ev("radio_mapa_oral", "Mapa por voz", "radio", 1, 8, 2, 5, [
            ("Un operador describe rutas seguras entre ruinas.", {"discoverZone": True, "researchBonus": 1}),
            ("Indicaciones para un depósito de agua municipal.", {"discoverZone": True}),
            ("Hablan de un puente caído: hay que rodear.", {"discoverZone": True, "threatDelta": 1}),
        ]),
        ev("radio_codigo_viejo", "Código viejo", "radio", 1, 9, 2, 7, [
            ("Descifráis un mensaje civil antiguo.", {"researchBonus": 2}),
            ("Listas de suministros de un depósito inexistente.", {"discoverZone": True}),
            ("La clave sirve para otra frecuencia.", {"setFlag": "radio_code", "researchBonus": 1}),
        ]),
    ]

    # ── supervivientes ─────────────────────────────────────────────────────
    E += [
        ev("sup_senal_humo", "Señal de humo", "supervivientes", 1, 8, 2, 4, [
            ("Un superviviente agotado pide unirse.", {"spawnSurvivorChance": 0.9}),
            ("Dos personas piden agua; una se queda.", {"spawnSurvivorChance": 0.7}),
            ("Una familia rota: solo el más fuerte llega.", {"spawnSurvivorChance": 0.85}),
        ], conditions={"minControlled": 1}, choices=[
            {"id": "acoger", "label": "Acoger", "effects": {"spawnSurvivorChance": 1.0, "stabilityDelta": 1}},
            {"id": "raciones", "label": "Dar raciones y despedir", "effects": {"stabilityDelta": 1}},
            {"id": "rechazar", "label": "Rechazar", "effects": {"stabilityDelta": -2, "threatDelta": 1}},
        ]),
        ev("sup_grupo_transito", "Grupo en tránsito", "supervivientes", 2, 12, 2, 10, [
            ("Un grupo pide quedarse una noche. Uno se une al amanecer.", {"spawnSurvivorChance": 0.8}),
            ("Rechazáis a forasteros armados. La amenaza sube.", {"threatDelta": 3}),
            ("Intercambiáis mapas y uno decide quedarse.", {"spawnSurvivorChance": 0.6, "discoverZone": True}),
        ], conditions={"minControlled": 2}),
        ev("sup_medico_errante", "Médico errante", "supervivientes", 2, 14, 2, 8, [
            ("Un sanitario pide techo a cambio de curas.", {"spawnSurvivorChance": 0.75, "loot": {"medicine": [1, 2]}}),
            ("Trata heridas y se va dejando un botiquín.", {"loot": {"medicine": [2, 4]}, "stabilityDelta": 1}),
            ("Exige medicinas propias como pago de entrada.", {"spawnSurvivorChance": 0.55}),
        ], conditions={"minPop": 3}, min_era=1, choices=[
            {"id": "reclutar", "label": "Ofrecer plaza fija", "effects": {"spawnSurvivorChance": 1.0}},
            {"id": "pago", "label": "Pagar y que se vaya", "effects": {"loot": {"medicine": [2, 3]}}},
        ]),
        ev("sup_nino_solo", "Menor solo", "supervivientes", 2, 15, 1, 6, [
            ("Un adolescente asustado llega al perímetro.", {"spawnSurvivorChance": 0.95, "stabilityDelta": 2}),
            ("Lo escondéis la primera noche; al día se integra.", {"spawnSurvivorChance": 1.0}),
            ("Trae noticias de un campamento saqueado.", {"spawnSurvivorChance": 0.8, "threatDelta": 2}),
        ], conditions={"minPop": 2, "maxThreat": 60}),
        ev("sup_exmilitar", "Exmilitar", "supervivientes", 2, 16, 2, 12, [
            ("Un veterano ofrece vigilancia a cambio de comida.", {"spawnSurvivorChance": 0.7}),
            ("Enseña formaciones básicas a la guardia.", {"researchBonus": 2, "stabilityDelta": 1}),
            ("Pide munición antes de jurar lealtad.", {"spawnSurvivorChance": 0.55}),
        ], conditions={"minPop": 4}, min_era=2),
        ev("sup_desercion_interna", "Quién se va", "supervivientes", 3, 10, 2, 9, [
            ("Alguien empaqueta en silencio. La moral tiembla.", {"stabilityDelta": -3}),
            ("Una discusión termina con una marcha nocturna.", {"stabilityDelta": -4, "damageSurvivor": 5}),
            ("Convencéis a la persona de quedarse… por ahora.", {"stabilityDelta": -1}),
        ], conditions={"minPop": 5, "maxStability": 40}, choices=[
            {"id": "convencer", "label": "Convencer de quedarse", "effects": {"stabilityDelta": 1}},
            {"id": "dejar_ir", "label": "Dejar marchar en paz", "effects": {"stabilityDelta": -2, "killSurvivorChance": 0.15}},
        ]),
        ev("sup_hermano_perdido", "Hermano perdido", "supervivientes", 2, 13, 2, 7, [
            ("Alguien reconoce a un familiar entre forasteros.", {"spawnSurvivorChance": 0.85, "stabilityDelta": 3}),
            ("El reencuentro es amargo: solo queda uno.", {"spawnSurvivorChance": 0.7, "stabilityDelta": 1}),
            ("No es quien pensaban. Decepción.", {"stabilityDelta": -2}),
        ], conditions={"minPop": 3}),
    ]

    # ── hambre_agua ────────────────────────────────────────────────────────
    E += [
        ev("ham_raciones_cortas", "Raciones cortas", "hambre_agua", 2, 5, 4, 3, [
            ("El almacén se ve demasiado vacío esta mañana.", {"stabilityDelta": -2, "threatDelta": 1}),
            ("Discutís si adelantar la siguiente expedición.", {"stabilityDelta": -1}),
            ("Alguien esconde migajas. La tensión sube.", {"stabilityDelta": -3, "damageSurvivor": 4}),
        ]),
        ev("ham_comida_podrida", "Comida en mal estado", "hambre_agua", 2, 6, 3, 4, [
            ("Parte de las raciones se estropea.", {"loot": {"food": [-5, -2]}}),
            ("Humedad en el almacén: perdéis comida.", {"loot": {"food": [-4, -1]}}),
            ("Latas hinchadas: mejor tirarlas.", {"loot": {"food": [-3, -1]}, "stabilityDelta": -1}),
        ]),
        ev("ham_agua_contaminada", "Agua dudosa", "hambre_agua", 2, 7, 3, 3, [
            ("Un bidón estaba sucio. Tiréis agua dudosa.", {"loot": {"water": [-5, -2]}}),
            ("Alguien bebe mal y enferma.", {"loot": {"water": [-3, -1]}, "damageSurvivor": 12}),
            ("Hervís de más y gastáis combustible.", {"loot": {"water": [-2, -1], "fuel": [-2, -1]}}),
        ]),
        ev("ham_pozo_seco", "Pozo a medias", "hambre_agua", 3, 9, 2, 6, [
            ("El pozo da menos de lo esperado.", {"stabilityDelta": -2, "loot": {"water": [-3, -1]}}),
            ("Hay que racionar turnos de llenado.", {"stabilityDelta": -1}),
            ("Una bomba improvisada falla a mitad de extracción.", {"damageBuildingChance": 0.2, "loot": {"water": [-2, 0]}}),
        ], conditions={"minControlled": 1}),
        ev("ham_caza_menor", "Caza menor", "hambre_agua", 1, 6, 3, 2, [
            ("Alguien vuelve con carne magra del perímetro.", {"loot": {"food": [2, 4]}}),
            ("Trampas improvisadas dan resultado.", {"loot": {"food": [1, 3], "wood": [0, 1]}}),
            ("Un conejo y dos aves. Hoy se come.", {"loot": {"food": [2, 3]}}),
        ], conditions={"minPop": 2, "maxThreat": 40}, choices=[
            {"id": "cazar", "label": "Salir a cazar", "effects": {"loot": {"food": [2, 4]}, "threatDelta": 1}},
            {"id": "trampas", "label": "Solo trampas", "effects": {"loot": {"food": [1, 2], "wood": [-1, 0]}}},
        ]),
        ev("ham_lluvia_cisternas", "Lluvia útil", "hambre_agua", 1, 6, 3, 3, [
            ("La lluvia llena bidones improvisados.", {"loot": {"water": [2, 5]}, "weather": "rain"}),
            ("Recolectáis agua limpia de tejados controlados.", {"loot": {"water": [3, 6]}, "weather": "rain"}),
            ("Canalones rotos: aun así salváis varios litros.", {"loot": {"water": [1, 4]}, "weather": "rain"}),
        ]),
        ev("ham_racionamiento_estricto", "Racionamiento", "hambre_agua", 2, 8, 3, 5, [
            ("Imponeis raciones estrictas. Quejas aseguradas.", {"stabilityDelta": -3, "setFlag": "strict_rations"}),
            ("El plan ahorra comida… y moral.", {"stabilityDelta": -2}),
            ("Alguien rompe el racionamiento. Castigo ligero.", {"stabilityDelta": -2, "damageSurvivor": 4}),
        ], conditions={"minPop": 4}, choices=[
            {"id": "estricto", "label": "Mantener racionamiento", "effects": {"stabilityDelta": -2, "setFlag": "strict_rations"}},
            {"id": "aflojar", "label": "Aflojar un día", "effects": {"stabilityDelta": 1, "loot": {"food": [-2, -1]}}},
        ]),
    ]

    # ── enfermedad ─────────────────────────────────────────────────────────
    E += [
        ev("enf_fiebre", "Fiebre", "enfermedad", 2, 5, 3, 3, [
            ("Un superviviente enferma. Sin medicinas, empeora.", {"damageSurvivor": 22}),
            ("Tos seca por el polvo. Alguien pierde fuerzas.", {"damageSurvivor": 16}),
            ("Fiebre alta toda la noche.", {"damageSurvivor": 18, "stabilityDelta": -1}),
        ], conditions={"minPop": 2}, choices=[
            {"id": "medicar", "label": "Usar medicinas", "effects": {"loot": {"medicine": [-1, -1]}, "damageSurvivor": 6}},
            {"id": "reposo", "label": "Reposo sin medicinas", "effects": {"damageSurvivor": 18, "stabilityDelta": -1}},
        ]),
        ev("enf_gripe_campo", "Gripe de campo", "enfermedad", 3, 8, 3, 5, [
            ("Varios tosen a la vez. Aisláis al más grave.", {"damageSurvivor": 14, "stabilityDelta": -2}),
            ("La clínica improvisada se satura.", {"damageSurvivor": 20}),
            ("Usáis las últimas pastillas. La fiebre baja.", {"loot": {"medicine": [-2, -1]}, "damageSurvivor": 8}),
        ], conditions={"minPop": 3}),
        ev("enf_herida_infectada", "Herida infectada", "enfermedad", 3, 7, 3, 4, [
            ("Una herida antigua se encona.", {"damageSurvivor": 24}),
            ("Hace falta limpiar y vendar de nuevo.", {"damageSurvivor": 12, "loot": {"medicine": [-1, 0]}}),
            ("Sin antibióticos, el riesgo es alto.", {"damageSurvivor": 28, "killSurvivorChance": 0.08}),
        ], conditions={"minPop": 2}),
        ev("enf_intoxicacion", "Intoxicación", "enfermedad", 2, 6, 3, 4, [
            ("Alguien come una lata dudosa.", {"damageSurvivor": 15, "loot": {"food": [-1, 0]}}),
            ("Diarrea en el campamento. Gastáis agua.", {"damageSurvivor": 10, "loot": {"water": [-3, -1]}}),
            ("El cocinero jura que no volverá a arriesgar.", {"damageSurvivor": 8, "stabilityDelta": -1}),
        ]),
        ev("enf_plaga_ratas", "Plaga y ratas", "enfermedad", 2, 6, 3, 2, [
            ("Las ratas roban comida y dejan suciedad.", {"loot": {"food": [-3, -1]}, "threatDelta": 1}),
            ("Roen cables y desperdician combustible.", {"loot": {"fuel": [-2, 0], "food": [-2, 0]}}),
            ("Montáis trampas; el hedor persiste.", {"loot": {"food": [-1, 0], "wood": [-1, 0]}}),
        ], conditions={"minPop": 2}),
        ev("enf_cuarentena", "Cuarentena", "enfermedad", 3, 10, 2, 8, [
            ("Aisláis a dos personas por precaución.", {"stabilityDelta": -2, "damageSurvivor": 6}),
            ("La cuarentena funciona: el resto no enferma.", {"stabilityDelta": 1, "researchBonus": 1}),
            ("Rompen el aislamiento demasiado pronto.", {"damageSurvivor": 18, "stabilityDelta": -3}),
        ], conditions={"minPop": 4}, choices=[
            {"id": "aislar", "label": "Aislar 48h", "effects": {"stabilityDelta": -1, "setFlag": "quarantine"}},
            {"id": "tratar", "label": "Gastar medicinas ya", "effects": {"loot": {"medicine": [-2, -1]}, "damageSurvivor": 5}},
            {"id": "riesgo", "label": "Seguir trabajando", "effects": {"damageSurvivor": 20, "killSurvivorChance": 0.05}},
        ]),
        ev("enf_parasitos", "Parásitos", "enfermedad", 2, 7, 2, 5, [
            ("Piojos y rascaduras en toda la colonia.", {"damageSurvivor": 6, "stabilityDelta": -2}),
            ("Hervís ropa. Gastáis agua y leña.", {"loot": {"water": [-2, -1], "wood": [-2, -1]}}),
            ("Un remedio casero ayuda a medias.", {"damageSurvivor": 4, "loot": {"medicine": [-1, 0]}}),
        ]),
    ]

    # ── accidentes ─────────────────────────────────────────────────────────
    E += [
        ev("acc_herramienta_rota", "Herramienta rota", "accidentes", 1, 5, 3, 2, [
            ("Se parte un mango. Gastáis madera en reparar.", {"loot": {"wood": [-3, -1]}}),
            ("El taller pierde una pieza metálica.", {"loot": {"metal": [-2, -1]}}),
            ("Un martillo sale volando: solo un moretón.", {"damageSurvivor": 6}),
        ], choices=[
            {"id": "reparar", "label": "Reparar ya", "effects": {"loot": {"wood": [-2, -1], "metal": [-1, 0]}}},
            {"id": "improvisar", "label": "Improvisar sin reparar", "effects": {"stabilityDelta": -1, "damageSurvivor": 4}},
        ]),
        ev("acc_caida_tejado", "Caída del tejado", "accidentes", 2, 7, 3, 4, [
            ("Alguien resbala reparando el techo.", {"damageSurvivor": 20}),
            ("Una viga cede. Herida grave evitable.", {"damageSurvivor": 28, "damageBuildingChance": 0.25}),
            ("Caéis de menos: asustados, no rotos.", {"damageSurvivor": 10, "stabilityDelta": -1}),
        ]),
        ev("acc_fuga_combustible", "Fuga de combustible", "accidentes", 2, 8, 2, 4, [
            ("Un bidón pierde por una grieta.", {"loot": {"fuel": [-3, -1]}}),
            ("Alguien deja un grifo abierto en el generador.", {"loot": {"fuel": [-4, -2]}}),
            ("Recuperáis parte del charco con trapos.", {"loot": {"fuel": [-2, -1], "water": [-1, 0]}}),
        ]),
        ev("acc_principio_incendio", "Principio de incendio", "accidentes", 3, 9, 2, 7, [
            ("Una chispa casi prende el almacén de combustible.", {"loot": {"fuel": [-3, -1], "wood": [-2, 0]}, "damageSurvivor": 8}),
            ("Apagáis un fuego pequeño a tiempo. Perdéis madera.", {"loot": {"wood": [-4, -2]}}),
            ("El humo alerta al perímetro. Amenaza menor.", {"loot": {"wood": [-2, -1]}, "threatDelta": 2}),
        ], conditions={"minPop": 2}, choices=[
            {"id": "apagar", "label": "Apagar con agua", "effects": {"loot": {"water": [-3, -1], "wood": [-1, 0]}}},
            {"id": "arena", "label": "Sofocar con tierra", "effects": {"damageSurvivor": 6, "loot": {"wood": [-2, -1]}}},
        ]),
        ev("acc_cortocircuito", "Cortocircuito", "accidentes", 2, 8, 2, 6, [
            ("El generador echa chispas.", {"loot": {"fuel": [-2, -1], "metal": [-1, 0]}, "damageBuildingChance": 0.3}),
            ("Cables pelados: apagáis todo una hora.", {"stabilityDelta": -1}),
            ("Reparáis con cinta y fe.", {"loot": {"metal": [-2, -1]}, "researchBonus": 1}),
        ], min_era=1),
        ev("acc_derrumbe_menor", "Derrumbe menor", "accidentes", 3, 10, 2, 9, [
            ("Un muro interior cede un poco.", {"damageBuildingChance": 0.45, "damageSurvivor": 12}),
            ("Polvo y gritos. Nadie muere.", {"damageSurvivor": 8, "loot": {"wood": [-2, -1]}}),
            ("Apuntaláis con lo que hay.", {"loot": {"wood": [-3, -1], "metal": [-1, 0]}}),
        ], conditions={"minControlled": 2}),
        ev("acc_disparo_accidental", "Disparo accidental", "accidentes", 3, 9, 2, 6, [
            ("Un arma se dispara en la limpieza.", {"damageSurvivor": 22, "loot": {"ammo": [-1, -1]}, "stabilityDelta": -2}),
            ("Solo un susto y un agujero en la pared.", {"loot": {"ammo": [-1, -1], "wood": [-1, 0]}}),
            ("Herida leve y protocolo nuevo de armas.", {"damageSurvivor": 10, "researchBonus": 1}),
        ], conditions={"minPop": 2}),
    ]

    # ── clima ──────────────────────────────────────────────────────────────
    E += [
        ev("cli_lluvia_tormenta", "Tormenta", "clima", 3, 7, 3, 4, [
            ("Truenos y lluvia gruesa azotan el campamento.", {"weather": "storm", "loot": {"water": [1, 3]}, "damageBuildingChance": 0.2}),
            ("El viento arranca lonas. Recogéis agua a cambio.", {"weather": "storm", "loot": {"water": [2, 4], "wood": [-2, 0]}}),
            ("Rayos cercanos. Los infectados se agitan.", {"weather": "storm", "threatDelta": 3}),
        ]),
        ev("cli_ola_calor", "Ola de calor", "clima", 2, 6, 3, 3, [
            ("El calor aprieta. Bebéis más de la cuenta.", {"weather": "heat", "loot": {"water": [-4, -2]}}),
            ("Trabajar al sol agota a todos.", {"weather": "heat", "damageSurvivor": 8, "stabilityDelta": -1}),
            ("La comida se estropea más rápido.", {"weather": "heat", "loot": {"food": [-3, -1]}}),
        ]),
        ev("cli_frio_seco", "Frío seco", "clima", 2, 7, 3, 5, [
            ("El frío fuerza a quemar más combustible.", {"weather": "cold", "loot": {"fuel": [-3, -1], "wood": [-2, 0]}}),
            ("Sin calor suficiente, alguien se resfría.", {"weather": "cold", "loot": {"fuel": [-2, 0]}, "damageSurvivor": 10}),
            ("Helada matinal: las tuberías crujen.", {"weather": "cold", "loot": {"water": [-2, 0], "fuel": [-1, 0]}}),
        ]),
        ev("cli_niebla_densa", "Niebla densa", "clima", 2, 5, 3, 3, [
            ("No se ve a diez metros. La guardia se tensa.", {"weather": "fog", "threatDelta": 2}),
            ("Expediciones retrasadas por la niebla.", {"weather": "fog", "stabilityDelta": -1}),
            ("Siluetas falsas en la bruma. Falsa alarma.", {"weather": "fog"}),
        ], choices=[
            {"id": "doblar", "label": "Doblar guardias", "effects": {"weather": "fog", "threatDelta": 1, "stabilityDelta": -1}},
            {"id": "esperar", "label": "Esperar a que pase", "effects": {"weather": "fog", "stabilityDelta": 1}},
        ]),
        ev("cli_viento_ceniza", "Viento de ceniza", "clima", 2, 8, 2, 6, [
            ("Ceniza lejana cubre lonas y cultivos.", {"weather": "fog", "loot": {"food": [-2, 0]}, "stabilityDelta": -1}),
            ("Toséis toda la tarde.", {"damageSurvivor": 6, "weather": "fog"}),
            ("El cielo se pone naranja. Mal presagio.", {"threatDelta": 2, "weather": "fog"}),
        ]),
        ev("cli_despejado_util", "Día claro", "clima", 1, 4, 3, 2, [
            ("Cielo limpio: ideal para cartografiar.", {"weather": "clear", "discoverZone": True}),
            ("Secáis ropa y leña al sol.", {"weather": "clear", "loot": {"wood": [0, 1]}, "stabilityDelta": 1}),
            ("Visibilidad perfecta en las atalayas.", {"weather": "clear", "threatDelta": -1}),
        ]),
        ev("cli_granizo", "Granizo", "clima", 2, 8, 2, 6, [
            ("El granizo destroza lonas del huerto.", {"weather": "storm", "loot": {"food": [-2, -1], "wood": [-2, 0]}}),
            ("Cubís lo esencial a tiempo.", {"weather": "storm", "loot": {"food": [-1, 0]}}),
            ("El ruido enloquece a los infectados cercanos.", {"weather": "storm", "threatDelta": 3}),
        ]),
    ]

    # ── infectados ─────────────────────────────────────────────────────────
    E += [
        ev("inf_avistamiento", "Avistamiento", "infectados", 2, 4, 4, 3, [
            ("Un infectado solo deambula cerca del perímetro.", {"threatDelta": 2}),
            ("Huellas frescas en el barro exterior.", {"threatDelta": 3}),
            ("Aullidos cortos al amanecer.", {"threatDelta": 2, "stabilityDelta": -1}),
        ]),
        ev("inf_manada_lejana", "Manada lejana", "infectados", 3, 6, 3, 5, [
            ("Una manada pasa a distancia. Os agacháis.", {"threatDelta": 5}),
            ("Cientos de pasos en la carretera norte.", {"threatDelta": 6, "setFlag": "horde_nearby"}),
            ("Se desvían… por ahora.", {"threatDelta": 3}),
        ], conditions={"minThreat": 8}),
        ev("inf_rapido_cerca", "Rápido cerca", "infectados", 3, 5, 3, 6, [
            ("Un infectado veloz prueba la valla.", {"threatDelta": 4, "attackIntensity": 2, "damageSurvivor": 10}),
            ("Lo abatís, pero hace ruido.", {"threatDelta": 3, "loot": {"ammo": [-1, 0]}}),
            ("Escapa hacia el bosque. Vendrán más.", {"threatDelta": 5}),
        ], conditions={"minThreat": 10}, min_era=1),
        ev("inf_tanque_ruido", "Tanque a lo lejos", "infectados", 4, 10, 2, 10, [
            ("Un bruto enorme derriba un poste lejano.", {"threatDelta": 7, "stabilityDelta": -2}),
            ("El suelo vibra. Preferís no mirar.", {"threatDelta": 6}),
            ("Se aleja tras un rebaño de comunes.", {"threatDelta": 5, "setFlag": "tank_seen"}),
        ], conditions={"minThreat": 18}, min_era=2),
        ev("inf_nido_descubierto", "Nido descubierto", "infectados", 3, 9, 2, 7, [
            ("Encontráis un edificio lleno de inmóviles.", {"threatDelta": 4, "discoverZone": True}),
            ("Quemar el nido o marcarlo: hay que decidir.", {"threatDelta": 3}),
            ("Uno se despierta. Disparo de emergencia.", {"threatDelta": 5, "loot": {"ammo": [-1, 0]}, "damageSurvivor": 8}),
        ], choices=[
            {"id": "quemar", "label": "Quemar el nido", "effects": {"threatDelta": -2, "loot": {"fuel": [-2, -1]}, "attackIntensity": 1}},
            {"id": "evitar", "label": "Marcar y evitar", "effects": {"setFlag": "nido_marcado", "discoverZone": True}},
            {"id": "limpiar", "label": "Limpiar a tiros", "effects": {"loot": {"ammo": [-3, -1]}, "threatDelta": -3, "damageSurvivor": 12}},
        ]),
        ev("inf_olor_podredumbre", "Olor a podredumbre", "infectados", 2, 5, 3, 4, [
            ("El viento trae hedor. Alguien cae enfermo al limpiar.", {"damageSurvivor": 18, "threatDelta": 2}),
            ("Cubís bocas. La amenaza no baja.", {"threatDelta": 2, "stabilityDelta": -1}),
            ("Seguís el rastro hasta una alcantarilla.", {"discoverZone": True, "threatDelta": 3}),
        ]),
        ev("inf_mordida_casi", "Casi mordida", "infectados", 3, 6, 3, 5, [
            ("Un infectado muerde el aire a centímetros.", {"damageSurvivor": 8, "threatDelta": 3, "stabilityDelta": -2}),
            ("La víctima queda en shock.", {"damageSurvivor": 5, "stabilityDelta": -3}),
            ("Disparo a quemarropa. Silencio después.", {"loot": {"ammo": [-1, -1]}, "threatDelta": 2}),
        ]),
    ]

    # ── ataques ────────────────────────────────────────────────────────────
    E += [
        ev("atk_oleada_menor", "Oleada menor", "ataques", 3, 4, 5, 5, [
            ("Un grupo pequeño prueba las defensas.", {"attackIntensity": 2, "damageSurvivor": 14}),
            ("Ruidos en la valla. Hay que aguantar.", {"attackIntensity": 2, "damageSurvivor": 16}),
            ("Infectados aislados empujan la puerta este.", {"attackIntensity": 2, "damageSurvivor": 12, "loot": {"ammo": [-1, 0]}}),
        ], conditions={"minThreat": 8}),
        ev("atk_sondeo_nocturno", "Sondeo nocturno", "ataques", 3, 5, 4, 6, [
            ("Prueban el perímetro en silencio. Disparáis de más.", {"attackIntensity": 2, "damageSurvivor": 12, "loot": {"ammo": [-1, 0]}}),
            ("Sombras en el almacén exterior.", {"attackIntensity": 3, "damageSurvivor": 18}),
            ("La atalaya avisa a tiempo. Baja el daño.", {"attackIntensity": 1, "damageSurvivor": 8}),
        ], conditions={"minThreat": 12}),
        ev("atk_oleada_fuerte", "Oleada fuerte", "ataques", 5, 7, 2, 9, [
            ("La noche se llena de aullidos. La oleada es seria.", {"attackIntensity": 4, "damageSurvivor": 28, "killSurvivorChance": 0.12}),
            ("Rompen un tramo de valla antes de rechazarlos.", {"attackIntensity": 4, "damageSurvivor": 22, "loot": {"wood": [-3, -1]}, "damageBuildingChance": 0.4}),
            ("Munición y gritos. Amanece con bajas.", {"attackIntensity": 5, "damageSurvivor": 30, "killSurvivorChance": 0.15, "loot": {"ammo": [-2, -1]}}),
        ], conditions={"minThreat": 20, "minPop": 2}, min_era=1),
        ev("atk_presion_sostenida", "Presión sostenida", "ataques", 4, 8, 2, 11, [
            ("Durante horas empujan sin entrar del todo.", {"attackIntensity": 3, "damageSurvivor": 16, "loot": {"ammo": [-2, -1], "fuel": [-2, 0]}}),
            ("Turnos de guardia dobles. Alguien se desploma.", {"attackIntensity": 3, "damageSurvivor": 20, "stabilityDelta": -2}),
            ("Aguantáis, pero el perímetro queda marcado.", {"attackIntensity": 3, "threatDelta": 4}),
        ], conditions={"minThreat": 28, "minControlled": 3}, min_era=2),
        ev("atk_emboscada_expedicion", "Emboscada", "ataques", 4, 9, 2, 8, [
            ("Una patrulla vuelve herida de la ruta.", {"attackIntensity": 3, "damageSurvivor": 24, "killSurvivorChance": 0.1}),
            ("Perseguidos hasta la puerta. Disparos cerrados.", {"attackIntensity": 3, "damageSurvivor": 18, "loot": {"ammo": [-2, -1]}}),
            ("Logran cerrar a tiempo. El miedo queda.", {"attackIntensity": 2, "stabilityDelta": -3, "threatDelta": 3}),
        ], conditions={"minThreat": 15}),
        ev("atk_falsa_alarma", "Falsa alarma", "ataques", 1, 3, 4, 2, [
            ("Gritos en la distancia. Resulta ser viento y metal.", {}),
            ("La atalaya avisa… y no hay nada. Gastáis nervios.", {"stabilityDelta": -1}),
            ("Un animal en la valla. Suspiro colectivo.", {"stabilityDelta": 1}),
        ], choices=[
            {"id": "disparar", "label": "Disparar a ciegas", "effects": {"loot": {"ammo": [-1, -1]}, "threatDelta": 1}},
            {"id": "esperar", "label": "Esperar en silencio", "effects": {"stabilityDelta": 1}},
        ]),
        ev("atk_ataque_alba", "Ataque al alba", "ataques", 4, 7, 2, 8, [
            ("Atacan cuando cambiáis turnos.", {"attackIntensity": 3, "damageSurvivor": 20, "killSurvivorChance": 0.08}),
            ("La fatiga cuesta sangre.", {"attackIntensity": 3, "damageSurvivor": 24}),
            ("Un perro alerta a tiempo. Menos daño.", {"attackIntensity": 2, "damageSurvivor": 12}),
        ], conditions={"minThreat": 14}),
    ]

    # ── infraestructura ────────────────────────────────────────────────────
    E += [
        ev("infst_piezas_valla", "Piezas reutilizables", "infraestructura", 1, 7, 2, 3, [
            ("Desmontáis una valla inútil y ganáis metal.", {"loot": {"metal": [2, 4], "wood": [1, 2]}}),
            ("Tornillos y chapas de un hangar.", {"loot": {"metal": [3, 5]}}),
            ("Postes de madera aún firmes.", {"loot": {"wood": [3, 5], "metal": [0, 2]}}),
        ], conditions={"minControlled": 2}),
        ev("infst_averia_pozo", "Avería en el pozo", "infraestructura", 2, 8, 3, 5, [
            ("La bomba del pozo se atasca.", {"stabilityDelta": -2, "damageBuildingChance": 0.35}),
            ("Reparáis con alambre y paciencia.", {"loot": {"metal": [-2, -1]}, "researchBonus": 1}),
            ("Sin agua corriente un día entero.", {"loot": {"water": [-3, -1]}, "stabilityDelta": -1}),
        ]),
        ev("infst_tejado_agujeros", "Tejado agujereado", "infraestructura", 2, 6, 3, 4, [
            ("La lluvia entra por el techo del almacén.", {"weather": "rain", "loot": {"food": [-2, 0], "wood": [-2, -1]}}),
            ("Lonas de emergencia: solución temporal.", {"loot": {"wood": [-1, 0]}, "stabilityDelta": -1}),
            ("Una noche húmeda y mal humor.", {"stabilityDelta": -2}),
        ]),
        ev("infst_mejora_atalaya", "Mejora de atalaya", "infraestructura", 1, 10, 2, 6, [
            ("Reforzáis una atalaya con chapa.", {"loot": {"metal": [-2, -1], "wood": [-1, 0]}, "threatDelta": -2}),
            ("Mejor ángulo de visión: menos sorpresas.", {"threatDelta": -1, "researchBonus": 1}),
            ("La guardia duerme más tranquila.", {"stabilityDelta": 2}),
        ], conditions={"minControlled": 1}, choices=[
            {"id": "reforzar", "label": "Invertir materiales", "effects": {"loot": {"metal": [-3, -2], "wood": [-2, -1]}, "threatDelta": -3}},
            {"id": "posponer", "label": "Posponer", "effects": {"stabilityDelta": -1}},
        ]),
        ev("infst_red_electrica", "Restos de red", "infraestructura", 2, 11, 2, 8, [
            ("Encontráis cableado urbano aprovechable.", {"loot": {"metal": [2, 4]}, "researchBonus": 2}),
            ("Un transformador muerto: chatarra útil.", {"loot": {"metal": [3, 5], "fuel": [0, 1]}}),
            ("Riesgo de cortocircuito si forzáis la conexión.", {"loot": {"metal": [1, 3]}, "damageSurvivor": 8}),
        ], min_era=1),
        ev("infst_almacen_colapsa", "Estantería rota", "infraestructura", 2, 7, 2, 5, [
            ("Una estantería cede y esparce provisiones.", {"loot": {"food": [-2, 0], "medicine": [-1, 0]}, "damageSurvivor": 4}),
            ("Reordenáis el almacén: encontráis algo perdido.", {"loot": {"medicine": [0, 1], "ammo": [0, 1]}}),
            ("Hay que reforzar con madera.", {"loot": {"wood": [-2, -1]}}),
        ], conditions={"minPop": 3}),
        ev("infst_generador_falla", "Generador falla", "infraestructura", 2, 9, 2, 7, [
            ("El generador se niega a arrancar.", {"loot": {"fuel": [-1, 0]}, "stabilityDelta": -2, "damageBuildingChance": 0.25}),
            ("Pieza rota: hay que fabricar otra.", {"loot": {"metal": [-2, -1]}, "researchBonus": 1}),
            ("Noche a oscuras. Nervios a flor de piel.", {"stabilityDelta": -2, "threatDelta": 2}),
        ], min_era=1),
    ]

    # ── comercio ───────────────────────────────────────────────────────────
    E += [
        ev("com_trueque_furtivo", "Trueque furtivo", "comercio", 1, 10, 2, 6, [
            ("Un forastero cambia metal por comida.", {"loot": {"food": [2, 4], "water": [1, 2], "metal": [-2, -1]}}),
            ("Cambiáis munición sobrante por medicinas.", {"loot": {"medicine": [1, 3], "ammo": [-1, -1]}}),
            ("Trueque rápido: madera por agua embotellada.", {"loot": {"water": [2, 4], "wood": [-2, -1]}}),
        ], conditions={"minPop": 3}),
        ev("com_caravana", "Caravana", "comercio", 2, 14, 2, 10, [
            ("Una caravana ofrece precios altos y prisa.", {"loot": {"food": [3, 5], "fuel": [-2, -1]}}),
            ("Negociáis bien: medicinas a cambio de chatarra.", {"loot": {"medicine": [2, 4], "metal": [-3, -1]}}),
            ("Se van ofendidos. Peor reputación.", {"stabilityDelta": -1, "threatDelta": 2}),
        ], conditions={"minControlled": 2}, min_era=1, choices=[
            {"id": "comprar", "label": "Comprar comida", "effects": {"loot": {"food": [4, 6], "metal": [-3, -2]}}},
            {"id": "vender", "label": "Vender munición", "effects": {"loot": {"ammo": [-2, -1], "medicine": [2, 3], "food": [1, 2]}}},
            {"id": "pasar", "label": "Dejar pasar", "effects": {"stabilityDelta": 1}},
        ]),
        ev("com_mercado_negro", "Mercado negro", "comercio", 2, 12, 2, 8, [
            ("Contacto dudoso ofrece munición cara.", {"loot": {"ammo": [2, 4], "food": [-3, -2]}}),
            ("Os venden mapas marcados… algunos mentira.", {"discoverZone": True, "loot": {"metal": [-1, -1]}}),
            ("Estafa menor: perdéis un poco y aprendéis.", {"loot": {"food": [-2, -1]}, "researchBonus": 1}),
        ], min_era=1),
        ev("com_regalo_diplomatico", "Regalo diplomático", "comercio", 1, 15, 1, 12, [
            ("Una facción envía un paquete de buena voluntad.", {"loot": {"food": [2, 3], "medicine": [1, 2]}, "stabilityDelta": 2, "setFlag": "faction_gift"}),
            ("Agua limpia y una nota: hablemos.", {"loot": {"water": [3, 5]}, "setFlag": "faction_talk"}),
            ("El regalo viene con espías. Amenaza sutil.", {"loot": {"food": [1, 2]}, "threatDelta": 2}),
        ], conditions={"minPop": 5}, min_era=2),
        ev("com_escasez_precios", "Precios por las nubes", "comercio", 2, 9, 2, 7, [
            ("Todo cuesta el doble en el trueque de hoy.", {"stabilityDelta": -1}),
            ("Rechazáis un mal trato. El mercader se va.", {}),
            ("Pagáis de más por medicinas vitales.", {"loot": {"medicine": [2, 3], "food": [-4, -2]}}),
        ]),
        ev("com_intercambio_semillas", "Semillas", "comercio", 1, 11, 2, 5, [
            ("Os ofrecen semillas a cambio de herramientas.", {"loot": {"metal": [-1, -1]}, "setFlag": "seeds", "researchBonus": 2}),
            ("Plantáis lo recibido: esperanza a largo plazo.", {"setFlag": "seeds", "stabilityDelta": 2}),
            ("Las semillas están mojadas. Pocas sirven.", {"loot": {"food": [1, 2]}}),
        ], conditions={"minControlled": 1}),
        ev("com_contrabando", "Contrabando", "comercio", 2, 11, 2, 9, [
            ("Os ofrecen armas sin preguntar origen.", {"loot": {"ammo": [2, 3], "metal": [-2, -1]}, "threatDelta": 2}),
            ("Rechazáis el trato sucio.", {"stabilityDelta": 1}),
            ("Aceptáis y os mancháis las manos.", {"loot": {"ammo": [3, 5], "food": [-2, -1]}, "stabilityDelta": -2, "setFlag": "black_market"}),
        ], choices=[
            {"id": "aceptar", "label": "Aceptar", "effects": {"loot": {"ammo": [3, 4], "food": [-2, -1]}, "setFlag": "black_market", "threatDelta": 2}},
            {"id": "rechazar", "label": "Rechazar", "effects": {"stabilityDelta": 1}},
        ]),
    ]

    # ── rumores ────────────────────────────────────────────────────────────
    E += [
        ev("rum_mapa_oral", "Rumores del mapa", "rumores", 1, 8, 2, 4, [
            ("Un explorador marca un edificio lejano como prometedor.", {"discoverZone": True}),
            ("Oís de un depósito de combustible al sur.", {"discoverZone": True}),
            ("Hablan de un hospital vacío… o no.", {"discoverZone": True, "threatDelta": 1}),
        ], choices=[
            {"id": "marcar", "label": "Marcar en el mapa", "effects": {"discoverZone": True, "researchBonus": 1}},
            {"id": "ignorar", "label": "Ignorar el rumor", "effects": {}},
        ]),
        ev("rum_ciudad_segura", "Ciudad segura", "rumores", 2, 12, 2, 8, [
            ("Cuentan que hay un enclave murado al oeste.", {"setFlag": "rumor_safe_city", "stabilityDelta": 1}),
            ("Demasiado bueno para ser cierto. Aun así, anotáis.", {"setFlag": "rumor_safe_city", "discoverZone": True}),
            ("El rumor dividirá opiniones en la colonia.", {"stabilityDelta": -1, "setFlag": "rumor_safe_city"}),
        ], choices=[
            {"id": "creer", "label": "Preparar expedición", "effects": {"setFlag": "expedition_safe_city", "stabilityDelta": 1}},
            {"id": "dudar", "label": "Ignorar el rumor", "effects": {"stabilityDelta": -1}},
        ]),
        ev("rum_traidor", "Rumores de traición", "rumores", 2, 9, 2, 7, [
            ("Susurros: alguien roba raciones de noche.", {"stabilityDelta": -3, "setFlag": "theft_suspect"}),
            ("Acusaciones sin prueba. El ambiente se envenena.", {"stabilityDelta": -4}),
            ("Una búsqueda encuentra migajas… o no.", {"stabilityDelta": -1, "loot": {"food": [-1, 0]}}),
        ], conditions={"minPop": 4}),
        ev("rum_oleada_proximo", "Oleada en camino", "rumores", 3, 8, 3, 6, [
            ("Forasteros avisan de una manada grande.", {"threatDelta": 5, "setFlag": "horde_warning"}),
            ("Puede ser mentira para asustaros.", {"threatDelta": 2}),
            ("Preparáis la defensa por si acaso.", {"threatDelta": 3, "stabilityDelta": 1}),
        ]),
        ev("rum_faccion_guerra", "Guerra entre facciones", "rumores", 2, 11, 2, 10, [
            ("Dos grupos se matan entre sí más allá del río.", {"threatDelta": 2, "setFlag": "faction_war"}),
            ("La guerra puede traer refugiados… o saqueadores.", {"threatDelta": 3, "spawnSurvivorChance": 0.3}),
            ("Oportunidad de trueque con ambos bandos.", {"setFlag": "faction_war", "researchBonus": 1}),
        ], min_era=2),
        ev("rum_cura_falsa", "Cura milagrosa", "rumores", 1, 13, 2, 9, [
            ("Alguien vende la idea de una cura. Mentira probable.", {"stabilityDelta": -2}),
            ("La esperanza ciega: gastáis un día buscando.", {"loot": {"fuel": [-1, 0]}, "stabilityDelta": 1}),
            ("Desmentís el rumor a tiempo.", {"stabilityDelta": 1, "researchBonus": 1}),
        ], min_era=1),
        ev("rum_silencio_radio", "Silencio en la radio", "rumores", 1, 6, 3, 3, [
            ("Nadie emite en días. El vacío inquieta.", {"stabilityDelta": -1}),
            ("Algunos lo ven como buena señal.", {}),
            ("Inventáis teorías. Ninguna ayuda.", {"stabilityDelta": -1}),
        ]),
    ]

    # ── conflictos ─────────────────────────────────────────────────────────
    E += [
        ev("cnf_discusion", "Discusión", "conflictos", 1, 4, 3, 3, [
            ("Una pelea por turnos de vigilancia deja a alguien golpeado.", {"damageSurvivor": 10, "stabilityDelta": -2}),
            ("Tensión por las raciones. Nadie gana, todos pierden sueño.", {"stabilityDelta": -2}),
            ("Separáis a los implicados. Paz frágil.", {"stabilityDelta": -1}),
        ], conditions={"minPop": 3}, choices=[
            {"id": "castigar", "label": "Castigar a ambos", "effects": {"stabilityDelta": -1, "damageSurvivor": 4}},
            {"id": "mediar", "label": "Mediar", "effects": {"stabilityDelta": 1}},
            {"id": "ignorar", "label": "Ignorar", "effects": {"stabilityDelta": -3}},
        ]),
        ev("cnf_hurtos", "Hurtos internos", "conflictos", 2, 10, 2, 8, [
            ("Alguien esconde raciones. Recuperáis parte, no todo.", {"loot": {"food": [-3, -1], "medicine": [-1, 0]}, "stabilityDelta": -3}),
            ("Cacheo nocturno: humillación y algo de comida.", {"loot": {"food": [0, 1]}, "stabilityDelta": -2}),
            ("El ladrón confiesa. Castigo simbólico.", {"stabilityDelta": -1}),
        ], conditions={"minPop": 5}),
        ev("cnf_liderazgo", "Crisis de liderazgo", "conflictos", 3, 12, 2, 10, [
            ("Dos voces quieren mandar. La colonia se parte.", {"stabilityDelta": -5}),
            ("Una votación improvisada baja la tensión.", {"stabilityDelta": -1, "researchBonus": 1}),
            ("Amenazas veladas en el comedor.", {"stabilityDelta": -4, "damageSurvivor": 6}),
        ], conditions={"minPop": 6, "maxStability": 50}, choices=[
            {"id": "imponer", "label": "Imponer orden", "effects": {"stabilityDelta": 2, "damageSurvivor": 8}},
            {"id": "mediar", "label": "Mediar", "effects": {"stabilityDelta": 1, "loot": {"food": [-1, -1]}}},
            {"id": "dejar", "label": "Dejar que explote", "effects": {"stabilityDelta": -4, "killSurvivorChance": 0.05}},
        ]),
        ev("cnf_exilio", "Amenaza de exilio", "conflictos", 3, 11, 2, 9, [
            ("La mayoría quiere expulsar a alguien.", {"stabilityDelta": -3, "killSurvivorChance": 0.1}),
            ("El acusado se defiende con pruebas débiles.", {"stabilityDelta": -2}),
            ("Encontráis un compromiso: vigilancia doble.", {"stabilityDelta": -1}),
        ], conditions={"minPop": 5}),
        ev("cnf_duelo_palabras", "Duelo de palabras", "conflictos", 1, 5, 3, 4, [
            ("Una discusión pública acaba en disculpas.", {"stabilityDelta": 1}),
            ("Queda rencor. La productividad baja un día.", {"stabilityDelta": -2}),
            ("El grupo se ríe al final. Crisis evitada.", {"stabilityDelta": 2}),
        ], conditions={"minPop": 3}),
        ev("cnf_motin_hambre", "Motín por hambre", "conflictos", 4, 10, 2, 12, [
            ("Rompen la despensa. Caos y moretones.", {"loot": {"food": [-5, -2]}, "damageSurvivor": 14, "stabilityDelta": -6}),
            ("La guardia contiene el motín a duras penas.", {"damageSurvivor": 18, "stabilityDelta": -4}),
            ("Prometéis raciones extras mañana. Compráis tiempo.", {"stabilityDelta": -2, "setFlag": "ration_promise"}),
        ], conditions={"minPop": 6, "maxStability": 35}, min_era=1),
        ev("cnf_celo_pareja", "Celo y tensión", "conflictos", 1, 7, 2, 5, [
            ("Un triángulo afectivo envenena turnos.", {"stabilityDelta": -3}),
            ("Separáis guardias. Problema aparcado.", {"stabilityDelta": -1}),
            ("Acaba en risas forzadas.", {"stabilityDelta": 1}),
        ], conditions={"minPop": 4}),
    ]

    # ── expansion ──────────────────────────────────────────────────────────
    E += [
        ev("exp_nueva_zona", "Nueva zona visible", "expansion", 1, 8, 3, 4, [
            ("Desde la atalaya se ve un bloque intacto.", {"discoverZone": True}),
            ("Humo lejano marca un posible asentamiento.", {"discoverZone": True, "threatDelta": 1}),
            ("Un camino secundario aparece en el mapa.", {"discoverZone": True}),
        ], conditions={"minControlled": 1}, choices=[
            {"id": "explorar", "label": "Preparar exploración", "effects": {"discoverZone": True, "threatDelta": 1}},
            {"id": "observar", "label": "Solo observar", "effects": {"discoverZone": True}},
        ]),
        ev("exp_puesto_avanzado", "Puesto avanzado", "expansion", 2, 12, 2, 8, [
            ("Montáis un puesto temporal más allá del muro.", {"setFlag": "outpost", "threatDelta": 2, "loot": {"wood": [-3, -1], "metal": [-1, 0]}}),
            ("El puesto atrae atención no deseada.", {"setFlag": "outpost", "threatDelta": 4}),
            ("Buen punto de vigilancia. Moral alta.", {"setFlag": "outpost", "stabilityDelta": 2, "threatDelta": 1}),
        ], conditions={"minControlled": 2}, min_era=1, choices=[
            {"id": "establecer", "label": "Establecer puesto", "effects": {"setFlag": "outpost", "loot": {"wood": [-4, -2], "metal": [-2, -1]}, "threatDelta": 2}},
            {"id": "solo_marca", "label": "Solo marcar en mapa", "effects": {"discoverZone": True}},
        ]),
        ev("exp_limpiar_bloque", "Limpiar bloque", "expansion", 3, 10, 2, 7, [
            ("Despejáis un edificio para controlarlo.", {"discoverZone": True, "threatDelta": 3, "damageSurvivor": 10, "loot": {"ammo": [-1, 0]}}),
            ("La limpieza cuesta sangre y gana espacio.", {"damageSurvivor": 16, "killSurvivorChance": 0.05, "setFlag": "block_cleared"}),
            ("Os retirais a medias. Zona gris.", {"threatDelta": 2, "stabilityDelta": -1}),
        ]),
        ev("exp_ruta_segura", "Ruta segura", "expansion", 1, 9, 2, 5, [
            ("Marcais una ruta con menos infectados.", {"discoverZone": True, "threatDelta": -1, "researchBonus": 1}),
            ("Atajos entre solares controlados.", {"stabilityDelta": 1}),
            ("La ruta ahorrará combustible en expediciones.", {"setFlag": "safe_route"}),
        ]),
        ev("exp_colonos_nuevos", "Colonos nuevos", "expansion", 2, 14, 2, 11, [
            ("Un pequeño grupo pide unirse a la expansión.", {"spawnSurvivorChance": 0.7}),
            ("Traen herramientas y hambre.", {"spawnSurvivorChance": 0.6, "loot": {"metal": [1, 2], "wood": [1, 2]}}),
            ("Demasiados para el alojamiento actual.", {"stabilityDelta": -2, "spawnSurvivorChance": 0.4}),
        ], conditions={"minControlled": 3}, min_era=2),
        ev("exp_frontera_caliente", "Frontera caliente", "expansion", 3, 8, 3, 9, [
            ("La última zona tomada sigue activa de noche.", {"threatDelta": 5, "attackIntensity": 2}),
            ("Reforzáis el nuevo perímetro.", {"loot": {"wood": [-3, -1], "metal": [-2, -1]}, "threatDelta": 2}),
            ("Retiráis gente al núcleo. Pierde control temporal.", {"stabilityDelta": -1, "threatDelta": 3}),
        ], conditions={"minControlled": 3, "minThreat": 15}),
        ev("exp_puente_caido", "Puente caído", "expansion", 2, 10, 2, 6, [
            ("El puente principal está hundido. Hay que rodear.", {"discoverZone": True, "threatDelta": 2}),
            ("Una pasarela improvisada es posible.", {"loot": {"wood": [-4, -2], "metal": [-2, -1]}, "setFlag": "bridge_work"}),
            ("La ruta larga gasta más combustible.", {"setFlag": "long_route"}),
        ], conditions={"minControlled": 1}),
    ]

    # ── catastrofes ────────────────────────────────────────────────────────
    E += [
        ev("cat_incendio_mayor", "Incendio mayor", "catastrofes", 5, 16, 1, 14, [
            ("El fuego se come un almacén entero.", {"loot": {"food": [-6, -3], "wood": [-5, -2], "fuel": [-4, -2]}, "damageBuildingChance": 0.7, "damageSurvivor": 20, "stabilityDelta": -5}),
            ("Salváis vidas, no provisiones.", {"loot": {"food": [-4, -2], "wood": [-3, -1]}, "damageSurvivor": 12, "stabilityDelta": -3}),
            ("El humo atrae una oleada secundaria.", {"attackIntensity": 3, "loot": {"wood": [-4, -2]}, "threatDelta": 6}),
        ], conditions={"minPop": 3}, min_era=1),
        ev("cat_colapso_muro", "Colapso del muro", "catastrofes", 5, 14, 1, 12, [
            ("Un tramo de muralla cae con estruendo.", {"damageBuildingChance": 0.8, "attackIntensity": 4, "damageSurvivor": 22, "killSurvivorChance": 0.1, "loot": {"wood": [-5, -2], "metal": [-3, -1]}}),
            ("Tapáis el hueco con vehículos y cuerpos.", {"damageSurvivor": 18, "loot": {"metal": [-2, -1]}, "stabilityDelta": -4}),
            ("La brecha se defiende a tiros toda la noche.", {"attackIntensity": 4, "loot": {"ammo": [-4, -2]}, "killSurvivorChance": 0.12}),
        ], conditions={"minControlled": 2, "minThreat": 20}, min_era=2),
        ev("cat_epidemia", "Epidemia", "catastrofes", 5, 15, 1, 13, [
            ("La enfermedad se propaga sin control.", {"damageSurvivor": 30, "killSurvivorChance": 0.2, "stabilityDelta": -6}),
            ("Quemáis ropa y aisláis bloques.", {"loot": {"medicine": [-4, -2], "water": [-3, -1]}, "damageSurvivor": 16, "stabilityDelta": -3}),
            ("Perdéis a alguien. El resto sobrevive endurecido.", {"killSurvivorChance": 0.25, "stabilityDelta": -5, "researchBonus": 2}),
        ], conditions={"minPop": 5}, min_era=2, choices=[
            {"id": "cuarentena_total", "label": "Cuarentena total", "effects": {"stabilityDelta": -3, "setFlag": "epidemic_lock", "damageSurvivor": 10}},
            {"id": "meds", "label": "Gastar todas las medicinas", "effects": {"loot": {"medicine": [-5, -3]}, "killSurvivorChance": 0.05}},
            {"id": "sacrificio", "label": "Aislar a los peores fuera", "effects": {"killSurvivorChance": 0.3, "stabilityDelta": -8, "threatDelta": -2}},
        ]),
        ev("cat_horda_masiva", "Horda masiva", "catastrofes", 5, 18, 1, 16, [
            ("La horda no tiene fin visible.", {"attackIntensity": 5, "damageSurvivor": 35, "killSurvivorChance": 0.22, "threatDelta": 10, "stabilityDelta": -5}),
            ("Aguantáis el primer choque; el segundo duele más.", {"attackIntensity": 5, "damageSurvivor": 28, "killSurvivorChance": 0.15, "loot": {"ammo": [-5, -2]}}),
            ("La horda pasa rozando. Daños y alivio amargo.", {"attackIntensity": 4, "damageSurvivor": 20, "threatDelta": 4, "stabilityDelta": -2}),
        ], conditions={"minThreat": 35, "minPop": 3}, min_era=3),
        ev("cat_tormenta_siglo", "Tormenta del siglo", "catastrofes", 4, 16, 1, 11, [
            ("Viento y agua destrozan lonas y cultivos.", {"weather": "storm", "loot": {"food": [-4, -2], "wood": [-4, -2], "water": [3, 6]}, "damageBuildingChance": 0.5, "stabilityDelta": -3}),
            ("Rayos caen cerca. Pánico en la noche.", {"weather": "storm", "damageSurvivor": 14, "threatDelta": 4}),
            ("Al amanecer, barro y trabajo por delante.", {"weather": "storm", "loot": {"wood": [-3, -1]}, "stabilityDelta": -2}),
        ], min_era=1),
        ev("cat_saqueo_organizado", "Saqueo organizado", "catastrofes", 5, 17, 1, 15, [
            ("Humanos armados golpean el refugio.", {"attackIntensity": 4, "damageSurvivor": 26, "killSurvivorChance": 0.18, "loot": {"food": [-5, -2], "ammo": [-3, -1], "medicine": [-2, -1]}, "stabilityDelta": -5}),
            ("Repeléis el asalto con bajas.", {"attackIntensity": 3, "damageSurvivor": 20, "killSurvivorChance": 0.1, "loot": {"ammo": [-4, -2]}}),
            ("Negociáis un peaje humillante.", {"loot": {"food": [-4, -2], "fuel": [-3, -1]}, "stabilityDelta": -4, "setFlag": "paid_raiders"}),
        ], conditions={"minPop": 4, "minControlled": 2}, min_era=2, choices=[
            {"id": "luchar", "label": "Luchar", "effects": {"attackIntensity": 4, "damageSurvivor": 24, "killSurvivorChance": 0.15, "loot": {"ammo": [-3, -1]}}},
            {"id": "pagar", "label": "Pagar peaje", "effects": {"loot": {"food": [-4, -2], "metal": [-2, -1]}, "stabilityDelta": -3}},
            {"id": "negociar", "label": "Negociar tregua", "effects": {"loot": {"food": [-2, -1]}, "threatDelta": 2, "setFlag": "truce_raiders"}},
        ]),
        ev("cat_contaminacion", "Nube tóxica", "catastrofes", 4, 15, 1, 14, [
            ("Una nube amarillenta obliga a cerrar todo.", {"weather": "fog", "damageSurvivor": 18, "loot": {"water": [-3, -1], "medicine": [-2, -1]}, "stabilityDelta": -4}),
            ("Filtros improvisados salvan a la mayoría.", {"damageSurvivor": 10, "researchBonus": 2}),
            ("Quienes salieron demasiado pronto lo pagan.", {"damageSurvivor": 26, "killSurvivorChance": 0.1}),
        ], min_era=2),
    ]

    return E


def build_research():
    return {
        "branches": {
            "supervivencia": {
                "name": "Supervivencia",
                "techs": [
                    {"id": "rationing", "name": "Racionamiento", "desc": "Mejora el aprovechamiento de comida.", "cost": {"food": 4, "wood": 2}, "requires": [], "minEra": 0, "days": 2, "effects": {"foodProdBonus": 0.1}},
                    {"id": "water_filters", "name": "Filtros de agua", "desc": "Purificación improvisada más eficiente.", "cost": {"metal": 3, "water": 2}, "requires": [], "minEra": 0, "days": 2, "effects": {"waterProdBonus": 0.1}},
                    {"id": "field_medicine", "name": "Medicina de campo", "desc": "Vendajes y triaje básico.", "cost": {"medicine": 3, "wood": 2}, "requires": ["rationing"], "minEra": 1, "days": 3, "effects": {"healBonus": 0.15}},
                    {"id": "greenhouse_tech", "name": "Cultivo protegido", "desc": "Permite construir invernaderos.", "cost": {"wood": 6, "metal": 3, "water": 4}, "requires": ["water_filters"], "minEra": 1, "days": 4, "effects": {"unlockBuilding": "greenhouse", "foodProdBonus": 0.15}},
                    {"id": "preservation", "name": "Conservas", "desc": "Reduce el deterioro de alimentos.", "cost": {"metal": 4, "fuel": 2, "food": 3}, "requires": ["field_medicine", "greenhouse_tech"], "minEra": 2, "days": 4, "effects": {"foodProdBonus": 0.2, "spoilReduction": 0.25}},
                ],
            },
            "construccion": {
                "name": "Construcción",
                "techs": [
                    {"id": "basic_carpentry", "name": "Carpintería básica", "desc": "Mejores estructuras de madera.", "cost": {"wood": 5, "metal": 1}, "requires": [], "minEra": 0, "days": 2, "effects": {"buildCostReduction": 0.1}},
                    {"id": "metalwork", "name": "Metalurgia improvisada", "desc": "Forja y reciclaje de chapa.", "cost": {"metal": 5, "fuel": 2}, "requires": ["basic_carpentry"], "minEra": 0, "days": 3, "effects": {"metalProdBonus": 0.15}},
                    {"id": "reinforced_walls", "name": "Muros reforzados", "desc": "Perímetro más resistente.", "cost": {"wood": 6, "metal": 6}, "requires": ["metalwork"], "minEra": 1, "days": 3, "effects": {"defenseBonus": 5, "unlockBuilding": "wall"}},
                    {"id": "advanced_housing", "name": "Alojamiento avanzado", "desc": "Más capacidad por refugio.", "cost": {"wood": 8, "metal": 4}, "requires": ["basic_carpentry"], "minEra": 1, "days": 4, "effects": {"housingBonus": 1}},
                    {"id": "power_grid", "name": "Red eléctrica", "desc": "Optimiza generadores y talleres.", "cost": {"metal": 8, "fuel": 4}, "requires": ["metalwork", "reinforced_walls"], "minEra": 2, "days": 5, "effects": {"fuelSaveBonus": 0.2, "unlockBuilding": "power_hub"}},
                ],
            },
            "logistica": {
                "name": "Logística",
                "techs": [
                    {"id": "scouting", "name": "Exploración", "desc": "Mejor lectura del mapa y rutas.", "cost": {"food": 2, "wood": 2}, "requires": [], "minEra": 0, "days": 2, "effects": {"expeditionSlots": 1}},
                    {"id": "pack_mules", "name": "Carga ligera", "desc": "Más botín por expedición a pie.", "cost": {"wood": 3, "metal": 2}, "requires": ["scouting"], "minEra": 0, "days": 2, "effects": {"cargoBonus": 0.15}},
                    {"id": "bike_tech", "name": "Taller de bicis", "desc": "Desbloquea bicicletas.", "cost": {"metal": 4, "wood": 4}, "requires": ["scouting"], "minEra": 1, "days": 3, "effects": {"vehicleUnlock": "bike"}},
                    {"id": "vehicle_bay", "name": "Bahía de vehículos", "desc": "Coches y furgonetas.", "cost": {"metal": 8, "fuel": 3, "wood": 4}, "requires": ["bike_tech", "pack_mules"], "minEra": 2, "days": 4, "effects": {"vehicleUnlock": "car", "expeditionSlots": 1}},
                    {"id": "convoy", "name": "Convoy", "desc": "Operaciones con van y más carga.", "cost": {"metal": 10, "fuel": 5}, "requires": ["vehicle_bay"], "minEra": 3, "days": 5, "effects": {"vehicleUnlock": "van", "cargoBonus": 0.25}},
                ],
            },
            "defensa": {
                "name": "Defensa",
                "techs": [
                    {"id": "watch_protocols", "name": "Protocolos de guardia", "desc": "Turnos más efectivos.", "cost": {"wood": 3, "ammo": 1}, "requires": [], "minEra": 0, "days": 2, "effects": {"defenseBonus": 3}},
                    {"id": "ammo_craft", "name": "Recarga de munición", "desc": "Recuperáis vainas útiles.", "cost": {"metal": 4, "ammo": 2}, "requires": ["watch_protocols"], "minEra": 1, "days": 3, "effects": {"ammoEfficiency": 0.2}},
                    {"id": "tower_optics", "name": "Óptica de atalaya", "desc": "Detección temprana de oleadas.", "cost": {"metal": 5, "wood": 3}, "requires": ["watch_protocols"], "minEra": 1, "days": 3, "effects": {"defenseBonus": 5, "threatSight": 1}},
                    {"id": "fortify", "name": "Fortificación", "desc": "Barricadas y trampas perimetrales.", "cost": {"wood": 8, "metal": 6, "ammo": 2}, "requires": ["ammo_craft", "tower_optics"], "minEra": 2, "days": 4, "effects": {"defenseBonus": 8, "unlockBuilding": "barricade"}},
                    {"id": "armor_vehicle", "name": "Blindaje móvil", "desc": "Desbloquea el vehículo acorazado.", "cost": {"metal": 12, "fuel": 4, "ammo": 3}, "requires": ["fortify"], "minEra": 3, "days": 5, "effects": {"vehicleUnlock": "armored", "defenseBonus": 5}},
                ],
            },
        }
    }


def main():
    events = build_events()
    ids = [e["id"] for e in events]
    assert len(ids) == len(set(ids)), "IDs duplicados"

    for e in events:
        assert 2 <= len(e["variants"]) <= 4, e["id"]
        assert e["family"], e["id"]

    OUT.mkdir(parents=True, exist_ok=True)

    files = {
        "events.json": {"events": events},
        "research.json": build_research(),
        "vehicles.json": {
            "vehicles": [
                {"id": "bike", "name": "Bicicleta", "fuelPerTrip": 0, "speedBonus": 0.15, "cargoBonus": 0, "protection": 0, "minEra": 1, "cost": {"metal": 4, "wood": 6}},
                {"id": "car", "name": "Coche", "fuelPerTrip": 2, "speedBonus": 0.35, "cargoBonus": 0.25, "protection": 1, "minEra": 2, "cost": {"metal": 10, "wood": 4, "fuel": 3}},
                {"id": "van", "name": "Furgoneta", "fuelPerTrip": 3, "speedBonus": 0.25, "cargoBonus": 0.5, "protection": 2, "minEra": 3, "cost": {"metal": 14, "wood": 6, "fuel": 4}},
                {"id": "armored", "name": "Blindado", "fuelPerTrip": 4, "speedBonus": 0.2, "cargoBonus": 0.35, "protection": 5, "minEra": 3, "cost": {"metal": 20, "wood": 4, "fuel": 5, "ammo": 2}},
            ]
        },
        "infected.json": {
            "types": [
                {"id": "common", "name": "Común", "hp": 20, "speed": 1.0, "damage": 8, "threatWeight": 1, "lootChance": 0.05, "minEra": 0, "desc": "Infectado lento y numeroso."},
                {"id": "fast", "name": "Rápido", "hp": 16, "speed": 1.8, "damage": 12, "threatWeight": 2, "lootChance": 0.08, "minEra": 1, "desc": "Ágil y agresivo; rompe formaciones."},
                {"id": "tank", "name": "Tanque", "hp": 80, "speed": 0.6, "damage": 22, "threatWeight": 5, "lootChance": 0.15, "minEra": 2, "desc": "Bruto resistente que derriba barreras."},
                {"id": "horde", "name": "Horda", "hp": 12, "speed": 1.1, "damage": 6, "threatWeight": 3, "lootChance": 0.02, "minEra": 1, "desc": "Oleada densa; el peligro es el número."},
                {"id": "rare", "name": "Raro", "hp": 45, "speed": 1.3, "damage": 18, "threatWeight": 4, "lootChance": 0.25, "minEra": 3, "desc": "Mutación infrecuente con comportamiento imprevisible."},
            ]
        },
        "factions.json": {
            "templates": [
                {"id": "faction_friendly", "name": "Los del Puente", "trait": "friendly", "hostility": 10, "tradeMult": 0.9, "desc": "Comparten avisos y trueques justos.", "offers": ["food", "water", "medicine"], "wants": ["metal", "ammo"]},
                {"id": "faction_trader", "name": "Caravana Gris", "trait": "trader", "hostility": 25, "tradeMult": 1.0, "desc": "Mercaderes nómadas: todo tiene precio.", "offers": ["ammo", "fuel", "medicine"], "wants": ["food", "metal", "wood"]},
                {"id": "faction_isolationist", "name": "Muralla Cerrada", "trait": "isolationist", "hostility": 40, "tradeMult": 1.4, "desc": "No quieren visitas. Disparan primero si te acercas.", "offers": ["water"], "wants": ["medicine"]},
                {"id": "faction_opportunist", "name": "Chatarra Viva", "trait": "opportunist", "hostility": 55, "tradeMult": 1.2, "desc": "Ayudan si conviene; saquean si pueden.", "offers": ["metal", "fuel"], "wants": ["food", "ammo"]},
                {"id": "faction_hostile", "name": "Jauría Roja", "trait": "hostile", "hostility": 85, "tradeMult": 2.0, "desc": "Bandidos organizados. La diplomacia es peaje.", "offers": ["ammo"], "wants": ["food", "fuel", "medicine", "metal"]},
                {"id": "faction_variable", "name": "Círculo de Niebla", "trait": "variable", "hostility": 45, "tradeMult": 1.1, "desc": "Su humor cambia con rumores y escasez.", "offers": ["food", "medicine", "wood"], "wants": ["fuel", "ammo"]},
            ]
        },
        "eras.json": {
            "eras": [
                {"id": 0, "name": "Refugio", "desc": "Sobrevivir el primer cerco.", "unlock": {"minPop": 0, "minControlled": 0, "minResearch": 0, "minDay": 0}, "soft": {"minDay": 1}},
                {"id": 1, "name": "Asentamiento", "desc": "Organizar producción y rutas.", "unlock": {"minPop": 5, "minControlled": 2, "minResearch": 2, "minDay": 8}, "soft": {"minDay": 6}},
                {"id": 2, "name": "Colonia", "desc": "Expandir perímetro y diplomacia.", "unlock": {"minPop": 10, "minControlled": 4, "minResearch": 5, "minDay": 18}, "soft": {"minDay": 14}},
                {"id": 3, "name": "Distrito", "desc": "Logística pesada y amenazas mayores.", "unlock": {"minPop": 18, "minControlled": 7, "minResearch": 10, "minDay": 30}, "soft": {"minDay": 24}},
                {"id": 4, "name": "Zona Zero", "desc": "Dominio regional bajo presión constante.", "unlock": {"minPop": 28, "minControlled": 10, "minResearch": 16, "minDay": 45}, "soft": {"minDay": 36}},
            ]
        },
    }

    for name, data in files.items():
        (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    fam = Counter(e["family"] for e in events)
    non_calma = sum(1 for e in events if e["family"] != "calma")
    with_choices = sum(1 for e in events if "choices" in e)
    print("TOTAL", len(events))
    print("NON_CALMA", non_calma)
    print("WITH_CHOICES", with_choices, f"({100 * with_choices / len(events):.0f}%)")
    print("BY_FAMILY")
    for k in sorted(fam):
        print(f"  {k}: {fam[k]}")


if __name__ == "__main__":
    main()
