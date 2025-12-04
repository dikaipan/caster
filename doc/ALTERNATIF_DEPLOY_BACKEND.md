# 🚀 Alternatif Platform untuk Deploy Backend NestJS

Karena Railway dan Render tidak bisa digunakan, berikut adalah alternatif platform yang bisa digunakan untuk deploy backend NestJS.

---

## 📊 Perbandingan Platform

| Platform | Free Tier | Sleep? | MySQL Support | Ease of Use | Recommended |
|----------|-----------|--------|---------------|-------------|-------------|
| **Fly.io** | ✅ Generous | ❌ No | ✅ Yes | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Koyeb** | ✅ Limited | ❌ No | ✅ Yes | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Cyclic** | ✅ Generous | ❌ No | ❌ No (PostgreSQL) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **DigitalOcean App Platform** | ❌ Paid | ❌ No | ✅ Yes | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Heroku** | ❌ Paid | ❌ No | ✅ Yes | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **AWS EC2** | ❌ Free Trial | ❌ No | ✅ Yes | ⭐⭐ | ⭐⭐ |
| **Google Cloud Run** | ✅ Generous | ❌ No | ✅ Yes | ⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 🎯 Opsi 1: Fly.io (RECOMMENDED - Tidak Sleep, Gratis)

### Keuntungan:
- ✅ **Tidak sleep** - Selalu aktif
- ✅ **MySQL gratis** - Support MySQL
- ✅ **Generous free tier** - 3 shared VMs, 3GB storage
- ✅ **Global edge network** - Fast worldwide
- ✅ **Auto-deploy dari GitHub**
- ✅ **Custom domain gratis**

### Batasan Gratis:
- 3 shared VMs
- 3GB persistent storage
- 160GB outbound data transfer per bulan

### Cara Deploy:

#### Step 1: Install Fly CLI

```bash
# Windows (PowerShell)
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Mac/Linux
curl -L https://fly.io/install.sh | sh
```

#### Step 2: Login dan Setup

```bash
# Login ke Fly.io
fly auth login

# Di folder backend
cd backend

# Initialize Fly.io app
fly launch
# Pilih:
# - App name: hcm-backend (atau nama lain)
# - Region: pilih yang terdekat (singapore, tokyo, dll)
# - PostgreSQL: No (kita pakai MySQL terpisah)
# - Redis: No
```

#### Step 3: Setup MySQL Database

**Opsi A: Gunakan PlanetScale (Recommended)**
1. Sign up di https://planetscale.com (gratis)
2. Buat database baru
3. Copy connection string
4. Format: `mysql://user:pass@host:3306/db?sslaccept=strict`

**Opsi B: Gunakan Aiven (Free Trial)**
1. Sign up di https://aiven.io
2. Buat MySQL service (free trial 1 bulan)
3. Copy connection string

#### Step 4: Konfigurasi Fly.io

Edit file `fly.toml` yang dibuat di folder backend:

```toml
app = "hcm-backend"
primary_region = "sin"  # Singapore, atau region terdekat

[build]
  builder = "paketobuildpacks/builder:base"

[env]
  NODE_ENV = "production"
  PORT = "3000"

[[services]]
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [services.concurrency]
    type = "connections"
    hard_limit = 25
    soft_limit = 20

  [[services.http_checks]]
    interval = "10s"
    timeout = "2s"
    grace_period = "5s"
    method = "GET"
    path = "/api/health"
```

#### Step 5: Setup Environment Variables

```bash
# Set environment variables
fly secrets set DATABASE_URL="mysql://user:pass@host:3306/db?sslaccept=strict"
fly secrets set JWT_SECRET="<generate-random-32-char-string>"
fly secrets set JWT_REFRESH_SECRET="<generate-random-32-char-string>"
fly secrets set JWT_EXPIRATION="15m"
fly secrets set JWT_REFRESH_EXPIRATION="7d"
fly secrets set NODE_ENV="production"
fly secrets set PORT="3000"
fly secrets set CORS_ORIGIN="https://your-app.vercel.app"
```

**Generate JWT Secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Step 6: Deploy

```bash
# Deploy backend
fly deploy

# Cek logs
fly logs

# Cek status
fly status
```

#### Step 7: Setup Database Schema

```bash
# Run Prisma migrations
fly ssh console -C "cd /app && npm run prisma:generate && npm run prisma:migrate"
```

#### Step 8: Dapatkan URL Backend

```bash
# Get app URL
fly status
# URL akan seperti: https://hcm-backend.fly.dev
```

---

## 🎯 Opsi 2: Koyeb (Paling Mudah - No Sleep)

### Keuntungan:
- ✅ **Tidak sleep** - Selalu aktif
- ✅ **MySQL gratis** - Support MySQL
- ✅ **Paling mudah setup** - Drag & drop dari GitHub
- ✅ **Auto-deploy dari GitHub**
- ✅ **Custom domain gratis**

### Batasan Gratis:
- 2 services
- 512MB RAM per service
- Limited CPU

### Cara Deploy:

#### Step 1: Sign up di Koyeb

1. Kunjungi: https://www.koyeb.com
2. Sign up dengan GitHub account
3. Klik "Create App"

#### Step 2: Deploy Backend

1. **Connect GitHub Repository**
   - Pilih repository `dikaipan/casper`
   - Klik "Deploy"

2. **Configure Service**
   - **Type**: Web Service
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Run Command**: `npm run start:prod`
   - **Port**: `3000`

3. **Environment Variables**
   ```
   DATABASE_URL=mysql://user:pass@host:3306/db
   JWT_SECRET=<generate-random>
   JWT_REFRESH_SECRET=<generate-random>
   JWT_EXPIRATION=15m
   JWT_REFRESH_EXPIRATION=7d
   NODE_ENV=production
   PORT=3000
   CORS_ORIGIN=https://your-app.vercel.app
   ```

4. **Deploy**
   - Klik "Deploy"
   - Tunggu build selesai (~2-3 menit)

#### Step 3: Setup MySQL Database

**Gunakan PlanetScale atau Aiven** (sama seperti Fly.io)

#### Step 4: Run Migrations

1. Di Koyeb Dashboard, buka service backend
2. Klik "Shell" tab
3. Run:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

#### Step 5: Dapatkan URL

- URL akan seperti: `https://hcm-backend-xxxxx.koyeb.app`
- Copy URL ini untuk digunakan di frontend

---

## 🎯 Opsi 3: Cyclic (Serverless - Tidak Sleep)

### Keuntungan:
- ✅ **Tidak sleep** - Serverless, selalu aktif
- ✅ **Auto-deploy dari GitHub**
- ✅ **Generous free tier**
- ✅ **Paling mudah setup**

### Batasan:
- ❌ **Tidak support MySQL** - Hanya PostgreSQL
- Perlu migrate ke PostgreSQL atau gunakan database terpisah

### Cara Deploy:

#### Step 1: Sign up di Cyclic

1. Kunjungi: https://www.cyclic.sh
2. Sign up dengan GitHub account
3. Klik "New App"

#### Step 2: Connect Repository

1. Pilih repository `dikaipan/casper`
2. **Root Directory**: `backend`
3. Cyclic akan auto-detect NestJS

#### Step 3: Setup Environment Variables

```
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=<generate-random>
JWT_REFRESH_SECRET=<generate-random>
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-app.vercel.app
```

#### Step 4: Deploy

- Cyclic akan otomatis deploy
- URL akan seperti: `https://hcm-backend.cyclic.app`

**Catatan**: Jika menggunakan MySQL, perlu migrate ke PostgreSQL atau gunakan database terpisah (PlanetScale).

---

## 🎯 Opsi 4: DigitalOcean App Platform (Paid - Recommended untuk Production)

### Keuntungan:
- ✅ **Tidak sleep** - Selalu aktif
- ✅ **MySQL support** - Managed MySQL database
- ✅ **Reliable** - Production-ready
- ✅ **Auto-scaling**
- ✅ **Auto-deploy dari GitHub**

### Harga:
- **Starter**: $5/month (512MB RAM, 1GB storage)
- **Basic**: $12/month (1GB RAM, 1GB storage)
- **Database**: $15/month (1GB RAM, 10GB storage)

### Cara Deploy:

1. Sign up di https://www.digitalocean.com
2. Go to **App Platform**
3. **Create App** → **GitHub**
4. Pilih repository dan folder `backend`
5. Setup environment variables
6. Deploy

---

## 🎯 Opsi 5: Google Cloud Run (Serverless - Generous Free Tier)

### Keuntungan:
- ✅ **Tidak sleep** - Serverless
- ✅ **Generous free tier** - 2 million requests/month
- ✅ **MySQL support** - Cloud SQL
- ✅ **Auto-scaling**

### Batasan Gratis:
- 2 million requests/month
- 360,000 GB-seconds compute time
- 180,000 vCPU-seconds

### Cara Deploy:

#### Step 1: Setup Google Cloud

1. Sign up di https://cloud.google.com (free $300 credit)
2. Install Google Cloud CLI
3. Setup project

#### Step 2: Deploy dengan Cloud Run

```bash
# Login
gcloud auth login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Build dan deploy
cd backend
gcloud run deploy hcm-backend \
  --source . \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="mysql://...",JWT_SECRET="..."
```

---

## 🎯 Opsi 6: AWS EC2 (Free Trial - Full Control)

### Keuntungan:
- ✅ **Full control** - VPS sendiri
- ✅ **MySQL support** - Install sendiri
- ✅ **Free tier** - 12 bulan free (t2.micro)

### Batasan:
- ❌ **Lebih kompleks** - Perlu setup manual
- ❌ **Free tier terbatas** - 750 hours/month

### Cara Deploy:

1. Sign up di https://aws.amazon.com
2. Launch EC2 instance (t2.micro - free tier)
3. Install Node.js, MySQL
4. Deploy backend dengan PM2 atau systemd
5. Setup Nginx sebagai reverse proxy

**Lebih kompleks, tapi full control.**

---

## 📝 Rekomendasi Berdasarkan Use Case

### 🎓 Development / Testing
**Koyeb** atau **Fly.io**
- Paling mudah setup
- Tidak sleep
- Gratis

### 🚀 Small Production (< 1000 users)
**Fly.io** + **PlanetScale**
- Tidak sleep
- Reliable
- Generous free tier

### 💰 Budget: $0 (Fully Free)
**Koyeb** atau **Fly.io**
- Tidak sleep
- Gratis
- Auto-deploy

### ⚡ Production (Paid)
**DigitalOcean App Platform** atau **Google Cloud Run**
- Production-ready
- Reliable
- Auto-scaling

---

## 🔧 Setup Database Terpisah

Karena beberapa platform tidak include database, gunakan database terpisah:

### PlanetScale (MySQL Serverless - Recommended)

1. Sign up: https://planetscale.com (gratis)
2. Create database
3. Copy connection string
4. Format: `mysql://user:pass@host:3306/db?sslaccept=strict`

### Aiven (MySQL - Free Trial)

1. Sign up: https://aiven.io
2. Create MySQL service (free trial 1 bulan)
3. Copy connection string

### Supabase (PostgreSQL - Gratis)

1. Sign up: https://supabase.com (gratis)
2. Create project
3. Copy connection string
4. Format: `postgresql://user:pass@host:5432/db`

---

## ✅ Checklist Setup

### Platform
- [ ] Platform dipilih (Fly.io/Koyeb/Cyclic)
- [ ] Account dibuat
- [ ] Repository connected

### Backend
- [ ] Backend di-deploy
- [ ] Root Directory di-set ke `backend`
- [ ] Environment variables di-set:
  - [ ] `DATABASE_URL`
  - [ ] `JWT_SECRET` (random)
  - [ ] `JWT_REFRESH_SECRET` (random)
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=3000`
  - [ ] `CORS_ORIGIN` (URL frontend Vercel)
- [ ] Build berhasil
- [ ] Backend URL didapat

### Database
- [ ] Database dibuat (PlanetScale/Aiven/Supabase)
- [ ] Connection string di-copy
- [ ] Prisma migrations di-run
- [ ] Database schema sudah benar

### Frontend
- [ ] `NEXT_PUBLIC_API_URL` di-update di Vercel
- [ ] Frontend di-redeploy

### Testing
- [ ] Backend accessible
- [ ] Frontend bisa connect ke backend
- [ ] Login berhasil
- [ ] Tidak ada CORS error

---

## 🐛 Troubleshooting

### Error: "Cannot connect to database"

**Solusi**:
1. Pastikan `DATABASE_URL` benar
2. Untuk PlanetScale, pastikan ada `?sslaccept=strict`
3. Cek firewall/network settings
4. Test connection string di lokal dulu

### Error: "Build failed"

**Solusi**:
1. Cek build logs di platform dashboard
2. Pastikan `package.json` ada di folder `backend`
3. Pastikan semua dependencies terinstall
4. Test build lokal: `cd backend && npm run build`

### Error: "CORS policy blocked"

**Solusi**:
1. Pastikan `CORS_ORIGIN` di-set dengan benar
2. Format: `https://your-app.vercel.app` (tanpa trailing slash)
3. Redeploy backend setelah update

### Backend tidak accessible

**Solusi**:
1. Cek status di platform dashboard
2. Cek logs untuk error
3. Pastikan port benar (3000)
4. Cek health endpoint: `/api/health`

---

## 📚 Resources

- **Fly.io Docs**: https://fly.io/docs
- **Koyeb Docs**: https://www.koyeb.com/docs
- **Cyclic Docs**: https://docs.cyclic.sh
- **DigitalOcean Docs**: https://docs.digitalocean.com
- **Google Cloud Run Docs**: https://cloud.google.com/run/docs
- **PlanetScale Docs**: https://planetscale.com/docs

---

## 🎯 Quick Start: Fly.io (Recommended)

```bash
# 1. Install Fly CLI
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# 2. Login
fly auth login

# 3. Setup app
cd backend
fly launch

# 4. Set secrets
fly secrets set DATABASE_URL="mysql://..."
fly secrets set JWT_SECRET="..."
fly secrets set JWT_REFRESH_SECRET="..."
fly secrets set CORS_ORIGIN="https://your-app.vercel.app"

# 5. Deploy
fly deploy

# 6. Run migrations
fly ssh console -C "cd /app && npm run prisma:migrate"

# 7. Done! 🎉
```

---

**Selamat deploy! 🚀**

Jika ada masalah, cek logs di platform dashboard dan pastikan semua environment variables sudah di-set dengan benar.

