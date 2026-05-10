const CACHE = 'appleo-v3';

const PRECACHE = [
  '/NewAppLeo/',
  '/NewAppLeo/index.html',
  '/NewAppLeo/icon-192.png',
  '/NewAppLeo/icon-512.png',
  '/NewAppLeo/apple-touch-icon.png',
  '/NewAppLeo/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip Firebase, auth, and external API requests
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('firestore') ||
    url.protocol === 'chrome-extension:'
  ) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      const networkPromise = fetch(event.request).then((response) => {
        if (response.ok && response.status < 400) {
          cache.put(event.request, response.clone());
        }
        return response;
      });
      // Stale-while-revalidate: return cache instantly, update in background
      return cached ?? networkPromise;
    })
  );
});
