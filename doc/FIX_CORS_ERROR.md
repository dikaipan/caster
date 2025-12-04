# 🔧 Fix CORS Error: Access-Control-Allow-Origin

Panduan untuk mengatasi CORS error saat frontend connect ke backend Railway.

---

## 🔍 Error yang Terjadi

```
Access to XMLHttpRequest at 'https://casper-production.up.railway.app/api/auth/login' 
from origin 'https://casper-mu.vercel.app' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

---

## ✅ Solusi

### Step 1: Update CORS_ORIGIN di Railway

1. **Railway Dashboard** → Service "casper" (backend)
2. **Variables** tab
3. Cari atau tambahkan variable:
   ```
   Name: CORS_ORIGIN
   Value: https://casper-mu.vercel.app
   ```
   **PENTING:**
   - URL harus exact match dengan frontend URL
   - Tidak ada trailing slash
   - Harus menggunakan `https://`

4. **Save** atau **Add**

### Step 2: Redeploy Backend

Setelah update CORS_ORIGIN, Railway akan otomatis redeploy. Tunggu ~1-2 menit.

**Atau manual redeploy:**
1. Railway Dashboard → Service "casper" → Deployments
2. Klik "..." → Redeploy
3. Uncheck "Use existing Build Cache"

### Step 3: Verifikasi CORS

1. **Test health endpoint:**
   ```bash
   curl -H "Origin: https://casper-mu.vercel.app" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type" \
        -X OPTIONS \
        https://casper-production.up.railway.app/api/health
   ```

2. **Cek response headers:**
   - Harus ada: `Access-Control-Allow-Origin: https://casper-mu.vercel.app`
   - Harus ada: `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS`
   - Harus ada: `Access-Control-Allow-Headers: Content-Type, Authorization`

### Step 4: Test Frontend Lagi

1. **Buka frontend:** `https://casper-mu.vercel.app`
2. **Buka Developer Tools** (F12)
3. **Coba login**
4. **Cek Console:**
   - Tidak ada CORS error
   - Login berhasil

---

## 🔍 Troubleshooting

### Masih Ada CORS Error?

**1. Pastikan CORS_ORIGIN Exact Match:**
- Frontend URL: `https://casper-mu.vercel.app`
- CORS_ORIGIN: `https://casper-mu.vercel.app` ✅
- Bukan: `https://casper-mu.vercel.app/` ❌
- Bukan: `http://casper-mu.vercel.app` ❌

**2. Pastikan Backend Sudah Redeploy:**
- Cek Railway Dashboard → Deployments
- Pastikan deployment terbaru sudah selesai
- Status harus "Active" (hijau)

**3. Clear Browser Cache:**
- Tekan `Ctrl+Shift+Delete`
- Clear cache dan cookies
- Refresh halaman

**4. Cek Backend Logs:**
- Railway Dashboard → Service "casper" → Deployments → Latest → View Logs
- Cek apakah ada error
- Pastikan "Application is running"

**5. Test dengan curl:**
```bash
# Test preflight request
curl -H "Origin: https://casper-mu.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://casper-production.up.railway.app/api/auth/login \
     -v

# Should return:
# Access-Control-Allow-Origin: https://casper-mu.vercel.app
```

---

## 📝 Checklist

- [ ] CORS_ORIGIN di-set di Railway Variables
- [ ] CORS_ORIGIN = exact frontend URL (tanpa trailing slash)
- [ ] Backend di-redeploy setelah update CORS_ORIGIN
- [ ] Backend deployment status = Active
- [ ] Test preflight request berhasil
- [ ] Frontend tidak ada CORS error
- [ ] Login berhasil

---

## 🎯 Quick Fix

**Railway Variables:**
```
CORS_ORIGIN=https://casper-mu.vercel.app
```

**Setelah update, tunggu redeploy selesai, lalu test lagi!**

---

**Setelah CORS_ORIGIN di-set dengan benar dan backend di-redeploy, CORS error akan hilang! 🚀**

