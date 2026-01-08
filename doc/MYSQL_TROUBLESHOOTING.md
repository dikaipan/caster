# 🔧 MySQL Troubleshooting: "MySQL shutdown unexpectedly"

## Masalah
MySQL server tidak bisa start dengan error: "MySQL shutdown unexpectedly"

## Kemungkinan Penyebab

### 1. Port 3306 Sudah Digunakan
Port MySQL (3306) mungkin sudah digunakan oleh aplikasi lain.

**Cek port yang digunakan:**
```powershell
netstat -ano | findstr :3306
```

**Solusi:**
- Stop aplikasi yang menggunakan port 3306
- Atau ubah port MySQL di konfigurasi

### 2. File Data MySQL Corrupt
File data MySQL mungkin corrupt atau rusak.

**Solusi:**
1. Backup data (jika masih bisa diakses)
2. Stop MySQL service
3. Hapus file di `data` folder (biasanya di `C:\xampp\mysql\data` atau `C:\ProgramData\MySQL\MySQL Server X.X\Data`)
4. Reinitialize MySQL data directory

### 3. Konfigurasi MySQL Salah
File konfigurasi `my.ini` atau `my.cnf` mungkin salah.

**Lokasi file konfigurasi:**
- XAMPP: `C:\xampp\mysql\bin\my.ini`
- MySQL Standalone: `C:\ProgramData\MySQL\MySQL Server X.X\my.ini`

**Cek konfigurasi:**
- Pastikan `port = 3306` benar
- Pastikan `datadir` path benar
- Pastikan tidak ada syntax error

### 4. Permission Issues
MySQL tidak punya permission untuk mengakses file/folder.

**Solusi:**
1. Run XAMPP/MySQL sebagai Administrator
2. Set permission untuk MySQL folder:
   ```powershell
   # Run as Administrator
   icacls "C:\xampp\mysql" /grant "Users":(OI)(CI)F /T
   ```

### 5. Missing Dependencies
Beberapa dependency atau service Windows mungkin tidak berjalan.

**Cek services:**
```powershell
# Cek apakah service MySQL berjalan
Get-Service | Where-Object {$_.Name -like "*mysql*"}

# Start service (jika ada)
Start-Service MySQL
```

## Langkah-langkah Troubleshooting

### Step 1: Cek Port 3306
```powershell
netstat -ano | findstr :3306
```

Jika ada process yang menggunakan port 3306:
```powershell
# Cari process ID (PID) dari output di atas
taskkill /PID <PID> /F
```

### Step 2: Cek MySQL Logs
Buka MySQL error log untuk melihat detail error:
- XAMPP: `C:\xampp\mysql\data\*.err`
- MySQL Standalone: `C:\ProgramData\MySQL\MySQL Server X.X\Data\*.err`

### Step 3: Cek Windows Event Viewer
1. Buka Event Viewer (Windows + R, ketik `eventvwr`)
2. Navigate ke: Windows Logs → Application
3. Cari error terkait MySQL

### Step 4: Reinitialize MySQL (Last Resort)
**⚠️ WARNING: Ini akan menghapus semua data MySQL!**

```powershell
# Stop MySQL service
Stop-Service MySQL

# Backup data folder (jika perlu)
# Copy folder data ke lokasi backup

# Hapus data folder (HATI-HATI!)
# XAMPP: C:\xampp\mysql\data
# MySQL: C:\ProgramData\MySQL\MySQL Server X.X\Data

# Reinitialize (XAMPP)
cd C:\xampp\mysql\bin
.\mysqld --initialize-insecure --datadir=C:\xampp\mysql\data

# Atau untuk MySQL Standalone
cd "C:\Program Files\MySQL\MySQL Server X.X\bin"
.\mysqld --initialize-insecure --datadir="C:\ProgramData\MySQL\MySQL Server X.X\Data"
```

## Solusi Cepat (XAMPP)

### 1. Stop semua service di XAMPP Control Panel
### 2. Run XAMPP Control Panel sebagai Administrator
### 3. Start MySQL service
### 4. Jika masih error, coba:
   - Klik "Config" → "my.ini"
   - Cek apakah ada syntax error
   - Save dan restart MySQL

### 5. Jika masih error:
   - Backup `C:\xampp\mysql\data` (jika ada data penting)
   - Stop MySQL
   - Hapus semua file di `C:\xampp\mysql\data` (kecuali folder `mysql`, `performance_schema`, dll)
   - Start MySQL (akan reinitialize)

## Solusi Cepat (MySQL Standalone)

### 1. Stop MySQL Service
```powershell
Stop-Service MySQL
```

### 2. Cek MySQL Error Log
```powershell
Get-Content "C:\ProgramData\MySQL\MySQL Server X.X\Data\*.err" -Tail 50
```

### 3. Coba Start dengan Log
```powershell
cd "C:\Program Files\MySQL\MySQL Server X.X\bin"
.\mysqld --console
```

### 4. Jika masih error, reinitialize:
```powershell
# Backup data dulu!
.\mysqld --initialize-insecure --datadir="C:\ProgramData\MySQL\MySQL Server X.X\Data"
```

## Setelah MySQL Berjalan

Setelah MySQL berhasil start, lanjutkan dengan migration:

```powershell
cd backend
npx prisma migrate dev
npx prisma generate
```

## Bantuan Tambahan

Jika masalah masih berlanjut:
1. Copy error log dari MySQL
2. Copy output dari Windows Event Viewer
3. Cek apakah ada antivirus/firewall yang memblokir MySQL
4. Coba restart komputer
5. Coba install ulang MySQL/XAMPP

