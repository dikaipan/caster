# 🚀 Langkah Import Data Mesin dan Kaset ke Railway

Panduan step-by-step untuk import data mesin dan kaset ke Railway.

---

## ✅ Prerequisites

- [x] File `machine-cassettes.json` sudah ada
- [ ] Migrations sudah di-run
- [ ] Seed sudah di-run (bank dan vendor sudah ada)
- [ ] Railway CLI sudah installed

---

## 📋 Step-by-Step

### Step 1: Pastikan File Sudah di Git

File `backend/data/machine-cassettes.json` sudah ada dan berisi:
- 5 mesin
- 50 kaset (10 per mesin)

**Pastikan file sudah di-commit:**
```bash
cd "D:\HCS Cassete management\hcm"
git add backend/data/machine-cassettes.json
git commit -m "Add machine-cassettes data"
git push origin main
```

### Step 2: Install Railway CLI (jika belum)

```bash
npm install -g @railway/cli
```

### Step 3: Login Railway

```bash
railway login
```

Browser akan terbuka untuk login.

### Step 4: Link ke Project

```bash
cd "D:\HCS Cassete management\hcm\backend"
railway link
```

Pilih:
- Project: (project Anda)
- Service: casper (backend)

### Step 5: Run Import

**Import dengan bank code dari seed (BNI):**

```bash
railway run npm run import:machine-cassettes data/machine-cassettes.json BNI VND-TAG-001
```

**Atau jika bank code berbeda, cek dulu:**
```bash
# Cek bank code yang benar dari seed
# Dari seed: bankCode = 'BNI' (bukan 'BNI001')
```

---

## 🎯 Quick Commands

```bash
# 1. Install CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Link
cd backend
railway link

# 4. Run Import
railway run npm run import:machine-cassettes data/machine-cassettes.json BNI VND-TAG-001
```

---

## 📊 Expected Output

```
🚀 Starting machine-cassette import...
📁 Reading data from: data/machine-cassettes.json
🏦 Bank Code: BNI
🏢 pengelola Code: VND-TAG-001

🚀 Starting machine and cassette import...
📊 Total machines to import: 5
📋 Config: Bank=BNI, Vendor=VND-TAG-001
  ✅ Machine: 74UEA43N03-069520
    ✅ Main Cassette: 76UWAB2SW754319 (AB)
    ✅ Main Cassette: 76UWRB2SB894550 (RB)
    ...
  ✅ Machine: 74UEA43N03-069533
    ...

📊 Import Summary:
   Machines: 5/5 successful
   Cassettes: 50/50 successful

✅ Import completed!
```

---

## ✅ Checklist

- [ ] File machine-cassettes.json sudah di-commit
- [ ] Railway CLI installed
- [ ] Railway login berhasil
- [ ] Railway link ke project
- [ ] Migrations sudah di-run
- [ ] Seed sudah di-run
- [ ] Import script di-run
- [ ] Data sudah terisi

---

**Setelah import selesai, data mesin dan kaset akan terisi di database Railway! 🚀**

