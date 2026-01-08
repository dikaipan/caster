# 📦 Panduan Import Data BNI (1600 Mesin, 16000 Kaset)

Panduan ini menjelaskan cara import data BNI yang terdiri dari:
- **1600 mesin**
- **16000 kaset** (10 kaset per mesin: 5 main + 5 backup)
- **Customer: BNI**

## 📁 File Data yang Tersedia

Di folder `backend/data/` terdapat beberapa file:

1. **BNI_CASSETTE_COMPLETE.xlsx** (3.44 MB)
   - File Excel utama dengan data lengkap
   - Format: SN Mesin, SN Kaset, SN Kaset Cadangan
   - Total: 1600 mesin, 16000 kaset

2. **Progres APK SN kaset BNI 1600 mesin (1600) (1).xlsx** (0.97 MB)
   - File Excel alternatif
   - Format: SN Mesin, SN Kaset, SN Kaset Cadangan

3. **BNI_CASSETTE_COMPLETE.csv** (522 KB)
   - File CSV dengan data yang sama

4. **machine-cassettes.json** (2 KB)
   - File JSON contoh (hanya 5 mesin untuk testing)

## 🎯 Cara Import Data BNI

### Option 1: Convert Excel BNI ke Template Format (Recommended)

**Step 1: Convert Excel BNI ke format template**

```bash
cd backend
npm run convert:bni-excel
```

Atau dengan parameter custom:

```bash
npm run convert:bni-excel \
  "data/BNI_CASSETTE_COMPLETE.xlsx" \
  "data/BNI_TEMPLATE_FORMAT.xlsx" \
  "BNI" \
  "PGL-TAG-001"
```

**Parameter:**
- `input_file` (optional): Path ke file Excel BNI. Default: `data/BNI_CASSETTE_COMPLETE.xlsx`
- `output_file` (optional): Path ke file output. Default: `data/BNI_TEMPLATE_FORMAT.xlsx`
- `bank_code` (optional): Bank code. Default: `BNI`
- `pengelola_code` (optional): Pengelola code. Default: `PGL-TAG-001`

**Output:**
- File Excel baru dengan format template:
  - Sheet: `Machine-Cassette`
  - Kolom: `machine_serial_number`, `cassette_serial_number`, `bank_code`, `pengelola_code`

**Step 2: Import menggunakan template Excel**

Setelah file template dibuat, gunakan fitur import Excel di frontend:
1. Buka halaman Settings > Data Management
2. Klik "Download Template Excel" untuk melihat format
3. Upload file `BNI_TEMPLATE_FORMAT.xlsx` yang sudah dibuat
4. Sistem akan otomatis import mesin, kaset, dan pengelola assignments

### Option 2: Import Langsung dari Excel BNI (Advanced)

Jika Anda ingin import langsung tanpa convert, gunakan script:

```bash
npm run import:excel-direct BNI PGL-TAG-001
```

**Catatan:** Script ini menggunakan format lama dan mungkin perlu disesuaikan dengan struktur Excel BNI.

## 📊 Format Data Excel BNI

File Excel BNI memiliki format berikut:

| SN Mesin | SN Kaset | SN Kaset Cadangan | Tipe Kaset | utama/cadangan |
|----------|----------|-------------------|------------|----------------|
| 74UEA43N03-069520 | 76UWAB2SW754319 | 76UWAB2SW751779 | AB | utama |
| 74UEA43N03-069520 | 76UWRB2SB894550 | 76UWRB2SB885798 | RB | utama |
| ... | ... | ... | ... | ... |

**Karakteristik:**
- Setiap mesin memiliki **10 kaset** (5 main + 5 backup)
- Setiap baris berisi 1 kaset (main atau backup)
- 1 mesin = 10 baris (5 baris main + 5 baris backup)

## 🔄 Format Template Excel Baru

Setelah convert, file template memiliki format:

| machine_serial_number | cassette_serial_number | bank_code | pengelola_code |
|----------------------|------------------------|-----------|----------------|
| 74UEA43N03-069520 | 76UWAB2SW754319 | BNI | PGL-TAG-001 |
| 74UEA43N03-069520 | 76UWRB2SB894550 | BNI | PGL-TAG-001 |
| 74UEA43N03-069520 | 76UWAB2SW751779 | BNI | PGL-TAG-001 |
| ... | ... | ... | ... |

**Karakteristik:**
- Setiap baris = 1 kaset (baik main maupun backup)
- 1 mesin = 10 baris (5 main + 5 backup)
- Total: 16000 baris (1600 mesin × 10 kaset)

## ⚠️ Catatan Penting

1. **Bank dan Pengelola harus sudah ada** di database sebelum import
   - Bank Code: `BNI` atau `BNI001`
   - Pengelola Code: `PGL-TAG-001` atau sesuai kebutuhan

2. **Cassette Type auto-detect** dari serial number:
   - `76UWRB2SB...` → RB (Recycle Box)
   - `76UWAB2SW...` → AB (Acceptor Box)
   - `76UWURJB2SW...` → URJB (Unrecognized Reject Box)

3. **Machine Code auto-generated**:
   - Format: `M-{bankCode}-{last6digits}`
   - Contoh: `M-BNI-069520`

4. **Import besar memakan waktu**:
   - 1600 mesin + 16000 kaset = ~16,000 records
   - Estimasi waktu: 5-10 menit (tergantung database)

## 🔍 Verifikasi Data

Setelah import, verifikasi data:

```bash
# Cek jumlah mesin
npm run check:machine-cassette-links

# Cek jumlah kaset
npm run check:cassette-count
```

Atau gunakan Prisma Studio:

```bash
npm run prisma:studio
```

## 📞 Troubleshooting

### Error: "Bank not found"
**Solusi:** Pastikan bank sudah dibuat. Cek dengan:
```sql
SELECT * FROM customer_banks WHERE bank_code = 'BNI';
```

### Error: "Pengelola not found"
**Solusi:** Pastikan pengelola sudah dibuat. Cek dengan:
```sql
SELECT * FROM pengelola WHERE pengelola_code = 'PGL-TAG-001';
```

### Error: "File not found"
**Solusi:** Pastikan file Excel ada di folder `backend/data/`

### Error: "Could not detect cassette type"
**Solusi:** Serial number kaset tidak mengandung RB, AB, atau URJB. Pastikan format serial number benar.

## 💡 Tips

1. **Backup database** sebelum import besar
2. **Test dengan data kecil** dulu (gunakan `machine-cassettes.json` yang hanya 5 mesin)
3. **Monitor progress** saat import (lihat console log)
4. **Verifikasi hasil** setelah import selesai

## 📚 Referensi

- [README_MACHINE_CASSETTES.md](./README_MACHINE_CASSETTES.md) - Panduan import mesin-kaset format JSON
- [Template Excel Import](./README.md) - Panduan template Excel import

