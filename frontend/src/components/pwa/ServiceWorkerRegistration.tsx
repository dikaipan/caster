'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      // Defer service worker registration until browser is idle
      // This reduces Total Blocking Time by not blocking the main thread
      const registerServiceWorker = () => {
        // First, unregister any existing service workers to force update
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          // Unregister old service workers
          const unregisterPromises = registrations.map((registration) => {
            if (registration.active?.scriptURL?.includes('sw.js')) {
              console.log('[SW] Unregistering old service worker:', registration.scope);
              return registration.unregister();
            }
            return Promise.resolve();
          });

          Promise.all(unregisterPromises)
            .then(() => {
              // In development, only unregister (do not register a new SW)
              if (process.env.NODE_ENV !== 'production') {
                return;
              }

              // Wait a bit before registering new one in production
              return new Promise((resolve) => setTimeout(resolve, 1000))
                .then(() => navigator.serviceWorker.register('/sw.js'))
                .then((registration) => {
                  console.log('[SW] Service Worker registered:', registration.scope);

                  // Check for updates periodically (defer initial check)
                  setTimeout(() => {
                    setInterval(() => {
                      registration.update();
                    }, 60000); // Check every minute
                  }, 5000); // Start checking after 5 seconds
                });
            })
            .catch((error) => {
              console.error('[SW] Service Worker registration failed:', error);
            });
        });
      };

      // Use requestIdleCallback if available (defers until browser is idle)
      // Increased timeout to allow critical rendering to complete first
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(registerServiceWorker, { timeout: 10000 });
      } else {
        // Fallback: wait for page load, then defer
        if (document.readyState === 'complete') {
          setTimeout(registerServiceWorker, 2000);
        } else {
          // window is guaranteed to exist here, use type assertion for TypeScript
          (window as Window).addEventListener('load', () => {
            setTimeout(registerServiceWorker, 2000);
          }, { once: true });
        }
      }

      // Handle service worker updates (this can be immediate as it's event-driven)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, []);

  return null;
}

