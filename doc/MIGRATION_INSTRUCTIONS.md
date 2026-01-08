# 📋 Instruksi Migration: Remove RETURN_SHIPPED Status

## ⚠️ Prasyarat

Sebelum menjalankan migration, pastikan:

1. ✅ **Database server MySQL berjalan**
   - Pastikan MySQL service aktif di `localhost:3306`
   - Atau sesuaikan dengan konfigurasi database Anda

2. ✅ **Koneksi database benar**
   - File `.env` sudah dikonfigurasi dengan benar
   - Database `hcm_mysql_dev` dapat diakses

3. ✅ **Backup database (opsional tapi disarankan)**
   ```sql
   mysqldump -u root -p hcm_mysql_dev > backup_before_migration.sql
   ```

## 🚀 Langkah-langkah Migration

### Opsi 1: Menggunakan Script PowerShell (Paling Mudah)

```powershell
cd backend
.\scripts\apply-return-shipped-removal.ps1
```

### Opsi 2: Manual Commands

```powershell
cd backend

# 1. Apply migration
npx prisma migrate dev

# 2. Generate Prisma client
npx prisma generate
```

### Opsi 3: Menggunakan NPM Scripts

```powershell
cd backend

# Apply migration
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate
```

## ✅ Verifikasi Migration

Setelah migration berhasil, verifikasi dengan:

### 1. Check Database
```sql
-- Check if any RETURN_SHIPPED tickets still exist (should return 0)
SELECT COUNT(*) as return_shipped_count 
FROM problem_tickets 
WHERE status = 'RETURN_SHIPPED';

-- Check enum values (should not include RETURN_SHIPPED)
SHOW COLUMNS FROM problem_tickets WHERE Field = 'status';
```

### 2. Check Application
- ✅ Restart backend server
- ✅ Test aplikasi - pastikan tidak ada error
- ✅ Test flow: RESOLVED → CLOSED
- ✅ Pastikan tidak ada referensi `RETURN_SHIPPED` di UI

## 🔍 Troubleshooting

### Error: "Can't reach database server"
**Solusi**: 
1. Pastikan MySQL service berjalan
2. Cek konfigurasi di `.env`
3. Test koneksi: `mysql -u root -p -h localhost -P 3306`

### Error: "Migration failed"
**Solusi**:
1. Cek log error untuk detail
2. Pastikan tidak ada koneksi aktif ke database
3. Coba rollback dan jalankan lagi

### Error: "Enum value not found"
**Solusi**:
1. Pastikan migration SQL sudah dijalankan
2. Cek apakah enum sudah diupdate di database
3. Restart backend server

## 📝 Catatan Penting

- ⚠️ Migration akan **mengupdate semua ticket dengan status `RETURN_SHIPPED` menjadi `CLOSED`**
- ✅ Tidak ada data yang hilang - semua ticket tetap accessible
- ✅ Flow baru: `RESOLVED` → `CLOSED` (langsung saat pickup dikonfirmasi)
- ✅ Legacy UI components sudah di-disable (bukan dihapus) untuk safety

## 🔄 Rollback (Jika Diperlukan)

Jika ada masalah, rollback dengan:

1. Revert Prisma schema:
   ```prisma
   enum ProblemTicketStatus {
     OPEN
     IN_DELIVERY
     RECEIVED
     IN_PROGRESS
     RESOLVED
     RETURN_SHIPPED  // Add back
     CLOSED
   }
   ```

2. Restore enum di database:
   ```sql
   ALTER TABLE problem_tickets 
   MODIFY COLUMN status ENUM('OPEN', 'IN_DELIVERY', 'RECEIVED', 'IN_PROGRESS', 'RESOLVED', 'RETURN_SHIPPED', 'CLOSED') NOT NULL DEFAULT 'OPEN';
   ```

3. Revert code changes (gunakan git)

**Note**: Tickets yang sudah diupdate ke `CLOSED` akan tetap `CLOSED` (tidak bisa di-revert otomatis)

