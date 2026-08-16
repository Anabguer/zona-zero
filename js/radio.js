/**
 * ZZ-094…096 — Radio (historias/señales/contactos) ≠ Centro (logística visible).
 */
import { uid } from './util.js';

export function hasRadio(state) {
  return (state.base?.buildings || []).some((b) => b.type === 'radio' && b.hp > 0);
}

export function hasExpeditionCenter(state) {
  return (state.base?.buildings || []).some((b) => b.type === 'expedition_center' && b.hp > 0);
}

export function ensureRadioState(state) {
  if (!state.radio) {
    state.radio = { signals: [], contacts: [], lastSignalDay: 0 };
  }
  if (!Array.isArray(state.radio.signals)) state.radio.signals = [];
  if (!Array.isArray(state.radio.contacts)) state.radio.contacts = [];
  return state.radio;
}

/** Señal/contacto jugable (historia), no +% invisible. */
export function pushRadioSignal(state, { title, detail, kind = 'rumor', zoneId = null }) {
  const radio = ensureRadioState(state);
  const entry = {
    id: uid('sig'),
    day: state.day,
    title,
    detail,
    kind,
    zoneId,
  };
  radio.signals.unshift(entry);
  radio.signals = radio.signals.slice(0, 12);
  radio.lastSignalDay = state.day;
  if (kind === 'contact' || kind === 'sos') {
    radio.contacts.unshift({
      id: uid('ct'),
      day: state.day,
      name: title,
      note: detail,
    });
    radio.contacts = radio.contacts.slice(0, 8);
  }
  return entry;
}

/** Bonus de peso Director para familia radio solo si hay edificio. */
export function radioFamilyWeightMult(state) {
  if (!hasRadio(state)) return 0.05; // casi nulo sin antena
  const staffed = (state.base?.buildings || []).some(
    (b) => b.type === 'radio' && b.hp > 0 && (b.workers || 0) > 0
  );
  return staffed ? 2.4 : 1.55;
}

/**
 * Logística del centro: números visibles en preview.
 * riskDelta negativo = menos riesgo; daysDelta negativo = menos días; slotsBonus.
 */
export function expeditionCenterBonus(state) {
  if (!hasExpeditionCenter(state)) {
    return { riskDelta: 0, daysDelta: 0, slotsBonus: 0, label: null };
  }
  const center = (state.base.buildings || []).find((b) => b.type === 'expedition_center' && b.hp > 0);
  const staff = center?.workers || 0;
  return {
    riskDelta: -0.06 - staff * 0.02,
    daysDelta: staff >= 1 ? -1 : 0,
    slotsBonus: 1,
    label: staff
      ? `Centro: riesgo↓ · tiempo↓ (staff ${staff})`
      : 'Centro: riesgo↓ (asigná staff para tiempo↓)',
  };
}
