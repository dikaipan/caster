# ⚡ Total Blocking Time (TBT) Optimization Guide

**Current**: 430ms  
**Target**: < 200ms  
**Gap**: ~230ms reduction needed

## Understanding TBT

Total Blocking Time measures the total amount of time that the main thread was blocked during page load, preventing user interaction.

- Tasks > 50ms are considered "blocking"
- TBT = Sum of all blocking time between FCP and TTI
- Lower is better for user experience

## Optimization Strategies

### 1. Code Splitting & Lazy Loading ✅ (Partially Done)

**Already Implemented**:
- Step components lazy loaded
- Chart.js dynamically imported
- PDF library dynamically imported

**Further Optimization**:
```typescript
// Lazy load heavy components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  ssr: false,
  loading: () => <Skeleton />
});

// Lazy load route-specific code
const RouteComponent = dynamic(() => import('./RouteComponent'));
```

**Target Pages to Optimize**:
- `/dashboard` - Already has lazy loading for charts ✅
- `/settings` - Already has lazy loading for tabs ✅
- `/machines` - Could benefit from lazy loading
- `/cassettes` - Could benefit from lazy loading
- `/tickets` - Could benefit from lazy loading

### 2. Defer Non-Critical JavaScript

**Strategy**: Load non-critical code after page is interactive

```typescript
// Defer analytics, third-party scripts
useEffect(() => {
  if (typeof window !== 'undefined' && window.requestIdleCallback) {
    window.requestIdleCallback(() => {
      // Load non-critical code here
      import('./analytics').then(module => module.init());
    });
  }
}, []);
```

**Examples of Non-Critical Code**:
- Analytics scripts
- Third-party widgets
- Non-essential features
- Admin-only features

### 3. Optimize React Components

**Use React.memo for expensive components**:

```typescript
export default React.memo(ExpensiveComponent, (prevProps, nextProps) => {
  // Custom comparison if needed
  return prevProps.id === nextProps.id;
});
```

**Use useMemo and useCallback strategically**:

```typescript
// Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return heavyComputation(data);
}, [data]);

// Memoize callbacks to prevent re-renders
const handleClick = useCallback(() => {
  // handler logic
}, [dependencies]);
```

### 4. Reduce Initial Bundle Size

**Review Bundle Analyzer**:
- Identify largest chunks
- Split large dependencies
- Remove unused code
- Tree-shake unused exports

**Current Large Dependencies**:
- `@radix-ui/*` - Already optimized ✅
- `chart.js` - Lazy loaded ✅
- `@react-pdf/renderer` - Lazy loaded ✅
- `lucide-react` - Already optimized with tree-shaking ✅

### 5. Optimize Third-Party Scripts

**Strategy**: Defer or async load third-party scripts

```typescript
// Instead of synchronous loading
<script src="third-party.js"></script>

// Use async or defer
<script src="third-party.js" async></script>
<script src="third-party.js" defer></script>
```

### 6. Reduce JavaScript Execution Time

**Optimize heavy operations**:
- Move heavy computations to Web Workers
- Use requestIdleCallback for non-urgent tasks
- Debounce/throttle event handlers
- Virtualize long lists

**Example**:
```typescript
// Move heavy computation to Web Worker
const worker = new Worker('/workers/heavy-computation.js');
worker.postMessage(data);
worker.onmessage = (e) => setResult(e.data);
```

### 7. Optimize Font Loading

**Already Optimized** ✅:
- Using `font-display: swap`
- Preloading fonts
- Using next/font/google

**Further Optimization** (if needed):
```typescript
const inter = Inter({ 
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ['system-ui', 'arial'], // Faster fallback
});
```

### 8. Optimize API Calls

**Already Using React Query** ✅:
- Automatic caching
- Request deduplication
- Background refetching

**Further Optimization**:
- Prefetch critical data
- Use Suspense boundaries
- Implement optimistic updates

## Implementation Priority

### High Impact (Do First)

1. **Lazy Load Heavy Route Components**
   - `/machines` page components
   - `/cassettes` table/list components
   - `/tickets` list components

2. **Defer Non-Critical Features**
   - Analytics initialization
   - Third-party scripts
   - Admin-only features

3. **Optimize React Re-renders**
   - Add React.memo to expensive components
   - Use useMemo/useCallback strategically

### Medium Impact

4. **Reduce Bundle Size**
   - Review bundle analyzer
   - Split large chunks further
   - Remove unused dependencies

5. **Optimize Heavy Operations**
   - Move computations to Web Workers
   - Use requestIdleCallback

### Low Impact (Marginal Gains)

6. **Further Font Optimization**
7. **API Call Optimization** (already optimized)

## Expected Impact

| Optimization | Expected TBT Reduction |
|--------------|----------------------|
| Lazy load route components | 100-150ms |
| Defer non-critical JS | 50-100ms |
| Optimize React re-renders | 30-50ms |
| Reduce bundle size | 20-40ms |
| Optimize heavy operations | 10-30ms |
| **Total Potential** | **210-370ms** |

## Measurement

**How to Measure TBT**:
1. Chrome DevTools > Lighthouse
2. Run Performance audit
3. Check "Total Blocking Time" metric
4. Compare before/after optimizations

**Target**: Reduce from 430ms to < 200ms

## Quick Wins Checklist

- [ ] Lazy load `/machines` page components
- [ ] Lazy load `/cassettes` page components  
- [ ] Lazy load `/tickets` list components
- [ ] Defer analytics initialization
- [ ] Add React.memo to expensive table/list components
- [ ] Review and optimize large useEffect hooks
- [ ] Move heavy computations to useMemo
- [ ] Review bundle analyzer for optimization opportunities

## Notes

- TBT optimization should not sacrifice functionality
- Measure impact after each change
- Some optimizations may have trade-offs
- Focus on high-impact, low-effort optimizations first

---

**Last Updated**: 13 Desember 2025

