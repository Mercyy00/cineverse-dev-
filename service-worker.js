const CACHE_NAME = 'cineverse-v6.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/anime.html',
  '/watch.html',
  '/party.html',
  '/style.css',
  '/script.js',
  '/anime.js',
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
  const url = event.request.url;

  // Network-First for HTML and JS files to prevent stale caching issues
  if (url.endsWith('.html') || url.endsWith('.js') || url.includes('?v=')) {
    event.respondWith(
      fetch(event.request)
        .then((networkRes) => {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          return networkRes;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-First for static assets (images, fonts)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((networkRes) => {
          return caches.open(CACHE_NAME).then((cache) => {
            if (url.startsWith('http')) {
              cache.put(event.request, networkRes.clone());
            }
            return networkRes;
          });
        })
      );
    }).catch(() => caches.match('/index.html'))
  );
});
