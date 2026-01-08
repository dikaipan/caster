'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Lazy load NotificationService to reduce initial TBT
const NotificationService = dynamic(() => import('@/components/notifications/NotificationService'), {
  ssr: false,
});

export default function LazyNotificationService() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Defer NotificationService loading until after initial render
    // Notification polling can start after page is interactive
    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          setShouldLoad(true);
        }, { timeout: 2000 });
      } else {
        // Fallback: delay after render
        const timer = setTimeout(() => {
          setShouldLoad(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  if (!shouldLoad) {
    return null;
  }

  return <NotificationService />;
}

