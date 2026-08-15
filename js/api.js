/** API cliente Zona Zero */
const BASE = new URL('../api/', import.meta.url);

async function req(path, options = {}) {
  const res = await fetch(new URL(path, BASE), {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = { ok: false, error: 'bad_json' };
  }
  if (res.status === 401 || data.error === 'auth_required') {
    const login = data.login || '/login.php';
    window.location.href = login + (login.includes('?') ? '&' : '?') + 'redirect=' + encodeURIComponent(window.location.href);
    throw new Error('auth');
  }
  return data;
}

export function fetchSlots() {
  return req('slots.php');
}

export function saveSlot(slot, state, title, summary) {
  return req('save.php', {
    method: 'POST',
    body: JSON.stringify({ slot, state, title, summary }),
  });
}

export function loadSlot(slot) {
  return req(`load.php?slot=${slot}`);
}

export function deleteSlot(slot) {
  return req('delete.php', {
    method: 'POST',
    body: JSON.stringify({ slot }),
  });
}
