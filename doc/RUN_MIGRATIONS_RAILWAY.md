# 🗄️ Run Database Migrations di Railway

Panduan untuk menjalankan Prisma migrations di Railway setelah deployment.

---

## 🔍 Masalah

Error: `The table 'hitachi_users' does not exist in the current database.`

Ini berarti migrations belum di-run di database Railway.

---

## ✅ Solusi: Run Migrations di Railway

### Opsi 1: Railway Shell (RECOMMENDED - Paling Mudah)

1. **Railway Dashboard** → Service "casper" (backend)
2. **Tab "Shell"**
3. **Jalankan commands berikut:**

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate:deploy
```

**Output yang diharapkan:**
```
✔ Generated Prisma Client
✔ Applied migration: 20251203022109_init_mysql
Database schema is up to date!
```

### Opsi 2: Railway CLI

```bash
# Pastikan sudah login dan link
railway login
railway link

# Run migrations
railway run --service casper npm run prisma:generate
railway run --service casper npm run prisma:migrate:deploy
```

---

## 📋 Step-by-Step dengan Railway Shell

### Step 1: Buka Railway Shell

1. Railway Dashboard → Service "casper" (backend)
2. Klik tab **"Shell"**
3. Tunggu shell ready

### Step 2: Generate Prisma Client

```bash
npm run prisma:generate
```

**Expected output:**
```
✔ Generated Prisma Client (v6.19.0) to ./node_modules/@prisma/client
```

### Step 3: Run Migrations

```bash
npm run prisma:migrate:deploy
```

**Expected output:**
```
✔ Applied migration: 20251203022109_init_mysql
Database schema is up to date!
```

### Step 4: Verifikasi

```bash
# Check migration status
npx prisma migrate status
```

**Expected output:**
```
1 migration found in prisma/migrations
Database schema is up to date!
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'prisma'"

**Solusi:**
```bash
# Install dependencies first
npm install
```

### Error: "DATABASE_URL is not configured"

**Solusi:**
1. Pastikan `DATABASE_URL` sudah di-set di Railway Variables
2. Pastikan format benar: `mysql://root:password@host:3306/database`

### Error: "Migration already applied"

**Solusi:**
- Ini normal jika migrations sudah di-run sebelumnya
- Cek status dengan: `npx prisma migrate status`

### Error: "Table already exists"

**Solusi:**
- Migrations mungkin sudah di-run sebagian
- Cek status: `npx prisma migrate status`
- Jika perlu reset (HATI-HATI, akan hapus data):
  ```bash
  npx prisma migrate reset
  npm run prisma:migrate:deploy
  ```

---

## ✅ Checklist

- [ ] Railway Shell dibuka
- [ ] Prisma Client di-generate
- [ ] Migrations di-run
- [ ] Migration status verified
- [ ] Tidak ada error
- [ ] Tabel sudah dibuat di database

---

## 🎯 Quick Commands

```bash
# Di Railway Shell
npm run prisma:generate
npm run prisma:migrate:deploy
npx prisma migrate status
```

---

## 📝 Catatan Penting

1. **Migrations hanya perlu di-run sekali** setelah deployment pertama
2. **Jika ada perubahan schema**, perlu:
   - Update schema.prisma
   - Create migration: `npm run prisma:migrate dev` (di local)
   - Push migration files ke git
   - Run: `npm run prisma:migrate:deploy` (di Railway)

3. **Jangan run `prisma migrate dev` di production** - gunakan `prisma migrate deploy`

---

**Setelah migrations di-run, semua tabel akan dibuat dan error akan hilang! 🚀**

