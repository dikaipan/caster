# 🔧 MySQL Extreme Recovery - Final Attempt

## Status
✅ **Settings sudah ada di config:**
- `loose-skip-plugin-load`
- `skip-plugin-dir`
- `skip-aria`
- `skip-grant-tables`
- `innodb_force_recovery = 4`
- `plugin-dir =` (empty)

⚠️ **MySQL masih gagal start dengan "Failed to initialize plugins"**

## Kemungkinan Masalah

1. **Plugin system corrupt** - Tidak bisa di-disable dengan config saja
2. **Data directory corrupt** - System tables tidak bisa di-load
3. **MySQL installation corrupt** - Binary atau library files rusak

## Solusi Terakhir

### Opsi 1: Start MySQL dengan Command Line (Lihat Error Detail)

Coba start MySQL langsung dari command line untuk melihat error yang lebih detail:

```powershell
cd C:\xampp\mysql\bin
.\mysqld.exe --console --skip-plugin-dir --skip-grant-tables --innodb-force-recovery=4
```

Ini akan menampilkan error detail di console. Perhatikan error message yang muncul.

### Opsi 2: Reinitialize MySQL (EXTREME - Hapus Semua Data!)

**WARNING:** Ini akan menghapus semua data! Hanya lakukan jika:
- Semua cara lain gagal
- Sudah mencoba backup (jika masih bisa)
- Siap kehilangan semua data

**Langkah-langkah:**

1. **Stop MySQL di XAMPP Control Panel**

2. **Backup data folder (jika masih bisa):**
   ```powershell
   Copy-Item "C:\xampp\mysql\data" -Destination "C:\xampp\mysql\data_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')" -Recurse -ErrorAction SilentlyContinue
   ```

3. **Hapus semua file di data folder:**
   ```powershell
   Remove-Item "C:\xampp\mysql\data\*" -Recurse -Force -Exclude "data_backup*"
   ```

4. **Reinitialize MySQL:**
   ```powershell
   cd C:\xampp\mysql\bin
   .\mysqld.exe --initialize-insecure --datadir=C:\xampp\mysql\data
   ```

5. **Start MySQL di XAMPP Control Panel**

6. **Restore data dari backup (jika ada dan masih valid):**
   - Coba restore database per database
   - Atau restore table per table

### Opsi 3: Reinstall MySQL/MariaDB

Jika reinitialize juga gagal, pertimbangkan reinstall:

1. **Backup data folder:**
   ```powershell
   Copy-Item "C:\xampp\mysql\data" -Destination "C:\xampp\mysql\data_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')" -Recurse
   ```

2. **Reinstall XAMPP atau MySQL:**
   - Download XAMPP terbaru
   - Install ulang
   - Copy data folder dari backup

## Cek Error Log Detail

Sebelum reinitialize, cek error log untuk detail:

```powershell
Get-Content "C:\xampp\mysql\data\*.err" -Tail 100
```

Atau buka file langsung:
```
C:\xampp\mysql\data\*.err
```

Cari error yang spesifik tentang:
- Plugin yang gagal load
- Table yang corrupt
- File yang tidak ditemukan

## Script Reinitialize

Saya sudah membuat script untuk reinitialize:

```powershell
cd backend
.\scripts\reinitialize-mysql.ps1
```

**Tapi script ini akan menghapus semua data!**

## Setelah Reinitialize

1. **Create database:**
   ```sql
   CREATE DATABASE hcm_mysql_dev;
   ```

2. **Restore schema dari Prisma:**
   ```powershell
   cd backend
   npx prisma migrate deploy
   ```

3. **Restore data dari backup (jika ada):**
   ```powershell
   C:\xampp\mysql\bin\mysql.exe -u root hcm_mysql_dev < backup_hcm_mysql_dev.sql
   ```

4. **Apply migration (remove RETURN_SHIPPED):**
   ```powershell
   C:\xampp\mysql\bin\mysql.exe -u root hcm_mysql_dev < backend\scripts\apply-return-shipped-removal-direct.sql
   ```

## Rekomendasi

**Jika MySQL masih tidak bisa start setelah semua fix:**
1. ✅ Coba start dengan command line untuk lihat error detail
2. ✅ Cek error log untuk error spesifik
3. ⚠️ Pertimbangkan reinitialize (akan hapus data)
4. ⚠️ Atau reinstall MySQL/XAMPP

**Jika ada backup data sebelumnya:**
- Restore dari backup lebih aman daripada recovery
- Reinitialize + restore backup lebih cepat

## File Penting

- Config: `C:\xampp\mysql\bin\my.ini`
- Error log: `C:\xampp\mysql\data\*.err`
- Data backup: `C:\xampp\mysql\data_backup_*`
- Migration SQL: `backend/scripts/apply-return-shipped-removal-direct.sql`

