# Panduan Role dan Akses Sistem

Dokumen ini menjelaskan semua role yang tersedia di sistem Hitachi CRM Management System beserta akses dan permission yang dimiliki masing-masing role.

## Daftar Isi
1. [Tipe User](#tipe-user)
2. [Hitachi User Roles](#hitachi-user-roles)
3. [Vendor User Roles](#vendor-user-roles)
4. [Ringkasan Akses](#ringkasan-akses)
5. [Permission Matrix](#permission-matrix)

---

## Tipe User

Sistem memiliki 2 tipe user utama:

### 1. HITACHI
User internal Hitachi yang bekerja di Repair Center (RC), Management, atau Logistics.

### 2. VENDOR
User dari vendor/service provider yang bertanggung jawab untuk maintenance dan service mesin ATM di bank.

---

## Hitachi User Roles

### 1. SUPER_ADMIN
**Deskripsi:** Administrator tertinggi dengan akses penuh ke semua fitur sistem.

**Department:** Bisa dari MANAGEMENT, REPAIR_CENTER, atau LOGISTICS

**Akses dan Permission:**

#### User Management
- ✅ **Membuat Hitachi Users** (RC_STAFF, RC_MANAGER, SUPER_ADMIN)
- ✅ **Melihat semua Hitachi Users**
- ✅ **Mengupdate Hitachi Users**
- ✅ **Menghapus Hitachi Users**

#### Bank Management
- ✅ **Membuat Bank baru**
- ✅ **Melihat semua Banks**
- ✅ **Mengupdate Bank**
- ✅ **Menghapus Bank**
- ✅ **Melihat statistik Bank**

#### Vendor Management
- ✅ **Membuat Vendor baru**
- ✅ **Melihat semua Vendors**
- ✅ **Mengupdate Vendor**
- ✅ **Menghapus Vendor**
- ✅ **Membuat Vendor Users** (untuk vendor manapun)
- ✅ **Mengupdate Vendor Users**
- ✅ **Menghapus Vendor Users**
- ✅ **Melihat machines per vendor**

#### Machine Management
- ✅ **Membuat Machine baru**
- ✅ **Melihat semua Machines** (tanpa filter)
- ✅ **Mengupdate Machine**
- ✅ **Mengupdate WSID Machine** (dengan history tracking)
- ✅ **Menghapus Machine**
- ✅ **Melihat identifier history**
- ✅ **Melihat machine statistics**

#### Cassette Management
- ✅ **Membuat Cassette baru**
- ✅ **Melihat semua Cassettes** (tanpa filter)
- ✅ **Melihat spare pool**
- ✅ **Melihat cassette statistics**

#### Ticket Management
- ✅ **Melihat semua Tickets** (tanpa filter)
- ✅ **Mengupdate Ticket**
- ✅ **Menerima delivery dari vendor**
- ✅ **Membuat return delivery ke vendor**
- ✅ **Menutup ticket dengan resolution notes**
- ✅ **Melihat ticket statistics**

#### Repair Management
- ✅ **Melihat semua Repair Tickets**
- ✅ **Membuat Repair Ticket** (saat menerima cassette)
- ✅ **Mengupdate Repair Ticket**
- ✅ **Menyelesaikan Repair** (dengan QC)

#### Import/Export
- ✅ **Bulk Import data** (banks, vendors, machines, cassettes)

---

### 2. RC_MANAGER
**Deskripsi:** Manager di Repair Center yang mengelola operasional repair dan dapat melihat semua data.

**Department:** REPAIR_CENTER

**Akses dan Permission:**

#### User Management
- ✅ **Melihat semua Hitachi Users**

#### Bank Management
- ✅ **Melihat semua Banks**
- ✅ **Melihat statistik Bank**

#### Vendor Management
- ✅ **Melihat semua Vendors**
- ✅ **Melihat machines per vendor**

#### Machine Management
- ✅ **Melihat semua Machines** (tanpa filter)
- ✅ **Melihat identifier history**
- ✅ **Melihat machine statistics**

#### Cassette Management
- ✅ **Melihat semua Cassettes** (tanpa filter)
- ✅ **Melihat spare pool**
- ✅ **Melihat cassette statistics**

#### Ticket Management
- ✅ **Melihat semua Tickets** (tanpa filter)
- ✅ **Mengupdate Ticket**
- ✅ **Menerima delivery dari vendor**
- ✅ **Membuat return delivery ke vendor**
- ✅ **Menutup ticket dengan resolution notes**
- ✅ **Melihat ticket statistics**

#### Repair Management
- ✅ **Melihat semua Repair Tickets**
- ✅ **Membuat Repair Ticket** (saat menerima cassette)
- ✅ **Mengupdate Repair Ticket**
- ✅ **Menyelesaikan Repair** (dengan QC)

---

### 3. RC_STAFF
**Deskripsi:** Staff di Repair Center yang menangani repair cassette dan update status ticket.

**Department:** REPAIR_CENTER

**Akses dan Permission:**

#### Bank Management
- ✅ **Melihat semua Banks**

#### Vendor Management
- ✅ **Melihat semua Vendors**

#### Machine Management
- ✅ **Melihat semua Machines** (tanpa filter)
- ✅ **Melihat identifier history**
- ✅ **Melihat machine statistics**

#### Cassette Management
- ✅ **Melihat semua Cassettes** (tanpa filter)
- ✅ **Melihat spare pool**
- ✅ **Melihat cassette statistics**

#### Ticket Management
- ✅ **Melihat semua Tickets** (tanpa filter)
- ✅ **Mengupdate Ticket**
- ✅ **Menerima delivery dari vendor**
- ✅ **Membuat return delivery ke vendor**
- ✅ **Menutup ticket dengan resolution notes**

#### Repair Management
- ✅ **Melihat semua Repair Tickets**
- ✅ **Membuat Repair Ticket** (saat menerima cassette)
- ✅ **Mengupdate Repair Ticket**
- ✅ **Menyelesaikan Repair** (dengan QC)

---

## Vendor User Roles

### 1. ADMIN
**Deskripsi:** Administrator vendor yang dapat mengelola semua user di vendor mereka dan memiliki akses penuh ke data vendor.

**Akses dan Permission:**

#### User Management (Vendor)
- ✅ **Membuat Vendor Users** (untuk vendor mereka sendiri)
- ✅ **Mengupdate Vendor Users** (untuk vendor mereka sendiri)
- ✅ **Menghapus Vendor Users** (untuk vendor mereka sendiri)
- ✅ **Melihat semua users di vendor mereka**

#### Bank Management
- ✅ **Melihat Banks** yang ditugaskan ke vendor mereka

#### Machine Management
- ✅ **Melihat Machines** yang ditugaskan ke vendor mereka
- ✅ **Melihat identifier history**
- ✅ **Melihat machine statistics**

#### Cassette Management
- ✅ **Melihat Cassettes** dari banks yang ditugaskan
- ✅ **Melihat spare pool** untuk banks yang ditugaskan
- ✅ **Melihat cassette statistics**

#### Ticket Management
- ✅ **Membuat Problem Ticket**
- ✅ **Melihat Tickets** yang dibuat oleh vendor mereka
- ✅ **Membuat delivery form** untuk mengirim cassette ke RC
- ✅ **Menerima return delivery** dari RC
- ✅ **Mencari cassette** untuk ticket

#### Cassette Operations
- ✅ **Swap Cassette** (broken dengan spare)
- ✅ **Mark Cassette as Broken**

---

### 2. SUPERVISOR
**Deskripsi:** Supervisor vendor yang mengawasi tim technician dan memiliki akses ke semua data vendor.

**Akses dan Permission:**

#### Bank Management
- ✅ **Melihat Banks** yang ditugaskan ke vendor mereka

#### Machine Management
- ✅ **Melihat Machines** yang ditugaskan ke vendor mereka
- ✅ **Melihat identifier history**
- ✅ **Melihat machine statistics**

#### Cassette Management
- ✅ **Melihat Cassettes** dari banks yang ditugaskan
- ✅ **Melihat spare pool** untuk banks yang ditugaskan
- ✅ **Melihat cassette statistics**

#### Ticket Management
- ✅ **Membuat Problem Ticket**
- ✅ **Melihat Tickets** yang dibuat oleh vendor mereka
- ✅ **Membuat delivery form** untuk mengirim cassette ke RC
- ✅ **Menerima return delivery** dari RC
- ✅ **Mencari cassette** untuk ticket

#### Cassette Operations
- ✅ **Swap Cassette** (broken dengan spare)
- ✅ **Mark Cassette as Broken**

**Catatan:** Supervisor tidak bisa mengelola user (create/update/delete), hanya bisa melihat data operasional.

---

### 3. SUPERVISOR
**Deskripsi:** Supervisor vendor yang melakukan maintenance di lapangan. Akses bisa dibatasi berdasarkan assigned branches.

**Permission Flags:**
- `canCreateTickets`: Bisa membuat ticket (default: true)
- `canCloseTickets`: Bisa menutup ticket (default: false)
- `canManageMachines`: Bisa manage machines (default: false)
- `assignedBranches`: Array branch codes yang bisa diakses (null = semua branches vendor)

**Akses dan Permission:**

#### Machine Management
- ✅ **Melihat Machines** di assigned branches mereka (atau semua jika null)
- ✅ **Melihat identifier history**
- ✅ **Melihat machine statistics**

#### Cassette Management
- ✅ **Melihat Cassettes** dari assigned branches mereka
- ✅ **Melihat spare pool** untuk assigned branches mereka
- ✅ **Melihat cassette statistics**

#### Ticket Management
- ✅ **Membuat Problem Ticket** (jika `canCreateTickets = true`)
- ✅ **Melihat Tickets** di assigned branches mereka
- ✅ **Membuat delivery form** untuk mengirim cassette ke RC
- ✅ **Menerima return delivery** dari RC
- ✅ **Menutup ticket** (jika `canCloseTickets = true`)
- ✅ **Mencari cassette** untuk ticket

#### Cassette Operations
- ✅ **Swap Cassette** (broken dengan spare)
- ✅ **Mark Cassette as Broken**

**Catatan:** Technician tidak bisa mengelola user atau melihat data di luar assigned branches mereka (kecuali jika `assignedBranches = null`).

---

## Ringkasan Akses

### Hitachi Users

| Fitur | SUPER_ADMIN | RC_MANAGER | RC_STAFF |
|-------|-------------|------------|----------|
| **User Management** |
| Create Hitachi Users | ✅ | ❌ | ❌ |
| View Hitachi Users | ✅ | ✅ | ❌ |
| Update Hitachi Users | ✅ | ❌ | ❌ |
| Delete Hitachi Users | ✅ | ❌ | ❌ |
| Create Vendor Users | ✅ | ❌ | ❌ |
| Update Vendor Users | ✅ | ❌ | ❌ |
| Delete Vendor Users | ✅ | ❌ | ❌ |
| **Bank Management** |
| Create Banks | ✅ | ❌ | ❌ |
| View Banks | ✅ | ✅ | ✅ |
| Update Banks | ✅ | ❌ | ❌ |
| Delete Banks | ✅ | ❌ | ❌ |
| **Vendor Management** |
| Create Vendors | ✅ | ❌ | ❌ |
| View Vendors | ✅ | ✅ | ✅ |
| Update Vendors | ✅ | ❌ | ❌ |
| Delete Vendors | ✅ | ❌ | ❌ |
| **Machine Management** |
| Create Machines | ✅ | ❌ | ❌ |
| View Machines | ✅ | ✅ | ✅ |
| Update Machines | ✅ | ❌ | ❌ |
| Update WSID | ✅ | ❌ | ❌ |
| Delete Machines | ✅ | ❌ | ❌ |
| **Cassette Management** |
| Create Cassettes | ✅ | ❌ | ❌ |
| View Cassettes | ✅ | ✅ | ✅ |
| Swap Cassettes | ❌ | ❌ | ❌ |
| **Ticket Management** |
| Create Tickets | ❌ | ❌ | ❌ |
| View Tickets | ✅ | ✅ | ✅ |
| Update Tickets | ✅ | ✅ | ✅ |
| Receive Delivery | ✅ | ✅ | ✅ |
| Create Return | ✅ | ✅ | ✅ |
| Close Tickets | ✅ | ✅ | ✅ |
| **Repair Management** |
| View Repairs | ✅ | ✅ | ✅ |
| Create Repair Ticket | ✅ | ✅ | ✅ |
| Update Repair | ✅ | ✅ | ✅ |
| Complete Repair | ✅ | ✅ | ✅ |
| **Import** |
| Bulk Import | ✅ | ❌ | ❌ |

### Vendor Users

| Fitur | ADMIN | SUPERVISOR |
|-------|-------|------------|------------|
| **User Management** |
| Create Vendor Users | ✅ | ❌ |
| View Vendor Users | ✅ | ❌ |
| Update Vendor Users | ✅ | ❌ |
| Delete Vendor Users | ✅ | ❌ |
| **Bank Management** |
| View Banks | ✅ (assigned) | ✅ (assigned) |
| **Machine Management** |
| View Machines | ✅ (assigned) | ✅ (assigned) |
| Update Machines | ❌ | ❌ |
| **Cassette Management** |
| View Cassettes | ✅ (assigned) | ✅ (assigned) |
| Mark Broken | ✅ | ✅ |
| **Ticket Management** |
| Create Tickets | ✅ | ✅* |
| View Tickets | ✅ (vendor) | ✅ (vendor) |
| Create Delivery | ✅ | ✅ |
| Close Tickets | ❌ | ✅* |
| **Repair Management** |
| View Repairs | ❌ | ❌ |

*Tergantung permission flags (`canCreateTickets`, `canCloseTickets`)

---

## Permission Matrix

### Akses Berdasarkan Module

#### 1. Dashboard
- **Semua User:** ✅ Akses dashboard dengan statistik sesuai permission

#### 2. Users Management (`/users`)
- **SUPER_ADMIN:** ✅ Full access (create, read, update, delete)
- **Lainnya:** ❌ No access

#### 3. Banks Management (`/banks`)
- **SUPER_ADMIN:** ✅ Full access (create, read, update, delete)
- **RC_MANAGER, RC_STAFF:** ✅ Read only
- **Vendor Users:** ✅ Read only (assigned banks)

#### 4. Vendors Management (`/vendors`)
- **SUPER_ADMIN:** ✅ Full access (create, read, update, delete)
- **RC_MANAGER, RC_STAFF:** ✅ Read only
- **Vendor Users:** ❌ No access

#### 5. Machines Management (`/machines`)
- **SUPER_ADMIN:** ✅ Full access (create, read, update, delete, update WSID)
- **RC_MANAGER, RC_STAFF:** ✅ Read only
- **Vendor Users:** ✅ Read only (filtered by vendor/assigned branches)

#### 6. Cassettes Management (`/cassettes`)
- **SUPER_ADMIN:** ✅ Full access (create, read)
- **RC_MANAGER, RC_STAFF:** ✅ Read only
- **Vendor Users:** ✅ Read + Swap + Mark Broken (filtered by assigned)

#### 7. Tickets Management (`/tickets`)
- **SUPER_ADMIN, RC_MANAGER, RC_STAFF:** ✅ Full access (read, update, receive delivery, create return, close)
- **Vendor Users:** ✅ Create tickets, view own tickets, create delivery, receive return

#### 8. Repairs Management (`/repairs`)
- **SUPER_ADMIN, RC_MANAGER, RC_STAFF:** ✅ Full access
- **Vendor Users:** ❌ No access

#### 9. Import (`/import`)
- **SUPER_ADMIN:** ✅ Full access
- **Lainnya:** ❌ No access

---

## Catatan Penting

### 1. Filter Data
- **Vendor Users** hanya melihat data dari:
  - Banks yang ditugaskan ke vendor mereka
  - Machines yang ditugaskan ke vendor mereka
  - Cassettes dari banks yang ditugaskan
  - Tickets yang dibuat oleh vendor mereka

### 2. Technician Branch Restriction
- **Technician** dengan `assignedBranches` hanya melihat data di branches tersebut
- Jika `assignedBranches = null`, technician melihat semua data vendor mereka

### 3. Permission Flags (Vendor Users)
- `canCreateTickets`: Kontrol apakah user bisa membuat ticket
- `canCloseTickets`: Kontrol apakah user bisa menutup ticket
- `canManageMachines`: Kontrol akses manage machines (belum diimplementasi)

### 4. Department (Hitachi Users)
- **REPAIR_CENTER**: Staff yang bekerja di repair center
- **MANAGEMENT**: Staff management
- **LOGISTICS**: Staff logistics

### 5. Status User
- Semua user harus memiliki status `ACTIVE` untuk bisa login
- User dengan status `INACTIVE` atau `SUSPENDED` tidak bisa login

---

## Best Practices

1. **SUPER_ADMIN** sebaiknya hanya diberikan kepada staff IT/Management yang benar-benar membutuhkan akses penuh
2. **RC_MANAGER** untuk manager yang perlu melihat semua data tapi tidak perlu create/update
3. **RC_STAFF** untuk staff operasional yang hanya perlu update status repair dan ticket
4. **Vendor ADMIN** untuk admin vendor yang perlu manage user di vendor mereka
5. **Vendor SUPERVISOR** untuk supervisor yang perlu monitoring tanpa manage user
6. **Vendor SUPERVISOR** dengan `assignedBranches` untuk membatasi akses ke area tertentu (opsional)

---

## Troubleshooting

### User tidak bisa akses fitur tertentu
1. Cek role user di database
2. Cek `userType` (HITACHI atau VENDOR)
3. Cek permission flags untuk vendor users
4. Cek `assignedBranches` untuk technician
5. Cek status user (harus ACTIVE)

### Vendor user tidak melihat data
1. Cek vendor assignment ke bank
2. Cek `assignedBranches` untuk technician
3. Cek apakah data memang ada di vendor yang ditugaskan

---

**Dokumen ini terakhir diupdate:** 2025-01-21

