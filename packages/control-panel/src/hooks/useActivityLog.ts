import { useQuery } from '@tanstack/react-query';
import type { ActivityLogResponse, ActivityEventType } from '@screen-commander/shared';
import { api } from '../lib/api';

interface UseActivityLogParams {
  page?: number;
  pageSize?: number;
  type?: ActivityEventType;
  displayId?: string;
}

export function useActivityLog(params: UseActivityLogParams = {}) {
  const { page = 1, pageSize = 50, type, displayId } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('pageSize', String(pageSize));
  if (type) searchParams.set('type', type);
  if (displayId) searchParams.set('displayId', displayId);

  return useQuery<ActivityLogResponse>({
    queryKey: ['activity-log', page, pageSize, type, displayId],
    queryFn: () => api.get(`/activity-log?${searchParams.toString()}`),
    refetchInterval: 15_000,
  });
}
