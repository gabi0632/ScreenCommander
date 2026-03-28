import type {
  AnalyticsSummary,
  UptimeStat,
  ContentUsageStat,
  ActivityPoint,
  PlayHistoryEntry,
} from '@screen-commander/shared';
import { prisma } from '../prisma';

export async function getSummary(): Promise<AnalyticsSummary> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [activeDisplays, allDisplays, messagesToday, contentChangesToday] = await Promise.all([
    prisma.display.count({
      where: { status: { in: ['ONLINE', 'PLAYING', 'IDLE'] } },
    }),
    prisma.display.findMany({
      where: { isEnabled: true },
      select: { playHistory: { select: { startedAt: true, endedAt: true, durationSec: true } } },
    }),
    prisma.textMessage.count({
      where: { sentAt: { gte: todayStart } },
    }),
    prisma.playHistory.count({
      where: { startedAt: { gte: todayStart } },
    }),
  ]);

  // Calculate average uptime from play history
  let totalUptimeHours = 0;
  let displayCount = 0;
  for (const display of allDisplays) {
    let displayUptime = 0;
    for (const entry of display.playHistory) {
      if (entry.durationSec !== null) {
        displayUptime += entry.durationSec;
      } else if (entry.endedAt === null) {
        displayUptime += (Date.now() - entry.startedAt.getTime()) / 1000;
      }
    }
    if (displayUptime > 0) {
      totalUptimeHours += displayUptime / 3600;
      displayCount++;
    }
  }

  return {
    totalActiveDisplays: activeDisplays,
    averageUptimeHours: displayCount > 0
      ? Math.round((totalUptimeHours / displayCount) * 100) / 100
      : 0,
    messagesToday,
    contentChangesToday,
  };
}

export async function getUptimeStats(): Promise<UptimeStat[]> {
  const displays = await prisma.display.findMany({
    where: { isEnabled: true },
    include: {
      playHistory: {
        select: { startedAt: true, endedAt: true, durationSec: true },
      },
    },
  });

  return displays.map((display) => {
    let totalSeconds = 0;
    for (const entry of display.playHistory) {
      if (entry.durationSec !== null) {
        totalSeconds += entry.durationSec;
      } else if (entry.endedAt === null) {
        totalSeconds += (Date.now() - entry.startedAt.getTime()) / 1000;
      }
    }

    return {
      displayId: display.id,
      displayName: display.name,
      uptimeHours: Math.round((totalSeconds / 3600) * 100) / 100,
    };
  });
}

export async function getContentUsageStats(): Promise<ContentUsageStat[]> {
  const history = await prisma.playHistory.findMany({
    select: { contentType: true },
  });

  const counts = new Map<string, number>();
  for (const entry of history) {
    counts.set(entry.contentType, (counts.get(entry.contentType) ?? 0) + 1);
  }

  const total = history.length || 1;

  return Array.from(counts.entries()).map(([contentType, count]) => ({
    contentType,
    count,
    percentage: Math.round((count / total) * 10000) / 100,
  }));
}

export async function getActivityTimeline(): Promise<ActivityPoint[]> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const history = await prisma.playHistory.findMany({
    where: { startedAt: { gte: todayStart } },
    select: { startedAt: true },
    orderBy: { startedAt: 'asc' },
  });

  // Group by hour
  const hourCounts = new Map<string, number>();
  for (let h = 0; h < 24; h++) {
    const hourLabel = `${String(h).padStart(2, '0')}:00`;
    hourCounts.set(hourLabel, 0);
  }

  for (const entry of history) {
    const hour = `${String(entry.startedAt.getHours()).padStart(2, '0')}:00`;
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }

  return Array.from(hourCounts.entries()).map(([hour, changes]) => ({
    hour,
    changes,
  }));
}

export async function getPlayHistory(
  displayId?: string,
  limit = 50,
): Promise<PlayHistoryEntry[]> {
  const where = displayId ? { displayId } : {};

  const entries = await prisma.playHistory.findMany({
    where,
    orderBy: { startedAt: 'desc' },
    take: limit,
  });

  return entries.map((entry) => ({
    id: entry.id,
    displayId: entry.displayId,
    contentUrl: entry.contentUrl,
    contentType: entry.contentType,
    startedAt: entry.startedAt.toISOString(),
    endedAt: entry.endedAt?.toISOString() ?? null,
    durationSec: entry.durationSec,
  }));
}
