# 🚨 PENTING: Setup Root Directory di Vercel Dashboard

## ❌ Error yang Terjadi

```
Error: No Next.js version detected.
404: NOT_FOUND
```

## ⚠️ PENYEBAB UTAMA

**Root Directory BELUM di-set di Vercel Dashboard!**

File `vercel.json` tidak cukup. **WAJIB set Root Directory di Dashboard.**

## ✅ Solusi (WAJIB DILAKUKAN)

### **Step 1: Set Root Directory di Vercel Dashboard**

**⚠️ INI WAJIB DILAKUKAN! File vercel.json tidak cukup jika Root Directory tidak di-set di Dashboard.**

1. **Buka Vercel Dashboard**: https://vercel.com/dashboard
2. **Pilih Project** yang error
3. **Settings** → **General**
4. Scroll ke bagian **"Root Directory"**
5. Klik **"Edit"** (atau "Change" / "Configure")
6. **Hapus** text yang ada (jika ada)
7. **Ketik**: `frontend` (tanpa slash, tanpa titik)
8. Klik **"Save"**

### **Step 2: Verifikasi**

Setelah set Root Directory, pastikan:
- ✅ Root Directory = `frontend`
- ✅ Framework Preset = `Next.js` (auto-detect)
- ✅ Build Command = `npm run build` (auto-detect)
- ✅ Output Directory = `.next` (auto-detect)

### **Step 3: Redeploy**

1. **Deployments** → Klik **"..."** pada deployment terbaru
2. Pilih **"Redeploy"**
3. Pastikan **"Use existing Build Cache"** **TIDAK** dicentang
4. Klik **"Redeploy"**

---

## 📸 Screenshot Guide

**Root Directory yang BENAR:**
```
Root Directory: frontend
```

**Root Directory yang SALAH:**
```
Root Directory: (kosong)
Root Directory: /
Root Directory: /frontend
Root Directory: ./frontend
Root Directory: frontend/
```

---

## 🔍 Verifikasi File Structure

Pastikan struktur project seperti ini:
```
hcm/
├── frontend/
│   ├── package.json  ← Next.js ada di sini
│   ├── next.config.js
│   └── src/
├── backend/
└── vercel.json
```

---

## ⚠️ Catatan Penting

1. **Root Directory HARUS di-set di Dashboard** - File `vercel.json` tidak cukup
2. **Set Root Directory SEBELUM deploy pertama kali** - Jika sudah deploy, set lalu Redeploy
3. **Root Directory = `frontend`** (bukan `/frontend` atau `./frontend`)

---

## 🎯 Quick Checklist

- [ ] Root Directory di-set ke `frontend` di Vercel Dashboard
- [ ] Framework Preset = `Next.js` (auto-detect)
- [ ] Build Command = `npm run build` (auto-detect)
- [ ] Output Directory = `.next` (auto-detect)
- [ ] Redeploy setelah set Root Directory

---

**Setelah Root Directory di-set ke `frontend` di Dashboard, error akan hilang! ✅**

