// Service Worker for CASTER PWA
// Cache version - increment to force update and invalidate old HTML/chunks
const CACHE_NAME = 'caster-v3';
const RUNTIME_CACHE = 'caster-runtime-v3';

// Assets to cache on install
// Only cache resources that definitely exist
const PRECACHE_ASSETS = [
  '/login', // Cache login page instead of root (root redirects)
  '/offline.html',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching static assets');
        // Use Promise.allSettled to handle failures gracefully
        return Promise.allSettled(
          PRECACHE_ASSETS.map((url) => {
            return fetch(url)
              .then((response) => {
                if (response.ok) {
                  return cache.put(url, response);
                } else {
                  console.warn(`[SW] Failed to cache ${url}: ${response.status}`);
                  return Promise.resolve(); // Continue even if one fails
                }
              })
              .catch((error) => {
                console.warn(`[SW] Failed to fetch ${url}:`, error);
                return Promise.resolve(); // Continue even if one fails
              });
          })
        );
      })
      .then((results) => {
        // Log results for debugging
        if (results && results.length > 0) {
          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              console.warn(`[SW] Failed to precache ${PRECACHE_ASSETS[index]}:`, result.reason);
            } else if (result.status === 'fulfilled') {
              console.log(`[SW] Successfully precached ${PRECACHE_ASSETS[index]}`);
            }
          });
        }
        console.log('[SW] Precaching completed');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Precaching failed:', error);
        // Still skip waiting to activate the service worker
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
    })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = event.request.url;

  // Skip API requests (they should always go to network)
  if (url.includes('/api/')) {
    return;
  }

  // Always let Next.js handle its own assets/chunks to avoid stale bundles
  if (url.includes('/_next/')) {
    return;
  }

  // For HTML documents, use network-first with offline fallback,
  // but do NOT cache them to avoid serving old HTML that references missing chunks.
  if (event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html').catch(() => {
          return new Response('You are offline. Please check your connection.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/html' }
          });
        });
      })
    );
    return;
  }

  // For other static assets (images, CSS, etc.), use cache-first with network fallback
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();

            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            return new Response('', { status: 503 });
          });
      })
  );
});

