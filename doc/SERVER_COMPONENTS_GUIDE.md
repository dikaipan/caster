# 🖥️ Server Components Implementation Guide

Panduan implementasi Server Components di Next.js 14 untuk optimasi performa aplikasi CASTER.

## 📊 Overview

Server Components adalah fitur Next.js 14 yang memungkinkan komponen di-render di server, mengurangi JavaScript yang dikirim ke client dan meningkatkan performa.

## 🎯 Benefits

1. **Reduced JavaScript Bundle**: Komponen di-render di server, tidak perlu mengirim JS ke client
2. **Faster Initial Load**: Data bisa di-fetch langsung di server
3. **Better SEO**: Content di-render di server, lebih mudah di-crawl
4. **Direct Database Access**: Bisa akses database langsung tanpa API call

## ⚠️ Limitations

Server Components **TIDAK BISA** menggunakan:
- `useState`, `useEffect`, hooks lainnya
- Browser APIs (`window`, `localStorage`, dll)
- Event handlers (`onClick`, `onChange`, dll)
- Context yang dibuat di client
- Zustand store (client-side)

## 🏗️ Hybrid Approach Strategy

Karena aplikasi CASTER banyak menggunakan client-side interactivity, kita menggunakan **hybrid approach**:

1. **Server Component** untuk fetch initial data
2. **Client Component** untuk interactivity
3. Pass data dari Server Component ke Client Component sebagai props

## 📝 Implementation Pattern

### Pattern 1: Server Component Wrapper

```typescript
// app/dashboard/page.tsx (Server Component)
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import DashboardClient from './DashboardClient';

async function getDashboardStats() {
  // Fetch data directly from database or API
  const response = await fetch(`${process.env.API_URL}/api/machines/dashboard/stats`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    cache: 'no-store', // or 'force-cache' for static data
  });
  return response.json();
}

export default async function DashboardPage() {
  // Check auth on server
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }

  // Fetch data on server
  const stats = await getDashboardStats();

  // Pass to client component
  return <DashboardClient initialStats={stats} />;
}
```

```typescript
// app/dashboard/DashboardClient.tsx (Client Component)
'use client';

import { useMachineStats } from '@/hooks/useMachines';
import { useEffect } from 'react';

export default function DashboardClient({ initialStats }: { initialStats: any }) {
  // Use React Query with initial data
  const { data: stats } = useMachineStats();
  
  // Use initial data while React Query is loading
  const displayStats = stats || initialStats;

  return (
    // ... dashboard UI
  );
}
```

### Pattern 2: Server Component for Static Content

```typescript
// app/about/page.tsx (Server Component - no 'use client')
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About - CASTER',
  description: 'About CASTER system',
};

export default async function AboutPage() {
  // This runs on server, no JS sent to client
  return (
    <div>
      <h1>About CASTER</h1>
      <p>Static content that doesn't need interactivity</p>
    </div>
  );
}
```

## 🔄 Migration Strategy

### Phase 1: Identify Candidates (1 jam)

Halaman yang cocok untuk Server Components:
- ✅ Static pages (about, help, documentation)
- ✅ Pages dengan initial data fetch yang tidak berubah sering
- ✅ Pages yang bisa di-cache

Halaman yang TIDAK cocok:
- ❌ Pages dengan banyak interactivity (forms, filters, real-time updates)
- ❌ Pages yang menggunakan client-side state management
- ❌ Pages yang memerlukan browser APIs

### Phase 2: Create Server Component Wrappers (2 jam)

1. Buat Server Component wrapper untuk fetch initial data
2. Pass data ke existing Client Component
3. Client Component tetap menggunakan React Query untuk updates

### Phase 3: Optimize Data Fetching (2 jam)

1. Move data fetching ke server
2. Use Next.js caching strategies
3. Implement proper error handling

### Phase 4: Test & Monitor (1 jam)

1. Test semua halaman yang dikonversi
2. Monitor bundle size reduction
3. Measure performance improvements

## 📋 Example: Converting Home Page

**Before (Client Component):**

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/login');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Redirecting to login...</h1>
      </div>
    </div>
  );
}
```

**After (Server Component):**

```typescript
import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect happens on server, no JS needed
  redirect('/login');
}
```

## 🎯 Recommended Conversions

### High Priority (Easy Wins)

1. **Home Page** (`app/page.tsx`)
   - Simple redirect → Server Component
   - **Time**: 5 menit
   - **Impact**: Small but good practice

2. **Static Pages** (if any)
   - About, Help, Documentation pages
   - **Time**: 30 menit per page
   - **Impact**: Medium

### Medium Priority (Hybrid Approach)

3. **Dashboard Page**
   - Server Component untuk initial data fetch
   - Client Component untuk charts dan interactivity
   - **Time**: 2 jam
   - **Impact**: High

4. **Ticket Detail Page**
   - Server Component untuk fetch ticket data
   - Client Component untuk forms dan actions
   - **Time**: 2 jam
   - **Impact**: High

### Low Priority (Complex)

5. **List Pages** (Tickets, Machines, Cassettes)
   - Sudah menggunakan React Query dengan baik
   - Konversi ke Server Components mungkin tidak memberikan benefit besar
   - **Time**: 4+ jam
   - **Impact**: Medium

## 🔧 Implementation Details

### Server-Side Authentication

```typescript
// lib/auth-server.ts
import { cookies } from 'next/headers';

export async function getServerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  
  if (!token) {
    return null;
  }

  // Verify token with backend
  try {
    const response = await fetch(`${process.env.API_URL}/api/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    return null;
  }
  
  return null;
}
```

### Server-Side Data Fetching

```typescript
// lib/api-server.ts
export async function fetchFromAPI(endpoint: string, options?: RequestInit) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  const response = await fetch(`${process.env.API_URL}/api${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    // Cache strategy
    cache: 'no-store', // or 'force-cache' for static data
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}
```

## 📊 Expected Performance Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Initial JS Bundle | ~180-291 kB | ~150-250 kB | -15-20% |
| Time to First Byte | ~500ms | ~300ms | -40% |
| First Contentful Paint | ~1.5s | ~1.0s | -33% |

## ⚠️ Important Notes

1. **Authentication**: Server Components perlu handle auth di server, tidak bisa pakai client-side auth store
2. **Caching**: Gunakan Next.js caching strategies (`cache`, `revalidate`)
3. **Error Handling**: Implement proper error boundaries
4. **Type Safety**: Pastikan types untuk props antara Server dan Client Components

## 📚 Resources

- [Next.js Server Components Docs](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Server and Client Components](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns)
- [Data Fetching in Server Components](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching-caching-and-revalidating)

---

**Last Updated**: Desember 2025

