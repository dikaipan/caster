# Fix MySQL Plugin Initialization Error
# This script disables problematic plugins to allow MySQL to start

Write-Host "MySQL Plugin Initialization Error Fix" -ForegroundColor Cyan
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
Write-Host "   1. Disable plugin directory" -ForegroundColor White
Write-Host "   2. Skip plugin loading" -ForegroundColor White
Write-Host "   3. Disable specific problematic plugins" -ForegroundColor White
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

# Step 1: Disable plugin directory
Write-Host ""
Write-Host "Step 1: Disabling plugin directory..." -ForegroundColor Cyan
if ($configContent -notmatch "plugin-dir\s*=") {
    if ($configContent -match "\[mysqld\]") {
        $configContent = $configContent -replace "(\[mysqld\])", "`$1`n# plugin-dir = (disabled for recovery)"
    }
    Write-Host "   Plugin directory disabled" -ForegroundColor Green
} else {
    Write-Host "   Plugin directory already configured" -ForegroundColor Yellow
}

# Step 2: Disable specific plugins
Write-Host ""
Write-Host "Step 2: Disabling problematic plugins..." -ForegroundColor Cyan

# Disable Aria (already done, but ensure it's there)
if ($configContent -notmatch "skip-aria") {
    if ($configContent -match "\[mysqld\]") {
        $configContent = $configContent -replace "(\[mysqld\])", "`$1`nskip-aria"
    }
    Write-Host "   skip-aria added" -ForegroundColor Green
}

# Disable plugin loading
if ($configContent -notmatch "skip-plugin-dir") {
    if ($configContent -match "\[mysqld\]") {
        $configContent = $configContent -replace "(\[mysqld\])", "`$1`nskip-plugin-dir"
    }
    Write-Host "   skip-plugin-dir added" -ForegroundColor Green
}

# Step 3: Add loose-skip-plugin-load to skip plugin loading errors
if ($configContent -notmatch "loose-skip-plugin-load") {
    if ($configContent -match "\[mysqld\]") {
        $configContent = $configContent -replace "(\[mysqld\])", "`$1`nloose-skip-plugin-load"
    }
    Write-Host "   loose-skip-plugin-load added" -ForegroundColor Green
}

# Step 4: Ensure skip-grant-tables is there (for recovery)
if ($configContent -notmatch "skip-grant-tables") {
    if ($configContent -match "\[mysqld\]") {
        $configContent = $configContent -replace "(\[mysqld\])", "`$1`nskip-grant-tables"
    }
    Write-Host "   skip-grant-tables added" -ForegroundColor Green
}

# Save config
Set-Content -Path $configPath -Value $configContent -NoNewline
Write-Host ""
Write-Host "Configuration updated successfully!" -ForegroundColor Green
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Start MySQL in XAMPP Control Panel" -ForegroundColor White
Write-Host "   2. Wait 15-20 seconds for MySQL to initialize" -ForegroundColor White
Write-Host "   3. If MySQL starts successfully:" -ForegroundColor Green
Write-Host "      - Test connection: C:\xampp\mysql\bin\mysql.exe -u root" -ForegroundColor Gray
Write-Host "      - Backup data IMMEDIATELY" -ForegroundColor Yellow
Write-Host "      - Apply migration" -ForegroundColor Gray
Write-Host "   4. If MySQL still fails:" -ForegroundColor Yellow
Write-Host "      - Check error log: C:\xampp\mysql\data\*.err" -ForegroundColor Gray
Write-Host "      - Consider reinitializing MySQL (will lose data!)" -ForegroundColor Gray
Write-Host ""
Write-Host "NOTE: With these settings, MySQL will start in recovery mode." -ForegroundColor Yellow
Write-Host "      After recovery, remove skip-grant-tables and plugin skips." -ForegroundColor Yellow
Write-Host ""

