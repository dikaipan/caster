# 🔍 Analisis Beban Server - Backend HCM

**Date**: 15 Desember 2025  
**Status**: Audit Lengkap

---

## 📊 Executive Summary

Audit menyeluruh menunjukkan beberapa area yang **berpotensi membebani server**, terutama pada traffic tinggi. Sebagian besar sudah dioptimalkan, namun ada beberapa area yang perlu perhatian.

---

## ✅ Yang Sudah Baik

### 1. **Pagination & Query Optimization** ✅
- ✅ Default limit: 50 records (sudah diubah dari 50,000)
- ✅ Max limit: 1,000 records
- ✅ Database indexes: 17 indexes untuk performa optimal
- ✅ Server-side filtering dan sorting
- ✅ Query performance: 10-100ms untuk 16,007+ cassettes

### 2. **Audit Logging** ✅
- ✅ Queue mode untuk batching (90% reduction in writes)
- ✅ Retention policy (auto cleanup > 2 years)
- ✅ Non-blocking error handling

### 3. **Security & Rate Limiting** ✅
- ✅ Rate limiting: 10 req/min, 100 req/10min, 1000 req/hour
- ✅ Query timeout: 5 seconds untuk raw queries
- ✅ File size limits: 50MB (CSV/Excel), 100MB (backup)

---

## ⚠️ Area yang Berpotensi Membebani Server

### 1. **Repairs Service - Complex Nested Includes** 🟡 MEDIUM PRIORITY

**Location**: `backend/src/repairs/repairs.service.ts:243-311`

**Masalah**:
```typescript
// Query dengan nested includes yang kompleks
const repairs = await this.prisma.repairTicket.findMany({
  include: {
    cassette: {
      include: {
        deliveries: { include: { ticket: {...} } },
        ticketCassetteDetails: { include: { ticket: {...} } },
      },
    },
  },
});

// Post-processing dengan loops untuk setiap repair
const repairsWithSoTicket = await Promise.all(repairs.map(async (repair) => {
  // Complex logic untuk determine SO ticket
  const getSoTicketForRepair = (repair) => {
    // Loops through deliveries and ticketCassetteDetails
    // Multiple filter/sort operations
  };
}));
```

**Dampak**:
- **N+1 query pattern**: Meskipun menggunakan include, query bisa menjadi berat dengan banyak nested relations
- **Post-processing**: Loop untuk setiap repair record untuk determine SO ticket
- **Memory usage**: Load semua nested data ke memory

**Solusi**:
- ✅ Sudah menggunakan `select` untuk field spesifik (bagus!)
- ⚠️ **Rekomendasi**: Pertimbangkan denormalisasi SO ID di repair ticket untuk menghindari post-processing
- ⚠️ **Rekomendasi**: Cache hasil SO mapping jika banyak repair dengan cassette yang sama

**Prioritas**: Medium (sudah cukup baik, tapi bisa dioptimalkan lebih lanjut)

---

### 2. **File Import Processing** 🟡 MEDIUM PRIORITY

**Location**: `backend/src/import/import.service.ts`

**Masalah**:
- File processing dilakukan secara **synchronous**
- File besar (50MB) di-load seluruhnya ke memory
- Tidak ada progress reporting untuk long-running operations

**Dampak**:
- **Memory spike**: Loading 50MB file ke memory
- **Blocking**: Request handler blocked sampai import selesai
- **Timeout risk**: Request bisa timeout jika import lama (>30s)

**Solusi**:
```typescript
// ✅ Sudah ada: File size limit (50MB)
// ✅ Sudah ada: MIME type validation
// ⚠️ Rekomendasi: Stream processing untuk file besar
// ⚠️ Rekomendasi: Background job untuk import besar
// ⚠️ Rekomendasi: Chunk processing untuk batch inserts
```

**Prioritas**: Medium (masih acceptable untuk file < 50MB, perlu optimasi untuk file lebih besar)

---

### 3. **JSON Serialization Operations** 🟢 LOW PRIORITY

**Location**: Multiple files (43 instances)

**Masalah**:
- Banyak operasi `JSON.stringify()` dan `JSON.parse()` 
- Terutama di audit log service (oldValue, newValue, changes, metadata)
- Di beberapa service untuk data transformation

**Dampak**:
- **CPU overhead**: JSON serialization bisa mahal untuk object besar
- **Memory usage**: Temporary string creation

**Status**: 
- ✅ **Acceptable**: JSON operations umumnya cepat (< 1ms per operation)
- ✅ **Necessary**: Dibutuhkan untuk audit logging dan data storage
- ⚠️ **Monitoring**: Monitor jika ada object yang sangat besar (> 1MB)

**Prioritas**: Low (sudah optimal, hanya monitor)

---

### 4. **Ticket Status Sync Service** 🟢 LOW-MEDIUM PRIORITY

**Location**: `backend/src/tickets/ticket-status-sync.service.ts`

**Masalah**:
```typescript
// Query all repair tickets untuk setiap cassette
const allRepairTicketsRaw = await prisma.repairTicket.findMany({
  where: {
    cassetteId: { in: cassetteIds },
    deletedAt: null,
    createdAt: { gte: ticketCreatedAt },
  },
});

// Processing untuk determine latest repair per cassette
const latestRepairsMap = new Map();
for (const rt of allRepairTicketsRaw) {
  if (!latestRepairsMap.has(rt.cassetteId)) {
    latestRepairsMap.set(rt.cassetteId, rt);
  }
}
```

**Dampak**:
- **Multiple queries**: Dipanggil setiap kali ticket status perlu di-sync
- **In-memory processing**: Loop untuk determine latest repairs

**Status**:
- ✅ **Optimized**: Sudah filter berdasarkan `createdAt >= ticketCreatedAt`
- ✅ **Efficient**: Menggunakan Map untuk O(1) lookup
- ⚠️ **Rekomendasi**: Cache hasil sync untuk prevent redundant processing

**Prioritas**: Low-Medium (sudah cukup baik, bisa di-cache jika sering dipanggil)

---

### 5. **Scheduled Tasks (Cron Jobs)** 🟢 LOW PRIORITY

**Location**: 
- `backend/src/audit/audit-log-cleanup.service.ts` (monthly)
- `backend/src/preventive-maintenance/pm-cleanup.service.ts` (monthly)
- `backend/src/preventive-maintenance/pm-scheduler.service.ts` (daily)

**Status**:
- ✅ **Optimized**: Cleanup jobs run monthly (off-peak hours)
- ✅ **Batching**: Delete operations dilakukan dalam batches
- ✅ **Non-blocking**: Scheduled tasks tidak memblokir request handling

**Prioritas**: Low (sudah optimal)

---

### 6. **Analytics Service** 🔴 NEED TO REVIEW

**Location**: `backend/src/analytics/analytics.service.ts`

**Status**: ⚠️ **Perlu dicek** apakah ada heavy aggregations atau queries yang kompleks

**Aksi**: Review analytics queries untuk memastikan:
- ✅ Menggunakan indexes
- ✅ Pagination jika diperlukan
- ✅ Tidak ada N+1 queries
- ✅ Aggregations efisien

---

## 📈 Rekomendasi Optimasi (Priority Order)

### 🔴 **HIGH PRIORITY**

#### 1. **Denormalisasi SO ID di Repair Ticket**
- **Problem**: Post-processing loop untuk determine SO ticket per repair
- **Solution**: Store `soTicketId` langsung di `RepairTicket` model
- **Benefit**: Eliminate post-processing, faster queries
- **Effort**: Medium (migration needed)

### 🟡 **MEDIUM PRIORITY**

#### 2. **Stream Processing untuk File Import**
- **Problem**: Load seluruh file ke memory
- **Solution**: Process file in chunks/streams
- **Benefit**: Lower memory usage, better for large files
- **Effort**: Medium

#### 3. **Background Job untuk Import Besar**
- **Problem**: Blocking request handler
- **Solution**: Queue import jobs, return job ID immediately
- **Benefit**: Non-blocking, better UX
- **Effort**: High (need job queue system)

#### 4. **Caching untuk Ticket Status Sync**
- **Problem**: Redundant processing jika sync dipanggil multiple times
- **Solution**: Cache sync results per ticket
- **Benefit**: Faster subsequent syncs
- **Effort**: Low

### 🟢 **LOW PRIORITY**

#### 5. **Monitoring & Alerting**
- Monitor query execution time
- Alert jika query > 1 second
- Monitor memory usage
- Monitor queue buffer sizes

---

## 🎯 Performance Metrics (Current)

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Query Time (paginated) | 10-100ms | < 500ms | ✅ Excellent |
| Memory Usage | Low | - | ✅ Good |
| Database Writes | Optimized (queue) | - | ✅ Good |
| File Processing | Synchronous | Async (future) | ⚠️ Acceptable |
| Cache Hit Rate | N/A | > 80% | ⚠️ No cache yet |

---

## ✅ Kesimpulan

**Overall Server Load Status: GOOD** ✅

- ✅ **Core queries sudah optimal** (10-100ms dengan 16k+ records)
- ✅ **Pagination sudah proper** (max 1,000 records)
- ✅ **Audit logging sudah optimized** (queue mode, retention)
- ✅ **Security sudah baik** (rate limiting, timeouts)
- ⚠️ **Beberapa area bisa dioptimalkan lebih lanjut** (denormalisasi, caching, background jobs)

**Rekomendasi**: 
1. Monitor production metrics (query times, memory, CPU)
2. ✅ **DONE**: Implement denormalisasi SO ID - **Completed** (see `doc/DENORMALIZATION_SO_ID_IMPLEMENTATION.md`)
3. Pertimbangkan background jobs untuk import besar jika diperlukan

