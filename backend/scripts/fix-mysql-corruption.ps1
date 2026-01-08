# PowerShell script to fix MySQL InnoDB corruption
# Run this script as Administrator

Write-Host "MySQL InnoDB Corruption Fix Script" -ForegroundColor Cyan
Write-Host ""

# Detect MySQL installation
$mysqlPath = $null
$dataPath = $null
$configPath = $null

# Check XAMPP
if (Test-Path "C:\xampp\mysql\bin\mysqld.exe") {
    $mysqlPath = "C:\xampp\mysql"
    $dataPath = "C:\xampp\mysql\data"
    $configPath = "C:\xampp\mysql\bin\my.ini"
    Write-Host "Detected XAMPP MySQL installation" -ForegroundColor Green
} 
# Check MySQL Standalone
elseif (Test-Path "C:\Program Files\MySQL") {
    $mysqlDirs = Get-ChildItem "C:\Program Files\MySQL\MySQL Server*" -Directory
    if ($mysqlDirs.Count -gt 0) {
        $mysqlPath = $mysqlDirs[0].FullName
        $dataPath = "C:\ProgramData\MySQL\$($mysqlDirs[0].Name)\Data"
        $configPath = "C:\ProgramData\MySQL\$($mysqlDirs[0].Name)\my.ini"
        Write-Host "Detected MySQL Standalone installation: $mysqlPath" -ForegroundColor Green
    }
}

if (-not $mysqlPath) {
    Write-Host "MySQL installation not found!" -ForegroundColor Red
    Write-Host "Please install MySQL or XAMPP first." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "MySQL Configuration:" -ForegroundColor Cyan
Write-Host "   MySQL Path: $mysqlPath" -ForegroundColor White
Write-Host "   Data Path: $dataPath" -ForegroundColor White
Write-Host "   Config Path: $configPath" -ForegroundColor White
Write-Host ""

# Check if config file exists
if (-not (Test-Path $configPath)) {
    Write-Host "Config file not found: $configPath" -ForegroundColor Red
    exit 1
}

Write-Host "WARNING: This will modify MySQL configuration!" -ForegroundColor Yellow
Write-Host "   Make sure MySQL is stopped before proceeding." -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Continue? (y/N)"

if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

# Backup config file
Write-Host ""
Write-Host "Backing up config file..." -ForegroundColor Yellow
$backupPath = "$configPath.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item $configPath $backupPath
Write-Host "Config backed up to: $backupPath" -ForegroundColor Green

# Read config file
Write-Host ""
Write-Host "Reading config file..." -ForegroundColor Yellow
$configContent = Get-Content $configPath -Raw

# Check if innodb_force_recovery already exists
if ($configContent -match "innodb_force_recovery\s*=") {
    Write-Host "innodb_force_recovery already exists in config" -ForegroundColor Yellow
    Write-Host "   Current value will be updated to 1" -ForegroundColor Yellow
    
    # Update existing value
    $configContent = $configContent -replace "innodb_force_recovery\s*=\s*\d+", "innodb_force_recovery = 1"
} else {
    # Add innodb_force_recovery to [mysqld] section
    if ($configContent -match "\[mysqld\]") {
        $configContent = $configContent -replace "(\[mysqld\])", "`$1`ninnodb_force_recovery = 1"
        Write-Host "Added innodb_force_recovery = 1 to [mysqld] section" -ForegroundColor Green
    } else {
        # Add [mysqld] section if it doesn't exist
        $configContent += "`n[mysqld]`ninnodb_force_recovery = 1`n"
        Write-Host "Added [mysqld] section with innodb_force_recovery = 1" -ForegroundColor Green
    }
}

# Write config file
Write-Host ""
Write-Host "Writing config file..." -ForegroundColor Yellow
Set-Content -Path $configPath -Value $configContent -NoNewline
Write-Host "Config file updated" -ForegroundColor Green

Write-Host ""
Write-Host "Configuration updated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Start MySQL service" -ForegroundColor White
Write-Host "   2. If MySQL starts successfully:" -ForegroundColor White
Write-Host "      - Backup your data immediately" -ForegroundColor Yellow
Write-Host "      - Run: mysqlcheck -u root -p --auto-repair --all-databases" -ForegroundColor White
Write-Host "   3. After repair, remove innodb_force_recovery = 1 from config" -ForegroundColor White
Write-Host "   4. Restart MySQL" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT: Force recovery mode is for recovery only!" -ForegroundColor Yellow
Write-Host "   Remove it after repair is complete." -ForegroundColor Yellow
Write-Host ""
