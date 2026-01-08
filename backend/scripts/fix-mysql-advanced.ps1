# Advanced MySQL/MariaDB Corruption Fix
# This script tries multiple recovery strategies

Write-Host "Advanced MySQL/MariaDB Corruption Fix" -ForegroundColor Cyan
Write-Host ""

# Detect MySQL installation
$mysqlPath = "C:\xampp\mysql"
$dataPath = "C:\xampp\mysql\data"
$configPath = "C:\xampp\mysql\bin\my.ini"
$binPath = "C:\xampp\mysql\bin"

if (-not (Test-Path $configPath)) {
    Write-Host "MySQL config not found at: $configPath" -ForegroundColor Red
    exit 1
}

Write-Host "MySQL Configuration:" -ForegroundColor Cyan
Write-Host "   Config Path: $configPath" -ForegroundColor White
Write-Host "   Data Path: $dataPath" -ForegroundColor White
Write-Host ""

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
Write-Host "Recovery Strategy:" -ForegroundColor Cyan
Write-Host "   1. Increase innodb_force_recovery to level 4" -ForegroundColor White
Write-Host "   2. Add skip-grant-tables (bypass authentication)" -ForegroundColor White
Write-Host "   3. Add skip-name-resolve (skip DNS)" -ForegroundColor White
Write-Host "   4. Add skip-slave-start (skip replication)" -ForegroundColor White
Write-Host "   5. Delete corrupted aria_log files" -ForegroundColor White
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

# Step 1: Update innodb_force_recovery to 4
Write-Host ""
Write-Host "Step 1: Setting innodb_force_recovery to 4..." -ForegroundColor Cyan
if ($configContent -match "innodb_force_recovery\s*=") {
    $configContent = $configContent -replace "innodb_force_recovery\s*=\s*\d+", "innodb_force_recovery = 4"
} else {
    if ($configContent -match "\[mysqld\]") {
        $configContent = $configContent -replace "(\[mysqld\])", "`$1`ninnodb_force_recovery = 4"
    } else {
        $configContent += "`n[mysqld]`ninnodb_force_recovery = 4`n"
    }
}
Write-Host "   innodb_force_recovery set to 4" -ForegroundColor Green

# Step 2: Add skip-grant-tables
Write-Host ""
Write-Host "Step 2: Adding skip-grant-tables..." -ForegroundColor Cyan
if ($configContent -notmatch "skip-grant-tables") {
    if ($configContent -match "\[mysqld\]") {
        $configContent = $configContent -replace "(\[mysqld\])", "`$1`nskip-grant-tables"
    } else {
        $configContent += "`n[mysqld]`nskip-grant-tables`n"
    }
    Write-Host "   skip-grant-tables added" -ForegroundColor Green
} else {
    Write-Host "   skip-grant-tables already exists" -ForegroundColor Yellow
}

# Step 3: Add skip-name-resolve
Write-Host ""
Write-Host "Step 3: Adding skip-name-resolve..." -ForegroundColor Cyan
if ($configContent -notmatch "skip-name-resolve") {
    if ($configContent -match "\[mysqld\]") {
        $configContent = $configContent -replace "(\[mysqld\])", "`$1`nskip-name-resolve"
    } else {
        $configContent += "`n[mysqld]`nskip-name-resolve`n"
    }
    Write-Host "   skip-name-resolve added" -ForegroundColor Green
} else {
    Write-Host "   skip-name-resolve already exists" -ForegroundColor Yellow
}

# Step 4: Add skip-slave-start
Write-Host ""
Write-Host "Step 4: Adding skip-slave-start..." -ForegroundColor Cyan
if ($configContent -notmatch "skip-slave-start") {
    if ($configContent -match "\[mysqld\]") {
        $configContent = $configContent -replace "(\[mysqld\])", "`$1`nskip-slave-start"
    } else {
        $configContent += "`n[mysqld]`nskip-slave-start`n"
    }
    Write-Host "   skip-slave-start added" -ForegroundColor Green
} else {
    Write-Host "   skip-slave-start already exists" -ForegroundColor Yellow
}

# Step 5: Delete aria_log files
Write-Host ""
Write-Host "Step 5: Deleting aria_log files..." -ForegroundColor Cyan
$ariaLogFiles = Get-ChildItem -Path $dataPath -Filter "aria_log.*" -ErrorAction SilentlyContinue
if ($ariaLogFiles) {
    foreach ($file in $ariaLogFiles) {
        try {
            Remove-Item $file.FullName -Force
            Write-Host "   Deleted: $($file.Name)" -ForegroundColor Green
        } catch {
            Write-Host "   Failed to delete: $($file.Name) - $_" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   No aria_log files found" -ForegroundColor Yellow
}

# Save config
Set-Content -Path $configPath -Value $configContent -NoNewline
Write-Host ""
Write-Host "Configuration updated successfully!" -ForegroundColor Green
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Start MySQL in XAMPP Control Panel" -ForegroundColor White
Write-Host "   2. Wait 10-15 seconds for MySQL to initialize" -ForegroundColor White
Write-Host "   3. Test connection:" -ForegroundColor White
Write-Host "      C:\xampp\mysql\bin\mysql.exe -u root" -ForegroundColor Gray
Write-Host "   4. If MySQL starts successfully:" -ForegroundColor Yellow
Write-Host "      a. Backup data immediately:" -ForegroundColor White
Write-Host "         C:\xampp\mysql\bin\mysqldump.exe -u root --all-databases > backup.sql" -ForegroundColor Gray
Write-Host "      b. Repair databases:" -ForegroundColor White
Write-Host "         C:\xampp\mysql\bin\mysqlcheck.exe -u root --auto-repair --all-databases" -ForegroundColor Gray
Write-Host "      c. Remove skip-grant-tables from my.ini (for security)" -ForegroundColor White
Write-Host "      d. Restart MySQL" -ForegroundColor White
Write-Host "   5. If MySQL still fails, consider reinitializing MySQL" -ForegroundColor Yellow
Write-Host ""

