# ⚠️ TBT Regression Analysis

**Date**: 13 Desember 2025  
**Issue**: TBT increased dramatically from 400ms to 1,180ms  
**Status**: ⚠️ CRITICAL - Needs immediate attention

---

## Problem Summary

| Metric | Previous | Current | Change | Status |
|--------|----------|---------|--------|--------|
| **TBT** | 400ms | **1,180ms** | **+780ms** | ❌ CRITICAL |
| **LCP** | 2.9s | 3.3s | +0.4s | ⚠️ Worse |
| **CLS** | 0 | 0.105 | +0.105 | ❌ Above threshold |
| **FCP** | 0.4s | 0.4s | No change | ✅ OK |
| **Speed Index** | ~0.9s | 1.7s | +0.8s | ⚠️ Worse |

---

## Possible Causes

### 1. ❌ LazyNotificationService Issues
- **Risk**: If `requestIdleCallback` is not working correctly
- **Impact**: Could cause blocking if not properly deferred
- **Check**: Verify `requestIdleCallback` fallback logic

### 2. ❌ QueryClient Singleton Pattern
- **Risk**: If singleton pattern is causing initialization issues
- **Impact**: Could block main thread during QueryClient creation
- **Check**: Verify QueryClient initialization

### 3. ❌ Multiple requestIdleCallback Calls
- **Risk**: Too many deferred operations competing
- **Impact**: Could cause unexpected blocking behavior
- **Check**: Review all `requestIdleCallback` usage

### 4. ❌ CLS Regression (0.105)
- **Risk**: Layout shifts causing reflows
- **Impact**: Indicates layout instability
- **Check**: Identify what's causing layout shifts

### 5. ❌ Build/Deployment Issues
- **Risk**: Wrong build configuration
- **Impact**: Could include debug code or unoptimized bundles
- **Check**: Verify production build

---

## Immediate Actions

### Step 1: Verify Production Build
```bash
npm run build
# Check if build is successful
# Verify no errors or warnings
```

### Step 2: Test Individual Optimizations
- Disable LazyNotificationService temporarily
- Revert to original QueryProvider
- Test each optimization individually

### Step 3: Check Browser Console
- Look for JavaScript errors
- Check for infinite loops
- Verify no blocking operations

### Step 4: Profile with DevTools
- Use Performance tab to identify blocking tasks
- Find what's causing the 1,180ms TBT
- Identify layout shift causes

---

## Recommended Fixes

### Option 1: Revert Recent Optimizations (Safest)

Temporarily revert to previous working state:
1. Revert LazyNotificationService
2. Revert QueryProvider singleton
3. Revert increased timeouts

### Option 2: Fix Individual Issues

If specific issues found:
1. Fix LazyNotificationService defer logic
2. Fix QueryProvider initialization
3. Fix CLS causes

### Option 3: More Conservative Approach

Use less aggressive deferring:
1. Reduce timeout values
2. Use simpler deferring logic
3. Avoid multiple requestIdleCallback calls

---

## Investigation Checklist

- [ ] Check browser console for errors
- [ ] Verify production build configuration
- [ ] Test with Performance profiler
- [ ] Check for infinite loops in useEffect
- [ ] Verify requestIdleCallback support
- [ ] Check for layout shift causes
- [ ] Compare bundle sizes
- [ ] Review recent code changes

---

**Status**: Investigation needed
**Priority**: CRITICAL
**Next Step**: Identify root cause before applying fixes

