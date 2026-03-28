import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AppSettings } from '@screen-commander/shared';
import { api } from '../lib/api';

export function useSettings() {
  return useQuery<AppSettings>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AppSettings>) => api.put<AppSettings>('/settings', data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['settings'] }); },
  });
}

export function useExportSettings() {
  return useMutation({
    mutationFn: () => api.get<AppSettings>('/settings/export'),
  });
}

export function useImportSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AppSettings) => api.post('/settings/import', data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['settings'] }); },
  });
}

export function useResetSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/settings/reset'),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['settings'] }); },
  });
}
