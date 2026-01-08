# Kolom Pengelola di Tabel Cassettes

## Perubahan yang Dilakukan

### Backend (`cassettes.service.ts`)
✅ **Updated**: Query untuk include data pengelola dari bank assignments (hanya ACTIVE)
- Mengubah dari `select` ke `include` untuk `customerBank` agar nested relations bisa di-include
- Include `pengelolaAssignments` dengan filter `status: 'ACTIVE'`
- Include `pengelola` dengan fields: `id`, `companyName`, `companyAbbreviation`, `pengelolaCode`

### Frontend (`cassettes/page.tsx`)
✅ **Updated**: 
- Header kolom "Catatan" diganti menjadi "Pengelola"
- Tampilan data dari `cassette.notes` menjadi daftar pengelola yang di-assign ke bank
- CSV export diupdate untuk export pengelola

## Struktur Data yang Dikembalikan

```typescript
cassette.customerBank.pengelolaAssignments = [
  {
    id: "...",
    pengelola: {
      id: "...",
      companyName: "...",
      companyAbbreviation: "...",
      pengelolaCode: "..."
    }
  }
]
```

## Troubleshooting

Jika nama pengelola tidak muncul:

1. **Restart Backend Server**
   ```bash
   cd backend
   npm run start:dev
   ```

2. **Clear Browser Cache**
   - Tekan `Ctrl + Shift + R` untuk hard refresh

3. **Verifikasi Data di Database**
   - Pastikan ada `BankPengelolaAssignment` dengan `status = 'ACTIVE'`
   - Pastikan `pengelola` memiliki data `companyName`, `companyAbbreviation`, atau `pengelolaCode`

4. **Check API Response**
   - Buka DevTools → Network tab
   - Cek response dari `/cassettes` endpoint
   - Pastikan `customerBank.pengelolaAssignments` ada dan berisi data

5. **Debug di Frontend**
   - Buka console browser
   - Cek apakah `cassette.customerBank?.pengelolaAssignments` terisi

## Testing

1. Pastikan ada bank yang memiliki pengelola assignment aktif
2. Pastikan cassette menggunakan bank tersebut
3. Refresh halaman cassettes
4. Verifikasi kolom "Pengelola" menampilkan nama/abbreviation pengelola

---

**Last Updated**: 13 Desember 2025

