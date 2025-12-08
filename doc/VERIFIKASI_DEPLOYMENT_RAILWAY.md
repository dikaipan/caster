# ✅ Verifikasi Deployment Railway

Panduan untuk memverifikasi apakah deployment Railway sudah berhasil.

---

## 🔍 Cara Cek Status Deployment

### Step 1: Cek Railway Dashboard

1. **Buka Railway Dashboard**: https://railway.app
2. **Pilih Project** Anda
3. **Klik Service "casper"** (backend)

### Step 2: Cek Deployment Status

1. **Tab "Deployments"**
2. **Cek deployment terbaru:**
   - Status harus **"Active"** (hijau) ✅
   - Tidak ada error ❌
   - Build berhasil ✅

### Step 3: Cek Logs

1. **Klik deployment terbaru**
2. **View Logs**
3. **Cek apakah ada error:**
   - ✅ Tidak ada error "JWT_SECRET is not configured"
   - ✅ Tidak ada error "DATABASE_URL is not configured"
   - ✅ Tidak ada error "Cannot connect to database"
   - ✅ Log menunjukkan: "Application is running on: http://0.0.0.0:3000"

### Step 4: Test Health Endpoint

**Dapatkan URL backend dari Railway:**
1. Service "casper" → Settings → Domains
2. Copy URL (contoh: `https://your-backend.railway.app`)

**Test dengan curl atau browser:**
```bash
curl https://your-backend.railway.app/api/health
```

**Harus return:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-04T...",
  "uptime": 123.45,
  "service": "Hitachi CRM Management API"
}
```

### Step 5: Cek Database Migrations

**Cek apakah migrations sudah di-run:**

1. **Railway Dashboard → Service "casper" → Shell**
2. **Jalankan:**
   ```bash
   npx prisma migrate status
   ```
3. **Harus menunjukkan:**
   - ✅ All migrations have been applied
   - ✅ Database is up to date

---

## ✅ Checklist Verifikasi

### Deployment
- [ ] Status deployment = "Active" (hijau)
- [ ] Build berhasil (tidak ada error)
- [ ] Logs tidak menunjukkan error
- [ ] Application running di port 3000

### Environment Variables
- [ ] DATABASE_URL di-set
- [ ] JWT_SECRET di-set
- [ ] JWT_REFRESH_SECRET di-set
- [ ] NODE_ENV=production
- [ ] PORT=3000

### Database
- [ ] Database MySQL dibuat di Railway
- [ ] DATABASE_URL benar (MySQL format)
- [ ] Migrations sudah di-run
- [ ] Schema.prisma menggunakan MySQL

### API
- [ ] Health endpoint working (`/api/health`)
- [ ] Version endpoint working (`/api/version`)
- [ ] Tidak ada CORS error
- [ ] Tidak ada authentication error

---

## 🐛 Troubleshooting

### Error: "JWT_SECRET is not configured"

**Solusi:**
1. Railway Dashboard → Service "casper" → Variables
2. Pastikan `JWT_SECRET` ada dan tidak kosong
3. Redeploy setelah update

### Error: "Cannot connect to database"

**Solusi:**
1. Pastikan `DATABASE_URL` benar (MySQL format)
2. Pastikan database service running
3. Pastikan schema.prisma menggunakan MySQL provider

### Error: "Prisma schema validation"

**Solusi:**
1. Pastikan schema.prisma menggunakan `provider = "mysql"`
2. Pastikan DATABASE_URL menggunakan format MySQL
3. Redeploy setelah update schema

### Health Endpoint Tidak Working

**Solusi:**
1. Cek logs untuk error detail
2. Pastikan semua environment variables di-set
3. Pastikan migrations sudah di-run
4. Pastikan backend service running

---

## 🎯 Quick Test Commands

```bash
# Test health endpoint
curl https://your-backend.railway.app/api/health

# Test version endpoint
curl https://your-backend.railway.app/api/version

# Check migrations status (di Railway Shell)
npx prisma migrate status
```

---

**Jika semua checklist ✅, deployment sudah berhasil! 🎉**

