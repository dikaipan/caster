# Quick MySQL Setup Script for Windows
# This script helps you get MySQL running quickly

Write-Host "🚀 Quick MySQL Setup for HCM Backend" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if MySQL is already running
$port3306 = netstat -ano | findstr :3306
if ($port3306) {
    Write-Host "✅ MySQL appears to be running on port 3306!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Create database: mysql -u root -p -e 'CREATE DATABASE IF NOT EXISTS caster;'" -ForegroundColor White
    Write-Host "2. Run migrations: cd backend && npx prisma migrate dev" -ForegroundColor White
    exit 0
}

Write-Host "❌ MySQL is not running on port 3306" -ForegroundColor Red
Write-Host ""

# Check installation methods
Write-Host "📋 Installation Options:" -ForegroundColor Yellow
Write-Host ""

# Option 1: Check if Chocolatey is available
$chocoAvailable = Get-Command choco -ErrorAction SilentlyContinue
if ($chocoAvailable) {
    Write-Host "Option 1: Install via Chocolatey (Recommended - Fastest)" -ForegroundColor Green
    Write-Host "   Run this command as Administrator:" -ForegroundColor White
    Write-Host "   choco install mysql -y" -ForegroundColor Cyan
    Write-Host ""
    $useChoco = Read-Host "   Install MySQL via Chocolatey now? (Requires Admin) (y/n)"
    if ($useChoco -eq 'y' -or $useChoco -eq 'Y') {
        Write-Host "   Installing MySQL via Chocolatey..." -ForegroundColor Yellow
        try {
            Start-Process powershell -Verb RunAs -ArgumentList "-Command", "choco install mysql -y; Read-Host 'Press Enter to continue'"
            Write-Host "   ✅ Installation started. Please wait for it to complete." -ForegroundColor Green
            Write-Host "   After installation, you may need to:" -ForegroundColor Yellow
            Write-Host "   1. Start MySQL service: Start-Service MySQL80" -ForegroundColor White
            Write-Host "   2. Set root password (if prompted)" -ForegroundColor White
        } catch {
            Write-Host "   ❌ Failed to start installation: $_" -ForegroundColor Red
        }
    }
} else {
    Write-Host "Option 1: Install via Chocolatey" -ForegroundColor Gray
    Write-Host "   First install Chocolatey: https://chocolatey.org/install" -ForegroundColor White
    Write-Host "   Then run: choco install mysql -y" -ForegroundColor White
    Write-Host ""
}

# Option 2: MySQL Installer
Write-Host "Option 2: Download MySQL Installer (Official)" -ForegroundColor Green
Write-Host "   1. Download from: https://dev.mysql.com/downloads/installer/" -ForegroundColor White
Write-Host "   2. Choose 'MySQL Installer for Windows'" -ForegroundColor White
Write-Host "   3. Select 'Developer Default' or 'Server only'" -ForegroundColor White
Write-Host "   4. During setup, set root password (or leave blank)" -ForegroundColor White
Write-Host "   5. Port: 3306 (default)" -ForegroundColor White
Write-Host ""

# Option 3: XAMPP
Write-Host "Option 3: Use XAMPP (Includes MySQL + phpMyAdmin)" -ForegroundColor Green
Write-Host "   1. Download from: https://www.apachefriends.org/download.html" -ForegroundColor White
Write-Host "   2. Install XAMPP" -ForegroundColor White
Write-Host "   3. Start MySQL from XAMPP Control Panel" -ForegroundColor White
Write-Host "   4. Default port: 3306" -ForegroundColor White
Write-Host ""

# Option 4: Docker
Write-Host "Option 4: Use Docker (If Docker Desktop is installed)" -ForegroundColor Green
Write-Host "   Run: docker compose up -d mysql" -ForegroundColor White
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# After installation steps
Write-Host "📝 After MySQL is installed and running:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Create the database:" -ForegroundColor Cyan
Write-Host "   mysql -u root -p" -ForegroundColor White
Write-Host "   CREATE DATABASE caster CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" -ForegroundColor White
Write-Host "   EXIT;" -ForegroundColor White
Write-Host ""

Write-Host "2. Or create database directly:" -ForegroundColor Cyan
Write-Host "   mysql -u root -p -e 'CREATE DATABASE IF NOT EXISTS caster CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'" -ForegroundColor White
Write-Host ""

Write-Host "3. Run Prisma migrations:" -ForegroundColor Cyan
Write-Host "   cd backend" -ForegroundColor White
Write-Host "   npx prisma migrate dev" -ForegroundColor White
Write-Host "   npx prisma generate" -ForegroundColor White
Write-Host ""

Write-Host "4. Verify connection:" -ForegroundColor Cyan
Write-Host "   npx prisma db pull" -ForegroundColor White
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Check .env file
Write-Host "🔧 Current .env Configuration:" -ForegroundColor Yellow
$envPath = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envPath) {
    $envLines = Get-Content $envPath
    $dbUrlLine = $envLines | Where-Object { $_ -match 'DATABASE_URL' }
    if ($dbUrlLine) {
        Write-Host "   $dbUrlLine" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   ✅ .env file is configured" -ForegroundColor Green
        Write-Host "   Make sure the credentials match your MySQL setup:" -ForegroundColor Yellow
        Write-Host "   - User: root (or your MySQL username)" -ForegroundColor White
        Write-Host "   - Password: (empty or your MySQL password)" -ForegroundColor White
        Write-Host "   - Database: caster" -ForegroundColor White
    }
} else {
    Write-Host "   ⚠️  .env file not found" -ForegroundColor Yellow
    Write-Host "   Copy env.template to .env and configure DATABASE_URL" -ForegroundColor White
}

Write-Host ""
Write-Host "💡 Tip: If you have MySQL installed but it's not running," -ForegroundColor Cyan
Write-Host "   try: Start-Service MySQL80" -ForegroundColor White
Write-Host "   or check Services app for MySQL service" -ForegroundColor White
Write-Host ""

