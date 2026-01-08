# 🔧 Fix MySQL InnoDB Corruption

## Masalah
InnoDB database corruption pada tabel `mysql/innodb_index_stats`. Error menunjukkan page corruption.

## ⚠️ PENTING: Backup Data Terlebih Dahulu!

Sebelum melakukan perbaikan, **BACKUP DATA TERLEBIH DAHULU** jika memungkinkan:

```powershell
# Jika MySQL masih bisa diakses (walaupun dengan error)
mysqldump -u root -p --all-databases > backup_all_databases.sql

# Atau backup database spesifik
mysqldump -u root -p hcm_mysql_dev > backup_hcm_mysql_dev.sql
```

## Solusi 1: Force InnoDB Recovery (Recommended)

### Step 1: Edit MySQL Configuration

**XAMPP:**
1. Buka `C:\xampp\mysql\bin\my.ini`
2. Cari section `[mysqld]`
3. Tambahkan baris berikut:
   ```ini
   [mysqld]
   innodb_force_recovery = 1
   ```
4. Save file

**MySQL Standalone:**
1. Buka `C:\ProgramData\MySQL\MySQL Server X.X\my.ini`
2. Cari section `[mysqld]`
3. Tambahkan:
   ```ini
   [mysqld]
   innodb_force_recovery = 1
   ```
4. Save file

### Step 2: Start MySQL

Start MySQL service. Jika berhasil:
1. Backup data yang penting
2. Hapus baris `innodb_force_recovery = 1` dari config
3. Restart MySQL
4. Run repair/optimize

### Step 3: Repair Database

```sql
-- Connect ke MySQL
mysql -u root -p

-- Repair database
USE mysql;
REPAIR TABLE innodb_index_stats;
REPAIR TABLE innodb_table_stats;

-- Atau untuk semua database
mysqlcheck -u root -p --auto-repair --all-databases
```

### Step 4: Remove Force Recovery

Setelah repair selesai:
1. Edit `my.ini` lagi
2. Hapus atau comment `innodb_force_recovery = 1`
3. Restart MySQL

## Solusi 2: Rebuild InnoDB System Tables

Jika Solusi 1 tidak bekerja:

### Step 1: Stop MySQL

### Step 2: Backup Data Folder

```powershell
# XAMPP
Copy-Item "C:\xampp\mysql\data" -Destination "C:\xampp\mysql\data_backup" -Recurse

# MySQL Standalone
Copy-Item "C:\ProgramData\MySQL\MySQL Server X.X\Data" -Destination "C:\ProgramData\MySQL\MySQL Server X.X\Data_backup" -Recurse
```

### Step 3: Rebuild System Tables

```powershell
# XAMPP
cd C:\xampp\mysql\bin
.\mysql_install_db.exe --datadir=C:\xampp\mysql\data

# MySQL Standalone
cd "C:\Program Files\MySQL\MySQL Server X.X\bin"
.\mysqld --initialize-insecure --datadir="C:\ProgramData\MySQL\MySQL Server X.X\Data"
```

**⚠️ WARNING**: Ini akan menghapus system tables. Data user database mungkin masih ada, tapi system tables akan di-rebuild.

### Step 4: Start MySQL dan Restore Data

```powershell
# Start MySQL
# Lalu restore data dari backup
mysql -u root -p < backup_all_databases.sql
```

## Solusi 3: Reinitialize MySQL (Last Resort)

**⚠️ WARNING: Ini akan menghapus SEMUA data!**

Hanya lakukan jika:
- Tidak ada backup
- Data tidak penting
- Semua solusi lain gagal

### Step 1: Stop MySQL

### Step 2: Backup (jika masih bisa)

```powershell
# Coba backup folder data
Copy-Item "C:\xampp\mysql\data" -Destination "C:\xampp\mysql\data_backup" -Recurse
```

### Step 3: Hapus Data Folder

```powershell
# XAMPP - Hapus semua file di data folder (kecuali folder mysql, performance_schema, dll)
Remove-Item "C:\xampp\mysql\data\*" -Recurse -Force

# MySQL Standalone
Remove-Item "C:\ProgramData\MySQL\MySQL Server X.X\Data\*" -Recurse -Force
```

### Step 4: Reinitialize

```powershell
# XAMPP
cd C:\xampp\mysql\bin
.\mysqld --initialize-insecure --datadir=C:\xampp\mysql\data

# MySQL Standalone
cd "C:\Program Files\MySQL\MySQL Server X.X\bin"
.\mysqld --initialize-insecure --datadir="C:\ProgramData\MySQL\MySQL Server X.X\Data"
```

### Step 5: Start MySQL

### Step 6: Restore Data (jika ada backup)

```powershell
mysql -u root -p < backup_all_databases.sql
```

## Solusi 4: Repair Specific Table

Jika hanya tabel tertentu yang corrupt:

```sql
-- Connect ke MySQL
mysql -u root -p

-- Repair specific table
USE mysql;
REPAIR TABLE innodb_index_stats;
REPAIR TABLE innodb_table_stats;

-- Atau drop dan recreate (HATI-HATI!)
DROP TABLE IF EXISTS innodb_index_stats;
DROP TABLE IF EXISTS innodb_table_stats;

-- MySQL akan recreate otomatis saat restart
```

## Langkah-langkah yang Disarankan

### 1. Coba Force Recovery Mode (Solusi 1)
   - Paling aman
   - Tidak menghapus data
   - Bisa recover sebagian besar data

### 2. Jika Force Recovery berhasil:
   - Backup semua data
   - Repair database
   - Remove force recovery mode
   - Restart MySQL

### 3. Jika Force Recovery gagal:
   - Coba rebuild system tables (Solusi 2)
   - Atau reinitialize (Solusi 3) jika data tidak penting

## Setelah MySQL Berhasil Diperbaiki

Setelah MySQL berjalan normal:

1. **Verifikasi database:**
   ```sql
   SHOW DATABASES;
   USE hcm_mysql_dev;
   SHOW TABLES;
   ```

2. **Jalankan migration:**
   ```powershell
   cd backend
   npx prisma migrate dev
   npx prisma generate
   ```

## Catatan Penting

- ⚠️ **Selalu backup sebelum repair!**
- ⚠️ **Force recovery mode hanya untuk recovery, bukan untuk production!**
- ⚠️ **Reinitialize akan menghapus semua data!**
- ✅ **Setelah repair, monitor MySQL untuk memastikan tidak ada error lagi**

