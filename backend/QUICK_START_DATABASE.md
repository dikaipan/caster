# Quick Start: Database Setup

## 🚨 Current Issue
Your application can't connect to MySQL because the database server is not running.

## ⚡ Quick Fix (Choose One)

### Option 1: Install MySQL via Chocolatey (Fastest - ~5 minutes)

**Prerequisites**: Chocolatey must be installed (https://chocolatey.org/install)

```powershell
# Run PowerShell as Administrator
choco install mysql -y

# After installation, start MySQL service
Start-Service MySQL80

# Create database
mysql -u root -p -e "CREATE DATABASE caster CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Run migrations
cd backend
npx prisma migrate dev
npx prisma generate
```

### Option 2: MySQL Installer (Official - ~10 minutes)

1. **Download**: https://dev.mysql.com/downloads/installer/
   - Choose "MySQL Installer for Windows"
   - Select "mysql-installer-community-*.msi"

2. **Install**:
   - Choose "Developer Default" or "Server only"
   - Set root password (or leave blank - matches your `.env`)
   - Port: 3306 (default)
   - Complete installation

3. **Start MySQL**:
   ```powershell
   Start-Service MySQL80
   ```

4. **Create database**:
   ```powershell
   mysql -u root -p
   CREATE DATABASE caster CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   EXIT;
   ```

5. **Run migrations**:
   ```powershell
   cd backend
   npx prisma migrate dev
   npx prisma generate
   ```

### Option 3: XAMPP (Easiest - ~5 minutes)

1. **Download**: https://www.apachefriends.org/download.html
2. **Install** XAMPP (includes MySQL)
3. **Start MySQL** from XAMPP Control Panel
4. **Create database**:
   ```powershell
   # XAMPP MySQL is usually at C:\xampp\mysql\bin\mysql.exe
   C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE caster CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   ```
5. **Run migrations**:
   ```powershell
   cd backend
   npx prisma migrate dev
   npx prisma generate
   ```

### Option 4: Docker (If Docker Desktop is installed)

```powershell
# From project root
docker compose up -d mysql

# Wait 10 seconds for MySQL to start, then:
cd backend
npx prisma migrate dev
npx prisma generate
```

## ✅ Verify Installation

After MySQL is running, test the connection:

```powershell
# Test MySQL connection
mysql -u root -p

# Or test with Prisma
cd backend
npx prisma db pull
```

If Prisma connects successfully, you should see no errors.

## 🔧 Troubleshooting

### MySQL Service Won't Start

```powershell
# Check service status
Get-Service MySQL80

# Start service
Start-Service MySQL80

# If permission error, run PowerShell as Administrator
```

### Port 3306 Already in Use

```powershell
# Find what's using port 3306
netstat -ano | findstr :3306

# Stop the conflicting service or change MySQL port
```

### Can't Connect After Installation

1. **Check MySQL is running**:
   ```powershell
   netstat -ano | findstr :3306
   ```

2. **Verify credentials in `.env`**:
   ```env
   DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/caster"
   ```
   (Remove password part if root has no password: `mysql://root@localhost:3306/caster`)

3. **Test connection manually**:
   ```powershell
   mysql -u root -p
   ```

### Database Doesn't Exist

```powershell
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS caster CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

## 📝 Your Current Configuration

Your `.env` file has:
```env
DATABASE_URL="mysql://root:@localhost:3306/caster"
```

This means:
- **User**: `root`
- **Password**: (empty/none)
- **Host**: `localhost`
- **Port**: `3306`
- **Database**: `caster`

Make sure your MySQL installation matches these settings.

## 🎯 Next Steps

1. ✅ Install MySQL (choose one option above)
2. ✅ Start MySQL service
3. ✅ Create `caster` database
4. ✅ Run `npx prisma migrate dev`
5. ✅ Run `npx prisma generate`
6. ✅ Start your backend: `npm run start:dev`

## 🆘 Still Having Issues?

Run the diagnostic script:
```powershell
cd backend
powershell -ExecutionPolicy Bypass -File scripts/check-database-connection.ps1
```

Or see the full troubleshooting guide:
- `backend/DATABASE_CONNECTION_TROUBLESHOOTING.md`

