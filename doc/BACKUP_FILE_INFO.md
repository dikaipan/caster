# 📁 Backup File Information

## File Backup Tersedia

**Location:** `backend/backups/backup_hcm_development_2025-12-03_1764727982975.json`

**Date:** 2025-12-03

**Format:** JSON

## Data di Backup

| Table | Count |
|-------|-------|
| Machines | 1,602 |
| Cassettes | 16,011 |
| Problem Tickets | 10 |
| Repair Tickets | 47 |
| Customer Banks | 1 |
| Pengelola | 2 |
| Hitachi Users | 3 |
| Pengelola Users | 3 |
| Cassette Types | 3 |
| Bank Pengelola Assignments | 2 |
| Cassette Deliveries | 10 |
| Cassette Returns | 5 |

## Import Manual

File backup dalam format JSON dan bisa di-import manual menggunakan:

1. **Prisma Studio** - Import via UI
2. **Custom Script** - Buat script sesuai kebutuhan
3. **Database Tools** - phpMyAdmin, MySQL Workbench, dll
4. **API Endpoints** - Jika ada bulk import endpoint

## Database Status

- ✅ Database `caster` sudah dibuat
- ✅ Schema lengkap (19 tables)
- ✅ Migrations applied (7 migrations)
- ✅ Master data seeded (cassette types, users, banks, pengelola)
- ✅ Siap untuk import data manual

## File Structure

File backup adalah JSON dengan struktur:
```json
{
  "version": "1.0",
  "createdAt": "2025-12-03T02:13:02.975Z",
  "database": "hcm_development",
  "tables": {
    "machines": [...],
    "cassettes": [...],
    ...
  }
}
```

## Notes

- File backup berisi data dari database lama (`hcm_development`)
- Data bisa di-import ke database baru (`caster`)
- Pastikan foreign key relationships sudah ada sebelum import
- Import urutan: Master data → Dependent data

---

**Status:** ✅ Backup file tersedia untuk import manual

