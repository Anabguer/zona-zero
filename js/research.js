/**
 * ZZ-080…083 — Research: banco, workers→progreso, efectos cableados, copy deseo.
 * Sin rama Energía. Cuarentena pasiva (no toggle/−prod artificial).
 */
export function allTechs(content) {
  const list = [];
  Object.values(content.researchDoc?.branches || {}).forEach((br) => {
    (br.techs || []).forEach((t) => list.push(t));
  });
  return list;
}

export function findTech(content, techId) {
  return allTechs(content).find((t) => t.id === techId) || null;
}

export function hasResearchBench(state) {
  return (state.base?.buildings || []).some(
    (b) => (b.type === 'tech_bench' || b.type === 'lab') && b.hp > 0
  );
}

/** Trabajadores en banco/lab (acelera investigación). */
export function researchWorkers(state) {
  return (state.base?.buildings || []).reduce((n, b) => {
    if (b.hp <= 0) return n;
    if (b.type === 'tech_bench' || b.type === 'lab') return n + (b.workers || 0);
    return n;
  }, 0);
}

/** Progreso diario: base 1 + 0.5 por worker de research (mín 1 si hay banco). */
export function researchProgressPerDay(state) {
  if (!hasResearchBench(state) && !(state.research?.active)) return 0;
  const w = researchWorkers(state);
  return Math.max(1, 1 + w * 0.5);
}

export function sumTechEffect(state, content, key) {
  let sum = 0;
  const unlocked = state.research?.unlocked || [];
  allTechs(content).forEach((t) => {
    if (!unlocked.includes(t.id)) return;
    const v = t.effects?.[key];
    if (typeof v === 'number') sum += v;
  });
  return sum;
}

export function techUnlockedBuilding(state, content, buildingType) {
  const unlocked = state.research?.unlocked || [];
  return allTechs(content).some(
    (t) => unlocked.includes(t.id) && t.effects?.unlockBuilding === buildingType
  );
}

/** Beneficio en lenguaje humano (ZZ-083). */
export function techBenefitText(tech) {
  if (!tech) return '';
  if (tech.benefit) return tech.benefit;
  const e = tech.effects || {};
  const bits = [];
  if (e.foodProdBonus) bits.push(`+${Math.round(e.foodProdBonus * 100)}% comida de huertos`);
  if (e.waterProdBonus) bits.push(`+${Math.round(e.waterProdBonus * 100)}% agua de pozos`);
  if (e.metalProdBonus) bits.push(`+${Math.round(e.metalProdBonus * 100)}% metal`);
  if (e.healBonus) bits.push(`cura un ${Math.round(e.healBonus * 100)}% más rápido`);
  if (e.quarantinePassive) bits.push('cuarentena pasiva: brotes más lentos y cortos');
  if (e.spoilReduction) bits.push(`menos merma de comida (−${Math.round(e.spoilReduction * 100)}%)`);
  if (e.buildCostReduction) bits.push(`edificios −${Math.round(e.buildCostReduction * 100)}% madera/metal`);
  if (e.defenseBonus) bits.push(`+${e.defenseBonus} defensa de colonia`);
  if (e.unlockBuilding) {
    const names = {
      greenhouse: 'invernadero',
      insulated_house: 'vivienda aislada',
      fence: 'cercas reforzadas',
      barricade: 'barricadas',
    };
    bits.push(`desbloquea ${names[e.unlockBuilding] || e.unlockBuilding}`);
  }
  if (e.housingBonus) bits.push(`+${e.housingBonus} plaza de vivienda`);
  if (e.ammoEfficiency) bits.push('armerías más eficientes con munición');
  if (e.repairCostMult) bits.push('reparar más barato y algo más rápido');
  if (e.threatSight) bits.push('avisos de hostiles más tempranos');
  if (e.vehicleUnlock) bits.push(`desbloquea vehículo: ${e.vehicleUnlock}`);
  if (e.cargoBonus) bits.push('más carga en expediciones');
  if (e.expeditionSlots) bits.push('mejor logística de exploradores');
  if (e.fuelSaveBonus) bits.push('ahorro de combustible');
  if (e.outbreakSpreadMult) bits.push('menos contagio en brotes');
  return bits.join(' · ') || tech.desc || '';
}

export function assertNoEnergyBranch(content) {
  const branches = Object.keys(content.researchDoc?.branches || {});
  const bad = branches.some((b) => /energ/i.test(b));
  const techs = allTechs(content);
  const energyTech = techs.some((t) =>
    /power_grid|generator|solar|power_hub|basic_generator/i.test(t.id)
  );
  return !bad && !energyTech;
}
