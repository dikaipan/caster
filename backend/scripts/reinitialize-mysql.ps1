# Reinitialize MySQL - WARNING: This will DELETE ALL DATA!
# Only use this as a last resort

Write-Host "MySQL Reinitialize Script" -ForegroundColor Red
Write-Host "WARNING: This will DELETE ALL DATA in MySQL!" -ForegroundColor Yellow
Write-Host ""

$mysqlPath = "C:\xampp\mysql"
$dataPath = "C:\xampp\mysql\data"
$binPath = "C:\xampp\mysql\bin"

# Check if MySQL is running
$mysqlProcess = Get-Process | Where-Object {$_.ProcessName -like "*mysqld*"}
if ($mysqlProcess) {
    Write-Host "WARNING: MySQL is currently running!" -ForegroundColor Yellow
    Write-Host "   Process ID: $($mysqlProcess.Id)" -ForegroundColor White
    Write-Host ""
    $stop = Read-Host "Stop MySQL before proceeding? (y/N)"
    if ($stop -eq "y" -or $stop -eq "Y") {
        Write-Host "Stopping MySQL..." -ForegroundColor Yellow
        Stop-Process -Id $mysqlProcess.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
        Write-Host "MySQL stopped." -ForegroundColor Green
    } else {
        Write-Host "Please stop MySQL manually in XAMPP Control Panel first!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "This script will:" -ForegroundColor Cyan
Write-Host "   1. Backup data folder (if possible)" -ForegroundColor White
Write-Host "   2. DELETE all files in data folder" -ForegroundColor Red
Write-Host "   3. Reinitialize MySQL with empty data" -ForegroundColor White
Write-Host ""
Write-Host "ALL DATA WILL BE LOST!" -ForegroundColor Red
Write-Host ""

$confirm1 = Read-Host "Are you SURE you want to continue? Type 'YES' to confirm"
if ($confirm1 -ne "YES") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

$confirm2 = Read-Host "Type 'DELETE ALL DATA' to confirm again"
if ($confirm2 -ne "DELETE ALL DATA") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

# Step 1: Backup data folder
Write-Host ""
Write-Host "Step 1: Backing up data folder..." -ForegroundColor Cyan
$backupPath = "$mysqlPath\data_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
try {
    if (Test-Path $dataPath) {
        Copy-Item $dataPath $backupPath -Recurse -ErrorAction SilentlyContinue
        if (Test-Path $backupPath) {
            Write-Host "   Backup created: $backupPath" -ForegroundColor Green
        } else {
            Write-Host "   Backup failed, but continuing..." -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "   Backup failed: $_" -ForegroundColor Yellow
    Write-Host "   Continuing anyway..." -ForegroundColor Yellow
}

# Step 2: Delete all files in data folder
Write-Host ""
Write-Host "Step 2: Deleting all files in data folder..." -ForegroundColor Cyan
try {
    if (Test-Path $dataPath) {
        Get-ChildItem -Path $dataPath -Exclude "data_backup*" | Remove-Item -Recurse -Force
        Write-Host "   Data folder cleared" -ForegroundColor Green
    }
} catch {
    Write-Host "   Error deleting files: $_" -ForegroundColor Red
    Write-Host "   You may need to delete manually" -ForegroundColor Yellow
    exit 1
}

# Step 3: Reinitialize MySQL
Write-Host ""
Write-Host "Step 3: Reinitializing MySQL..." -ForegroundColor Cyan
$mysqldPath = Join-Path $binPath "mysqld.exe"
if (Test-Path $mysqldPath) {
    try {
        Push-Location $binPath
        & .\mysqld.exe --initialize-insecure --datadir=$dataPath
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   MySQL reinitialized successfully" -ForegroundColor Green
        } else {
            Write-Host "   Reinitialize may have failed, check output above" -ForegroundColor Yellow
        }
        Pop-Location
    } catch {
        Write-Host "   Reinitialize failed: $_" -ForegroundColor Red
        Pop-Location
        exit 1
    }
} else {
    Write-Host "   mysqld.exe not found at: $mysqldPath" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Reinitialize completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Start MySQL in XAMPP Control Panel" -ForegroundColor White
Write-Host "   2. Create database: CREATE DATABASE caster;" -ForegroundColor White
Write-Host "   3. Run Prisma migrations: npx prisma migrate deploy" -ForegroundColor White
Write-Host "   4. Restore data from backup (if available):" -ForegroundColor White
Write-Host "      C:\xampp\mysql\bin\mysql.exe -u root caster < backup.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "Backup location: $backupPath" -ForegroundColor Yellow
Write-Host ""

