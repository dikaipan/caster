# Memperbaiki Masalah Login Pengelola User

## Masalah yang Ditemukan

User pengelola dari database tidak dapat login. Ada beberapa kemungkinan penyebab:

1. **Status user bukan ACTIVE**
2. **Password tidak match**
3. **Username tidak ditemukan**
4. **Field `department` undefined** - Fixed

## Perbaikan yang Dilakukan

### 1. Fix `department` Field untuk PengelolaUser

PengelolaUser tidak memiliki field `department` (hanya HitachiUser yang punya), tapi `generateTokens` mencoba mengaksesnya. Sudah diperbaiki dengan menambahkan fallback:

```typescript
department: user.department || null, // PengelolaUser doesn't have department
```

## Cara Debugging

### 1. Cek User di Database

```sql
SELECT 
  id, 
  username, 
  email, 
  status, 
  password_hash,
  pengelola_id,
  role
FROM pengelola_users 
WHERE username = 'username_pengelola';
```

**Pastikan:**
- Status = `ACTIVE`
- Username benar (case-sensitive)
- Password hash ada (tidak NULL)

### 2. Test Login dengan API

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "username_pengelola",
    "password": "password_pengelola"
  }'
```

### 3. Cek Backend Log

Periksa backend console untuk melihat error message saat login attempt.

### 4. Reset Password (jika perlu)

Jika password tidak match, reset password melalui API atau database:

**Via API:**
- Gunakan endpoint update user pengelola (dengan super admin access)
- Atau buat user baru

**Via Database (manual):**
```sql
-- Generate hash dulu dari backend, lalu update
-- Untuk generate hash, jalankan di backend:
-- import * as bcrypt from 'bcrypt';
-- const hash = await bcrypt.hash('new_password', 10);
-- console.log(hash);

UPDATE pengelola_users 
SET password_hash = 'hash_baru_dari_bcrypt' 
WHERE username = 'username_pengelola';
```

## Checklist Troubleshooting

- [ ] User ada di database
- [ ] Status user = `ACTIVE`
- [ ] Username benar (case-sensitive)
- [ ] Password match dengan hash di database
- [ ] Password hash valid (bcrypt format)
- [ ] Backend running dan tidak ada error
- [ ] Frontend menggunakan endpoint yang benar
- [ ] Token ter-generate dengan benar (cek response login)

## File yang Diperbaiki

- `backend/src/auth/auth.service.ts`
  - Line 231: Fix `department` field di payload
  - Line 294: Fix `department` field di user response

## Catatan

1. **PengelolaUser Schema**: PengelolaUser tidak memiliki field `department`, hanya HitachiUser yang punya
2. **Password Hash**: Password harus di-hash menggunakan bcrypt dengan salt rounds 10
3. **Status**: User harus memiliki status `ACTIVE` untuk dapat login
4. **Username**: Username matching adalah case-sensitive

