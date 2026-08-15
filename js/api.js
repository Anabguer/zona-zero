/**
 * API cliente Zona Zero — partida única (main) + backup interno.
 */
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

/** Estado de portada: ¿hay partida principal? */
export function fetchSaveStatus() {
  return req('slots.php', { timeoutMs: 15000 });
}

/** @deprecated alias — usar fetchSaveStatus */
export function fetchSlots() {
  return fetchSaveStatus();
}

export function saveGame(state, title, summary) {
  return req('save.php', {
    method: 'POST',
    body: JSON.stringify({ state, title, summary }),
    timeoutMs: 20000,
  });
}

/** @deprecated alias */
export function saveSlot(_slot, state, title, summary) {
  return saveGame(state, title, summary);
}

export function loadGame() {
  return req('load.php', { timeoutMs: 15000 });
}

/** @deprecated alias — ignora slot */
export function loadSlot(_slot) {
  return loadGame();
}

export function clearGame() {
  return req('delete.php', {
    method: 'POST',
    body: JSON.stringify({}),
    timeoutMs: 15000,
  });
}

/** @deprecated alias */
export function deleteSlot(_slot) {
  return clearGame();
}
