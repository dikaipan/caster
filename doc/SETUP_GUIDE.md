# 🚀 Panduan Setup Aplikasi HCM di Laptop Baru

Panduan lengkap untuk menjalankan aplikasi **HCS Cassette Management (HCM)** di laptop lain.

---

## 📋 Prerequisites (Persyaratan)

Sebelum memulai, pastikan laptop sudah terinstall:

1. **Node.js** (versi 18 atau lebih baru)
   - Download: https://nodejs.org/
   - Verifikasi: `node --version` (harus >= 18.0.0)
   - Verifikasi: `npm --version`

2. **Database** (pilih salah satu):
   - **PostgreSQL 15+** (recommended)
   - **MySQL 8.0+** (alternatif)
   - Download: https://www.postgresql.org/download/ atau https://dev.mysql.com/downloads/

3. **Git** (untuk clone repository)
   - Download: https://git-scm.com/downloads

4. **Code Editor** (opsional, tapi recommended)
   - Visual Studio Code: https://code.visualstudio.com/

---

## 🔧 Step 1: Clone Repository

```bash
# Clone repository dari Git
git clone <repository-url>
cd hcm

# Atau jika menggunakan folder yang sudah ada, pastikan sudah di folder hcm
```

---

## 🗄️ Step 2: Setup Database

### Opsi A: PostgreSQL (Recommended)

1. **Install PostgreSQL** (jika belum ada)
   - Download dari: https://www.postgresql.org/download/
   - Install dengan default settings
   - Catat password untuk user `postgres`

2. **Buat Database**
   ```sql
   -- Buka PostgreSQL Command Line atau pgAdmin
   -- Login sebagai postgres user
   
   CREATE DATABASE hcm_development;
   CREATE USER hcm_user WITH PASSWORD 'hcm_password';
   GRANT ALL PRIVILEGES ON DATABASE hcm_development TO hcm_user;
   ```

3. **Update Connection String**
   - Format: `postgresql://hcm_user:hcm_password@localhost:5432/hcm_development?schema=public`
   - Akan digunakan di file `.env` (lihat Step 3)

### Opsi B: MySQL (Alternatif)

1. **Install MySQL** (jika belum ada)
   - Download dari: https://dev.mysql.com/downloads/
   - Install dengan default settings
   - Catat password untuk root user

2. **Buat Database**
   ```sql
   -- Buka MySQL Command Line atau MySQL Workbench
   
   CREATE DATABASE hcm_development;
   CREATE USER 'hcm_user'@'localhost' IDENTIFIED BY 'hcm_password';
   GRANT ALL PRIVILEGES ON hcm_development.* TO 'hcm_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

3. **Update Connection String**
   - Format: `mysql://hcm_user:hcm_password@localhost:3306/hcm_development`
   - Akan digunakan di file `.env` (lihat Step 3)

---

## ⚙️ Step 3: Setup Environment Variables

### Backend Environment

1. **Buat file `.env` di folder `backend/`**
   ```bash
   cd backend
   copy env.template .env
   # Atau di Linux/Mac: cp env.template .env
   ```

2. **Edit file `.env`** dan sesuaikan dengan konfigurasi database Anda:
   ```env
   # Database
   DATABASE_URL="postgresql://hcm_user:hcm_password@localhost:5432/hcm_development?schema=public"
   # Atau untuk MySQL:
   # DATABASE_URL="mysql://hcm_user:hcm_password@localhost:3306/hcm_development"

   # JWT
   JWT_SECRET="your-super-secret-jwt-key-change-in-production"
   JWT_EXPIRATION="15m"
   JWT_REFRESH_SECRET="your-refresh-token-secret-change-in-production"
   JWT_REFRESH_EXPIRATION="7d"

   # Server
   NODE_ENV="development"
   PORT=3000

   # CORS
   CORS_ORIGIN="http://localhost:3001"
   ```

   **⚠️ PENTING:**
   - Ganti `DATABASE_URL` sesuai dengan database yang Anda buat di Step 2
   - Ganti `JWT_SECRET` dan `JWT_REFRESH_SECRET` dengan string random yang aman
   - Pastikan `PORT` backend (3000) dan `CORS_ORIGIN` frontend (3001) sesuai

### Frontend Environment (Opsional)

Frontend biasanya tidak memerlukan file `.env` karena menggunakan hardcoded API URL (`http://localhost:3000`).

Jika perlu custom API URL, buat file `.env.local` di folder `frontend/`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## 📦 Step 4: Install Dependencies

### Backend Dependencies

```bash
# Masuk ke folder backend
cd backend

# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate
```

### Frontend Dependencies

```bash
# Kembali ke root folder, lalu masuk ke folder frontend
cd ../frontend

# Install dependencies
npm install
```

---

## 🗃️ Step 5: Setup Database Schema

### Untuk PostgreSQL

```bash
# Masuk ke folder backend
cd backend

# Jalankan migrations
npm run prisma:migrate

# Seed database dengan data awal (opsional)
npm run prisma:seed
```

### Untuk MySQL

```bash
# Masuk ke folder backend
cd backend

# Pastikan menggunakan schema MySQL
# Copy schema.mysql.prisma ke schema.prisma jika belum
# Atau edit schema.prisma untuk menggunakan provider MySQL

# Generate Prisma Client untuk MySQL
npm run prisma:generate

# Jalankan migrations
npm run prisma:migrate

# Seed database dengan data awal (opsional)
npm run prisma:seed
```

**Catatan:** Jika ada error saat migration, pastikan:
- Database sudah dibuat
- User database memiliki privileges yang cukup
- Connection string di `.env` sudah benar

---

## 🚀 Step 6: Menjalankan Aplikasi

### Terminal 1: Backend Server

```bash
# Masuk ke folder backend
cd backend

# Jalankan backend dalam mode development
npm run start:dev
```

Backend akan berjalan di: **http://localhost:3000**

**Verifikasi:**
- Buka browser: http://localhost:3000/api (harus menampilkan Swagger documentation)
- Atau: http://localhost:3000/api/docs (jika ada)

### Terminal 2: Frontend Server

```bash
# Masuk ke folder frontend
cd frontend

# Jalankan frontend dalam mode development
npm run dev
```

Frontend akan berjalan di: **http://localhost:3001**

**Verifikasi:**
- Buka browser: http://localhost:3001
- Harus menampilkan halaman login

---

## 🔐 Step 7: Login ke Aplikasi

### Default Users (dari seed data)

Setelah menjalankan `npm run prisma:seed`, akan ada beberapa user default:

1. **Super Admin**
   - Username: `admin`
   - Password: `admin123` (atau sesuai seed data)
   - Role: `SUPER_ADMIN`

2. **RC Manager**
   - Username: `rcmanager`
   - Password: `rcmanager123` (atau sesuai seed data)
   - Role: `RC_MANAGER`

3. **RC Staff**
   - Username: `rcstaff`
   - Password: `rcstaff123` (atau sesuai seed data)
   - Role: `RC_STAFF`

**⚠️ PENTING:** Ganti password default setelah login pertama kali!

---

## 🛠️ Troubleshooting

### Error: "Cannot connect to database"

**Solusi:**
1. Pastikan database service sudah running
   - PostgreSQL: Cek di Services (Windows) atau `sudo systemctl status postgresql` (Linux)
   - MySQL: Cek di Services (Windows) atau `sudo systemctl status mysql` (Linux)

2. Verifikasi connection string di `.env`
   - Pastikan username, password, host, dan port sudah benar
   - Test koneksi dengan database client (pgAdmin, MySQL Workbench)

3. Pastikan database sudah dibuat
   - Cek dengan: `psql -U hcm_user -d hcm_development` (PostgreSQL)
   - Atau: `mysql -u hcm_user -p hcm_development` (MySQL)

### Error: "Port 3000 already in use"

**Solusi:**
1. Cek aplikasi yang menggunakan port 3000:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   
   # Linux/Mac
   lsof -i :3000
   ```

2. Kill process yang menggunakan port 3000, atau ubah PORT di `.env`

### Error: "Prisma Client not generated"

**Solusi:**
```bash
cd backend
npm run prisma:generate
```

### Error: "Module not found" atau "Cannot find module"

**Solusi:**
```bash
# Hapus node_modules dan install ulang
rm -rf node_modules package-lock.json
npm install

# Lakukan untuk backend dan frontend
```

### Error: "Migration failed"

**Solusi:**
1. Pastikan database sudah dibuat
2. Pastikan user database memiliki privileges yang cukup
3. Cek log error untuk detail lebih lanjut
4. Jika perlu, reset database:
   ```bash
   # HATI-HATI: Ini akan menghapus semua data!
   cd backend
   npx prisma migrate reset
   npm run prisma:migrate
   npm run prisma:seed
   ```

---

## 📝 Checklist Setup

Gunakan checklist ini untuk memastikan semua step sudah dilakukan:

- [ ] Node.js 18+ terinstall
- [ ] Database (PostgreSQL/MySQL) terinstall dan running
- [ ] Database `hcm_development` sudah dibuat
- [ ] User database sudah dibuat dengan privileges yang cukup
- [ ] File `.env` di `backend/` sudah dibuat dan dikonfigurasi
- [ ] Dependencies backend sudah diinstall (`npm install` di folder `backend/`)
- [ ] Dependencies frontend sudah diinstall (`npm install` di folder `frontend/`)
- [ ] Prisma Client sudah di-generate (`npm run prisma:generate`)
- [ ] Database migrations sudah dijalankan (`npm run prisma:migrate`)
- [ ] Database seed sudah dijalankan (opsional, `npm run prisma:seed`)
- [ ] Backend server berjalan di http://localhost:3000
- [ ] Frontend server berjalan di http://localhost:3001
- [ ] Bisa login dengan user default

---

## 🎯 Quick Start Commands

**Setup awal (sekali saja):**
```bash
# 1. Clone repository
git clone <repository-url>
cd hcm

# 2. Setup backend
cd backend
copy env.template .env
# Edit .env dengan konfigurasi database Anda
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# 3. Setup frontend
cd ../frontend
npm install
```

**Menjalankan aplikasi (setiap kali):**
```bash
# Terminal 1: Backend
cd backend
npm run start:dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

---

## 📚 Dokumentasi Tambahan

- **Tech Stack**: Lihat `TECH_STACK.md`
- **API Documentation**: Lihat `API_ENDPOINTS_DOCUMENTATION.md`
- **Database Schema**: Lihat `backend/SCHEMA_GUIDE.md`
- **Deployment**: Lihat `doc/DEPLOYMENT.md`

---

## 💡 Tips

1. **Gunakan VS Code** dengan extension:
   - Prisma
   - ESLint
   - Prettier
   - Tailwind CSS IntelliSense

2. **Database Management Tools:**
   - PostgreSQL: pgAdmin atau DBeaver
   - MySQL: MySQL Workbench atau DBeaver

3. **API Testing:**
   - Gunakan Postman collection: `HCM-API.postman_collection.json`
   - Atau akses Swagger: http://localhost:3000/api/docs

4. **Development Best Practices:**
   - Jangan commit file `.env` ke Git
   - Gunakan branch terpisah untuk development
   - Test di local sebelum push ke repository

---

## 🆘 Butuh Bantuan?

Jika mengalami masalah yang tidak teratasi:

1. Cek log error di terminal (backend dan frontend)
2. Cek dokumentasi di folder `doc/`
3. Cek file troubleshooting yang relevan
4. Hubungi tim development

---

**Selamat coding! 🎉**

