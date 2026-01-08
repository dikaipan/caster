# 🔧 Port 3000 Already in Use - Fix Guide

## Error

```
Error: listen EADDRINUSE: address already in use :::3000
```

## Quick Fix

### Option 1: Kill Process Using Port 3000 (Recommended)

**Step 1**: Find process using port 3000
```powershell
netstat -ano | findstr :3000
```

**Step 2**: Kill the process (replace `<PID>` with actual PID from step 1)
```powershell
taskkill /PID <PID> /F
```

**Example**: If PID is 28728
```powershell
taskkill /PID 28728 /F
```

**Step 3**: Verify port is free
```powershell
netstat -ano | findstr :3000
```
(Should return nothing if port is free)

**Step 4**: Start server again
```powershell
npm run start
```

---

### Option 2: Kill All Node Processes

If you're unsure which process to kill:

```powershell
Get-Process node | Stop-Process -Force
```

**Warning**: This will kill ALL Node.js processes, including other applications.

---

### Option 3: Use Different Port

If you can't kill the process or want to keep it running:

**Method 1**: Use environment variable
```powershell
$env:PORT=3001; npm run start
```

**Method 2**: Use command line flag
```powershell
npx next start -p 3001
```

**Method 3**: Modify package.json
```json
{
  "scripts": {
    "start": "next start -p 3001"
  }
}
```

---

## Common Causes

1. **Previous server not properly stopped**
   - Solution: Kill the process (Option 1)

2. **Development server still running**
   - Solution: Stop dev server (`Ctrl+C`) before running `npm run start`

3. **Multiple instances running**
   - Solution: Kill all Node processes (Option 2)

4. **Another application using port 3000**
   - Solution: Use different port (Option 3)

---

## Prevention

Always properly stop servers:
- Development: Press `Ctrl+C` in terminal
- Production: Use proper process manager or kill command

---

**Last Updated**: 13 Desember 2025

