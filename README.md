# 🎯 CASTER - Cassette Tracking & Retrieval System
<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)

**Sistem Manajemen Kaset untuk Perbankan** - Aplikasi web modern untuk mengelola lifecycle kaset ATM, mulai dari inventory, service order, repair, hingga preventive maintenance.

[Features](#-features) • [Tech Stack](#-tech-stack) • [Installation](#-installation) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 📖 Tentang Project

**CASTER - Cassette Tracking & Retrieval System** adalah sistem manajemen kaset ATM yang komprehensif untuk membantu bank dan vendor mengelola seluruh lifecycle kaset, dari inventory hingga maintenance. Sistem ini dirancang untuk meningkatkan efisiensi operasional, mengurangi downtime, dan memastikan kaset selalu dalam kondisi optimal.

### 🎯 Expectation

- ✅ **Manajemen Inventory** - Tracking kaset real-time dengan status dan lokasi
- ✅ **Service Order Management** - Alur kerja lengkap untuk repair dan replacement
- ✅ **Repair Tracking** - Monitoring perbaikan kaset dari awal hingga selesai dan ketersedian kaset di flm termonitoring
- ✅ **Multi-User Support** - Role-based access untuk Pengelola, RC Staff, dan Hitachi Admin

---

## ✨ Features

### 🔧 Core Features

- **📦 Inventory Management**
  - Real-time tracking kaset dengan status (INSTALLED, SPARE_POOL, IN_REPAIR, dll)
  - Manajemen mesin ATM dan lokasi
  - History swap dan perpindahan kaset

- **🎫 Service Order System**
  - Multi-cassette ticket support
  - Request repair, replacement, dan preventive maintenance
  - Status tracking dari OPEN hingga CLOSED
  - Pickup-based return flow

- **🔨 Repair Management**
  - Repair ticket per kaset
  - Diagnosis, action taken, dan parts replaced tracking
  - Status: RECEIVED → IN_PROGRESS → COMPLETED
  - Integration dengan service order


- **👥 User Management**
  - Multi-role: PENGELOLA, RC_STAFF, RC_MANAGER, SUPER_ADMIN
  - JWT authentication
  - Role-based access control

### 🎨 UI/UX Features

- 🌓 **Dark/Light Mode** - Toggle tema sesuai preferensi
- 📱 **Responsive Design** - Optimal di desktop, tablet, dan mobile
- 🔔 **Real-time Notifications** - Badge untuk pending tasks
- 📊 **Dashboard Analytics** - Statistik dan insights
- 🔍 **Advanced Search & Filter** - Cari dan filter data dengan mudah

---

## 🛠️ Tech Stack

### Backend

- **Framework**: [NestJS](https://nestjs.com/) - Progressive Node.js framework
- **Language**: TypeScript 5.0+
- **ORM**: [Prisma](https://www.prisma.io/) - Next-generation ORM
- **Database**: 
  - MySQL 8.0+ (Production)
  - PostgreSQL 15+ (Alternative)
- **Authentication**: JWT (Passport.js)
- **API Documentation**: Swagger/OpenAPI
- **Scheduling**: @nestjs/schedule (Cron jobs)

### Frontend

- **Framework**: [Next.js 14](https://nextjs.org/) - React framework
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **HTTP Client**: Axios

### DevOps & Tools

- **Version Control**: Git
- **Package Manager**: npm
- **Code Quality**: ESLint
- **Database Migrations**: Prisma Migrate

---

## 📦 Installation

### Prerequisites

- **Node.js** >= 18.0.0
- **Database**: MySQL 8.0+ atau PostgreSQL 15+
- **Git**

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/dikaipan/casper.git
cd casper

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Setup environment variables
# Backend: Copy backend/env.template to backend/.env
# Frontend: Copy frontend/env.local.template to frontend/.env.local

# 4. Setup database
cd backend
npx prisma migrate dev
npx prisma generate

# 5. Seed database (optional)
npm run seed

# 6. Start development servers
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Detailed Setup

Untuk panduan setup lengkap, lihat:
- 📘 [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Panduan setup detail
- 🚀 [QUICK_SETUP.md](./QUICK_SETUP.md) - Quick reference guide

---

## 🚀 Usage

### Access Application

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api

### Default Login

Setelah seed database, gunakan credentials default:
- **Pengelola**: `pengelola@example.com` / `password123`
- **RC Staff**: `rcstaff@example.com` / `password123`
- **Super Admin**: `admin@example.com` / `password123`

### Flow Update (Des 2025)

- **Pickup RC-only**: Konfirmasi pickup dilakukan oleh RC saja (mewakili Pengelola) dengan tanda tangan digital serta input nama & nomor HP penerima.
- **Repair flow**: QC Passed → `READY_FOR_PICKUP`, QC Failed → `SCRAPPED` (tetap di RC, bisa ditutup tanpa pickup).
- **Replacement flow**: Hanya kaset `SCRAPPED` yang bisa diganti; tidak ada disposal; pickup dilakukan dari RC; dialog pickup menampilkan mapping SN lama → SN baru.
- **Active SO**: Tab Repair dan Replacement dipisah; CLOSED hanya muncul di History.
- **History**: Tidak ada label “REPLACEMENT”; hanya tiket CLOSED yang ditampilkan.
- **Settings**: Semua pengaturan (banks, pengelola, assignments, users, bulk import, data management) dipusatkan di halaman `Settings`.
- **PDF Report**: Menampilkan nama & HP penerima, tanda tangan pickup, serta informasi replacement (SN lama ↔ baru). Tidak ada disposal certificate untuk replacement.

### Main Workflows

1. **Create Service Order**
   - Login sebagai Pengelola
   - Buka “Service Orders” → “Create”
   - Pilih tipe: Repair atau Replacement (PM sedang dinonaktifkan)
   - Isi detail dan submit

2. **Process Repair**
   - RC Staff menerima kaset di RC (status kaset menjadi `IN_REPAIR`)
   - Lakukan diagnosis & perbaikan; QC:
     - Lolos QC → kaset menjadi `READY_FOR_PICKUP`
     - Gagal QC → kaset menjadi `SCRAPPED` (tetap di RC)

3. **Process Replacement**
   - Hanya kaset `SCRAPPED` yang dapat diajukan replacement
   - RC input SN baru (kaset baru status `OK`)
   - Tidak ada langkah return/disposal terpisah

4. **Confirm Pickup (RC-only)**
   - RC membuka tiket (repair atau replacement)
   - Isi nama & nomor HP penerima, tanda tangan digital, dan catatan
   - Submit: tiket menjadi `CLOSED`; status kaset OK (pickup) atau tetap SCRAPPED (gagal QC)

---

## 📚 Documentation

### Available Guides

- 📖 [API Documentation](./API_ENDPOINTS_DOCUMENTATION.md) - Complete API reference
- 🗄️ [Database Schema](./backend/SCHEMA_GUIDE.md) - Database structure
- 🔧 [Tech Stack](./TECH_STACK.md) - Detailed tech stack
- 🚀 [Deployment Guide](./FREE_HOSTING_GUIDE.md) - Free hosting options
- 📊 [Monitoring Guide](./GRAFANA_MONITORING_GUIDE.md) - Grafana setup
- ⚡ [Performance Optimization](./doc/PERFORMANCE_OPTIMIZATION.md) - Load time optimization guide

### Additional Resources

- 📝 [Postman Collection](./HCM-API.postman_collection.json) - API testing
- 🔄 [Migration Guide](./MIGRASI_MYSQL_GUIDE.md) - Database migration
- 📋 [Changelog](./doc/CHANGELOG_OPTIMASI.md) - Version history

---

## 🗄️ Database Schema (Ringkas)

Gambaran singkat tabel inti (detail lengkap di `backend/SCHEMA_GUIDE.md`):

- **customers_banks**: Master bank pelanggan; relasi ke mesin & kaset (`id` → machines.customerBankId, cassettes.customerBankId).
- **pengelola & bank_pengelola_assignments**: Vendor/pengelola dan assignment bank + cabang.
- **machines**: Mesin ATM; relasi ke kaset (machineId), status (OPERATIONAL/UNDER_REPAIR/INACTIVE).
- **cassette_types**: Tipe kaset (MAIN/BACKUP) dan machineType.
- **cassettes**: Inventory kaset dengan status enum (`OK`, `BAD`, `IN_TRANSIT_TO_RC`, `IN_REPAIR`, `READY_FOR_PICKUP`, `IN_TRANSIT_TO_PENGELOLA`, `SCRAPPED`); relasi ke bank, pengelola, mesin, replacement (self-relation).
- **problem_tickets**: Service order (repair/replacement); relasi ke kaset tunggal atau detail multi-kaset (`ticketCassetteDetails`).
- **repair_tickets**: Tiket perbaikan di RC; hasil QC dapat mengubah kaset ke `READY_FOR_PICKUP` atau `SCRAPPED`.
- **cassette_returns**: Konfirmasi pickup dengan tanda tangan RC/Pengelola.
- **preventive_maintenance_tasks**: PM terjadwal per mesin & kaset.

Skema visual & field lengkap: lihat `backend/SCHEMA_GUIDE.md` atau Swagger untuk model API.

---

## 🏗️ Project Structure

```
hcm/
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── cassettes/      # Cassette management
│   │   ├── machines/       # Machine management
│   │   ├── tickets/        # Service order management
│   │   ├── repairs/         # Repair ticket management
│   │   ├── preventive-maintenance/  # PM module
│   │   └── ...
│   ├── prisma/             # Database schema & migrations
│   └── scripts/            # Utility scripts
│
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/            # Next.js app router pages
│   │   ├── components/     # React components
│   │   ├── lib/            # Utilities
│   │   └── store/          # State management
│   └── public/             # Static assets
│
└── doc/                    # Documentation files
```

---

## 🤝 Contributing

Kontribusi sangat diterima! Untuk berkontribusi:

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write meaningful commit messages
- Update documentation for new features
- Add tests when applicable

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- **Development Team** - [dikaipan](https://github.com/dikaipan)

---

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) - Amazing backend framework
- [Next.js](https://nextjs.org/) - Powerful React framework
- [Prisma](https://www.prisma.io/) - Great ORM
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components

---

## 📞 Support

Untuk pertanyaan atau support:
- 📧 Email: [.]
- 🐛 Issues: [GitHub Issues](https://github.com/dikaipan/casper/issues)
- 📖 Documentation: [Full Documentation](./doc/README.md)

---

<div align="center">

**Made with ❤️ for better cassette management**

⭐ Star this repo if you find it helpful!

</div>

