# PowerShell script to increase innodb_force_recovery level
# Run this script if MySQL still cannot start with level 1

Write-Host "Increasing InnoDB Force Recovery Level" -ForegroundColor Cyan
Write-Host ""

# Detect MySQL installation
$configPath = $null

# Check XAMPP
if (Test-Path "C:\xampp\mysql\bin\my.ini") {
    $configPath = "C:\xampp\mysql\bin\my.ini"
    Write-Host "Detected XAMPP MySQL installation" -ForegroundColor Green
} 
# Check MySQL Standalone
elseif (Test-Path "C:\Program Files\MySQL") {
    $mysqlDirs = Get-ChildItem "C:\Program Files\MySQL\MySQL Server*" -Directory
    if ($mysqlDirs.Count -gt 0) {
        $configPath = "C:\ProgramData\MySQL\$($mysqlDirs[0].Name)\my.ini"
        Write-Host "Detected MySQL Standalone installation" -ForegroundColor Green
    }
}

if (-not $configPath -or -not (Test-Path $configPath)) {
    Write-Host "MySQL config file not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Config file: $configPath" -ForegroundColor White
Write-Host ""

# Read current config
$configContent = Get-Content $configPath -Raw

# Get current recovery level
$currentLevel = 1
if ($configContent -match "innodb_force_recovery\s*=\s*(\d+)") {
    $currentLevel = [int]$matches[1]
    Write-Host "Current recovery level: $currentLevel" -ForegroundColor Yellow
} else {
    Write-Host "No innodb_force_recovery found. Will add level 2." -ForegroundColor Yellow
}

# Calculate new level (increase by 1, max 6)
$newLevel = [Math]::Min($currentLevel + 1, 6)

if ($newLevel -eq 6) {
    Write-Host ""
    Write-Host "WARNING: Maximum recovery level (6) reached!" -ForegroundColor Red
    Write-Host "If MySQL still cannot start, consider reinitializing MySQL." -ForegroundColor Yellow
    Write-Host ""
    $confirm = Read-Host "Continue with level 6? (y/N)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
        Write-Host "Cancelled." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""
Write-Host "Updating recovery level to: $newLevel" -ForegroundColor Cyan
Write-Host ""

# Backup config
$backupPath = "$configPath.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item $configPath $backupPath
Write-Host "Config backed up to: $backupPath" -ForegroundColor Green

# Update or add innodb_force_recovery
if ($configContent -match "innodb_force_recovery\s*=") {
    $configContent = $configContent -replace "innodb_force_recovery\s*=\s*\d+", "innodb_force_recovery = $newLevel"
    Write-Host "Updated innodb_force_recovery to $newLevel" -ForegroundColor Green
} else {
    # Add to [mysqld] section
    if ($configContent -match "\[mysqld\]") {
        $configContent = $configContent -replace "(\[mysqld\])", "`$1`ninnodb_force_recovery = $newLevel"
        Write-Host "Added innodb_force_recovery = $newLevel to [mysqld] section" -ForegroundColor Green
    } else {
        $configContent += "`n[mysqld]`ninnodb_force_recovery = $newLevel`n"
        Write-Host "Added [mysqld] section with innodb_force_recovery = $newLevel" -ForegroundColor Green
    }
}

# Write config
Set-Content -Path $configPath -Value $configContent -NoNewline
Write-Host ""
Write-Host "Configuration updated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Try to start MySQL again" -ForegroundColor White
Write-Host "   2. If MySQL starts, backup data immediately" -ForegroundColor Yellow
Write-Host "   3. Run: mysqlcheck -u root -p --auto-repair --all-databases" -ForegroundColor White
Write-Host "   4. After repair, remove innodb_force_recovery from config" -ForegroundColor White
Write-Host "   5. Restart MySQL" -ForegroundColor White
Write-Host ""
if ($newLevel -ge 3) {
    Write-Host "WARNING: High recovery level ($newLevel) may limit MySQL functionality!" -ForegroundColor Yellow
    Write-Host "   - Some operations may be read-only" -ForegroundColor Yellow
    Write-Host "   - Backup data as soon as MySQL starts" -ForegroundColor Yellow
}
Write-Host ""

