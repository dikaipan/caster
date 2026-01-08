# 🔄 Panduan Backup & Restore Database - CASTER

> Panduan lengkap untuk backup, restore, dan recovery database CASTER.

---

## 📋 Daftar Isi

1. [Overview](#1-overview)
2. [Backup Strategy](#2-backup-strategy)
3. [Manual Backup](#3-manual-backup)
4. [Automated Backup](#4-automated-backup)
5. [Restore Procedures](#5-restore-procedures)
6. [Disaster Recovery](#6-disaster-recovery)
7. [Verification & Testing](#7-verification--testing)

---

## 1. Overview

### Apa yang Perlu Di-backup?

| Komponen | Prioritas | Frequency |
|----------|-----------|-----------|
| **Database MySQL** | 🔴 Critical | Daily |
| **Environment Files** (.env) | 🔴 Critical | On change |
| **Upload Files** (jika ada) | 🟡 High | Weekly |
| **Application Code** | 🟢 Normal | Via Git |

### Database Information

- **Database Type**: MySQL 8.x
- **Database Name**: `caster_db` (atau sesuai `.env`)
- **Key Tables**: cassettes, machines, problem_tickets, repair_tickets, users

---

## 2. Backup Strategy

### Recommended Schedule

| Type | Frequency | Retention | Purpose |
|------|-----------|-----------|---------|
| **Full Backup** | Daily | 30 hari | Complete recovery point |
| **Incremental** | Hourly | 7 hari | Recent data protection |
| **Weekly Archive** | Mingguan | 1 tahun | Long-term compliance |

### Storage Locations

```
Primary:   /backup/mysql/daily/
Secondary: Cloud storage (Google Drive, S3, dll)
Offsite:   External drive (monthly copy)
```

---

## 3. Manual Backup

### 3.1 Backup Full Database

**Windows (Command Prompt/PowerShell):**
```powershell
# Set variables
$DATE = Get-Date -Format "yyyy-MM-dd_HHmmss"
$BACKUP_DIR = "D:\Backup\MySQL"
$DB_NAME = "caster_db"
$DB_USER = "root"
$DB_PASS = "your_password"

# Create backup directory
New-Item -ItemType Directory -Force -Path $BACKUP_DIR

# Run mysqldump
& "C:\xampp\mysql\bin\mysqldump.exe" -u $DB_USER -p$DB_PASS --single-transaction --routines --triggers $DB_NAME | Out-File -Encoding utf8 "$BACKUP_DIR\$DB_NAME`_$DATE.sql"

Write-Host "Backup completed: $BACKUP_DIR\$DB_NAME`_$DATE.sql"
```

**Linux/Mac:**
```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_DIR="/backup/mysql"
DB_NAME="caster_db"
DB_USER="root"
DB_PASS="your_password"

# Create backup directory
mkdir -p $BACKUP_DIR

# Run backup with compression
mysqldump -u $DB_USER -p$DB_PASS \
    --single-transaction \
    --routines \
    --triggers \
    --databases $DB_NAME | gzip > "$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"

echo "Backup completed: $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"
```

### 3.2 Backup Specific Tables Only

```bash
# Backup hanya tabel critical
mysqldump -u root -p caster_db \
    cassettes machines problem_tickets repair_tickets \
    > critical_tables_backup.sql
```

### 3.3 Backup dengan Prisma (Schema Only)

```bash
cd backend

# Export schema
npx prisma db pull --print > schema_backup.prisma

# Generate migration snapshot
npx prisma migrate dev --name backup_snapshot --create-only
```

---

## 4. Automated Backup

### 4.1 Windows Task Scheduler

**Script: `backup_mysql.ps1`**
```powershell
# Save as D:\Scripts\backup_mysql.ps1

$DATE = Get-Date -Format "yyyy-MM-dd"
$TIME = Get-Date -Format "HHmmss"
$BACKUP_DIR = "D:\Backup\MySQL\$DATE"
$DB_NAME = "caster_db"
$DB_USER = "root"
$DB_PASS = "your_password"
$RETENTION_DAYS = 30

# Create directory
New-Item -ItemType Directory -Force -Path $BACKUP_DIR | Out-Null

# Run backup
$backupFile = "$BACKUP_DIR\${DB_NAME}_${TIME}.sql"
& "C:\xampp\mysql\bin\mysqldump.exe" -u $DB_USER -p$DB_PASS --single-transaction $DB_NAME | Out-File -Encoding utf8 $backupFile

# Compress
Compress-Archive -Path $backupFile -DestinationPath "$backupFile.zip"
Remove-Item $backupFile

# Clean old backups
Get-ChildItem "D:\Backup\MySQL" -Directory | Where-Object { 
    $_.CreationTime -lt (Get-Date).AddDays(-$RETENTION_DAYS) 
} | Remove-Item -Recurse -Force

# Log
Add-Content "D:\Backup\MySQL\backup.log" "$(Get-Date): Backup completed - $backupFile.zip"
```

**Setup Task Scheduler:**
1. Buka Task Scheduler
2. Create Basic Task → Name: "MySQL Daily Backup"
3. Trigger: Daily at 02:00 AM
4. Action: Start a program
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "D:\Scripts\backup_mysql.ps1"`

### 4.2 Linux Cron

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/scripts/backup_mysql.sh >> /var/log/mysql_backup.log 2>&1
```

---

## 5. Restore Procedures

### 5.1 Full Restore

> ⚠️ **WARNING**: Full restore akan MENGHAPUS semua data existing!

**Windows:**
```powershell
# Stop any applications using the database first!

$BACKUP_FILE = "D:\Backup\MySQL\2024-12-17\caster_db_020000.sql"
$DB_NAME = "caster_db"
$DB_USER = "root"
$DB_PASS = "your_password"

# Decompress if needed
# Expand-Archive "$BACKUP_FILE.zip" -DestinationPath "D:\Temp"

# Drop and recreate database
& "C:\xampp\mysql\bin\mysql.exe" -u $DB_USER -p$DB_PASS -e "DROP DATABASE IF EXISTS $DB_NAME; CREATE DATABASE $DB_NAME;"

# Restore
Get-Content $BACKUP_FILE | & "C:\xampp\mysql\bin\mysql.exe" -u $DB_USER -p$DB_PASS $DB_NAME

Write-Host "Restore completed!"
```

**Linux:**
```bash
# Decompress if needed
gunzip -k caster_db_backup.sql.gz

# Restore
mysql -u root -p caster_db < caster_db_backup.sql
```

### 5.2 Partial Restore (Specific Tables)

```sql
-- Restore hanya table tertentu dari backup file
-- 1. Extract SQL untuk table yang dibutuhkan dari backup file
-- 2. Execute di MySQL

-- Atau gunakan tool seperti BigDump untuk file besar
```

### 5.3 Point-in-Time Recovery (PITR)

Jika MySQL Binary Logging diaktifkan:

```bash
# Enable binary logging di my.ini/my.cnf
# log_bin = mysql-bin
# server_id = 1

# Restore to specific point in time
mysqlbinlog --stop-datetime="2024-12-17 14:30:00" mysql-bin.000001 | mysql -u root -p
```

---

## 6. Disaster Recovery

### Scenario 1: Database Corrupt

1. Stop aplikasi (backend & frontend)
2. Coba repair table:
   ```sql
   REPAIR TABLE table_name;
   ```
3. Jika gagal, restore dari backup terakhir
4. Re-apply transaction logs jika tersedia

### Scenario 2: Server Down Total

1. **Immediate**: Spin up new server
2. **Restore**:
   - Install MySQL
   - Restore database dari backup
   - Deploy aplikasi
   - Update DNS/load balancer

### Scenario 3: Accidental Data Deletion

```sql
-- Jika baru terjadi (dan binary log aktif)
-- 1. Identify waktu deletion
SHOW BINARY LOGS;

-- 2. Restore ke titik sebelum deletion
mysqlbinlog --stop-datetime="BEFORE_DELETE_TIME" mysql-bin.xxx | mysql -u root -p

-- Jika tidak ada binary log, gunakan backup terakhir
```

---

## 7. Verification & Testing

### 7.1 Verify Backup Integrity

```bash
# Check backup file tidak corrupt
mysql -u root -p --execute="SOURCE /backup/caster_db_backup.sql" --force test_db

# Atau cek dengan mysqlcheck
mysqlcheck -u root -p --check caster_db
```

### 7.2 Monthly Restore Test

> **IMPORTANT**: Lakukan restore test minimal bulanan!

**Checklist:**
- [ ] Restore backup ke test database
- [ ] Verify row counts match production
- [ ] Run basic queries to verify data
- [ ] Test aplikasi dengan test database

**Script untuk verify row counts:**
```sql
-- Run on PRODUCTION
SELECT 'cassettes' as tbl, COUNT(*) as cnt FROM cassettes
UNION ALL
SELECT 'machines', COUNT(*) FROM machines
UNION ALL
SELECT 'problem_tickets', COUNT(*) FROM problem_tickets
UNION ALL
SELECT 'repair_tickets', COUNT(*) FROM repair_tickets;

-- Compare with RESTORED database
```

### 7.3 Restore Test Automation

```powershell
# restore_test.ps1
$TEST_DB = "caster_test_restore"
$BACKUP_FILE = (Get-ChildItem "D:\Backup\MySQL" -Recurse -Filter "*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName

# Create test database
& mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS $TEST_DB"

# Restore
Get-Content $BACKUP_FILE | & mysql -u root -p $TEST_DB

# Verify
$result = & mysql -u root -p $TEST_DB -e "SELECT COUNT(*) FROM cassettes"
Write-Host "Restored cassettes count: $result"

# Cleanup
& mysql -u root -p -e "DROP DATABASE $TEST_DB"
```

---

## 📅 Backup Schedule Template

| Day | Time | Type | Responsible |
|-----|------|------|-------------|
| Daily | 02:00 | Automated Full | System |
| Weekly (Sunday) | 03:00 | Archive to offsite | System |
| Monthly (1st) | - | Restore test | DBA/IT |
| Quarterly | - | Full DR test | IT Team |

---

## ⚠️ Important Reminders

1. **NEVER** store backup di server yang sama dengan production
2. **TEST** restore procedures secara berkala
3. **ENCRYPT** backup jika berisi data sensitif
4. **MONITOR** backup jobs - setup alerts jika gagal
5. **DOCUMENT** setiap restore yang dilakukan

---

## 📞 Emergency Contacts

| Situation | Contact | Action |
|-----------|---------|--------|
| Backup failed | IT Support | Check logs, re-run manually |
| Need restore | DBA | Follow restore procedure |
| DR activation | IT Manager | Activate DR plan |

---

*Dokumen ini terakhir diupdate: Desember 2024*
