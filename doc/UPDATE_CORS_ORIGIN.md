# 🔧 Update CORS_ORIGIN untuk Fix CORS Error

Panduan untuk update CORS_ORIGIN di Railway sesuai dengan frontend URL yang sebenarnya.

---

## 🔍 Masalah

CORS error terjadi karena origin yang dikirim dari frontend tidak match dengan CORS_ORIGIN di Railway.

**Origin yang dikirim:** `https://casper-git-main-dikaipans-projects.vercel.app`

---

## ✅ Solusi

### Step 1: Dapatkan Frontend URL yang Benar

**Cara 1: Dari Browser**
1. Buka frontend di browser
2. Lihat URL di address bar
3. Copy URL tersebut (contoh: `https://casper-git-main-dikaipans-projects.vercel.app`)

**Cara 2: Dari Vercel Dashboard**
1. Vercel Dashboard → Project
2. Settings → Domains
3. Copy semua domain yang aktif

### Step 2: Update CORS_ORIGIN di Railway

1. **Railway Dashboard** → Service "casper" (backend)
2. **Variables** tab
3. **Cari atau tambahkan variable:**
   ```
   Name: CORS_ORIGIN
   Value: https://casper-git-main-dikaipans-projects.vercel.app
   ```
   **PENTING:**
   - Exact match dengan frontend URL
   - Tidak ada trailing slash
   - Harus menggunakan `https://`

4. **Save** atau **Update**

### Step 3: Support Multiple Origins (Opsional)

Jika frontend punya multiple URLs (misalnya preview deployments), bisa set multiple origins:

```
Name: CORS_ORIGIN
Value: https://casper-git-main-dikaipans-projects.vercel.app,https://casper-mu.vercel.app
```

**Format:** Comma-separated, tanpa space setelah comma (atau dengan space, akan di-trim otomatis)

### Step 4: Redeploy Backend

Setelah update CORS_ORIGIN, Railway akan otomatis redeploy. Tunggu ~1-2 menit.

**Atau manual redeploy:**
1. Railway Dashboard → Service "casper" → Deployments
2. Klik "..." → Redeploy
3. Uncheck "Use existing Build Cache"

### Step 5: Verifikasi

1. **Cek logs Railway:**
   - Railway Dashboard → Service "casper" → Deployments → Latest → View Logs
   - Cari log:
     ```
     🔒 CORS Configuration:
        NODE_ENV: production
        CORS_ORIGIN: https://casper-git-main-dikaipans-projects.vercel.app
        Allowed Origins: https://casper-git-main-dikaipans-projects.vercel.app
     ```

2. **Test login di frontend:**
   - Buka: `https://casper-git-main-dikaipans-projects.vercel.app`
   - Buka Developer Tools (F12)
   - Coba login
   - Cek Console: Tidak ada CORS error

---

## 📝 Checklist

- [ ] Frontend URL diketahui (dari browser atau Vercel)
- [ ] CORS_ORIGIN di-set di Railway dengan exact URL
- [ ] Tidak ada trailing slash di CORS_ORIGIN
- [ ] Backend di-redeploy setelah update CORS_ORIGIN
- [ ] Logs menunjukkan CORS configuration yang benar
- [ ] Test login berhasil tanpa CORS error

---

## 🎯 Quick Fix

**Railway Variables:**
```
CORS_ORIGIN=https://casper-git-main-dikaipans-projects.vercel.app
```

**Untuk multiple origins:**
```
CORS_ORIGIN=https://casper-git-main-dikaipans-projects.vercel.app,https://casper-mu.vercel.app
```

---

## 🐛 Troubleshooting

### Masih Ada CORS Error?

**1. Pastikan Exact Match:**
- Origin yang dikirim: `https://casper-git-main-dikaipans-projects.vercel.app`
- CORS_ORIGIN: `https://casper-git-main-dikaipans-projects.vercel.app` ✅
- Bukan: `https://casper-git-main-dikaipans-projects.vercel.app/` ❌
- Bukan: `http://casper-git-main-dikaipans-projects.vercel.app` ❌

**2. Cek Logs Railway:**
- Cari log "CORS Request from origin"
- Cari log "CORS blocked"
- Pastikan origin yang dikirim match dengan allowed origins

**3. Clear Browser Cache:**
- Tekan `Ctrl+Shift+Delete`
- Clear cache dan cookies
- Refresh halaman

**4. Test dengan curl:**
```bash
curl -H "Origin: https://casper-git-main-dikaipans-projects.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://casper-production.up.railway.app/api/auth/login \
     -v

# Should return:
# Access-Control-Allow-Origin: https://casper-git-main-dikaipans-projects.vercel.app
```

---

**Setelah CORS_ORIGIN di-update dengan URL yang benar dan backend di-redeploy, CORS error akan hilang! 🚀**

