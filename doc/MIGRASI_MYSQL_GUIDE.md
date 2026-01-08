# 🗄️ Panduan Migrasi dari PostgreSQL ke MySQL

## 📋 Daftar Isi
1. [Persiapan](#persiapan)
2. [Langkah-langkah Migrasi](#langkah-langkah-migrasi)
3. [Troubleshooting](#troubleshooting)
4. [Rollback Plan](#rollback-plan)

---

## 🎯 Persiapan

### 1. Backup Database PostgreSQL (WAJIB!)
```bash
# Backup database PostgreSQL Anda
pg_dump -U username -d database_name > backup_postgresql_$(date +%Y%m%d).sql
```

### 2. Siapkan MySQL Server
- Pastikan MySQL 8.0+ sudah terinstall
- Buat database baru untuk development/testing:
  ```sql
  CREATE DATABASE hcm_mysql_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  ```
- Dapatkan connection string dari tim database:
  ```
  mysql://username:password@host:3306/hcm_mysql_dev
  ```

### 3. Install Dependencies
```bash
cd backend
npm install
# Pastikan @prisma/client sudah terinstall
```

---

## 🚀 Langkah-langkah Migrasi

### Step 1: Backup Schema PostgreSQL
```bash
cd backend/prisma
# Backup schema.prisma yang lama
cp schema.prisma schema.postgresql.backup
```

### Step 2: Gunakan Schema MySQL
File `schema.mysql.prisma` sudah dibuat untuk Anda. Sekarang kita akan menggunakannya:

**Opsi A: Ganti sementara (untuk testing)**
```bash
cd backend/prisma
# Backup schema PostgreSQL
cp schema.prisma schema.postgresql.backup
# Ganti dengan schema MySQL
cp schema.mysql.prisma schema.prisma
```

**Opsi B: Gunakan dengan flag (lebih aman)**
```bash
# Gunakan schema.mysql.prisma langsung tanpa mengganti file utama
# (akan dijelaskan di step berikutnya)
```

### Step 3: Update Environment Variable
Buat atau edit file `backend/.env`:
```env
# Ganti DATABASE_URL ke MySQL
DATABASE_URL="mysql://username:password@host:3306/hcm_mysql_dev"
```

**PENTING:** Jangan hapus connection string PostgreSQL yang lama! Simpan di file terpisah atau comment.

### Step 4: Generate Prisma Client untuk MySQL
```bash
cd backend
npx prisma generate --schema=prisma/schema.mysql.prisma
```

### Step 5: Buat Migrasi Awal untuk MySQL
```bash
cd backend
# Buat migration baru untuk MySQL
npx prisma migrate dev --name init_mysql --schema=prisma/schema.mysql.prisma
```

**Catatan:** Ini akan membuat semua tabel di MySQL dari awal. Database MySQL harus kosong.

### Step 6: Seed Data (Master Data)
Jalankan seed untuk membuat master data (banks, pengelola, cassette types, users):
```bash
cd backend
npx ts-node prisma/seed.ts
```

Ini akan membuat:
- Cassette Types (RB, AB, URJB)
- Hitachi Users (admin, rc_manager, rc_staff_1)
- Bank Customers (BNI)
- Pengelola/Vendors (TAG, ADV)
- Sample Machines (2) dan Cassettes (15)

### Step 7: Import Data dari PostgreSQL (Jika Ada)
Jika Anda punya data di PostgreSQL yang perlu di-migrate:

**Setup connection string PostgreSQL:**
Tambahkan ke `backend/.env`:
```env
POSTGRES_DATABASE_URL=postgresql://user:password@localhost:5432/database_name
```

**Jalankan script migrasi:**
```bash
cd backend
npm run migrate:postgresql-to-mysql
```

Script akan:
- Export semua machines dan cassettes dari PostgreSQL
- Import ke MySQL dengan mempertahankan UUID
- Menampilkan summary hasil migrasi

### Step 8: Import Data dari Excel (1600 Mesin)
Jika Anda punya file Excel dengan 1600 mesin (10 cassettes per mesin):

**Pastikan file Excel ada di:**
- `backend/data/Progres APK SN kaset BNI 1600 mesin (1600) FIX (1).xlsx`
- Atau `backend/data/BNI_CASSETTE_COMPLETE.xlsx`

**Jalankan import:**
```bash
cd backend
npm run import:excel-mysql BNI VND-TAG-001
```

Atau dengan path file spesifik:
```bash
npm run import:excel-mysql BNI VND-TAG-001 "data/Progres APK SN kaset BNI 1600 mesin (1600) FIX (1).xlsx"
```

**Fitur script:**
- ✅ Batch processing (50 mesin per batch) untuk menghindari timeout
- ✅ Transaction per mesin untuk memastikan 10 cassettes tidak tertukar
- ✅ Validasi: setiap mesin harus punya tepat 10 cassettes
- ✅ Progress tracking per batch
- ✅ Error handling yang baik

**Format Excel yang diharapkan:**
- Kolom: `SN Mesin`, `SN Kaset`, `SN Kaset Cadangan`, `Tipe Kaset`
- Setiap mesin: 5 baris (masing-masing 2 cassettes = 10 total)
  - Baris 1: 1 MAIN + 1 BACKUP
  - Baris 2: 1 MAIN + 1 BACKUP
  - Baris 3: 1 MAIN + 1 BACKUP
  - Baris 4: 1 MAIN + 1 BACKUP
  - Baris 5: 1 MAIN + 1 BACKUP

### Step 9: Verifikasi Data
Setelah import, verifikasi data:
```bash
cd backend
npx ts-node scripts/check-data.ts
```

Seharusnya menampilkan:
- Machines: 1600 (atau sesuai data yang di-import)
- Cassettes: 16000 (1600 × 10)

### Step 10: Test Backend dengan MySQL
```bash
cd backend
npm run start:dev
```

Test beberapa endpoint:
- Login: `POST /api/auth/login`
- Get Banks: `GET /api/banks`
- Get Machines: `GET /api/machines`
- Get Cassettes: `GET /api/cassettes`

---

## 📦 Script Import yang Tersedia

### 1. Import dari PostgreSQL ke MySQL
```bash
npm run migrate:postgresql-to-mysql
```
**Requires:** `POSTGRES_DATABASE_URL` di `.env`

### 2. Import dari Excel (1600 Mesin)
```bash
npm run import:excel-mysql BNI VND-TAG-001
```
**File:** `backend/data/Progres APK SN kaset BNI 1600 mesin (1600) FIX (1).xlsx`

### 3. Import dari JSON (5 Mesin Sample)
```bash
npm run import:machine-cassettes data/machine-cassettes.json BNI VND-TAG-001
```

### 4. Kosongkan Data (Hapus Semua)
```bash
npm run delete:machines-cassettes
```
**⚠️ WARNING:** Ini akan menghapus SEMUA machines, cassettes, dan data terkait!

### 5. Cek Data
```bash
npx ts-node scripts/check-data.ts
```

## 🔄 Alternatif: Menggunakan Script Helper

Saya akan membuat script helper untuk memudahkan migrasi. Tapi untuk sekarang, ikuti langkah manual di atas dulu.

---

## ⚠️ Troubleshooting

### Error: "Unknown type UUID"
**Solusi:** Pastikan semua `@db.Uuid` sudah diganti menjadi `@db.Char(36)` di `schema.mysql.prisma`.

### Error: "Table already exists"
**Solusi:** 
```bash
# Hapus semua tabel di MySQL (HATI-HATI! Hanya untuk dev)
# Atau gunakan database baru
DROP DATABASE hcm_mysql_dev;
CREATE DATABASE hcm_mysql_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Error: "Connection refused"
**Solusi:** 
- Pastikan MySQL server running
- Check connection string di `.env`
- Test koneksi dengan:
  ```bash
  mysql -u username -p -h host database_name
  ```

### Error: "Invalid default value for 'created_at'"
**Solusi:** MySQL mungkin butuh default value yang eksplisit. Pastikan `@default(now())` sudah ada di semua field `createdAt`.

### Error: "Column 'xxx' cannot be null"
**Solusi:** Pastikan semua field required sudah punya default value atau tidak nullable.

---

## 🔙 Rollback Plan

Jika migrasi gagal atau ada masalah:

### 1. Kembalikan Schema PostgreSQL
```bash
cd backend/prisma
cp schema.postgresql.backup schema.prisma
```

### 2. Update DATABASE_URL ke PostgreSQL
```env
DATABASE_URL="postgresql://username:password@host:5432/database_name"
```

### 3. Regenerate Prisma Client
```bash
cd backend
npx prisma generate
```

### 4. Restart Backend
```bash
npm run start:dev
```

---

## 📝 Checklist Migrasi

### Persiapan
- [ ] Backup database PostgreSQL
- [ ] Backup `schema.prisma` (PostgreSQL)
- [ ] MySQL server sudah siap (XAMPP/phpMyAdmin)
- [ ] Database MySQL sudah dibuat (`hcm_mysql_dev`)
- [ ] Connection string MySQL sudah di-set di `.env`
- [ ] `schema.mysql.prisma` sudah dibuat

### Migrasi Schema
- [ ] Prisma client sudah di-generate untuk MySQL
- [ ] Migration sudah dijalankan (`npx prisma migrate dev`)
- [ ] Tidak ada error saat migration

### Data
- [ ] Seed data sudah dijalankan (`npx ts-node prisma/seed.ts`)
- [ ] Data dari PostgreSQL sudah di-migrate (jika ada)
- [ ] Data dari Excel sudah di-import (1600 mesin)
- [ ] Verifikasi data: `npx ts-node scripts/check-data.ts`
  - [ ] Machines: 1600
  - [ ] Cassettes: 16000 (1600 × 10)
  - [ ] Relasi mesin-kaset sudah benar (tidak tertukar)

### Testing
- [ ] Backend bisa start tanpa error
- [ ] Test login: `POST /api/auth/login`
- [ ] Test beberapa endpoint API
- [ ] Test CRUD operations (Create, Read, Update, Delete)
- [ ] Test authentication & authorization
- [ ] Test semua fitur utama (Tickets, Repairs, PM, Warranty)
- [ ] Test import/export data

---

## 🎓 Tips & Best Practices

1. **Jangan langsung migrasi production!** Test dulu di development/staging environment.

2. **Gunakan Git Branch:**
   ```bash
   git checkout -b feat/migrate-to-mysql
   ```

3. **Simpan kedua schema:**
   - `schema.prisma` → untuk PostgreSQL (production saat ini)
   - `schema.mysql.prisma` → untuk MySQL (migrasi)

4. **Test secara menyeluruh** sebelum deploy ke production.

5. **Monitor performance** setelah migrasi. MySQL mungkin punya karakteristik berbeda dari PostgreSQL.

---

## 📞 Butuh Bantuan?

Jika ada error atau pertanyaan:
1. Check error message dengan detail
2. Cek log backend (`npm run start:dev`)
3. Cek log MySQL server
4. Dokumentasikan error yang terjadi

---

## ✅ Setelah Migrasi Berhasil

1. **Verifikasi Data:**
   ```bash
   # Cek jumlah data
   npx ts-node scripts/check-data.ts
   
   # Verifikasi relasi mesin-kaset
   npx ts-node scripts/check-machine-cassette-links.ts
   ```

2. **Update dokumentasi deployment**
3. **Update environment variables di server production**
4. **Update CI/CD pipeline (jika ada)**
5. **Informasikan tim tentang perubahan database**
6. **Monitor aplikasi selama beberapa hari pertama**

## 🗑️ Mengosongkan Data (Jika Perlu)

Jika Anda perlu menghapus semua data machines dan cassettes:

```bash
cd backend
npm run delete:machines-cassettes
```

**⚠️ PERINGATAN:**
- Ini akan menghapus SEMUA machines, cassettes, dan data terkait
- Repair tickets, PM, deliveries, returns juga akan dihapus
- Problem tickets akan di-update (cassetteId dan machineId menjadi null)
- **Tindakan ini tidak dapat dibatalkan!**

**Setelah dikosongkan, Anda bisa:**
- Import ulang dari PostgreSQL: `npm run migrate:postgresql-to-mysql`
- Import dari Excel: `npm run import:excel-mysql BNI VND-TAG-001`
- Import dari JSON: `npm run import:machine-cassettes data/machine-cassettes.json BNI VND-TAG-001`

---

**Selamat Migrasi! 🚀**

