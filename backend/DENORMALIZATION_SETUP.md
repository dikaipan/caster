# 🚀 Setup Denormalisasi SO ID - Quick Start Guide

## 📋 Prerequisites

- ✅ Schema sudah diupdate (`soTicketId` field ditambahkan)
- ✅ Code sudah diupdate (helper method, create methods, findAll simplified)
- ⚠️ **Perlu dilakukan**: Migration database & generate Prisma client

---

## 🎯 Langkah Setup

### Step 1: Generate Prisma Client

```bash
cd backend
npx prisma generate
```

**Catatan**: Jika error permission, restart terminal/IDE dan coba lagi.

---

### Step 2: Run Migration

**Opsi A - Manual SQL** (Recommended jika Prisma migrate ada issue):

1. Buka MySQL client atau database tool
2. Jalankan SQL dari file:
   ```
   backend/prisma/migrations/add_so_ticket_id_manual.sql
   ```

**Opsi B - Prisma Migrate** (jika tidak ada issue):

```bash
cd backend
npx prisma migrate dev --name add_so_ticket_id_to_repair_ticket
```

**Verifikasi**:
```sql
-- Cek column sudah ada
DESCRIBE repair_tickets;
-- Harusnya ada kolom: so_ticket_id

-- Cek index sudah ada
SHOW INDEX FROM repair_tickets;
-- Harusnya ada index: repair_tickets_so_ticket_id_idx
```

---

### Step 3: Backfill Existing Data

```bash
cd backend
npx ts-node scripts/backfill-so-ticket-id.ts
```

**Expected Output**:
```
🔄 Starting backfill of soTicketId for existing repair tickets...
📊 Found X repair tickets to process
✅ Progress: 100/X updated...
✅ Progress: 200/X updated...

📈 Backfill Summary:
   ✅ Updated: X
   ⚠️  Skipped (no SO found): Y
   ❌ Errors: 0
   📊 Total processed: X

✅ Backfill completed successfully!
```

---

### Step 4: Restart Backend

```bash
cd backend
npm run start:dev
```

**Cek log**: Harusnya tidak ada error tentang `soTicket` relation.

---

## ✅ Verification Checklist

- [ ] Prisma client generated successfully
- [ ] Migration executed (column `so_ticket_id` exists)
- [ ] Index created (`repair_tickets_so_ticket_id_idx`)
- [ ] Backfill script completed (all existing repairs have `soTicketId`)
- [ ] Backend starts without errors
- [ ] Test create repair → `soTicketId` terisi
- [ ] Test query repairs → `soTicket` include di response
- [ ] Query performance improved (check response time)

---

## 🧪 Testing

### Test 1: Create Repair Manual
```bash
POST /api/repairs
{
  "cassetteId": "...",
  "reportedIssue": "Test issue"
}
```

**Expected**: Response includes `soTicket` object.

### Test 2: Create Repair dari SO
```bash
POST /api/repairs/bulk-from-ticket/{ticketId}
```

**Expected**: All repairs have `soTicketId = ticketId`.

### Test 3: Query Repairs
```bash
GET /api/repairs?page=1&limit=50
```

**Expected**: 
- Response includes `soTicket` untuk setiap repair
- Query time lebih cepat (check di network tab)
- No errors in console

---

## ⚠️ Troubleshooting

### Error: "soTicket does not exist in type"
**Solution**: Run `npx prisma generate` untuk regenerate Prisma client.

### Error: Migration failed
**Solution**: Gunakan manual SQL dari `backend/prisma/migrations/add_so_ticket_id_manual.sql`.

### Error: Backfill script failed
**Solution**: 
1. Cek database connection
2. Cek apakah migration sudah di-run
3. Cek logs untuk detail error

### Query masih lambat
**Solution**:
1. Verify index sudah dibuat: `SHOW INDEX FROM repair_tickets;`
2. Verify backfill sudah selesai (semua repairs punya `soTicketId`)
3. Check query execution plan

---

## 📊 Performance Monitoring

**Before**:
- Query time: ~200-500ms
- Post-processing: Required

**After** (Expected):
- Query time: ~50-100ms (2-5x faster)
- Post-processing: None

**Monitor**:
```bash
# Check query performance
# Use database EXPLAIN atau monitor query execution time
```

---

## 📝 Notes

- ✅ New repairs akan otomatis punya `soTicketId` saat create
- ✅ Existing repairs perlu di-backfill (Step 3)
- ✅ Jika `soTicketId` null, repair masih bisa di-query (backward compatible)
- ✅ `soTicketId` tidak akan auto-update jika SO berubah (by design)

---

## 🔗 Related Files

- Schema: `backend/prisma/schema.prisma`
- Service: `backend/src/repairs/repairs.service.ts`
- Backfill Script: `backend/scripts/backfill-so-ticket-id.ts`
- Migration SQL: `backend/prisma/migrations/add_so_ticket_id_manual.sql`
- Documentation: `doc/DENORMALIZATION_SO_ID_IMPLEMENTATION.md`

