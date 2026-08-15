/**
 * API mock in-memory — main + backup (GAME_MASTER §31.7).
 */
let main = null;
let backup = null;

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function valid(state) {
  return !!(state && state.day >= 1 && state.resources && state.base);
}

export function fetchSaveStatus() {
  const s = main || backup;
  return Promise.resolve({
    ok: true,
    user: { nombre: 'Tester' },
    save: s
      ? {
          empty: false,
          title: s.title,
          summary: s.summary,
          day: s.state?.day || 1,
          population: s.state?.population?.total || 0,
          alive: !s.state?.flags?.defeated,
          updated_at: s.updated_at,
        }
      : null,
    slots: [
      s
        ? {
            slot: 1,
            empty: false,
            title: s.title,
            summary: s.summary,
            alive: !s.state?.flags?.defeated,
            updated_at: s.updated_at,
          }
        : { slot: 1, empty: true, alive: true },
    ],
  });
}

export function fetchSlots() {
  return fetchSaveStatus();
}

export function saveGame(state, title, summary) {
  if (!valid(state)) {
    return Promise.resolve({ ok: false, error: 'state_invalid' });
  }
  if (main && valid(main.state)) {
    backup = clone(main);
  }
  main = {
    state: clone(state),
    title,
    summary,
    updated_at: new Date().toISOString(),
  };
  return Promise.resolve({ ok: true, key: 'main' });
}

export function saveSlot(_slot, state, title, summary) {
  return saveGame(state, title, summary);
}

export function loadGame() {
  if (main && valid(main.state)) {
    return Promise.resolve({
      ok: true,
      key: 'main',
      recoveredFromBackup: false,
      state: clone(main.state),
      meta: { title: main.title, summary: main.summary },
    });
  }
  if (backup && valid(backup.state)) {
    main = clone(backup);
    return Promise.resolve({
      ok: true,
      key: 'main',
      recoveredFromBackup: true,
      message: 'Recuperamos tu colonia desde una copia de seguridad.',
      state: clone(backup.state),
      meta: { title: backup.title, summary: backup.summary },
    });
  }
  return Promise.resolve({ ok: false, error: 'empty_save' });
}

export function loadSlot(_slot) {
  return loadGame();
}

export function clearGame() {
  main = null;
  backup = null;
  return Promise.resolve({ ok: true, cleared: true });
}

export function deleteSlot(_slot) {
  return clearGame();
}

/** Solo tests */
export function __mockDump() {
  return { main, backup };
}
