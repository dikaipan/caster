# Clean MySQL Config - Remove all problematic settings

Write-Host "Cleaning MySQL Config..." -ForegroundColor Cyan
Write-Host ""

$configPath = "C:\xampp\mysql\bin\my.ini"

if (-not (Test-Path $configPath)) {
    Write-Host "Config file not found!" -ForegroundColor Red
    exit 1
}

# Backup
$backupPath = "$configPath.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item $configPath $backupPath
Write-Host "Config backed up to: $backupPath" -ForegroundColor Green

# Read config
$configContent = Get-Content $configPath -Raw

# Remove all problematic settings
Write-Host ""
Write-Host "Removing problematic settings..." -ForegroundColor Cyan

# Remove skip-aria (ambiguous, not valid)
$configContent = $configContent -replace "(?m)^\s*skip-aria\s*$", ""
Write-Host "   Removed: skip-aria" -ForegroundColor Green

# Remove innodb_force_recovery
$configContent = $configContent -replace "(?m)^\s*innodb_force_recovery\s*=\s*\d+\s*$", ""
Write-Host "   Removed: innodb_force_recovery" -ForegroundColor Green

# Remove skip-grant-tables
$configContent = $configContent -replace "(?m)^\s*skip-grant-tables\s*$", ""
Write-Host "   Removed: skip-grant-tables" -ForegroundColor Green

# Remove skip-plugin-dir
$configContent = $configContent -replace "(?m)^\s*skip-plugin-dir\s*$", ""
Write-Host "   Removed: skip-plugin-dir" -ForegroundColor Green

# Remove loose-skip-plugin-load
$configContent = $configContent -replace "(?m)^\s*loose-skip-plugin-load\s*$", ""
Write-Host "   Removed: loose-skip-plugin-load" -ForegroundColor Green

# Remove skip-name-resolve
$configContent = $configContent -replace "(?m)^\s*skip-name-resolve\s*$", ""
Write-Host "   Removed: skip-name-resolve" -ForegroundColor Green

# Remove skip-slave-start
$configContent = $configContent -replace "(?m)^\s*skip-slave-start\s*$", ""
Write-Host "   Removed: skip-slave-start" -ForegroundColor Green

# Remove empty plugin-dir
$configContent = $configContent -replace "(?m)^\s*plugin-dir\s*=\s*$", ""
Write-Host "   Removed: empty plugin-dir" -ForegroundColor Green

# Clean up multiple empty lines
$configContent = $configContent -replace "(`r?`n){3,}", "`r`n`r`n"

# Save
Set-Content -Path $configPath -Value $configContent -NoNewline
Write-Host ""
Write-Host "Config cleaned successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Start MySQL in XAMPP Control Panel" -ForegroundColor Yellow
Write-Host ""

