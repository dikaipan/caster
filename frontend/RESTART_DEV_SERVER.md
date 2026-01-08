# Quick Fix for 404 Errors

If you're getting 404 errors for Next.js chunks, run these commands:

## PowerShell Commands

```powershell
# 1. Stop all node processes
Get-Process node | Stop-Process -Force

# 2. Clear Next.js cache
cd frontend
Remove-Item -Recurse -Force .next

# 3. Restart dev server
npm run dev
```

## Access the App

- Default port: `http://localhost:3000`
- If using port 3001: Make sure dev server is configured for that port

## Note

The `.next` folder contains build artifacts. Clearing it forces Next.js to rebuild everything fresh, which usually fixes 404 issues with chunks.

