# Extreme MySQL Recovery - Disable All Plugins
# This script takes the most aggressive approach to get MySQL running

Write-Host "Extreme MySQL Recovery - Disable All Plugins" -ForegroundColor Cyan
Write-Host "WARNING: This will disable all plugins to get MySQL running" -ForegroundColor Yellow
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
Write-Host "Extreme Recovery Strategy:" -ForegroundColor Cyan
Write-Host "   1. Set plugin-dir to empty (disable all plugins)" -ForegroundColor White
Write-Host "   2. Add --skip-plugin-load (skip plugin loading)" -ForegroundColor White
Write-Host "   3. Keep all existing recovery settings" -ForegroundColor White
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

# Step 1: Set plugin-dir to empty
Write-Host ""
Write-Host "Step 1: Setting plugin-dir to empty..." -ForegroundColor Cyan
if ($configContent -match "plugin-dir\s*=") {
    $configContent = $configContent -replace "plugin-dir\s*=.*", "plugin-dir ="
    Write-Host "   plugin-dir set to empty" -ForegroundColor Green
} else {
    if ($configContent -match "\[mysqld\]") {
        $configContent = $configContent -replace "(\[mysqld\])", "`$1`nplugin-dir ="
    } else {
        $configContent += "`n[mysqld]`nplugin-dir =`n"
    }
    Write-Host "   plugin-dir added (empty)" -ForegroundColor Green
}

# Step 2: Ensure skip-plugin-dir is there
if ($configContent -notmatch "skip-plugin-dir") {
    if ($configContent -match "\[mysqld\]") {
        $configContent = $configContent -replace "(\[mysqld\])", "`$1`nskip-plugin-dir"
    }
    Write-Host "   skip-plugin-dir added" -ForegroundColor Green
}

# Step 3: Add --skip-plugin-load (as loose option)
if ($configContent -notmatch "loose-skip-plugin-load") {
    if ($configContent -match "\[mysqld\]") {
        $configContent = $configContent -replace "(\[mysqld\])", "`$1`nloose-skip-plugin-load"
    }
    Write-Host "   loose-skip-plugin-load added" -ForegroundColor Green
}

# Step 4: Ensure all recovery settings are there
$recoverySettings = @(
    "innodb_force_recovery = 4",
    "skip-grant-tables",
    "skip-name-resolve",
    "skip-slave-start",
    "skip-aria"
)

foreach ($setting in $recoverySettings) {
    $settingName = $setting -replace "\s*=.*", ""
    if ($configContent -notmatch [regex]::Escape($settingName)) {
        if ($configContent -match "\[mysqld\]") {
            $configContent = $configContent -replace "(\[mysqld\])", "`$1`n$setting"
        }
        Write-Host "   $settingName added" -ForegroundColor Green
    }
}

# Save config
Set-Content -Path $configPath -Value $configContent -NoNewline
Write-Host ""
Write-Host "Configuration updated successfully!" -ForegroundColor Green
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Start MySQL in XAMPP Control Panel" -ForegroundColor White
Write-Host "   2. Wait 20-30 seconds for MySQL to initialize" -ForegroundColor White
Write-Host "   3. If MySQL starts successfully:" -ForegroundColor Green
Write-Host "      - Test: C:\xampp\mysql\bin\mysql.exe -u root" -ForegroundColor Gray
Write-Host "      - BACKUP DATA IMMEDIATELY!" -ForegroundColor Yellow
Write-Host "      - Apply migration" -ForegroundColor Gray
Write-Host "   4. If MySQL STILL fails:" -ForegroundColor Red
Write-Host "      - Consider reinitializing MySQL (will lose data!)" -ForegroundColor Yellow
Write-Host "      - Or restore from backup if available" -ForegroundColor Yellow
Write-Host ""
Write-Host "NOTE: With empty plugin-dir, MySQL will not load any plugins." -ForegroundColor Yellow
Write-Host "      This is extreme recovery mode - only for data recovery." -ForegroundColor Yellow
Write-Host ""

