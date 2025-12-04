# 🔧 Fix Railway Build Context: Prisma Folder Not Found

## Masalah

Railway build error:
```
ERROR: failed to build: failed to solve: failed to compute cache key: 
failed to calculate checksum of ref: "/prisma": not found
```

## Penyebab

Railway build context tidak include folder `prisma/` karena:
1. **Root Directory** tidak di-set dengan benar
2. Build context hanya include file tertentu
3. Prisma folder tidak ter-commit ke git (tapi sudah ter-commit ✅)

## Solusi

### 1. Pastikan Root Directory Benar

**PENTING**: Di Railway Dashboard:

1. Service Backend → **Settings** → **Root Directory**
2. Pastikan: `backend` (bukan kosong atau `/`)
3. **Save**

### 2. Verifikasi Prisma Ter-commit

```bash
# Check prisma files in git
git ls-files backend/prisma/

# Should show:
# backend/prisma/schema.prisma
# backend/prisma/seed.ts
# backend/prisma/schema.mysql.prisma
```

### 3. Dockerfile yang Benar

Dockerfile sekarang menggunakan `COPY . .` saja (tanpa copy prisma terpisah):

```dockerfile
# Install dependencies
RUN npm ci

# Copy all source code (including prisma folder)
COPY . .
```

**Mengapa ini bekerja:**
- `COPY . .` akan copy semua file dari build context
- Jika Root Directory = `backend`, build context adalah folder `backend/`
- Prisma folder ada di `backend/prisma/`, jadi akan ter-copy

### 4. Pastikan .dockerignore Tidak Ignore Prisma

Check `backend/.dockerignore` - pastikan tidak ada:
```
prisma/
```

## Langkah-langkah Fix

### Step 1: Verifikasi Root Directory

1. Railway Dashboard → Service Backend
2. Settings → Root Directory
3. Pastikan: `backend`
4. Save

### Step 2: Verifikasi Prisma Ter-commit

```bash
cd backend
git ls-files prisma/
# Should show prisma files
```

### Step 3: Redeploy

1. Railway Dashboard → Deployments
2. Klik "..." → Redeploy
3. **Uncheck "Use existing Build Cache"**
4. Deploy

## Troubleshooting

### Masih Error?

**1. Check Root Directory:**
- Pastikan Root Directory = `backend` (bukan kosong)
- Pastikan tidak ada trailing slash: `backend/` (salah) → `backend` (benar)

**2. Force Rebuild:**
- Railway Dashboard → Deployments
- Klik "..." → Redeploy
- **Uncheck "Use existing Build Cache"**
- Deploy

**3. Check Build Logs:**
- Railway Dashboard → Deployments → Latest
- View Logs
- Cari error detail

**4. Test Build Lokal:**
```bash
cd backend
docker build --target production -t test .
# Should build successfully
```

**5. Verify Prisma in Git:**
```bash
# Check if prisma folder is in git
git ls-tree -r HEAD --name-only | grep "backend/prisma"

# If empty, add prisma folder
git add backend/prisma/
git commit -m "Ensure prisma folder committed"
git push origin main
```

## Checklist

- [ ] Root Directory = `backend` di Railway
- [ ] Prisma folder ter-commit ke git
- [ ] .dockerignore tidak ignore prisma
- [ ] Dockerfile menggunakan `COPY . .`
- [ ] Redeploy dengan uncheck build cache

## Dockerfile Final

```dockerfile
# Production stage
FROM node:18-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all source code (including prisma folder)
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

# Remove devDependencies
RUN npm prune --production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

RUN chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["npm", "run", "start:prod"]
```

## Important Notes

1. **Root Directory HARUS `backend`** - Ini yang paling penting!
2. **Prisma folder harus ter-commit** - Sudah ter-commit ✅
3. **COPY . . akan include prisma** - Jika Root Directory benar
4. **Redeploy dengan uncheck cache** - Untuk fresh build

---

**PALING PENTING: Pastikan Root Directory = `backend` di Railway Settings! 🚀**

