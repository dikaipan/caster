# 🔧 Service Worker Clear Guide - Fix Cached SW

## Problem

Service worker error persists even after code fix because browser is using **cached version**:

```
Failed to execute 'addAll' on 'Cache': Request failed
InvalidStateError: Failed to update a ServiceWorker
```

## Solution: Clear Service Worker Cache

### Method 1: Clear via DevTools (Recommended)

1. **Open Chrome DevTools** (F12)
2. Go to **Application** tab
3. Click **Service Workers** in left sidebar
4. Find your service worker for `http://localhost:3001`
5. Click **Unregister** button
6. Go to **Cache Storage** in left sidebar
7. Delete all caches:
   - Right-click each cache → Delete
   - Or select all and delete
8. **Hard Refresh** the page:
   - Windows: `Ctrl + Shift + R` or `Ctrl + F5`
   - Mac: `Cmd + Shift + R`

### Method 2: Clear via Browser Settings

1. **Chrome**:
   - Go to `chrome://settings/content/all`
   - Search for `localhost:3001`
   - Click → Clear data
   - Or: `chrome://serviceworker-internals/` → Unregister

2. **Edge**:
   - Similar to Chrome
   - `edge://serviceworker-internals/`

### Method 3: Clear All Site Data

1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **Clear storage** in left sidebar
4. Check all boxes
5. Click **Clear site data**
6. Reload page

---

## Verification

After clearing:

1. **Check Console**: Should see `[SW] Precaching static assets` without errors
2. **Check Application → Service Workers**: Should see new service worker with status "activated"
3. **No Errors**: Console should not show `addAll` or `InvalidStateError` errors

---

## Code Changes Applied

✅ **Cache version updated**: `caster-v1` → `caster-v2`
✅ **Error handling improved**: Using `Promise.allSettled()` instead of `cache.addAll()`
✅ **Offline page path fixed**: `/offline` → `/offline.html`

The updated service worker should install cleanly after clearing the old one.

---

## Quick Command to Test

After clearing, check service worker status:

```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => {
    console.log('SW registered:', reg.scope);
    console.log('SW state:', reg.active?.state);
  });
});
```

---

**Last Updated**: 13 Desember 2025

