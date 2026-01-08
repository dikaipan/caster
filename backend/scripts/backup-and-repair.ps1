# PowerShell script to backup and repair MySQL after corruption fix
# Run this after MySQL successfully starts

Write-Host "MySQL Backup and Repair Script" -ForegroundColor Cyan
Write-Host ""

# Get MySQL root password (if set)
$rootPassword = Read-Host "Enter MySQL root password (press Enter if no password)" -AsSecureString
$passwordArg = ""
if ($rootPassword.Length -gt 0) {
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($rootPassword)
    $plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    $passwordArg = "-p$plainPassword"
} else {
    $passwordArg = ""
}

# Detect MySQL installation
$binPath = $null
if (Test-Path "C:\xampp\mysql\bin") {
    $binPath = "C:\xampp\mysql\bin"
} elseif (Test-Path "C:\Program Files\MySQL") {
    $mysqlDirs = Get-ChildItem "C:\Program Files\MySQL\MySQL Server*" -Directory
    if ($mysqlDirs.Count -gt 0) {
        $binPath = "$($mysqlDirs[0].FullName)\bin"
    }
}

if (-not $binPath) {
    Write-Host "MySQL bin directory not found!" -ForegroundColor Red
    exit 1
}

$mysqlExe = Join-Path $binPath "mysql.exe"
$mysqldumpExe = Join-Path $binPath "mysqldump.exe"
$mysqlcheckExe = Join-Path $binPath "mysqlcheck.exe"
$ariaChkExe = Join-Path $binPath "aria_chk.exe"

# Step 1: Test connection
Write-Host "Step 1: Testing MySQL connection..." -ForegroundColor Cyan
try {
    if ($passwordArg) {
        $result = & $mysqlExe -u root $passwordArg -e "SELECT 1 as test;" 2>&1
    } else {
        $result = & $mysqlExe -u root -e "SELECT 1 as test;" 2>&1
    }
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Connection successful!" -ForegroundColor Green
    } else {
        Write-Host "   Connection failed: $result" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   Connection failed: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Backup all databases
Write-Host ""
Write-Host "Step 2: Backing up all databases..." -ForegroundColor Cyan
$backupFile = "backup_all_databases_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
try {
    if ($passwordArg) {
        & $mysqldumpExe -u root $passwordArg --all-databases > $backupFile 2>&1
    } else {
        & $mysqldumpExe -u root --all-databases > $backupFile 2>&1
    }
    if ($LASTEXITCODE -eq 0 -or (Test-Path $backupFile)) {
        $fileSize = (Get-Item $backupFile).Length / 1MB
        Write-Host "   Backup created: $backupFile ($([math]::Round($fileSize, 2)) MB)" -ForegroundColor Green
    } else {
        Write-Host "   Backup may have failed. Check file: $backupFile" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   Backup failed: $_" -ForegroundColor Red
}

# Step 3: Repair Aria tables
Write-Host ""
Write-Host "Step 3: Repairing Aria tables..." -ForegroundColor Cyan
if (Test-Path $ariaChkExe) {
    $ariaDataPath = "C:\xampp\mysql\data\mysql"
    if (Test-Path $ariaDataPath) {
        $ariaFiles = Get-ChildItem -Path $ariaDataPath -Filter "*.MAI" -ErrorAction SilentlyContinue
        if ($ariaFiles) {
            Write-Host "   Found $($ariaFiles.Count) Aria table files" -ForegroundColor Yellow
            foreach ($file in $ariaFiles) {
                try {
                    & $ariaChkExe -r $file.FullName 2>&1 | Out-Null
                    Write-Host "   Repaired: $($file.Name)" -ForegroundColor Green
                } catch {
                    Write-Host "   Failed to repair: $($file.Name)" -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "   No Aria table files found" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "   aria_chk.exe not found, skipping..." -ForegroundColor Yellow
}

# Step 4: Repair all databases
Write-Host ""
Write-Host "Step 4: Repairing all databases..." -ForegroundColor Cyan
try {
    if ($passwordArg) {
        & $mysqlcheckExe -u root $passwordArg --auto-repair --all-databases 2>&1
    } else {
        & $mysqlcheckExe -u root --auto-repair --all-databases 2>&1
    }
    Write-Host "   Database repair completed" -ForegroundColor Green
} catch {
    Write-Host "   Repair had some issues: $_" -ForegroundColor Yellow
}

# Step 5: Repair plugin table
Write-Host ""
Write-Host "Step 5: Repairing plugin table..." -ForegroundColor Cyan
try {
    if ($passwordArg) {
        $repairResult = & $mysqlExe -u root $passwordArg -e "USE mysql; REPAIR TABLE plugin;" 2>&1
    } else {
        $repairResult = & $mysqlExe -u root -e "USE mysql; REPAIR TABLE plugin;" 2>&1
    }
    Write-Host "   Plugin table repair attempted" -ForegroundColor Green
    Write-Host "   Result: $repairResult" -ForegroundColor White
} catch {
    Write-Host "   Plugin table repair failed: $_" -ForegroundColor Yellow
    Write-Host "   You may need to recreate the plugin table manually" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Backup and repair completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Verify backup file: $backupFile" -ForegroundColor White
Write-Host "   2. Remove innodb_force_recovery from my.ini" -ForegroundColor White
Write-Host "   3. Restart MySQL" -ForegroundColor White
Write-Host "   4. Run migration: npx prisma migrate dev" -ForegroundColor White
Write-Host ""

