# Final MySQL Fix - Reinitialize (Simple Version)
# This will DELETE all data and reinitialize MySQL

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MySQL Final Fix - Reinitialize" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ini akan:" -ForegroundColor Yellow
Write-Host "  1. Stop MySQL" -ForegroundColor White
Write-Host "  2. Backup data folder (jika bisa)" -ForegroundColor White
Write-Host "  3. HAPUS semua data" -ForegroundColor Red
Write-Host "  4. Reinitialize MySQL (fresh start)" -ForegroundColor White
Write-Host ""
Write-Host "SETELAH INI, ANDA PERLU:" -ForegroundColor Yellow
Write-Host "  - Create database lagi" -ForegroundColor White
Write-Host "  - Run Prisma migrations" -ForegroundColor White
Write-Host "  - Restore data dari backup (jika ada)" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Lanjutkan? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Dibatalkan." -ForegroundColor Yellow
    exit 0
}

# Stop MySQL
Write-Host ""
Write-Host "Step 1: Stopping MySQL..." -ForegroundColor Cyan
$mysqlProcess = Get-Process | Where-Object {$_.ProcessName -like "*mysqld*"}
if ($mysqlProcess) {
    Stop-Process -Id $mysqlProcess.Id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    Write-Host "   MySQL stopped" -ForegroundColor Green
} else {
    Write-Host "   MySQL tidak running" -ForegroundColor Yellow
}

# Backup
Write-Host ""
Write-Host "Step 2: Backing up data folder..." -ForegroundColor Cyan
$dataPath = "C:\xampp\mysql\data"
$backupPath = "C:\xampp\mysql\data_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
try {
    if (Test-Path $dataPath) {
        Copy-Item $dataPath $backupPath -Recurse -ErrorAction SilentlyContinue
        if (Test-Path $backupPath) {
            $size = (Get-ChildItem $backupPath -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
            Write-Host "   Backup created: $backupPath ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "   Backup gagal, tapi lanjut..." -ForegroundColor Yellow
}

# Delete data
Write-Host ""
Write-Host "Step 3: Deleting data folder..." -ForegroundColor Cyan
try {
    if (Test-Path $dataPath) {
        Get-ChildItem -Path $dataPath -Exclude "data_backup*" | Remove-Item -Recurse -Force
        Write-Host "   Data folder cleared" -ForegroundColor Green
    }
} catch {
    Write-Host "   Error: $_" -ForegroundColor Red
    Write-Host "   Mungkin perlu hapus manual" -ForegroundColor Yellow
    exit 1
}

# Reinitialize
Write-Host ""
Write-Host "Step 4: Reinitializing MySQL..." -ForegroundColor Cyan
$binPath = "C:\xampp\mysql\bin"
$mysqldPath = Join-Path $binPath "mysqld.exe"
if (Test-Path $mysqldPath) {
    try {
        Push-Location $binPath
        & .\mysqld.exe --initialize-insecure --datadir=$dataPath 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0 -or (Test-Path "$dataPath\mysql")) {
            Write-Host "   MySQL reinitialized!" -ForegroundColor Green
        } else {
            Write-Host "   Reinitialize mungkin gagal, cek manual" -ForegroundColor Yellow
        }
        Pop-Location
    } catch {
        Write-Host "   Error: $_" -ForegroundColor Red
        Pop-Location
        exit 1
    }
} else {
    Write-Host "   mysqld.exe tidak ditemukan!" -ForegroundColor Red
    exit 1
}

# Clean config
Write-Host ""
Write-Host "Step 5: Cleaning config..." -ForegroundColor Cyan
$configPath = "C:\xampp\mysql\bin\my.ini"
if (Test-Path $configPath) {
    $configContent = Get-Content $configPath -Raw
    
    # Remove recovery settings
    $configContent = $configContent -replace "innodb_force_recovery\s*=\s*\d+", ""
    $configContent = $configContent -replace "skip-grant-tables", ""
    $configContent = $configContent -replace "skip-plugin-dir", ""
    $configContent = $configContent -replace "loose-skip-plugin-load", ""
    $configContent = $configContent -replace "skip-aria", ""
    $configContent = $configContent -replace "skip-name-resolve", ""
    $configContent = $configContent -replace "skip-slave-start", ""
    $configContent = $configContent -replace "plugin-dir\s*=", ""
    
    # Clean up multiple empty lines
    $configContent = $configContent -replace "(`r?`n){3,}", "`r`n`r`n"
    
    Set-Content -Path $configPath -Value $configContent -NoNewline
    Write-Host "   Config cleaned" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  SELESAI!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Langkah selanjutnya:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Start MySQL di XAMPP Control Panel" -ForegroundColor White
Write-Host "2. Test koneksi:" -ForegroundColor White
Write-Host "   C:\xampp\mysql\bin\mysql.exe -u root" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Create database:" -ForegroundColor White
Write-Host "   CREATE DATABASE caster;" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Run Prisma migrations:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   npx prisma migrate deploy" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Apply migration (remove RETURN_SHIPPED):" -ForegroundColor White
Write-Host "   npx prisma migrate dev" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Restore data dari backup (jika ada):" -ForegroundColor White
Write-Host "   C:\xampp\mysql\bin\mysql.exe -u root caster < backup.sql" -ForegroundColor Gray
Write-Host ""
if (Test-Path $backupPath) {
    Write-Host "Backup location: $backupPath" -ForegroundColor Yellow
}
Write-Host ""

