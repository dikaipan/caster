# PowerShell script to manually apply RETURN_SHIPPED removal migration
# Use this if Prisma migrate fails

Write-Host "Manual Migration: Remove RETURN_SHIPPED Status" -ForegroundColor Cyan
Write-Host ""

# Detect MySQL installation
$mysqlPath = $null
if (Test-Path "C:\xampp\mysql\bin\mysql.exe") {
    $mysqlPath = "C:\xampp\mysql\bin"
} elseif (Test-Path "C:\Program Files\MySQL") {
    $mysqlDirs = Get-ChildItem "C:\Program Files\MySQL\MySQL Server*" -Directory
    if ($mysqlDirs.Count -gt 0) {
        $mysqlPath = "$($mysqlDirs[0].FullName)\bin"
    }
}

if (-not $mysqlPath) {
    Write-Host "MySQL not found!" -ForegroundColor Red
    exit 1
}

$mysqlExe = Join-Path $mysqlPath "mysql.exe"

Write-Host "MySQL Path: $mysqlExe" -ForegroundColor White
Write-Host ""

# Get password
$rootPassword = Read-Host "Enter MySQL root password (press Enter if no password)" -AsSecureString
$passwordArg = ""
if ($rootPassword.Length -gt 0) {
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($rootPassword)
    $plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    $passwordArg = "-p$plainPassword"
}

# Test connection
Write-Host "Testing connection..." -ForegroundColor Yellow
try {
    if ($passwordArg) {
        $result = & $mysqlExe -u root $passwordArg -e "SELECT 1;" 2>&1
    } else {
        $result = & $mysqlExe -u root -e "SELECT 1;" 2>&1
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Connection failed: $result" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please ensure MySQL is running and accessible." -ForegroundColor Yellow
        exit 1
    }
    Write-Host "Connection successful!" -ForegroundColor Green
} catch {
    Write-Host "Connection failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Applying migration..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Update all RETURN_SHIPPED tickets to CLOSED
Write-Host "Step 1: Updating RETURN_SHIPPED tickets to CLOSED..." -ForegroundColor Yellow
$updateSQL = @"
UPDATE problem_tickets 
SET status = 'CLOSED',
    updated_at = NOW()
WHERE status = 'RETURN_SHIPPED';
"@

try {
    if ($passwordArg) {
        $updateResult = $updateSQL | & $mysqlExe -u root $passwordArg caster 2>&1
    } else {
        $updateResult = $updateSQL | & $mysqlExe -u root caster 2>&1
    }
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Tickets updated successfully" -ForegroundColor Green
    } else {
        Write-Host "   Update result: $updateResult" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   Update failed: $_" -ForegroundColor Red
}

# Step 2: Check if any RETURN_SHIPPED tickets remain
Write-Host ""
Write-Host "Step 2: Checking for remaining RETURN_SHIPPED tickets..." -ForegroundColor Yellow
$checkSQL = "SELECT COUNT(*) as count FROM problem_tickets WHERE status = 'RETURN_SHIPPED';"
try {
    if ($passwordArg) {
        $checkResult = & $mysqlExe -u root $passwordArg caster -e $checkSQL 2>&1
    } else {
        $checkResult = & $mysqlExe -u root caster -e $checkSQL 2>&1
    }
    Write-Host "   $checkResult" -ForegroundColor White
} catch {
    Write-Host "   Check failed: $_" -ForegroundColor Yellow
}

# Step 3: Modify enum (requires ALTER TABLE)
Write-Host ""
Write-Host "Step 3: Removing RETURN_SHIPPED from enum..." -ForegroundColor Yellow
$alterSQL = @"
ALTER TABLE problem_tickets 
MODIFY COLUMN status ENUM('OPEN', 'IN_DELIVERY', 'RECEIVED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN';
"@

try {
    if ($passwordArg) {
        $alterResult = $alterSQL | & $mysqlExe -u root $passwordArg caster 2>&1
    } else {
        $alterResult = $alterSQL | & $mysqlExe -u root caster 2>&1
    }
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Enum updated successfully" -ForegroundColor Green
    } else {
        Write-Host "   Alter result: $alterResult" -ForegroundColor Yellow
        if ($alterResult -match "Duplicate|already exists") {
            Write-Host "   (Enum may already be updated)" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "   Alter failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Migration completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Generate Prisma client: npx prisma generate" -ForegroundColor White
Write-Host "   2. Restart backend server" -ForegroundColor White
Write-Host "   3. Test the application" -ForegroundColor White
Write-Host ""

