# Troubleshooting: Pengelola User Tidak Dapat Login

## Masalah
User pengelola dari database tidak dapat melakukan login.

## Penyebab Potensial

### 1. Status User Bukan ACTIVE
User pengelola harus memiliki status `ACTIVE` untuk dapat login. Jika status adalah `INACTIVE` atau `SUSPENDED`, login akan gagal.

**Cek di database:**
```sql
SELECT id, username, status FROM pengelola_users WHERE username = 'username_pengelola';
```

**Solusi:**
```sql
UPDATE pengelola_users SET status = 'ACTIVE' WHERE username = 'username_pengelola';
```

### 2. Password Tidak Match
Password yang diinput tidak cocok dengan password hash di database.

**Cek password hash di database:**
```sql
SELECT id, username, password_hash FROM pengelola_users WHERE username = 'username_pengelola';
```

**Solusi:**
- Reset password user melalui API atau langsung update di database (perlu hash password baru)
- Atau buat user baru dengan password yang benar

### 3. Username Tidak Ditemukan
Username yang diinput tidak ada di database.

**Cek username di database:**
```sql
SELECT id, username, email FROM pengelola_users WHERE username = 'username_pengelola';
```

**Solusi:**
- Pastikan username yang diinput benar (case-sensitive)
- Atau buat user baru dengan username yang benar

### 4. Password Hash Tidak Valid
Password hash di database mungkin tidak valid atau corrupt.

**Solusi:**
- Reset password user melalui API
- Atau update password hash dengan hash yang valid (menggunakan bcrypt)

### 5. Error di Backend Log
Periksa error log di backend untuk melihat error detail.

**Cek log:**
- Backend console output
- Error log file (jika ada)
- Database error (jika ada)

## Debug Steps

### 1. Cek Backend Log
Periksa backend console untuk melihat error message saat login attempt.

### 2. Cek Database
Pastikan user ada di database dengan status ACTIVE:
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

### 3. Test dengan API Directly
Coba login dengan API directly menggunakan curl atau Postman:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "username_pengelola",
    "password": "password_pengelola"
  }'
```

### 4. Cek Password Hash
Jika perlu reset password, pastikan menggunakan bcrypt hash yang valid.

**Generate password hash (dari backend):**
```typescript
import * as bcrypt from 'bcrypt';
const hash = await bcrypt.hash('new_password', 10);
console.log(hash);
```

## Solusi Cepat

### Reset Password User Pengelola

1. **Via API (jika ada endpoint reset password):**
   - Gunakan endpoint reset password dengan super admin access

2. **Via Database (manual):**
   ```sql
   -- Generate hash dulu dari backend, lalu update
   UPDATE pengelola_users 
   SET password_hash = 'hash_baru_dari_bcrypt' 
   WHERE username = 'username_pengelola';
   ```

3. **Set Status ACTIVE:**
   ```sql
   UPDATE pengelola_users 
   SET status = 'ACTIVE' 
   WHERE username = 'username_pengelola';
   ```

## Verifikasi

Setelah perbaikan, test login:
1. Login dengan username dan password yang benar
2. Check response - harus return token dan user data
3. Check browser console - tidak ada error
4. Check backend log - tidak ada error

## Catatan Penting

1. **Password Hash**: Password harus di-hash menggunakan bcrypt dengan salt rounds 10
2. **Status**: User harus memiliki status `ACTIVE`
3. **Username Case-Sensitive**: Username matching adalah case-sensitive
4. **Password Validation**: Pastikan password memenuhi requirements (jika ada)

