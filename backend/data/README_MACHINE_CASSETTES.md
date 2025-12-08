# 📦 Panduan Import Mesin dan Kaset

Panduan ini menjelaskan cara import data mesin dan kaset secara bulk dengan relasi 1 mesin memiliki 10 kaset (5 utama + 5 cadangan).

## 🎯 Cara Menggunakan

### Step 1: Pastikan Bank dan Vendor Sudah Ada

Script ini memerlukan bank dan vendor yang sudah ada di database. Pastikan sudah menjalankan seed atau membuat bank dan vendor terlebih dahulu.

**Contoh bank dan vendor dari seed:**
- Bank Code: `BNI001` (PT Bank Negara Indonesia)
- Vendor Code: `VND-TAG-001` (PT TAG Indonesia) atau `VND-ADV-001` (PT ADV Services)

### Step 2: File JSON Sudah Tersedia

File `backend/data/machine-cassettes.json` sudah berisi data dari spreadsheet Anda dengan format:

```json
{
  "machines": [
    {
      "machineSerialNumber": "74UEA43N03-069520",
      "mainCassettes": [
        "76UWAB2SW754319",
        "76UWRB2SB894550",
        "76UWRB2SB894551",
        "76UWRB2SB894516",
        "76UWRB2SB894546"
      ],
      "backupCassettes": [
        "76UWAB2SW751779",
        "76UWRB2SB885798",
        "76UWRB2SB885799",
        "76UWRB2SB885817",
        "76UWRB2SB885807"
      ]
    }
  ]
}
```

### Step 3: Jalankan Script Import

**Dengan default bank dan vendor:**
```bash
cd backend
npm run import:machine-cassettes
```

**Dengan custom bank dan vendor:**
```bash
npm run import:machine-cassettes data/machine-cassettes.json BNI001 VND-TAG-001
```

**Format command:**
```bash
npm run import:machine-cassettes [file_path] [bank_code] [vendor_code]
```

**Parameter:**
- `file_path` (optional): Path ke file JSON. Default: `data/machine-cassettes.json`
- `bank_code` (optional): Bank code yang sudah ada di database. Default: `BNI001`
- `vendor_code` (optional): Vendor code yang sudah ada di database. Default: `VND-TAG-001`

## 📋 Data yang Akan Diimport

Berdasarkan data spreadsheet Anda:

- **5 Mesin** dengan SN Mesin:
  - 74UEA43N03-069520
  - 74UEA43N03-069533
  - 74UEA43N03-069579
  - 74UEA43N03-069472
  - 74UEA43N03-069439

- **50 Kaset Total** (10 kaset per mesin):
  - 5 kaset utama per mesin = 25 kaset utama
  - 5 kaset cadangan per mesin = 25 kaset cadangan

## 🔍 Apa yang Dilakukan Script?

1. **Membuat/Update Machine:**
   - `serialNumberManufacturer` = SN Mesin dari data
   - `machineCode` = auto-generated dari bank code dan SN mesin
   - `customerBankId` = dari bank code yang diberikan
   - `vendorId` = dari vendor code yang diberikan
   - `modelName` = "SR7500VS" (default)
   - `status` = "OPERATIONAL"

2. **Membuat/Update Cassette:**
   - `serialNumber` = SN Kaset (baik utama maupun cadangan)
   - `cassetteTypeId` = auto-detect dari serial number (RB, AB, atau URJB)
   - `customerBankId` = dari bank code yang diberikan
   - `status` = "OK"
   - `notes` = "Main cassette for machine [SN]" atau "Backup cassette for machine [SN]"

## ⚠️ Catatan Penting

1. **Bank dan Vendor harus sudah ada** - Script tidak akan membuat bank/vendor baru
2. **Cassette Type auto-detect** - Script akan otomatis mendeteksi tipe kaset dari serial number:
   - `76UWRB2SB...` → RB (Recycle Box)
   - `76UWAB2SW...` → AB (Acceptor Box)
   - `76UWURJB2SW...` → URJB (Unrecognized Reject Box)
3. **Upsert behavior** - Jika mesin atau kaset sudah ada, akan di-update, bukan dibuat baru
4. **Relasi** - Mesin dan kaset tidak memiliki foreign key langsung di schema, tetapi kaset memiliki notes yang menunjukkan mesin terkait

## 📊 Output & Logging

Script akan menampilkan log seperti ini:

```
🚀 Starting machine-cassette import...
📁 Reading data from: backend/data/machine-cassettes.json
🏦 Bank Code: BNI001
🏢 Vendor Code: VND-TAG-001

🚀 Starting machine and cassette import...
📊 Total machines to import: 5
📋 Config: Bank=BNI001, Vendor=VND-TAG-001
  ✅ Machine: 74UEA43N03-069520 (M-BNI001-069520)
    ✅ Main Cassette: 76UWAB2SW754319 (AB)
    ✅ Main Cassette: 76UWRB2SB894550 (RB)
    ...
    ✅ Backup Cassette: 76UWAB2SW751779 (AB)
    ...

📊 Import Summary:
   Machines: 5/5 successful
   Cassettes: 50/50 successful
   Expected cassettes: 50, Actual: 50

✅ Import completed!
```

## 🔧 Troubleshooting

### Error: "Bank with code XXX not found"
**Solusi:** Pastikan bank sudah dibuat terlebih dahulu. Jalankan seed atau buat bank manual.

### Error: "Vendor with code XXX not found"
**Solusi:** Pastikan vendor sudah dibuat terlebih dahulu. Jalankan seed atau buat vendor manual.

### Error: "Could not detect cassette type from SN"
**Solusi:** Serial number kaset tidak mengandung RB, AB, atau URJB. Pastikan format serial number benar.

### Error: "Cassette type XXX not found"
**Solusi:** Pastikan cassette types sudah di-seed. Jalankan `npm run prisma:seed` untuk membuat cassette types (RB, AB, URJB).

## 💡 Tips

1. **Cek data sebelum import:** Pastikan file JSON valid dan semua serial number benar
2. **Backup database:** Sebelum import besar, backup database terlebih dahulu
3. **Test dengan data kecil:** Coba import 1 mesin dulu sebelum import semua data
4. **Verifikasi hasil:** Setelah import, cek di Prisma Studio atau database untuk memastikan data sudah masuk

## 📞 Support

Jika ada masalah:
1. Cek console log untuk error message
2. Pastikan format JSON valid
3. Pastikan bank dan vendor sudah ada di database
4. Pastikan cassette types sudah di-seed

