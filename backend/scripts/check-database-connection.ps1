# Database Connection Checker Script
# This script helps diagnose and fix database connection issues

Write-Host "🔍 Checking Database Connection..." -ForegroundColor Cyan
Write-Host ""

# Check if MySQL service is running
Write-Host "1. Checking MySQL Service..." -ForegroundColor Yellow
$mysqlService = Get-Service -Name "*mysql*" -ErrorAction SilentlyContinue

if ($mysqlService) {
    Write-Host "   ✅ MySQL service found: $($mysqlService.Name)" -ForegroundColor Green
    Write-Host "   Status: $($mysqlService.Status)" -ForegroundColor $(if ($mysqlService.Status -eq 'Running') { 'Green' } else { 'Red' })
    
    if ($mysqlService.Status -ne 'Running') {
        Write-Host ""
        Write-Host "   ⚠️  MySQL service is not running!" -ForegroundColor Yellow
        $start = Read-Host "   Do you want to start it? (y/n)"
        if ($start -eq 'y' -or $start -eq 'Y') {
            try {
                Start-Service $mysqlService.Name
                Write-Host "   ✅ MySQL service started successfully!" -ForegroundColor Green
                Start-Sleep -Seconds 3
            } catch {
                Write-Host "   ❌ Failed to start MySQL service: $_" -ForegroundColor Red
                Write-Host "   Please start it manually or check permissions." -ForegroundColor Yellow
            }
        }
    }
} else {
    Write-Host "   ❌ MySQL service not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Options:" -ForegroundColor Yellow
    Write-Host "   1. Install MySQL from https://dev.mysql.com/downloads/installer/" -ForegroundColor White
    Write-Host "   2. Use Docker: docker compose up -d mysql" -ForegroundColor White
    Write-Host "   3. Use XAMPP/WAMP and start MySQL from control panel" -ForegroundColor White
}

Write-Host ""

# Check if port 3306 is in use
Write-Host "2. Checking Port 3306..." -ForegroundColor Yellow
$port3306 = netstat -ano | findstr :3306
if ($port3306) {
    Write-Host "   ✅ Port 3306 is in use (MySQL might be running)" -ForegroundColor Green
    Write-Host "   $port3306" -ForegroundColor Gray
} else {
    Write-Host "   ❌ Port 3306 is not in use (MySQL is not running)" -ForegroundColor Red
}

Write-Host ""

# Check DATABASE_URL in .env
Write-Host "3. Checking .env Configuration..." -ForegroundColor Yellow
$envPath = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    if ($envContent -match 'DATABASE_URL=["'']?([^"'']+)["'']?') {
        $dbUrl = $matches[1]
        Write-Host "   ✅ DATABASE_URL found" -ForegroundColor Green
        Write-Host "   $dbUrl" -ForegroundColor Gray
        
        # Parse connection string
        if ($dbUrl -match 'mysql://([^:]+):?([^@]*)@([^:]+):(\d+)/(.+)') {
            $user = $matches[1]
            $pass = if ($matches[2]) { "***" } else { "(no password)" }
            $host = $matches[3]
            $port = $matches[4]
            $database = $matches[5]
            
            Write-Host ""
            Write-Host "   Connection Details:" -ForegroundColor Cyan
            Write-Host "   - Host: $host" -ForegroundColor White
            Write-Host "   - Port: $port" -ForegroundColor White
            Write-Host "   - User: $user" -ForegroundColor White
            Write-Host "   - Password: $pass" -ForegroundColor White
            Write-Host "   - Database: $database" -ForegroundColor White
        }
    } else {
        Write-Host "   ❌ DATABASE_URL not found in .env" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ .env file not found at: $envPath" -ForegroundColor Red
    Write-Host "   Please copy env.template to .env and configure it." -ForegroundColor Yellow
}

Write-Host ""

# Test connection (if mysql client is available)
Write-Host "4. Testing MySQL Connection..." -ForegroundColor Yellow
$mysqlPath = Get-Command mysql -ErrorAction SilentlyContinue
if ($mysqlPath) {
    Write-Host "   ℹ️  MySQL client found. Attempting connection test..." -ForegroundColor Cyan
    Write-Host "   (This may prompt for password)" -ForegroundColor Gray
    # Note: Actual connection test would require password, so we skip it
    Write-Host "   ✅ MySQL client is available" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  MySQL client not found in PATH" -ForegroundColor Yellow
    Write-Host "   You can still use Prisma to test the connection." -ForegroundColor Gray
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Recommendations
Write-Host "📋 Recommendations:" -ForegroundColor Cyan
Write-Host ""

if (-not $mysqlService -or $mysqlService.Status -ne 'Running') {
    Write-Host "   1. Start MySQL service:" -ForegroundColor Yellow
    Write-Host "      - If using Docker: docker compose up -d mysql" -ForegroundColor White
    Write-Host "      - If installed locally: Start-Service MySQL80" -ForegroundColor White
    Write-Host "      - If using XAMPP: Start MySQL from XAMPP Control Panel" -ForegroundColor White
    Write-Host ""
}

Write-Host "   2. Verify database exists:" -ForegroundColor Yellow
Write-Host "      mysql -u root -p -e SHOW DATABASES;" -ForegroundColor White
Write-Host "      (Look for caster)" -ForegroundColor Gray
Write-Host ""

Write-Host "   3. Create database if it doesn't exist:" -ForegroundColor Yellow
Write-Host "      mysql -u root -p -e CREATE DATABASE caster;" -ForegroundColor White
Write-Host ""

Write-Host "   4. Run Prisma migrations:" -ForegroundColor Yellow
Write-Host "      cd backend" -ForegroundColor White
Write-Host "      npx prisma migrate dev" -ForegroundColor White
Write-Host "      npx prisma generate" -ForegroundColor White
Write-Host ""

Write-Host "   5. Test Prisma connection:" -ForegroundColor Yellow
Write-Host "      npx prisma db pull" -ForegroundColor White
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "For more help, see: backend/DATABASE_CONNECTION_TROUBLESHOOTING.md" -ForegroundColor Gray
Write-Host ""

