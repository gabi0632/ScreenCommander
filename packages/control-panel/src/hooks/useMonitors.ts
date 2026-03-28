import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DetectedMonitor } from '@screen-commander/shared';
import { api } from '../lib/api';

export function useMonitors() {
  return useQuery<DetectedMonitor[]>({
    queryKey: ['monitors'],
    queryFn: () => api.get('/system/monitors'),
  });
}

export function useScanMonitors() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<DetectedMonitor[]>('/system/scan'),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['monitors'] }); },
  });
}
