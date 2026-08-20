/**
 * Service worker mínimo — requisito de instalabilidad PWA.
 * No intercepta red. respondWith(fetch()) rechaza si la navegación se aborta
 * (p. ej. play.php?new=1&intro=1) y Chrome muestra "Failed to fetch".
 * v2 — passthrough nativo
 */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  /* Dejar pasar: el navegador hace el fetch. No llamar a respondWith(). */
});
