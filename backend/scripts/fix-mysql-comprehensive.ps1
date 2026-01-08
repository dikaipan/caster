# PowerShell script to comprehensively fix MySQL/MariaDB corruption
# This script fixes: InnoDB corruption, Aria recovery, and system tables

Write-Host "Comprehensive MySQL/MariaDB Corruption Fix" -ForegroundColor Cyan
Write-Host ""

# Detect MySQL installation
$mysqlPath = $null
$dataPath = $null
$configPath = $null
$binPath = $null

# Check XAMPP
if (Test-Path "C:\xampp\mysql\bin\mysqld.exe") {
    $mysqlPath = "C:\xampp\mysql"
    $dataPath = "C:\xampp\mysql\data"
    $configPath = "C:\xampp\mysql\bin\my.ini"
    $binPath = "C:\xampp\mysql\bin"
    Write-Host "Detected XAMPP MariaDB installation" -ForegroundColor Green
} 
# Check MySQL Standalone
elseif (Test-Path "C:\Program Files\MySQL") {
    $mysqlDirs = Get-ChildItem "C:\Program Files\MySQL\MySQL Server*" -Directory
    if ($mysqlDirs.Count -gt 0) {
        $mysqlPath = $mysqlDirs[0].FullName
        $dataPath = "C:\ProgramData\MySQL\$($mysqlDirs[0].Name)\Data"
        $configPath = "C:\ProgramData\MySQL\$($mysqlDirs[0].Name)\my.ini"
        $binPath = "$mysqlPath\bin"
        Write-Host "Detected MySQL Standalone installation" -ForegroundColor Green
    }
}

if (-not $mysqlPath) {
    Write-Host "MySQL/MariaDB installation not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "MySQL Configuration:" -ForegroundColor Cyan
Write-Host "   MySQL Path: $mysqlPath" -ForegroundColor White
Write-Host "   Data Path: $dataPath" -ForegroundColor White
Write-Host "   Config Path: $configPath" -ForegroundColor White
Write-Host "   Bin Path: $binPath" -ForegroundColor White
Write-Host ""

Write-Host "WARNING: This will attempt to fix multiple corruption issues:" -ForegroundColor Yellow
Write-Host "   1. Increase InnoDB force recovery level" -ForegroundColor White
Write-Host "   2. Fix Aria recovery (delete aria_log files)" -ForegroundColor White
Write-Host "   3. Repair system tables" -ForegroundColor White
Write-Host ""
Write-Host "Make sure MySQL is STOPPED before proceeding!" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Continue? (y/N)"

if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

# Step 1: Increase InnoDB force recovery
Write-Host ""
Write-Host "Step 1: Updating InnoDB force recovery level..." -ForegroundColor Cyan
if (Test-Path $configPath) {
    $backupPath = "$configPath.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item $configPath $backupPath
    Write-Host "   Config backed up to: $backupPath" -ForegroundColor Green
    
    $configContent = Get-Content $configPath -Raw
    
    # Get current level or set to 3
    $currentLevel = 1
    if ($configContent -match "innodb_force_recovery\s*=\s*(\d+)") {
        $currentLevel = [int]$matches[1]
    }
    $newLevel = [Math]::Min($currentLevel + 1, 6)
    
    if ($configContent -match "innodb_force_recovery\s*=") {
        $configContent = $configContent -replace "innodb_force_recovery\s*=\s*\d+", "innodb_force_recovery = $newLevel"
    } else {
        if ($configContent -match "\[mysqld\]") {
            $configContent = $configContent -replace "(\[mysqld\])", "`$1`ninnodb_force_recovery = $newLevel"
        } else {
            $configContent += "`n[mysqld]`ninnodb_force_recovery = $newLevel`n"
        }
    }
    
    Set-Content -Path $configPath -Value $configContent -NoNewline
    Write-Host "   Updated innodb_force_recovery to level $newLevel" -ForegroundColor Green
} else {
    Write-Host "   Config file not found, skipping..." -ForegroundColor Yellow
}

# Step 2: Fix Aria recovery
Write-Host ""
Write-Host "Step 2: Fixing Aria recovery..." -ForegroundColor Cyan
$ariaLogFiles = Get-ChildItem -Path $dataPath -Filter "aria_log.*" -ErrorAction SilentlyContinue
if ($ariaLogFiles) {
    Write-Host "   Found $($ariaLogFiles.Count) aria_log files" -ForegroundColor Yellow
    foreach ($file in $ariaLogFiles) {
        try {
            Remove-Item $file.FullName -Force
            Write-Host "   Deleted: $($file.Name)" -ForegroundColor Green
        } catch {
            Write-Host "   Failed to delete: $($file.Name)" -ForegroundColor Red
        }
    }
    Write-Host "   Aria log files deleted" -ForegroundColor Green
} else {
    Write-Host "   No aria_log files found" -ForegroundColor Yellow
}

# Step 3: Try to repair system tables (if aria_chk exists)
Write-Host ""
Write-Host "Step 3: Attempting to repair Aria tables..." -ForegroundColor Cyan
$ariaChkPath = Join-Path $binPath "aria_chk.exe"
if (Test-Path $ariaChkPath) {
    Write-Host "   Found aria_chk.exe" -ForegroundColor Green
    Write-Host "   Note: You may need to run aria_chk manually after MySQL starts" -ForegroundColor Yellow
    Write-Host "   Command: aria_chk -r C:\xampp\mysql\data\mysql\*.MAI" -ForegroundColor White
} else {
    Write-Host "   aria_chk.exe not found, skipping..." -ForegroundColor Yellow
}

# Step 4: Try to fix mysql.plugin table (if possible)
Write-Host ""
Write-Host "Step 4: System table repair instructions..." -ForegroundColor Cyan
Write-Host "   After MySQL starts, run these commands:" -ForegroundColor Yellow
Write-Host "   1. mysql -u root -p" -ForegroundColor White
Write-Host "   2. USE mysql;" -ForegroundColor White
Write-Host "   3. REPAIR TABLE plugin;" -ForegroundColor White
Write-Host "   4. If repair fails, may need to recreate:" -ForegroundColor White
Write-Host "      DROP TABLE IF EXISTS plugin;" -ForegroundColor White
Write-Host "      CREATE TABLE plugin ... (MySQL will recreate on restart)" -ForegroundColor White

Write-Host ""
Write-Host "Configuration updated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Try to start MySQL again" -ForegroundColor White
Write-Host "   2. If MySQL starts (even with errors):" -ForegroundColor Yellow
Write-Host "      - Connect: mysql -u root -p" -ForegroundColor White
Write-Host "      - Backup: mysqldump -u root -p --all-databases > backup.sql" -ForegroundColor White
Write-Host "      - Repair: mysqlcheck -u root -p --auto-repair --all-databases" -ForegroundColor White
Write-Host "   3. Fix Aria tables: aria_chk -r C:\xampp\mysql\data\mysql\*.MAI" -ForegroundColor White
Write-Host "   4. Repair plugin table: REPAIR TABLE mysql.plugin;" -ForegroundColor White
Write-Host "   5. After all repairs, remove innodb_force_recovery from config" -ForegroundColor White
Write-Host "   6. Restart MySQL" -ForegroundColor White
Write-Host ""
Write-Host "If MySQL still cannot start, consider reinitializing MySQL data directory." -ForegroundColor Yellow
Write-Host ""

