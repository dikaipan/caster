# Audit Log Optimization

## Overview

Audit logging telah dioptimalkan untuk mengurangi beban database dengan menggunakan **batching mechanism** dan **retention policy**.

## Features

### 1. Queue Service (Batching)
- **Mengurangi database writes hingga 90%** dengan batching
- Mengumpulkan audit logs dalam buffer (max 50 logs)
- Flush ke database setiap 5 detik atau ketika buffer penuh
- Non-blocking: Operasi utama tidak menunggu audit log write

### 2. Cleanup Service (Retention Policy)
- Auto cleanup audit logs lebih dari **2 tahun** (730 hari)
- Berjalan setiap bulan (tanggal 1, jam 3 pagi)
- Mencegah tabel audit_logs membesar tanpa batas

## Configuration

### Environment Variables

```bash
# Enable/disable queue mode (default: enabled if queue service available)
AUDIT_LOG_USE_QUEUE=true  # true = use queue, false = direct write

# Retention period in days (default: 730 = 2 years)
AUDIT_LOG_RETENTION_DAYS=730
```

### Default Behavior

- **Queue mode enabled by default** jika `AuditLogQueueService` tersedia
- **Cleanup runs automatically** setiap bulan
- Jika queue service tidak tersedia, akan fallback ke direct write

## API Endpoints

### Get Queue Statistics
```
GET /api/audit-logs/queue/stats
```
Returns:
```json
{
  "bufferSize": 15,
  "queueEnabled": true
}
```

### Get Audit Log Statistics
```
GET /api/audit-logs/stats
```
Returns:
```json
{
  "total": 12345,
  "oldest": "2024-01-01T00:00:00Z",
  "newest": "2025-12-15T12:00:00Z",
  "olderThanRetention": 100
}
```

## Performance Impact

### Before (Direct Write)
- **100 operations** = **100 database writes**
- Each write: ~1-5ms
- Total: 100-500ms for audit logging

### After (Queue Mode)
- **100 operations** = **~2 database writes** (batches of 50)
- Each batch: ~5-10ms
- Total: 10-20ms for audit logging
- **Reduction: ~90% fewer writes**

## Graceful Shutdown

Queue service akan otomatis flush semua pending logs ketika aplikasi shutdown untuk memastikan tidak ada data yang hilang.

## Monitoring

Monitor queue buffer size untuk memastikan tidak ada backlog:
- Normal: buffer size < 10
- Warning: buffer size 10-30
- Critical: buffer size > 30 (consider increasing flush frequency)

