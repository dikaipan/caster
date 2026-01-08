# Solusi: Memperbaiki Error 401 Unauthorized

## Masalah yang Ditemukan

Frontend tidak bisa extract `access_token` dengan benar dari response login karena format response tidak sesuai.

### Format Response Backend
Backend mengembalikan response dengan format:
```json
{
  "tokens": {
    "access_token": "eyJhbGc..."
  },
  "user": {
    "id": "...",
    "username": "...",
    "role": "SUPER_ADMIN",
    "userType": "HITACHI",
    ...
  }
}
```

### Format yang Diharapkan Frontend (Sebelum Fix)
Frontend mencoba extract langsung dari root:
```javascript
const { access_token, user } = response.data; // ❌ Salah!
```

Ini menyebabkan `access_token` menjadi `undefined`, sehingga token tidak tersimpan di localStorage, dan semua request berikutnya mendapat 401 Unauthorized.

## Solusi yang Diterapkan

Memperbaiki frontend untuk extract `access_token` dari `tokens` object dengan fallback untuk kompatibilitas:

```javascript
// Extract access_token from tokens object
const access_token = response.data.tokens?.access_token || response.data.access_token;
const user = response.data.user;

if (!access_token || !user) {
  throw new Error('Invalid login response format');
}
```

## File yang Diperbaiki

1. `frontend/src/store/authStore.ts`
   - Function `login()` - Line 52
   - Function `verify2FALogin()` - Line 74

## Cara Menggunakan

1. **Restart Dev Server** (jika sedang running):
   ```bash
   # Stop server (Ctrl+C)
   # Start lagi
   npm run dev
   ```

2. **Clear Browser Data**:
   - Buka Developer Tools (F12)
   - Application tab → Clear Storage
   - Atau jalankan di console:
     ```javascript
     localStorage.clear();
     location.reload();
     ```

3. **Login Kembali**:
   - Login dengan credentials yang benar
   - Token akan tersimpan dengan benar
   - Request berikutnya akan menggunakan token yang valid

## Verifikasi

Setelah login, check di browser console:
```javascript
// Check token
console.log('Token:', localStorage.getItem('token'));

// Check user
const user = JSON.parse(localStorage.getItem('user') || '{}');
console.log('User:', user);
console.log('Role:', user.role);
console.log('UserType:', user.userType);
```

Token harus ada (bukan null/undefined) dan user object harus memiliki role dan userType yang benar.

## Catatan

- Fix ini backward compatible - jika backend mengembalikan format lama (`access_token` di root), tetap akan bekerja
- Fix ini juga bekerja dengan format baru (`tokens.access_token`)
- Error handling ditambahkan untuk memastikan response format valid

