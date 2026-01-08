# 🔒 Pengelola Ticket Restrictions

## Overview
Implementasi pembatasan akses untuk pengelola agar hanya dapat melihat tiket miliknya dan tidak dapat mengunduh laporan PDF.

## Perubahan yang Diterapkan

### 1. Active Tickets Filtering (Service Orders)
**File**: `frontend/src/app/tickets/page.tsx`

Halaman active tickets sudah menggunakan hook `useTickets` yang memanggil endpoint `/tickets`. Backend secara otomatis melakukan filtering berdasarkan:
- **HITACHI users**: Dapat melihat semua tiket
- **PENGELOLA users**: Hanya dapat melihat tiket yang:
  - Machine-nya di-assign ke pengelola mereka, ATAU
  - Mereka yang membuat tiket (reporter)

**Catatan**: Backend filtering sudah diimplementasikan di `tickets.service.ts` dan secara otomatis berlaku untuk semua request ke endpoint `/tickets`, termasuk halaman active tickets.

### 2. History Ticket Filtering
**File**: `frontend/src/app/history/page.tsx`

History page sudah menggunakan endpoint `/tickets` dengan parameter `status: 'CLOSED'`. Backend secara otomatis melakukan filtering berdasarkan:
- **HITACHI users**: Dapat melihat semua tiket
- **PENGELOLA users**: Hanya dapat melihat tiket yang:
  - Machine-nya di-assign ke pengelola mereka, ATAU
  - Mereka yang membuat tiket (reporter)

**Backend Filtering** (`backend/src/tickets/tickets.service.ts`):
```typescript
if (userType?.toUpperCase() === 'PENGELOLA' && pengelolaId) {
  whereClause.OR = [
    {
      machine: {
        pengelolaId,
      },
    },
    {
      reporter: {
        pengelolaId,
      },
    },
  ];
}
```

### 2. PDF Download Restriction
**File**: `frontend/src/app/tickets/[id]/page.tsx`

Tombol download PDF report sekarang hanya ditampilkan untuk user HITACHI:
```tsx
{/* Download PDF Report - Only for Hitachi users */}
{ticket && repairs && isHitachi && (
  <PDFDownloadButton 
    ticket={ticket} 
    repairs={repairs} 
    user={user} 
    disabled={ticket.status !== 'CLOSED'}
  />
)}
```

**Perubahan**:
- Sebelumnya: Semua user dapat melihat tombol download PDF
- Sekarang: Hanya HITACHI users yang dapat melihat dan menggunakan tombol download PDF
- Pengelola tidak akan melihat tombol download PDF sama sekali

## Testing

### Test Case 1: Active Tickets Filtering
1. Login sebagai pengelola
2. Buka halaman Active Tickets (`/tickets`)
3. **Expected**: Hanya melihat tiket yang:
   - Machine-nya di-assign ke pengelola mereka, ATAU
   - Mereka yang membuat tiket
4. Login sebagai HITACHI user
5. **Expected**: Melihat semua tiket

### Test Case 2: History Filtering
1. Login sebagai pengelola
2. Buka halaman History (`/history`)
3. **Expected**: Hanya melihat tiket yang:
   - Machine-nya di-assign ke pengelola mereka, ATAU
   - Mereka yang membuat tiket

### Test Case 3: PDF Download Restriction
1. Login sebagai pengelola
2. Buka detail tiket (misalnya `/tickets/[id]`)
3. **Expected**: Tombol "Download PDF Report" tidak muncul
4. Login sebagai HITACHI user
5. Buka detail tiket yang statusnya CLOSED
6. **Expected**: Tombol "Download PDF Report" muncul dan dapat digunakan

## Security Notes

- Filtering dilakukan di backend, sehingga pengelola tidak dapat mengakses tiket yang bukan miliknya melalui API langsung
- Frontend hanya menyembunyikan UI, tetapi backend tetap melakukan validasi
- PDF download dibatasi di frontend untuk mencegah pengelola mengakses fitur yang tidak diizinkan

