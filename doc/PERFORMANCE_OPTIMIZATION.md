# 🚀 Performance Optimization Guide

Panduan lengkap untuk mengoptimalkan performa website CASTER agar mendapatkan load time yang cepat dan responsif.

## 📊 Current Performance Metrics

**Last Measured**: 13 Desember 2025

| Metric | Value | Status |
|--------|-------|--------|
| First Contentful Paint | 0.3s | ✅ Excellent |
| Largest Contentful Paint | 3.0s | ⚠️ Acceptable |
| Total Blocking Time | 430ms | ⚠️ Acceptable |
| Cumulative Layout Shift | 0 | ✅ Perfect |
| Speed Index | 0.9s | ✅ Excellent |

**Estimated Lighthouse Score**: 85-90/100

See `PERFORMANCE_METRICS_ANALYSIS.md` for detailed analysis.

## 📊 Current Performance Issues

Dari build output, beberapa area yang perlu dioptimalkan:

1. **Large Bundle Sizes**:
   - `/tickets/create`: 124 kB (291 kB First Load JS) - **SANGAT BESAR**
   - `/cassettes`: 15.5 kB (179 kB First Load JS)
   - `/dashboard`: 16.9 kB (180 kB First Load JS)

2. **Client-Side Rendering**:
   - `/preventive-maintenance` - deopted into client-side rendering
   - `/settings` - deopted into client-side rendering
   - `/resources` - deopted into client-side rendering

3. **Image Optimization**:
   - Banyak penggunaan `<img>` tag instead of Next.js `<Image />`
   - Missing `alt` attributes

4. **API Polling**:
   - Banyak polling yang bisa dioptimalkan dengan better caching

---

## ✅ Optimasi yang Sudah Diterapkan

### 1. Next.js Configuration
- ✅ `swcMinify: true` - Menggunakan SWC untuk minification yang lebih cepat
- ✅ `removeConsole` di production - Menghapus console.log untuk mengurangi bundle size
- ✅ Font optimization dengan `display: "swap"` dan `preload: true`

### 2. Code Splitting
- ✅ Next.js 14 App Router secara otomatis melakukan code splitting per route
- ✅ Dynamic imports untuk heavy libraries (@react-pdf/renderer)
- ✅ Lazy loading Chart.js components di dashboard page

### 3. Image Optimization
- ✅ Added `loading="lazy"` dan `decoding="async"` pada semua `<img>` tags untuk signature images
- ✅ Semua images memiliki `alt` attributes untuk accessibility
- ⚠️ Note: Signature images menggunakan base64 data URLs, sehingga tidak bisa menggunakan Next.js `<Image />` component. Optimasi dilakukan dengan lazy loading attributes.

### 4. Next.js Config Optimizations
- ✅ Image optimization dengan AVIF dan WebP formats
- ✅ CSS optimization enabled
- ✅ Package imports optimization untuk lucide-react dan date-fns
- ✅ Compression enabled
- ✅ Output file tracing untuk @react-pdf/renderer

### 5. Polling Frequency Optimization
- ✅ Reduced NotificationService polling dari 60 detik menjadi 120 detik (2 menit) - mengurangi API calls sebesar 50%
- ✅ Optimized Sidebar notification polling initial delay dari 5 menit menjadi 3 menit untuk balance yang lebih baik antara freshness dan server load
- ✅ Adaptive retry delay tetap dipertahankan untuk handle rate limiting dengan baik

### 6. Server Components Implementation
- ✅ Converted home page (`app/page.tsx`) to Server Component - redirect happens on server, no JavaScript needed
- 📖 Created comprehensive [Server Components Guide](./SERVER_COMPONENTS_GUIDE.md) dengan strategi hybrid approach
- ⚠️ Note: Kebanyakan halaman memerlukan client-side interactivity, sehingga hybrid approach (Server Component untuk initial data, Client Component untuk interactivity) lebih cocok

---

## 🎯 Rekomendasi Optimasi

### 1. **Code Splitting & Dynamic Imports**

#### A. Lazy Load Heavy Components

```typescript
// ❌ BAD: Import semua sekaligus
import { HeavyComponent } from '@/components/heavy';

// ✅ GOOD: Dynamic import
const HeavyComponent = dynamic(() => import('@/components/heavy'), {
  loading: () => <LoadingSpinner />,
  ssr: false, // Jika tidak perlu SSR
});
```

**File yang perlu dioptimalkan:**
- `/tickets/create/page.tsx` - Import banyak komponen sekaligus
- Chart.js components - Lazy load saat diperlukan

#### B. Split Large Pages

File `/tickets/create/page.tsx` (124 kB) terlalu besar. Rekomendasi:
- Split menjadi multiple components
- Lazy load form sections
- Code split berdasarkan user type (PENGELOLA vs HITACHI)

### 2. **Image Optimization**

#### Replace `<img>` dengan Next.js `<Image />`

```typescript
// ❌ BAD
<img src="/signature.png" />

// ✅ GOOD
import Image from 'next/image';
<Image 
  src="/signature.png" 
  alt="Signature" 
  width={300} 
  height={100}
  loading="lazy"
/>
```

**Files yang sudah diperbaiki:**
- ✅ `frontend/src/app/tickets/[id]/page.tsx` (3 instances) - Added `loading="lazy"` dan `decoding="async"`
- ✅ `frontend/src/app/tickets/[id]/replacement/page.tsx` (3 instances) - Added `loading="lazy"` dan `decoding="async"`
- ℹ️ `frontend/src/components/reports/SOReportPDF.tsx` - Menggunakan `@react-pdf/renderer` Image component (tidak perlu diubah)

### 3. **Bundle Size Optimization**

#### A. Tree Shaking untuk Lucide Icons

```typescript
// ❌ BAD: Import semua icons
import * as Icons from 'lucide-react';

// ✅ GOOD: Import spesifik
import { Plus, Edit, Trash } from 'lucide-react';
```

**Status**: Sudah baik - semua file menggunakan named imports ✅

#### B. Optimize Chart.js

Chart.js cukup besar. Rekomendasi:
- Gunakan dynamic import untuk chart components
- Load hanya saat chart benar-benar diperlukan

```typescript
const ChartComponent = dynamic(() => import('@/components/chart'), {
  ssr: false,
});
```

### 4. **API Optimization**

#### A. Implement React Query / SWR

**Current Issues:**
- Tidak ada caching mechanism
- Banyak duplicate API calls
- Manual loading state management
- Tidak ada background refetching

**Optimasi:**
- ✅ Implement React Query untuk automatic caching dan request deduplication
- ✅ Background refetching untuk data freshness
- ✅ Stale-while-revalidate pattern untuk better UX
- 📖 **Lihat [React Query Implementation Guide](./REACT_QUERY_IMPLEMENTATION.md) untuk detail lengkap**

**Expected Benefits:**
- 40-60% reduction dalam API calls melalui caching
- Automatic loading states
- Better error handling
- Optimistic updates untuk better UX

#### B. Reduce Polling Frequency

**Current Issues:**
- Sidebar polling setiap 3-5 menit
- Dashboard fetching notification counts

**Optimasi:**
- ✅ Reduced NotificationService polling dari 60s ke 120s
- ✅ Optimized Sidebar polling initial delay dari 5 menit ke 3 menit
- Gunakan React Query untuk smarter polling dengan stale-while-revalidate

#### B. Batch API Calls

**Current**: Banyak individual API calls
**Optimasi**: Gunakan batch endpoints yang sudah ada:
- ✅ `/cassettes/check-availability-batch` - Sudah digunakan
- ✅ `/tickets/count/new` - Optimized endpoint

### 5. **Caching Strategy**

#### A. Static Data Caching

```typescript
// Cache dropdown data (banks, cassette types, etc.)
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const useCachedData = (key: string, fetcher: () => Promise<any>) => {
  const [data, setData] = useState(() => {
    const cached = sessionStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }
    return null;
  });
  
  // ... fetch logic
};
```

#### B. React Query / SWR

Pertimbangkan menggunakan React Query atau SWR untuk:
- Automatic caching
- Background refetching
- Request deduplication
- Optimistic updates

### 6. **Reduce Client-Side Rendering**

#### Convert to Server Components

Files yang bisa di-convert ke Server Components:
- `/settings` - Bisa menggunakan Server Components untuk static parts
- `/resources` - Static data bisa di-fetch di server

**Rekomendasi:**
```typescript
// Server Component (default in App Router)
export default async function SettingsPage() {
  const banks = await fetchBanks(); // Server-side fetch
  
  return <SettingsClient banks={banks} />;
}
```

### 7. **Font Optimization**

**Current**: ✅ Sudah baik
- Inter font dengan `display: "swap"`
- `preload: true`
- Variable font untuk smaller bundle

### 8. **CSS Optimization**

#### A. Purge Unused CSS

Tailwind CSS sudah melakukan purging otomatis. Pastikan:
- ✅ `content` di `tailwind.config.js` sudah benar
- ✅ Tidak ada CSS yang tidak digunakan

#### B. Critical CSS

Pertimbangkan inline critical CSS untuk above-the-fold content.

### 9. **JavaScript Bundle Optimization**

#### A. Analyze Bundle

```bash
npm install @next/bundle-analyzer --save-dev
```

Update `next.config.js`:
```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
```

Run analysis:
```bash
ANALYZE=true npm run build
```

#### B. External Dependencies

Pertimbangkan untuk externalize heavy dependencies:
- Chart.js - Bisa di-load dari CDN
- PDF libraries - Lazy load saat diperlukan

### 10. **Service Worker & PWA**

Untuk offline support dan faster subsequent loads:
- Implement Service Worker
- Cache static assets
- Cache API responses

---

## 📈 Expected Improvements

Setelah optimasi:

| Metric | Before | After (Expected) | Improvement |
|--------|--------|-----------------|-------------|
| First Load JS | 291 kB | ~200 kB | -31% |
| Time to Interactive | ~3-5s | ~1.5-2.5s | -50% |
| Largest Contentful Paint | ~2-3s | ~1-1.5s | -50% |
| Bundle Size (/tickets/create) | 124 kB | ~80 kB | -35% |

---

## 🔧 Implementation Priority

### High Priority (Quick Wins)
1. ✅ Replace `<img>` dengan `<Image />` - **SELESAI** - Signature images menggunakan lazy loading
2. ✅ Add `alt` attributes - **SELESAI**
3. ✅ Lazy load Chart.js components - **SELESAI** - Dynamic imports di dashboard
4. ⚠️ Optimize `/tickets/create` page splitting - **PRIORITAS TINGGI** - File 2182 lines, perlu di-split menjadi multiple components

### Medium Priority
5. ✅ Implement React Query/SWR - **SELESAI** - [Implementation Guide](./REACT_QUERY_IMPLEMENTATION.md)
6. ⚙️ Convert pages to Server Components - **BERLANGSUNG** - Guide sudah ada, beberapa halaman bisa dioptimalkan - [Implementation Guide](./SERVER_COMPONENTS_GUIDE.md)
7. ✅ Reduce polling frequency - **SELESAI** - NotificationService (120s), Sidebar (3 menit)

### Low Priority (Nice to Have)
8. ❌ Service Worker implementation - **BELUM** - **~8 jam** - Untuk offline support
9. ❌ Bundle analyzer setup - **BELUM** - **~1 jam** - Install @next/bundle-analyzer untuk monitoring bundle size
10. ❌ CDN for external libraries - **BELUM** - **~2 jam** - Externalize Chart.js, PDF libraries

---

## 📝 Checklist Optimasi

- [x] Replace all `<img>` with Next.js `<Image />` - ✅ Sudah dioptimalkan dengan lazy loading untuk signature images (base64)
- [x] Add `alt` attributes to all images - ✅ Sudah dilakukan
- [x] Lazy load Chart.js components - ✅ Sudah diimplementasi di dashboard dengan dynamic imports
- [ ] Split large pages (especially `/tickets/create`) - ⚠️ **PRIORITAS TINGGI**: File masih 2182 lines, perlu di-split
- [x] Implement React Query/SWR for API calls - ✅ Sudah diimplementasi (useCassettes, useMachines, useTickets hooks)
- [ ] Convert static pages to Server Components - ⚙️ **MEDIUM PRIORITY**: Guide sudah ada, beberapa halaman bisa di-optimalkan
- [x] Reduce API polling frequency - ✅ Sudah dioptimalkan (120s untuk notifications, 3 menit untuk sidebar)
- [ ] Setup bundle analyzer - ❌ **BELUM**: Perlu install @next/bundle-analyzer untuk monitoring
- [x] Implement caching strategy - ✅ Sudah dengan React Query (staleTime, gcTime)
- [x] Add loading states for better UX - ✅ Sudah ada loading states di berbagai komponen

---

## 🚀 Quick Start: Implementasi Optimasi

### Step 1: Image Optimization (15 menit)
```bash
# Find all <img> tags
grep -r "<img" frontend/src --include="*.tsx"
```

### Step 2: Bundle Analysis (30 menit)
```bash
npm install @next/bundle-analyzer --save-dev
# Update next.config.js (see above)
ANALYZE=true npm run build
```

### Step 3: Lazy Load Heavy Components (1 jam)
- Identify heavy components
- Convert to dynamic imports
- Add loading states

---

## 📚 Resources

- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web Vitals](https://web.dev/vitals/)
- [React Query](https://tanstack.com/query/latest)
- [Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)

---

**Last Updated**: 13 Desember 2025

---

## 🎉 Session Summary (13 Desember 2025)

### ✅ Completed Optimizations

1. **Bundle Analyzer Setup**
   - ✅ Installed `@next/bundle-analyzer`
   - ✅ Configured `next.config.js`
   - ✅ Added `npm run analyze` script
   - ✅ **Successfully generated reports** at `frontend/.next/analyze/`
   - 📊 **Reports ready**: Open `client.html` in browser untuk visualisasi bundle size

2. **Resources Page Optimization**
   - ✅ Migrated to React Query hooks (`useCassettes`, `useMachines`)
   - ✅ Removed manual API calls dan useEffect chains
   - ✅ Automatic caching dengan 3 menit staleTime
   - ✅ Expected: 40-60% reduction in API calls

3. **Preventive Maintenance Page Optimization**
   - ✅ Created `usePreventiveMaintenance.ts` hook dengan full mutation support
   - ✅ Migrated to React Query hooks
   - ✅ Removed manual state management
   - ✅ Automatic caching dan background refetching

4. **Code Quality**
   - ✅ Fixed React Hooks violations
   - ✅ Fixed TypeScript errors
   - ✅ Ensured hooks are called in correct order

### 📊 Bundle Analyzer Reports

Reports tersedia di:
- **Client Bundle**: `frontend/.next/analyze/client.html` ⭐ (BUKA DI BROWSER)
- **Edge Bundle**: `frontend/.next/analyze/edge.html`
- **Server Bundle**: `frontend/.next/analyze/nodejs.html`

**Cara melihat**: Buka `client.html` di browser untuk visualisasi interaktif bundle size

---

## 📚 Related Documentation

- [BUNDLE_ANALYZER_RESULTS.md](./BUNDLE_ANALYZER_RESULTS.md) - Detail hasil bundle analyzer
- [REACT_QUERY_IMPLEMENTATION.md](./REACT_QUERY_IMPLEMENTATION.md) - React Query implementation guide
- [SERVER_COMPONENTS_GUIDE.md](./SERVER_COMPONENTS_GUIDE.md) - Server Components guide


---

## 🔧 Yang Perlu Diperbaiki atau Ditambahkan

### ⚠️ **PRIORITAS TINGGI**

#### 1. Split `/tickets/create` Page (COMPLEX - Needs Careful Planning)
**Status**: ⚠️ **Complex Implementation** - File 2182 lines dengan banyak state interdependencies  
**Alasan**: File terlalu besar (2182 lines, ~124 kB bundle size), tapi sangat kompleks dengan banyak state management

**Catatan Penting**: 
- File ini memiliki banyak state yang saling terkait (30+ state variables)
- Complex business logic dengan validation, multi-step form, dan dynamic form fields
- Membutuhkan refactoring yang hati-hati untuk menghindari breaking changes

**Rekomendasi** (Diperlukan Perencanaan Mendalam):
1. **Phase 1**: Extract reusable UI components
   - `CassetteInfoCard.tsx` - Card untuk menampilkan info kaset
   - `MachineSearchResults.tsx` - Component untuk hasil pencarian mesin
   - `CassetteSelectionList.tsx` - List kaset yang dipilih
   - `ShippingAddressForm.tsx` - Form alamat pengiriman
   - `CourierInfoForm.tsx` - Form informasi kurir

2. **Phase 2**: Extract step components dengan state lifting
   - `CassetteIdentificationStep.tsx` - Step 1 wrapper
   - `TicketDetailsStep.tsx` - Step 2 wrapper  
   - `ShippingInfoStep.tsx` - Step 3 wrapper

3. **Phase 3**: Extract custom hooks
   - `useTicketForm.ts` - Custom hook untuk form state management
   - `useCassetteSearch.ts` - Hook untuk pencarian kaset
   - `useShippingValidation.ts` - Hook untuk validasi shipping

**Expected Impact**: -35% bundle size untuk route `/tickets/create` setelah refactoring lengkap

**Priority**: Medium-High (Bisa dilakukan bertahap untuk menghindari risiko tinggi)

---

### 📊 **PRIORITAS MEDIUM**

#### 2. Setup Bundle Analyzer
**Status**: ✅ **SELESAI** - Sudah diinstall, dikonfigurasi, dan dijalankan  
**Alasan**: Monitoring bundle size untuk optimasi lebih lanjut

**Implementasi**:
- ✅ Installed `@next/bundle-analyzer@^16.0.10`
- ✅ Updated `next.config.js` dengan bundle analyzer wrapper
- ✅ Added script `npm run analyze` di package.json
- ✅ **Reports sudah dibuat** di `frontend/.next/analyze/`

**Cara Menggunakan**:
```bash
cd frontend
npm run analyze
# Atau di PowerShell:
$env:ANALYZE='true'; npm run build
```

**Report Files Generated**:
- `client.html` - Client-side bundle analysis (PENTING - buka di browser)
- `edge.html` - Edge runtime bundle analysis
- `nodejs.html` - Server-side bundle analysis

**Cara Melihat Report**:
1. Buka file `frontend/.next/analyze/client.html` di browser
2. Visualisasi interaktif akan menampilkan:
   - Bundle size per module
   - Dependencies tree
   - Largest bundles
   - Code splitting opportunities

**Next Steps dengan Bundle Analyzer**:
- Review report untuk identifikasi bundle terbesar
- Prioritaskan optimasi pada bundle yang >100 kB
- Monitor bundle size setelah optimasi
```bash
cd frontend
npm install @next/bundle-analyzer --save-dev
```

Update `next.config.js`:
```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
```

Run analysis:
```bash
ANALYZE=true npm run build
```

**Expected Impact**: Better visibility untuk bundle size optimization opportunities

---

#### 3. Server Components Optimization
**Status**: ⚙️ **Partial** - Beberapa halaman sudah dioptimalkan dengan React Query

**Status Per Halaman**:
- ✅ `/settings` - **SELESAI** - Menggunakan dynamic imports untuk tab components
- ✅ `/resources` - **SELESAI** - Dikonversi menggunakan React Query hooks (`useCassettes`, `useMachines`) untuk better caching dan performance
  - Automatic caching dengan React Query (3 menit staleTime)
  - Background refetching
  - Request deduplication
  - Removed manual API calls dan useEffect chains
- ✅ `/preventive-maintenance` - **SELESAI** - Dikonversi menggunakan React Query hooks (`usePreventiveMaintenance`, `useTakePMTask`)
  - Automatic caching dengan React Query (3 menit staleTime)
  - Background refetching
  - Request deduplication
  - Removed manual API calls dan useEffect chains
  - Created dedicated hook file: `usePreventiveMaintenance.ts`

**Catatan**: Karena halaman-halaman ini sangat interaktif (search, filtering, pagination, dialogs), lebih efektif menggunakan React Query daripada Server Components. Server Components cocok untuk static content atau initial data load.

**Expected Impact**: 
- ✅ `/resources` - Better caching mengurangi API calls sebesar 40-60%
- Better UX dengan stale-while-revalidate pattern
- Automatic loading states management

---

### 💡 **PRIORITAS LOW (Nice to Have)**

#### 4. Service Worker Implementation
**Status**: ❌ Belum  
**Alasan**: Untuk offline support dan faster subsequent loads

**Expected Impact**: 
- Offline support untuk static assets
- Faster subsequent page loads
- Better caching strategy

---

#### 5. CDN untuk External Libraries  
**Status**: ⚙️ **Partial** - PDF sudah menggunakan dynamic import  
**Alasan**: Reduce bundle size dengan externalize heavy libraries

**Status Per Library**:
- ✅ `@react-pdf/renderer` - **SUDAH** menggunakan dynamic import di `PDFDownloadButton.tsx`
  - Library hanya di-load saat user klik tombol download PDF
  - Tidak termasuk dalam initial bundle
  
- ⚠️ `Chart.js` - **SUDAH** menggunakan dynamic import di dashboard
  - Bar dan Line charts menggunakan `dynamic()` dengan `ssr: false`
  - Chart.js/auto di-load hanya saat diperlukan
  
- ❌ External CDN - Belum diperlukan karena sudah menggunakan dynamic imports

**Rekomendasi**: 
- ✅ Dynamic imports sudah optimal untuk libraries yang jarang digunakan
- CDN externalization tidak diperlukan karena dynamic imports lebih efektif untuk Next.js

**Expected Impact**: ✅ Sudah tercapai dengan dynamic imports (tidak perlu CDN)

---

## 📋 Summary: Status Implementasi

| Item | Status | Priority | Impact |
|------|--------|----------|--------|
| React Query | ✅ Done | High | High |
| Chart.js Lazy Loading | ✅ Done | High | Medium |
| Image Optimization | ✅ Done | High | Medium |
| Polling Optimization | ✅ Done | Medium | High |
| Bundle Analyzer | ✅ **Done** | Medium | Low |
| PDF Library (Dynamic Import) | ✅ Done | Medium | Medium |
| Split `/tickets/create` | ⚠️ Complex | Medium-High | High |
| Resources Page (React Query) | ✅ Done | Medium | Medium |
| Preventive Maintenance (React Query) | ✅ Done | Medium | Medium |
| Server Components | ⚙️ Partial | Medium | Medium |
| Service Worker | ❌ Missing | Low | Medium |
| Settings Dynamic Imports | ✅ Done | Medium | Medium |

---

## 🎯 Rekomendasi Prioritas Implementasi

**📋 Lihat [OPTIMIZATION_PRIORITY.md](./OPTIMIZATION_PRIORITY.md) untuk roadmap prioritas optimasi yang lebih detail.**

---

## 🎯 Quick Priority Guide

1. **COMPLETED** ✅:
   - ✅ Setup bundle analyzer - Untuk monitoring bundle size
   - ✅ PDF library dynamic imports - Sudah optimal
   - ✅ Chart.js dynamic imports - Sudah optimal
   - ✅ Settings page dynamic imports - Tab components sudah lazy loaded

2. **NEXT PRIORITY** (Recommended):
   - ⚠️ Split `/tickets/create` page - Complex, perlu perencanaan bertahap
   - Run bundle analyzer dan optimize berdasarkan hasil
   - Review dan optimize halaman lain yang masih menggunakan manual API calls

3. **COMPLETED THIS SESSION** ✅:
   - ✅ Resources page optimization dengan React Query hooks
   - ✅ Bundle analyzer setup
   - ✅ Documentation updates

4. **FUTURE** (Nice to Have):
   - Service Worker implementation untuk offline support
   - Additional optimizations berdasarkan bundle analyzer results

---

## Summary: Session 13 Desember 2025 (Evening)

### Completed Tasks:

1. **Bundle Analyzer Setup** ✅
   - Setup `@next/bundle-analyzer` dengan script `analyze`
   - Reports tersedia di `frontend/.next/analyze/client.html`
   - Documentation dibuat di `doc/BUNDLE_ANALYZER_RESULTS.md`

2. **Tickets/Create Page Refactoring (3 Phases)** ✅
   - **Phase 1**: Extract UI Components (6 components) - ~610 lines diekstrak
     - `CassetteInfoCard.tsx` - Info card dengan states (success, in-process, error)
     - `MachineSearchResults.tsx` - Machine search results dengan cassette selection
     - `CassetteSelectionList.tsx` - Selected cassettes list
     - `ShippingAddressForm.tsx` - Shipping address form
     - `CourierInfoForm.tsx` - Courier information form
     - `StepIndicator.tsx` - Multi-step progress indicator
   
   - **Phase 2**: Extract Step Components (3 steps) - ~810 lines diekstrak
     - `CassetteIdentificationStep.tsx` - Step 1: Kaset identification
     - `TicketDetailsStep.tsx` - Step 2: Ticket details & individual cassette details
     - `ShippingInfoStep.tsx` - Step 3: Shipping information
   
   - **Phase 3**: Extract Custom Hooks (4 hooks) - ~690 lines diekstrak
     - `useCassetteSearch.ts` - Cassette search logic (by SN & machine SN)
     - `useTicketForm.ts` - Form state & validation logic
     - `useMultiCassetteSelection.ts` - Multi-cassette selection logic
     - `useShippingForm.ts` - Shipping form state management
   
   - **Total**: ~2,110 lines code diekstrak dari file utama
   - File structure menjadi lebih modular dan maintainable

3. **Code Cleanup** ✅
   - Removed unused imports dari tickets/create page (`useRef`, `Circle`, `Search`)
   - Cleaned up unused icon imports
   - Removed 12 backup/old files (`*_old.tsx`, `*_compact.tsx`, `*_verbose.tsx`) - ~3,500+ lines of unused code removed
   - Files removed:
     - `repairs/page_old.tsx`, `repairs/page_old_verbose.tsx`
     - `repairs/[id]/page_old.tsx`, `repairs/[id]/page_compact.tsx`
     - `tickets/page_old.tsx`, `tickets/page_old_verbose.tsx`
     - `tickets/[id]/receive/page_old.tsx`, `tickets/[id]/receive/page_compact.tsx`
     - `tickets/[id]/receive-return/page_old.tsx`, `tickets/[id]/receive-return/page_compact.tsx`
     - `tickets/[id]/return/page_old.tsx`, `tickets/[id]/return/page_compact.tsx`

4. **Lazy Loading Step Components** ✅
   - Implemented dynamic imports untuk all 3 step components
   - Step components hanya di-load saat diperlukan (saat user navigate ke step tersebut)
   - Loading states dengan spinner untuk better UX
   - Expected impact: Additional ~10-15% bundle size reduction

### Impact:
- File `/tickets/create/page.tsx` menjadi lebih kecil dan modular
- Komponen dan hooks dapat di-reuse di tempat lain
- Code lebih mudah di-test dan maintain
- Ready untuk further code splitting (lazy loading) jika diperlukan
- Better separation of concerns (UI, Logic, State)

### File Structure Created:
```
frontend/src/
├── components/tickets/create/
│   ├── CassetteInfoCard.tsx
│   ├── MachineSearchResults.tsx
│   ├── CassetteSelectionList.tsx
│   ├── ShippingAddressForm.tsx
│   ├── CourierInfoForm.tsx
│   ├── StepIndicator.tsx
│   └── steps/
│       ├── CassetteIdentificationStep.tsx
│       ├── TicketDetailsStep.tsx
│       └── ShippingInfoStep.tsx
└── hooks/
    ├── useCassetteSearch.ts
    ├── useTicketForm.ts
    ├── useMultiCassetteSelection.ts
    └── useShippingForm.ts
```

### Next Steps:
- Priority 2: Continue dengan unused dependencies review (jika ada)
- Priority 2: Image optimization sudah checked (tidak ada img tags di tickets pages)
- Priority 3: Service Worker Implementation untuk offline support (optional)

---

