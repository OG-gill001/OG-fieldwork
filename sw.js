// OG Fieldwork - offline worker.
// Everything the app needs is precached on install, so once it has been opened
// one time it runs with no connection at all: a dead spot on site, aeroplane
// mode, a SIM with nothing left on it.
// Bump CACHE whenever index.html changes, or phones keep serving the old copy.
var CACHE = 'og-fieldwork-v1';

var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          if (k !== CACHE) return caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;

      return fetch(e.request).then(function (res) {
        // Keep same-origin responses for next time. Cross-origin ones are
        // opaque, and caching those would hide real failures.
        try {
          if (res && res.ok && new URL(e.request.url).origin === self.location.origin) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
          }
        } catch (err) { /* malformed URL - just pass the response through */ }
        return res;
      }).catch(function () {
        // Offline and not precached: a page request still gets the app shell.
        if (e.request.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    })
  );
});
