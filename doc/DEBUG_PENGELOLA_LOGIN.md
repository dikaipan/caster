# Debug: Pengelola User Login Error "Invalid credentials"

## Error yang Terjadi

```
"status": 401,
"message": "Invalid credentials",
"path": "/api/v1/auth/login",
"method": "POST"
```

## Penyebab

Error "Invalid credentials" terjadi ketika:
1. Username tidak ditemukan di database
2. Password tidak match dengan hash di database
3. Status user bukan `ACTIVE`
4. Password hash di database tidak valid/corrupt

## Langkah Debugging

### 1. Cek User di Database

Jalankan query ini di database:

```sql
SELECT 
  id, 
  username, 
  email, 
  status, 
  password_hash,
  pengelola_id,
  role,
  created_at
FROM pengelola_users 
WHERE username = 'username_yang_dicoba';
```

**Periksa:**
- Apakah user ada? (jika tidak ada, user tidak ditemukan)
- Apakah `status` = `'ACTIVE'`? (jika tidak, user tidak aktif)
- Apakah `password_hash` ada dan tidak NULL? (jika NULL, password tidak valid)

### 2. Cek Password Hash

Password hash harus dalam format bcrypt. Format bcrypt biasanya:
- Dimulai dengan `$2a$`, `$2b$`, atau `$2y$`
- Memiliki format: `$2a$10$...` (2a = algorithm, 10 = salt rounds)

**Contoh hash valid:**
```
$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
```

### 3. Test Password Match

Untuk test apakah password match, gunakan script ini di backend:

```typescript
import * as bcrypt from 'bcrypt';

async function testPassword() {
  const password = 'password_yang_dicoba';
  const hash = 'hash_dari_database'; // Copy dari database
  
  const match = await bcrypt.compare(password, hash);
  console.log('Password match:', match);
}

testPassword();
```

### 4. Reset Password User

Jika password tidak match, reset password:

**Via API (jika ada endpoint):**
```bash
# Update user pengelola (dengan super admin token)
curl -X PATCH http://localhost:3000/api/v1/pengelola/{pengelolaId}/users/{userId} \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "PasswordBaru123!"
  }'
```

**Via Database (manual):**
1. Generate hash password baru dari backend:
```typescript
// Jalankan di backend console atau script
import * as bcrypt from 'bcrypt';
const newPassword = 'PasswordBaru123!';
const hash = await bcrypt.hash(newPassword, 10);
console.log('New hash:', hash);
```

2. Update di database:
```sql
UPDATE pengelola_users 
SET password_hash = 'hash_yang_digenerate'
WHERE username = 'username_pengelola';
```

### 5. Set Status ACTIVE

Pastikan status user adalah ACTIVE:

```sql
UPDATE pengelola_users 
SET status = 'ACTIVE' 
WHERE username = 'username_pengelola';
```

## Checklist

- [ ] User ada di database (`pengelola_users`)
- [ ] Status user = `'ACTIVE'`
- [ ] Username benar (case-sensitive, tidak ada extra spaces)
- [ ] Password hash valid (format bcrypt)
- [ ] Password match dengan hash (test dengan bcrypt.compare)
- [ ] Backend log menunjukkan error detail (jika ada)
- [ ] Coba login dengan API langsung (curl/Postman)

## Solusi Cepat

Jika user ada di database tapi tidak bisa login:

1. **Set status ACTIVE:**
```sql
UPDATE pengelola_users SET status = 'ACTIVE' WHERE username = 'username_pengelola';
```

2. **Reset password (jika perlu):**
   - Generate hash baru
   - Update di database

3. **Test login lagi**

## Catatan Penting

1. **Username Case-Sensitive**: Username matching adalah case-sensitive
2. **Password Requirements**: Pastikan password memenuhi requirements (min 8 chars, uppercase, lowercase, number, special char)
3. **Password Hash**: Harus menggunakan bcrypt dengan salt rounds 10
4. **Status ACTIVE**: User harus memiliki status `ACTIVE` untuk dapat login

