# ⚠️ CRITICAL: TBT Regression Analysis

**Date**: 13 Desember 2025  
**Issue**: TBT increased dramatically from 400ms to 1,180ms  
**Status**: ❌ CRITICAL - Immediate action required

---

## Problem Summary

| Metric | Previous Best | Current | Change | Status |
|--------|--------------|---------|--------|--------|
| **TBT** | 400ms | **1,180ms** | **+780ms** | ❌ CRITICAL |
| **LCP** | 2.9s | 3.3s | +0.4s | ⚠️ Worse |
| **CLS** | 0 | 0.105 | +0.105 | ❌ Above threshold |
| **FCP** | 0.4s | 0.4s | No change | ✅ OK |
| **Speed Index** | ~0.9s | 1.7s | +0.8s | ⚠️ Worse |

---

## Possible Causes

### 1. ⚠️ Development vs Production Mode
**Most Likely**: Test mungkin dilakukan di development mode, bukan production build
- Development mode memiliki overhead yang lebih besar
- Source maps, hot reload, dan debugging tools menambah TBT

**Action**: Test dengan production build (`npm run build && npm run start`)

### 2. ⚠️ requestIdleCallback Timeout Issues
**Risk**: Multiple `requestIdleCallback` dengan timeout besar bisa menyebabkan blocking
- LazyNotificationService: timeout 2000ms
- ServiceWorkerRegistration: timeout 10000ms
- LazyToaster: timeout 500ms

**Impact**: Jika browser tidak idle, semua callbacks akan execute di timeout, causing blocking

### 3. ⚠️ CLS Regression (0.105)
**Issue**: Layout shift di atas threshold (0.1)
- Menunjukkan ada elemen yang menyebabkan layout instability
- Bisa terkait dengan lazy loading atau deferring

### 4. ⚠️ Build Configuration Issues
**Risk**: Build mungkin tidak optimal atau ada masalah konfigurasi

---

## Immediate Actions

### ✅ Step 1: Verify Production Build

```bash
# Clean build
rm -rf .next
npm run build

# Test production server
npm run start

# Then run Lighthouse on production build
```

### ✅ Step 2: Revert to Working Version (Recommended)

Jika ini adalah production issue, revert ke versi yang bekerja (400ms):

1. Revert LazyNotificationService (use original NotificationService)
2. Revert QueryProvider singleton (use useState pattern)
3. Revert increased timeouts (use smaller values)

### ✅ Step 3: Check Browser Console

- Look for JavaScript errors
- Check for infinite loops
- Verify no blocking operations

### ✅ Step 4: Profile with DevTools

- Use Performance tab to identify blocking tasks
- Find what's causing the 1,180ms TBT
- Identify layout shift causes

---

## Recommended Fix Strategy

### Option 1: Revert All Recent Optimizations (Safest)

Temporarily revert to previous working state:
1. ✅ Revert LazyNotificationService → Use NotificationService directly
2. ✅ Revert QueryProvider singleton → Use useState pattern
3. ✅ Reduce timeout values → Use smaller values

### Option 2: Fix Individual Issues

If specific issues found:
1. Fix requestIdleCallback timeout values (reduce them)
2. Fix CLS causes (identify layout shift source)
3. Optimize build configuration

### Option 3: Conservative Approach

Use less aggressive deferring:
1. Remove LazyNotificationService (use direct import)
2. Keep QueryProvider singleton but verify it works
3. Use smaller timeout values (100ms instead of 2000ms)

---

## Quick Fix: Revert Recent Changes

### 1. Revert LazyNotificationService

```typescript
// In PageLayout.tsx, change back to:
import NotificationService from '@/components/notifications/NotificationService';
// ... in JSX:
<NotificationService />
```

### 2. Revert QueryProvider

```typescript
// Use useState pattern instead of singleton
const [queryClient] = useState(() => new QueryClient({...}));
```

### 3. Reduce Timeouts

- ServiceWorkerRegistration: 10000ms → 3000ms
- LazyNotificationService: Remove (use direct import)
- LazyToaster: 500ms → 200ms

---

## Status

⚠️ **CRITICAL REGRESSION DETECTED**  
📋 **Immediate investigation needed**  
🔄 **Revert recommended until root cause found**

---

**Priority**: HIGHEST  
**Next Step**: Verify production build OR revert to working version

