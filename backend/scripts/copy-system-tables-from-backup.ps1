# Copy MySQL System Tables from Backup

Write-Host "Copying MySQL System Tables from Backup..." -ForegroundColor Cyan
Write-Host ""

$backupPath = "C:\xampp\mysql\data_backup_20251214_105949"
$dataPath = "C:\xampp\mysql\data"
$mysqlBackupPath = Join-Path $backupPath "mysql"
$mysqlDataPath = Join-Path $dataPath "mysql"

# Check if MySQL is running
$mysqlProcess = Get-Process | Where-Object {$_.ProcessName -like "*mysqld*"}
if ($mysqlProcess) {
    Write-Host "MySQL is running. Stopping..." -ForegroundColor Yellow
    Stop-Process -Id $mysqlProcess.Id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
}

# Check backup
if (-not (Test-Path $mysqlBackupPath)) {
    Write-Host "Backup mysql folder not found at: $mysqlBackupPath" -ForegroundColor Red
    Write-Host "Trying to find backup folder..." -ForegroundColor Yellow
    
    $backupFolders = Get-ChildItem "C:\xampp\mysql" -Directory -Filter "data_backup_*" | Sort-Object LastWriteTime -Descending
    if ($backupFolders) {
        $mysqlBackupPath = Join-Path $backupFolders[0].FullName "mysql"
        Write-Host "Found backup: $($backupFolders[0].Name)" -ForegroundColor Green
    } else {
        Write-Host "No backup folder found!" -ForegroundColor Red
        exit 1
    }
}

if (-not (Test-Path $mysqlBackupPath)) {
    Write-Host "mysql folder not found in backup!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Backup mysql folder: $mysqlBackupPath" -ForegroundColor Green
Write-Host "Target mysql folder: $mysqlDataPath" -ForegroundColor Green
Write-Host ""

$confirm = Read-Host "Copy system tables from backup? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

# Create mysql folder if not exists
if (-not (Test-Path $mysqlDataPath)) {
    New-Item -ItemType Directory -Path $mysqlDataPath -Force | Out-Null
    Write-Host "Created mysql folder" -ForegroundColor Green
}

# Copy files
Write-Host ""
Write-Host "Copying system tables..." -ForegroundColor Cyan
try {
    Copy-Item -Path "$mysqlBackupPath\*" -Destination $mysqlDataPath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   System tables copied" -ForegroundColor Green
    
    # Count files
    $files = Get-ChildItem -Path $mysqlDataPath -Recurse -File -ErrorAction SilentlyContinue
    Write-Host "   Copied $($files.Count) files" -ForegroundColor Green
} catch {
    Write-Host "   Error copying: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "System tables copied successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Start MySQL in XAMPP Control Panel" -ForegroundColor White
Write-Host "   2. Wait 10-15 seconds" -ForegroundColor White
Write-Host "   3. Test: C:\xampp\mysql\bin\mysql.exe -u root" -ForegroundColor White
Write-Host ""

