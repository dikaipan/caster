# 🌱 Seed Database di Railway

Panduan untuk mengisi database Railway dengan data awal (seed data).

---

## 🔍 Masalah

Database di Railway sudah ada tabel-tabelnya (setelah migrations), tapi masih kosong (tidak ada data).

---

## ✅ Solusi: Run Seed Data

### Step 1: Buka Railway Shell

1. **Railway Dashboard** → Service "casper" (backend)
2. **Tab "Shell"**
3. Tunggu shell ready

### Step 2: Run Seed Script

Di Railway Shell, jalankan:

```bash
npm run prisma:seed
```

**Expected output:**
```
✅ Seed data created successfully!
```

### Step 3: Verifikasi Data

**Cek apakah data sudah terisi:**

```bash
# Cek users (jika ada seed untuk users)
# Atau cek tabel lain yang di-seed
```

---

## 📋 Step-by-Step

### 1. Buka Railway Shell

1. Railway Dashboard → Service "casper" (backend)
2. Klik tab **"Shell"**
3. Tunggu shell ready

### 2. Run Seed

```bash
npm run prisma:seed
```

### 3. Cek Logs

Setelah seed berhasil, cek logs untuk melihat data apa saja yang dibuat.

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'ts-node'"

**Solusi:**
```bash
# Install dependencies
npm install
```

### Error: "Seed script not found"

**Solusi:**
1. Pastikan `prisma:seed` script ada di `package.json`
2. Pastikan `seed.ts` file ada di `prisma/` folder

### Error: "Database connection failed"

**Solusi:**
1. Pastikan `DATABASE_URL` sudah di-set di Railway Variables
2. Pastikan database service running
3. Pastikan migrations sudah di-run

### Seed Berhasil Tapi Data Tidak Muncul

**Solusi:**
1. Cek apakah seed script benar-benar insert data
2. Cek apakah ada error di seed script
3. Cek database langsung (jika bisa akses)

---

## 📝 Catatan Penting

1. **Seed hanya perlu di-run sekali** setelah migrations
2. **Seed akan membuat data awal** seperti:
   - Default users
   - Default configurations
   - Sample data (jika ada)

3. **Jangan run seed berulang kali** jika seed tidak handle duplicate data

---

## ✅ Checklist

- [ ] Migrations sudah di-run
- [ ] Tabel sudah dibuat
- [ ] Seed script di-run
- [ ] Data sudah terisi
- [ ] Verifikasi data di database

---

## 🎯 Quick Command

```bash
# Di Railway Shell
npm run prisma:seed
```

---

**Setelah seed di-run, database akan terisi dengan data awal! 🌱**

