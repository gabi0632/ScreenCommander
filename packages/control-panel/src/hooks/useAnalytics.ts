import { useQuery } from '@tanstack/react-query';
import type {
  AnalyticsSummary,
  UptimeStat,
  ContentUsageStat,
  ActivityPoint,
  PlayHistoryEntry,
} from '@screen-commander/shared';
import { api } from '../lib/api';

export function useAnalyticsSummary() {
  return useQuery<AnalyticsSummary>({
    queryKey: ['analytics', 'summary'],
    queryFn: () => api.get('/analytics/summary'),
    refetchInterval: 30_000,
  });
}

export function useUptimeStats() {
  return useQuery<UptimeStat[]>({
    queryKey: ['analytics', 'uptime'],
    queryFn: () => api.get('/analytics/uptime'),
  });
}

export function useContentUsage() {
  return useQuery<ContentUsageStat[]>({
    queryKey: ['analytics', 'content-usage'],
    queryFn: () => api.get('/analytics/content-usage'),
  });
}

export function useActivity() {
  return useQuery<ActivityPoint[]>({
    queryKey: ['analytics', 'activity'],
    queryFn: () => api.get('/analytics/activity'),
  });
}

export function usePlayHistory() {
  return useQuery<PlayHistoryEntry[]>({
    queryKey: ['analytics', 'history'],
    queryFn: () => api.get('/analytics/history'),
  });
}
