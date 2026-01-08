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
}, enabled: boolean = true) {
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
    // Data dianggap fresh selama 3 menit - balance antara freshness dan performance
    staleTime: 3 * 60 * 1000,
    // Auto-refetch setiap 3 menit untuk update (sama dengan useTicketCounts)
    refetchInterval: 3 * 60 * 1000,
    // Enable refetch on window focus untuk update saat user kembali ke tab
    refetchOnWindowFocus: true,
    // Enable refetch on reconnect
    refetchOnReconnect: true,
    // Always refetch on mount untuk memastikan data terbaru
    refetchOnMount: true,
    enabled, // Hanya fetch jika enabled
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

