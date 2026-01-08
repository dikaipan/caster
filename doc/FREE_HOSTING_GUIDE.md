# 🆓 Panduan Hosting Gratis untuk Aplikasi HCM

Panduan lengkap untuk hosting aplikasi HCM secara gratis menggunakan berbagai platform.

---

## 📊 Ringkasan Opsi Hosting Gratis (MySQL)

| Platform | Backend | Frontend | Database | Batasan Gratis |
|----------|---------|----------|----------|---------------|
| **Railway** | ✅ | ✅ | ✅ (MySQL) | $5 credit/month, 500 hours |
| **Render** | ✅ | ✅ | ✅ (MySQL) | 750 hours/month, sleep after 15min |
| **PlanetScale** | ❌ | ❌ | ✅ (MySQL) | 1 database, 1GB storage, 1B reads/month |
| **Aiven** | ❌ | ❌ | ✅ (MySQL) | 1 month free trial |
| **Vercel** | ✅ (Serverless) | ✅ (Native) | ❌ | 100GB bandwidth, unlimited requests |
| **Fly.io** | ✅ | ✅ | ✅ (MySQL) | 3 shared VMs, 3GB storage |

**Rekomendasi Terbaik untuk MySQL:**
- **Railway** - Paling mudah, support MySQL, tidak sleep
- **Render** - Alternatif Railway, sleep setelah 15min
- **Vercel (Frontend) + Railway/Render (Backend) + PlanetScale (MySQL)** - Kombinasi terbaik
- **Fly.io** - Tidak sleep, support MySQL

---

## 🚂 Opsi 1: Railway (Recommended - Paling Mudah)

Railway adalah platform yang sangat mudah untuk deploy full-stack aplikasi.

### Keuntungan:
- ✅ Deploy backend, frontend, dan database dalam satu platform
- ✅ Auto-deploy dari GitHub
- ✅ **MySQL gratis** (500MB) - Support MySQL!
- ✅ Tidak sleep (selama ada credit)
- ✅ Custom domain gratis

### Batasan Gratis:
- $5 credit per bulan (cukup untuk development/small production)
- 500 jam compute time
- Database: 500MB storage (MySQL)

### Cara Deploy:

#### 1. Setup Railway Account
```bash
# Kunjungi: https://railway.app
# Sign up dengan GitHub account
```

#### 2. Deploy Backend
1. Klik "New Project" → "Deploy from GitHub repo"
2. Pilih repository Anda
3. Pilih folder `backend/`
4. Railway akan auto-detect NestJS
5. Tambahkan environment variables:
   ```
   DATABASE_URL=<railway-mysql-url>
   JWT_SECRET=<your-secret>
   JWT_REFRESH_SECRET=<your-refresh-secret>
   NODE_ENV=production
   PORT=3000
   CORS_ORIGIN=<frontend-url>
   ```
6. Railway akan otomatis deploy

#### 3. Deploy MySQL Database
1. Di project yang sama, klik "New" → "Database" → "MySQL"
2. Railway akan membuat database dan memberikan `DATABASE_URL`
3. Copy `DATABASE_URL` ke environment variables backend
4. Format: `mysql://user:password@host:3306/database`

#### 4. Setup Database Schema untuk MySQL
```bash
# Install Railway CLI (opsional)
npm i -g @railway/cli

# Login
railway login

# Link ke project
railway link

# Pastikan menggunakan schema MySQL
cd backend
# Copy schema.mysql.prisma ke schema.prisma jika belum
# Atau edit schema.prisma untuk menggunakan provider MySQL

# Generate Prisma Client untuk MySQL
railway run npm run prisma:generate

# Run migrations
railway run npm run prisma:migrate

# Seed database (opsional)
railway run npm run prisma:seed
```

#### 5. Deploy Frontend
1. Di project yang sama, klik "New" → "GitHub Repo"
2. Pilih folder `frontend/`
3. Railway akan auto-detect Next.js
4. Tambahkan environment variable:
   ```
   NEXT_PUBLIC_API_URL=<backend-url>
   ```
5. Deploy

### Cost Estimate:
- **Gratis**: $5 credit/month (cukup untuk development)
- **Paid**: Mulai dari $5/month untuk production

---

## 🎨 Opsi 2: Vercel (Frontend) + Supabase (Backend + Database)

Kombinasi populer untuk hosting gratis.

### Keuntungan:
- ✅ Vercel: Optimized untuk Next.js
- ✅ Supabase: PostgreSQL gratis + Edge Functions untuk backend
- ✅ Tidak sleep
- ✅ Custom domain gratis

### Batasan Gratis:
- Vercel: 100GB bandwidth, unlimited requests
- Supabase: 500MB database, 2GB bandwidth, 500K Edge Function invocations

### Cara Deploy:

#### A. Deploy Frontend ke Vercel

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   cd frontend
   vercel
   ```

3. **Setup Environment Variables**
   - Di Vercel dashboard → Settings → Environment Variables
   - Tambahkan: `NEXT_PUBLIC_API_URL=<supabase-backend-url>`

#### B. Setup Supabase (Backend + Database)

1. **Buat Supabase Project**
   - Kunjungi: https://supabase.com
   - Sign up → New Project
   - Pilih region terdekat
   - Tunggu setup selesai (~2 menit)

2. **Setup Database Schema**
   ```bash
   # Install Supabase CLI
   npm i -g supabase

   # Login
   supabase login

   # Link ke project
   supabase link --project-ref <your-project-ref>

   # Run migrations (dari Prisma)
   # Export Prisma schema ke SQL, lalu import ke Supabase
   cd backend
   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > migration.sql
   
   # Atau gunakan Supabase SQL Editor untuk run migrations manual
   ```

3. **Deploy Backend sebagai Edge Functions**
   
   **Opsi A: Convert ke Supabase Edge Functions**
   - Supabase Edge Functions menggunakan Deno, bukan Node.js
   - Perlu refactor backend untuk menggunakan Edge Functions
   - Lebih kompleks, tapi gratis

   **Opsi B: Deploy Backend ke Railway/Render**
   - Deploy backend ke Railway atau Render (gratis)
   - Gunakan Supabase hanya untuk database
   - Lebih mudah, tetap gratis

---

## 🎯 Opsi 3: Render (Alternatif Railway)

Mirip dengan Railway, tapi dengan batasan berbeda.

### Keuntungan:
- ✅ Deploy backend, frontend, dan database
- ✅ Auto-deploy dari GitHub
- ✅ **MySQL gratis** - Support MySQL!
- ✅ Custom domain gratis

### Batasan Gratis:
- 750 jam compute time per bulan
- **Sleep setelah 15 menit tidak aktif** (untuk free tier)
- Database: 90MB storage (sangat kecil untuk MySQL)

### Cara Deploy:

1. **Sign up di Render**: https://render.com

2. **Deploy MySQL Database**
   - New → MySQL
   - Pilih "Free" plan
   - Copy connection string
   - Format: `mysql://user:password@host:3306/database`

3. **Deploy Backend**
   - New → Web Service
   - Connect GitHub repo
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start:prod`
   - Environment Variables:
     ```
     DATABASE_URL=<render-mysql-url>
     JWT_SECRET=<your-secret>
     PORT=3000
     NODE_ENV=production
     ```

4. **Deploy Frontend**
   - New → Static Site
   - Connect GitHub repo
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `.next`
   - Environment Variables:
     ```
     NEXT_PUBLIC_API_URL=<backend-url>
     ```

**⚠️ Catatan:** Free tier akan sleep setelah 15 menit tidak aktif. Request pertama setelah sleep akan lambat (~30 detik).

---

## 🚀 Opsi 4: Fly.io (Tidak Sleep)

Platform yang tidak sleep untuk free tier.

### Keuntungan:
- ✅ Tidak sleep (selama ada credit)
- ✅ PostgreSQL gratis
- ✅ Global edge network
- ✅ Custom domain gratis

### Batasan Gratis:
- 3 shared VMs
- 3GB persistent storage
- 160GB outbound data transfer

### Cara Deploy:

1. **Install Fly CLI**
   ```bash
   # Windows (PowerShell)
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

   # Mac/Linux
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login**
   ```bash
   fly auth login
   ```

3. **Deploy Backend**
   ```bash
   cd backend
   fly launch
   # Ikuti wizard, pilih region
   # Setup environment variables di fly.toml
   ```

4. **Deploy MySQL**
   ```bash
   # Fly.io tidak support MySQL langsung, gunakan PlanetScale atau Railway untuk MySQL
   # Atau deploy MySQL di VM terpisah
   ```

5. **Deploy Frontend**
   ```bash
   cd frontend
   fly launch
   ```

---

## 🗄️ Opsi 5: PlanetScale (MySQL Serverless) - Recommended untuk MySQL

PlanetScale adalah platform MySQL serverless yang sangat populer dan powerful.

### Keuntungan:
- ✅ **MySQL Serverless** - Perfect untuk aplikasi yang menggunakan MySQL
- ✅ **Branching** - Database branching seperti Git
- ✅ **Auto-scaling** - Scale otomatis sesuai traffic
- ✅ **Connection pooling** - Built-in connection pooling
- ✅ **Tidak sleep** - Selalu available
- ✅ **Free tier sangat generous**

### Batasan Gratis:
- 1 database
- 1GB storage
- 1 billion reads/month
- 10 million writes/month
- Unlimited branches (untuk development)

### Cara Setup:

1. **Sign up di PlanetScale**
   ```bash
   # Kunjungi: https://planetscale.com
   # Sign up dengan GitHub account (gratis)
   ```

2. **Buat Database**
   - Klik "Create database"
   - Pilih "Free" plan
   - Beri nama: `hcm_development`
   - Pilih region terdekat
   - Tunggu setup selesai (~1 menit)

3. **Dapatkan Connection String**
   - Klik database yang baru dibuat
   - Klik "Connect" → "Connect with Prisma"
   - Copy connection string
   - Format: `mysql://user:password@host:3306/database?sslaccept=strict`

4. **Setup Prisma untuk PlanetScale**
   ```bash
   cd backend
   
   # Pastikan menggunakan schema MySQL
   # File: prisma/schema.mysql.prisma atau edit schema.prisma
   
   # Update DATABASE_URL di .env
   DATABASE_URL="mysql://user:password@host:3306/database?sslaccept=strict"
   
   # Generate Prisma Client
   npm run prisma:generate
   
   # Run migrations
   npm run prisma:migrate
   
   # Seed database (opsional)
   npm run prisma:seed
   ```

5. **Deploy Backend ke Railway/Render**
   - Gunakan connection string PlanetScale sebagai `DATABASE_URL`
   - Backend akan connect ke PlanetScale MySQL

### Catatan Penting:
- PlanetScale menggunakan **branching** - setiap branch adalah database terpisah
- Branch `main` adalah production database
- Bisa buat branch `development` untuk testing
- Merge branch seperti Git merge

---

## 🗄️ Opsi 6: Database Gratis Terpisah Lainnya

### A. Aiven (MySQL) - Free Trial
- **URL**: https://aiven.io
- **Gratis**: 1 month free trial, lalu $19/month
- **Connection**: Managed MySQL
- **Cocok untuk**: Testing sebelum production

### B. Clever Cloud (MySQL)
- **URL**: https://www.clever-cloud.com
- **Gratis**: Limited free tier
- **Connection**: Managed MySQL
- **Cocok untuk**: Development

---

## 📝 Rekomendasi Setup Berdasarkan Use Case

### 🎓 Development / Testing
**Railway** atau **Render**
- Paling mudah setup
- Auto-deploy dari GitHub
- Database included

### 🚀 Small Production (< 1000 users) - MySQL
**Vercel (Frontend) + Railway (Backend) + PlanetScale (MySQL)**
- Vercel: Optimized untuk Next.js
- Railway: Reliable untuk backend
- PlanetScale: Serverless MySQL yang cepat dan scalable

### 💰 Budget: $0 (Fully Free)
**Render (Full Stack)**
- Backend, frontend, dan database dalam satu platform
- **Catatan**: Akan sleep setelah 15 menit tidak aktif

### ⚡ No Sleep Required
**Fly.io (Full Stack)**
- Tidak sleep
- Global edge network
- Lebih kompleks setup

---

## 🔧 Setup Environment Variables untuk Production

### Backend (.env)
```env
# Database MySQL (dari hosting provider)
DATABASE_URL="mysql://user:pass@host:3306/dbname"
# Atau untuk PlanetScale:
DATABASE_URL="mysql://user:pass@host:3306/dbname?sslaccept=strict"

# JWT (GENERATE RANDOM STRINGS!)
JWT_SECRET="<generate-random-32-char-string>"
JWT_REFRESH_SECRET="<generate-random-32-char-string>"
JWT_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# Server
NODE_ENV="production"
PORT=3000

# CORS (frontend URL)
CORS_ORIGIN="https://your-frontend-domain.vercel.app"
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL="https://your-backend-domain.railway.app"
```

---

## 🛠️ Tips Optimasi untuk Free Tier

1. **Enable Caching**
   - Frontend: Next.js automatic caching
   - Backend: Response caching untuk data yang jarang berubah

2. **Optimize Database Queries**
   - Gunakan pagination (sudah ada)
   - Index database (sudah ada)
   - Limit query results

3. **Reduce Build Time**
   - Gunakan build cache
   - Optimize dependencies

4. **Monitor Usage**
   - Cek dashboard hosting provider secara rutin
   - Setup alerts jika mendekati limit

---

## 📊 Perbandingan Detail

### Railway vs Render vs Fly.io

| Feature | Railway | Render | PlanetScale |
|---------|---------|--------|------------|
| **Free Tier Sleep** | ❌ No | ✅ Yes (15min) | ❌ No |
| **MySQL Support** | ✅ Yes | ✅ Yes | ✅ Yes (Serverless) |
| **Database Included** | ✅ Yes (500MB) | ✅ Yes (90MB) | ✅ Yes (1GB) |
| **Auto Deploy** | ✅ Yes | ✅ Yes | ❌ Database only |
| **Ease of Use** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Free Credit** | $5/month | 750 hours | Unlimited (with limits) |
| **Best For** | Development | Small apps | Production MySQL |

---

## 🚨 Important Notes

1. **JWT Secrets**: **JANGAN** gunakan default secrets di production! Generate random strings:
   ```bash
   # Generate random secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Database Backups**: Free tier biasanya tidak include automatic backups. Setup manual backup jika perlu.

3. **Rate Limiting**: Be aware of rate limits pada free tier.

4. **Custom Domain**: Semua platform di atas support custom domain gratis.

5. **SSL/HTTPS**: Semua platform provide SSL certificate gratis.

---

## 🎯 Quick Start: Railway + MySQL (Recommended untuk MySQL)

```bash
# 1. Sign up di https://railway.app
# 2. Connect GitHub repository
# 3. Deploy MySQL database (bukan PostgreSQL!)
# 4. Deploy backend (dari folder backend/)
#    - Pastikan menggunakan schema.mysql.prisma
#    - Atau edit schema.prisma untuk MySQL
# 5. Deploy frontend (dari folder frontend/)
# 6. Setup environment variables
#    - DATABASE_URL dari Railway MySQL
# 7. Run migrations: railway run npm run prisma:migrate
# 8. Done! 🎉
```

## 🎯 Quick Start: PlanetScale (MySQL Serverless)

```bash
# 1. Sign up di https://planetscale.com (gratis)
# 2. Buat database baru (Free plan)
# 3. Copy connection string
# 4. Update DATABASE_URL di backend/.env
# 5. Deploy backend ke Railway/Render dengan DATABASE_URL PlanetScale
# 6. Deploy frontend ke Vercel
# 7. Run migrations: npm run prisma:migrate
# 8. Done! 🎉
```

---

## 📚 Resources

- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **Render Docs**: https://render.com/docs
- **Fly.io Docs**: https://fly.io/docs
- **Supabase Docs**: https://supabase.com/docs

---

## ❓ FAQ

**Q: Apakah benar-benar gratis?**
A: Ya, untuk development dan small production. Ada batasan (storage, bandwidth, compute time), tapi cukup untuk testing.

**Q: Aplikasi akan sleep di free tier?**
A: Render akan sleep setelah 15 menit tidak aktif. Railway dan PlanetScale tidak sleep (selama ada credit/limit).

**Q: Bisa upgrade ke paid later?**
A: Ya, semua platform support upgrade ke paid plan dengan mudah.

**Q: Database backup included?**
A: PlanetScale include automatic backups. Railway dan Render biasanya tidak di free tier. Setup manual backup jika perlu.

**Q: Custom domain gratis?**
A: Ya, semua platform support custom domain gratis dengan SSL.

**Q: PlanetScale vs Railway MySQL, mana yang lebih baik?**
A: 
- **PlanetScale**: Lebih powerful (serverless, branching, auto-scaling), 1GB storage, perfect untuk production
- **Railway MySQL**: Lebih mudah setup (all-in-one), 500MB storage, perfect untuk development
- **Rekomendasi**: Gunakan PlanetScale untuk production, Railway untuk development/testing

---

**Selamat hosting! 🚀**

