# 🔗 Panduan Koneksi Backend dan Database

Panduan lengkap untuk menghubungkan backend (NestJS) dan database (MySQL/PostgreSQL) dengan frontend (Next.js di Vercel).

---

## 📋 Ringkasan Setup

```
Frontend (Vercel) → Backend (Railway/Render) → Database (MySQL/PostgreSQL)
```

**Alur:**
1. Deploy Database (MySQL/PostgreSQL) di Railway/Render/PlanetScale
2. Deploy Backend ke Railway/Render dengan koneksi ke Database
3. Update Frontend (Vercel) untuk connect ke Backend
4. Konfigurasi CORS di Backend

---

## ⚠️ Catatan Penting

**Railway dan Render mungkin tidak tersedia atau tidak bisa digunakan.** Jika mengalami masalah dengan Railway/Render, gunakan alternatif berikut:

- **Fly.io** - Recommended (tidak sleep, gratis, MySQL support)
- **Koyeb** - Paling mudah (tidak sleep, gratis, MySQL support)
- **Cyclic** - Serverless (tidak sleep, gratis, PostgreSQL only)

Lihat [ALTERNATIF_DEPLOY_BACKEND.md](./ALTERNATIF_DEPLOY_BACKEND.md) untuk panduan lengkap alternatif platform.

---

## 🚀 Opsi 1: Railway (Recommended - Paling Mudah)

**⚠️ Jika Railway tidak bisa digunakan, skip ke Opsi 4 (Fly.io) atau lihat [ALTERNATIF_DEPLOY_BACKEND.md](./ALTERNATIF_DEPLOY_BACKEND.md)**

### Step 1: Setup Railway Account

1. Kunjungi: https://railway.app
2. Sign up dengan GitHub account
3. Klik "New Project"

### Step 2: Deploy MySQL Database

1. Di Railway Dashboard, klik **"New"** → **"Database"** → **"MySQL"**
2. Railway akan otomatis membuat database
3. Tunggu hingga database siap (~1-2 menit)
4. Klik database yang baru dibuat
5. Di tab **"Connect"**, copy **"MySQL Connection URL"**
   - Format: `mysql://user:password@host:3306/database`
   - Contoh: `mysql://root:abc123@containers-us-west-123.railway.app:3306/railway`

### Step 3: Deploy Backend

1. Di Railway Dashboard, klik **"New"** → **"GitHub Repo"**
2. Pilih repository Anda (`dikaipan/casper`)
3. Railway akan auto-detect project
4. **PENTING**: Set **"Root Directory"** ke `backend`
   - Klik service → Settings → Root Directory → ketik: `backend`
5. Railway akan otomatis detect NestJS dan setup build

### Step 4: Setup Environment Variables Backend

Di Railway Dashboard, buka service backend → **"Variables"** tab, tambahkan:

```env
# Database (dari Step 2)
DATABASE_URL=mysql://root:abc123@containers-us-west-123.railway.app:3306/railway

# JWT Secrets (GENERATE RANDOM STRINGS!)
JWT_SECRET=<generate-random-32-char-string>
JWT_REFRESH_SECRET=<generate-random-32-char-string>
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Server
NODE_ENV=production
PORT=3000

# CORS (URL frontend Vercel - akan diupdate setelah deploy frontend)
CORS_ORIGIN=https://your-app.vercel.app
```

**Generate JWT Secrets:**
```bash
# Di terminal lokal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Jalankan 2 kali untuk JWT_SECRET dan JWT_REFRESH_SECRET
```

### Step 5: Setup Prisma untuk MySQL

1. **Pastikan menggunakan schema MySQL:**
   ```bash
   cd backend
   # Copy schema MySQL jika belum
   cp prisma/schema.mysql.prisma prisma/schema.prisma
   # Atau edit schema.prisma untuk menggunakan provider MySQL
   ```

2. **Update schema.prisma:**
   ```prisma
   datasource db {
     provider = "mysql"
     url      = env("DATABASE_URL")
   }
   ```

3. **Run migrations di Railway:**
   - Di Railway Dashboard, buka service backend
   - Klik **"Deployments"** → **"Latest"** → **"View Logs"**
   - Atau gunakan Railway CLI:
     ```bash
     # Install Railway CLI
     npm i -g @railway/cli
     
     # Login
     railway login
     
     # Link ke project
     railway link
     
     # Generate Prisma Client
     railway run npm run prisma:generate
     
     # Run migrations
     railway run npm run prisma:migrate
     
     # Seed database (opsional)
     railway run npm run prisma:seed
     ```

### Step 6: Dapatkan Backend URL

1. Setelah backend deploy selesai, Railway akan memberikan URL
2. Format: `https://your-backend.railway.app`
3. **Copy URL ini** untuk digunakan di frontend

### Step 7: Update Frontend (Vercel)

1. Buka **Vercel Dashboard** → Project Anda
2. Go to **Settings** → **Environment Variables**
3. Tambahkan/Update:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ```
   **PENTING**: Jangan tambahkan `/api` di akhir URL, karena sudah ada di code!

4. **Redeploy** frontend:
   - Deployments → "..." → Redeploy
   - Uncheck "Use existing Build Cache"

### Step 8: Update CORS di Backend

1. Kembali ke **Railway Dashboard** → Backend service
2. Update environment variable:
   ```
   CORS_ORIGIN=https://your-app.vercel.app
   ```
3. Railway akan otomatis redeploy

### Step 9: Test Koneksi

1. Buka frontend: `https://your-app.vercel.app`
2. Coba login atau akses API
3. Cek browser console untuk error
4. Cek Railway logs untuk backend errors

---

## 🎨 Opsi 2: Render (Alternatif Railway)

### Step 1: Setup Render Account

1. Kunjungi: https://render.com
2. Sign up dengan GitHub account

### Step 2: Deploy MySQL Database

1. Klik **"New"** → **"MySQL"**
2. Pilih **"Free"** plan
3. Beri nama: `hcm-database`
4. Pilih region terdekat
5. Klik **"Create Database"**
6. Tunggu hingga siap (~2-3 menit)
7. Copy **"Internal Database URL"** atau **"External Database URL"**
   - Format: `mysql://user:password@host:3306/database`

### Step 3: Deploy Backend

1. Klik **"New"** → **"Web Service"**
2. Connect GitHub repository
3. **Root Directory**: `backend`
4. **Build Command**: `npm install && npm run build`
5. **Start Command**: `npm run start:prod`
6. **Environment Variables**:
   ```env
   DATABASE_URL=<dari-step-2>
   JWT_SECRET=<generate-random>
   JWT_REFRESH_SECRET=<generate-random>
   NODE_ENV=production
   PORT=3000
   CORS_ORIGIN=https://your-app.vercel.app
   ```

### Step 4: Setup Database Schema

1. Gunakan Render Shell atau SSH:
   ```bash
   # Di Render Dashboard, buka service backend
   # Klik "Shell" tab
   npm run prisma:generate
   npm run prisma:migrate
   ```

### Step 5: Update Frontend

Sama seperti Step 7 di Railway, update `NEXT_PUBLIC_API_URL` di Vercel.

**⚠️ Catatan**: Render free tier akan **sleep setelah 15 menit tidak aktif**. Request pertama setelah sleep akan lambat (~30 detik).

---

## 🗄️ Opsi 3: PlanetScale (MySQL Serverless - Recommended untuk Production)

### Step 1: Setup PlanetScale

1. Kunjungi: https://planetscale.com
2. Sign up dengan GitHub (gratis)
3. Klik **"Create database"**
4. Pilih **"Free"** plan
5. Beri nama: `hcm-production`
6. Pilih region terdekat
7. Tunggu setup selesai (~1 menit)

### Step 2: Dapatkan Connection String

1. Klik database yang baru dibuat
2. Klik **"Connect"** → **"Connect with Prisma"**
3. Copy connection string
   - Format: `mysql://user:password@host:3306/database?sslaccept=strict`
   - **PENTING**: PlanetScale memerlukan SSL, pastikan ada `?sslaccept=strict`

### Step 3: Deploy Backend ke Railway/Render

1. Deploy backend seperti biasa (Railway atau Render)
2. Gunakan connection string PlanetScale sebagai `DATABASE_URL`
3. Pastikan schema.prisma menggunakan MySQL provider

### Step 4: Run Migrations

```bash
# Di lokal atau Railway CLI
cd backend
npm run prisma:generate
npm run prisma:migrate
```

### Step 5: Update Frontend

Sama seperti sebelumnya, update `NEXT_PUBLIC_API_URL` di Vercel.

---

## 🔧 Konfigurasi Environment Variables

### Backend (Railway/Render)

```env
# Database
DATABASE_URL=mysql://user:password@host:3306/database

# JWT (GENERATE RANDOM!)
JWT_SECRET=<32-char-random-string>
JWT_REFRESH_SECRET=<32-char-random-string>
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Server
NODE_ENV=production
PORT=3000

# CORS (URL frontend Vercel)
CORS_ORIGIN=https://your-app.vercel.app
```

### Frontend (Vercel)

```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

**PENTING**: 
- Jangan tambahkan `/api` di akhir URL
- URL harus menggunakan `https://` (bukan `http://`)
- Setelah update environment variable, **harus redeploy**

---

## 🔐 Generate JWT Secrets

```bash
# Di terminal lokal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Jalankan 2 kali untuk mendapatkan:
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

**⚠️ JANGAN** gunakan default secrets di production!

---

## 🗄️ Setup Database Schema

### Untuk MySQL (Railway/Render/PlanetScale)

1. **Pastikan menggunakan schema MySQL:**
   ```bash
   cd backend
   # Copy schema MySQL
   cp prisma/schema.mysql.prisma prisma/schema.prisma
   ```

2. **Atau edit schema.prisma:**
   ```prisma
   datasource db {
     provider = "mysql"
     url      = env("DATABASE_URL")
   }
   ```

3. **Run migrations:**
   ```bash
   # Generate Prisma Client
   npm run prisma:generate
   
   # Run migrations
   npm run prisma:migrate
   
   # Seed database (opsional)
   npm run prisma:seed
   ```

### Untuk PostgreSQL

1. **Edit schema.prisma:**
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. **Run migrations** (sama seperti MySQL)

---

## 🔗 CORS Configuration

Backend sudah dikonfigurasi untuk CORS di `backend/src/main.ts`. Pastikan:

1. **Environment variable `CORS_ORIGIN`** di-set ke URL frontend Vercel
2. Format: `https://your-app.vercel.app` (tanpa trailing slash)
3. Setelah update, backend akan otomatis redeploy

**CORS akan otomatis allow:**
- Development: `http://localhost:3001`, `http://localhost:3002`, dll
- Production: URL yang di-set di `CORS_ORIGIN`

---

## ✅ Checklist Setup

### Database
- [ ] Database sudah dibuat (Railway/Render/PlanetScale)
- [ ] Connection string sudah di-copy
- [ ] Schema sudah di-set ke MySQL/PostgreSQL

### Backend
- [ ] Backend sudah di-deploy ke Railway/Render
- [ ] Root Directory di-set ke `backend`
- [ ] Environment variables sudah di-set:
  - [ ] `DATABASE_URL`
  - [ ] `JWT_SECRET` (random string)
  - [ ] `JWT_REFRESH_SECRET` (random string)
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=3000`
  - [ ] `CORS_ORIGIN` (akan diupdate setelah frontend deploy)
- [ ] Prisma migrations sudah di-run
- [ ] Backend URL sudah di-copy

### Frontend
- [ ] Frontend sudah di-deploy ke Vercel
- [ ] Environment variable `NEXT_PUBLIC_API_URL` sudah di-set
- [ ] Frontend sudah di-redeploy setelah update env var

### Testing
- [ ] Frontend bisa akses backend API
- [ ] Login berhasil
- [ ] Tidak ada CORS error di browser console
- [ ] Tidak ada error di backend logs

---

## 🐛 Troubleshooting

### Error: "Cannot connect to database"

**Penyebab**: `DATABASE_URL` salah atau database tidak accessible.

**Solusi**:
1. Pastikan `DATABASE_URL` benar (copy dari hosting provider)
2. Untuk PlanetScale, pastikan ada `?sslaccept=strict`
3. Cek apakah database sudah running
4. Cek firewall/network settings

### Error: "CORS policy blocked"

**Penyebab**: `CORS_ORIGIN` tidak di-set atau salah.

**Solusi**:
1. Pastikan `CORS_ORIGIN` di-set di backend environment variables
2. Format: `https://your-app.vercel.app` (tanpa trailing slash)
3. Redeploy backend setelah update
4. Cek browser console untuk error detail

### Error: "Prisma schema not found"

**Penyebab**: Schema tidak menggunakan provider yang benar.

**Solusi**:
1. Pastikan `schema.prisma` menggunakan `provider = "mysql"` atau `"postgresql"`
2. Pastikan `DATABASE_URL` sesuai dengan provider
3. Run `npm run prisma:generate` lagi

### Error: "401 Unauthorized"

**Penyebab**: JWT secret tidak di-set atau berbeda.

**Solusi**:
1. Pastikan `JWT_SECRET` dan `JWT_REFRESH_SECRET` di-set
2. Pastikan secrets adalah random strings (bukan default)
3. Redeploy backend setelah update secrets

### Frontend tidak bisa connect ke Backend

**Penyebab**: `NEXT_PUBLIC_API_URL` tidak di-set atau salah.

**Solusi**:
1. Pastikan `NEXT_PUBLIC_API_URL` di-set di Vercel Environment Variables
2. Format: `https://your-backend.railway.app` (tanpa `/api`)
3. Redeploy frontend setelah update
4. Cek browser Network tab untuk melihat request URL

---

## 📊 Monitoring

### Railway Dashboard
- **Logs**: Klik service → "Deployments" → "View Logs"
- **Metrics**: Klik service → "Metrics" tab
- **Database**: Klik database service → "Data" tab (bisa query langsung)

### Render Dashboard
- **Logs**: Klik service → "Logs" tab
- **Metrics**: Klik service → "Metrics" tab
- **Database**: Klik database → "Info" tab

### Vercel Dashboard
- **Logs**: Deployments → "..." → "View Function Logs"
- **Analytics**: Analytics tab (jika enabled)

---

## 🎯 Quick Reference

### Backend URL Format
```
Railway:  https://your-backend.railway.app
Render:   https://your-backend.onrender.com
```

### Database URL Format
```
MySQL (Railway):    mysql://root:password@host:3306/database
MySQL (PlanetScale): mysql://user:pass@host:3306/db?sslaccept=strict
PostgreSQL:         postgresql://user:pass@host:5432/database
```

### Environment Variables
```
Backend:
- DATABASE_URL
- JWT_SECRET
- JWT_REFRESH_SECRET
- CORS_ORIGIN

Frontend:
- NEXT_PUBLIC_API_URL
```

---

## 📚 Resources

- **Railway Docs**: https://docs.railway.app
- **Render Docs**: https://render.com/docs
- **PlanetScale Docs**: https://planetscale.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Prisma Docs**: https://www.prisma.io/docs

---

**Selamat setup! 🚀**

Jika ada masalah, cek logs di masing-masing platform dan pastikan semua environment variables sudah di-set dengan benar.

