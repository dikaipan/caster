# 🔧 Development Server 404 Fix

## Issue

Getting 404 errors for Next.js static chunks:
- `main-app.js` 404
- `app-pages-internals.js` 404  
- `app/machines/page.js` 404
- Port mismatch: accessing port 3001 but files expected on 3000

## Solution

### Step 1: Stop All Node Processes

```powershell
# Kill all node processes
Get-Process node | Stop-Process -Force
```

### Step 2: Clear Next.js Cache

```powershell
cd frontend
Remove-Item -Recurse -Force .next
```

### Step 3: Clear npm/node Cache (Optional)

```powershell
npm cache clean --force
```

### Step 4: Restart Dev Server

```powershell
npm run dev
```

The dev server should start on port 3000 by default. Access the app at `http://localhost:3000`

## Port Configuration

If you need to run on port 3001, create `.env.local`:

```env
PORT=3001
```

Or modify `package.json`:

```json
"dev": "next dev -p 3001"
```

## Common Causes

1. **Build Cache Issues**: `.next` folder has stale/incorrect build files
2. **Port Mismatch**: Accessing wrong port (3001 vs 3000)
3. **Server Not Running**: Dev server crashed or wasn't started
4. **Concurrent Builds**: Multiple builds running simultaneously

## Verification

After restarting:
1. Check console: Should see "Ready on http://localhost:3000"
2. Check browser console: Should not see 404 errors
3. Verify chunks load: Network tab should show successful 200 responses

---

**Last Updated**: 13 Desember 2025

