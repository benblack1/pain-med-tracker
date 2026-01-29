// UPDATED: Version v2
const CACHE_NAME = 'pain-tracker-v3'; 
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png'
];

// Install: Cache new files
self.addEventListener('install', (event) => {
  // Force this new service worker to become active immediately
  self.skipWaiting(); 
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  // Tell the active service worker to take control of the page immediately
  self.clients.claim(); 
});

// Fetch: Serve from cache, but try to update in background
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached hit if found, otherwise network
        return response || fetch(event.request);
      })
  );
});
