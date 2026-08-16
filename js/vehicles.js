/**
 * ZZ-090…093 — Vehículos: garage, fuel≠calor, efectos, repair.
 */
export function hasGarage(state) {
  return (state.base?.buildings || []).some((b) => b.type === 'garage' && b.hp > 0);
}

export function hasMechShop(state) {
  return (state.base?.buildings || []).some((b) => b.type === 'mech_shop' && b.hp > 0);
}

export function findVehicle(content, vehicleId) {
  return content.vehiclesDoc?.vehicles?.find((v) => v.id === vehicleId) || null;
}

export function ownedVehicles(state) {
  return state.vehiclesOwned || [];
}

export function ensureVehicleMeta(state, vehicleId) {
  if (!state.vehicleMeta) state.vehicleMeta = {};
  if (!state.vehicleMeta[vehicleId]) {
    state.vehicleMeta[vehicleId] = { trips: 0, needsRepair: false, wear: 0 };
  }
  return state.vehicleMeta[vehicleId];
}

/** Fuel de viaje (0 a pie). Garage con workers puede ahorrar 1 fuel (mín 0). */
export function tripFuelCost(state, content, vehicleId) {
  const veh = findVehicle(content, vehicleId);
  if (!veh) return content.balance?.expeditionFuelCost ?? 0;
  let fuel = veh.fuelPerTrip || 0;
  if (fuel <= 0) return 0;
  const garage = (state.base?.buildings || []).find((b) => b.type === 'garage' && b.hp > 0);
  if (garage && (garage.workers || 0) > 0) fuel = Math.max(0, fuel - 1);
  if ((state.research?.unlocked || []).includes('convoy') && vehicleId === 'van') {
    /* convoy ya aporta cargo; no doble ahorro */
  }
  return fuel;
}

export function vehicleUsable(state, vehicleId) {
  if (!vehicleId) return true;
  if (!(state.vehiclesOwned || []).includes(vehicleId)) return false;
  const meta = ensureVehicleMeta(state, vehicleId);
  return !meta.needsRepair;
}

export function markVehicleTrip(state, vehicleId) {
  if (!vehicleId) return;
  const meta = ensureVehicleMeta(state, vehicleId);
  meta.trips += 1;
  meta.wear = Math.min(100, (meta.wear || 0) + 18);
  if (meta.wear >= 80) meta.needsRepair = true;
}

/** Repair vehicular: metal+fuel; taller preferible, garage como mínimo. */
export function repairVehicle(state, content, vehicleId) {
  if (!(state.vehiclesOwned || []).includes(vehicleId)) {
    return { ok: false, error: 'No tenéis ese vehículo' };
  }
  if (!hasGarage(state) && !hasMechShop(state)) {
    return { ok: false, error: 'Hace falta garaje o taller mecánico' };
  }
  const meta = ensureVehicleMeta(state, vehicleId);
  const cost = { metal: hasMechShop(state) ? 2 : 3, fuel: 1 };
  if ((state.resources.metal || 0) < cost.metal) return { ok: false, error: 'Falta metal' };
  if ((state.resources.fuel || 0) < cost.fuel) return { ok: false, error: 'Falta combustible' };
  state.resources.metal -= cost.metal;
  state.resources.fuel -= cost.fuel;
  meta.needsRepair = false;
  meta.wear = 0;
  return { ok: true, cost };
}

export function vehicleEffectSummary(veh) {
  if (!veh) return 'A pie';
  const bits = [];
  if (veh.speedBonus) bits.push(`−${Math.round(veh.speedBonus * 100)}% tiempo`);
  if (veh.cargoBonus) bits.push(`+${Math.round(veh.cargoBonus * 100)}% carga`);
  if (veh.protection) bits.push(`prot ${veh.protection}`);
  bits.push(veh.fuelPerTrip ? `${veh.fuelPerTrip} fuel/viaje` : 'sin fuel');
  return bits.join(' · ');
}
