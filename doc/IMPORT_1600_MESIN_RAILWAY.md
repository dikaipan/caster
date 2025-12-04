# 🚀 Import 1600 Mesin dan 16000 Kaset ke Railway

Panduan untuk mengimport semua 1600 mesin dan 16000 kaset dari database local atau Excel ke Railway.

---

## 🔍 Situasi

- **Database Local:** 1600 mesin, 16000 kaset
- **File JSON saat ini:** Hanya 5 mesin sample
- **File Excel:** `Progres APK SN kaset BNI 1600 mesin (1600) (1).xlsx` (kemungkinan berisi semua data)

---

## ✅ Opsi 1: Import dari Excel File (RECOMMENDED)

### Step 1: Pastikan File Excel Ada

File Excel sudah ada di: `backend/data/Progres APK SN kaset BNI 1600 mesin (1600) (1).xlsx`

### Step 2: Commit File ke Git

```bash
cd "D:\HCS Cassete management\hcm"
git add backend/data/"Progres APK SN kaset BNI 1600 mesin (1600) (1).xlsx"
git commit -m "Add Excel file with 1600 machines data"
git push origin main
```

### Step 3: Import ke Railway

**Menggunakan Railway CLI:**

```bash
# Pastikan sudah login dan link
railway login
railway link

# Import dari Excel
railway run --service casper npm run import:excel-direct BNI VND-TAG-001
```

**Atau specify file path:**
```bash
railway run --service casper npm run import:excel-direct BNI VND-TAG-001 "data/Progres APK SN kaset BNI 1600 mesin (1600) (1).xlsx"
```

---

## ✅ Opsi 2: Export dari Database Local ke JSON

### Step 1: Export dari Database Local

**Buat script export (jika belum ada):**

```bash
cd backend
npm run export:mytable-to-json
```

**Atau buat script baru untuk export semua mesin dan kaset:**

```typescript
// scripts/export-all-machines-cassettes.ts
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function exportAll() {
  console.log('🔄 Exporting all machines and cassettes...');
  
  // Get all machines
  const machines = await prisma.machine.findMany({
    include: {
      cassettes: true,
    },
  });
  
  console.log(`📊 Found ${machines.length} machines`);
  
  // Format untuk import
  const exportData = {
    machines: machines.map(machine => ({
      machineSerialNumber: machine.serialNumberManufacturer,
      mainCassettes: machine.cassettes
        .filter(c => c.usageType === 'MAIN')
        .map(c => c.serialNumber),
      backupCassettes: machine.cassettes
        .filter(c => c.usageType === 'BACKUP')
        .map(c => c.serialNumber),
    })),
  };
  
  // Save to file
  const outputPath = path.join(__dirname, '../data/all-machines-cassettes.json');
  fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf-8');
  
  console.log(`✅ Exported to: ${outputPath}`);
  console.log(`   Machines: ${exportData.machines.length}`);
  console.log(`   Total cassettes: ${exportData.machines.reduce((sum, m) => sum + m.mainCassettes.length + m.backupCassettes.length, 0)}`);
}

exportAll()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Step 2: Run Export di Local

```bash
cd backend
npm run export:all-machines-cassettes
```

### Step 3: Commit dan Push

```bash
git add backend/data/all-machines-cassettes.json
git commit -m "Export all 1600 machines and 16000 cassettes"
git push origin main
```

### Step 4: Import ke Railway

```bash
railway run --service casper npm run import:machine-cassettes data/all-machines-cassettes.json BNI VND-TAG-001
```

---

## ✅ Opsi 3: Import Langsung dari Database Local ke Railway

### Step 1: Export dari Database Local ke SQL

**Dari database local (XAMPP MySQL):**

```bash
# Export machines
mysqldump -u root -p hcm_mysql_dev machines > machines_export.sql

# Export cassettes
mysqldump -u root -p hcm_mysql_dev cassettes > cassettes_export.sql
```

### Step 2: Convert ke Format yang Bisa Di-import

Gunakan script `import-mysql-cassettes.ts` atau `import-mysql-direct.ts`

---

## 🎯 Recommended: Import dari Excel

**Karena file Excel sudah ada, ini cara tercepat:**

### Step 1: Commit Excel File

```bash
cd "D:\HCS Cassete management\hcm"
git add backend/data/"Progres APK SN kaset BNI 1600 mesin (1600) (1).xlsx"
git commit -m "Add Excel file with 1600 machines"
git push origin main
```

### Step 2: Import ke Railway

```bash
railway run --service casper npm run import:excel-direct BNI VND-TAG-001
```

**Expected output:**
```
🚀 Starting import from Excel...
📁 Reading: data/Progres APK SN kaset BNI 1600 mesin (1600) (1).xlsx
📊 Total machines to import: 1600
🔄 Importing machines...
  ✅ Machine: 74UEA43N03-069520
    ✅ Main Cassette: ...
    ✅ Backup Cassette: ...
  ...
📊 Import Summary:
   Machines: 1600/1600 successful
   Cassettes: 16000/16000 successful
✅ Import completed!
```

---

## 📋 Checklist

- [ ] File Excel sudah di-commit ke git
- [ ] Railway sudah pull file terbaru
- [ ] Migrations sudah di-run
- [ ] Seed sudah di-run (bank dan vendor ada)
- [ ] Import script di-run
- [ ] Verifikasi: 1600 mesin dan 16000 kaset ter-import

---

## 🐛 Troubleshooting

### Error: "Excel file not found"

**Solusi:**
1. Pastikan file sudah di-commit dan push
2. Pastikan Railway sudah redeploy setelah push
3. Pastikan path file benar

### Error: "Bank not found"

**Solusi:**
1. Pastikan seed sudah di-run
2. Pastikan bank code benar: `BNI` (bukan `BNI001`)

### Import Lambat

**Solusi:**
- Import 1600 mesin dan 16000 kaset akan memakan waktu
- Tunggu hingga selesai (bisa 10-30 menit)
- Jangan cancel di tengah proses

---

## ⚠️ Catatan Penting

1. **Import 1600 mesin akan memakan waktu** - Tunggu hingga selesai
2. **Pastikan Railway database cukup besar** - 16000 kaset butuh space
3. **Backup dulu jika perlu** - Import akan overwrite data yang sudah ada
4. **Monitor logs** - Cek progress di Railway logs

---

**Setelah import selesai, semua 1600 mesin dan 16000 kaset akan terisi di Railway! 🚀**

