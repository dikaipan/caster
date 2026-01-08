# PowerShell Script untuk Migrasi ke MySQL
# Usage: .\migrate-to-mysql.ps1

Write-Host "🚀 Starting MySQL Migration Process..." -ForegroundColor Green

# Step 1: Backup PostgreSQL Schema
Write-Host "`n📦 Step 1: Backing up PostgreSQL schema..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item "prisma\schema.prisma" "prisma\schema.postgresql.backup_$timestamp" -ErrorAction SilentlyContinue
if ($?) {
    Write-Host "✅ Schema backed up to: schema.postgresql.backup_$timestamp" -ForegroundColor Green
} else {
    Write-Host "⚠️  Could not backup schema (file might not exist)" -ForegroundColor Yellow
}

# Step 2: Check if schema.mysql.prisma exists
Write-Host "`n🔍 Step 2: Checking for MySQL schema..." -ForegroundColor Yellow
if (Test-Path "prisma\schema.mysql.prisma") {
    Write-Host "✅ MySQL schema found!" -ForegroundColor Green
} else {
    Write-Host "❌ schema.mysql.prisma not found! Please create it first." -ForegroundColor Red
    exit 1
}

# Step 3: Check .env file
Write-Host "`n🔍 Step 3: Checking .env file..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "DATABASE_URL.*mysql") {
        Write-Host "✅ MySQL DATABASE_URL found in .env" -ForegroundColor Green
        if ($envContent -match "localhost.*3306") {
            Write-Host "   Detected XAMPP/localhost connection" -ForegroundColor Cyan
            Write-Host "   Make sure XAMPP MySQL is running!" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  DATABASE_URL doesn't seem to be MySQL. Please update .env file." -ForegroundColor Yellow
        Write-Host "   For XAMPP: DATABASE_URL='mysql://root:@localhost:3306/caster'" -ForegroundColor Gray
        Write-Host "   For Remote: DATABASE_URL='mysql://user:password@host:3306/database'" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  .env file not found. Please create it with DATABASE_URL." -ForegroundColor Yellow
    Write-Host "   For XAMPP: DATABASE_URL='mysql://root:@localhost:3306/caster'" -ForegroundColor Gray
}

# Step 4: Generate Prisma Client
Write-Host "`n🔧 Step 4: Generating Prisma Client for MySQL..." -ForegroundColor Yellow
Set-Location "prisma"
npx prisma generate --schema=schema.mysql.prisma
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Prisma Client generated successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to generate Prisma Client" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

# Step 5: Create Migration
Write-Host "`n📝 Step 5: Creating MySQL migration..." -ForegroundColor Yellow
Write-Host "   This will create all tables in MySQL database." -ForegroundColor Gray
$response = Read-Host "   Continue? (Y/N)"
if ($response -ne "Y" -and $response -ne "y") {
    Write-Host "❌ Migration cancelled by user" -ForegroundColor Yellow
    exit 0
}

npx prisma migrate dev --name init_mysql --schema=prisma/schema.mysql.prisma
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration created successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Migration failed. Please check the error above." -ForegroundColor Red
    exit 1
}

# Step 6: Check if seed exists
Write-Host "`n🌱 Step 6: Checking for seed script..." -ForegroundColor Yellow
if (Test-Path "prisma\seed.ts") {
    $response = Read-Host "   Seed script found. Run it now? (Y/N)"
    if ($response -eq "Y" -or $response -eq "y") {
        Write-Host "   Running seed script..." -ForegroundColor Gray
        npx ts-node prisma/seed.ts
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Seed completed successfully!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Seed completed with errors. Please check." -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "ℹ️  No seed script found. Skipping..." -ForegroundColor Gray
}

# Summary
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "✅ Migration Process Completed!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Test your backend: npm run start:dev" -ForegroundColor White
Write-Host "2. Test API endpoints to ensure everything works" -ForegroundColor White
Write-Host "3. If everything is OK, you can switch to MySQL permanently" -ForegroundColor White
Write-Host "`nTo rollback to PostgreSQL:" -ForegroundColor Yellow
Write-Host "1. Restore schema: cp prisma/schema.postgresql.backup_$timestamp prisma/schema.prisma" -ForegroundColor White
Write-Host "2. Update DATABASE_URL in .env to PostgreSQL" -ForegroundColor White
Write-Host "3. Run: npx prisma generate" -ForegroundColor White

