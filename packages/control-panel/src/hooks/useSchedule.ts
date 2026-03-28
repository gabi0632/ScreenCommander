import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ScheduleEntry } from '@screen-commander/shared';
import { api } from '../lib/api';

export function useSchedule() {
  return useQuery<ScheduleEntry[]>({
    queryKey: ['schedule'],
    queryFn: () => api.get('/schedule'),
  });
}

interface CreateScheduleInput {
  displayId: string;
  contentUrl: string;
  contentType: string;
  startTime: string;
  endTime: string | null;
  recurrenceRule: string | null;
  priority: number;
}

export function useCreateScheduleEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateScheduleInput) => api.post<ScheduleEntry>('/schedule', data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['schedule'] }); },
  });
}

export function useUpdateScheduleEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<CreateScheduleInput>) =>
      api.put<ScheduleEntry>(`/schedule/${id}`, data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['schedule'] }); },
  });
}

export function useDeleteScheduleEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/schedule/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['schedule'] }); },
  });
}
