# 📋 Apply Migration Manual - RETURN_SHIPPED Removal

## Cara 1: Menggunakan MySQL Command Line

### Step 1: Buka MySQL Command Line

```powershell
C:\xampp\mysql\bin\mysql.exe -u root
```

Atau jika ada password:
```powershell
C:\xampp\mysql\bin\mysql.exe -u root -p
```

### Step 2: Pilih Database

```sql
USE hcm_mysql_dev;
```

### Step 3: Jalankan Migration SQL

Copy dan paste SQL dari file: `backend/scripts/apply-migration.sql`

Atau jalankan langsung:

```sql
-- Update RETURN_SHIPPED tickets to CLOSED
UPDATE problem_tickets 
SET status = 'CLOSED',
    updated_at = NOW()
WHERE status = 'RETURN_SHIPPED';

-- Remove RETURN_SHIPPED from enum
ALTER TABLE problem_tickets 
MODIFY COLUMN status ENUM('OPEN', 'IN_DELIVERY', 'RECEIVED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN';
```

### Step 4: Verifikasi

```sql
-- Check if any RETURN_SHIPPED tickets remain (should return 0)
SELECT COUNT(*) as return_shipped_count 
FROM problem_tickets 
WHERE status = 'RETURN_SHIPPED';

-- Check enum values
SHOW COLUMNS FROM problem_tickets WHERE Field = 'status';
```

## Cara 2: Menggunakan File SQL

```powershell
C:\xampp\mysql\bin\mysql.exe -u root hcm_mysql_dev < backend\scripts\apply-migration.sql
```

Atau jika ada password:
```powershell
C:\xampp\mysql\bin\mysql.exe -u root -p hcm_mysql_dev < backend\scripts\apply-migration.sql
```

## Cara 3: Setelah MySQL Stabil

Setelah MySQL benar-benar stabil dan bisa connect:

```powershell
cd backend
npx prisma migrate dev
npx prisma generate
```

## Setelah Migration Berhasil

1. Generate Prisma client:
   ```powershell
   npx prisma generate
   ```

2. Restart backend server

3. Test aplikasi

## Troubleshooting

### Jika MySQL tidak bisa connect:
- Pastikan MySQL benar-benar running (hijau di XAMPP)
- Tunggu 10-15 detik setelah start
- Coba restart MySQL lagi

### Jika ALTER TABLE gagal:
- Pastikan tidak ada ticket dengan status RETURN_SHIPPED
- Pastikan MySQL tidak dalam read-only mode
- Cek error message untuk detail

