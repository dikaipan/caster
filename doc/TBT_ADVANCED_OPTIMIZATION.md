# ⚡ TBT Advanced Optimization - Fix & Improve

**Date**: 13 Desember 2025  
**Issue**: TBT increased to 490ms (from 410ms)  
**Root Cause**: Lazy loading Toaster with dynamic import added overhead  
**Solution**: Implement smarter deferring and optimize QueryClient initialization

---

## Problems Identified

### 1. ❌ Lazy Loading Toaster Added Overhead

**Issue**: Using `dynamic()` import for Toaster in layout.tsx actually increased TBT because:
- Dynamic imports have overhead
- Toaster is small component
- The import overhead > benefit of deferring

**Solution**: Create custom `LazyToaster` component that defers rendering (not loading) using `requestIdleCallback`

---

## Implemented Advanced Optimizations

### 1. ✅ Smart Toaster Deferring

**File**: `frontend/src/components/pwa/LazyToaster.tsx` (NEW)

**Strategy**: 
- Don't lazy load the component (avoid import overhead)
- Instead, defer rendering using `requestIdleCallback`
- Component exists but doesn't render until browser is idle

**Code**:
```typescript
export default function LazyToaster() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        setShouldLoad(true);
      }, { timeout: 100 });
    } else {
      setTimeout(() => setShouldLoad(true), 100);
    }
  }, []);

  if (!shouldLoad) return null;
  return <ToasterComponent />;
}
```

**Impact**: 
- Expected: 20-30ms TBT reduction
- Avoids dynamic import overhead
- Toaster still loads quickly when needed

---

### 2. ✅ QueryClient Singleton Pattern

**File**: `frontend/src/providers/QueryProvider.tsx`

**Problem**: 
- QueryClient was created on every render (even though useState prevents recreation)
- Heavy object initialization during render

**Solution**: 
- Use singleton pattern for browser QueryClient
- Create once, reuse forever
- Reduces initialization overhead

**Code Changes**:
```typescript
// Before: Created in useState
const [queryClient] = useState(() => new QueryClient({...}));

// After: Singleton pattern
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();
    }
    return browserQueryClient;
  }
}
```

**Impact**:
- Expected: 15-25ms TBT reduction
- Eliminates QueryClient creation overhead
- Faster initial render

---

## Additional Optimizations Applied

### 3. ✅ Reverted Ineffective Dynamic Import

**File**: `frontend/src/app/layout.tsx`

**Change**: 
- Removed `dynamic()` import for Toaster
- Using `LazyToaster` component instead
- Reduces import overhead

---

## Expected Total Impact

| Optimization | Expected Reduction |
|--------------|-------------------|
| Smart Toaster deferring | 20-30ms |
| QueryClient singleton | 15-25ms |
| Revert dynamic import overhead | 10-20ms |
| **Total Expected** | **45-75ms** |

**Projected TBT**: 490ms → **415-445ms** (back to acceptable range)

**Note**: This should at least revert the regression and potentially improve further.

---

## Files Modified

1. ✅ `frontend/src/components/pwa/LazyToaster.tsx` (NEW)
2. ✅ `frontend/src/app/layout.tsx` - Use LazyToaster instead of dynamic import
3. ✅ `frontend/src/providers/QueryProvider.tsx` - Singleton pattern for QueryClient

---

## Testing Instructions

### 1. Build and Test

```bash
cd frontend
npm run build
npm run start
```

### 2. Run Lighthouse Audit

1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Select "Performance"
4. Run audit
5. Check TBT metric

### 3. Expected Results

- **TBT should decrease** from 490ms
- Target: < 450ms (acceptable range)
- Ideal: < 400ms

---

## Key Learnings

1. **Not all lazy loading is beneficial**
   - Small components: Defer rendering, not loading
   - Large components: Defer loading (dynamic import)

2. **Singleton pattern for heavy objects**
   - QueryClient should be created once
   - Reuse across renders

3. **requestIdleCallback > setTimeout**
   - Better for deferring non-critical work
   - Doesn't block main thread

---

## Next Steps (If Still High)

If TBT is still above target after these fixes:

### Further Advanced Optimizations

1. **Code Splitting Routes** (30-50ms potential)
   - Lazy load entire route components
   - Use React.lazy() for routes

2. **Critical CSS Extraction** (20-40ms potential)
   - Extract critical CSS inline
   - Defer non-critical CSS

3. **Reduce JavaScript Bundle Size** (20-40ms potential)
   - Review bundle analyzer
   - Remove unused dependencies
   - Tree-shake more aggressively

4. **Optimize React Rendering** (15-30ms potential)
   - Use React.memo() for heavy components
   - Reduce unnecessary re-renders

5. **Web Workers for Heavy Operations** (20-40ms per operation)
   - Move data processing to workers
   - Keep main thread free

---

## Status

✅ **Advanced optimizations implemented**  
✅ **Regression fix applied**  
⚠️ **Awaiting measurement**  

---

**Last Updated**: 13 Desember 2025

