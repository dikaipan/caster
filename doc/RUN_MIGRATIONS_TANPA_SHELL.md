# 🗄️ Run Migrations di Railway Tanpa Shell

Panduan untuk menjalankan migrations di Railway jika tab Shell tidak tersedia.

---

## 🔍 Masalah

Tab "Shell" tidak ada di Railway Dashboard, tapi perlu run migrations.

---

## ✅ Solusi: Gunakan Railway CLI

### Step 1: Install Railway CLI

**Di terminal lokal (laptop Anda):**

```bash
npm install -g @railway/cli
```

**Atau menggunakan npx (tanpa install):**
```bash
npx @railway/cli
```

### Step 2: Login Railway

```bash
railway login
```

Ini akan membuka browser untuk login dengan GitHub.

### Step 3: Link ke Project

```bash
railway link
```

**Pilih:**
1. Project Anda
2. Service "casper" (backend)

### Step 4: Run Migrations

**Generate Prisma Client:**
```bash
railway run npm run prisma:generate
```

**Run Migrations:**
```bash
railway run npm run prisma:migrate:deploy
```

**Check Status:**
```bash
railway run npx prisma migrate status
```

**Run Seed (opsional):**
```bash
railway run npm run prisma:seed
```

---

## 📋 Step-by-Step Lengkap

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
```

**Verify installation:**
```bash
railway --version
```

### 2. Login

```bash
railway login
```

- Browser akan terbuka
- Login dengan GitHub
- Authorize Railway

### 3. Link Project

```bash
cd "D:\HCS Cassete management\hcm\backend"
railway link
```

**Atau dari root project:**
```bash
cd "D:\HCS Cassete management\hcm"
railway link
```

**Pilih:**
- Project: (pilih project Anda)
- Service: casper (backend)

### 4. Run Commands

**Dari folder backend:**
```bash
cd backend

# Generate Prisma Client
railway run npm run prisma:generate

# Run Migrations
railway run npm run prisma:migrate:deploy

# Check Status
railway run npx prisma migrate status

# Run Seed
railway run npm run prisma:seed
```

---

## 🎯 Alternatif: Specify Service Langsung

Jika `railway link` tidak bekerja, bisa specify service langsung:

```bash
railway run --service casper npm run prisma:generate
railway run --service casper npm run prisma:migrate:deploy
```

---

## 🐛 Troubleshooting

### Error: "railway: command not found"

**Solusi:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Atau gunakan npx
npx @railway/cli run npm run prisma:generate
```

### Error: "Not logged in"

**Solusi:**
```bash
railway login
```

### Error: "No project linked"

**Solusi:**
```bash
railway link
# Pilih project dan service
```

### Error: "Service not found"

**Solusi:**
```bash
# Specify service langsung
railway run --service casper npm run prisma:generate
```

### Error: "Cannot find module"

**Solusi:**
```bash
# Pastikan di folder backend
cd backend
railway run npm install
railway run npm run prisma:generate
```

---

## ✅ Checklist

- [ ] Railway CLI installed
- [ ] Railway login berhasil
- [ ] Railway link ke project dan service
- [ ] Prisma Client di-generate
- [ ] Migrations di-run
- [ ] Migration status verified
- [ ] Seed di-run (opsional)

---

## 🎯 Quick Commands

```bash
# Install CLI
npm install -g @railway/cli

# Login
railway login

# Link
cd backend
railway link

# Run migrations
railway run npm run prisma:generate
railway run npm run prisma:migrate:deploy
railway run npm run prisma:seed
```

---

## 📝 Catatan

1. **Railway CLI** menjalankan commands di Railway environment
2. **Tidak perlu tab Shell** - semua via CLI
3. **Commands execute di Railway**, bukan di local
4. **Environment variables** otomatis tersedia

---

**Dengan Railway CLI, Anda bisa run migrations tanpa perlu tab Shell! 🚀**

