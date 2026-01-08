# Database Connection Troubleshooting Guide

## Error: Can't reach database server at `localhost:3306`

This error occurs when Prisma cannot connect to your MySQL database server.

## Quick Solutions

### Option 1: Start MySQL using Docker (Recommended)

If you have Docker installed:

```bash
# From project root
docker compose up -d mysql

# Wait a few seconds for MySQL to start, then verify
docker compose ps
```

### Option 2: Install and Start MySQL Locally

#### Windows (using MySQL Installer)
1. Download MySQL Installer from https://dev.mysql.com/downloads/installer/
2. Install MySQL Server 8.0+
3. Start MySQL service:
   ```powershell
   # Check if MySQL service exists
   Get-Service -Name "*mysql*"
   
   # Start MySQL service
   Start-Service MySQL80
   ```

#### Windows (using Chocolatey)
```powershell
choco install mysql
net start mysql
```

### Option 3: Use XAMPP/WAMP
If you have XAMPP or WAMP installed:
1. Start MySQL service from the control panel
2. Verify it's running on port 3306

### Option 4: Check Your DATABASE_URL

Your `.env` file should have a valid MySQL connection string:

```env
# For MySQL with root user (no password)
DATABASE_URL="mysql://root@localhost:3306/caster"

# For MySQL with password
DATABASE_URL="mysql://root:yourpassword@localhost:3306/caster"

# For MySQL with custom user (from docker-compose)
DATABASE_URL="mysql://hcm_user:hcm_password@localhost:3306/caster"
```

**Important**: Make sure:
- The database `caster` exists
- The user has proper permissions
- MySQL is listening on port 3306

### Option 5: Create Database Manually

If MySQL is running but the database doesn't exist:

```bash
# Connect to MySQL
mysql -u root -p

# Create database
CREATE DATABASE caster CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user (if using docker-compose credentials)
CREATE USER 'hcm_user'@'localhost' IDENTIFIED BY 'hcm_password';
GRANT ALL PRIVILEGES ON caster.* TO 'hcm_user'@'localhost';
FLUSH PRIVILEGES;

# Exit
EXIT;
```

Then run Prisma migrations:
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

## Verify Connection

Test your database connection:

```bash
# Test MySQL connection
mysql -u root -p -h localhost -P 3306

# Or test with Prisma
cd backend
npx prisma db pull
```

## Common Issues

### Port 3306 Already in Use
If another application is using port 3306:
1. Find the process: `netstat -ano | findstr :3306`
2. Stop the conflicting service or change MySQL port in `my.ini`

### Firewall Blocking Connection
Windows Firewall might be blocking MySQL. Add an exception for port 3306.

### MySQL Not Starting
Check MySQL error logs:
- Windows: `C:\ProgramData\MySQL\MySQL Server 8.0\Data\*.err`
- Or check Event Viewer for MySQL service errors

## Alternative: Switch to PostgreSQL

If you prefer PostgreSQL:

1. Update `backend/prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Update `backend/.env`:
   ```env
   DATABASE_URL="postgresql://hcm_user:hcm_password@localhost:5432/hcm_development?schema=public"
   ```

3. Start PostgreSQL (if using Docker):
   ```bash
   docker compose up -d postgres
   ```

4. Regenerate Prisma client:
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate dev
   ```

## Still Having Issues?

1. Check MySQL service status: `Get-Service -Name "*mysql*"`
2. Verify port 3306 is listening: `netstat -ano | findstr :3306`
3. Check MySQL error logs
4. Ensure DATABASE_URL in `.env` matches your MySQL configuration
5. Try connecting with MySQL client to verify credentials

