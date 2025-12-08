'use client';

import { useEffect } from 'react';

export function ViewportScript() {
  useEffect(() => {
    // Force viewport meta tag
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      document.head.appendChild(meta);
    } else {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }

    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    const handleTouchEnd = (event: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    };
    document.addEventListener('touchend', handleTouchEnd, false);

    // Force font size
    document.documentElement.style.fontSize = '16px';
    document.body.style.fontSize = '16px';
    document.documentElement.style.zoom = '1';
    document.body.style.zoom = '1';

    return () => {
      document.removeEventListener('touchend', handleTouchEnd, false);
    };
  }, []);

  return null;
}

