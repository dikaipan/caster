## 📦 Tech Stack Aplikasi HCS Cassette Management

Dokumen ini merangkum teknologi utama yang digunakan pada proyek ini, dari backend, frontend, database, sampai tooling pendukung.

---

### 🔧 Backend

- **Platform & Bahasa**
  - **Node.js**: Runtime JavaScript untuk server.
  - **TypeScript**: Bahasa utama, memberikan type-safety dan DX yang lebih baik.

- **Framework**
  - **NestJS**:
    - Arsitektur modular (modules, controllers, services).
    - Dependency Injection.
    - Decorators untuk routing, guards, pipes, interceptors.
    - Integrasi mudah dengan Swagger, JWT, dan scheduling.

- **ORM & Akses Data**
  - **Prisma ORM**
    - File schema utama: `backend/prisma/schema.prisma`.
    - Skema khusus MySQL: `backend/prisma/schema.mysql.prisma`.
    - Migrations untuk sinkronisasi schema ↔ database.
    - Digunakan di semua layanan domain (`cassettes`, `machines`, `tickets`, `repairs`, `preventive-maintenance`, `warranty`, dll).

- **API & Keamanan**
  - **REST API** berbasis NestJS (controllers per domain).
  - **JWT Authentication**
    - Guard: `JwtAuthGuard`.
    - Role-based access: `RolesGuard` + decorator `@Roles()` dan `@AllowUserTypes()`.
  - **Swagger / OpenAPI**
    - Dokumentasi interaktif untuk semua endpoint.
    - Dirangkum juga di `API_ENDPOINTS_DOCUMENTATION.md`.

- **Scheduling & Background Jobs**
  - **@nestjs/schedule**
    - Cron untuk cleanup data soft-delete (misalnya PM yang sudah lewat tahun tertentu).

- **Error Handling & Logging**
  - Exception bawaan NestJS: `NotFoundException`, `BadRequestException`, `ForbiddenException`, dsb.
  - `Logger` NestJS untuk debug dan audit (contoh: perhitungan statistik, analitik, migrasi).
  - `HttpExceptionFilter` untuk menangkap dan format error response.

- **Monitoring (Opsional - Bisa Ditambahkan)**
  - **Grafana + Prometheus**: Platform monitoring untuk infrastruktur, aplikasi, dan bisnis metrics.
  - **prom-client**: Library untuk expose metrics dalam format Prometheus.
  - Panduan implementasi lengkap: `GRAFANA_MONITORING_GUIDE.md`.

---

### 🗄️ Database & Data Layer

- **Database Utama**
  - **MySQL / MariaDB**
    - Saat ini menjadi database utama (sebelumnya PostgreSQL).
    - Dikonsumsi melalui Prisma dengan provider `"mysql"`.

- **Tooling DB**
  - **Prisma Migrate**
    - Mengelola versi schema dan migrasi.
  - **Prisma Studio**
    - GUI untuk membaca/ubah data.
  - **XAMPP + phpMyAdmin**
    - Lingkungan MySQL lokal yang digunakan di workstation Anda.

- **Migrasi PostgreSQL → MySQL**
  - Panduan & script:
    - `MIGRASI_MYSQL_GUIDE.md`
    - `MIGRASI_MYSQL_XAMPP_GUIDE.md`
    - `backend/MIGRATE_POSTGRESQL_TO_MYSQL.md`
  - Script pendukung:
    - `backend/scripts/migrate-to-mysql.ps1` / `.sh`
    - `backend/scripts/export-postgresql-to-mysql.ts`
    - Berbagai script cek & import data (Excel/CSV) untuk mesin dan kaset.

---

### 💻 Frontend

- **Platform & Framework**
  - **Next.js (App Router)**
    - Routing berbasis file di `frontend/src/app/**`.
    - Pemisahan halaman untuk tickets, repairs, PM, machines, cassettes, dashboard, dll.
  - **React + TypeScript**
    - `useState`, `useEffect`, `useCallback`, `useRef` untuk state management lokal.
    - Komponen-komponen terstruktur (layout, dialog, tabel, kartu statistik).

- **UI & Styling**
  - **shadcn/ui + Radix UI**
    - Komponen seperti `Dialog`, `Select`, `Tabs`, `Badge`, `AlertDialog`, dsb.
  - **Tailwind CSS**
    - Utility-first CSS.
    - Dukungan **dark/light mode** dengan `dark:` classes.
    - Dipakai konsisten di seluruh page (`/repairs`, `/tickets`, `/machines`, `/cassettes`, dsb).

- **HTTP & Integrasi API**
  - **Axios**
    - Wrapper `api` di `frontend/src/lib/api.ts` untuk komunikasi dengan backend NestJS.
    - Digunakan di halaman-halaman utama (tickets, repairs, PM, machines, cassettes, banks, dashboard).

- **UX & Fitur Khusus**
  - Komponen skeleton loading (`TableSkeleton`, `StatsCardSkeleton`, `CassetteTableSkeleton`) untuk UX saat loading.
  - Error boundary ringan (`ErrorWithRetry`) dengan tombol retry.
  - **LocalStorage** untuk:
    - Menyimpan daftar SO yang sudah dilihat (`viewed-tickets.ts`) → badge “Active SOs” di sidebar hanya untuk tiket baru.
  - Validasi form di frontend (wajib field, pilihan status, dsb) melengkapi validasi di backend.

---

### 🛠️ Dev Tools & Utilities

- **Node & npm Scripts**
  - Skrip untuk:
    - Menjalankan backend & frontend.
    - `prisma:migrate`, `prisma:generate`, `prisma:seed`.
    - Script khusus data:
      - `delete:machines-cassettes`
      - `import:excel-mysql`
      - `analyze:excel-cassettes`
      - `verify:machine-cassette-links`
      - `fix:cassette-status`

- **Scripting & Otomasi**
  - **TypeScript scripts** di `backend/scripts/**` untuk:
    - Migrasi data (PostgreSQL → MySQL).
    - Analisis & import data dari Excel/CSV (1600 mesin × 10 kaset).
    - Perbaikan status kaset setelah return (`fix-cassette-status-after-return.ts`).

- **Lingkungan Lokal**
  - **PowerShell** (Windows) dan **Bash** (Linux/Mac) untuk menjalankan script otomatis.
  - XAMPP/MySQL sebagai DB lokal.

---

### 🧩 Fitur Bisnis Utama yang Ditopang Tech Stack

- Manajemen **Service Order (SO)** dan tiket problem kaset (single & multi-cassette).
- Proses **repair** kaset (multi-step wizard + integrasi warranty).
- **Warranty system** per bank & per kaset (status GRATIS / BERBAYAR).
- **Preventive Maintenance (PM)** dengan soft delete & cleanup otomatis.
- **CRUD Machine & Cassette** (Super Admin), termasuk validasi penghapusan.
- **Notifikasi Active SO (badge merah)** di sidebar berdasarkan tiket baru yang belum dibaca.
- **Pending Return & Return Flow** dengan dukungan multi-kaset.

---

### 📊 Monitoring & Observability

- **Grafana + Prometheus** (Opsional)
  - Monitoring infrastruktur (CPU, RAM, disk, network).
  - Monitoring aplikasi (response time, error rate, request count).
  - Monitoring database (query performance, connection pool).
  - Monitoring bisnis (tickets, cassettes, repairs, pending returns).
  - Alerting otomatis untuk masalah kritis.
  - Panduan implementasi: `GRAFANA_MONITORING_GUIDE.md`.

---

Dokumen ini bisa diperluas bila nanti ada penambahan teknologi baru (misalnya logging eksternal, CI/CD, atau containerization). Untuk integrasi ke sistem perusahaan lain, lihat juga `API_ENDPOINTS_DOCUMENTATION.md`.


