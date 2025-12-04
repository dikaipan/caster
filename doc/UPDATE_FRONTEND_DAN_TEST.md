# 🚀 Update Frontend dan Test Full Stack

Panduan lengkap untuk update frontend agar connect ke backend Railway dan testing full stack.

---

## 📋 Prerequisites

- ✅ Backend sudah deployed di Railway
- ✅ Backend health endpoint working
- ✅ Backend URL sudah diketahui

---

## 🔧 Step 1: Dapatkan Backend URL dari Railway

1. **Railway Dashboard** → Project → Service "casper" (backend)
2. **Settings** → **Domains** atau **Networking**
3. **Copy URL backend** (contoh: `https://your-backend.railway.app`)
4. **Simpan URL ini!**

---

## 🔧 Step 2: Update Frontend di Vercel

### 2.1: Buka Vercel Dashboard

1. Kunjungi: https://vercel.com
2. Login dengan akun GitHub
3. Pilih **project frontend** Anda

### 2.2: Update Environment Variable

1. **Settings** → **Environment Variables**
2. Cari atau tambahkan variable:
   ```
   Name: NEXT_PUBLIC_API_URL
   Value: https://your-backend.railway.app
   ```
   **PENTING:** 
   - Jangan tambahkan `/api` di akhir URL
   - URL harus lengkap dengan `https://`
   - Contoh: `https://your-backend.railway.app` ✅
   - Bukan: `https://your-backend.railway.app/api` ❌

3. **Save** atau **Add**

### 2.3: Redeploy Frontend

1. **Deployments** tab
2. Klik **"..."** pada deployment terbaru
3. Pilih **"Redeploy"**
4. **Uncheck "Use existing Build Cache"**
5. Klik **"Redeploy"**
6. Tunggu deployment selesai (~2-3 menit)

---

## 🔧 Step 3: Update CORS_ORIGIN di Railway

### 3.1: Dapatkan Frontend URL dari Vercel

1. **Vercel Dashboard** → Project → **Settings** → **Domains**
2. **Copy URL frontend** (contoh: `https://your-app.vercel.app`)
3. **Simpan URL ini!**

### 3.2: Update CORS_ORIGIN di Railway

1. **Railway Dashboard** → Service "casper" (backend)
2. **Variables** tab
3. Cari atau tambahkan variable:
   ```
   Name: CORS_ORIGIN
   Value: https://your-app.vercel.app
   ```
   **PENTING:**
   - URL harus lengkap dengan `https://`
   - Tidak ada trailing slash
   - Contoh: `https://your-app.vercel.app` ✅
   - Bukan: `https://your-app.vercel.app/` ❌

4. **Save** atau **Add**
5. **Railway akan otomatis redeploy** setelah update variable

---

## 🧪 Step 4: Test Full Stack

### 4.1: Test Frontend

1. **Buka frontend di browser:**
   ```
   https://your-app.vercel.app
   ```

2. **Buka Browser Developer Tools:**
   - Tekan `F12` atau `Ctrl+Shift+I`
   - Tab **Console** untuk cek error
   - Tab **Network** untuk cek API requests

3. **Cek apakah frontend load dengan benar:**
   - Tidak ada error di console
   - Halaman load normal
   - Tidak ada CORS error

### 4.2: Test Login/Authentication

1. **Coba login** dengan credentials yang valid
2. **Cek Network tab:**
   - Request ke `/api/auth/login` harus berhasil
   - Response status: `200 OK`
   - Tidak ada CORS error

3. **Cek Console:**
   - Tidak ada error
   - Token berhasil disimpan

### 4.3: Test API Calls

1. **Setelah login**, coba akses fitur yang menggunakan API:
   - Dashboard
   - List data
   - Create/Update/Delete operations

2. **Cek Network tab:**
   - Semua API requests harus berhasil
   - Status: `200 OK` atau `201 Created`
   - Tidak ada `401 Unauthorized` atau `403 Forbidden`
   - Tidak ada CORS error

### 4.4: Test Error Handling

1. **Coba akses tanpa login** (jika ada protected routes)
2. **Cek apakah redirect ke login page** atau show error message
3. **Cek console** untuk error messages yang proper

---

## ✅ Checklist Testing

### Frontend Setup
- [ ] NEXT_PUBLIC_API_URL di-set di Vercel
- [ ] Frontend di-redeploy
- [ ] Frontend URL diketahui

### Backend Setup
- [ ] CORS_ORIGIN di-set di Railway
- [ ] Backend di-redeploy setelah update CORS
- [ ] Backend URL diketahui

### Testing
- [ ] Frontend load tanpa error
- [ ] Tidak ada CORS error di console
- [ ] Login berhasil
- [ ] API calls berhasil
- [ ] Data load dengan benar
- [ ] Create/Update/Delete operations working
- [ ] Error handling proper

---

## 🐛 Troubleshooting

### Error: CORS Policy

**Gejala:**
```
Access to fetch at 'https://your-backend.railway.app/api/...' from origin 'https://your-app.vercel.app' has been blocked by CORS policy
```

**Solusi:**
1. Pastikan `CORS_ORIGIN` di Railway = URL frontend Vercel (exact match)
2. Pastikan tidak ada trailing slash
3. Pastikan menggunakan `https://` (bukan `http://`)
4. Redeploy backend setelah update CORS_ORIGIN

### Error: 401 Unauthorized

**Gejala:**
```
401 Unauthorized pada API requests
```

**Solusi:**
1. Pastikan login berhasil
2. Pastikan token disimpan dengan benar
3. Pastikan token dikirim di Authorization header
4. Cek apakah token expired

### Error: Network Error atau Failed to Fetch

**Gejala:**
```
Failed to fetch atau Network error
```

**Solusi:**
1. Pastikan `NEXT_PUBLIC_API_URL` benar
2. Pastikan backend accessible (test health endpoint)
3. Pastikan tidak ada typo di URL
4. Cek browser console untuk detail error

### Error: 404 Not Found

**Gejala:**
```
404 Not Found pada API requests
```

**Solusi:**
1. Pastikan `NEXT_PUBLIC_API_URL` tidak ada `/api` di akhir
2. Pastikan API endpoint path benar
3. Cek backend routes di Swagger docs

---

## 🎯 Quick Reference

### Environment Variables

**Vercel (Frontend):**
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

**Railway (Backend):**
```env
DATABASE_URL=mysql://root:password@host:3306/database
JWT_SECRET=<random-64-char-string>
JWT_REFRESH_SECRET=<random-64-char-string>
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-app.vercel.app
```

### URLs

**Backend:**
- Health: `https://your-backend.railway.app/api/health`
- Version: `https://your-backend.railway.app/api/version`
- API Base: `https://your-backend.railway.app/api`

**Frontend:**
- App: `https://your-app.vercel.app`

---

## 📝 Testing Checklist

### Pre-Testing
- [ ] Backend health endpoint working
- [ ] Frontend URL diketahui
- [ ] Backend URL diketahui
- [ ] Environment variables sudah di-set

### Frontend Testing
- [ ] Frontend load tanpa error
- [ ] Console tidak ada error
- [ ] Network requests berhasil
- [ ] Tidak ada CORS error

### Authentication Testing
- [ ] Login berhasil
- [ ] Token disimpan
- [ ] Protected routes accessible setelah login
- [ ] Logout berhasil

### API Testing
- [ ] GET requests berhasil
- [ ] POST requests berhasil
- [ ] PUT/PATCH requests berhasil
- [ ] DELETE requests berhasil
- [ ] Error handling proper

### Full Stack Testing
- [ ] Data flow dari backend ke frontend
- [ ] User actions trigger API calls
- [ ] UI update setelah API success
- [ ] Error messages ditampilkan dengan benar

---

## 🎉 Success Criteria

Deployment berhasil jika:
- ✅ Frontend load tanpa error
- ✅ Login berhasil
- ✅ API calls berhasil
- ✅ Tidak ada CORS error
- ✅ Data load dan display dengan benar
- ✅ Create/Update/Delete operations working

---

**Setelah semua testing berhasil, aplikasi full stack sudah siap digunakan! 🚀**

