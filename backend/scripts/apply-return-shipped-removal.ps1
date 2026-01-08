# PowerShell script to apply RETURN_SHIPPED removal migration
# Make sure database server is running before executing this script

Write-Host "Applying RETURN_SHIPPED removal migration..." -ForegroundColor Cyan
Write-Host ""

# Check if migration already applied
Write-Host "Checking migration status..." -ForegroundColor Yellow
$mysqlExe = "C:\xampp\mysql\bin\mysql.exe"
$dbName = "caster"

try {
    # Check if RETURN_SHIPPED exists in enum
    $enumCheck = & $mysqlExe -u root $dbName -e "SHOW COLUMNS FROM problem_tickets WHERE Field = 'status';" 2>&1
    if ($enumCheck -match "RETURN_SHIPPED") {
        Write-Host "WARNING: RETURN_SHIPPED masih ada di enum" -ForegroundColor Yellow
    } else {
        Write-Host "SUCCESS: RETURN_SHIPPED sudah tidak ada di enum" -ForegroundColor Green
        Write-Host "SUCCESS: Migration sudah di-apply sebelumnya" -ForegroundColor Green
        Write-Host ""
        Write-Host "Migration tidak perlu di-apply lagi" -ForegroundColor Cyan
        exit 0
    }
    
    # Check for tickets with RETURN_SHIPPED status
    $ticketCheck = & $mysqlExe -u root $dbName -e "SELECT COUNT(*) as count FROM problem_tickets WHERE status = 'RETURN_SHIPPED';" 2>&1
    $ticketCount = ($ticketCheck | Select-String -Pattern "\d+").Matches[0].Value
    if ($ticketCount -gt 0) {
        Write-Host "Found $ticketCount ticket(s) with RETURN_SHIPPED status" -ForegroundColor Yellow
        Write-Host "These will be updated to CLOSED" -ForegroundColor Yellow
    } else {
        Write-Host "SUCCESS: No tickets with RETURN_SHIPPED status" -ForegroundColor Green
    }
    Write-Host ""
} catch {
    Write-Host "WARNING: Could not check migration status: $_" -ForegroundColor Yellow
    Write-Host ""
}

# Check if database is accessible
Write-Host "Checking database connection..." -ForegroundColor Yellow
try {
    $result = npx prisma db execute --stdin 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Cannot connect to database. Please make sure database server is running." -ForegroundColor Red
        exit 1
    }
    Write-Host "SUCCESS: Database connection OK" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "ERROR: Cannot connect to database. Please make sure database server is running." -ForegroundColor Red
    exit 1
}

# Apply migration
Write-Host "Applying migration..." -ForegroundColor Yellow
npx prisma migrate dev

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS: Migration applied successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Verifying migration..." -ForegroundColor Yellow
    
    # Generate Prisma client
    Write-Host "Generating Prisma client..." -ForegroundColor Yellow
    npx prisma generate
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: Prisma client generated successfully!" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Prisma client generation had issues" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Migration completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Restart your backend server" -ForegroundColor White
    Write-Host "   2. Test the application to ensure everything works" -ForegroundColor White
    Write-Host "   3. Verify ticket status transitions (RESOLVED to CLOSED)" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "ERROR: Migration failed. Please check the error messages above." -ForegroundColor Red
    exit 1
}
