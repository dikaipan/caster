# 🔧 Fix Railway Error: "/prisma": not found

## Masalah

Error saat build di Railway:
```
ERROR: failed to build: failed to solve: failed to compute cache key: 
failed to calculate checksum of ref: "/prisma": not found
```

## Penyebab

Railway tidak bisa menemukan folder `prisma/` saat build karena:
1. Build context tidak include prisma folder
2. Urutan COPY di Dockerfile
3. Prisma folder mungkin tidak ter-commit ke git

## Solusi yang Diterapkan

### 1. Copy Prisma Folder Explicitly

Dockerfile sudah diperbaiki untuk copy prisma folder **sebelum** `COPY . .`:

```dockerfile
# Install dependencies
RUN npm ci

# Copy prisma folder explicitly first
COPY prisma ./prisma/

# Copy rest of source code
COPY . .
```

### 2. Verifikasi Prisma Folder Ter-commit

Pastikan prisma folder ter-commit ke git:

```bash
# Check if prisma files are in git
git ls-files backend/prisma/

# If not, add them
cd backend
git add prisma/
git commit -m "Ensure prisma folder is committed"
git push origin main
```

### 3. Pastikan Root Directory Benar

Di Railway Dashboard:
- Service Backend → Settings → Root Directory
- Pastikan: `backend`
- Save

## Langkah-langkah Fix

1. **Pastikan prisma ter-commit:**
   ```bash
   git add backend/prisma/
   git commit -m "Ensure prisma folder committed"
   git push origin main
   ```

2. **Redeploy di Railway:**
   - Railway Dashboard → Deployments
   - Klik "..." → Redeploy
   - **Uncheck "Use existing Build Cache"**
   - Deploy

3. **Verifikasi:**
   - Cek build logs
   - Pastikan tidak ada error "/prisma": not found

## Dockerfile yang Benar

```dockerfile
# Production stage
FROM node:18-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy prisma folder explicitly first
COPY prisma ./prisma/

# Copy rest of source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

# ... rest of Dockerfile
```

**Urutan penting:**
1. package*.json
2. npm ci
3. **prisma/** ← HARUS sebelum COPY . .
4. COPY . .
5. prisma generate

## Troubleshooting

### Masih Error?

1. **Check .gitignore:**
   ```bash
   git check-ignore -v backend/prisma/
   # Should return nothing
   ```

2. **Force Add Prisma:**
   ```bash
   cd backend
   git add -f prisma/
   git commit -m "Force add prisma folder"
   git push origin main
   ```

3. **Test Build Lokal:**
   ```bash
   cd backend
   docker build --target production -t test .
   # Should build successfully
   ```

4. **Check Railway Build Context:**
   - Pastikan Root Directory = `backend`
   - Pastikan Dockerfile path = `Dockerfile`

## Checklist

- [ ] Prisma folder ter-commit ke git
- [ ] Root Directory = `backend` di Railway
- [ ] Dockerfile copy prisma sebelum COPY . .
- [ ] Redeploy dengan uncheck build cache
- [ ] Build berhasil

---

**Dockerfile sudah diperbaiki! Redeploy di Railway dengan uncheck build cache. 🚀**

