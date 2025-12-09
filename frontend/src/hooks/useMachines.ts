import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export const machineKeys = {
  all: ['machines'] as const,
  lists: () => [...machineKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...machineKeys.lists(), filters] as const,
  detail: (id: string) => [...machineKeys.all, 'detail', id] as const,
  dashboard: () => [...machineKeys.all, 'dashboard'] as const,
  banks: () => [...machineKeys.all, 'banks'] as const,
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

export function useMachineStats(enabled: boolean = true) {
  return useQuery({
    queryKey: machineKeys.dashboard(),
    queryFn: async () => {
      const response = await api.get('/machines/dashboard/stats');
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled, // Only fetch if enabled
  });
}

export function useBanks() {
  return useQuery({
    queryKey: machineKeys.banks(),
    queryFn: async () => {
      const response = await api.get('/banks');
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - banks jarang berubah
  });
}

