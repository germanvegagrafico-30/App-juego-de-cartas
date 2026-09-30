/* ==========================================================================
   SERVICE WORKER — PWA Network-First Caching & Auto-Update
   ========================================================================== */

const CACHE_NAME = 'munchkin-app-v3';

self.addEventListener('install', (event) => {
  // Activate new service worker immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Purge old cache versions
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests, bypass Supabase API and WebSocket requests
  if (event.request.method !== 'GET' || event.request.url.includes('supabase.co')) {
    return;
  }

  // Network-First strategy: Always fetch fresh code from Vercel CDN first
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline fallback: Use cached files if user has no internet
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/') || caches.match('/index.html');
          }
        });
      })
  );
});
