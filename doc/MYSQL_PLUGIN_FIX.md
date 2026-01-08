# 🔧 MySQL Plugin Initialization Error - Fixed

## Masalah
MySQL gagal start dengan error:
- `Failed to initialize plugins`
- `Aborting`

## Solusi yang Diterapkan
✅ **Plugin loading dinonaktifkan:**
- `skip-plugin-dir` - Skip plugin directory
- `loose-skip-plugin-load` - Skip plugin loading errors
- `skip-aria` - Skip Aria engine (sudah ada sebelumnya)
- `skip-grant-tables` - Bypass authentication (sudah ada sebelumnya)

## Langkah Selanjutnya

### 1. Start MySQL
- Buka XAMPP Control Panel
- Klik "Start" pada MySQL
- **Tunggu 15-20 detik** (lebih lama dari biasa karena recovery mode)

### 2. Test Koneksi
```powershell
C:\xampp\mysql\bin\mysql.exe -u root
```

Jika berhasil, Anda akan masuk ke MySQL prompt (`mysql>`).

### 3. Backup Data (SANGAT PENTING!)
**Lakukan backup segera setelah MySQL start!**

```powershell
C:\xampp\mysql\bin\mysqldump.exe -u root --all-databases > backup_all_databases.sql
```

Atau backup database tertentu:
```powershell
C:\xampp\mysql\bin\mysqldump.exe -u root hcm_mysql_dev > backup_hcm_mysql_dev.sql
```

### 4. Repair Databases
```powershell
C:\xampp\mysql\bin\mysqlcheck.exe -u root --auto-repair --all-databases
```

### 5. Apply Migration (Remove RETURN_SHIPPED)
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

### 6. Generate Prisma Client
```powershell
cd backend
npx prisma generate
```

## Jika MySQL Masih Gagal Start

### Opsi 1: Cek Error Log Detail
```powershell
Get-Content "C:\xampp\mysql\data\*.err" -Tail 100
```

### Opsi 2: Reinitialize MySQL (EXTREME - Hapus Semua Data!)
**WARNING:** Ini akan menghapus semua data! Hanya lakukan jika:
- Semua cara lain gagal
- Sudah backup data (jika masih bisa)
- Siap kehilangan semua data

```powershell
# 1. Stop MySQL di XAMPP Control Panel

# 2. Backup data folder (jika masih bisa)
Copy-Item "C:\xampp\mysql\data" -Destination "C:\xampp\mysql\data_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')" -Recurse -ErrorAction SilentlyContinue

# 3. Hapus semua file di data folder
Remove-Item "C:\xampp\mysql\data\*" -Recurse -Force -Exclude "data_backup*"

# 4. Reinitialize MySQL
cd C:\xampp\mysql\bin
.\mysqld.exe --initialize-insecure --datadir=C:\xampp\mysql\data

# 5. Start MySQL di XAMPP Control Panel

# 6. Restore data dari backup (jika ada dan masih valid)
```

## Setelah Semua Selesai - Normalisasi Config

**PENTING:** Setelah semua repair dan migration selesai, normalisasi config untuk keamanan dan performa:

1. **Buka `C:\xampp\mysql\bin\my.ini`**

2. **Hapus atau comment baris berikut:**
   - `skip-grant-tables` (untuk keamanan)
   - `skip-plugin-dir` (untuk normal plugin loading)
   - `loose-skip-plugin-load` (untuk normal plugin loading)
   - `skip-aria` (jika tidak ada Aria tables)
   - `innodb_force_recovery = 4` (untuk normal operation)

3. **Save file**

4. **Restart MySQL**

## Config Saat Ini

**Settings aktif di `my.ini`:**
- `innodb_force_recovery = 4` (recovery mode)
- `skip-grant-tables` (bypass authentication)
- `skip-name-resolve` (skip DNS)
- `skip-slave-start` (skip replication)
- `skip-aria` (skip Aria engine)
- `skip-plugin-dir` (skip plugin directory)
- `loose-skip-plugin-load` (skip plugin loading errors)

**Semua settings ini untuk recovery mode.**
**Setelah recovery selesai, hapus semua kecuali yang diperlukan.**

## Troubleshooting

### MySQL start tapi tidak bisa connect:
- Pastikan MySQL benar-benar running (hijau di XAMPP)
- Tunggu lebih lama (20-30 detik)
- Cek port: `netstat -ano | findstr :3306`
- Coba restart MySQL sekali lagi

### Backup gagal:
- Pastikan MySQL benar-benar running
- Coba backup per database
- Atau export table per table

### Migration gagal:
- Pastikan tidak ada ticket dengan status RETURN_SHIPPED
- Cek enum values: `SHOW COLUMNS FROM problem_tickets WHERE Field = 'status';`
- Pastikan MySQL tidak dalam read-only mode

## File Penting

- Config: `C:\xampp\mysql\bin\my.ini`
- Config backups: `C:\xampp\mysql\bin\my.ini.backup.*`
- Migration SQL: `backend/scripts/apply-return-shipped-removal-direct.sql`
- Error log: `C:\xampp\mysql\data\*.err`

