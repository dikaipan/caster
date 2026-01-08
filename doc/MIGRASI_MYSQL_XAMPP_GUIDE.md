# 🗄️ Panduan Migrasi ke MySQL dengan XAMPP & phpMyAdmin

## 📋 Daftar Isi
1. [Persiapan XAMPP](#persiapan-xampp)
2. [Setup Database di phpMyAdmin](#setup-database-di-phpmyadmin)
3. [Langkah-langkah Migrasi](#langkah-langkah-migrasi)
4. [Troubleshooting XAMPP](#troubleshooting-xampp)
5. [Rollback Plan](#rollback-plan)

---

## 🎯 Persiapan XAMPP

### 1. Pastikan XAMPP Running
1. Buka **XAMPP Control Panel**
2. Pastikan **MySQL** service sudah **Running** (hijau)
3. Jika belum running, klik **Start** pada MySQL

### 2. Akses phpMyAdmin
1. Buka browser
2. Akses: `http://localhost/phpmyadmin`
3. Login dengan:
   - **Username**: `root`
   - **Password**: (kosong default, atau sesuai setting Anda)

---

## 🗄️ Setup Database di phpMyAdmin

### Step 1: Buat Database Baru

1. Di phpMyAdmin, klik tab **"Databases"** (di menu atas)
2. Di bagian **"Create database"**:
   - **Database name**: `hcm_mysql_dev` (atau nama lain sesuai kebutuhan)
   - **Collation**: Pilih `utf8mb4_unicode_ci` (PENTING!)
3. Klik **"Create"**

**Catatan:** Collation `utf8mb4_unicode_ci` penting untuk support emoji dan karakter unicode.

### Step 2: Catat Informasi Koneksi

Setelah database dibuat, catat informasi berikut:
- **Host**: `localhost` (atau `127.0.0.1`)
- **Port**: `3306` (default XAMPP)
- **Database**: `hcm_mysql_dev` (nama database yang baru dibuat)
- **Username**: `root` (default XAMPP)
- **Password**: (kosong atau sesuai setting Anda)

**Connection String Format:**
```
mysql://root:@localhost:3306/hcm_mysql_dev
```
atau jika ada password:
```
mysql://root:password@localhost:3306/hcm_mysql_dev
```

---

## 🚀 Langkah-langkah Migrasi

### Step 1: Backup Database PostgreSQL (WAJIB!)

Sebelum migrasi, backup database PostgreSQL Anda:
```bash
# Jika menggunakan pg_dump
pg_dump -U username -d database_name > backup_postgresql_$(date +%Y%m%d).sql
```

### Step 2: Backup Schema PostgreSQL

```bash
cd backend/prisma
# Backup schema.prisma yang lama
cp schema.prisma schema.postgresql.backup
```

### Step 3: Update Environment Variable

Edit file `backend/.env`:

**Sebelum (PostgreSQL):**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/database_name"
```

**Sesudah (MySQL XAMPP):**
```env
# MySQL XAMPP (Development)
DATABASE_URL="mysql://root:@localhost:3306/hcm_mysql_dev"

# Atau jika ada password:
# DATABASE_URL="mysql://root:password@localhost:3306/hcm_mysql_dev"
```

**PENTING:** 
- Jangan hapus connection string PostgreSQL yang lama! 
- Comment saja atau simpan di file terpisah untuk rollback.

### Step 4: Generate Prisma Client untuk MySQL

```bash
cd backend
npx prisma generate --schema=prisma/schema.mysql.prisma
```

**Expected Output:**
```
✔ Generated Prisma Client (x.x.x) to ./node_modules/@prisma/client in xxxms
```

### Step 5: Buat Migration untuk MySQL

```bash
cd backend
npx prisma migrate dev --name init_mysql --schema=prisma/schema.mysql.prisma
```

**Apa yang terjadi:**
- Prisma akan membuat semua tabel di database MySQL
- Migration file akan dibuat di `prisma/migrations/`
- Database akan di-populate dengan struktur tabel

**Verifikasi di phpMyAdmin:**
1. Refresh phpMyAdmin
2. Klik database `hcm_mysql_dev` di sidebar kiri
3. Anda akan melihat semua tabel sudah dibuat:
   - `customers_banks`
   - `pengelola`
   - `machines`
   - `cassettes`
   - `problem_tickets`
   - `repair_tickets`
   - `preventive_maintenances`
   - dll.

### Step 6: Seed Data (Master Data)

Jalankan seed untuk membuat master data (banks, pengelola, cassette types, users):
```bash
cd backend
npx ts-node prisma/seed.ts
```

**Verifikasi di phpMyAdmin:**
- Cek beberapa tabel untuk memastikan data sudah ter-seed
- Contoh: cek tabel `cassette_types`, `hitachi_users`, `customers_banks`, dll.

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

**Fitur script:**
- ✅ Batch processing (50 mesin per batch) untuk menghindari timeout
- ✅ Transaction per mesin untuk memastikan 10 cassettes tidak tertukar
- ✅ Validasi: setiap mesin harus punya tepat 10 cassettes
- ✅ Progress tracking per batch

**Verifikasi di phpMyAdmin:**
1. Refresh phpMyAdmin
2. Klik database `hcm_mysql_dev`
3. Klik tabel `machines` → **"Browse"**
4. Seharusnya ada 1600 mesin
5. Klik tabel `cassettes` → **"Browse"**
6. Seharusnya ada 16000 cassettes (1600 × 10)

**Query untuk verifikasi:**
```sql
-- Jumlah mesin
SELECT COUNT(*) as total_machines FROM machines;

-- Jumlah cassettes
SELECT COUNT(*) as total_cassettes FROM cassettes;

-- Mesin dengan jumlah cassettes
SELECT 
    m.serial_number_manufacturer,
    COUNT(c.id) as cassette_count
FROM machines m
LEFT JOIN cassettes c ON c.machine_id = m.id
GROUP BY m.id, m.serial_number_manufacturer
HAVING COUNT(c.id) != 10;
-- Seharusnya tidak ada hasil (semua mesin punya 10 cassettes)
```

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

**Test beberapa endpoint:**
1. **Health Check**: `GET http://localhost:3000/api/`
2. **Login**: `POST http://localhost:3000/api/auth/login`
3. **Get Banks**: `GET http://localhost:3000/api/banks` (butuh auth token)
4. **Get Cassettes**: `GET http://localhost:3000/api/cassettes` (butuh auth token)

---

## ⚠️ Troubleshooting XAMPP

### Error: "Access denied for user 'root'@'localhost'"

**Solusi:**
1. Buka XAMPP Control Panel
2. Klik **"Config"** di MySQL → **"my.ini"**
3. Atau edit file: `C:\xampp\mysql\bin\my.ini`
4. Cari section `[mysqld]`
5. Pastikan tidak ada `skip-grant-tables` (jika ada, comment dengan `#`)
6. Restart MySQL di XAMPP Control Panel

**Alternatif:**
- Reset password MySQL di phpMyAdmin
- Atau gunakan user lain yang sudah ada

### Error: "Can't connect to MySQL server on 'localhost'"

**Solusi:**
1. Pastikan MySQL service **Running** di XAMPP Control Panel
2. Check port 3306 tidak digunakan aplikasi lain:
   ```bash
   netstat -ano | findstr :3306
   ```
3. Restart MySQL di XAMPP

### Error: "Unknown database 'hcm_mysql_dev'"

**Solusi:**
1. Buka phpMyAdmin
2. Buat database `hcm_mysql_dev` (lihat Step 1 di atas)
3. Pastikan nama database sama persis dengan di `DATABASE_URL`

### Error: "Table already exists"

**Solusi:**
1. Buka phpMyAdmin
2. Pilih database `hcm_mysql_dev`
3. Klik **"Operations"** tab
4. Scroll ke bawah, klik **"Drop the database"**
5. Buat database baru lagi
6. Jalankan migration lagi

**ATAU** hapus tabel yang konflik secara manual di phpMyAdmin.

### Error: "Invalid default value for 'created_at'"

**Solusi:**
Ini biasanya terjadi karena MySQL strict mode. Edit `my.ini`:
1. Buka `C:\xampp\mysql\bin\my.ini`
2. Cari `sql_mode`
3. Ubah menjadi:
   ```ini
   sql_mode = "NO_ENGINE_SUBSTITUTION"
   ```
4. Restart MySQL

### Error: "Connection timeout"

**Solusi:**
1. Check firewall Windows tidak memblokir port 3306
2. Pastikan XAMPP MySQL service running
3. Test koneksi dengan:
   ```bash
   mysql -u root -h localhost -P 3306
   ```

### Error: "Prisma schema validation error"

**Solusi:**
1. Pastikan menggunakan `schema.mysql.prisma` (bukan `schema.prisma`)
2. Check semua `@db.Uuid` sudah diganti menjadi `@db.Char(36)`
3. Pastikan provider di datasource adalah `mysql`

---

## 🔙 Rollback Plan

Jika migrasi gagal atau ada masalah:

### 1. Kembalikan Schema PostgreSQL
```bash
cd backend/prisma
cp schema.postgresql.backup schema.prisma
```

### 2. Update DATABASE_URL ke PostgreSQL
Edit `backend/.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/database_name"
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

## 📝 Checklist Migrasi XAMPP

### Persiapan
- [ ] XAMPP MySQL service sudah running
- [ ] phpMyAdmin bisa diakses (`http://localhost/phpmyadmin`)
- [ ] Database `hcm_mysql_dev` sudah dibuat di phpMyAdmin
- [ ] Collation database: `utf8mb4_unicode_ci`
- [ ] Backup database PostgreSQL sudah dilakukan
- [ ] Backup `schema.prisma` (PostgreSQL) sudah dilakukan

### Migrasi Schema
- [ ] `DATABASE_URL` di `.env` sudah di-update ke MySQL
- [ ] Prisma client sudah di-generate untuk MySQL
- [ ] Migration sudah dijalankan
- [ ] Tabel sudah muncul di phpMyAdmin

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
- [ ] Test beberapa endpoint API berhasil
- [ ] Test CRUD operations (Create, Read, Update, Delete)
- [ ] Test authentication & authorization
- [ ] Test semua fitur utama (Tickets, Repairs, PM, Warranty)

---

## 🎓 Tips & Best Practices untuk XAMPP

### 1. Backup Database MySQL secara Berkala

**Via phpMyAdmin:**
1. Pilih database `hcm_mysql_dev`
2. Klik tab **"Export"**
3. Pilih **"Quick"** atau **"Custom"**
4. Klik **"Go"** untuk download SQL file

**Via Command Line:**
```bash
# Di folder XAMPP MySQL bin
cd C:\xampp\mysql\bin
mysqldump -u root -p hcm_mysql_dev > backup_$(date +%Y%m%d).sql
```

### 2. Optimasi MySQL untuk Development

Edit `C:\xampp\mysql\bin\my.ini`:
```ini
[mysqld]
# Increase max connections
max_connections = 200

# Increase buffer sizes untuk development
innodb_buffer_pool_size = 256M
```

Restart MySQL setelah edit.

### 3. Monitoring Database

Gunakan phpMyAdmin untuk:
- Monitor query performance
- Check table sizes
- View database structure
- Run custom SQL queries

### 4. Security untuk Production

**PENTING:** XAMPP default tidak aman untuk production!

Jika akan deploy ke production:
- Jangan gunakan user `root` tanpa password
- Buat user khusus dengan password kuat
- Batasi privileges user
- Enable SSL jika memungkinkan
- Gunakan MySQL server yang proper (bukan XAMPP)

---

## 🔍 Verifikasi Setelah Migrasi

### 1. Check Tabel di phpMyAdmin

1. Buka phpMyAdmin
2. Pilih database `hcm_mysql_dev`
3. Pastikan semua tabel ada:
   - `customers_banks`
   - `pengelola`
   - `pengelola_users`
   - `hitachi_users`
   - `machines`
   - `cassettes`
   - `cassette_types`
   - `problem_tickets`
   - `repair_tickets`
   - `preventive_maintenances`
   - `warranty_configurations`
   - `refresh_tokens`
   - dll.

### 2. Check Struktur Tabel

Klik salah satu tabel → tab **"Structure"**:
- Pastikan field `id` bertipe `char(36)` (bukan `uuid`)
- Pastikan semua foreign key ada
- Pastikan indexes sudah dibuat

### 3. Test Query di phpMyAdmin

Coba query sederhana:
```sql
SELECT COUNT(*) FROM customers_banks;
SELECT COUNT(*) FROM cassettes;
SELECT COUNT(*) FROM machines;
```

### 4. Test dari Backend

```bash
# Start backend
cd backend
npm run start:dev

# Test di browser atau Postman
GET http://localhost:3000/api/
```

---

## 📞 Butuh Bantuan?

Jika ada error atau pertanyaan:
1. Check error message dengan detail
2. Cek log backend (`npm run start:dev`)
3. Cek log MySQL di XAMPP Control Panel → MySQL → Logs
4. Dokumentasikan error yang terjadi
5. Screenshot error di phpMyAdmin jika ada

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

## ✅ Setelah Migrasi Berhasil

1. ✅ **Verifikasi Data:**
   ```bash
   # Cek jumlah data
   npx ts-node scripts/check-data.ts
   ```

2. ✅ Test semua fitur aplikasi
3. ✅ Monitor performance
4. ✅ Backup database MySQL secara berkala (via phpMyAdmin → Export)
5. ✅ Update dokumentasi deployment
6. ✅ Informasikan tim tentang perubahan database

---

**Selamat Migrasi dengan XAMPP! 🚀**

**Catatan:** Panduan ini untuk development environment. Untuk production, gunakan MySQL server yang proper dengan security yang lebih ketat.

