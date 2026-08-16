/**
 * Service worker mínimo — requisito de instalabilidad PWA.
 * No cachea agresivo: la app sigue siendo red-first (ZZ_ASSET_V + importmap).
 */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
