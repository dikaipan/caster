# Install MySQL System Tables
# This will create missing system tables

Write-Host "Installing MySQL System Tables..." -ForegroundColor Cyan
Write-Host ""

$binPath = "C:\xampp\mysql\bin"
$dataPath = "C:\xampp\mysql\data"
$mysqldPath = Join-Path $binPath "mysqld.exe"
$mysqlPath = Join-Path $binPath "mysql.exe"

# Check if MySQL is running
$mysqlProcess = Get-Process | Where-Object {$_.ProcessName -like "*mysqld*"}
if ($mysqlProcess) {
    Write-Host "MySQL is running. Stopping..." -ForegroundColor Yellow
    Stop-Process -Id $mysqlProcess.Id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
}

Write-Host ""
Write-Host "This will install MySQL system tables using mysql_install_db" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Continue? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

# Try mysql_install_db (older method)
Write-Host ""
Write-Host "Step 1: Trying mysql_install_db..." -ForegroundColor Cyan
$installDbPath = Join-Path $binPath "mysql_install_db.exe"
if (Test-Path $installDbPath) {
    try {
        Push-Location $binPath
        & .\mysql_install_db.exe --datadir=$dataPath --service=MySQL 2>&1 | Out-Null
        Write-Host "   mysql_install_db completed" -ForegroundColor Green
        Pop-Location
    } catch {
        Write-Host "   mysql_install_db failed: $_" -ForegroundColor Yellow
        Pop-Location
    }
} else {
    Write-Host "   mysql_install_db.exe not found, trying mysqld --initialize..." -ForegroundColor Yellow
    
    # Try mysqld --initialize-insecure again
    if (Test-Path $mysqldPath) {
        try {
            Push-Location $binPath
            Write-Host "   Running mysqld --initialize-insecure..." -ForegroundColor Yellow
            & .\mysqld.exe --initialize-insecure --datadir=$dataPath 2>&1 | Out-Null
            Write-Host "   Initialize completed" -ForegroundColor Green
            Pop-Location
        } catch {
            Write-Host "   Initialize failed: $_" -ForegroundColor Yellow
            Pop-Location
        }
    }
}

Write-Host ""
Write-Host "Step 2: Checking for system tables..." -ForegroundColor Cyan
$mysqlDataPath = Join-Path $dataPath "mysql"
if (Test-Path $mysqlDataPath) {
    $tables = Get-ChildItem -Path $mysqlDataPath -Filter "*.frm" -ErrorAction SilentlyContinue
    if ($tables) {
        Write-Host "   Found $($tables.Count) system tables" -ForegroundColor Green
    } else {
        Write-Host "   No system tables found" -ForegroundColor Yellow
    }
} else {
    Write-Host "   mysql folder not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Start MySQL in XAMPP Control Panel" -ForegroundColor White
Write-Host "   2. Wait 10-15 seconds" -ForegroundColor White
Write-Host "   3. Test: C:\xampp\mysql\bin\mysql.exe -u root" -ForegroundColor White
Write-Host ""
Write-Host "If MySQL still can't connect, you may need to:" -ForegroundColor Yellow
Write-Host "   - Copy system tables from backup folder" -ForegroundColor White
Write-Host "   - Or reinstall XAMPP MySQL" -ForegroundColor White
Write-Host ""

