# 🔧 Service Worker Cache Error Fix

## Error

```
Uncaught (in promise) TypeError: Failed to execute 'addAll' on 'Cache': Request failed
```

## Cause

Service worker mencoba cache `/offline` menggunakan `cache.addAll()`, tetapi:
- Path mungkin tidak valid saat service worker install
- `cache.addAll()` gagal jika salah satu resource gagal di-fetch
- Error tidak ditangani dengan baik

## Solution Applied

### 1. ✅ Removed `/offline` from PRECACHE_ASSETS

**Before**:
```javascript
const PRECACHE_ASSETS = [
  '/',
  '/offline', // This was causing the error
];
```

**After**:
```javascript
const PRECACHE_ASSETS = [
  '/', // Main page only
  // /offline.html will be cached on-demand when needed
];
```

### 2. ✅ Improved Error Handling

**Changed from `cache.addAll()` to `Promise.allSettled()`**:
- `cache.addAll()` fails completely if any resource fails
- `Promise.allSettled()` continues even if some resources fail
- Individual error handling for each resource

**Implementation**:
```javascript
return Promise.allSettled(
  PRECACHE_ASSETS.map((url) => {
    return fetch(url)
      .then((response) => {
        if (response.ok) {
          return cache.put(url, response);
        } else {
          console.warn(`[SW] Failed to cache ${url}: ${response.status}`);
          return Promise.resolve(); // Continue even if one fails
        }
      })
      .catch((error) => {
        console.warn(`[SW] Failed to fetch ${url}:`, error);
        return Promise.resolve(); // Continue even if one fails
      });
  })
);
```

### 3. ✅ Fixed Offline Page Reference

**Before**:
```javascript
return caches.match('/offline');
```

**After**:
```javascript
return caches.match('/offline.html').catch(() => {
  // Fallback if offline page not available
  return new Response('You are offline...', {
    status: 503,
    headers: { 'Content-Type': 'text/html' }
  });
});
```

## Files Modified

- `frontend/public/sw.js`:
  - Removed `/offline` from PRECACHE_ASSETS
  - Changed from `cache.addAll()` to `Promise.allSettled()` with individual error handling
  - Updated offline page path to `/offline.html`
  - Added fallback error response

## Testing

1. **Clear Service Worker**:
   - Open DevTools → Application → Service Workers
   - Click "Unregister" for existing service worker
   - Clear Cache Storage

2. **Reload Page**:
   - Service worker should install without errors
   - Check console for `[SW] Precaching completed` message

3. **Verify Offline Mode**:
   - Go to DevTools → Network
   - Set to "Offline"
   - Refresh page
   - Should see offline.html page

## Expected Behavior

✅ Service worker installs without errors
✅ Resources are cached individually with error handling
✅ Offline page is served when network is unavailable
✅ No console errors related to cache.addAll

---

**Last Updated**: 13 Desember 2025

