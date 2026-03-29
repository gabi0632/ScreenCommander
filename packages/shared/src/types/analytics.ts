export interface AnalyticsSummary {
  totalActiveDisplays: number;
  averageUptimeHours: number;
  messagesToday: number;
  contentChangesToday: number;
}

export interface UptimeStat {
  displayId: string;
  displayName: string;
  uptimeHours: number;
}

export interface ContentUsageStat {
  contentType: string;
  count: number;
  percentage: number;
}

export interface ActivityPoint {
  hour: string;
  changes: number;
}

export interface PlayHistoryEntry {
  id: string;
  displayId: string;
  contentUrl: string;
  contentType: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number | null;
}

export type ActivityEventType =
  | 'content_change'
  | 'message_sent'
  | 'message_dismissed'
  | 'display_online'
  | 'display_offline'
  | 'schedule_triggered'
  | 'system';

export interface ActivityLogEntry {
  id: string;
  type: ActivityEventType;
  timestamp: string;
  displayId: string | null;
  displayName: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
}

export interface ActivityLogResponse {
  entries: ActivityLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}
