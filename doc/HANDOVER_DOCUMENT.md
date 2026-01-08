# 📝 Dokumen Serah Terima - CASTER Application

> Dokumen ini ditujukan untuk vendor/developer baru yang akan melanjutkan maintenance aplikasi CASTER.

---

## 📋 Daftar Isi

1. [Overview Proyek](#1-overview-proyek)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Project Structure](#3-project-structure)
4. [Setup Development Environment](#4-setup-development-environment)
5. [Database Schema Overview](#5-database-schema-overview)
6. [Key Business Logic](#6-key-business-logic)
7. [API Endpoints](#7-api-endpoints)
8. [Common Tasks](#8-common-tasks)
9. [Known Issues & TODOs](#9-known-issues--todos)
10. [Contact & Resources](#10-contact--resources)

---

## 1. Overview Proyek

### Apa itu CASTER?

**CASTER (Cassette Tracking & Retrieval System)** adalah sistem manajemen kaset ATM untuk:
- Tracking lifecycle kaset: inventory → repair → return
- Manajemen Service Order (repair & replacement)
- Multi-tenant: Bank customers, Pengelola (vendor), Hitachi (RC)

### Business Context

- **Bank** → pemilik mesin ATM dan kaset
- **Pengelola** → vendor yang mengelola mesin ATM di lapangan
- **Hitachi RC** → Repair Center yang memperbaiki kaset
- **Flow**: Pengelola kirim kaset rusak → RC repair → Return ke Pengelola

---

## 2. Tech Stack & Architecture

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | ≥18.x | Runtime |
| **NestJS** | 10.x | Backend framework |
| **TypeScript** | 5.x | Language |
| **Prisma** | 5.x | ORM |
| **MySQL** | 8.x | Database |
| **JWT + Passport** | - | Authentication |
| **Swagger** | - | API Documentation |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 14.x | Frontend framework (App Router) |
| **React** | 18.x | UI Library |
| **TypeScript** | 5.x | Language |
| **Tailwind CSS** | 3.x | Styling |
| **shadcn/ui** | - | UI Components |
| **Zustand** | - | State Management |
| **Axios** | - | HTTP Client |

### Architecture Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│     Backend     │────▶│    Database     │
│   (Next.js)     │     │    (NestJS)     │     │    (MySQL)      │
│  Port: 3001     │     │   Port: 3000    │     │   Port: 3306    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌──────────┐
                        │ Swagger  │
                        │   /api   │
                        └──────────┘
```

---

## 3. Project Structure

```
hcm/
├── backend/                    # NestJS Backend
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema (IMPORTANT!)
│   │   └── migrations/         # Database migrations
│   ├── src/
│   │   ├── auth/               # JWT authentication
│   │   ├── audit/              # Audit logging
│   │   ├── cassettes/          # Cassette CRUD
│   │   ├── machines/           # Machine CRUD
│   │   ├── tickets/            # Service Order (Problem Tickets)
│   │   ├── repairs/            # Repair Tickets
│   │   ├── preventive-maintenance/  # PM module
│   │   ├── pengelola/          # Pengelola users
│   │   ├── banks/              # Customer banks
│   │   ├── warranty/           # Warranty system
│   │   ├── common/             # Shared guards, filters, etc
│   │   └── main.ts             # Entry point
│   ├── scripts/                # Utility scripts
│   └── data/                   # Import data files
│
├── frontend/                   # Next.js Frontend
│   ├── src/
│   │   ├── app/                # Pages (App Router)
│   │   ├── components/         # Reusable components
│   │   ├── lib/                # API client, utilities
│   │   └── store/              # Zustand stores
│   └── public/                 # Static assets
│
├── doc/                        # Documentation
│   ├── MAINTENANCE_GUIDE.md
│   ├── SECURITY_CHECKLIST.md
│   └── ...
│
└── [Root Config Files]
    ├── README.md
    ├── TECH_STACK.md
    ├── API_ENDPOINTS_DOCUMENTATION.md
    └── docker-compose.yml
```

---

## 4. Setup Development Environment

### Prerequisites

- Node.js ≥ 18.x
- MySQL 8.x (atau XAMPP)
- Git

### Step-by-Step Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd hcm

# 2. Install backend dependencies
cd backend
npm install

# 3. Setup environment
cp .env.example .env   # Edit .env dengan credential lokal

# 4. Setup database
npx prisma migrate dev
npx prisma generate

# 5. Seed data (optional)
npm run seed

# 6. Start backend
npm run start:dev       # Runs on port 3000

# --- Di terminal lain ---

# 7. Install frontend dependencies
cd frontend
npm install

# 8. Setup frontend environment
cp .env.local.example .env.local

# 9. Start frontend
npm run dev             # Runs on port 3001
```

### Access Points

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api

### Default Credentials (Setelah Seed)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@example.com | password123 |
| Pengelola | pengelola@example.com | password123 |
| RC Staff | rcstaff@example.com | password123 |

---

## 5. Database Schema Overview

### Core Entities

```
CustomerBank          Pengelola              HitachiUser
     │                    │                       │
     ├── Machine          ├── PengelolaUser       │
     │      │             │                       │
     └── Cassette ◄───────┴───────────────────────┘
            │
            ├── RepairTicket
            ├── ProblemTicket (Service Order)
            └── PreventiveMaintenance
```

### Key Models (dari `schema.prisma`)

| Model | Purpose |
|-------|---------|
| `CustomerBank` | Master data bank (BNI, BCA, dll) |
| `Pengelola` | Vendor yang mengelola ATM |
| `Machine` | Mesin ATM |
| `Cassette` | Kaset ATM dengan status tracking |
| `ProblemTicket` | Service Order (repair/replacement) |
| `RepairTicket` | Tiket perbaikan di RC |
| `AuditLog` | Audit trail semua perubahan |

### Cassette Status Flow

```
OK → BAD → IN_TRANSIT_TO_RC → IN_REPAIR → READY_FOR_PICKUP → OK
                                    │
                                    └─→ SCRAPPED (jika gagal QC)
```

---

## 6. Key Business Logic

### Service Order Flow (Repair)

1. **Pengelola** create ticket → status `OPEN`
2. **Pengelola** kirim kaset → status `IN_DELIVERY`, cassette `IN_TRANSIT_TO_RC`
3. **RC** terima kaset → status `RECEIVED`, cassette `IN_REPAIR`
4. **RC** repair & QC:
   - Pass → cassette `READY_FOR_PICKUP`
   - Fail → cassette `SCRAPPED`
5. **RC** confirm pickup → status `CLOSED`

### Replacement Flow

1. Hanya kaset `SCRAPPED` yang bisa di-replace
2. RC input SN kaset baru
3. Kaset baru status `OK`, kaset lama tetap `SCRAPPED`

### Important Files

| File | Contains |
|------|----------|
| `backend/src/tickets/tickets.service.ts` | Service Order logic |
| `backend/src/repairs/repairs.service.ts` | Repair ticket logic |
| `backend/src/cassettes/cassettes.service.ts` | Cassette status changes |
| `backend/src/auth/` | JWT authentication |

---

## 7. API Endpoints

Full documentation: [API_ENDPOINTS_DOCUMENTATION.md](../API_ENDPOINTS_DOCUMENTATION.md)

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | User login |
| POST | `/auth/logout` | User logout |
| GET | `/tickets` | List Service Orders |
| POST | `/tickets` | Create Service Order |
| GET | `/repairs` | List Repair Tickets |
| PATCH | `/repairs/:id/complete` | Complete repair |
| GET | `/cassettes` | List Cassettes |
| GET | `/machines` | List Machines |
| GET | `/dashboard/statistics` | Dashboard stats |

### Swagger

Akses Swagger UI di `http://localhost:3000/api` untuk dokumentasi interaktif.

---

## 8. Common Tasks

### Menambah Field Baru di Database

```bash
# 1. Edit schema.prisma
# 2. Create migration
npx prisma migrate dev --name add_new_field

# 3. Regenerate client
npx prisma generate
```

### Menambah Endpoint Baru

1. Buat/edit DTO di `src/module/dto/`
2. Tambah method di service (`*.service.ts`)
3. Tambah route di controller (`*.controller.ts`)
4. Update Swagger decorators

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Build Production

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

---

## 9. Known Issues & TODOs

### Known Issues

1. **PM Module** - Sementara dinonaktifkan (sedang refactor)
2. **Bulk import** - Perlu validasi lebih ketat untuk data Excel

### Future Improvements

- [ ] Implement real-time notifications (WebSocket)
- [ ] Add email notifications
- [ ] Multi-language support
- [ ] Mobile app

---

## 10. Contact & Resources

### Repository

- **Git URL**: [TBD]
- **Branch `main`**: Production code
- **Branch `develop`**: Development

### Documentation

| Document | Path |
|----------|------|
| README | `/README.md` |
| API Docs | `/API_ENDPOINTS_DOCUMENTATION.md` |
| Tech Stack | `/TECH_STACK.md` |
| Setup Guide | `/SETUP_GUIDE.md` |
| Schema Guide | `/backend/SCHEMA_GUIDE.md` |

### Previous Developer

- **Name**: [TBD]
- **Email**: [TBD]
- **Available for questions until**: [TBD]

### External Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)

---

## ✅ Handover Checklist

Sebelum serah terima selesai, pastikan:

- [ ] Developer baru memiliki akses ke repository
- [ ] Developer baru bisa setup local environment
- [ ] Semua credential production sudah diserahkan
- [ ] SSH access ke server (jika ada)
- [ ] Database access credentials
- [ ] Q&A session untuk kompleksitas bisnis

---

*Dokumen ini terakhir diupdate: Desember 2024*
