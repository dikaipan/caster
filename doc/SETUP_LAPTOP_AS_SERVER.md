# 💻 Panduan Setup Laptop sebagai Server

Panduan lengkap untuk menjadikan laptop Anda sebagai server untuk menjalankan aplikasi HCM (Backend + Database + Frontend).

---

## 📋 Ringkasan Setup

```
Internet → Laptop Server → Backend (NestJS) + Database (MySQL) + Frontend (Next.js)
```

**Alur:**
1. Setup laptop (install dependencies)
2. Setup database (MySQL/PostgreSQL)
3. Setup backend dan frontend
4. Expose ke internet (ngrok/Cloudflare Tunnel/Port Forwarding)
5. Setup domain (opsional)
6. Auto-start on boot
7. Security configuration

---

## ✅ Prerequisites

### Hardware Requirements:
- **RAM**: Minimum 4GB (recommended 8GB+)
- **Storage**: Minimum 10GB free space
- **Internet**: Stable connection dengan upload speed minimal 1 Mbps
- **OS**: Windows 10/11, macOS, atau Linux

### Software Requirements:
- Node.js 18+ (LTS)
- MySQL 8.0+ atau PostgreSQL 15+
- Git
- PM2 (untuk process management)
- Nginx (opsional, untuk reverse proxy)

---

## 🚀 Step 1: Install Dependencies

### A. Install Node.js

**Windows:**
1. Download dari: https://nodejs.org (pilih LTS version)
2. Install dengan default settings
3. Verify:
   ```powershell
   node --version
   npm --version
   ```

**macOS:**
```bash
# Menggunakan Homebrew
brew install node@18

# Atau download dari nodejs.org
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### B. Install MySQL

**Windows:**
1. Download MySQL Installer: https://dev.mysql.com/downloads/installer/
2. Pilih "MySQL Server" dan "MySQL Workbench"
3. Setup root password (simpan dengan aman!)
4. Verify:
   ```powershell
   mysql --version
   ```

**macOS:**
```bash
brew install mysql
brew services start mysql
```

**Linux:**
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

### C. Install Git

**Windows:**
- Download dari: https://git-scm.com/download/win

**macOS:**
```bash
brew install git
```

**Linux:**
```bash
sudo apt install git
```

### D. Install PM2 (Process Manager)

```bash
npm install -g pm2
```

---

## 🗄️ Step 2: Setup Database

### A. Create Database

```bash
# Login ke MySQL
mysql -u root -p

# Create database
CREATE DATABASE hcm_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user (optional, lebih secure)
CREATE USER 'hcm_user'@'localhost' IDENTIFIED BY 'your-secure-password';
GRANT ALL PRIVILEGES ON hcm_production.* TO 'hcm_user'@'localhost';
FLUSH PRIVILEGES;

# Exit
EXIT;
```

### B. Update Backend Configuration

Edit `backend/.env`:

```env
# Database
DATABASE_URL="mysql://hcm_user:your-secure-password@localhost:3306/hcm_production"

# JWT
JWT_SECRET="<generate-random-32-char-string>"
JWT_REFRESH_SECRET="<generate-random-32-char-string>"
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Server
NODE_ENV=production
PORT=3000

# CORS (akan diupdate setelah setup domain)
CORS_ORIGIN=http://localhost:3001
```

**Generate JWT Secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### C. Run Prisma Migrations

```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database (opsional)
npm run prisma:seed
```

---

## 🔧 Step 3: Setup Backend

### A. Install Dependencies

```bash
cd backend
npm install
```

### B. Build Backend

```bash
npm run build
```

### C. Test Backend Locally

```bash
# Test run
npm run start:prod

# Di terminal lain, test:
curl http://localhost:3000/api/health
# Should return: {"status":"ok"}

# Stop dengan Ctrl+C
```

### D. Setup PM2 untuk Backend

```bash
# Start dengan PM2
pm2 start npm --name "hcm-backend" -- run start:prod

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow instructions yang muncul

# Check status
pm2 status

# View logs
pm2 logs hcm-backend
```

---

## 🎨 Step 4: Setup Frontend

### A. Install Dependencies

```bash
cd frontend
npm install
```

### B. Update Environment Variables

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### C. Build Frontend

```bash
npm run build
```

### D. Test Frontend Locally

```bash
# Test run
npm start

# Buka browser: http://localhost:3000
# Test apakah bisa connect ke backend

# Stop dengan Ctrl+C
```

### E. Setup PM2 untuk Frontend

```bash
# Start dengan PM2
pm2 start npm --name "hcm-frontend" -- run start

# Save PM2 configuration
pm2 save

# Check status
pm2 status

# View logs
pm2 logs hcm-frontend
```

---

## 🌐 Step 5: Expose ke Internet

Ada beberapa cara untuk expose laptop ke internet:

### Opsi 1: ngrok (Paling Mudah - Recommended untuk Testing)

#### Setup ngrok:

1. **Sign up**: https://ngrok.com (gratis)
2. **Download**: https://ngrok.com/download
3. **Install & Authenticate**:
   ```bash
   # Extract ngrok
   # Windows: Extract ke folder, lalu:
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   
   # macOS/Linux:
   chmod +x ngrok
   ./ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

#### Expose Backend:

```bash
# Expose backend (port 3000)
ngrok http 3000

# Akan dapat URL seperti: https://abc123.ngrok.io
# Copy URL ini (misal: https://abc123.ngrok.io)
```

#### Expose Frontend:

```bash
# Di terminal baru, expose frontend (port 3000)
# Tapi frontend Next.js biasanya di port 3000, jadi perlu ubah port

# Edit frontend/package.json, ubah start script:
# "start": "next start -p 3001"

# Atau expose dengan port berbeda
ngrok http 3001
```

#### Update Configuration:

1. **Backend CORS**: Update `backend/.env`:
   ```
   CORS_ORIGIN=https://abc123.ngrok.io
   ```
   Restart backend: `pm2 restart hcm-backend`

2. **Frontend API URL**: Update `frontend/.env.local`:
   ```
   NEXT_PUBLIC_API_URL=https://abc123.ngrok.io
   ```
   Rebuild frontend: `cd frontend && npm run build && pm2 restart hcm-frontend`

**⚠️ Catatan ngrok:**
- Free tier: URL berubah setiap restart
- Free tier: Limited requests
- Untuk production, gunakan paid plan atau alternatif lain

---

### Opsi 2: Cloudflare Tunnel (Gratis, URL Stabil)

#### Setup Cloudflare Tunnel:

1. **Sign up**: https://cloudflare.com (gratis)
2. **Install cloudflared**:
   ```bash
   # Windows: Download dari https://github.com/cloudflare/cloudflared/releases
   # macOS:
   brew install cloudflared
   # Linux:
   wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
   chmod +x cloudflared-linux-amd64
   sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
   ```

3. **Login**:
   ```bash
   cloudflared tunnel login
   ```

4. **Create Tunnel**:
   ```bash
   cloudflared tunnel create hcm-server
   ```

5. **Create Config File** (`~/.cloudflared/config.yml`):
   ```yaml
   tunnel: <tunnel-id>
   credentials-file: ~/.cloudflared/<tunnel-id>.json

   ingress:
     - hostname: backend.yourdomain.com
       service: http://localhost:3000
     - hostname: yourdomain.com
       service: http://localhost:3001
     - service: http_status:404
   ```

6. **Run Tunnel**:
   ```bash
   cloudflared tunnel run hcm-server
   ```

7. **Setup PM2 untuk Tunnel**:
   ```bash
   pm2 start cloudflared --name "cloudflare-tunnel" -- tunnel run hcm-server
   pm2 save
   ```

**Keuntungan Cloudflare Tunnel:**
- ✅ Gratis
- ✅ URL stabil (dengan custom domain)
- ✅ SSL otomatis
- ✅ DDoS protection

---

### Opsi 3: Port Forwarding (Router Configuration)

#### Setup Port Forwarding:

1. **Cari IP Address Laptop**:
   ```bash
   # Windows:
   ipconfig
   # Cari IPv4 Address (misal: 192.168.1.100)
   
   # macOS/Linux:
   ifconfig
   # Cari inet (misal: 192.168.1.100)
   ```

2. **Login ke Router**:
   - Buka browser: `http://192.168.1.1` (atau IP router Anda)
   - Login dengan admin credentials
   - Cari "Port Forwarding" atau "Virtual Server"

3. **Forward Ports**:
   - **Port 3000** (Backend) → `192.168.1.100:3000`
   - **Port 3001** (Frontend) → `192.168.1.100:3001`
   - Protocol: TCP

4. **Cari Public IP**:
   ```bash
   # Buka browser: https://whatismyipaddress.com
   # Atau:
   curl ifconfig.me
   ```

5. **Update Configuration**:
   - Backend CORS: `http://YOUR_PUBLIC_IP:3000`
   - Frontend API URL: `http://YOUR_PUBLIC_IP:3000`

**⚠️ Catatan Port Forwarding:**
- ❌ Tidak aman (expose langsung ke internet)
- ❌ IP berubah jika restart router (kecuali static IP)
- ❌ Tidak ada SSL (kecuali setup sendiri)
- ✅ Gratis
- ✅ Full control

**Security Tips:**
- Setup firewall di laptop
- Gunakan strong passwords
- Consider VPN untuk akses

---

### Opsi 4: Custom Domain dengan Dynamic DNS

#### Setup Dynamic DNS:

1. **Sign up Dynamic DNS**:
   - No-IP: https://www.noip.com (gratis)
   - DuckDNS: https://www.duckdns.org (gratis)
   - Dynu: https://www.dynu.com (gratis)

2. **Setup Dynamic DNS Client**:
   ```bash
   # Install No-IP client atau gunakan router built-in
   # Update IP otomatis ke domain
   ```

3. **Point Domain ke Laptop**:
   - Domain: `hcm.yourdomain.com` → `YOUR_PUBLIC_IP`

4. **Setup SSL dengan Let's Encrypt**:
   ```bash
   # Install certbot
   # Windows: Download dari https://certbot.eff.org
   # macOS: brew install certbot
   # Linux: sudo apt install certbot
   
   # Generate certificate
   certbot certonly --standalone -d hcm.yourdomain.com
   ```

---

## 🔒 Step 6: Security Configuration

### A. Setup Firewall

**Windows:**
```powershell
# Allow ports
New-NetFirewallRule -DisplayName "HCM Backend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "HCM Frontend" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

**macOS/Linux:**
```bash
# Ubuntu/Debian
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

### B. Secure MySQL

```sql
-- Login ke MySQL
mysql -u root -p

-- Remove anonymous users
DELETE FROM mysql.user WHERE User='';

-- Disable remote root login
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');

-- Reload privileges
FLUSH PRIVILEGES;
```

### C. Use Strong Passwords

- Database password: Minimum 16 karakter, mix of letters, numbers, symbols
- JWT secrets: Random 32+ character strings
- System passwords: Strong and unique

### D. Regular Updates

```bash
# Update system (Linux)
sudo apt update && sudo apt upgrade

# Update Node.js
npm install -g npm@latest

# Update dependencies
cd backend && npm update
cd ../frontend && npm update
```

---

## ⚙️ Step 7: Auto-Start on Boot

### A. PM2 Auto-Start (Sudah Setup di Step 3)

```bash
# Verify PM2 startup
pm2 startup

# Save current processes
pm2 save
```

### B. MySQL Auto-Start

**Windows:**
- MySQL service otomatis start on boot (default)

**macOS:**
```bash
brew services start mysql
```

**Linux:**
```bash
sudo systemctl enable mysql
```

### C. Cloudflare Tunnel Auto-Start (Jika digunakan)

Sudah di-setup dengan PM2 di Step 5.

---

## 📊 Step 8: Monitoring & Maintenance

### A. PM2 Monitoring

```bash
# View status
pm2 status

# View logs
pm2 logs

# Monitor resources
pm2 monit

# Restart services
pm2 restart all

# Stop services
pm2 stop all
```

### B. System Monitoring

**Windows:**
- Task Manager → Performance tab

**macOS/Linux:**
```bash
# CPU & Memory
top
# atau
htop

# Disk usage
df -h

# Network
netstat -tulpn
```

### C. Backup Database

```bash
# Create backup script: backup-db.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u hcm_user -p hcm_production > backup_$DATE.sql

# Make executable
chmod +x backup-db.sh

# Schedule dengan cron (Linux/macOS)
# Edit crontab: crontab -e
# Add: 0 2 * * * /path/to/backup-db.sh
```

**Windows (Task Scheduler):**
1. Open Task Scheduler
2. Create Basic Task
3. Schedule: Daily at 2 AM
4. Action: Start program
5. Program: `mysqldump`
6. Arguments: `-u hcm_user -p hcm_production > backup_%DATE%.sql`

---

## 🐛 Troubleshooting

### Backend tidak start

```bash
# Check logs
pm2 logs hcm-backend

# Check port
netstat -an | grep 3000

# Restart
pm2 restart hcm-backend
```

### Database connection error

```bash
# Test connection
mysql -u hcm_user -p hcm_production

# Check MySQL status
# Windows: Services → MySQL
# macOS: brew services list
# Linux: sudo systemctl status mysql
```

### Frontend tidak bisa connect ke backend

1. Check `NEXT_PUBLIC_API_URL` di `.env.local`
2. Check CORS configuration di backend
3. Check firewall rules
4. Test backend langsung: `curl http://localhost:3000/api/health`

### Port already in use

```bash
# Find process using port
# Windows:
netstat -ano | findstr :3000

# macOS/Linux:
lsof -i :3000

# Kill process
# Windows:
taskkill /PID <PID> /F

# macOS/Linux:
kill -9 <PID>
```

### Laptop restart, services tidak start

```bash
# Re-run PM2 startup
pm2 startup
pm2 save

# Check MySQL auto-start
# Windows: Services → MySQL → Properties → Startup type: Automatic
# Linux: sudo systemctl enable mysql
```

---

## 📝 Checklist Setup

### Dependencies
- [ ] Node.js 18+ installed
- [ ] MySQL installed
- [ ] Git installed
- [ ] PM2 installed

### Database
- [ ] Database created
- [ ] User created (optional)
- [ ] Prisma migrations run
- [ ] Database seeded (optional)

### Backend
- [ ] Dependencies installed
- [ ] Environment variables set
- [ ] Backend built
- [ ] Backend running with PM2
- [ ] PM2 auto-start configured

### Frontend
- [ ] Dependencies installed
- [ ] Environment variables set
- [ ] Frontend built
- [ ] Frontend running with PM2
- [ ] PM2 auto-start configured

### Internet Access
- [ ] ngrok/Cloudflare Tunnel/Port Forwarding setup
- [ ] Backend accessible dari internet
- [ ] Frontend accessible dari internet
- [ ] CORS configured
- [ ] SSL setup (jika menggunakan domain)

### Security
- [ ] Firewall configured
- [ ] MySQL secured
- [ ] Strong passwords set
- [ ] Regular backup scheduled

### Monitoring
- [ ] PM2 monitoring setup
- [ ] Logs accessible
- [ ] Backup script created

---

## 🎯 Quick Start Commands

```bash
# Start all services
pm2 start all

# Stop all services
pm2 stop all

# Restart all services
pm2 restart all

# View status
pm2 status

# View logs
pm2 logs

# Monitor
pm2 monit

# Backup database
mysqldump -u hcm_user -p hcm_production > backup_$(date +%Y%m%d).sql
```

---

## 💡 Tips & Best Practices

1. **Keep Laptop On**: Laptop harus selalu on untuk server accessible
2. **Stable Internet**: Pastikan internet stabil dan tidak sering disconnect
3. **Power Management**: Disable sleep/hibernate mode
4. **Regular Backups**: Setup automatic database backup
5. **Monitor Resources**: Cek CPU, RAM, dan disk usage secara berkala
6. **Update Regularly**: Update system, Node.js, dan dependencies
7. **Security**: Gunakan strong passwords dan firewall
8. **Documentation**: Catat semua configuration untuk reference

---

## 🚨 Important Notes

### Limitations:
- ⚠️ **Laptop harus selalu on** - Jika laptop mati, server tidak accessible
- ⚠️ **Internet dependency** - Jika internet mati, server tidak accessible
- ⚠️ **Power consumption** - Laptop akan consume power 24/7
- ⚠️ **Security risk** - Expose laptop ke internet ada security risk
- ⚠️ **Performance** - Laptop bukan dedicated server, performance terbatas

### When to Use:
- ✅ Development/Testing
- ✅ Small production (< 10 users)
- ✅ Internal company use
- ✅ Temporary deployment

### When NOT to Use:
- ❌ High traffic production
- ❌ Critical business applications
- ❌ 24/7 availability required
- ❌ Multiple users simultaneously

---

## 📚 Resources

- **PM2 Docs**: https://pm2.keymetrics.io/docs
- **ngrok Docs**: https://ngrok.com/docs
- **Cloudflare Tunnel Docs**: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps
- **MySQL Docs**: https://dev.mysql.com/doc
- **Node.js Docs**: https://nodejs.org/docs

---

**Selamat setup! 🚀**

Laptop Anda sekarang berfungsi sebagai server untuk aplikasi HCM. Pastikan untuk:
- Keep laptop on 24/7
- Monitor resources regularly
- Setup automatic backups
- Keep security in mind

Jika ada masalah, cek logs dengan `pm2 logs` dan pastikan semua services running dengan `pm2 status`.

