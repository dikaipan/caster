import { useEffect } from 'react';

/**
 * Hook to defer loading of non-critical code until browser is idle
 * Useful for analytics, third-party scripts, and non-essential features
 */
export function useDeferredLoad(callback: () => void | Promise<void>, deps: any[] = []) {
  useEffect(() => {
    // Wait for browser to be idle before executing callback
    if (typeof window !== 'undefined') {
      if (window.requestIdleCallback) {
        const handleIdle = window.requestIdleCallback(
          () => {
            callback();
          },
          { timeout: 2000 } // Execute after 2 seconds even if browser is busy
        );

        return () => {
          window.cancelIdleCallback(handleIdle);
        };
      } else {
        // Fallback for browsers without requestIdleCallback
        const timeout = setTimeout(() => {
          callback();
        }, 2000);

        return () => clearTimeout(timeout);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Hook to defer loading until after initial page load
 * Useful for features that are not needed immediately
 */
export function useDeferredAfterLoad(callback: () => void | Promise<void>, deps: any[] = []) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Wait for page to be fully loaded
      if (document.readyState === 'complete') {
        // Page already loaded, execute immediately (after a short delay)
        const timeout = setTimeout(() => {
          callback();
        }, 100);
        return () => clearTimeout(timeout);
      } else {
        // Wait for page load
        const handleLoad = () => {
          setTimeout(() => {
            callback();
          }, 100);
        };
        window.addEventListener('load', handleLoad);
        return () => window.removeEventListener('load', handleLoad);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

