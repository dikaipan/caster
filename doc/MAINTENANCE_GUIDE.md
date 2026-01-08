# 📘 Panduan Maintenance CASTER untuk Non-Developer

> Dokumen ini dibuat untuk staff perusahaan yang tidak memiliki latar belakang programming, agar dapat melakukan monitoring dan maintenance dasar aplikasi CASTER.

---

## 📋 Daftar Isi

1. [Pemahaman Dasar Aplikasi](#1-pemahaman-dasar-aplikasi)
2. [Cara Memastikan Aplikasi Berjalan](#2-cara-memastikan-aplikasi-berjalan)
3. [Masalah Umum dan Solusinya](#3-masalah-umum-dan-solusinya)
4. [Kapan Harus Menghubungi Developer](#4-kapan-harus-menghubungi-developer)
5. [Checklist Monitoring Harian](#5-checklist-monitoring-harian)

---

## 1. Pemahaman Dasar Aplikasi

### Apa itu CASTER?
CASTER (Cassette Tracking & Retrieval System) adalah aplikasi web untuk mengelola kaset ATM, termasuk:
- **Inventory** kaset dan mesin ATM
- **Service Order** untuk repair dan replacement
- **Tracking** status kaset dari pengelola → RC → pengelola

### Komponen Utama

| Komponen | Fungsi | Biasanya Berjalan di |
|----------|--------|---------------------|
| **Frontend** | Tampilan yang user lihat | `localhost:3001` atau domain perusahaan |
| **Backend** | Logika bisnis dan API | `localhost:3000` atau server |
| **Database** | Penyimpanan data | MySQL Server |

---

## 2. Cara Memastikan Aplikasi Berjalan

### Langkah Cek Cepat

1. **Buka browser** → akses URL aplikasi (contoh: `https://caster.perusahaan.com`)
2. **Login** dengan credential yang valid
3. **Cek Dashboard** → apakah statistik muncul?
4. **Coba buat test data** → buka Service Order, lihat apakah bisa di-load

### Indikator Aplikasi Sehat ✅
- Halaman login muncul dengan baik
- Setelah login, dashboard menampilkan data
- Menu bisa diklik dan halaman ter-load
- Tidak ada pesan error merah

### Indikator Ada Masalah ❌
- Halaman blank atau error 500
- "Cannot connect to server"
- Loading terus tanpa henti
- Pesan "Network Error"

---

## 3. Masalah Umum dan Solusinya

### 🔴 Masalah 1: Tidak Bisa Akses Website

**Gejala:** Browser menampilkan "This site can't be reached"

**Yang Bisa Dilakukan:**
1. Cek apakah URL benar
2. Cek koneksi internet
3. Tanyakan ke IT: "Apakah server sedang maintenance?"

**Solusi Teknis (untuk IT):**
```bash
# Cek status backend
curl http://localhost:3000/health

# Cek status frontend
curl http://localhost:3001
```

---

### 🔴 Masalah 2: Login Gagal Terus

**Gejala:** "Invalid credentials" meskipun password benar

**Yang Bisa Dilakukan:**
1. Pastikan username/email benar (case-sensitive)
2. Reset password melalui Super Admin
3. Cek apakah akun sudah INACTIVE

---

### 🔴 Masalah 3: Data Tidak Muncul / Loading Lama

**Gejala:** Halaman loading terus atau data kosong

**Yang Bisa Dilakukan:**
1. Refresh halaman (Ctrl+F5)
2. Clear cache browser
3. Coba browser lain

**Jika masih bermasalah:** kemungkinan database down → hubungi IT

---

### 🔴 Masalah 4: Error Saat Submit Form

**Gejala:** Pesan error saat create Service Order, dll

**Yang Bisa Dilakukan:**
1. Cek semua field wajib sudah diisi
2. Cek format data (contoh: serial number tidak boleh duplikat)
3. Screenshot error message untuk laporan

---

## 4. Kapan Harus Menghubungi Developer

### Hubungi Developer Jika:

| Situasi | Urgensi |
|---------|---------|
| Server down total (semua user terdampak) | 🔴 **URGENT** |
| Data hilang atau corrupt | 🔴 **URGENT** |
| Fitur critical tidak berfungsi (login, create ticket) | 🟡 **High** |
| Bug minor (tampilan rusak, typo) | 🟢 **Normal** |
| Request fitur baru | 🔵 **Low** |

### Informasi yang Harus Disiapkan:

1. **Screenshot error** (jika ada)
2. **Langkah reproduce** → "Saya klik A, lalu B, muncul error"
3. **Browser dan OS** yang digunakan
4. **Waktu kejadian**
5. **User yang terdampak** (satu orang atau semua)

---

## 5. Checklist Monitoring Harian

### Pagi (08:00)
- [ ] Akses website → pastikan bisa login
- [ ] Cek Dashboard → data statistik muncul
- [ ] Cek notifikasi → ada pending ticket?

### Siang (12:00)
- [ ] Cek Active Service Orders
- [ ] Pastikan workflow berjalan (ticket bisa di-update)

### Sore (17:00)
- [ ] Review ticket yang di-close hari ini
- [ ] Backup reminder (jika manual)

---

## 📞 Contact Support

| Level | Contact | Waktu Response |
|-------|---------|----------------|
| **Level 1** | IT Internal | 1-2 jam |
| **Level 2** | Developer/Vendor | 4-24 jam |
| **Level 3** | Escalation Manager | Sesuai SLA |

---

## 📚 Dokumen Terkait

- [BACKUP_GUIDE.md](./BACKUP_GUIDE.md) - Panduan backup database
- [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) - Checklist keamanan
- [HANDOVER_DOCUMENT.md](./HANDOVER_DOCUMENT.md) - Dokumen serah terima

---

*Dokumen ini terakhir diupdate: Desember 2024*
