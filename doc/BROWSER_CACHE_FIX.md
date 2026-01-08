# 🔄 Browser Cache Issue - Fix Guide

**Problem**: UI changes not appearing, old content still showing

**Cause**: Browser cache storing old JavaScript/CSS files

---

## ✅ Solutions

### Option 1: Hard Refresh Browser (Quickest)

**Windows/Linux**:
- `Ctrl + Shift + R` atau
- `Ctrl + F5`

**Mac**:
- `Cmd + Shift + R`

**Chrome DevTools**:
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

---

### Option 2: Clear Browser Cache

**Chrome/Edge**:
1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Select "Cached images and files"
3. Time range: "All time"
4. Click "Clear data"

**Firefox**:
1. Press `Ctrl + Shift + Delete`
2. Select "Cache"
3. Time range: "Everything"
4. Click "Clear Now"

---

### Option 3: Restart Dev Server

1. Stop dev server (Ctrl+C)
2. Clear Next.js cache:
   ```bash
   cd frontend
   rm -rf .next
   ```
   Or on Windows PowerShell:
   ```powershell
   cd frontend
   Remove-Item -Recurse -Force .next
   ```
3. Restart dev server:
   ```bash
   npm run dev
   ```

---

### Option 4: Clear Service Worker (If PWA)

If using PWA with service worker:

1. Open DevTools (F12)
2. Go to Application tab
3. Click "Service Workers"
4. Click "Unregister" for the service worker
5. Go to "Storage" → "Clear site data"
6. Hard refresh (Ctrl+Shift+R)

---

## ✅ Verification

After clearing cache, verify changes:
- Mode Pengelola banner should be removed
- Bank names should show as codes (e.g., "BNI" instead of full name)
- Recycle Box description should not appear in tables

---

**Last Updated**: 13 Desember 2025

