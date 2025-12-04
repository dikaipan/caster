# 🏠 Setup XAMPP untuk Development & Railway untuk Production

Panduan lengkap untuk menggunakan XAMPP di local development dan Railway untuk production.

---

## 📋 Overview

**Development (Lokal):**
- Database: MySQL di XAMPP (localhost)
- Backend: Run di laptop (localhost:3000)
- Frontend: Run di laptop (localhost:3001)

**Production (Railway):**
- Database: MySQL di Railway
- Backend: Deploy di Railway
- Frontend: Deploy di Vercel

---

## 🏠 Setup XAMPP untuk Development

### Step 1: Install & Setup XAMPP

1. **Download XAMPP:**
   - https://www.apachefriends.org/
   - Install XAMPP di laptop

2. **Start MySQL:**
   - Buka XAMPP Control Panel
   - Start **MySQL** service
   - Port default: `3306`

3. **Buat Database:**
   - Buka phpMyAdmin: http://localhost/phpmyadmin
   - Klik **"New"** untuk buat database baru
   - Nama database: `hcm_development` (atau sesuai kebutuhan)
   - Collation: `utf8mb4_unicode_ci`
   - Klik **"Create"**

### Step 2: Setup Environment Variables untuk Development

Di folder `backend/`, buat file `.env`:

```env
# Database (XAMPP MySQL)
DATABASE_URL="mysql://root:@localhost:3306/hcm_development"

# JWT Secrets (untuk development, bisa pakai yang sama)
JWT_SECRET=development-secret-key-change-in-production-12345678901234567890
JWT_REFRESH_SECRET=development-refresh-secret-key-change-in-production-12345678901234567890
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Server
NODE_ENV=development
PORT=3000

# CORS (untuk development)
CORS_ORIGIN=http://localhost:3001
```

**Note:**
- `root` user biasanya tidak ada password di XAMPP default
- Jika ada password, format: `mysql://root:password@localhost:3306/hcm_development`
- Port `3306` adalah default MySQL di XAMPP

### Step 3: Run Migrations di Local

```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate dev

# Seed database (opsional)
npm run prisma:seed
```

### Step 4: Run Backend di Local

```bash
cd backend

# Install dependencies (jika belum)
npm install

# Run development server
npm run start:dev
```

Backend akan running di: http://localhost:3000

---

## 🚀 Setup Railway untuk Production

### Step 1: Setup MySQL Database di Railway

1. Railway Dashboard → Project
2. Klik **"New"** → **"Database"** → **"MySQL"**
3. Tunggu database siap (~1-2 menit)
4. Klik database → tab **"Connect"**
5. **Copy "MySQL Connection URL"**
   - Format: `mysql://root:password@host:3306/database`

### Step 2: Setup Environment Variables di Railway

Railway Dashboard → Service Backend → **"Variables"**

Tambahkan variables berikut:

```env
# Database (dari Railway MySQL)
DATABASE_URL=mysql://root:password@host:3306/database

# JWT Secrets (GENERATE RANDOM - berbeda dari development!)
JWT_SECRET=<generate-random-64-char-string>
JWT_REFRESH_SECRET=<generate-random-64-char-string>
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Server
NODE_ENV=production
PORT=3000

# CORS (URL frontend Vercel)
CORS_ORIGIN=https://your-app.vercel.app
```

**PENTING:**
- `DATABASE_URL` di Railway berbeda dengan di local (XAMPP)
- `JWT_SECRET` harus berbeda antara development dan production
- `CORS_ORIGIN` di Railway adalah URL Vercel, bukan localhost

### Step 3: Run Migrations di Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login & Link
railway login
railway link

# Run migrations
railway run npm run prisma:generate
railway run npm run prisma:migrate deploy
```

---

## 🔄 Perbedaan Development vs Production

### Environment Variables

| Variable | Development (XAMPP) | Production (Railway) |
|----------|---------------------|----------------------|
| `DATABASE_URL` | `mysql://root:@localhost:3306/hcm_development` | `mysql://root:password@host:3306/database` |
| `JWT_SECRET` | Development secret (bisa sama) | Production secret (harus berbeda!) |
| `NODE_ENV` | `development` | `production` |
| `CORS_ORIGIN` | `http://localhost:3001` | `https://your-app.vercel.app` |
| `PORT` | `3000` | `3000` |

### Database

**Development (XAMPP):**
- Host: `localhost`
- Port: `3306`
- User: `root`
- Password: (kosong atau sesuai XAMPP setup)
- Database: `hcm_development`

**Production (Railway):**
- Host: `containers-us-west-123.railway.app` (contoh)
- Port: `3306`
- User: `root`
- Password: (auto-generated oleh Railway)
- Database: `railway` (atau sesuai Railway)

---

## 📝 File .env untuk Development

Buat file `backend/.env` (jangan commit ke git!):

```env
# Database (XAMPP MySQL)
DATABASE_URL="mysql://root:@localhost:3306/hcm_development"

# JWT Secrets (untuk development)
JWT_SECRET=development-secret-key-change-in-production-12345678901234567890
JWT_REFRESH_SECRET=development-refresh-secret-key-change-in-production-12345678901234567890
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Server
NODE_ENV=development
PORT=3000

# CORS
CORS_ORIGIN=http://localhost:3001
```

**PENTING:** File `.env` sudah di-ignore di `.gitignore`, jadi tidak akan ter-commit.

---

## 🔐 Security Best Practices

### Development (XAMPP)

- Boleh pakai simple secrets untuk development
- Database local tidak perlu password kuat
- CORS boleh allow localhost

### Production (Railway)

- **HARUS** pakai random secrets (64 characters)
- Database password auto-generated oleh Railway
- CORS harus exact frontend URL (tidak boleh wildcard)

---

## 🧪 Testing

### Test Development (Local)

1. **Start XAMPP MySQL:**
   - XAMPP Control Panel → Start MySQL

2. **Run Backend:**
   ```bash
   cd backend
   npm run start:dev
   ```

3. **Test API:**
   ```bash
   curl http://localhost:3000/api/health
   ```

4. **Test Database:**
   - Buka phpMyAdmin: http://localhost/phpmyadmin
   - Check database `hcm_development`
   - Verify tables sudah dibuat

### Test Production (Railway)

1. **Check Railway Logs:**
   - Railway Dashboard → Service Backend → Deployments → Latest → View Logs

2. **Test API:**
   ```bash
   curl https://your-backend.railway.app/api/health
   ```

3. **Verify Database:**
   - Railway Dashboard → Database → Connect
   - Check connection string

---

## 🔄 Workflow Development

### Daily Development:

1. **Start XAMPP MySQL:**
   - XAMPP Control Panel → Start MySQL

2. **Run Backend:**
   ```bash
   cd backend
   npm run start:dev
   ```

3. **Run Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

4. **Development menggunakan:**
   - Database: XAMPP MySQL (localhost)
   - Backend: localhost:3000
   - Frontend: localhost:3001

### Deploy ke Production:

1. **Push code ke GitHub:**
   ```bash
   git add .
   git commit -m "Update code"
   git push origin main
   ```

2. **Railway akan otomatis deploy** (jika auto-deploy enabled)

3. **Run migrations di Railway** (jika ada perubahan schema):
   ```bash
   railway run npm run prisma:migrate deploy
   ```

---

## 🐛 Troubleshooting

### Error: "Cannot connect to database" di Local

**Solusi:**
1. Pastikan XAMPP MySQL running
2. Check port 3306 tidak digunakan aplikasi lain
3. Pastikan database `hcm_development` sudah dibuat
4. Check `.env` file `DATABASE_URL` benar

### Error: "Cannot connect to database" di Railway

**Solusi:**
1. Pastikan `DATABASE_URL` di Railway benar
2. Pastikan database service running
3. Check network settings
4. Pastikan schema.prisma menggunakan MySQL provider

### Database Schema Berbeda antara Local dan Production

**Solusi:**
1. Pastikan migrations sudah di-run di kedua environment
2. Run migrations di local:
   ```bash
   npm run prisma:migrate dev
   ```
3. Run migrations di Railway:
   ```bash
   railway run npm run prisma:migrate deploy
   ```

### JWT Error di Production

**Solusi:**
1. Pastikan `JWT_SECRET` di Railway sudah di-set
2. Pastikan value tidak kosong
3. Pastikan format benar (64 characters)
4. Redeploy setelah update variables

---

## 📋 Checklist

### Development Setup (XAMPP)

- [ ] XAMPP installed
- [ ] MySQL service running
- [ ] Database `hcm_development` dibuat
- [ ] File `backend/.env` dibuat
- [ ] `DATABASE_URL` di-set ke XAMPP
- [ ] Migrations di-run
- [ ] Backend bisa connect ke database

### Production Setup (Railway)

- [ ] MySQL database dibuat di Railway
- [ ] `DATABASE_URL` di-set di Railway Variables
- [ ] `JWT_SECRET` di-set (random string)
- [ ] `JWT_REFRESH_SECRET` di-set (random string)
- [ ] `NODE_ENV=production` di-set
- [ ] `PORT=3000` di-set
- [ ] `CORS_ORIGIN` di-set (URL Vercel)
- [ ] Migrations di-run di Railway
- [ ] Backend bisa connect ke database

---

## 🎯 Quick Reference

### Local Development Commands:

```bash
# Start XAMPP MySQL (via XAMPP Control Panel)

# Run backend
cd backend
npm run start:dev

# Run migrations
npm run prisma:migrate dev

# Seed database
npm run prisma:seed
```

### Production Commands:

```bash
# Run migrations di Railway
railway run npm run prisma:migrate deploy

# Check logs
railway logs

# Test API
curl https://your-backend.railway.app/api/health
```

---

## 📚 Resources

- **XAMPP**: https://www.apachefriends.org/
- **phpMyAdmin**: http://localhost/phpmyadmin
- **Railway Docs**: https://docs.railway.app
- **Prisma Migrations**: https://www.prisma.io/docs/concepts/components/prisma-migrate

---

## 💡 Tips

1. **Jangan commit `.env` file** - Sudah di-ignore di `.gitignore`
2. **Gunakan `.env.example`** - Template untuk environment variables
3. **JWT Secrets berbeda** - Development dan production harus berbeda
4. **Database terpisah** - Development pakai XAMPP, production pakai Railway
5. **Migrations sync** - Pastikan migrations di-run di kedua environment

---

**Sekarang Anda bisa develop di local dengan XAMPP dan deploy ke production di Railway! 🚀**

