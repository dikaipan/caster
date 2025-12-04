# 🔐 Setup Environment Variables di Railway

Panduan lengkap untuk setup environment variables di Railway setelah build berhasil.

---

## ✅ Build Berhasil!

Build Docker sudah berhasil! Sekarang perlu setup environment variables.

---

## 🔧 Setup Environment Variables

### Step 1: Buka Railway Dashboard

1. Railway Dashboard → Service Backend
2. Klik tab **"Variables"**

### Step 2: Tambahkan Environment Variables

Klik **"New Variable"** untuk setiap variable berikut:

#### Database

```env
DATABASE_URL=mysql://root:password@host:3306/database
```

**Cara mendapatkan DATABASE_URL:**
1. Railway Dashboard → Database (MySQL service)
2. Klik database → tab **"Connect"**
3. Copy **"MySQL Connection URL"**
4. Format: `mysql://root:password@host:3306/database`

#### JWT Secrets (PENTING!)

```env
JWT_SECRET=<generate-random-32-char-string>
JWT_REFRESH_SECRET=<generate-random-32-char-string>
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

**Generate JWT Secrets:**
```bash
# Di terminal lokal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Jalankan 2 kali untuk JWT_SECRET dan JWT_REFRESH_SECRET
```

**Atau gunakan online generator:**
- https://www.random.org/strings/
- Length: 64 characters
- Generate 2 strings untuk JWT_SECRET dan JWT_REFRESH_SECRET

#### Server Configuration

```env
NODE_ENV=production
PORT=3000
```

#### CORS (Update setelah frontend deploy)

```env
CORS_ORIGIN=https://your-app.vercel.app
```

**Update setelah frontend di-deploy di Vercel.**

---

## 📋 Complete Environment Variables List

Copy semua ini ke Railway Variables:

```env
# Database
DATABASE_URL=mysql://root:password@host:3306/database

# JWT Secrets (GENERATE RANDOM STRINGS!)
JWT_SECRET=<64-character-random-string>
JWT_REFRESH_SECRET=<64-character-random-string>
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Server
NODE_ENV=production
PORT=3000

# CORS (update setelah frontend deploy)
CORS_ORIGIN=https://your-app.vercel.app
```

---

## 🔄 Setelah Set Environment Variables

1. **Railway akan otomatis redeploy** setelah environment variables di-set
2. **Tunggu deployment selesai** (~1-2 menit)
3. **Check logs** untuk memastikan tidak ada error
4. **Test health endpoint:**
   ```bash
   curl https://your-backend.railway.app/api/health
   # Should return: {"status":"ok",...}
   ```

---

## 🧪 Verifikasi

### 1. Check Logs

Railway Dashboard → Service Backend → Deployments → Latest → View Logs

Should show:
```
Application is running on: http://0.0.0.0:3000
```

### 2. Test Health Endpoint

```bash
curl https://your-backend.railway.app/api/health
# Should return: {"status":"ok","timestamp":"...","uptime":...,"service":"..."}
```

### 3. Test Version Endpoint

```bash
curl https://your-backend.railway.app/api/version
# Should return: {"version":"1.0.0","environment":"production",...}
```

---

## 🐛 Troubleshooting

### Error: "JWT_SECRET is not configured"

**Solusi:**
1. Railway Dashboard → Service Backend → Variables
2. Pastikan `JWT_SECRET` di-set
3. Pastikan value tidak kosong
4. Redeploy jika perlu

### Error: "DATABASE_URL is not configured"

**Solusi:**
1. Pastikan MySQL database sudah dibuat
2. Copy DATABASE_URL dari database service
3. Set di Variables
4. Redeploy

### Error: "Cannot connect to database"

**Solusi:**
1. Pastikan DATABASE_URL benar
2. Pastikan database service running
3. Check network settings
4. Pastikan schema.prisma menggunakan MySQL provider

### Error: "CORS error" di frontend

**Solusi:**
1. Pastikan `CORS_ORIGIN` di-set dengan URL frontend Vercel
2. Format: `https://your-app.vercel.app` (tanpa trailing slash)
3. Redeploy backend setelah update CORS_ORIGIN

---

## 📝 Checklist

- [ ] DATABASE_URL di-set (dari MySQL database)
- [ ] JWT_SECRET di-set (random 64-char string)
- [ ] JWT_REFRESH_SECRET di-set (random 64-char string)
- [ ] JWT_EXPIRATION=15m
- [ ] JWT_REFRESH_EXPIRATION=7d
- [ ] NODE_ENV=production
- [ ] PORT=3000
- [ ] CORS_ORIGIN di-set (setelah frontend deploy)
- [ ] Backend redeploy setelah set variables
- [ ] Health endpoint working
- [ ] No errors di logs

---

## 🔐 Security Best Practices

1. **JWT Secrets:**
   - Gunakan random strings (64 characters)
   - Jangan gunakan default atau predictable values
   - Jangan commit secrets ke git

2. **DATABASE_URL:**
   - Railway akan otomatis rotate password
   - Jangan hardcode di code
   - Gunakan environment variables

3. **CORS_ORIGIN:**
   - Set dengan exact frontend URL
   - Jangan gunakan wildcard `*` di production
   - Update setelah frontend deploy

---

## 🚀 Next Steps

Setelah environment variables di-set:

1. **Run Database Migrations:**
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

2. **Update Frontend:**
   - Vercel Dashboard → Settings → Environment Variables
   - Update: `NEXT_PUBLIC_API_URL=https://your-backend.railway.app`
   - Redeploy frontend

3. **Update CORS:**
   - Railway Dashboard → Backend → Variables
   - Update: `CORS_ORIGIN=https://your-app.vercel.app`
   - Railway akan otomatis redeploy

4. **Test Full Stack:**
   - Buka frontend di browser
   - Coba login
   - Verify tidak ada CORS error
   - Verify API requests berhasil

---

## 📚 Resources

- **Railway Environment Variables**: https://docs.railway.app/develop/variables
- **JWT Best Practices**: https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/
- **CORS Configuration**: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

---

**Setelah environment variables di-set, aplikasi akan berjalan dengan baik! 🎉**

