# 🔄 React Query Implementation Guide

Panduan implementasi React Query (TanStack Query) untuk optimasi API calls dan caching di aplikasi CASTER.

## 📦 Installation

```bash
cd frontend
npm install @tanstack/react-query
```

## 🎯 Benefits

1. **Automatic Caching**: Data di-cache secara otomatis, mengurangi API calls
2. **Background Refetching**: Update data di background tanpa blocking UI
3. **Stale-While-Revalidate**: Tampilkan data lama sambil fetch data baru
4. **Optimistic Updates**: Update UI sebelum API response
5. **Better Error Handling**: Centralized error handling
6. **Request Deduplication**: Multiple components request same data = 1 API call

## 🏗️ Setup Structure

### 1. Create QueryClient Provider

**File: `frontend/src/providers/QueryProvider.tsx`**

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: data dianggap fresh selama 5 menit
            staleTime: 5 * 60 * 1000, // 5 minutes
            // Cache time: data tetap di cache selama 10 menit setelah tidak digunakan
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
            // Retry failed requests 2 times
            retry: 2,
            // Refetch on window focus (untuk update data saat user kembali ke tab)
            refetchOnWindowFocus: true,
            // Refetch on reconnect
            refetchOnReconnect: true,
          },
          mutations: {
            // Retry failed mutations 1 time
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### 2. Wrap App with QueryProvider

**File: `frontend/src/app/layout.tsx`**

```typescript
import { QueryProvider } from '@/providers/QueryProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
```

## 🎣 Custom Hooks Pattern

### 3. Create Query Hooks

**File: `frontend/src/hooks/useTickets.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// Query Keys - untuk cache management
export const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...ticketKeys.lists(), filters] as const,
  details: () => [...ticketKeys.all, 'detail'] as const,
  detail: (id: string) => [...ticketKeys.details(), id] as const,
  counts: () => [...ticketKeys.all, 'count'] as const,
};

// Fetch tickets dengan filters
export function useTickets(filters: {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ticketKeys.list(filters),
    queryFn: async () => {
      const params: any = {
        page: filters.page || 1,
        limit: filters.limit || 15,
      };
      
      if (filters.status && filters.status !== 'ALL') {
        params.status = filters.status;
      }
      
      if (filters.priority && filters.priority !== 'ALL') {
        params.priority = filters.priority;
      }
      
      if (filters.search) {
        params.search = filters.search;
      }
      
      const response = await api.get('/tickets', { params });
      return response.data;
    },
    // Data dianggap fresh selama 2 menit
    staleTime: 2 * 60 * 1000,
  });
}

// Fetch single ticket
export function useTicket(id: string | null) {
  return useQuery({
    queryKey: ticketKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get(`/tickets/${id}`);
      return response.data;
    },
    enabled: !!id, // Hanya fetch jika id ada
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Fetch ticket counts
export function useTicketCounts() {
  return useQuery({
    queryKey: ticketKeys.counts(),
    queryFn: async () => {
      const [newCount, replacementCount] = await Promise.all([
        api.get('/tickets/count/new'),
        api.get('/tickets/count/replacement'),
      ]);
      
      return {
        new: newCount.data || 0,
        replacement: replacementCount.data || 0,
      };
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchInterval: 3 * 60 * 1000, // Auto-refetch setiap 3 menit
  });
}

// Create ticket mutation
export function useCreateTicket() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/tickets', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate tickets list untuk refetch
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.counts() });
    },
  });
}

// Update ticket mutation
export function useUpdateTicket() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/tickets/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Update cache untuk ticket yang di-update
      queryClient.setQueryData(ticketKeys.detail(variables.id), data);
      // Invalidate list untuk refetch
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
    },
  });
}
```

**File: `frontend/src/hooks/useMachines.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export const machineKeys = {
  all: ['machines'] as const,
  lists: () => [...machineKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...machineKeys.lists(), filters] as const,
  detail: (id: string) => [...machineKeys.all, 'detail', id] as const,
  dashboard: () => [...machineKeys.all, 'dashboard'] as const,
};

export function useMachines(filters: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  bankId?: string;
}) {
  return useQuery({
    queryKey: machineKeys.list(filters),
    queryFn: async () => {
      const params: any = {
        page: filters.page || 1,
        limit: filters.limit || 50,
      };
      
      if (filters.status && filters.status !== 'ALL') {
        params.status = filters.status;
      }
      
      if (filters.search) {
        params.search = filters.search;
      }
      
      if (filters.bankId) {
        params.customerBankId = filters.bankId;
      }
      
      const response = await api.get('/machines', { params });
      return response.data;
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

export function useMachineStats() {
  return useQuery({
    queryKey: machineKeys.dashboard(),
    queryFn: async () => {
      const response = await api.get('/machines/dashboard/stats');
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
```

**File: `frontend/src/hooks/useCassettes.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export const cassetteKeys = {
  all: ['cassettes'] as const,
  lists: () => [...cassetteKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...cassetteKeys.lists(), filters] as const,
  detail: (id: string) => [...cassetteKeys.all, 'detail', id] as const,
};

export function useCassettes(filters: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  bankId?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}) {
  return useQuery({
    queryKey: cassetteKeys.list(filters),
    queryFn: async () => {
      const params: any = {
        page: filters.page || 1,
        limit: filters.limit || 50,
      };
      
      if (filters.status) {
        params.status = filters.status;
      }
      
      if (filters.search) {
        params.search = filters.search;
      }
      
      if (filters.bankId) {
        params.customerBankId = filters.bankId;
      }
      
      if (filters.sortField) {
        params.sortField = filters.sortField;
        params.sortDirection = filters.sortDirection || 'asc';
      }
      
      const response = await api.get('/cassettes', { params });
      return response.data;
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}
```

## 📝 Usage Examples

### Example 1: Tickets Page

**Before (useState + useEffect):**

```typescript
const [tickets, setTickets] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tickets', { params });
      setTickets(response.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  fetchTickets();
}, [page, status, search]);
```

**After (React Query):**

```typescript
const { data, isLoading, error, refetch } = useTickets({
  page: currentPage,
  limit: itemsPerPage,
  status: selectedStatus,
  search: debouncedSearchTerm,
});

const tickets = data?.data || [];
const total = data?.pagination?.total || 0;
```

### Example 2: Dashboard Stats

**Before:**

```typescript
const [stats, setStats] = useState({});
const [loadingStats, setLoadingStats] = useState(true);

useEffect(() => {
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const response = await api.get('/machines/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingStats(false);
    }
  };
  fetchStats();
}, []);
```

**After:**

```typescript
const { data: stats, isLoading: loadingStats } = useMachineStats();
```

### Example 3: Create Ticket with Optimistic Update

```typescript
const createTicket = useCreateTicket();

const handleCreate = async (formData: any) => {
  try {
    await createTicket.mutateAsync(formData);
    toast.success('Ticket created successfully');
    router.push('/tickets');
  } catch (error) {
    toast.error('Failed to create ticket');
  }
};
```

## 🚀 Migration Strategy

### Phase 1: Setup (1 jam)
1. Install package
2. Create QueryProvider
3. Wrap app with provider

### Phase 2: Core Pages (2 jam)
1. Convert dashboard page
2. Convert tickets page
3. Convert machines page

### Phase 3: Remaining Pages (1 jam)
1. Convert cassettes page
2. Convert repairs page
3. Convert resources page

## 📊 Expected Performance Improvements

- **API Calls Reduction**: 40-60% reduction melalui caching
- **Loading States**: Automatic loading states, no manual state management
- **Error Handling**: Centralized error handling
- **User Experience**: Instant data display dengan stale-while-revalidate

## 🔧 Advanced Features

### Prefetching

```typescript
const queryClient = useQueryClient();

// Prefetch ticket saat hover
const handleMouseEnter = (ticketId: string) => {
  queryClient.prefetchQuery({
    queryKey: ticketKeys.detail(ticketId),
    queryFn: () => api.get(`/tickets/${ticketId}`).then(r => r.data),
  });
};
```

### Optimistic Updates

```typescript
const updateTicket = useMutation({
  mutationFn: updateTicketApi,
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ticketKeys.detail(newData.id) });
    
    // Snapshot previous value
    const previousTicket = queryClient.getQueryData(ticketKeys.detail(newData.id));
    
    // Optimistically update
    queryClient.setQueryData(ticketKeys.detail(newData.id), newData);
    
    return { previousTicket };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(ticketKeys.detail(newData.id), context?.previousTicket);
  },
  onSettled: () => {
    // Refetch after mutation
    queryClient.invalidateQueries({ queryKey: ticketKeys.detail(newData.id) });
  },
});
```

## 📚 Resources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)
- [Query Key Factory Pattern](https://tkdodo.eu/blog/effective-react-query-keys)

---

**Last Updated**: Desember 2025

