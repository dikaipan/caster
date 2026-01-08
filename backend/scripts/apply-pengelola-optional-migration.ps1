# PowerShell script to apply migration: make pengelolaId optional in machines table

Write-Host "`n=== Applying Migration: Make pengelolaId Optional in Machines ===" -ForegroundColor Cyan
Write-Host ""

$mysqlPath = "C:\xampp\mysql\bin\mysql.exe"
if (-not (Test-Path $mysqlPath)) {
    Write-Host "[ERROR] MySQL not found at: $mysqlPath" -ForegroundColor Red
    Write-Host "Please update the mysqlPath variable in this script to point to your MySQL installation." -ForegroundColor Yellow
    exit 1
}

$database = "caster"
$sql = "ALTER TABLE machines MODIFY COLUMN pengelola_id CHAR(36) NULL;"

Write-Host "[INFO] SQL to execute:" -ForegroundColor Yellow
Write-Host "   $sql" -ForegroundColor Gray
Write-Host ""

try {
    Write-Host "[INFO] Executing migration..." -ForegroundColor Cyan
    
    # Execute SQL
    $command = "USE $database; $sql"
    & $mysqlPath -u root -e $command
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Migration applied successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "[INFO] Next steps:" -ForegroundColor Cyan
        Write-Host "   1. Restart your backend server" -ForegroundColor White
        Write-Host "   2. Run: npx prisma generate" -ForegroundColor White
        Write-Host "   3. Try importing again" -ForegroundColor White
    } else {
        Write-Host "[ERROR] Migration failed!" -ForegroundColor Red
        Write-Host "   Exit code: $LASTEXITCODE" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "[ERROR] Error executing migration:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

