# 🚀 Apply RETURN_SHIPPED Removal Migration - Sekarang

## Status MySQL
✅ MySQL berhasil start dengan `innodb_force_recovery = 3`
⚠️ Ada beberapa page corruption warnings, tapi MySQL tetap berjalan

## Cara Apply Migration

### Opsi 1: Menggunakan MySQL Command Line (Recommended)

1. **Buka MySQL Command Line:**
   ```powershell
   C:\xampp\mysql\bin\mysql.exe -u root hcm_mysql_dev
   ```

2. **Jalankan SQL:**
   Copy dan paste isi file: `backend/scripts/apply-return-shipped-removal-direct.sql`

   Atau jalankan langsung:
   ```sql
   USE hcm_mysql_dev;
   
   -- Update RETURN_SHIPPED to CLOSED
   UPDATE problem_tickets 
   SET status = 'CLOSED', updated_at = NOW()
   WHERE status = 'RETURN_SHIPPED';
   
   -- Remove RETURN_SHIPPED from enum
   ALTER TABLE problem_tickets 
   MODIFY COLUMN status ENUM('OPEN', 'IN_DELIVERY', 'RECEIVED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN';
   ```

3. **Verifikasi:**
   ```sql
   SELECT COUNT(*) FROM problem_tickets WHERE status = 'RETURN_SHIPPED';
   -- Should return 0
   
   SHOW COLUMNS FROM problem_tickets WHERE Field = 'status';
   -- Should not include RETURN_SHIPPED
   ```

### Opsi 2: Menggunakan File SQL

```powershell
C:\xampp\mysql\bin\mysql.exe -u root hcm_mysql_dev < backend\scripts\apply-return-shipped-removal-direct.sql
```

### Opsi 3: Menggunakan phpMyAdmin

1. Buka phpMyAdmin
2. Pilih database `hcm_mysql_dev`
3. Klik tab "SQL"
4. Copy-paste SQL dari `backend/scripts/apply-return-shipped-removal-direct.sql`
5. Klik "Go"

## Setelah Migration Berhasil

1. **Generate Prisma Client:**
   ```powershell
   cd backend
   npx prisma generate
   ```

2. **Restart Backend Server**

3. **Test Aplikasi:**
   - Pastikan tidak ada error
   - Verifikasi status transitions bekerja
   - Pastikan tidak ada referensi RETURN_SHIPPED di UI

## Troubleshooting

### Jika MySQL tidak bisa connect:
- Pastikan MySQL benar-benar running (hijau di XAMPP)
- Tunggu 10-15 detik setelah start
- Coba restart MySQL sekali lagi

### Jika ALTER TABLE gagal:
- Pastikan tidak ada ticket dengan status RETURN_SHIPPED
- Pastikan MySQL tidak dalam read-only mode
- Cek error message untuk detail

### Jika Prisma masih tidak bisa connect:
- Gunakan manual SQL (Opsi 1 atau 2)
- Setelah migration selesai, generate Prisma client
- Prisma migrate hanya untuk tracking, tidak wajib jika sudah apply manual

## Catatan Penting

- ⚠️ **Force recovery mode (level 3) masih aktif** - beberapa operasi mungkin terbatas
- ✅ **Migration aman** - hanya update data dan enum, tidak hapus data
- ✅ **Backup tidak wajib** - tapi disarankan jika ada data penting
- ✅ **Setelah migration, generate Prisma client** untuk sync schema

