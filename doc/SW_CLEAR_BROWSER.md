# 🔧 Clear Service Worker in Browser - Quick Fix

## Problem

Service worker error persists because browser is using **cached old version**:

```
Failed to execute 'addAll' on 'Cache': Request failed
InvalidStateError: Failed to update a ServiceWorker
```

## Quick Fix: Clear Service Worker

### Step 1: Open DevTools
Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)

### Step 2: Clear Service Worker

1. Go to **Application** tab (or **Storage** in Firefox)
2. Click **Service Workers** in left sidebar
3. Find service worker for `http://localhost:3001`
4. Click **Unregister** button (red button)
5. Wait for it to disappear from list

### Step 3: Clear Cache Storage

1. Still in **Application** tab
2. Click **Cache Storage** in left sidebar
3. You should see caches like `caster-v1`, `caster-runtime-v1`
4. Right-click each cache → **Delete**
5. Or select all and delete

### Step 4: Clear All Site Data (Alternative)

1. In **Application** tab
2. Click **Clear storage** in left sidebar
3. Check all boxes (especially **Cache storage** and **Service workers**)
4. Click **Clear site data** button
5. **Close and reopen DevTools**

### Step 5: Hard Refresh

**Windows/Linux**:
- `Ctrl + Shift + R`
- Or `Ctrl + F5`

**Mac**:
- `Cmd + Shift + R`

## Verification

After clearing:

1. Open Console (F12 → Console tab)
2. Reload page
3. Should see: `[SW] Precaching static assets` (without errors)
4. Should see: `[SW] Service Worker registered: http://localhost:3001/`
5. No errors about `addAll` or `InvalidStateError`

## If Still Not Working

### Method 1: Disable Service Worker Temporarily

Edit `ServiceWorkerRegistration.tsx`:
```typescript
// Temporarily disable
if (false && typeof window !== 'undefined' && ...) {
  // ... registration code
}
```

### Method 2: Use Incognito/Private Window

1. Open **Incognito/Private window** (Ctrl+Shift+N)
2. Navigate to `http://localhost:3001`
3. Service worker will be fresh (no cache)

### Method 3: Clear Browser Data

1. Go to browser settings
2. Privacy → Clear browsing data
3. Select "Cached images and files"
4. Time range: "All time"
5. Clear data

---

## Code Changes

✅ **Cache version updated**: `caster-v1` → `caster-v2`
✅ **Auto-unregister**: Service worker registration now unregisters old ones first
✅ **Error handling**: Improved with Promise.allSettled

---

**After clearing, the new service worker (v2) should install without errors!**

---

**Last Updated**: 13 Desember 2025

