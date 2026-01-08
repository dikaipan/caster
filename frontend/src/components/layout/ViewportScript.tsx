'use client';

import { useEffect } from 'react';

export function ViewportScript() {
  useEffect(() => {
    // Critical: Force viewport meta tag (keep immediate - required for layout)
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      document.head.appendChild(meta);
    } else {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }

    // Critical: Force font size (keep immediate - affects layout)
    document.documentElement.style.fontSize = '16px';
    document.body.style.fontSize = '16px';
    document.documentElement.style.zoom = '1';
    document.body.style.zoom = '1';

    // Non-critical: Prevent zoom on double tap (defer to reduce TBT)
    let cleanupTouchHandler: (() => void) | null = null;
    
    const setupTouchHandler = () => {
      let lastTouchEnd = 0;
      const handleTouchEnd = (event: TouchEvent) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      };
      document.addEventListener('touchend', handleTouchEnd, false);
      
      cleanupTouchHandler = () => {
        document.removeEventListener('touchend', handleTouchEnd, false);
      };
    };

    // Defer touch handler setup until browser is idle
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(setupTouchHandler, { timeout: 2000 });
    } else {
      // Fallback: small delay
      setTimeout(setupTouchHandler, 500);
    }

    return () => {
      if (cleanupTouchHandler) {
        cleanupTouchHandler();
      }
    };
  }, []);

  return null;
}

