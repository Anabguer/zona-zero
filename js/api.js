/** API cliente Zona Zero */
const BASE = new URL('../api/', import.meta.url);

async function req(path, options = {}) {
  const { timeoutMs = 15000, headers: extraHeaders, ...fetchOpts } = options;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(new URL(path, BASE), {
      credentials: 'same-origin',
      ...fetchOpts,
      headers: { 'Content-Type': 'application/json', ...(extraHeaders || {}) },
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') {
      throw new Error('timeout');
    }
    throw new Error('network');
  }
  clearTimeout(timer);

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = { ok: false, error: 'bad_json', status: res.status };
  }
  if (res.status === 401 || data.error === 'auth_required') {
    const login = data.login || '/login.php';
    const sep = login.includes('?') ? '&' : '?';
    window.location.href =
      login + sep + 'redirect=' + encodeURIComponent(window.location.href);
    throw new Error('auth');
  }
  return data;
}

export function fetchSlots() {
  return req('slots.php', { timeoutMs: 15000 });
}

export function saveSlot(slot, state, title, summary) {
  return req('save.php', {
    method: 'POST',
    body: JSON.stringify({ slot, state, title, summary }),
    timeoutMs: 20000,
  });
}

export function loadSlot(slot) {
  return req(`load.php?slot=${slot}`, { timeoutMs: 15000 });
}

export function deleteSlot(slot) {
  return req('delete.php', {
    method: 'POST',
    body: JSON.stringify({ slot }),
    timeoutMs: 15000,
  });
}
