# 📖 Panduan Lengkap Pengguna CASTER

## Cassette Tracking & Retrieval System

---

## 📋 Daftar Isi

### Bagian 1: Informasi Umum
1. [Tentang Sistem](#tentang-sistem)
2. [User Roles & Akses](#user-roles--akses)
3. [Login & Navigasi](#login--navigasi)

### Bagian 2: Panduan Customer Bank
4. [Dashboard (Bank)](#dashboard-bank)
5. [Monitoring Inventory](#monitoring-inventory)
6. [Monitoring Service Orders](#monitoring-service-orders)
7. [Laporan & Analytics (Bank)](#laporan--analytics-bank)

### Bagian 3: Panduan Pengelola (Vendor)
8. [Dashboard (Pengelola)](#dashboard-pengelola)
9. [Manajemen Inventory](#manajemen-inventory)
10. [Service Order Management](#service-order-management)
11. [Alur Kerja Lengkap](#alur-kerja-lengkap)
12. [Laporan & History](#laporan--history)
13. [Settings & Konfigurasi](#settings--konfigurasi)

### Bagian 4: Referensi
14. [Status Reference](#status-reference)
15. [Troubleshooting](#troubleshooting)
16. [FAQ](#faq)

---

# BAGIAN 1: INFORMASI UMUM

---

## Tentang Sistem

**CASTER (Cassette Tracking & Retrieval System)** adalah sistem manajemen kaset ATM yang komprehensif untuk:
- **Tracking** - Melacak status kaset secara real-time
- **Repair** - Mengelola proses perbaikan kaset
- **Retrieval** - Mengatur pengambilan dan pengembalian kaset

### Stakeholder Utama

| Stakeholder | Deskripsi | Akses |
|-------------|-----------|-------|
| **Customer Bank** | Bank yang memiliki kaset ATM | Read-only (VIEWER) |
| **Pengelola** | Vendor yang mengelola mesin ATM | Full access per vendor |
| **Hitachi (RC)** | Repair Center yang memperbaiki kaset | Full system access |

---

## User Roles & Akses

### 🏢 Hitachi Users (Internal)

| Role | Deskripsi | Akses |
|------|-----------|-------|
| **SUPER ADMIN** | Administrator sistem | Full access, manage users, settings, bulk import |
| **RC MANAGER** | Manager Repair Center | Manage repairs, view all tickets, analytics |
| **RC STAFF** | Staff Repair Center | Process repairs, receive deliveries, QC checks |

### 🚚 Pengelola Users (Vendor)

| Role | Deskripsi | Akses |
|------|-----------|-------|
| **ADMIN** | Administrator Vendor | Manage vendor users, create tickets, full vendor access |
| **STAFF** | Staff Vendor | Create service orders, track cassettes |

### 🏦 Customer Bank Users

| Role | Deskripsi | Akses |
|------|-----------|-------|
| **VIEWER** | User Bank | Read-only: monitor inventory, view tickets, export reports |

**Catatan Customer Bank (VIEWER):**
- ✅ **Dapat melihat** semua data terkait bank mereka
- ✅ **Dapat melihat** status kaset dan mesin
- ✅ **Dapat melihat** service orders dan history
- ✅ **Dapat export** laporan
- ❌ **Tidak dapat** membuat atau mengubah data
- ❌ **Tidak dapat** membuat service order
- ❌ **Tidak dapat** mengelola user

---

## Login & Navigasi

### Cara Login

1. Buka browser dan akses URL sistem (misalnya: `http://your-server:3000`)
2. Anda akan diarahkan ke halaman login
3. Masukkan **Username** dan **Password** yang diberikan oleh administrator
4. Klik tombol **Login**
5. Setelah login berhasil, Anda akan diarahkan ke Dashboard

**Tips:**
- Gunakan browser modern (Chrome, Edge, Firefox)
- Jika lupa password, hubungi administrator sistem
- Sistem menggunakan JWT authentication dengan session management

### Menu Navigasi

| Menu | URL | Deskripsi |
|------|-----|-----------|
| Dashboard | `/dashboard` | Halaman utama dengan overview |
| Kaset | `/cassettes` | Daftar/manajemen kaset |
| Mesin | `/machines` | Daftar mesin ATM |
| Service Orders | `/tickets` | Daftar service orders |
| History | `/history` | Riwayat ticket yang sudah selesai |
| Settings | `/settings` | Pengaturan (untuk ADMIN) |

---

# BAGIAN 2: PANDUAN CUSTOMER BANK

---

## Dashboard (Bank)

Setelah login, Dashboard Customer Bank menampilkan:

### Quick Stats Cards
- **Total Kaset** - Jumlah total kaset bank
- **Kondisi Baik** - Persentase kaset dengan status OK
- **Dalam Perbaikan** - Jumlah kaset sedang diperbaiki
- **Rusak** - Jumlah kaset rusak

### Analytics Section
- Statistik kaset per status
- Statistik mesin
- Recent activities
- Service order statistics

> **Catatan:** Semua data yang ditampilkan hanya untuk bank Anda.

---

## Monitoring Inventory

### Melihat Mesin ATM Bank

1. Klik menu **Mesin** di sidebar
2. Halaman menampilkan daftar mesin ATM milik bank Anda

**Fitur:**
- **Mencari mesin** - Search bar (nomor serial, kode mesin, branch code)
- **Filter status** - OPERATIONAL, UNDER_REPAIR, INACTIVE
- **Detail mesin** - Klik pada baris untuk melihat detail
- **Identifier history** - Perubahan WSID, serial number, dll

**Informasi Mesin:**
| Field | Deskripsi |
|-------|-----------|
| Machine Code | Kode unik mesin |
| Serial Number | Nomor seri manufacturer |
| Bank | Bank pemilik |
| Status | OPERATIONAL / UNDER_REPAIR / INACTIVE |
| Lokasi | Branch Code, City, Address |
| Pengelola | Vendor yang ditugaskan |
| Jumlah Kaset | Kaset terpasang di mesin |

### Melihat Kaset Bank

1. Klik menu **Kaset** di sidebar
2. Halaman menampilkan daftar kaset milik bank Anda

**Fitur Pencarian & Filter:**
- **Search Bar** - Cari berdasarkan serial, tipe, status
- **Filter Status** - Klik status card untuk filter
- **Sorting** - Klik header kolom

**Informasi Kaset:**
| Field | Deskripsi |
|-------|-----------|
| Nomor Serial | Serial number kaset |
| Tipe Kaset | RB, AB, URJB |
| Tipe Mesin | VS, SR |
| Bank | Bank pemilik |
| Status | OK, BAD, IN_REPAIR, dll |
| Jenis Penggunaan | Utama / Cadangan |
| Cycle Problem | Jumlah service order |
| Pengelola | Vendor yang ditugaskan |

---

## Monitoring Service Orders

### Melihat Ticket Terkait Bank

1. Klik menu **Service Orders** (`/tickets`)
2. Halaman menampilkan service orders untuk kaset bank Anda

**Tab yang Tersedia:**
- **Repair** - Ticket untuk repair
- **Replacement** - Ticket untuk replacement
- **History** - Ticket yang sudah CLOSED

**Filter & Search:**
- Search: ticket number, serial number, deskripsi
- Filter Status: OPEN, IN_DELIVERY, RECEIVED, IN_PROGRESS, RESOLVED, CLOSED
- Filter Priority: LOW, MEDIUM, HIGH, CRITICAL

### Detail Repair

Untuk melihat detail repair:
1. Buka detail ticket (klik pada baris ticket)
2. Lihat informasi:
   - **Repair Status:** RECEIVED, DIAGNOSING, ON_PROGRESS, COMPLETED, SCRAPPED
   - **Repair Actions:** Tindakan perbaikan yang dilakukan
   - **Parts Replaced:** Parts yang diganti
   - **QC Result:** Hasil Quality Control
   - **Repairer:** Engineer yang melakukan perbaikan

### History Ticket

1. Klik menu **History** (`/history`)
2. Lihat semua ticket yang sudah **CLOSED** untuk bank Anda
3. Filter berdasarkan date range, priority, search term

---

## Laporan & Analytics (Bank)

### Statistik Kaset

Di halaman Dashboard atau Kaset:
- **Total Kaset** - Jumlah total kaset bank
- **Kondisi Baik** - Persentase kaset OK
- **Dalam Perbaikan** - Jumlah sedang diperbaiki
- **Rusak** - Jumlah kaset rusak

### Export Laporan

**Export CSV:**
1. Di halaman Kaset atau Service Orders
2. Klik tombol **Export CSV**
3. File CSV akan terdownload

**Format Export Kaset:**
- Serial Number, Cassette Type, Machine Type
- Bank, Status, Usage Type
- Cycle Problem (SO count), Repair Count, Pengelola

---

# BAGIAN 3: PANDUAN PENGELOLA (VENDOR)

---

## Dashboard (Pengelola)

Dashboard Pengelola menampilkan:

### Quick Stats Cards
- Total Kaset
- Kondisi Baik (%)
- Dalam Perbaikan
- Rusak

### Quick Actions
- **Kelola Kaset** - Akses ke halaman manajemen kaset
- **Buat SO** - Membuat Service Order baru

### Analytics Section
- Statistik kaset per status
- Statistik mesin
- Recent activities
- Ticket statistics

---

## Manajemen Inventory

### Melihat Mesin ATM

1. Klik menu **Mesin** di sidebar
2. Lihat daftar mesin ATM yang ditugaskan ke vendor Anda
3. Fitur: Search, Filter status, Filter bank, Detail mesin

### Melihat Kaset

1. Klik menu **Kaset** di sidebar
2. Lihat daftar kaset dari bank yang ditugaskan ke vendor Anda
3. Fitur: Search, Filter status, Filter bank, Sorting

### Mark Kaset sebagai Broken

Fitur untuk menandai kaset **OK** sebagai **rusak (BAD)**.

**Cara Menggunakan:**
1. Buka halaman **Kaset** (`/cassettes`)
2. Cari kaset dengan status **OK** yang ingin ditandai rusak
3. Di kolom **Quick Actions**, klik tombol **Tandai Rusak**
4. Dialog muncul, isi **Alasan Kaset Rusak** (wajib, min 10 karakter)
   - Contoh: "Sensor error - cassette not accepting bills"
   - Contoh: "Jammed mechanism"
5. Klik **Tandai sebagai Rusak**
6. Status kaset berubah menjadi **BAD**

**Catatan Penting:**
- ⚠️ Hanya kaset dengan status **OK** yang bisa ditandai rusak
- ⚠️ Alasan harus diisi (minimal 10 karakter)
- ⚠️ Setelah ditandai rusak, kaset dapat dibuatkan Service Order
- ⚠️ Tindakan ini tidak dapat dibatalkan

---

## Service Order Management

### Membuat Service Order (Ticket)

#### Single Cassette Ticket

1. Klik menu **Service Orders** → **Create** atau klik **Buat SO** di Dashboard
2. Pilih tipe ticket:
   - **Repair** - Untuk kaset yang perlu diperbaiki
   - **Replacement** - Untuk kaset SCRAPPED yang perlu diganti
3. Isi form ticket:
   - Machine (opsional)
   - Cassette Serial Number
   - Title dan Description (wajib)
   - Priority (LOW, MEDIUM, HIGH, CRITICAL)
   - Delivery Method (Courier, Direct Delivery)
   - Courier Info (jika pakai kurir)
4. Klik **Submit**

#### Multi-Cassette Ticket

Untuk ticket dengan multiple kaset (maksimal 30 kaset):
1. Ikuti langkah di atas
2. Klik **Add Cassette** untuk menambah kaset
3. Input serial number untuk setiap kaset
4. Isi detail masalah per kaset
5. Submit ticket

### Membuat Form Pengiriman

1. Buka detail ticket (klik pada baris ticket)
2. Klik tombol **Create Delivery**
3. Isi form pengiriman:
   - Cassettes to Ship
   - Shipping Date
   - Courier Service (JNE, TIKI, Pos Indonesia, dll)
   - Tracking Number
   - Estimated Arrival
   - Sender Address (opsional)
   - Notes (opsional)
4. Klik **Submit**

**Status Ticket:** `OPEN` → `IN_DELIVERY`
**Status Cassette:** → `IN_TRANSIT_TO_RC`

### Pickup Kaset dari RC

> **Catatan:** Flow pickup dilakukan oleh **RC Staff** yang mengonfirmasi pickup atas nama Pengelola.

**Flow Pickup:**
1. Setelah repair selesai dan QC passed, kaset status menjadi **READY_FOR_PICKUP**
2. Kaset fisik siap diambil di RC
3. Pengelola mengirim perwakilan untuk mengambil kaset di RC
4. **RC Staff** mengonfirmasi pickup di sistem dengan mengisi:
   - Nama pengambil
   - Nomor HP pengambil
   - Tanda tangan digital
   - Catatan (opsional)
5. Setelah konfirmasi:
   - **Cassette:** `READY_FOR_PICKUP` → `OK`
   - **Ticket:** `RESOLVED` → `CLOSED`

---

## Alur Kerja Lengkap

### Flow Repair Kaset

```
1. Identifikasi Kaset Rusak
   └─→ Mark Kaset sebagai Broken (OK → BAD)

2. Buat Service Order
   └─→ Ticket Status: OPEN

3. Input Form Pengiriman
   └─→ Ticket: IN_DELIVERY
   └─→ Cassette: IN_TRANSIT_TO_RC

4. Kirim Kaset Fisik ke RC

5. RC Terima Kaset
   └─→ Ticket: RECEIVED

6. RC Repair & QC
   └─→ Cassette: IN_REPAIR

7. QC Check
   ├─→ QC Passed → READY_FOR_PICKUP, Ticket: RESOLVED
   └─→ QC Failed → SCRAPPED, Ticket: RESOLVED

8. Pickup dari RC (oleh Pengelola)
   └─→ RC Staff konfirmasi pickup
   └─→ Cassette: OK, Ticket: CLOSED
```

### Flow Replacement Kaset

```
1. Kaset SCRAPPED (tidak bisa diperbaiki)

2. Buat Service Order tipe Replacement
   └─→ Ticket Status: OPEN

3. RC Input Serial Number Kaset Baru

4. Kaset Baru Status: READY_FOR_PICKUP
   └─→ Ticket: RESOLVED

5. Pickup Kaset Baru dari RC
   └─→ RC Staff konfirmasi pickup
   └─→ Cassette Baru: OK, Ticket: CLOSED
```

---

## Laporan & History

### Melihat History Ticket

1. Klik menu **History** (`/history`)
2. Lihat semua ticket yang sudah **CLOSED**
3. Filter: Date range, Status, Priority, Search

### Export Data

**Export CSV:**
1. Di halaman Kaset atau Service Orders
2. Klik tombol **Export CSV**
3. File CSV terdownload

---

## Settings & Konfigurasi

### Profile Management

1. Klik menu **Settings** (`/settings`)
2. Tab **Profile** menampilkan:
   - Username, Email, Full Name
   - Phone, Role, Status

### User Management (ADMIN Only)

Hanya user dengan role **ADMIN** yang bisa mengelola user vendor:

1. Klik **Settings** → Tab **Users**
2. Fitur:
   - **Membuat User Baru:** Add User → isi form → save
   - **Update User:** Klik user → edit → save
   - **Delete User:** Klik delete → konfirmasi

**Permission Flags:**
- `canCreateTickets` - Bisa membuat service order
- `canCloseTickets` - Bisa menutup ticket
- `canManageMachines` - Bisa manage machines

---

# BAGIAN 4: REFERENSI

---

## Status Reference

### Status Kaset

| Status | Deskripsi | Aksi Selanjutnya |
|--------|-----------|------------------|
| **OK** | Kaset dalam kondisi baik | Mark as Broken (jika rusak) |
| **BAD** | Kaset rusak | Create Service Order |
| **IN_TRANSIT_TO_RC** | Sedang dikirim ke RC | Menunggu RC menerima |
| **IN_REPAIR** | Sedang diperbaiki di RC | Menunggu repair selesai |
| **READY_FOR_PICKUP** | Siap diambil di RC | Pickup di RC |
| **SCRAPPED** | Tidak bisa diperbaiki | Request Replacement |

### Status Ticket

| Status | Deskripsi | Trigger |
|--------|-----------|---------|
| **OPEN** | Ticket baru dibuat | Create ticket |
| **IN_DELIVERY** | Kaset sedang dikirim | Create delivery |
| **RECEIVED** | RC menerima kaset | RC confirm receive |
| **IN_PROGRESS** | RC sedang memperbaiki | RC start repair |
| **RESOLVED** | Repair selesai | QC completed |
| **CLOSED** | Ticket selesai | Pickup confirmed |

### Status Repair

| Status | Deskripsi |
|--------|-----------|
| **RECEIVED** | Repair ticket dibuat |
| **DIAGNOSING** | Sedang didiagnosis |
| **ON_PROGRESS** | Sedang diperbaiki |
| **COMPLETED** | Perbaikan selesai |
| **SCRAPPED** | Tidak bisa diperbaiki |

---

## Troubleshooting

### Masalah Umum

| Masalah | Penyebab | Solusi |
|---------|----------|--------|
| Tidak bisa login | Username/password salah | Pastikan kredensial benar, hubungi admin |
| Tidak bisa lihat data | User tidak punya akses | Pastikan user di-assign ke bank/vendor |
| Tidak bisa mark as broken | Kaset bukan status OK | Hanya kaset OK yang bisa ditandai rusak |
| Tidak bisa create ticket | Permission tidak ada | Hubungi ADMIN vendor |
| Data tidak update | Cache browser | Refresh halaman (F5) |

### Error Messages

| Error | Penyebab | Solusi |
|-------|----------|--------|
| "Only OK cassettes can be marked as broken" | Kaset bukan status OK | Pastikan kaset dalam status OK |
| "Cassette not found" | Serial number tidak ada | Pastikan SN benar dan terdaftar |
| "Invalid credentials" | Username/password salah | Periksa kembali kredensial |

---

## FAQ

### Pertanyaan Umum

**Q: Apakah Customer Bank bisa membuat service order?**
A: Tidak, Customer Bank memiliki akses VIEWER (read-only). Hubungi Pengelola untuk membuat service order.

**Q: Berapa maksimal kaset per ticket?**
A: Maksimal 30 kaset per ticket (multi-cassette feature).

**Q: Bagaimana cara export data?**
A: Gunakan tombol "Export CSV" di halaman Kaset atau Service Orders.

**Q: Apakah saya bisa melihat kaset dari bank lain?**
A: Tidak, Anda hanya dapat melihat kaset dari bank/vendor Anda sendiri.

**Q: Siapa yang konfirmasi pickup?**
A: RC Staff yang mengonfirmasi pickup di sistem atas nama Pengelola.

### Kontak Support

Jika mengalami masalah:
- Hubungi administrator sistem
- Atau hubungi tim support Hitachi

---

## Keyboard Shortcuts

| Shortcut | Fungsi |
|----------|--------|
| `/` | Fokus ke search bar |
| `Escape` | Tutup dialog/modal |
| `F5` | Refresh halaman |

---

## Best Practices

### Untuk Pengelola

1. ✅ Selalu mark kaset sebagai Broken sebelum buat SO
2. ✅ Isi deskripsi masalah dengan detail
3. ✅ Input tracking number yang valid
4. ✅ Monitor status ticket secara berkala
5. ✅ Segera ambil kaset setelah READY_FOR_PICKUP

### Untuk Customer Bank

1. ✅ Cek Dashboard secara berkala untuk overview
2. ✅ Monitor Status Kaset untuk tracking
3. ✅ Review History untuk pattern masalah
4. ✅ Export Data secara berkala untuk backup
5. ✅ Koordinasi dengan vendor untuk service order

---

**Dokumen ini dibuat untuk membantu semua pengguna menggunakan sistem CASTER dengan efektif.**

**© 2025 PT Hitachi Terminal Solutions Indonesia**
