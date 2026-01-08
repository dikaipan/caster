# 🔧 MySQL Recovery - Step by Step Guide

## Status Saat Ini
✅ **Configuration Updated:**
- `innodb_force_recovery = 4` (increased from 3)
- `skip-grant-tables` (bypass authentication)
- `skip-name-resolve` (skip DNS)
- `skip-slave-start` (skip replication)
- Corrupted `aria_log` files deleted

## Langkah 1: Start MySQL

1. **Buka XAMPP Control Panel**
2. **Klik "Start" pada MySQL**
3. **Tunggu 10-15 detik** untuk MySQL initialize
4. **Pastikan status hijau (Running)**

## Langkah 2: Test Koneksi

Buka Command Prompt atau PowerShell dan test:

```powershell
C:\xampp\mysql\bin\mysql.exe -u root
```

Jika berhasil, Anda akan masuk ke MySQL prompt (`mysql>`).

## Langkah 3: Backup Data (PENTING!)

**Setelah MySQL berjalan, backup data segera:**

```powershell
C:\xampp\mysql\bin\mysqldump.exe -u root --all-databases > backup_all_databases.sql
```

Atau jika ingin backup database tertentu:

```powershell
C:\xampp\mysql\bin\mysqldump.exe -u root hcm_mysql_dev > backup_hcm_mysql_dev.sql
```

## Langkah 4: Repair Databases

```powershell
C:\xampp\mysql\bin\mysqlcheck.exe -u root --auto-repair --all-databases
```

Atau database tertentu:

```powershell
C:\xampp\mysql\bin\mysqlcheck.exe -u root --auto-repair hcm_mysql_dev
```

## Langkah 5: Apply Migration (Remove RETURN_SHIPPED)

Setelah MySQL stabil, jalankan migration:

```powershell
C:\xampp\mysql\bin\mysql.exe -u root hcm_mysql_dev
```

Kemudian jalankan SQL:

```sql
-- Update RETURN_SHIPPED tickets to CLOSED
UPDATE problem_tickets 
SET status = 'CLOSED', updated_at = NOW()
WHERE status = 'RETURN_SHIPPED';

-- Remove RETURN_SHIPPED from enum
ALTER TABLE problem_tickets 
MODIFY COLUMN status ENUM('OPEN', 'IN_DELIVERY', 'RECEIVED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN';
```

Atau gunakan file SQL:

```powershell
C:\xampp\mysql\bin\mysql.exe -u root hcm_mysql_dev < backend\scripts\apply-return-shipped-removal-direct.sql
```

## Langkah 6: Generate Prisma Client

```powershell
cd backend
npx prisma generate
```

## Langkah 7: Remove skip-grant-tables (Security)

**PENTING:** Setelah semua repair selesai, hapus `skip-grant-tables` untuk keamanan:

1. Buka `C:\xampp\mysql\bin\my.ini`
2. Cari baris: `skip-grant-tables`
3. Hapus atau comment baris tersebut (tambah `#` di depan)
4. Save file
5. Restart MySQL

## Langkah 8: Remove innodb_force_recovery (Setelah Semua Repair)

**Setelah semua repair selesai dan MySQL berjalan normal:**

1. Buka `C:\xampp\mysql\bin\my.ini`
2. Cari baris: `innodb_force_recovery = 4`
3. Hapus atau comment baris tersebut
4. Save file
5. Restart MySQL

## Troubleshooting

### Jika MySQL masih tidak bisa start:

1. **Cek error log:**
   ```powershell
   Get-Content "C:\xampp\mysql\data\*.err" -Tail 50
   ```

2. **Tingkatkan force recovery ke level 5 atau 6:**
   - Edit `my.ini`
   - Ubah `innodb_force_recovery = 4` menjadi `innodb_force_recovery = 5`
   - Save dan restart MySQL

3. **Pertimbangkan reinitialize MySQL:**
   - **WARNING:** Ini akan menghapus semua data!
   - Hanya lakukan jika semua cara lain gagal
   - Pastikan sudah backup data

### Jika koneksi gagal:

1. Pastikan MySQL benar-benar running (hijau di XAMPP)
2. Tunggu lebih lama (20-30 detik)
3. Cek port 3306: `netstat -ano | findstr :3306`
4. Coba restart MySQL sekali lagi

### Jika repair gagal:

1. Coba repair table per table:
   ```sql
   USE hcm_mysql_dev;
   REPAIR TABLE problem_tickets;
   REPAIR TABLE cassettes;
   -- dll
   ```

2. Atau gunakan `CHECK TABLE` untuk cek corruption:
   ```sql
   CHECK TABLE problem_tickets;
   ```

## Catatan Penting

- ⚠️ **Force recovery mode (level 4) membatasi beberapa operasi** - hanya untuk recovery
- ⚠️ **skip-grant-tables menghilangkan authentication** - hapus setelah repair
- ✅ **Backup data segera setelah MySQL start**
- ✅ **Setelah semua repair, hapus force recovery mode**
- ✅ **Restart MySQL setelah setiap perubahan config**

## File-file Penting

- Config backup: `C:\xampp\mysql\bin\my.ini.backup.*`
- Migration SQL: `backend/scripts/apply-return-shipped-removal-direct.sql`
- Advanced fix script: `backend/scripts/fix-mysql-advanced.ps1`

