import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TickerConfig, CreateTickerMessageInput, UpdateTickerMessageInput, UpdateTickerConfigInput } from '@screen-commander/shared';
import { api } from '../lib/api';

export function useTicker() {
  return useQuery<TickerConfig>({
    queryKey: ['ticker'],
    queryFn: () => api.get('/ticker'),
  });
}

export function useUpdateTickerConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateTickerConfigInput) => api.put<TickerConfig>('/ticker', data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['ticker'] }); },
  });
}

export function useAddTickerMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTickerMessageInput) => api.post<TickerConfig>('/ticker/messages', data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['ticker'] }); },
  });
}

export function useUpdateTickerMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTickerMessageInput }) =>
      api.put<TickerConfig>(`/ticker/messages/${id}`, data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['ticker'] }); },
  });
}

export function useDeleteTickerMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<TickerConfig>(`/ticker/messages/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['ticker'] }); },
  });
}

export function useReorderTickerMessages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.post<TickerConfig>('/ticker/messages/reorder', { ids }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['ticker'] }); },
  });
}
