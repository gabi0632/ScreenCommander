import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TextMessage } from '@screen-commander/shared';
import { api } from '../lib/api';

interface RedAlertStatus {
  enabled: boolean;
  connected: boolean;
  lastAlertAt: string | null;
  alertCount: number;
}

export interface AlertCity {
  id: number;
  name: string;
  nameEn: string;
  area: number;
  countdown: number;
}

export function useAlertCities() {
  return useQuery<AlertCity[]>({
    queryKey: ['red-alert', 'cities'],
    queryFn: () => api.get('/red-alert/cities'),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useRedAlertStatus() {
  return useQuery<RedAlertStatus>({
    queryKey: ['red-alert', 'status'],
    queryFn: () => api.get('/red-alert/status'),
    refetchInterval: 10_000,
  });
}

export function useRedAlertHistory() {
  return useQuery<TextMessage[]>({
    queryKey: ['red-alert', 'history'],
    queryFn: () => api.get('/red-alert/history'),
  });
}

export function useTestRedAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alertType?: string) => api.post<{ success: boolean }>('/red-alert/test', { alertType }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['red-alert'] });
      void qc.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useRestartRedAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<RedAlertStatus>('/red-alert/restart'),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['red-alert', 'status'] });
    },
  });
}
