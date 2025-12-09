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
}, enabled: boolean = true) {
  return useQuery({
    queryKey: cassetteKeys.list(filters),
    queryFn: async () => {
      const params: any = {
        page: filters.page || 1,
        limit: filters.limit || 50,
      };
      
      if (filters.status && filters.status !== 'all') {
        params.status = filters.status;
      }
      
      // Cassettes API uses 'keyword' instead of 'search'
      if (filters.search) {
        params.keyword = filters.search;
      }
      
      if (filters.bankId) {
        params.customerBankId = filters.bankId;
      }
      
      if (filters.sortField) {
        params.sortBy = filters.sortField;
        params.sortOrder = filters.sortDirection || 'asc';
      }
      
      const response = await api.get('/cassettes', { params });
      return response.data;
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    enabled,
  });
}

