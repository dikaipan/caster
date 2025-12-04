# 🔧 Fix Railway Build Error: "Error creating build plan with Railpack"

Panduan untuk mengatasi error "Error creating build plan with Railpack" saat deploy backend ke Railway.

---

## 🔍 Penyebab Error

Error ini terjadi karena Railway tidak bisa detect buildpack yang tepat untuk NestJS. Railway mencoba menggunakan Railpack (buildpack mereka) tapi gagal karena:
1. Railway tidak bisa detect project type dengan benar
2. Root directory tidak di-set dengan benar
3. Build configuration tidak jelas
4. Missing build files atau configuration

---

## ✅ Solusi 1: Gunakan Dockerfile (RECOMMENDED)

Railway support Dockerfile. Karena project sudah punya Dockerfile, gunakan itu.

### Step 1: Pastikan Root Directory Benar

1. Di Railway Dashboard, buka service backend
2. Go to **Settings** → **Root Directory**
3. Pastikan di-set ke: `backend`
4. Save

### Step 2: Enable Docker Build

1. Di Railway Dashboard, buka service backend
2. Go to **Settings** → **Build**
3. Pilih **"Dockerfile"** sebagai build method
4. Pastikan Dockerfile path: `Dockerfile` (atau `backend/Dockerfile` jika root di root project)
5. Save

### Step 3: Update Dockerfile untuk Production

Pastikan Dockerfile menggunakan production stage:

```dockerfile
# Production stage
FROM node:18-alpine AS production

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies untuk build)
RUN npm ci

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

# Remove devDependencies
RUN npm prune --production

EXPOSE 3000

# Start application
CMD ["npm", "run", "start:prod"]
```

### Step 4: Redeploy

1. Di Railway Dashboard, klik **"Redeploy"**
2. Uncheck **"Use existing Build Cache"**
3. Deploy

---

## ✅ Solusi 2: Gunakan Nixpacks dengan Konfigurasi

Jika tidak ingin menggunakan Dockerfile, gunakan Nixpacks dengan konfigurasi yang benar.

### Step 1: Buat File `nixpacks.toml`

File sudah dibuat di `backend/nixpacks.toml`. Pastikan file ini ada di root directory backend.

### Step 2: Pastikan Root Directory

1. Di Railway Dashboard, buka service backend
2. Go to **Settings** → **Root Directory**
3. Pastikan di-set ke: `backend`
4. Save

### Step 3: Set Build Command

1. Di Railway Dashboard, buka service backend
2. Go to **Settings** → **Build**
3. **Build Command**: `npm install && npm run build && npm run prisma:generate`
4. **Start Command**: `npm run start:prod`
5. Save

### Step 4: Redeploy

1. Redeploy service
2. Uncheck build cache
3. Deploy

---

## ✅ Solusi 3: Gunakan railway.json

File `railway.json` sudah dibuat di `backend/railway.json`. Pastikan:

1. Root Directory di-set ke `backend`
2. File `railway.json` ada di folder `backend/`
3. Redeploy

---

## ✅ Solusi 4: Manual Build Configuration

Jika semua solusi di atas tidak bekerja, setup manual:

### Step 1: Set Root Directory

1. Railway Dashboard → Service → Settings
2. **Root Directory**: `backend`
3. Save

### Step 2: Set Build Settings

1. Railway Dashboard → Service → Settings → Build
2. **Build Command**: 
   ```bash
   npm install && npm run prisma:generate && npm run build
   ```
3. **Start Command**: 
   ```bash
   npm run start:prod
   ```
4. Save

### Step 3: Set Environment Variables

Pastikan semua environment variables sudah di-set:
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `NODE_ENV=production`
- `PORT=3000`
- `CORS_ORIGIN`

### Step 4: Redeploy

1. Redeploy service
2. Uncheck build cache
3. Deploy

---

## ✅ Solusi 5: Gunakan Alternatif Platform (RECOMMENDED jika Railway terus error)

Jika Railway terus bermasalah, gunakan alternatif:

### A. Fly.io (Recommended)

```bash
# Install Fly CLI
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Login
fly auth login

# Setup
cd backend
fly launch

# Deploy
fly deploy
```

**Lihat**: [ALTERNATIF_DEPLOY_BACKEND.md](./ALTERNATIF_DEPLOY_BACKEND.md)

### B. Koyeb (Paling Mudah)

1. Sign up: https://www.koyeb.com
2. Create App → Connect GitHub
3. Root Directory: `backend`
4. Build Command: `npm install && npm run build`
5. Start Command: `npm run start:prod`
6. Deploy

### C. Render

1. Sign up: https://render.com
2. New Web Service → Connect GitHub
3. Root Directory: `backend`
4. Build Command: `npm install && npm run build`
5. Start Command: `npm run start:prod`
6. Deploy

---

## 🔍 Troubleshooting

### Error: "Cannot find package.json"

**Solusi**:
1. Pastikan Root Directory di-set ke `backend`
2. Pastikan `package.json` ada di folder `backend/`
3. Check di Railway Dashboard → Settings → Root Directory

### Error: "Build failed"

**Solusi**:
1. Cek build logs di Railway Dashboard
2. Pastikan semua dependencies terinstall
3. Pastikan Prisma generate berjalan sebelum build
4. Test build lokal: `cd backend && npm install && npm run build`

### Error: "Prisma not found"

**Solusi**:
1. Pastikan `prisma:generate` di-run sebelum build
2. Update build command: `npm install && npm run prisma:generate && npm run build`
3. Pastikan Prisma schema ada di `backend/prisma/`

### Error: "Port already in use"

**Solusi**:
1. Pastikan `PORT` environment variable di-set ke `3000`
2. Railway akan otomatis assign port, tapi pastikan app listen ke `process.env.PORT`

---

## 📝 Checklist

### Configuration
- [ ] Root Directory di-set ke `backend`
- [ ] `package.json` ada di folder `backend/`
- [ ] `Dockerfile` atau `nixpacks.toml` atau `railway.json` ada
- [ ] Build command di-set dengan benar
- [ ] Start command di-set dengan benar

### Environment Variables
- [ ] `DATABASE_URL` di-set
- [ ] `JWT_SECRET` di-set (random string)
- [ ] `JWT_REFRESH_SECRET` di-set (random string)
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `CORS_ORIGIN` di-set

### Build
- [ ] Build command include `npm install`
- [ ] Build command include `npm run prisma:generate`
- [ ] Build command include `npm run build`
- [ ] Start command: `npm run start:prod`

### Testing
- [ ] Build berhasil
- [ ] Backend accessible
- [ ] Health check endpoint working
- [ ] Database connection working

---

## 🎯 Quick Fix (Recommended)

**Gunakan Dockerfile** - Ini adalah cara paling reliable:

1. **Set Root Directory**: `backend`
2. **Enable Docker Build**: Settings → Build → Dockerfile
3. **Redeploy**: Uncheck build cache
4. **Done!**

Jika masih error, gunakan **Fly.io** atau **Koyeb** sebagai alternatif.

---

## 📚 Resources

- **Railway Docs**: https://docs.railway.app
- **Railway Docker**: https://docs.railway.app/deploy/dockerfiles
- **Nixpacks Docs**: https://nixpacks.com/docs
- **Fly.io Docs**: https://fly.io/docs
- **Koyeb Docs**: https://www.koyeb.com/docs

---

**Jika Railway terus bermasalah, gunakan alternatif platform seperti Fly.io atau Koyeb yang lebih reliable! 🚀**

