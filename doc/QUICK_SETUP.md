# ⚡ Quick Setup Guide

Panduan cepat setup aplikasi HCM di laptop baru.

## 🚀 Setup Cepat (5 Menit)

```bash
# 1. Clone repository
git clone <repository-url>
cd hcm

# 2. Setup Backend
cd backend
copy env.template .env
# Edit .env: Set DATABASE_URL sesuai database Anda
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# 3. Setup Frontend
cd ../frontend
npm install
```

## ▶️ Menjalankan

```bash
# Terminal 1: Backend (http://localhost:3000)
cd backend
npm run start:dev

# Terminal 2: Frontend (http://localhost:3001)
cd frontend
npm run dev
```

## 🔑 Login Default

- **Super Admin**: `admin` / `admin123`
- **RC Manager**: `rcmanager` / `rcmanager123`
- **RC Staff**: `rcstaff` / `rcstaff123`

## ⚙️ Konfigurasi Database

**PostgreSQL:**
```env
DATABASE_URL="postgresql://hcm_user:hcm_password@localhost:5432/hcm_development?schema=public"
```

**MySQL:**
```env
DATABASE_URL="mysql://hcm_user:hcm_password@localhost:3306/hcm_development"
```

## 📋 Checklist

- [ ] Node.js 18+ installed
- [ ] Database installed & running
- [ ] Database `hcm_development` created
- [ ] `.env` file configured
- [ ] Dependencies installed
- [ ] Migrations run
- [ ] Backend running (port 3000)
- [ ] Frontend running (port 3001)

---

**Detail lengkap:** Lihat `SETUP_GUIDE.md`

