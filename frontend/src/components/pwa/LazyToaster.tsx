'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Lazy load Toaster only after initial render to reduce TBT
const ToasterComponent = dynamic(() => import("@/components/ui/toaster").then(mod => ({ default: mod.Toaster })), {
  ssr: false,
});

export default function LazyToaster() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Defer Toaster loading until after initial render
    // Use requestIdleCallback if available, otherwise use small delay
    // Increased timeout to allow more critical work to complete first
    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          setShouldLoad(true);
        }, { timeout: 500 });
      } else {
        // Fallback: delay after render
        const timer = setTimeout(() => {
          setShouldLoad(true);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  if (!shouldLoad) {
    return null;
  }

  return <ToasterComponent />;
}

