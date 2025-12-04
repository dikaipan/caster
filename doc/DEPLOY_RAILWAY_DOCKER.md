# 🐳 Deploy ke Railway Menggunakan Docker

Panduan lengkap untuk deploy backend ke Railway menggunakan Dockerfile.

---

## 📋 Prerequisites

- ✅ Akun Railway (https://railway.app)
- ✅ Repository di GitHub
- ✅ Dockerfile sudah ada di `backend/Dockerfile` ✅
- ✅ .dockerignore sudah ada ✅

---

## 🚀 Step-by-Step: Deploy dengan Docker

### Step 1: Sign up & Create Project

1. Kunjungi: https://railway.app
2. Login dengan GitHub
3. Klik **"New Project"**
4. Pilih **"Deploy from GitHub repo"**
5. Pilih repository `dikaipan/casper`

### Step 2: Setup Backend Service dengan Docker

1. **Set Root Directory:**
   - Klik service yang baru dibuat
   - Go to **Settings** → **Root Directory**
   - Klik **"Edit"**
   - Ketik: `backend`
   - Klik **"Save"**

2. **Enable Docker Build:**
   - Go to **Settings** → **Build**
   - Pilih **"Dockerfile"** sebagai build method
   - Pastikan Dockerfile path: `Dockerfile` (karena root directory sudah `backend`)
   - Save

3. **Verify Dockerfile:**
   - Railway akan otomatis detect Dockerfile di folder `backend/`
   - Pastikan Dockerfile menggunakan production stage:
     ```dockerfile
     FROM node:18-alpine AS production
     ```

### Step 3: Setup MySQL Database

1. Di Railway Dashboard (project yang sama), klik **"New"**
2. Pilih **"Database"** → **"MySQL"**
3. Tunggu database siap (~1-2 menit)
4. Klik database → tab **"Connect"**
5. Copy **"MySQL Connection URL"**
   - Format: `mysql://root:password@host:3306/database`
   - **Simpan URL ini!**

### Step 4: Setup Environment Variables

1. Railway Dashboard → Service Backend → **"Variables"** tab
2. Klik **"New Variable"** untuk setiap variable:

```env
# Database (dari Step 3)
DATABASE_URL=mysql://root:password@host:3306/database

# JWT Secrets (GENERATE RANDOM!)
JWT_SECRET=<generate-random-32-char-string>
JWT_REFRESH_SECRET=<generate-random-32-char-string>
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Server
NODE_ENV=production
PORT=3000

# CORS (update setelah frontend deploy)
CORS_ORIGIN=https://your-app.vercel.app
```

**Generate JWT Secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Jalankan 2 kali
```

### Step 5: Deploy dengan Docker

1. **Railway akan otomatis build** setelah:
   - Root Directory di-set
   - Dockerfile enabled
   - Environment variables di-set

2. **Monitor Build:**
   - Railway Dashboard → Service → **"Deployments"** tab
   - Klik deployment terbaru
   - Klik **"View Logs"** untuk melihat build progress
   - Build akan menggunakan Dockerfile production stage

3. **Build Process:**
   ```
   Building Docker image...
   → Using Dockerfile: backend/Dockerfile
   → Target: production
   → Installing dependencies...
   → Generating Prisma Client...
   → Building application...
   → Removing devDependencies...
   → Starting application...
   ```

4. **Jika Build Berhasil:**
   - Status: **"Active"** (hijau)
   - Railway memberikan URL: `https://your-backend.railway.app`
   - **Copy URL ini!**

### Step 6: Run Database Migrations

Setelah backend deploy berhasil, run Prisma migrations:

#### Opsi A: Railway CLI (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link ke project
railway link
# Pilih project dan service backend

# Generate Prisma Client
railway run npm run prisma:generate

# Run migrations
railway run npm run prisma:migrate deploy

# Seed database (opsional)
railway run npm run prisma:seed
```

#### Opsi B: Railway Shell

1. Railway Dashboard → Service Backend
2. Klik **"Shell"** tab
3. Run commands:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate deploy
   npm run prisma:seed  # opsional
   ```

### Step 7: Verify Deployment

1. **Test Health Endpoint:**
   ```bash
   curl https://your-backend.railway.app/api/health
   # Should return: {"status":"ok",...}
   ```

2. **Test Version Endpoint:**
   ```bash
   curl https://your-backend.railway.app/api/version
   # Should return: {"version":"1.0.0","environment":"production",...}
   ```

3. **Check Logs:**
   - Railway Dashboard → Deployments → View Logs
   - Should show: `Application is running on: http://0.0.0.0:3000`

### Step 8: Update Frontend

1. **Vercel Dashboard** → Project → Settings → Environment Variables
2. Update:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ```
   **PENTING**: Tanpa `/api` di akhir!

3. **Redeploy Frontend:**
   - Deployments → "..." → Redeploy
   - Uncheck "Use existing Build Cache"

### Step 9: Update CORS

1. Railway Dashboard → Backend → Variables
2. Update `CORS_ORIGIN`:
   ```
   CORS_ORIGIN=https://your-app.vercel.app
   ```
3. Railway akan otomatis redeploy

---

## 🔍 Verifikasi Docker Build

### Check Dockerfile Configuration:

Dockerfile Anda sudah menggunakan production stage dengan:
- ✅ `FROM node:18-alpine AS production`
- ✅ `ENV NODE_ENV=production`
- ✅ Non-root user (`nestjs`)
- ✅ Health check
- ✅ Production start command

### Test Build Locally (Optional):

```bash
cd backend

# Build production image
docker build --target production -t hcm-backend:prod .

# Test run
docker run -p 3000:3000 \
  -e DATABASE_URL="mysql://user:pass@host:3306/db" \
  -e JWT_SECRET="test-secret" \
  -e JWT_REFRESH_SECRET="test-refresh-secret" \
  -e NODE_ENV="production" \
  -e PORT="3000" \
  hcm-backend:prod

# Test health
curl http://localhost:3000/api/health
```

---

## 🐛 Troubleshooting Docker Build

### Error: "Cannot find Dockerfile"

**Solusi:**
1. Pastikan Root Directory = `backend`
2. Pastikan Dockerfile ada di `backend/Dockerfile`
3. Check di Railway Dashboard → Settings → Root Directory

### Error: "Build failed" atau "npm ci failed"

**Solusi:**
1. Cek logs di Railway Dashboard → Deployments → View Logs
2. Pastikan `package.json` dan `package-lock.json` ada
3. Pastikan semua dependencies valid
4. Test build lokal dulu: `docker build --target production .`

### Error: "Prisma generate failed"

**Solusi:**
1. Pastikan `prisma/` folder ada di `backend/prisma/`
2. Pastikan `schema.prisma` ada
3. Pastikan `DATABASE_URL` di-set (meskipun untuk generate tidak perlu connection)

### Error: "Build succeeded but app crashes"

**Solusi:**
1. Cek logs untuk error detail
2. Pastikan semua environment variables di-set
3. Pastikan `DATABASE_URL` benar
4. Pastikan Prisma Client generated
5. Pastikan migrations run

### Error: "Health check failed"

**Solusi:**
1. Pastikan endpoint `/api/health` ada (sudah ada ✅)
2. Pastikan app listen di port yang benar
3. Cek logs untuk error
4. Test health endpoint manual: `curl https://your-backend.railway.app/api/health`

---

## 📊 Docker Build Process di Railway

Railway akan menjalankan:

1. **Detect Dockerfile** di `backend/Dockerfile`
2. **Build dengan target production:**
   ```bash
   docker build --target production -t railway-backend .
   ```
3. **Run container:**
   ```bash
   docker run -e DATABASE_URL=... -e JWT_SECRET=... railway-backend
   ```

**Build akan:**
- Install dependencies dengan `npm ci`
- Generate Prisma Client
- Build TypeScript ke JavaScript
- Remove devDependencies
- Start dengan non-root user
- Expose port 3000

---

## ✅ Checklist Deploy dengan Docker

### Pre-Deployment
- [ ] Railway account dibuat
- [ ] GitHub repository connected
- [ ] Root Directory = `backend`
- [ ] Dockerfile enabled di Settings → Build
- [ ] Dockerfile path: `Dockerfile` (karena root = backend)
- [ ] MySQL database dibuat
- [ ] DATABASE_URL di-copy

### Environment Variables
- [ ] `DATABASE_URL` di-set
- [ ] `JWT_SECRET` di-set (random string)
- [ ] `JWT_REFRESH_SECRET` di-set (random string)
- [ ] `JWT_EXPIRATION=15m`
- [ ] `JWT_REFRESH_EXPIRATION=7d`
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `CORS_ORIGIN` (update setelah frontend deploy)

### Docker Build
- [ ] Dockerfile detected oleh Railway
- [ ] Build menggunakan production stage
- [ ] Build berhasil (status: Active)
- [ ] Container running
- [ ] Health check passing

### Database
- [ ] Schema.prisma menggunakan MySQL
- [ ] Prisma Client generated
- [ ] Migrations run
- [ ] Database seeded (opsional)

### Post-Deployment
- [ ] Backend accessible (health check OK)
- [ ] Frontend API URL di-update
- [ ] Frontend di-redeploy
- [ ] CORS_ORIGIN di-update
- [ ] Backend di-redeploy setelah CORS update
- [ ] Testing berhasil

---

## 🎯 Quick Start Commands

```bash
# 1. Setup Railway CLI (untuk migrations)
npm install -g @railway/cli
railway login
railway link

# 2. Run migrations
railway run npm run prisma:generate
railway run npm run prisma:migrate deploy

# 3. Test deployment
curl https://your-backend.railway.app/api/health
```

---

## 💡 Tips Docker di Railway

1. **Always Use Production Stage**: Pastikan Dockerfile menggunakan `--target production`
2. **Root Directory**: Selalu set ke `backend` sebelum enable Dockerfile
3. **Build Cache**: Railway akan cache layers untuk build lebih cepat
4. **Environment Variables**: Set sebelum build pertama kali
5. **Health Check**: Dockerfile sudah include health check ✅
6. **Non-root User**: Dockerfile sudah menggunakan non-root user ✅
7. **.dockerignore**: Sudah ada untuk optimize build ✅

---

## 🔄 Update & Redeploy

### Update Code:

1. **Push ke GitHub:**
   ```bash
   git add .
   git commit -m "Update code"
   git push origin main
   ```

2. **Railway akan otomatis rebuild** dengan Dockerfile

3. **Atau manual redeploy:**
   - Railway Dashboard → Deployments
   - Klik "..." → Redeploy
   - Uncheck "Use existing Build Cache" untuk rebuild fresh

### Update Dockerfile:

1. Edit `backend/Dockerfile`
2. Commit & push
3. Railway akan otomatis rebuild

---

## 📝 Dockerfile yang Digunakan

Railway akan menggunakan Dockerfile di `backend/Dockerfile` dengan:

- **Base Image**: `node:18-alpine`
- **Target**: `production`
- **Build Steps**:
  1. Copy package files
  2. Install dependencies (`npm ci`)
  3. Copy source code
  4. Generate Prisma Client
  5. Build application
  6. Remove devDependencies
  7. Create non-root user
  8. Start application

**Semua sudah dikonfigurasi dengan benar! ✅**

---

## 🚨 Important Notes

1. **Root Directory HARUS `backend`** - Jika tidak, Railway tidak akan menemukan Dockerfile
2. **Dockerfile path** - Karena root = backend, path adalah `Dockerfile` (bukan `backend/Dockerfile`)
3. **Environment Variables** - Set sebelum build pertama kali
4. **Migrations** - Harus di-run manual setelah deploy pertama kali
5. **CORS** - Update setelah frontend deploy

---

## 📚 Resources

- **Railway Docker Docs**: https://docs.railway.app/deploy/dockerfiles
- **Dockerfile Best Practices**: https://docs.docker.com/develop/dev-best-practices/
- **Railway CLI**: https://docs.railway.app/develop/cli

---

## 🎯 Summary

**Dockerfile Anda sudah siap production!** 

Untuk deploy:
1. Set Root Directory = `backend`
2. Enable Dockerfile build
3. Set environment variables
4. Deploy (otomatis)
5. Run migrations
6. Update frontend
7. Done! 🎉

**Selamat deploy dengan Docker! 🐳🚀**

