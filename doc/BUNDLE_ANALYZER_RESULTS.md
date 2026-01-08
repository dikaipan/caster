# 📊 Bundle Analyzer Results

Hasil analisis bundle size menggunakan @next/bundle-analyzer setelah optimasi.

## 📅 Date
13 Desember 2025

## 📁 Report Locations

Reports tersedia di `frontend/.next/analyze/`:
- **client.html** - Client-side bundles (PENTING - buka di browser)
- **edge.html** - Edge runtime bundles  
- **nodejs.html** - Server-side bundles

## 🔍 Cara Melihat Report

1. Navigate ke folder: `frontend/.next/analyze/`
2. Buka file `client.html` di browser (double-click atau right-click > Open with > Browser)
3. Visualisasi interaktif akan menampilkan:
   - Bundle size per module
   - Dependencies tree
   - Largest bundles
   - Code splitting opportunities
   - Interactive zoom dan filter

## 📊 Expected Findings (Based on Previous Analysis)

### Large Bundles (Need Attention)
1. **/tickets/create** - ~124 kB (291 kB First Load JS)
   - File: 2182 lines
   - Status: ⚠️ Needs splitting
   - Priority: High

2. **/cassettes** - 15.5 kB (179 kB First Load JS)
   - Status: ✅ Already optimized with React Query

3. **/dashboard** - 16.9 kB (180 kB First Load JS)
   - Status: ✅ Chart.js sudah di-lazy load

### Dependencies Analysis
- **Chart.js** - ~200 kB (sudah di-lazy load dengan dynamic imports) ✅
- **@react-pdf/renderer** - Heavy (sudah di-dynamic import) ✅
- **lucide-react** - ✅ Sudah optimal dengan tree shaking
- **@tanstack/react-query** - ✅ Efisien dengan code splitting

## 🎯 Next Steps

1. **Review Report**:
   - Buka `client.html` di browser
   - Identifikasi bundle terbesar (kemungkinan `/tickets/create`)
   - Periksa dependencies yang tidak digunakan

2. **Prioritaskan Optimasi**:
   - Split `/tickets/create` page (highest impact - ~35% reduction expected)
   - Remove unused dependencies jika ada
   - Additional code splitting jika diperlukan

3. **Monitor**:
   - Run bundle analyzer secara berkala
   - Track bundle size changes setelah optimasi
   - Set target: < 200 kB First Load JS per route

## 📝 Notes

- Reports di-generate setiap kali menjalankan `npm run analyze`
- File reports akan di-overwrite pada build berikutnya
- Untuk production analysis, pastikan menggunakan production build:
  ```bash
  $env:NODE_ENV='production'; $env:ANALYZE='true'; npm run build
  ```
- Bundle analyzer membantu identifikasi:
  - Duplicate dependencies
  - Unused code
  - Large third-party libraries
  - Code splitting opportunities

## 🔄 Running Bundle Analyzer Again

```bash
cd frontend
npm run analyze
# Atau di PowerShell:
$env:ANALYZE='true'; npm run build
```

Reports akan di-generate ulang di `frontend/.next/analyze/`
