# 🔒 Fix: Prevent Already-Replaced Cassettes from Being Selected for Replacement

**Tanggal**: 14 Desember 2024  
**Status**: ✅ FIXED

---

## 🐛 Masalah

Kaset yang sudah SCRAPPED dan sudah di-request pergantian (replacement) dan sudah diganti, masih bisa dipilih lagi di request replacement baru.

**Expected Behavior:**
- Kaset yang sudah di-replace (sudah punya `replacementTicketId` dengan status CLOSED) tidak boleh bisa dipilih lagi untuk replacement request baru
- Kaset yang sedang dalam proses replacement (status belum CLOSED) juga tidak boleh bisa dipilih

**Actual Behavior:**
- Kaset yang sudah di-replace masih bisa dipilih untuk replacement request baru

---

## 🔍 Root Cause

Tidak ada validasi untuk mengecek apakah kaset sudah pernah di-replace sebelumnya. Validasi hanya mengecek:
1. ✅ Status kaset harus SCRAPPED
2. ❌ **MISSING**: Tidak mengecek apakah kaset sudah punya `replacementTicketId`

---

## ✅ Solution

### 1. Update MultiCassetteValidator

**Fix**: Tambahkan validasi untuk cek `replacementTicketId` di `validateReplacementRequest()`.

**Code After (Fixed):**
```typescript
static validateReplacementRequest(
  cassetteDetails: Array<{
    cassetteId: string;
    cassette: { id: string; status: string; serialNumber: string; replacementTicketId?: string | null };
    requestReplacement: boolean;
  }>
): void {
  const replacementRequests = cassetteDetails.filter(d => d.requestReplacement === true);

  for (const detail of replacementRequests) {
    if (detail.cassette.status !== 'SCRAPPED') {
      throw new BadRequestException(
        `Cassette ${detail.cassette.serialNumber} cannot request replacement. ` +
        `Only SCRAPPED cassettes can be replaced. Current status: ${detail.cassette.status}`
      );
    }

    // Check if cassette has already been replaced (has replacementTicketId)
    if (detail.cassette.replacementTicketId) {
      throw new BadRequestException(
        `Cassette ${detail.cassette.serialNumber} sudah pernah di-replace sebelumnya. ` +
        `Kaset yang sudah di-replace tidak dapat di-replace lagi. ` +
        `Replacement ticket ID: ${detail.cassette.replacementTicketId}`
      );
    }
  }
}
```

### 2. Add Validation in create() Method (Single-Cassette)

**Fix**: Tambahkan validasi sebelum create ticket untuk single-cassette replacement request.

**Code After (Fixed):**
```typescript
// Priority 2: Validate replacement request for single-cassette ticket
if (createDto.requestReplacement) {
  if (cassette.status !== 'SCRAPPED') {
    throw new BadRequestException(
      `Cassette ${cassette.serialNumber} cannot request replacement. ` +
      `Only SCRAPPED cassettes can be replaced. Current status: ${cassette.status}`
    );
  }

  // Check if cassette has already been replaced (has replacementTicketId)
  if (cassette.replacementTicketId) {
    const replacementTicket = await this.prisma.problemTicket.findUnique({
      where: { id: cassette.replacementTicketId },
      select: {
        id: true,
        ticketNumber: true,
        status: true,
      },
    });

    if (replacementTicket) {
      if (replacementTicket.status === 'CLOSED') {
        throw new BadRequestException(
          `Cassette ${cassette.serialNumber} sudah pernah di-replace sebelumnya dan replacement sudah selesai. ` +
          `Kaset yang sudah di-replace tidak dapat di-replace lagi. ` +
          `Replacement ticket: ${replacementTicket.ticketNumber} (${replacementTicket.status})`
        );
      } else {
        throw new BadRequestException(
          `Cassette ${cassette.serialNumber} sedang dalam proses replacement. ` +
          `Replacement ticket: ${replacementTicket.ticketNumber} (${replacementTicket.status}). ` +
          `Tunggu hingga replacement selesai sebelum membuat replacement request baru.`
        );
      }
    }
  }
}
```

### 3. Add Validation in createMultiCassetteTicket() Method

**Fix**: Tambahkan validasi sebelum create ticket untuk multi-cassette replacement request.

**Code After (Fixed):**
```typescript
// Priority 2: Validate replacement requests using MultiCassetteValidator
if (createDto.requestReplacement) {
  // Check if any cassette has already been replaced
  for (const cassette of cassettes) {
    if (cassette.replacementTicketId) {
      const replacementTicket = await this.prisma.problemTicket.findUnique({
        where: { id: cassette.replacementTicketId },
        select: {
          id: true,
          ticketNumber: true,
          status: true,
        },
      });

      if (replacementTicket) {
        if (replacementTicket.status === 'CLOSED') {
          throw new BadRequestException(
            `Cassette ${cassette.serialNumber} sudah pernah di-replace sebelumnya dan replacement sudah selesai. ` +
            `Kaset yang sudah di-replace tidak dapat di-replace lagi. ` +
            `Replacement ticket: ${replacementTicket.ticketNumber} (${replacementTicket.status})`
          );
        } else {
          throw new BadRequestException(
            `Cassette ${cassette.serialNumber} sedang dalam proses replacement. ` +
            `Replacement ticket: ${replacementTicket.ticketNumber} (${replacementTicket.status}). ` +
            `Tunggu hingga replacement selesai sebelum membuat replacement request baru.`
          );
        }
      }
    }
  }

  // Then call MultiCassetteValidator
  MultiCassetteValidator.validateReplacementRequest(cassetteDetailsForValidation);
}
```

### 4. Update Query to Include replacementTicketId

**Fix**: Update query untuk include `replacementTicketId` saat fetch cassette.

**Code After (Fixed):**
```typescript
const cassette = await this.prisma.cassette.findUnique({
  where: { serialNumber: createDto.cassetteSerialNumber },
  select: {
    id: true,
    serialNumber: true,
    status: true,
    customerBankId: true,
    replacementTicketId: true, // Include to check if already replaced
    // ... other fields
  } as any,
});
```

---

## 📝 Files Modified

1. **`backend/src/common/validators/multi-cassette.validator.ts`**
   - ✅ Updated `validateReplacementRequest()` to check `replacementTicketId`
   - ✅ Added validation for already-replaced cassettes

2. **`backend/src/tickets/tickets.service.ts`**
   - ✅ Added validation in `create()` method for single-cassette tickets
   - ✅ Added validation in `createMultiCassetteTicket()` method for multi-cassette tickets
   - ✅ Updated queries to include `replacementTicketId`

---

## 🧪 Testing

**Test Cases:**

1. **Single-Cassette Replacement Request**
   - ✅ Kaset SCRAPPED tanpa `replacementTicketId` → ✅ Allowed
   - ✅ Kaset SCRAPPED dengan `replacementTicketId` (CLOSED) → ❌ Blocked
   - ✅ Kaset SCRAPPED dengan `replacementTicketId` (IN_PROGRESS) → ❌ Blocked
   - ✅ Kaset non-SCRAPPED → ❌ Blocked

2. **Multi-Cassette Replacement Request**
   - ✅ Semua kaset SCRAPPED tanpa `replacementTicketId` → ✅ Allowed
   - ✅ Salah satu kaset sudah di-replace → ❌ Blocked dengan error message yang jelas
   - ✅ Salah satu kaset non-SCRAPPED → ❌ Blocked

---

## 📊 Validation Flow

### Before Fix ❌
```
SCRAPPED + requestReplacement → ✅ Allowed (tidak cek replacementTicketId)
```

### After Fix ✅
```
SCRAPPED + requestReplacement → 
  ├─ replacementTicketId exists? 
  │   ├─ Yes → ❌ Blocked (sudah di-replace)
  │   └─ No → ✅ Allowed
```

---

## 🎯 Benefits

1. ✅ **Data Integrity**: Mencegah kaset yang sudah di-replace dipilih lagi
2. ✅ **Clear Error Messages**: User tahu kenapa kaset tidak bisa dipilih
3. ✅ **Prevent Duplicate Replacements**: Tidak ada replacement ganda untuk kaset yang sama
4. ✅ **Better UX**: User tidak bisa membuat replacement request yang invalid

---

## 🔄 Business Rule

**Rule**: Kaset yang sudah di-replace (punya `replacementTicketId` dengan status CLOSED) tidak dapat di-replace lagi.

**Reasoning**:
- Kaset yang sudah di-replace berarti sudah ada kaset baru yang menggantikannya
- Replacement hanya bisa dilakukan sekali per kaset
- Jika kaset baru juga rusak, harus buat ticket baru (bukan replacement dari kaset lama)

---

**Last Updated**: 14 Desember 2024  
**Fixed By**: Auto (AI Assistant)

