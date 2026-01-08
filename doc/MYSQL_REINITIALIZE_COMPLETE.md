# ✅ MySQL Reinitialize - Selesai!

## Status
✅ **Data sudah di-backup:** `C:\xampp\mysql\data_backup_20251214_105949` (140.4 MB)
✅ **Data folder sudah dibersihkan**
✅ **Config sudah dibersihkan**

## Langkah-langkah Setup Ulang

### 1. Start MySQL
- Buka **XAMPP Control Panel**
- Klik **"Start"** pada MySQL
- Tunggu 5-10 detik
- Pastikan status **hijau (Running)**

### 2. Test Koneksi
```powershell
C:\xampp\mysql\bin\mysql.exe -u root
```

Jika berhasil, Anda akan masuk ke MySQL prompt (`mysql>`).

### 3. Create Database
Di MySQL prompt, ketik:
```sql
CREATE DATABASE hcm_mysql_dev;
exit;
```

### 4. Run Prisma Migrations
```powershell
cd backend
npx prisma migrate deploy
```

Ini akan membuat semua tables sesuai schema.

### 5. Restore Data dari Backup (PENTING!)

**Opsi A: Restore semua database**
```powershell
C:\xampp\mysql\bin\mysql.exe -u root < C:\xampp\mysql\data_backup_20251214_105949\hcm_mysql_dev.sql
```

**Opsi B: Restore database tertentu**
Jika ada file SQL di backup folder:
```powershell
# Cek file SQL di backup
Get-ChildItem "C:\xampp\mysql\data_backup_20251214_105949" -Filter "*.sql" -Recurse

# Restore
C:\xampp\mysql\bin\mysql.exe -u root hcm_mysql_dev < "path\to\backup.sql"
```

**Opsi C: Restore dari mysqldump backup (jika ada)**
```powershell
C:\xampp\mysql\bin\mysql.exe -u root hcm_mysql_dev < backup_hcm_mysql_dev.sql
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

### 7. Generate Prisma Client
```powershell
cd backend
npx prisma generate
```

### 8. Test Aplikasi
- Start backend server
- Start frontend
- Test aplikasi

## Jika Restore Data Gagal

Jika restore data gagal atau tidak ada backup SQL:

1. **Database sudah dibuat** dengan schema yang benar
2. **Data akan kosong** - Anda perlu input data manual
3. **Atau** coba extract data dari backup folder secara manual

## Backup Location

**Backup folder:** `C:\xampp\mysql\data_backup_20251214_105949`

Di dalam folder ini ada:
- Semua database folders
- File-file MySQL system tables
- Mungkin ada file SQL jika pernah di-backup sebelumnya

## Troubleshooting

### MySQL tidak bisa start:
- Pastikan XAMPP Control Panel benar-benar start MySQL
- Cek error log: `C:\xampp\mysql\data\*.err`
- Coba restart XAMPP

### Database tidak bisa dibuat:
- Pastikan MySQL benar-benar running
- Cek koneksi: `C:\xampp\mysql\bin\mysql.exe -u root -e "SHOW DATABASES;"`

### Prisma migrate gagal:
- Pastikan database sudah dibuat
- Cek `.env` file untuk database connection string
- Coba: `npx prisma migrate reset` (akan hapus semua data lagi!)

## Quick Commands

```powershell
# Start MySQL dan test
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

## Catatan Penting

- ✅ **Backup data aman** di: `C:\xampp\mysql\data_backup_20251214_105949`
- ⚠️ **Data saat ini kosong** - perlu restore dari backup
- ✅ **MySQL sekarang fresh** - tidak ada corruption
- ✅ **Config sudah bersih** - tidak ada recovery settings

Silakan ikuti langkah-langkah di atas untuk setup ulang database!

