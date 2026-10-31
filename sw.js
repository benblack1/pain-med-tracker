// Pain Med Sync Service Worker v9
const CACHE_NAME = 'pain-tracker-v9'; 
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './favicon-32.png',
  './favicon-16.png',
  './favicon-48.png',
  './favicon-192.png',
  './icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './icon-any-192.png',
  './icon-any-512.png',
  './icon-monochrome-192.png',
  './icon-monochrome-512.png',
  './apple-touch-icon.png'
];

// Install: Cache new files & activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
  );
});

// Activate: Clean up old caches & claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[SW] Purging old cache:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim(); 
});

// Fetch: Stale-while-revalidate for local assets, network-only for Google Script & ntfy
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Don't intercept Google Apps Script or ntfy API requests
  if (url.includes('script.google.com') || url.includes('ntfy.sh')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
  );
});
