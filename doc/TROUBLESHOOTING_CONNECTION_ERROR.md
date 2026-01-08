# 🔧 Troubleshooting: ERR_CONNECTION_REFUSED

**Error**: `ERR_CONNECTION_REFUSED` atau `net::ERR_CONNECTION_REFUSED`

**Penyebab**: Backend server tidak berjalan atau tidak dapat diakses.

---

## ✅ Solusi Cepat

### **Step 1: Start Backend Server**

```bash
# Buka terminal baru
cd backend
npm run start:dev
```

**Expected Output**:
```
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [InstanceLoader] AppModule dependencies initialized
[Nest] LOG [NestApplication] Nest application successfully started
Application is running on: http://localhost:3000
```

### **Step 2: Verifikasi Backend Running**

1. **Check di Browser**: Buka `http://localhost:3000/api` (Swagger UI)
2. **Check di Terminal**: Lihat log `Application is running on: http://localhost:3000`
3. **Check Port**: `netstat -ano | findstr :3000` (Windows) atau `lsof -i :3000` (Mac/Linux)

### **Step 3: Refresh Frontend**

Setelah backend running, refresh browser frontend. Error akan hilang dan polling akan otomatis resume.

---

## 🔍 Verifikasi

### **1. Cek Port 3000**

**Windows (PowerShell)**:
```powershell
Test-NetConnection -ComputerName localhost -Port 3000
```

**Mac/Linux**:
```bash
nc -zv localhost 3000
```

**Expected**: Connection successful

### **2. Cek Backend Health**

```bash
# Via curl
curl http://localhost:3000/api

# Via browser
http://localhost:3000/api
```

**Expected**: Swagger UI atau JSON response

### **3. Cek Frontend Console**

Setelah backend running, console akan menunjukkan:
- ✅ Polling berhasil (tidak ada error)
- ✅ API requests berhasil (status 200)

---

## 🛠️ Troubleshooting Lanjutan

### **Problem 1: Port 3000 sudah digunakan**

**Solusi**:
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (ganti PID dengan process ID dari output di atas)
taskkill /PID <PID> /F

# Atau ubah port di backend/src/main.ts
```

**Ubah port** (`backend/src/main.ts`):
```typescript
await app.listen(3001); // Ubah ke port lain
```

**Update frontend** (`.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### **Problem 2: Backend crash saat start**

**Solusi**:
```bash
cd backend

# 1. Check database connection
npx prisma db pull

# 2. Regenerate Prisma client
npx prisma generate

# 3. Check dependencies
npm install

# 4. Start lagi
npm run start:dev
```

### **Problem 3: Database connection error**

**Solusi**:
1. **Cek MySQL running**:
   ```bash
   # Windows (XAMPP)
   # Buka XAMPP Control Panel, pastikan MySQL hijau (running)
   
   # Windows (Service)
   Get-Service -Name "*mysql*"
   Start-Service MySQL80
   ```

2. **Cek DATABASE_URL** (`backend/.env`):
   ```env
   DATABASE_URL="mysql://root@localhost:3306/caster"
   ```

3. **Test connection**:
   ```bash
   mysql -u root -h localhost -P 3306
   ```

### **Problem 4: Frontend masih error setelah backend running**

**Solusi**:
1. **Hard refresh browser**: `Ctrl+Shift+R` (Windows) atau `Cmd+Shift+R` (Mac)
2. **Clear browser cache**
3. **Check API URL** (`frontend/.env.local`):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```
4. **Restart frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

---

## 📝 Error Handling yang Sudah Diperbaiki

Setelah update terbaru, polling mechanism akan:

✅ **Stop polling** ketika backend tidak tersedia (tidak spam error)
✅ **Auto-resume** setelah backend kembali online
✅ **Retry** setiap 30 detik untuk check connection
✅ **Log warning** (bukan error spam) ketika backend down

---

## 🎯 Quick Reference

| Command | Description |
|---------|-------------|
| `cd backend && npm run start:dev` | Start backend server |
| `cd frontend && npm run dev` | Start frontend server |
| `npm run build` | Build production |
| `npx prisma generate` | Generate Prisma client |
| `npx prisma migrate dev` | Run database migrations |

---

## 📞 Masih Error?

Jika masih ada masalah:

1. **Check logs**:
   - Backend: Terminal yang menjalankan `npm run start:dev`
   - Frontend: Browser console (F12)

2. **Check environment**:
   - `.env` files (backend & frontend)
   - Database connection
   - Port availability

3. **Check dependencies**:
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend
   cd frontend && npm install
   ```

4. **Restart everything**:
   - Stop all processes (Ctrl+C)
   - Start backend first
   - Then start frontend

---

**Status**: ✅ Error handling sudah diperbaiki - polling akan auto-resume ketika backend kembali online.

