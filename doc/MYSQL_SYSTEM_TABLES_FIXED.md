# ✅ MySQL System Tables - Fixed!

## Status
✅ **System tables sudah di-copy dari backup** (88 files)
✅ **MySQL folder sudah dibuat di data directory**

## Langkah Selanjutnya

### 1. Start MySQL di XAMPP Control Panel
- Buka **XAMPP Control Panel**
- Klik **"Start"** pada MySQL
- **Tunggu 15-20 detik** untuk MySQL initialize
- Pastikan status **hijau (Running)**

### 2. Test Koneksi
```powershell
C:\xampp\mysql\bin\mysql.exe -u root
```

Jika berhasil, Anda akan masuk ke MySQL prompt (`mysql>`).

### 3. Create Database
Di MySQL prompt:
```sql
CREATE DATABASE hcm_mysql_dev;
exit;
```

### 4. Run Prisma Migrations
```powershell
cd backend
npx prisma migrate deploy
npx prisma generate
```

### 5. Restore Data dari Backup (Jika Perlu)

**Cek apakah ada database di backup:**
```powershell
Get-ChildItem "C:\xampp\mysql\data_backup_20251214_105949" -Directory | Where-Object {$_.Name -ne "mysql" -and $_.Name -ne "performance_schema" -and $_.Name -ne "sys"}
```

**Jika ada database folder (misalnya `hcm_mysql_dev`), copy:**
```powershell
# Stop MySQL dulu
# Copy database folder
Copy-Item "C:\xampp\mysql\data_backup_20251214_105949\hcm_mysql_dev" -Destination "C:\xampp\mysql\data\hcm_mysql_dev" -Recurse -Force
# Start MySQL lagi
```

**Atau jika ada file SQL backup:**
```powershell
C:\xampp\mysql\bin\mysql.exe -u root hcm_mysql_dev < backup.sql
```

### 6. Apply Migration (Remove RETURN_SHIPPED)
```powershell
cd backend
npx prisma migrate dev
```

Atau manual:
```powershell
C:\xampp\mysql\bin\mysql.exe -u root hcm_mysql_dev < backend\scripts\apply-return-shipped-removal-direct.sql
```

## Troubleshooting

### Jika MySQL tidak bisa start:
1. Cek error log: `C:\xampp\mysql\data\*.err`
2. Pastikan system tables sudah ada: `Test-Path "C:\xampp\mysql\data\mysql"`
3. Coba restart XAMPP

### Jika koneksi gagal:
1. Pastikan MySQL benar-benar running (hijau di XAMPP)
2. Tunggu lebih lama (20-30 detik)
3. Cek port: `netstat -ano | findstr :3306`
4. Coba restart MySQL sekali lagi

### Jika database tidak bisa dibuat:
1. Pastikan MySQL benar-benar running
2. Test koneksi dulu: `C:\xampp\mysql\bin\mysql.exe -u root -e "SHOW DATABASES;"`

## Quick Commands

```powershell
# Test connection
C:\xampp\mysql\bin\mysql.exe -u root

# Create database
CREATE DATABASE hcm_mysql_dev;

# Run migrations
cd backend
npx prisma migrate deploy
npx prisma generate

# Apply RETURN_SHIPPED removal
npx prisma migrate dev
```

## Status Saat Ini

- ✅ System tables: Copied from backup (88 files)
- ✅ MySQL folder: Created in data directory
- ⏳ **MySQL perlu di-start di XAMPP Control Panel**
- ⏳ **Database perlu dibuat**
- ⏳ **Migrations perlu di-run**

Silakan start MySQL di XAMPP dan ikuti langkah-langkah di atas!

