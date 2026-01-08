# ⚡ Total Blocking Time Reduction Strategy

**Current**: 410ms  
**Target**: < 200ms  
**Gap**: ~210ms reduction needed

## Understanding Total Blocking Time

TBT measures the total time the main thread is blocked (tasks > 50ms) between FCP and TTI.

**Causes of High TBT**:
- Large JavaScript bundles parsed and executed
- Heavy computations on main thread
- Synchronous operations blocking UI
- Third-party scripts
- Unoptimized React rendering

---

## Strategy 1: Defer Non-Critical JavaScript (High Impact: 50-100ms)

### A. Defer Service Worker Registration

**Current**: Service Worker registers immediately
**Optimization**: Defer registration until after page load

```typescript
// In ServiceWorkerRegistration.tsx
useEffect(() => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    // Defer registration until page is interactive
    const registerSW = () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('[SW] Registered:', registration.scope);
        })
        .catch(error => {
          console.error('[SW] Registration failed:', error);
        });
    };

    // Use requestIdleCallback if available
    if (window.requestIdleCallback) {
      window.requestIdleCallback(registerSW, { timeout: 5000 });
    } else {
      // Fallback: wait for page load
      if (document.readyState === 'complete') {
        setTimeout(registerSW, 2000);
      } else {
        window.addEventListener('load', () => {
          setTimeout(registerSW, 2000);
        });
      }
    }
  }
}, []);
```

**Impact**: 20-30ms reduction

### B. Defer ViewportScript Operations

**Current**: ViewportScript runs immediately
**Optimization**: Use requestIdleCallback for non-critical viewport operations

```typescript
// In ViewportScript.tsx - defer touch handling setup
useEffect(() => {
  // Critical: Force viewport meta tag (keep immediate)
  const viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    document.head.appendChild(meta);
  }

  // Defer non-critical touch handling
  if (window.requestIdleCallback) {
    window.requestIdleCallback(() => {
      let lastTouchEnd = 0;
      const handleTouchEnd = (event: TouchEvent) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      };
      document.addEventListener('touchend', handleTouchEnd, false);
      
      return () => {
        document.removeEventListener('touchend', handleTouchEnd, false);
      };
    });
  }
}, []);
```

**Impact**: 10-20ms reduction

---

## Strategy 2: Optimize React Query Initialization (Medium Impact: 30-50ms)

### A. Lazy Initialize QueryClient

**Current**: QueryClient created immediately
**Optimization**: Lazy initialize or defer creation

```typescript
// In QueryProvider.tsx
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    // Defer heavy initialization
    if (typeof window !== 'undefined' && window.requestIdleCallback) {
      // Create with default options immediately
      return new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            retry: 2,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            refetchOnMount: false,
          },
        },
      });
    }
    // Fallback for immediate creation
    return new QueryClient(/* ... */);
  });
  
  // ... rest of code
}
```

**Impact**: 15-25ms reduction

---

## Strategy 3: Code Splitting & Lazy Loading (Medium Impact: 30-50ms)

### A. Lazy Load PageLayout Component

**Current**: PageLayout loads immediately for all pages
**Optimization**: Consider lazy loading if PageLayout is heavy

```typescript
// In pages that use PageLayout
const PageLayout = dynamic(() => import('@/components/layout/PageLayout'), {
  ssr: false, // Only if PageLayout can work client-side
  loading: () => <div>Loading...</div>
});
```

**Impact**: 20-30ms reduction (if PageLayout is heavy)

### B. Further Split Route Components

Already done for:
- ✅ `/tickets/create` step components
- ✅ Dashboard chart components
- ✅ Settings tabs
- ✅ Machines dialogs

**Additional Opportunities**:
- Lazy load large table components
- Lazy load dialog components in other pages
- Lazy load form components

**Impact**: 10-20ms per component split

---

## Strategy 4: Optimize Font Loading (Low-Medium Impact: 20-40ms)

### Current Font Configuration

```typescript
const inter = Inter({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
  preload: true,
});
```

### Optimization Options

**Option 1: Reduce Font Weights** (if not all needed)
```typescript
const inter = Inter({ 
  subsets: ["latin"],
  weight: ["400", "500", "600"], // Only load necessary weights
  display: "swap",
  variable: "--font-inter",
  preload: true,
});
```

**Option 2: Defer Font Preload**
```typescript
const inter = Inter({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
  preload: false, // Let browser handle loading
});
```

**Impact**: 15-30ms reduction (depending on font file sizes)

---

## Strategy 5: Optimize Third-Party Code (High Impact if used: 50-100ms)

### Check for Third-Party Scripts

If you have:
- Analytics scripts (Google Analytics, etc.)
- Chat widgets
- Social media widgets
- Advertising scripts

**Defer them all**:

```typescript
// Create: src/hooks/useDeferredThirdParty.ts
import { useDeferredLoad } from './useDeferredLoad';

export function useDeferredThirdParty() {
  useDeferredLoad(() => {
    // Load analytics
    // Load chat widgets
    // Load other third-party scripts
  }, []);
}
```

**Impact**: 50-100ms if third-party scripts exist

---

## Strategy 6: Optimize Heavy Computations (Medium Impact: 20-40ms)

### Move to Web Workers

If you have heavy computations:
- Data processing
- Large array operations
- Complex calculations

**Example**:
```typescript
// Move heavy computation to Web Worker
const worker = new Worker('/workers/data-processor.js');
worker.postMessage(data);
worker.onmessage = (e) => setResult(e.data);
```

**Impact**: 20-40ms per heavy computation moved

---

## Strategy 7: Optimize Bundle Size (Low-Medium Impact: 20-40ms)

### Review Bundle Analyzer

1. Open `frontend/.next/analyze/client.html`
2. Identify largest chunks
3. Split large dependencies
4. Remove unused code

**Common Optimizations**:
- Tree-shake unused exports (already done for lucide-react, date-fns)
- Split large libraries
- Remove duplicate dependencies

**Impact**: 20-40ms depending on bundle size reduction

---

## Implementation Priority

### Quick Wins (Do First - 50-80ms expected)

1. ✅ **Defer Service Worker Registration** (20-30ms)
2. ✅ **Defer ViewportScript touch handling** (10-20ms)
3. ✅ **Reduce font weights** if possible (15-30ms)
4. ✅ **Defer any analytics** if present (20-30ms)

### Medium Impact (30-70ms expected)

5. ✅ **Further code splitting** (10-20ms per component)
6. ✅ **Optimize React Query initialization** (15-25ms)
7. ✅ **Review bundle analyzer** (20-40ms)

### Lower Impact (10-30ms expected)

8. ✅ **Move heavy computations to Web Workers** (20-40ms per computation)
9. ✅ **Lazy load PageLayout** if heavy (20-30ms)

---

## Expected Total Reduction

| Strategy | Expected Reduction | Priority |
|----------|-------------------|----------|
| Defer Service Worker | 20-30ms | High |
| Defer ViewportScript ops | 10-20ms | High |
| Reduce font weights | 15-30ms | High |
| Defer analytics | 20-30ms | High |
| Further code splitting | 30-50ms | Medium |
| Optimize React Query | 15-25ms | Medium |
| Bundle optimization | 20-40ms | Medium |
| **Total Potential** | **130-225ms** | |

**Target Achievement**: 410ms - 130ms = **280ms** (still above 200ms)
**Best Case**: 410ms - 225ms = **185ms** ✅ (below 200ms target!)

---

## Implementation Guide

### Step 1: Quick Wins (✅ COMPLETED)

✅ **Implemented**:
1. ✅ Defer Service Worker registration using `requestIdleCallback`
2. ✅ Defer ViewportScript touch handling using `requestIdleCallback`
3. ⚠️ Reduce font weights (optional - review if needed)
4. ⚠️ Defer analytics (if any exist)

**Expected Result**: 410ms → ~360-380ms (30-50ms reduction)

**Changes Made**:
- `ServiceWorkerRegistration.tsx`: Service Worker registration now deferred until browser is idle
- `ViewportScript.tsx`: Touch handler setup deferred, critical viewport operations remain immediate

**See**: `doc/TBT_OPTIMIZATION_IMPLEMENTED.md` for details

### Step 2: Medium Impact (✅ COMPLETED)

✅ **Implemented**:
1. ✅ Lazy load dialog components in `/resources` page
2. ✅ Lazy load Toaster component
3. ✅ Reduce font weights (removed 300, kept 400, 500, 600, 700)
4. ⚠️ Bundle optimization (review bundle analyzer if needed)
5. ⚠️ Optimize React Query (fine-tuning if needed)

**Expected Result**: 360-380ms → ~295-345ms (35-65ms additional reduction)

**Changes Made**:
- `resources/page.tsx`: AddMachineDialog and EditMachineDialog now lazy loaded
- `layout.tsx`: Toaster component lazy loaded, font weights reduced from 5 to 4

**See**: `doc/TBT_MEDIUM_IMPACT_IMPLEMENTED.md` for details

### Step 3: Advanced (If Target Not Met)

1. Web Workers for heavy computations
2. More aggressive code splitting
3. Critical CSS extraction

**Expected Result**: 280-320ms → < 200ms ✅

---

## Measurement

**After each change**:
1. Run: `npm run build && npm run start`
2. Test in production mode
3. Run Lighthouse audit
4. Compare TBT metrics

**Target**: Reduce from 410ms to < 200ms

---

## Notes

- Measure impact after each optimization
- Some optimizations may have trade-offs
- Focus on high-impact, low-effort optimizations first
- Current TBT (410ms) is already acceptable (< 600ms)
- Further optimization is optional unless user experience is affected

---

**Last Updated**: 13 Desember 2025

