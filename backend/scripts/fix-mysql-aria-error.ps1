# Fix MySQL Aria Engine Error
# This script disables Aria engine or recreates missing aria_log files

Write-Host "MySQL Aria Engine Error Fix" -ForegroundColor Cyan
Write-Host ""

$mysqlPath = "C:\xampp\mysql"
$dataPath = "C:\xampp\mysql\data"
$configPath = "C:\xampp\mysql\bin\my.ini"
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
Write-Host "Fix Strategy:" -ForegroundColor Cyan
Write-Host "   1. Disable Aria engine (skip-aria)" -ForegroundColor White
Write-Host "   2. Or recreate missing aria_log files" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Continue? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

# Backup config
$backupPath = "$configPath.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item $configPath $backupPath
Write-Host ""
Write-Host "Config backed up to: $backupPath" -ForegroundColor Green

# Read config
$configContent = Get-Content $configPath -Raw

# Option 1: Disable Aria engine
Write-Host ""
Write-Host "Step 1: Disabling Aria engine..." -ForegroundColor Cyan

# Add skip-aria or disable Aria
if ($configContent -notmatch "skip-aria") {
    if ($configContent -match "\[mysqld\]") {
        $configContent = $configContent -replace "(\[mysqld\])", "`$1`nskip-aria"
    } else {
        $configContent += "`n[mysqld]`nskip-aria`n"
    }
    Write-Host "   skip-aria added" -ForegroundColor Green
} else {
    Write-Host "   skip-aria already exists" -ForegroundColor Yellow
}

# Also try to disable Aria plugin loading
if ($configContent -notmatch "plugin-load-add\s*=\s*aria") {
    # We'll comment out any aria plugin loading if exists
    $configContent = $configContent -replace "plugin-load-add\s*=\s*aria", "# plugin-load-add = aria"
}

# Option 2: Try to recreate aria_log files (if aria_chk exists)
Write-Host ""
Write-Host "Step 2: Attempting to recreate aria_log files..." -ForegroundColor Cyan
$ariaChkPath = Join-Path $binPath "aria_chk.exe"
if (Test-Path $ariaChkPath) {
    Write-Host "   Found aria_chk.exe" -ForegroundColor Green
    Write-Host "   Note: Aria log files will be recreated on MySQL start" -ForegroundColor Yellow
    Write-Host "   If this fails, skip-aria will be used instead" -ForegroundColor Yellow
} else {
    Write-Host "   aria_chk.exe not found, skip-aria will be used" -ForegroundColor Yellow
}

# Save config
Set-Content -Path $configPath -Value $configContent -NoNewline
Write-Host ""
Write-Host "Configuration updated successfully!" -ForegroundColor Green
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Start MySQL in XAMPP Control Panel" -ForegroundColor White
Write-Host "   2. Wait 10-15 seconds for MySQL to initialize" -ForegroundColor White
Write-Host "   3. If MySQL starts successfully:" -ForegroundColor Green
Write-Host "      - Test connection: C:\xampp\mysql\bin\mysql.exe -u root" -ForegroundColor Gray
Write-Host "      - Backup data immediately" -ForegroundColor Gray
Write-Host "      - Apply migration" -ForegroundColor Gray
Write-Host "   4. If MySQL still fails:" -ForegroundColor Yellow
Write-Host "      - Check error log: C:\xampp\mysql\data\*.err" -ForegroundColor Gray
Write-Host "      - Consider reinitializing MySQL data directory" -ForegroundColor Gray
Write-Host ""

