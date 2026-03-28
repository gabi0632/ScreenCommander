import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TextMessage, MessagePosition, MessageAnimation, MessagePriority } from '@screen-commander/shared';
import { api } from '../lib/api';

export function useMessages() {
  return useQuery<TextMessage[]>({
    queryKey: ['messages'],
    queryFn: () => api.get('/messages'),
  });
}

export function useActiveMessages() {
  return useQuery<TextMessage[]>({
    queryKey: ['messages', 'active'],
    queryFn: () => api.get('/messages/active'),
    refetchInterval: 5000,
  });
}

interface SendMessageInput {
  text: string;
  imageUrl?: string;
  imageSize?: number;
  targetDisplayIds: string[];
  position: MessagePosition;
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  animation: MessageAnimation;
  displayDuration: number;
  priority: MessagePriority;
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SendMessageInput) => api.post<TextMessage>('/messages', data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['messages'] }); void qc.invalidateQueries({ queryKey: ['messages', 'active'] }); },
  });
}

export function useDismissMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/messages/${id}/dismiss`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['messages'] }); void qc.invalidateQueries({ queryKey: ['messages', 'active'] }); },
  });
}

export function useDismissAllMessages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/messages/dismiss-all'),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['messages'] }); void qc.invalidateQueries({ queryKey: ['messages', 'active'] }); },
  });
}

export function useResendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/messages/${id}/resend`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['messages'] }); void qc.invalidateQueries({ queryKey: ['messages', 'active'] }); },
  });
}
