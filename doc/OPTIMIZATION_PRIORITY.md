# 🎯 Optimization Priority Roadmap

Panduan prioritas optimasi berdasarkan bundle analyzer results dan impact analysis.

**Last Updated**: 13 Desember 2025

---

## 📊 Current Bundle Analysis

### Large Bundles (High Priority)
1. **`/tickets/create`** - 124 kB (291 kB First Load JS) 🔴 **CRITICAL**
   - File: 2182 lines
   - Impact: Highest bundle size
   - Difficulty: Complex (many state interdependencies)
   - Expected Reduction: ~35% (-43 kB)

2. **`/dashboard`** - 16.9 kB (180 kB First Load JS) 🟡 **MEDIUM**
   - Status: ✅ Chart.js sudah di-lazy load
   - Impact: Medium
   - Expected Reduction: Minimal (sudah optimal)

3. **`/cassettes`** - 15.5 kB (179 kB First Load JS) 🟢 **LOW**
   - Status: ✅ Sudah dioptimalkan dengan React Query
   - Impact: Low
   - Expected Reduction: Sudah optimal

---

## 🎯 Priority Matrix

### 🔴 **PRIORITY 1: CRITICAL (Immediate Action)**

#### 1. Split `/tickets/create` Page
**Impact**: ⭐⭐⭐⭐⭐ (Highest)  
**Effort**: ⭐⭐⭐⭐ (Complex - 2-3 days)  
**Risk**: Medium (Requires careful refactoring)

**Current Status**:
- File size: 2182 lines
- Bundle size: 124 kB (291 kB First Load JS)
- Complex state management (30+ state variables)
- Multiple business logic flows

**Strategy**: 3-Phase Approach

**Phase 1: Extract UI Components** (4-6 hours)
- [ ] `CassetteInfoCard.tsx` - Display cassette information
- [ ] `MachineSearchResults.tsx` - Machine search results display
- [ ] `CassetteSelectionList.tsx` - Selected cassettes list
- [ ] `ShippingAddressForm.tsx` - Shipping address form
- [ ] `CourierInfoForm.tsx` - Courier information form
- [ ] `StepIndicator.tsx` - Multi-step progress indicator

**Phase 2: Extract Step Components** (6-8 hours)
- [ ] `CassetteIdentificationStep.tsx` - Step 1 wrapper
- [ ] `TicketDetailsStep.tsx` - Step 2 wrapper
- [ ] `ShippingInfoStep.tsx` - Step 3 wrapper

**Phase 3: Extract Custom Hooks** (4-6 hours)
- [ ] `useTicketForm.ts` - Form state management hook
- [ ] `useCassetteSearch.ts` - Cassette search logic hook
- [ ] `useShippingValidation.ts` - Shipping validation hook
- [ ] `useMultiCassetteForm.ts` - Multi-cassette form logic

**Expected Outcome**:
- Bundle size reduction: ~35% (-43 kB)
- Better maintainability
- Improved code reusability
- Faster development

**Timeline**: 2-3 days (bertahap untuk menghindari breaking changes)

---

### 🟡 **PRIORITY 2: HIGH (Quick Wins - 1-2 days)**

#### 2. Remove Unused Dependencies
**Impact**: ⭐⭐⭐ (Medium-High)  
**Effort**: ⭐⭐ (Easy - 2-4 hours)

**Action Items**:
- [ ] Run `npm run analyze` untuk identify unused code
- [ ] Review bundle analyzer report untuk duplicate dependencies
- [ ] Remove unused imports dan dependencies
- [ ] Use webpack-bundle-analyzer untuk deep analysis

**Expected Outcome**:
- Bundle size reduction: 5-10%
- Faster build times
- Cleaner dependency tree

#### 3. Optimize Image Usage
**Impact**: ⭐⭐⭐ (Medium)  
**Effort**: ⭐ (Easy - 1-2 hours)

**Current Status**: ✅ Signature images sudah dioptimalkan dengan lazy loading

**Action Items**:
- [ ] Review remaining `<img>` tags
- [ ] Replace dengan Next.js `<Image />` jika memungkinkan
- [ ] Ensure semua images memiliki `alt` attributes
- [ ] Implement image optimization untuk static assets

**Files to Review**:
- `frontend/src/app/tickets/[id]/page.tsx` - 3 instances
- `frontend/src/app/tickets/[id]/replacement/page.tsx` - 3 instances

**Expected Outcome**:
- Better LCP (Largest Contentful Paint)
- Reduced bandwidth usage
- Better SEO

---

### 🟢 **PRIORITY 3: MEDIUM (Nice to Have - Future)**

#### 4. Service Worker Implementation
**Impact**: ⭐⭐ (Medium)  
**Effort**: ⭐⭐⭐⭐ (Complex - 8+ hours)

**Benefits**:
- Offline support untuk static assets
- Faster subsequent page loads
- Better caching strategy

**Considerations**:
- Requires PWA setup
- Cache invalidation strategy
- Service worker updates management

**Expected Outcome**:
- Better offline experience
- Reduced server load
- Improved perceived performance

#### 5. Additional Code Splitting
**Impact**: ⭐⭐ (Medium)  
**Effort**: ⭐⭐ (Medium - 4-6 hours)

**Action Items**:
- [ ] Identify heavy components yang belum di-lazy load
- [ ] Implement route-based code splitting
- [ ] Dynamic imports untuk conditional features
- [ ] Preload critical routes

**Expected Outcome**:
- Smaller initial bundle
- Faster Time to Interactive (TTI)
- Better code splitting

---

## 📋 Implementation Checklist

### Week 1 (High Priority)
- [ ] **Day 1-2**: Split `/tickets/create` - Phase 1 (Extract UI Components)
- [ ] **Day 3**: Split `/tickets/create` - Phase 2 (Extract Step Components)
- [ ] **Day 4**: Split `/tickets/create` - Phase 3 (Extract Custom Hooks)
- [ ] **Day 5**: Testing & Refinement

### Week 2 (Medium Priority)
- [ ] Remove unused dependencies
- [ ] Optimize remaining image usage
- [ ] Review dan cleanup berdasarkan bundle analyzer

### Future (Low Priority)
- [ ] Service Worker implementation
- [ ] Additional code splitting optimizations
- [ ] Advanced caching strategies

---

## 📊 Success Metrics

### Bundle Size Targets
- **`/tickets/create`**: 124 kB → **< 80 kB** (-35%)
- **Overall First Load JS**: < 200 kB per route
- **Time to Interactive**: < 2.5s (current: ~3-5s)
- **Largest Contentful Paint**: < 1.5s (current: ~2-3s)

### Performance Targets
- ✅ 40-60% reduction in API calls (via React Query caching) - **ACHIEVED**
- ✅ Automatic caching dengan stale-while-revalidate - **ACHIEVED**
- ⏳ Bundle size reduction: -35% for `/tickets/create` - **IN PROGRESS**
- ⏳ Better code splitting - **IN PROGRESS**

---

## 🚀 Quick Start: Priority 1

### Step 1: Prepare (30 minutes)
1. Review current `/tickets/create` structure
2. Identify reusable components
3. Create component folder structure:
   ```
   frontend/src/components/tickets/create/
   ├── CassetteInfoCard.tsx
   ├── MachineSearchResults.tsx
   ├── CassetteSelectionList.tsx
   ├── ShippingAddressForm.tsx
   ├── CourierInfoForm.tsx
   └── StepIndicator.tsx
   ```

### Step 2: Extract UI Components (4-6 hours)
1. Start dengan komponen paling independen
2. Test setiap komponen setelah extraction
3. Ensure props interface yang jelas

### Step 3: Extract Step Components (6-8 hours)
1. Group related logic per step
2. Maintain state at parent level
3. Pass data via props

### Step 4: Extract Custom Hooks (4-6 hours)
1. Extract complex logic to hooks
2. Test hooks independently
3. Integrate ke components

---

## 📝 Notes

- **Testing**: Pastikan setiap phase di-test thoroughly sebelum lanjut ke phase berikutnya
- **Backward Compatibility**: Maintain API compatibility selama refactoring
- **Git Strategy**: Use feature branches untuk setiap phase
- **Code Review**: Review setiap phase sebelum merge

---

## 🔗 Related Documentation

- [PERFORMANCE_OPTIMIZATION.md](./PERFORMANCE_OPTIMIZATION.md) - Complete optimization guide
- [BUNDLE_ANALYZER_RESULTS.md](./BUNDLE_ANALYZER_RESULTS.md) - Bundle analyzer results
- [REACT_QUERY_IMPLEMENTATION.md](./REACT_QUERY_IMPLEMENTATION.md) - React Query guide

