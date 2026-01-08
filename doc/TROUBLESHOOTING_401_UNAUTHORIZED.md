# Troubleshooting: 401 Unauthorized Error

## Masalah
User mendapatkan error 401 Unauthorized meskipun sudah login sebagai SUPER_ADMIN.

## Penyebab
Error 401 (Unauthorized) berbeda dengan 403 (Forbidden):
- **401 Unauthorized**: Masalah autentikasi - token tidak valid, expired, atau tidak terkirim
- **403 Forbidden**: Masalah autorisasi - user terautentikasi tapi tidak punya permission

Endpoint yang terkena:
- `/api/v1/tickets/count/new`
- `/api/v1/machines/dashboard/stats`

Endpoint-endpoint ini hanya membutuhkan autentikasi (tidak memerlukan role tertentu), jadi masalahnya adalah autentikasi, bukan autorisasi.

## Kemungkinan Penyebab

### 1. Token JWT Expired
Token JWT memiliki masa berlaku 15 menit (dari konfigurasi `JWT_EXPIRATION`). Setelah 15 menit, token akan expired dan perlu di-refresh.

### 2. Token Tidak Ada di localStorage
Token mungkin tidak tersimpan dengan benar setelah login.

### 3. Refresh Token Gagal
Sistem mencoba auto-refresh token saat mendapat 401, tapi refresh token juga expired atau tidak valid.

## Solusi

### Solusi 1: Logout dan Login Kembali
1. Buka browser console (F12)
2. Jalankan:
   ```javascript
   localStorage.clear();
   window.location.href = '/login';
   ```
3. Login kembali dengan credentials yang benar

### Solusi 2: Clear Browser Data
1. Buka Developer Tools (F12)
2. Buka tab Application/Storage
3. Clear Local Storage
4. Clear Cookies (terutama refresh token cookie)
5. Refresh page dan login kembali

### Solusi 3: Check Token di Console
Buka browser console dan jalankan:
```javascript
// Check token
console.log('Token:', localStorage.getItem('token'));
console.log('User:', JSON.parse(localStorage.getItem('user') || '{}'));

// Decode JWT payload (jika ingin melihat isi token)
const token = localStorage.getItem('token');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token payload:', payload);
  console.log('Token expires at:', new Date(payload.exp * 1000));
  console.log('Current time:', new Date());
  console.log('Is expired?', new Date(payload.exp * 1000) < new Date());
}
```

### Solusi 4: Manual Token Refresh
Jika token expired, sistem akan mencoba auto-refresh. Jika auto-refresh gagal:
1. Check apakah refresh token cookie masih valid
2. Jika tidak, logout dan login kembali

## Verifikasi

### Check User Role
Setelah login, check apakah user memiliki role SUPER_ADMIN:
```javascript
const user = JSON.parse(localStorage.getItem('user') || '{}');
console.log('User role:', user.role);
console.log('User type:', user.userType);
```

User SUPER_ADMIN harus memiliki:
- `role: "SUPER_ADMIN"`
- `userType: "HITACHI"`

### Check Token Valid
Token harus berisi payload dengan field:
- `sub`: user ID
- `userType`: "HITACHI" atau "PENGELOLA"
- `role`: "SUPER_ADMIN", "RC_MANAGER", dll

## Catatan Penting

1. **Token Expiration**: Token JWT hanya valid 15 menit. Sistem akan auto-refresh menggunakan refresh token (yang disimpan di HttpOnly cookie).

2. **Auto-Refresh**: Sistem memiliki interceptor yang akan mencoba auto-refresh token saat mendapat 401. Jika refresh gagal, user akan di-redirect ke login page.

3. **Role vs Authentication**: 
   - Endpoint `/tickets/count/new` dan `/machines/dashboard/stats` hanya membutuhkan **autentikasi** (user sudah login)
   - Endpoint seperti `/data-management/stats` membutuhkan **role SUPER_ADMIN** (selain autentikasi)

4. **Jika Masih Bermasalah**: 
   - Check backend logs untuk melihat error detail
   - Check apakah JWT_SECRET di backend sama dengan yang digunakan untuk generate token
   - Check apakah refresh token cookie terkirim dengan benar

## Debug Steps

1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "count/new" or "dashboard/stats"
4. Check Request Headers:
   - Harus ada `Authorization: Bearer <token>`
5. Check Response:
   - Status: 401
   - Response body mungkin berisi error message
6. Check Console tab untuk error messages

## Prevention

Untuk menghindari masalah ini:
1. Pastikan auto-refresh token bekerja dengan baik
2. Set token expiration yang sesuai (tidak terlalu pendek)
3. Handle token refresh error dengan baik di frontend
4. Pastikan refresh token cookie di-set dengan benar di backend

