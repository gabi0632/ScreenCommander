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
