# 🚀 Apply RETURN_SHIPPED Removal Migration - Langkah Cepat

## Status
- ✅ Migration file sudah siap
- ✅ Code changes sudah selesai
- ⏳ MySQL perlu di-restart untuk apply migration

## Langkah-langkah Apply Migration

### 1. Pastikan MySQL Berjalan dengan Stabil

**Di XAMPP Control Panel:**
1. Stop MySQL (jika running)
2. Tunggu 5 detik
3. Start MySQL lagi
4. Pastikan status hijau (Running) dan tidak ada error

### 2. Test Koneksi MySQL

Buka Command Prompt atau PowerShell dan test:

```powershell
C:\xampp\mysql\bin\mysql.exe -u root -e "SELECT VERSION();"
```

Jika berhasil, lanjut ke step 3.

### 3. Apply Migration

**Opsi A: Menggunakan Prisma (Recommended)**

```powershell
cd backend
npx prisma migrate dev
```

**Opsi B: Manual SQL (Jika Prisma gagal)**

```powershell
cd backend
C:\xampp\mysql\bin\mysql.exe -u root hcm_mysql_dev
```

Kemudian jalankan SQL:

```sql
-- Step 1: Update RETURN_SHIPPED tickets to CLOSED
UPDATE problem_tickets 
SET status = 'CLOSED',
    updated_at = NOW()
WHERE status = 'RETURN_SHIPPED';

-- Step 2: Remove RETURN_SHIPPED from enum
ALTER TABLE problem_tickets 
MODIFY COLUMN status ENUM('OPEN', 'IN_DELIVERY', 'RECEIVED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN';
```

### 4. Generate Prisma Client

```powershell
npx prisma generate
```

### 5. Verifikasi

```sql
-- Check if any RETURN_SHIPPED tickets remain (should return 0)
SELECT COUNT(*) FROM problem_tickets WHERE status = 'RETURN_SHIPPED';

-- Check enum values (should not include RETURN_SHIPPED)
SHOW COLUMNS FROM problem_tickets WHERE Field = 'status';
```

## Troubleshooting

### Jika MySQL tidak bisa connect:
1. Restart MySQL di XAMPP Control Panel
2. Tunggu 10-15 detik setelah start
3. Cek error log: `C:\xampp\mysql\data\*.err`
4. Pastikan tidak ada error di XAMPP Control Panel

### Jika Prisma migrate gagal:
1. Gunakan manual SQL (Opsi B)
2. Atau copy SQL dari: `backend/prisma/migrations/20251214025557_remove_return_shipped_status/migration.sql`
3. Jalankan langsung di MySQL

### Jika ALTER TABLE gagal:
- Pastikan tidak ada ticket dengan status RETURN_SHIPPED
- Pastikan MySQL tidak dalam read-only mode
- Cek apakah enum sudah diupdate sebelumnya

## Setelah Migration Berhasil

1. ✅ Restart backend server
2. ✅ Test aplikasi
3. ✅ Pastikan tidak ada error
4. ✅ Verifikasi status transitions bekerja (RESOLVED → CLOSED)

## Files Migration

- Migration SQL: `backend/prisma/migrations/20251214025557_remove_return_shipped_status/migration.sql`
- Manual script: `backend/scripts/apply-migration-manual.ps1`

