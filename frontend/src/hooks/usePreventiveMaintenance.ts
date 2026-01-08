import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// Query Keys - untuk cache management
export const preventiveMaintenanceKeys = {
  all: ['preventive-maintenance'] as const,
  lists: () => [...preventiveMaintenanceKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...preventiveMaintenanceKeys.lists(), filters] as const,
  details: () => [...preventiveMaintenanceKeys.all, 'detail'] as const,
  detail: (id: string) => [...preventiveMaintenanceKeys.details(), id] as const,
};

// Fetch preventive maintenance tasks dengan filters
export function usePreventiveMaintenance(filters: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  dateFilter?: string;
}, enabled: boolean = true) {
  return useQuery({
    queryKey: preventiveMaintenanceKeys.list(filters),
    queryFn: async () => {
      const params: any = {
        page: filters.page || 1,
        limit: filters.limit || 15,
      };
      
      if (filters.search && filters.search.trim()) {
        params.search = filters.search.trim();
      }
      
      if (filters.status && filters.status !== 'ALL') {
        params.status = filters.status;
      }
      
      if (filters.dateFilter && filters.dateFilter !== 'ALL') {
        params.dateFilter = filters.dateFilter;
      }
      
      const response = await api.get('/preventive-maintenance', { params });
      return response.data;
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    enabled,
  });
}

// Fetch single PM task
export function usePreventiveMaintenanceDetail(id: string | null) {
  return useQuery({
    queryKey: preventiveMaintenanceKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get(`/preventive-maintenance/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Take PM task mutation
export function useTakePMTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (pmId: string) => {
      const response = await api.post(`/preventive-maintenance/${pmId}/take`);
      return response.data;
    },
    onSuccess: (data, pmId) => {
      // Invalidate PM list
      queryClient.invalidateQueries({ queryKey: preventiveMaintenanceKeys.lists() });
      // Update PM detail cache
      queryClient.invalidateQueries({ queryKey: preventiveMaintenanceKeys.detail(pmId) });
    },
  });
}

// Create PM mutation
export function useCreatePreventiveMaintenance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/preventive-maintenance', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate PM list untuk refetch
      queryClient.invalidateQueries({ queryKey: preventiveMaintenanceKeys.lists() });
    },
  });
}

// Update PM mutation
export function useUpdatePreventiveMaintenance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.patch(`/preventive-maintenance/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Update cache untuk PM yang di-update
      queryClient.setQueryData(preventiveMaintenanceKeys.detail(variables.id), data);
      // Invalidate list untuk refetch
      queryClient.invalidateQueries({ queryKey: preventiveMaintenanceKeys.lists() });
    },
  });
}

// Cancel PM mutation
export function useCancelPreventiveMaintenance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await api.post(`/preventive-maintenance/${id}/cancel`, { reason });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Update cache
      queryClient.setQueryData(preventiveMaintenanceKeys.detail(variables.id), data);
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: preventiveMaintenanceKeys.lists() });
    },
  });
}

// Delete PM mutation
export function useDeletePreventiveMaintenance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/preventive-maintenance/${id}`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate PM list
      queryClient.invalidateQueries({ queryKey: preventiveMaintenanceKeys.lists() });
    },
  });
}

