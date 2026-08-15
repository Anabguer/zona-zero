# CONTENT_SCHEMA — Zona Zero GAME_MASTER 2.5

**Estado:** Contrato de datos · fase ZZ-003  
**Principio:** todo balance/desbloqueo en `content/*.json`; UI no hardcodea números.

---

## 1. Archivos canónicos (runtime)

| Archivo | Rol |
|---------|-----|
| `balance.json` | Tasas, caps, laborModel, woodHeating, outbreaks, buildingDamage, ambientLife, victory |
| `buildings.json` | Catálogo edificios (sin generator/solar/command en v1 activo) |
| `locations.json` | Tipos + seedLayout (única fuente de mapa) |
| `research.json` | Árbol utilitario (sin rama Energía) |
| `events.json` | Eventos + familias |
| `eras.json` | Eras / unlock |
| `vehicles.json` | Vehículos (fuel/viaje) |
| `infected.json` | Tipos infectados |
| `factions.json` | Contactos ligeros |
| `survivors.json` | Nombres/traits exploradores |
| `missions.json` | **nuevo** plantillas misiones (fases K) |
| `achievements.json` | **nuevo** (fases L) |
| `outbreaks.json` | **opcional** arquetipos (o sección en balance) |

**Deprecado:** `zones.json` — no load path runtime; solo legado. Smoke/tests usan `locations.json`.

---

## 2. `balance.json` — secciones 2.5

```json
{
  "saveVersion": 5,
  "laborModel": "per_building",
  "woodHeating": {
    "enabled": false,
    "woodPerUnprotectedPersonPerSeverity": 0.4,
    "exposureThresholds": { "amber": 2, "red": 5 },
    "warnDaysBefore": [1, 2, 3]
  },
  "outbreaks": {
    "enabled": false,
    "noFixedCalendar": true,
    "archetypes": ["fever_wave", "gut_bug", "wound_infection", "winter_cough", "mystery_radio"]
  },
  "buildingDamage": {
    "enabled": false,
    "states": ["ok", "damaged", "critical", "destroyed"]
  },
  "ambientLife": {
    "enabled": false,
    "maxSprites": 16
  },
  "victory": {
    "needEnergy": false,
    "needHospital": true,
    "minDefense": 40
  },
  "deprecatedV1": {
    "electricity": true,
    "secondaryResources": ["parts", "tools"]
  }
}
```

`enabled: false` = skeleton: no cambia gameplay hasta la fase que lo active.

---

## 3. Buildings (campos relevantes)

| Campo | Tipo | Notas 2.5 |
|-------|------|-----------|
| id, name, desc, cost, category, w, h, max, jobs, housing, defense, produces, minEra, requiresBuilding, upgradeFrom | existente | — |
| `climateProtection` | 0–3 | housing |
| `energy` | — | **prohibido** en v1 activo |
| cistern | | softCapWater / rainCollect; **no** produces.water espejo de well |

Edificios **fuera de catálogo activo:** `generator`, `solar`, `command`, `wall`, `power_hub`.

---

## 4. Research

| Campo | Notas |
|-------|-------|
| branches | supervivencia, construcción, defensa, medicina, exploración — **sin Energía** |
| tech: id, name, desc, cost, requires, minEra, days, effects | effects **obligatorios** y cableados |
| `quarantine_protocol` | pasivo permanente; −spread/−duration; sin toggle/−prod |

Staffing: jobs en `tech_bench` / `lab` = workers de research.

---

## 5. Outbreaks (modelo estado)

```
sick, outbreakSeverity 0–3, outbreakType, daysInOutbreak,
quarantineProtocolUnlocked: bool
```

Prod↓ solo por sick/aislados + reasignación workers.

---

## 6. Building HP

```
building.hp 0–1 | state: ok|damaged|critical|destroyed
```

Repair: cost wood/metal, days, workers.

---

## 7. Missions / expedition templates

```
placeType × placeState × encounter × choice → outcome + aftermath
```

Pesos, cooldown, memoria, antirrepetición, rareza.

---

## 8. Ambient life

Cap sprites; semáforo green/amber/red; no NPCs individuales.

---

## 9. Save migration

`SAVE_VERSION` → 5+: defaults para woodHeating/outbreaks/buildingDamage/ambientLife; strip energy fields; `needEnergy` false.

---

*ZZ-003 · schemas documentales; implementación de sistemas en fases posteriores.*
