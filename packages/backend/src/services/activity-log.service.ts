import type {
  ActivityLogEntry,
  ActivityLogResponse,
  ActivityEventType,
} from '@screen-commander/shared';
import { prisma } from '../prisma';

interface RawEvent {
  id: string;
  type: ActivityEventType;
  timestamp: Date;
  displayId: string | null;
  displayName: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
}

export async function getActivityLog(
  page = 1,
  pageSize = 50,
  eventType?: ActivityEventType,
  displayId?: string,
): Promise<ActivityLogResponse> {
  const displayNameMap = new Map<string, string>();
  const displays = await prisma.display.findMany({
    select: { id: true, name: true },
  });
  for (const d of displays) {
    displayNameMap.set(d.id, d.name);
  }

  const events: RawEvent[] = [];

  // 1. Content changes from PlayHistory
  const playHistoryWhere: Record<string, unknown> = {};
  if (displayId) playHistoryWhere['displayId'] = displayId;

  const playHistory = await prisma.playHistory.findMany({
    where: playHistoryWhere,
    orderBy: { startedAt: 'desc' },
    take: 200,
  });

  for (const entry of playHistory) {
    events.push({
      id: `ph-${entry.id}`,
      type: 'content_change',
      timestamp: entry.startedAt,
      displayId: entry.displayId,
      displayName: displayNameMap.get(entry.displayId) ?? null,
      description: `תוכן הוחלף ל-${entry.contentType}: ${entry.contentUrl}`,
      metadata: {
        contentUrl: entry.contentUrl,
        contentType: entry.contentType,
        durationSec: entry.durationSec,
      },
    });
  }

  // 2. Messages sent
  const textMessages = await prisma.textMessage.findMany({
    where: { sentAt: { not: null } },
    orderBy: { sentAt: 'desc' },
    take: 200,
    include: {
      targets: {
        select: { displayId: true },
      },
    },
  });

  for (const msg of textMessages) {
    const targetNames = msg.targets
      .map((t) => displayNameMap.get(t.displayId) ?? t.displayId)
      .join(', ');

    // Skip if filtering by display and message doesn't target it
    if (displayId && !msg.targets.some((t) => t.displayId === displayId)) {
      continue;
    }

    if (msg.sentAt) {
      events.push({
        id: `msg-sent-${msg.id}`,
        type: 'message_sent',
        timestamp: msg.sentAt,
        displayId: msg.targets.length === 1 ? msg.targets[0]!.displayId : null,
        displayName: msg.targets.length === 1
          ? (displayNameMap.get(msg.targets[0]!.displayId) ?? null)
          : null,
        description: `הודעה נשלחה: "${msg.text?.slice(0, 60) || '(תמונה)'}${msg.text && msg.text.length > 60 ? '...' : ''}" ← ${targetNames || 'כל המסכים'}`,
        metadata: {
          messageId: msg.id,
          text: msg.text,
          position: msg.position,
          priority: msg.priority,
          targetCount: msg.targets.length,
          source: msg.source,
        },
      });
    }

    if (msg.dismissedAt) {
      events.push({
        id: `msg-dismiss-${msg.id}`,
        type: 'message_dismissed',
        timestamp: msg.dismissedAt,
        displayId: msg.targets.length === 1 ? msg.targets[0]!.displayId : null,
        displayName: msg.targets.length === 1
          ? (displayNameMap.get(msg.targets[0]!.displayId) ?? null)
          : null,
        description: `הודעה הופסקה: "${msg.text?.slice(0, 40) || '(תמונה)'}${msg.text && msg.text.length > 40 ? '...' : ''}"`,
        metadata: {
          messageId: msg.id,
        },
      });
    }
  }

  // Sort all events by timestamp descending
  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Filter by event type if specified
  const filtered = eventType
    ? events.filter((e) => e.type === eventType)
    : events;

  const total = filtered.length;
  const offset = (page - 1) * pageSize;
  const paged = filtered.slice(offset, offset + pageSize);

  const entries: ActivityLogEntry[] = paged.map((e) => ({
    id: e.id,
    type: e.type,
    timestamp: e.timestamp.toISOString(),
    displayId: e.displayId,
    displayName: e.displayName,
    description: e.description,
    metadata: e.metadata,
  }));

  return {
    entries,
    total,
    page,
    pageSize,
  };
}
