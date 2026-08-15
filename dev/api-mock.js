/**
 * API mock in-memory para harness local sin login.
 */
const slots = {
  1: null,
  2: null,
  3: null,
};

export function fetchSlots() {
  return Promise.resolve({
    ok: true,
    user: { nombre: 'Tester' },
    slots: [1, 2, 3].map((slot) => {
      const s = slots[slot];
      if (!s) return { slot, empty: true, alive: true };
      return {
        slot,
        empty: false,
        alive: !s.state?.flags?.defeated,
        title: s.title,
        summary: s.summary,
        updated_at: s.updated_at,
      };
    }),
  });
}

export function saveSlot(slot, state, title, summary) {
  slots[slot] = {
    state: JSON.parse(JSON.stringify(state)),
    title,
    summary,
    updated_at: new Date().toISOString(),
  };
  return Promise.resolve({ ok: true });
}

export function loadSlot(slot) {
  const s = slots[slot];
  if (!s) return Promise.resolve({ ok: false, error: 'empty' });
  return Promise.resolve({ ok: true, state: JSON.parse(JSON.stringify(s.state)) });
}

export function deleteSlot(slot) {
  slots[slot] = null;
  return Promise.resolve({ ok: true });
}
