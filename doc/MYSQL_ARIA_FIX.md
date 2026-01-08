# 🔧 MySQL Aria Engine Error - Fixed

## Masalah
MySQL gagal start dengan error:
- `aria_log.00000002` not found
- Aria engine: log initialization failed
- Plugin 'Aria' registration failed
- Failed to initialize plugins

## Solusi yang Diterapkan
✅ **`skip-aria` ditambahkan ke `my.ini`**
- MySQL akan skip Aria engine initialization
- Aria tables tidak akan digunakan, tapi MySQL bisa start
- InnoDB dan MyISAM tables tetap berfungsi normal

## Langkah Selanjutnya

### 1. Start MySQL
- Buka XAMPP Control Panel
- Klik "Start" pada MySQL
- Tunggu 10-15 detik

### 2. Test Koneksi
```powershell
C:\xampp\mysql\bin\mysql.exe -u root
```

Jika berhasil, Anda akan masuk ke MySQL prompt.

### 3. Backup Data (PENTING!)
```powershell
C:\xampp\mysql\bin\mysqldump.exe -u root --all-databases > backup_all_databases.sql
```

### 4. Apply Migration
Setelah MySQL stabil, jalankan migration untuk remove RETURN_SHIPPED:

```powershell
C:\xampp\mysql\bin\mysql.exe -u root hcm_mysql_dev < backend\scripts\apply-return-shipped-removal-direct.sql
```

Atau manual:
```powershell
C:\xampp\mysql\bin\mysql.exe -u root hcm_mysql_dev
```

Kemudian:
```sql
UPDATE problem_tickets 
SET status = 'CLOSED', updated_at = NOW()
WHERE status = 'RETURN_SHIPPED';

ALTER TABLE problem_tickets 
MODIFY COLUMN status ENUM('OPEN', 'IN_DELIVERY', 'RECEIVED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN';
```

### 5. Generate Prisma Client
```powershell
cd backend
npx prisma generate
```

## Jika MySQL Masih Gagal Start

### Opsi 1: Cek Error Log
```powershell
Get-Content "C:\xampp\mysql\data\*.err" -Tail 50
```

### Opsi 2: Reinitialize MySQL (EXTREME - Hapus Semua Data!)
**WARNING:** Ini akan menghapus semua data! Hanya lakukan jika semua cara lain gagal dan sudah backup data.

```powershell
# Stop MySQL
# Backup data folder (jika masih bisa)
Copy-Item "C:\xampp\mysql\data" -Destination "C:\xampp\mysql\data_backup" -Recurse

# Hapus semua file di data folder (kecuali backup)
Remove-Item "C:\xampp\mysql\data\*" -Recurse -Force -Exclude "data_backup"

# Reinitialize
cd C:\xampp\mysql\bin
.\mysqld.exe --initialize-insecure --datadir=C:\xampp\mysql\data

# Start MySQL
# Restore data dari backup (jika ada)
```

## Catatan tentang Aria Engine

- **Aria engine** adalah storage engine untuk system tables (seperti `mysql.plugin`)
- Dengan `skip-aria`, MySQL akan menggunakan InnoDB atau MyISAM untuk system tables
- **Aplikasi Anda tidak terpengaruh** karena menggunakan InnoDB
- Jika ada Aria tables di database, mereka tidak akan bisa diakses (tapi biasanya tidak ada)

## Setelah Semua Selesai

1. ✅ Backup data
2. ✅ Apply migration
3. ✅ Generate Prisma client
4. ✅ Test aplikasi
5. ⚠️ **Hapus `skip-grant-tables` dari `my.ini`** (untuk keamanan)
6. ⚠️ **Setelah semua repair, hapus `innodb_force_recovery`** (untuk normal operation)

## File Config Saat Ini

- Config: `C:\xampp\mysql\bin\my.ini`
- Backup: `C:\xampp\mysql\bin\my.ini.backup.*`
- Settings aktif:
  - `innodb_force_recovery = 4`
  - `skip-grant-tables`
  - `skip-name-resolve`
  - `skip-slave-start`
  - `skip-aria` (baru ditambahkan)

