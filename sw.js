// Pain Med Sync Service Worker v6
const CACHE_NAME = 'pain-tracker-v6'; 
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png'
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
