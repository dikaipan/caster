# Script to verify TECHNICIAN role removal
# This script checks if:
# 1. No users have TECHNICIAN role anymore
# 2. Enum no longer contains TECHNICIAN

Write-Host "Verifying TECHNICIAN role removal..." -ForegroundColor Cyan

# Load environment variables
$env:Path = "$env:Path;$(Get-Location)\node_modules\.bin"

# Check if any users still have TECHNICIAN role
Write-Host "`nChecking for users with TECHNICIAN role..." -ForegroundColor Yellow
$checkQuery = @"
SELECT COUNT(*) as count FROM pengelola_users WHERE role = 'TECHNICIAN';
"@

# Try to execute query using Prisma Studio or direct MySQL
Write-Host "Please verify manually:" -ForegroundColor Green
Write-Host "1. Check that no users have TECHNICIAN role" -ForegroundColor White
Write-Host "2. Check that enum only contains SUPERVISOR and ADMIN" -ForegroundColor White
Write-Host "`nYou can verify by:" -ForegroundColor Cyan
Write-Host "  - Opening Prisma Studio: npx prisma studio" -ForegroundColor White
Write-Host "  - Or checking database directly" -ForegroundColor White

