# Flow Penggunaan Aplikasi, Tech Stack, dan Skema Database

**CASTER - Cassette Tracking & Retrieval System**

## 📋 Daftar Isi

1. [Tech Stack](#tech-stack)
2. [Flow Penggunaan Aplikasi](#flow-penggunaan-aplikasi)
3. [Skema Database](#skema-database)
4. [Arsitektur Sistem](#arsitektur-sistem)

---

## 🛠️ Tech Stack

### Backend

#### Framework & Runtime
- **NestJS** (v10.3.0) - Progressive Node.js framework untuk membangun aplikasi server-side yang efisien dan scalable
- **Node.js** - JavaScript runtime environment
- **TypeScript** (v5.9.3) - Typed superset of JavaScript

#### Database & ORM
- **MySQL** - Relational database management system
- **Prisma** (v6.19.0) - Next-generation ORM untuk TypeScript dan Node.js
  - Prisma Client untuk type-safe database access
  - Prisma Migrate untuk database migrations

#### Authentication & Security
- **Passport.js** (v0.7.0) - Authentication middleware
  - `passport-jwt` (v4.0.1) - JWT strategy
  - `passport-local` (v1.0.0) - Local strategy
- **bcrypt** (v5.1.1) - Password hashing
- **@nestjs/jwt** (v10.2.0) - JWT module untuk NestJS
- **helmet** (v8.1.0) - Security headers
- **express-rate-limit** (v8.2.1) - Rate limiting
- **@nestjs/throttler** (v6.4.0) - Throttling module

#### Validation & Transformation
- **class-validator** (v0.14.0) - Decorator-based validation
- **class-transformer** (v0.5.1) - Object transformation

#### File Processing
- **multer** (v2.0.2) - File upload middleware
- **xlsx** (v0.18.5) - Excel file parsing
- **csv-parse** (v6.1.0) - CSV file parsing

#### API Documentation
- **@nestjs/swagger** (v7.1.17) - OpenAPI/Swagger documentation

#### Utilities
- **uuid** (v9.0.1) - UUID generation
- **rxjs** (v7.8.1) - Reactive programming library

### Frontend

#### Framework & Build Tools
- **Next.js** (v14.0.4) - React framework dengan SSR, SSG, dan API routes
- **React** (v18.2.0) - UI library
- **TypeScript** (v5) - Typed JavaScript

#### State Management
- **Zustand** (v4.4.7) - Lightweight state management
- **@tanstack/react-query** (v5.90.12) - Data fetching, caching, dan synchronization

#### UI Components
- **Radix UI** - Headless UI components
  - `@radix-ui/react-dialog` - Modal dialogs
  - `@radix-ui/react-dropdown-menu` - Dropdown menus
  - `@radix-ui/react-select` - Select components
  - `@radix-ui/react-tabs` - Tab components
  - `@radix-ui/react-toast` - Toast notifications
  - `@radix-ui/react-checkbox` - Checkbox components
  - `@radix-ui/react-label` - Label components
  - `@radix-ui/react-separator` - Separator components
  - `@radix-ui/react-slot` - Slot components
  - `@radix-ui/react-avatar` - Avatar components
  - `@radix-ui/react-alert-dialog` - Alert dialogs

#### Styling
- **Tailwind CSS** (v3.3.0) - Utility-first CSS framework
- **tailwindcss-animate** (v1.0.7) - Animation utilities
- **class-variance-authority** (v0.7.0) - Component variants
- **clsx** (v2.0.0) - Conditional class names
- **tailwind-merge** (v2.2.0) - Merge Tailwind classes

#### Data Visualization
- **Chart.js** (v4.5.1) - Chart library
- **react-chartjs-2** (v5.3.1) - React wrapper for Chart.js

#### PDF Generation
- **@react-pdf/renderer** (v4.3.1) - PDF generation library

#### HTTP Client
- **axios** (v1.6.2) - HTTP client

#### Utilities
- **date-fns** (v2.30.0) - Date manipulation library
- **html5-qrcode** (v2.3.8) - QR code scanning
- **use-debounce** (v10.0.6) - Debounce hook

#### Icons
- **lucide-react** (v0.303.0) - Icon library

### Development Tools

#### Backend
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Testing framework
- **ts-node** - TypeScript execution
- **ts-jest** - Jest TypeScript transformer

#### Frontend
- **ESLint** - Code linting
- **@next/bundle-analyzer** - Bundle size analysis

---

## 🔄 Flow Penggunaan Aplikasi

### 1. Authentication & Authorization

#### Login Flow
```
User → Login Page → Enter Credentials → Backend Validation → JWT Token → Store in Zustand → Redirect to Dashboard
```

**User Types:**
- **Hitachi Users** (RC Staff, RC Manager, Super Admin)
- **Pengelola Users** (Manager, Technician)

**Roles:**
- **SUPER_ADMIN**: Full access
- **RC_MANAGER**: Manage repairs, view all tickets
- **RC_STAFF**: Process repairs, manage tickets
- **MANAGER**: Manage pengelola operations
- **TECHNICIAN**: Create tickets, view assigned cassettes

### 2. Service Order (SO) Creation Flow

#### Single Cassette Ticket
```
Pengelola User → Create Ticket → Select Cassette → Fill Details → Submit → Ticket Status: OPEN
```

#### Multi-Cassette Ticket (Pengelola Only)
```
Pengelola User → Create Multi-Cassette Ticket → Select Multiple Cassettes (max 30) → Fill Details per Cassette → Submit → Ticket Status: OPEN
```

**Ticket Types:**
- **Repair**: Kaset bermasalah perlu diperbaiki
- **Replacement**: Kaset SCRAPPED perlu diganti
- **PM** (Preventive Maintenance): Maintenance rutin (saat ini dinonaktifkan)

### 3. Delivery Flow

#### Pengelola → RC Delivery
```
Pengelola User → Select Ticket → Create Delivery → Fill Shipping Details → Submit → Ticket Status: IN_DELIVERY → Cassette Status: IN_TRANSIT_TO_RC
```

**Delivery Information:**
- Courier service
- Tracking number
- Estimated arrival
- Sender details

#### RC Receives Delivery
```
RC Staff → Receive Delivery → Confirm Receipt → Ticket Status: RECEIVED → Cassette Status: IN_REPAIR
```

### 4. Repair Flow

#### Create Repair Ticket
```
RC Staff → Select Ticket → Create Repair Ticket → Assign Engineer → Repair Status: RECEIVED
```

#### Process Repair
```
Engineer → Take Repair Ticket → Diagnose Issue → Perform Repair → Update Status:
  - DIAGNOSING → ON_PROGRESS → COMPLETED
```

#### Quality Control (QC)
```
Engineer → Complete Repair → QC Check:
  - QC Passed → Cassette Status: READY_FOR_PICKUP → Ticket Status: RESOLVED
  - QC Failed → Cassette Status: SCRAPPED → Ticket Status: RESOLVED (tetap di RC)
```

**Repair Information:**
- Reported issue
- Repair action taken
- Parts replaced (JSON array)
- QC result
- Repairer information

### 5. Replacement Flow

#### Request Replacement
```
Pengelola User → Select SCRAPPED Cassette → Create Replacement Ticket → Fill Details → Submit → Ticket Status: OPEN
```

**Requirements:**
- Only SCRAPPED cassettes can be replaced
- Cassette must not already be in replacement process
- New cassette serial number must be provided

#### Process Replacement
```
RC Staff → Receive Replacement Ticket → Create Delivery → New Cassette Status: IN_TRANSIT_TO_RC → Receive at RC → Link Old & New Cassette → Ticket Status: RESOLVED
```

**Replacement Mapping:**
- Old cassette serial number (SCRAPPED)
- New cassette serial number (OK)
- Replacement ticket ID

### 6. Pickup Confirmation Flow (RC-Only)

#### Confirm Pickup
```
RC Staff → Select Ticket (RESOLVED) → Confirm Pickup → Fill Details:
  - Recipient name
  - Recipient phone
  - Digital signature
  - Notes (optional)
→ Submit → Ticket Status: CLOSED → Cassette Status: OK (if pickup) or SCRAPPED (if disposal)
```

**Pickup Types:**
- **Normal Pickup**: Kaset READY_FOR_PICKUP diambil oleh Pengelola
- **Disposal**: Kaset SCRAPPED dikonfirmasi untuk disposal (tetap di RC)

### 7. Machine & Cassette Management Flow

#### Machine Assignment
```
Super Admin → Settings → Assignments → Select Pengelola → Select Machines → Assign → Machines linked to Pengelola → Cassettes (10 per machine) auto-assigned
```

**Machine Distribution:**
- Bulk assign: Assign multiple machines to one pengelola
- Distribute: Distribute unassigned machines evenly among multiple pengelola
- Unassign: Remove machine assignment

#### Cassette Management
```
User → Resources → Cassettes → View/Filter/Search → View Details → View History
```

**Cassette Statuses:**
- **OK**: Operational, ready to use
- **BAD**: Faulty, needs repair
- **IN_TRANSIT_TO_RC**: Being shipped to RC
- **IN_REPAIR**: Currently being repaired
- **READY_FOR_PICKUP**: Repaired and ready for pickup
- **IN_TRANSIT_TO_PENGELOLA**: Being shipped back to Pengelola
- **SCRAPPED**: Cannot be repaired, needs replacement

### 8. Bulk Import Flow

#### Excel/CSV Import
```
Super Admin → Settings → Data Management → Bulk Import → Download Template → Fill Data → Upload File → Process → View Results
```

**Import Types:**
- **Banks**: Import customer bank data
- **Cassettes**: Import cassette data
- **Machine-Cassette**: Import machines with linked cassettes (5 MAIN + 5 BACKUP per machine)

**Template Format:**
- Excel: `.xlsx` with sheets (Banks, Cassettes, Machine-Cassette)
- CSV: `.csv` with headers

### 9. Analytics & Reporting Flow

#### View Analytics
```
User → Dashboard → Analytics Section → Select Date Range → View Metrics:
  - Operational Metrics (MTTR, MTBF, Cycle Time, Turnaround Time)
  - Cassette Analytics (Top 10 Problematic, Cycle Problem Distribution, Age Distribution, Utilization Rate)
  - Repair Analytics (Success Rate, Parts Replacement, Top Issues)
  - Service Order Analytics (Trend, Priority Distribution, Status Distribution, Top Banks/Pengelola)
```

#### Generate PDF Report
```
User → Ticket Detail → Generate Report → PDF Download → Contains:
  - Ticket information
  - Cassette details
  - Repair history
  - Parts replaced
  - Pickup information (signature, recipient)
  - Replacement mapping (if applicable)
```

### 10. Settings Management Flow

#### Manage Banks
```
Super Admin → Settings → Banks → Create/Edit/Delete Bank → Set Contact Information
```

#### Manage Pengelola
```
Super Admin → Settings → Pengelola → Create/Edit/Delete Pengelola → Set Company Information
```

#### Manage Assignments
```
Super Admin → Settings → Assignments → Assign Banks to Pengelola → Assign Machines to Pengelola → Set SLA
```

#### Manage Users
```
Super Admin/Manager → Settings → Users → Create/Edit/Delete User → Set Permissions → Assign Roles
```

---

## 🗄️ Skema Database

### Entity Relationship Diagram (ERD) Overview

```
CustomerBank (1) ──< (N) BankPengelolaAssignment (N) >── (1) Pengelola
     │                                                          │
     │                                                          │
     │ (1)                                                     │ (1)
     │                                                          │
     │                                                          │
     ▼                                                          ▼
Machine (N) ──< (1) Cassette (N) ──< (1) ProblemTicket (N) >── (1) PengelolaUser
     │                │                        │
     │                │                        │
     │                │                        │
     │                │                        │
     │                ▼                        ▼
     │         RepairTicket (N)        TicketCassetteDetail (N)
     │                │
     │                │
     │                │
     │                ▼
     │         CassetteDelivery (N)
     │                │
     │                │
     │                ▼
     │         CassetteReturn (N)
```

### Core Models

#### CustomerBank
**Purpose**: Menyimpan informasi bank customer

**Key Fields:**
- `id`: UUID primary key
- `bankCode`: Unique bank code
- `bankName`: Bank name
- `primaryContactName`, `primaryContactEmail`, `primaryContactPhone`: Contact information
- `status`: ACTIVE/INACTIVE

**Relations:**
- `pengelolaAssignments`: Many-to-many dengan Pengelola
- `cassettes`: One-to-many dengan Cassette
- `machines`: One-to-many dengan Machine

#### Pengelola
**Purpose**: Menyimpan informasi vendor/pengelola

**Key Fields:**
- `id`: UUID primary key
- `pengelolaCode`: Unique pengelola code
- `companyName`: Company name
- `companyAbbreviation`: Company abbreviation
- `primaryContactName`, `primaryContactEmail`, `primaryContactPhone`: Contact information
- `status`: ACTIVE/INACTIVE

**Relations:**
- `bankAssignments`: Many-to-many dengan CustomerBank
- `users`: One-to-many dengan PengelolaUser
- `machines`: One-to-many dengan Machine

#### BankPengelolaAssignment
**Purpose**: Menyimpan assignment bank ke pengelola

**Key Fields:**
- `id`: UUID primary key
- `customerBankId`: Foreign key ke CustomerBank
- `pengelolaId`: Foreign key ke Pengelola
- `contractNumber`: Contract number
- `contractStartDate`, `contractEndDate`: Contract dates
- `assignedBranches`: JSON array of branch codes
- `slaResponseTimeHours`, `slaResolutionTimeHours`: SLA configuration
- `status`: ACTIVE/INACTIVE

**Unique Constraint:**
- `customerBankId` + `pengelolaId` (composite unique)

#### Machine
**Purpose**: Menyimpan informasi mesin ATM

**Key Fields:**
- `id`: UUID primary key
- `customerBankId`: Foreign key ke CustomerBank
- `pengelolaId`: Foreign key ke Pengelola (optional)
- `machineCode`: Machine code
- `serialNumberManufacturer`: Manufacturer serial number
- `modelName`: Machine model
- `physicalLocation`: Physical location
- `status`: OPERATIONAL/UNDER_REPAIR/INACTIVE
- `installationDate`: Installation date

**Relations:**
- `customerBank`: Many-to-one dengan CustomerBank
- `pengelola`: Many-to-one dengan Pengelola (optional)
- `cassettes`: One-to-many dengan Cassette

#### Cassette
**Purpose**: Menyimpan informasi kaset

**Key Fields:**
- `id`: UUID primary key
- `serialNumber`: Unique serial number
- `cassetteTypeId`: Foreign key ke CassetteType
- `customerBankId`: Foreign key ke CustomerBank
- `machineId`: Foreign key ke Machine (optional)
- `status`: OK/BAD/IN_TRANSIT_TO_RC/IN_REPAIR/READY_FOR_PICKUP/IN_TRANSIT_TO_PENGELOLA/SCRAPPED
- `usageType`: MAIN/BACKUP
- `replacedCassetteId`: Foreign key ke Cassette (if replaced)
- `replacementTicketId`: Foreign key ke ProblemTicket (if replacement)

**Relations:**
- `cassetteType`: Many-to-one dengan CassetteType
- `customerBank`: Many-to-one dengan CustomerBank
- `machine`: Many-to-one dengan Machine (optional)
- `problemTickets`: One-to-many dengan ProblemTicket (as primary cassette)
- `repairTickets`: One-to-many dengan RepairTicket
- `ticketCassetteDetails`: One-to-many dengan TicketCassetteDetail (as detail cassette)

#### ProblemTicket
**Purpose**: Menyimpan informasi Service Order (SO)

**Key Fields:**
- `id`: UUID primary key
- `ticketNumber`: Unique ticket number (format: SO-YYYYMMDD-XXXX)
- `type`: REPAIR/REPLACEMENT/PM
- `cassetteId`: Foreign key ke Cassette (primary cassette, optional for multi-cassette)
- `reportedBy`: Foreign key ke PengelolaUser
- `status`: OPEN/IN_DELIVERY/RECEIVED/IN_PROGRESS/RESOLVED/CLOSED
- `priority`: LOW/MEDIUM/HIGH/URGENT
- `affectedComponents`: JSON array of affected components
- `reportedIssue`: Reported issue description
- `notes`: Additional notes

**Relations:**
- `cassette`: Many-to-one dengan Cassette (primary cassette)
- `reporter`: Many-to-one dengan PengelolaUser
- `cassetteDetails`: One-to-many dengan TicketCassetteDetail (multi-cassette tickets)
- `cassetteDelivery`: One-to-one dengan CassetteDelivery
- `cassetteReturn`: One-to-one dengan CassetteReturn
- `repairTickets`: One-to-many dengan RepairTicket

#### TicketCassetteDetail
**Purpose**: Menyimpan detail kaset untuk multi-cassette tickets

**Key Fields:**
- `id`: UUID primary key
- `ticketId`: Foreign key ke ProblemTicket
- `cassetteId`: Foreign key ke Cassette
- `affectedComponents`: JSON array of affected components
- `requestReplacement`: Boolean flag untuk replacement request

**Relations:**
- `ticket`: Many-to-one dengan ProblemTicket
- `cassette`: Many-to-one dengan Cassette

#### RepairTicket
**Purpose**: Menyimpan informasi repair ticket

**Key Fields:**
- `id`: UUID primary key
- `cassetteId`: Foreign key ke Cassette
- `reportedIssue`: Reported issue
- `receivedAtRc`: Received date at RC
- `repairedBy`: Foreign key ke HitachiUser
- `status`: RECEIVED/DIAGNOSING/ON_PROGRESS/COMPLETED/SCRAPPED
- `repairActionTaken`: Repair action description
- `partsReplaced`: JSON array of replaced parts
- `qcPassed`: Boolean QC result
- `completedAt`: Completion date

**Relations:**
- `cassette`: Many-to-one dengan Cassette
- `repairer`: Many-to-one dengan HitachiUser

#### CassetteDelivery
**Purpose**: Menyimpan informasi pengiriman kaset dari Pengelola ke RC

**Key Fields:**
- `id`: UUID primary key
- `ticketId`: Foreign key ke ProblemTicket
- `cassetteId`: Foreign key ke Cassette
- `sentBy`: Foreign key ke PengelolaUser
- `shippedDate`: Shipping date
- `courierService`: Courier service name
- `trackingNumber`: Tracking number
- `receivedAtRc`: Received date at RC
- `receivedBy`: Foreign key ke HitachiUser

**Relations:**
- `ticket`: Many-to-one dengan ProblemTicket
- `cassette`: Many-to-one dengan Cassette
- `sender`: Many-to-one dengan PengelolaUser
- `receiver`: Many-to-one dengan HitachiUser

#### CassetteReturn
**Purpose**: Menyimpan informasi pengembalian kaset dari RC ke Pengelola

**Key Fields:**
- `id`: UUID primary key
- `ticketId`: Foreign key ke ProblemTicket
- `cassetteId`: Foreign key ke Cassette
- `sentBy`: Foreign key ke HitachiUser
- `shippedDate`: Shipping date
- `courierService`: Courier service name
- `trackingNumber`: Tracking number
- `receivedAtPengelola`: Received date at Pengelola
- `receivedBy`: Foreign key ke PengelolaUser
- `confirmedByRc`: Foreign key ke HitachiUser (pickup confirmation)
- `rcConfirmedAt`: RC confirmation date
- `rcSignature`: Digital signature (base64)

**Relations:**
- `ticket`: Many-to-one dengan ProblemTicket
- `cassette`: Many-to-one dengan Cassette
- `sender`: Many-to-one dengan HitachiUser
- `receiver`: Many-to-one dengan PengelolaUser
- `rcConfirmer`: Many-to-one dengan HitachiUser

#### HitachiUser
**Purpose**: Menyimpan informasi user Hitachi (RC Staff, RC Manager, Super Admin)

**Key Fields:**
- `id`: UUID primary key
- `username`: Unique username
- `email`: Unique email
- `passwordHash`: Hashed password
- `fullName`: Full name
- `role`: SUPER_ADMIN/RC_MANAGER/RC_STAFF
- `status`: ACTIVE/INACTIVE

#### PengelolaUser
**Purpose**: Menyimpan informasi user Pengelola

**Key Fields:**
- `id`: UUID primary key
- `pengelolaId`: Foreign key ke Pengelola
- `username`: Unique username
- `email`: Unique email
- `passwordHash`: Hashed password
- `fullName`: Full name
- `role`: MANAGER/TECHNICIAN
- `canCreateTickets`: Boolean permission
- `canCloseTickets`: Boolean permission
- `canManageMachines`: Boolean permission
- `assignedBranches`: JSON array of branch codes (for technicians)
- `status`: ACTIVE/INACTIVE

**Relations:**
- `pengelola`: Many-to-one dengan Pengelola

### Enums

#### ProblemTicketStatus
```typescript
enum ProblemTicketStatus {
  OPEN              // Ticket baru dibuat
  IN_DELIVERY       // Kaset sedang dikirim ke RC
  RECEIVED          // Kaset diterima di RC
  IN_PROGRESS       // Perbaikan sedang berlangsung
  RESOLVED          // Perbaikan selesai, siap diambil (Ready for Pickup)
  CLOSED            // Ticket ditutup setelah pickup
}
```

#### RepairTicketStatus
```typescript
enum RepairTicketStatus {
  RECEIVED          // Repair ticket dibuat
  DIAGNOSING        // Sedang didiagnosis
  ON_PROGRESS       // Sedang diperbaiki
  COMPLETED         // Perbaikan selesai
  SCRAPPED          // Kaset tidak bisa diperbaiki
}
```

#### CassetteStatus
```typescript
enum CassetteStatus {
  OK                        // Operational
  BAD                       // Faulty
  IN_TRANSIT_TO_RC          // Sedang dikirim ke RC
  IN_REPAIR                 // Sedang diperbaiki
  READY_FOR_PICKUP          // Siap diambil
  IN_TRANSIT_TO_PENGELOLA   // Sedang dikirim ke Pengelola
  SCRAPPED                  // Tidak bisa diperbaiki
}
```

#### CassetteUsageType
```typescript
enum CassetteUsageType {
  MAIN      // Kaset utama (5 pertama per mesin)
  BACKUP    // Kaset cadangan (5 berikutnya per mesin)
}
```

#### OrganizationStatus
```typescript
enum OrganizationStatus {
  ACTIVE    // Aktif
  INACTIVE  // Nonaktif
}
```

### Indexes

**Performance Optimization:**
- Foreign key indexes untuk semua relations
- Composite indexes untuk common queries:
  - `customerBankId` + `status` (Cassette)
  - `machineId` + `status` (Cassette)
  - `customerBankId` + `pengelolaId` (BankPengelolaAssignment)
  - `ticketId` + `cassetteId` (TicketCassetteDetail)

### Soft Deletes

**Models dengan soft delete:**
- `ProblemTicket`: `deletedAt`, `deletedBy`
- `RepairTicket`: `deletedAt`
- `PreventiveMaintenance`: `deletedAt`, `deletedBy`

**Purpose**: Menjaga data history sambil menghapus dari tampilan aktif

---

## 🏗️ Arsitektur Sistem

### Backend Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                       │
└────────────────────┬────────────────────────────────────┘
                      │ HTTP/HTTPS
                      │
┌─────────────────────▼────────────────────────────────────┐
│              NestJS Application Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Controllers │  │   Services   │  │   Guards    │   │
│  │  (REST API)  │  │  (Business   │  │ (Auth/Role)  │   │
│  │              │  │   Logic)     │  │              │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                │                  │            │
│  ┌──────▼────────────────▼──────────────────▼───────┐   │
│  │           Prisma Client (ORM)                     │   │
│  └──────────────────────┬────────────────────────────┘   │
└─────────────────────────┼────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────┐
│                    MySQL Database                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Tables     │  │   Indexes    │  │  Relations   │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Frontend Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Application                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Pages      │  │  Components │  │    Hooks     │   │
│  │  (Routes)    │  │   (UI)      │  │  (Logic)     │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                │                  │            │
│  ┌──────▼────────────────▼──────────────────▼───────┐   │
│  │        State Management (Zustand)                  │   │
│  │        Data Fetching (React Query)                 │   │
│  └──────────────────────┬────────────────────────────┘   │
└─────────────────────────┼────────────────────────────────┘
                          │ Axios
                          │
┌─────────────────────────▼────────────────────────────────┐
│              Backend API (NestJS)                         │
└──────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Action** → Frontend Component
2. **Component** → Zustand Store / React Query Hook
3. **Hook** → Axios HTTP Request
4. **Backend Controller** → Service Layer
5. **Service** → Prisma Client
6. **Prisma** → MySQL Database
7. **Response** → Frontend (via React Query cache)
8. **UI Update** → Component re-render

### Security Layers

1. **Frontend**: JWT token storage (Zustand)
2. **API Gateway**: Rate limiting, CORS
3. **Authentication**: JWT validation (Passport)
4. **Authorization**: Role-based access control (Guards)
5. **Database**: Foreign key constraints, indexes

---

## 📝 Catatan Penting

### Best Practices

1. **Database**: Selalu gunakan transactions untuk operasi multi-table
2. **API**: Validasi input dengan class-validator
3. **Frontend**: Gunakan React Query untuk caching dan auto-refresh
4. **Security**: Jangan expose sensitive data di frontend
5. **Performance**: Gunakan indexes untuk query optimization

### Common Patterns

1. **Soft Delete**: Gunakan `deletedAt` untuk maintain history
2. **Status Transitions**: Validasi status transitions dengan validators
3. **Multi-Cassette**: Gunakan `TicketCassetteDetail` untuk tickets dengan multiple cassettes
4. **JSON Fields**: Store arrays/objects as JSON strings in LongText fields

---

**Dokumentasi ini dibuat untuk memberikan overview lengkap tentang aplikasi CASTER (Cassette Tracking & Retrieval System).**

**Last Updated**: Desember 2024

