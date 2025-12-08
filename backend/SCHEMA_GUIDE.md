# 📊 Panduan Skema Database HCM

Panduan lengkap untuk memahami dan mengedit skema database.

## 🗂️ Struktur Database

### 1. **CustomerBank** (`customers_banks`)
Bank nasabah yang menggunakan mesin Hitachi.

**Field Utama:**
- `id` - UUID Primary Key
- `bankCode` - Kode bank (unique, max 20 char)
- `bankName` - Nama bank
- `bankAbbreviation` - Singkatan bank
- Contract: `contractNumber`, `contractStartDate`, `contractEndDate`, `contractType`
- Contact: `primaryContactName`, `primaryContactEmail`, `primaryContactPhone`
- `status` - ACTIVE, INACTIVE, SUSPENDED

**Relations:**
- `vendorAssignments[]` → BankVendorAssignment
- `cassettes[]` → Cassette
- `machines[]` → Machine

---

### 2. **Vendor** (`vendors`)
Vendor yang menangani maintenance mesin.

**Field Utama:**
- `id` - UUID Primary Key
- `vendorCode` - Kode vendor (unique, max 50 char)
- `companyName` - Nama perusahaan
- `companyAbbreviation` - Singkatan perusahaan
- `businessRegistrationNumber` - NPWP/SIUP
- Location: `address`, `city`, `province`
- Contact: `primaryContactName`, `primaryContactEmail`, `primaryContactPhone`
- `website`, `status`, `notes`

**Relations:**
- `bankAssignments[]` → BankVendorAssignment
- `machines[]` → Machine
- `users[]` → VendorUser

---

### 3. **BankVendorAssignment** (`bank_vendor_assignments`)
Assignment vendor ke bank tertentu.

**Field Utama:**
- `id` - UUID Primary Key
- `customerBankId` → CustomerBank
- `vendorId` → Vendor
- Contract: `contractNumber`, `contractStartDate`, `contractEndDate`
- `serviceScope` - Scope layanan
- `assignedBranches` - JSON array cabang yang ditangani
- SLA: `slaResponseTimeHours`, `slaResolutionTimeHours`
- `status`, `notes`

**Unique Constraint:**
- `[customerBankId, vendorId]` - Satu vendor hanya bisa di-assign sekali ke satu bank

---

### 4. **VendorUser** (`vendor_users`)
User dari vendor (technician, supervisor, admin).

**Field Utama:**
- `id` - UUID Primary Key
- `vendorId` → Vendor
- Auth: `username` (unique), `email` (unique), `passwordHash`
- Profile: `fullName`, `phone`, `whatsappNumber`, `employeeId`
- `role` - TECHNICIAN, SUPERVISOR, ADMIN (default: TECHNICIAN)
- Permissions: `canCreateTickets`, `canCloseTickets`, `canManageMachines`, `canSwapCassettes`
- `assignedBranches` - JSON array cabang yang ditangani
- `status`, `lastLogin`

**Relations:**
- `cassetteDeliveries[]` → CassetteDelivery
- `problemTickets[]` → ProblemTicket

---

### 5. **HitachiUser** (`hitachi_users`)
User internal Hitachi (admin, RC manager, RC staff).

**Field Utama:**
- `id` - UUID Primary Key
- Auth: `username` (unique), `email` (unique), `passwordHash`
- Profile: `fullName`
- `role` - SUPER_ADMIN, RC_MANAGER, RC_STAFF (default: RC_STAFF)
- `department` - MANAGEMENT, REPAIR_CENTER, LOGISTICS (default: REPAIR_CENTER)
- `status`, `lastLogin`

**Relations:**
- `receivedDeliveries[]` → CassetteDelivery
- `approvedTickets[]` → ProblemTicket
- `repairTickets[]` → RepairTicket

---

### 6. **Machine** (`machines`)
Mesin ATM Hitachi yang terinstall di bank.

**Field Utama:**
- `id` - UUID Primary Key
- Relations: `customerBankId` → CustomerBank, `vendorId` → Vendor
- `machineCode` - Kode mesin (unique, max 100 char)
- `modelNumber` - Nomor model (contoh: SR-M100)
- `modelName` - Nama model (contoh: SR7500 atau SR7500VS)
- `serialNumberManufacturer` - Serial number dari manufacturer (immutable)
- Location: `physicalLocation`, `branchCode`, `city`, `province`
- Dates: `installationDate`, `warrantyExpiryDate`, `lastMaintenanceDate`, `nextScheduledMaintenance`
- `currentWsid` - WSID saat ini (editable)
- `machineNickname` - Nama alias mesin
- `numberOfCassetteSlots` - Jumlah slot cassette (default: 6)
- `status` - OPERATIONAL, MAINTENANCE, DECOMMISSIONED, UNDER_REPAIR (default: OPERATIONAL)
- `notes`

**Relations:**
- `cassettes[]` → Cassette
- `identifierHistory[]` → MachineIdentifierHistory
- `problemTickets[]` → ProblemTicket

---

### 7. **MachineIdentifierHistory** (`machine_identifier_history`)
Riwayat perubahan identifier mesin (WSID, Serial Number, dll).

**Field Utama:**
- `id` - UUID Primary Key
- `machineId` → Machine
- `identifierType` - WSID, SERIAL_NUMBER, BRANCH_CODE, VENDOR_ASSIGNMENT
- `oldValue`, `newValue` - Nilai lama dan baru
- `changeReason`, `changedBy`, `changedAt`

---

### 8. **CassetteType** (`cassette_types`)
Master data jenis cassette (RB, AB, URJB).

**Field Utama:**
- `id` - UUID Primary Key
- `typeCode` - RB, AB, URJB (unique)
- `typeName` - Nama model cassette (contoh: "VS", "SR")
- `description` - Deskripsi cassette

**Relations:**
- `cassettes[]` → Cassette

---

### 9. **Cassette** (`cassettes`)
Kaset uang yang digunakan di mesin.

**Field Utama:**
- `id` - UUID Primary Key
- `serialNumber` - Serial number cassette (unique, max 100 char)
- Relations: `cassetteTypeId` → CassetteType, `customerBankId` → CustomerBank
- `currentMachineId` → Machine (nullable) - Mesin tempat cassette terinstall
- `positionInMachine` - Posisi di mesin (1-6, nullable)
- `status` - INSTALLED, SPARE_POOL, BROKEN, IN_TRANSIT_TO_RC, IN_REPAIR, SCRAPPED (default: SPARE_POOL)
- Dates: `manufactureDate`, `purchaseDate`, `warrantyExpiryDate`, `lastSwapDate`
- `totalSwapCount` - Jumlah swap yang pernah dilakukan (default: 0)
- `notes`

**Relations:**
- `deliveries[]` → CassetteDelivery
- `repairTickets[]` → RepairTicket

---

### 10. **ProblemTicket** (`problem_tickets`)
Tiket masalah yang dibuat vendor untuk mesin/cassette yang bermasalah.

**Field Utama:**
- `id` - UUID Primary Key
- `ticketNumber` - Nomor tiket (unique, max 50 char)
- Relations: `machineId` → Machine, `reportedBy` → VendorUser
- `title` - Judul masalah (max 255 char)
- `description` - Deskripsi masalah
- `priority` - LOW, MEDIUM, HIGH, CRITICAL (default: MEDIUM)
- `status` - OPEN, APPROVED, PENDING_VENDOR, PENDING_RC, IN_PROGRESS, RESOLVED, CLOSED (default: OPEN)
- `affectedComponents` - JSON array komponen yang terpengaruh
- `resolutionNotes` - Catatan resolusi
- Dates: `reportedAt`, `approvedAt`, `resolvedAt`, `closedAt`
- Approval: `approvedBy` → HitachiUser, `approvalNotes`

**Relations:**
- `cassetteDelivery?` → CassetteDelivery (one-to-one)

**Flow:**
1. Vendor membuat ticket (status: OPEN)
2. Admin/RC approve (status: APPROVED → PENDING_VENDOR)
3. Vendor input form delivery (status: PENDING_RC)
4. RC terima cassette (status: IN_PROGRESS)
5. RC selesai repair (status: RESOLVED)
6. Ticket ditutup (status: CLOSED)

---

### 11. **CassetteDelivery** (`cassette_deliveries`)
Form pengiriman cassette dari vendor ke RC.

**Field Utama:**
- `id` - UUID Primary Key
- `ticketId` → ProblemTicket (unique, one-to-one)
- `cassetteId` → Cassette
- `sentBy` → VendorUser
- `shippedDate` - Tanggal pengiriman
- Shipping: `courierService`, `trackingNumber`, `estimatedArrival`
- Receipt: `receivedAtRc`, `receivedBy` → HitachiUser
- `notes`

---

### 12. **RepairTicket** (`repair_tickets`)
Tiket repair untuk cassette yang diterima di RC.

**Field Utama:**
- `id` - UUID Primary Key
- `cassetteId` → Cassette
- `reportedIssue` - Masalah yang dilaporkan
- `receivedAtRc` - Tanggal diterima di RC
- `repairedBy` → HitachiUser (nullable)
- `repairActionTaken` - Tindakan repair yang dilakukan
- `partsReplaced` - JSON array parts yang diganti
- `qcPassed` - QC passed (boolean, nullable)
- `completedAt` - Tanggal selesai repair
- `status` - RECEIVED, DIAGNOSING, WAITING_PARTS, COMPLETED, SCRAPPED (default: RECEIVED)
- `notes`

---

## 🔧 Cara Mengedit Schema

### Langkah 1: Edit File Schema
Edit file `backend/prisma/schema.prisma`:

```prisma
model CassetteType {
  id          String   @id @default(uuid()) @db.Uuid
  typeCode    CassetteTypeCode @unique @map("type_code")
  typeName    String   @map("type_name") @db.VarChar(100)
  description String?
  // Tambah field baru di sini
  // createdAt  DateTime @default(now()) @map("created_at")
  // updatedAt  DateTime @updatedAt @map("updated_at")
  cassettes   Cassette[]

  @@map("cassette_types")
}
```

### Langkah 2: Apply Changes ke Database

**Opsi A: Menggunakan `prisma db push` (Development)**
```bash
cd backend
npx prisma db push
```
⚠️ **Catatan:** Ini akan langsung mengubah database tanpa migration file.

**Opsi B: Menggunakan Migration (Production/Recommended)**
```bash
cd backend
npx prisma migrate dev --name nama_perubahan
```
✅ **Recommended:** Ini akan membuat migration file dan apply ke database.

**Opsi C: Jika ada data loss warning:**
```bash
cd backend
npx prisma db push --accept-data-loss
```

### Langkah 3: Generate Prisma Client
```bash
cd backend
npx prisma generate
```

### Langkah 4: Update Seed File (jika perlu)
Edit `backend/prisma/seed.ts` untuk update data seed sesuai schema baru.

---

## ⚠️ Tips Mengedit Schema

### ✅ DO (Lakukan):
1. **Selalu backup database** sebelum perubahan besar
2. **Test di development** dulu sebelum production
3. **Gunakan migration** untuk production (bukan `db push`)
4. **Update seed file** jika field wajib ditambahkan
5. **Restart backend** setelah `prisma generate`

### ❌ DON'T (Jangan):
1. **Jangan hapus field yang masih digunakan** di code
2. **Jangan ubah type field** tanpa migrasi data
3. **Jangan hapus relation** tanpa update code yang menggunakan
4. **Jangan edit migration file** yang sudah di-apply

---

## 📝 Contoh Edit Schema

### Contoh 1: Menambah Field Baru

**Sebelum:**
```prisma
model CassetteType {
  id          String   @id @default(uuid()) @db.Uuid
  typeCode    CassetteTypeCode @unique
  typeName    String
  description String?
}
```

**Sesudah:**
```prisma
model CassetteType {
  id          String   @id @default(uuid()) @db.Uuid
  typeCode    CassetteTypeCode @unique
  typeName    String
  description String?
  notes       String?  // Field baru
}
```

**Command:**
```bash
cd backend
npx prisma db push
npx prisma generate
```

---

### Contoh 2: Menghapus Field

**Sebelum:**
```prisma
model CassetteType {
  id          String   @id @default(uuid()) @db.Uuid
  typeCode    CassetteTypeCode @unique
  typeName    String
  notes       String?  // Field yang akan dihapus
}
```

**Sesudah:**
```prisma
model CassetteType {
  id          String   @id @default(uuid()) @db.Uuid
  typeCode    CassetteTypeCode @unique
  typeName    String
  // notes dihapus
}
```

**Command:**
```bash
cd backend
npx prisma db push --accept-data-loss
npx prisma generate
```

⚠️ **Warning:** Data di field `notes` akan hilang!

---

### Contoh 3: Menambah Relation

**Sebelum:**
```prisma
model Cassette {
  id                 String   @id @default(uuid()) @db.Uuid
  serialNumber       String   @unique
  cassetteTypeId     String
  cassetteType       CassetteType @relation(...)
}
```

**Sesudah:**
```prisma
model Cassette {
  id                 String   @id @default(uuid()) @db.Uuid
  serialNumber       String   @unique
  cassetteTypeId     String
  customerBankId     String   // Field baru
  cassetteType       CassetteType @relation(...)
  customerBank       CustomerBank @relation(fields: [customerBankId], references: [id])  // Relation baru
}
```

**Command:**
```bash
cd backend
npx prisma migrate dev --name add_customer_bank_to_cassette
npx prisma generate
```

---

## 🔍 Field yang Mungkin Perlu Disesuaikan

### 1. **CassetteType** - Sudah disederhanakan ✅
- ✅ `size` - DIHAPUS
- ✅ `functionType` - DIHAPUS
- ✅ `isTracked` - DIHAPUS
- ✅ `manufacturer` - DIHAPUS
- ✅ `capacity` - DIHAPUS
- ✅ `compatibleModels` - DIHAPUS
- ✅ `standardPrice` - DIHAPUS
- ✅ `warrantyPeriodMonths` - DIHAPUS
- ✅ `typeName` - Diubah ke "VS" atau "SR"

**Sisa Field:**
- `id`, `typeCode`, `typeName`, `description`, `createdAt`, `updatedAt`

---

### 2. **CustomerBank** - Perlu dicek ⚠️

**Field yang mungkin tidak digunakan:**
- `bankAbbreviation` - Apakah perlu? Atau bisa diambil dari `bankCode`?
- `contractNumber`, `contractStartDate`, `contractEndDate`, `contractType` - Apakah semua field contract diperlukan?
- `primaryContactName`, `primaryContactEmail`, `primaryContactPhone` - Apakah cukup satu contact person?

---

### 3. **Machine** - Perlu dicek ⚠️

**Field yang mungkin tidak digunakan:**
- `modelNumber` vs `modelName` - Apakah keduanya perlu? Atau cukup `modelName`?
- `machineNickname` - Apakah digunakan?
- `numberOfCassetteSlots` - Apakah selalu 6? Atau bisa berbeda?
- `lastMaintenanceDate`, `nextScheduledMaintenance` - Apakah field maintenance diperlukan?

---

### 4. **Cassette** - Perlu dicek ⚠️

**Field yang mungkin tidak digunakan:**
- `manufactureDate` - Apakah perlu?
- `purchaseDate` - Apakah perlu?
- `lastSwapDate` - Masih perlu setelah `CassetteSwap` dihapus?
- `totalSwapCount` - Masih perlu setelah `CassetteSwap` dihapus?

---

### 5. **ProblemTicket** - Sudah OK ✅

**Flow sudah lengkap:**
- Approval flow ✅
- Status tracking ✅
- Resolution notes ✅

---

### 6. **RepairTicket** - Sudah OK ✅

**Flow sudah lengkap:**
- Repair tracking ✅
- Parts replacement ✅
- QC tracking ✅

---

## 📋 Checklist Edit Schema

Sebelum edit schema, pastikan:

- [ ] **Backup database** (jika production)
- [ ] **Test di development** dulu
- [ ] **Cek field yang digunakan** di code (`grep` field name)
- [ ] **Update seed file** jika field wajib ditambahkan
- [ ] **Update DTO** jika field berubah
- [ ] **Update service/controller** jika field berubah
- [ ] **Jalankan migration/push**
- [ ] **Generate Prisma client**
- [ ] **Restart backend**
- [ ] **Test aplikasi** setelah perubahan

---

## 🚀 Quick Commands

```bash
# Edit schema
# (Edit file backend/prisma/schema.prisma)

# Apply changes
cd backend
npx prisma db push                    # Development (quick)
# atau
npx prisma migrate dev --name change  # Production (recommended)

# Generate client
npx prisma generate

# Restart backend
npm run start:dev

# Update seed
npx prisma db seed
```

---

## 📞 Perlu Bantuan?

Jika bingung field mana yang perlu dihapus/ditambahkan:
1. Cek usage di code: `grep -r "fieldName" backend/src`
2. Cek di frontend: `grep -r "fieldName" frontend/src`
3. Tanyakan business requirement

---

**Selamat mengedit schema!** 🎉

