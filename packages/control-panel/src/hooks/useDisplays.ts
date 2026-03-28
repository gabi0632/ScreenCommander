import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Display, ContentAssignment } from '@screen-commander/shared';
import { api } from '../lib/api';

export function useDisplays() {
  return useQuery<Display[]>({
    queryKey: ['displays'],
    queryFn: () => api.get('/displays'),
  });
}

export function useDisplay(id: string) {
  return useQuery<Display>({
    queryKey: ['displays', id],
    queryFn: () => api.get(`/displays/${id}`),
    enabled: !!id,
  });
}

export function useCreateDisplay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; monitorIndex: number; connectionType: string; portLabel: string; width: number; height: number; posX: number; posY: number }) =>
      api.post<Display>('/displays', data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['displays'] }); },
  });
}

export function useUpdateDisplay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; isEnabled?: boolean; audioDeviceId?: string | null }) =>
      api.put<Display>(`/displays/${id}`, data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['displays'] }); },
  });
}

export function useDeleteDisplay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/displays/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['displays'] }); },
  });
}

export function useAssignContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ displayId, ...content }: ContentAssignment & { displayId: string }) =>
      api.post(`/displays/${displayId}/content`, content),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['displays'] }); },
  });
}

interface AudioDevice {
  name: string;
  deviceId: string;
}

export function useAudioDevices() {
  return useQuery<AudioDevice[]>({
    queryKey: ['audio-devices'],
    queryFn: () => api.get('/system/audio-devices'),
    staleTime: 60_000,
  });
}

export function useIdentifyDisplay() {
  return useMutation({
    mutationFn: (id: string) => api.post(`/displays/${id}/identify`),
  });
}

export function useReloadAll() {
  return useMutation({
    mutationFn: () => api.post('/displays/reload-all'),
  });
}

export function useBlackoutAll() {
  return useMutation({
    mutationFn: () => api.post('/displays/blackout-all'),
  });
}
