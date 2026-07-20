const CACHE_NAME = 'cineverse-v2.5';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/watch.html',
  '/party.html',
  '/style.css',
  '/script.js',
  '/player.js',
  '/src/theme.js',
  '/src/party.js',
  '/src/comments.js',
  '/src/pwa.js',
  '/movies.json',
  '/icon/favicon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && !key.startsWith('cineverse-media-')) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((networkRes) => {
          return caches.open(CACHE_NAME).then((cache) => {
            if (event.request.url.startsWith('http')) {
              cache.put(event.request, networkRes.clone());
            }
            return networkRes;
          });
        })
      );
    }).catch(() => caches.match('/index.html'))
  );
});
