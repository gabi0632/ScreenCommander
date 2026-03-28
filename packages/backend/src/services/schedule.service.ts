import type { ScheduleEntry } from '@prisma/client';
import type { CreateScheduleInput, UpdateScheduleInput } from '@screen-commander/shared';
import { WS_EVENTS } from '@screen-commander/shared';
import cron from 'node-cron';
import { prisma } from '../prisma';
import { getIO } from '../ws/gateway';
import { logger } from '../utils/logger';

let schedulerTask: cron.ScheduledTask | null = null;

export async function getAllScheduleEntries(): Promise<ScheduleEntry[]> {
  return prisma.scheduleEntry.findMany({
    include: { display: true, content: true },
    orderBy: { startTime: 'asc' },
  });
}

export async function getScheduleEntryById(id: string): Promise<ScheduleEntry | null> {
  return prisma.scheduleEntry.findUnique({
    where: { id },
    include: { display: true, content: true },
  });
}

export async function createScheduleEntry(input: CreateScheduleInput): Promise<ScheduleEntry> {
  return prisma.scheduleEntry.create({
    data: {
      displayId: input.displayId,
      contentId: input.contentId,
      startTime: new Date(input.startTime),
      endTime: input.endTime ? new Date(input.endTime) : null,
      recurrenceRule: input.recurrenceRule ?? null,
      priority: input.priority,
      isActive: input.isActive,
    },
    include: { display: true, content: true },
  });
}

export async function updateScheduleEntry(
  id: string,
  input: UpdateScheduleInput,
): Promise<ScheduleEntry> {
  const data: Record<string, unknown> = {};
  if (input.startTime !== undefined) data['startTime'] = new Date(input.startTime);
  if (input.endTime !== undefined) data['endTime'] = input.endTime ? new Date(input.endTime) : null;
  if (input.recurrenceRule !== undefined) data['recurrenceRule'] = input.recurrenceRule ?? null;
  if (input.priority !== undefined) data['priority'] = input.priority;
  if (input.isActive !== undefined) data['isActive'] = input.isActive;

  return prisma.scheduleEntry.update({
    where: { id },
    data,
    include: { display: true, content: true },
  });
}

export async function deleteScheduleEntry(id: string): Promise<ScheduleEntry> {
  return prisma.scheduleEntry.delete({ where: { id } });
}

async function checkSchedule(): Promise<void> {
  const now = new Date();

  // Find entries that should be active now
  const dueEntries = await prisma.scheduleEntry.findMany({
    where: {
      isActive: true,
      startTime: { lte: now },
      OR: [
        { endTime: null },
        { endTime: { gt: now } },
      ],
    },
    include: { display: true, content: true },
    orderBy: { priority: 'desc' },
  });

  // Group by display, highest priority wins
  const displayContentMap = new Map<string, { contentType: string; url: string }>();

  for (const entry of dueEntries) {
    if (!displayContentMap.has(entry.displayId)) {
      displayContentMap.set(entry.displayId, {
        contentType: entry.content.type,
        url: entry.content.url,
      });
    }
  }

  const io = getIO();

  for (const [displayId, content] of displayContentMap) {
    const display = await prisma.display.findUnique({
      where: { id: displayId },
      include: { currentContent: true },
    });

    if (display?.currentContent?.url !== content.url) {
      // Content needs to change
      const contentRecord = await prisma.content.findFirst({
        where: { url: content.url, type: content.contentType },
      });

      if (contentRecord) {
        await prisma.display.update({
          where: { id: displayId },
          data: { currentContentId: contentRecord.id },
        });

        io.to(`display:${displayId}`).emit(WS_EVENTS.CONTENT_CHANGE, {
          contentType: content.contentType,
          url: content.url,
          transition: 'fade',
          transitionDurationMs: 500,
        });

        logger.info(`Scheduler: switched display ${displayId} to ${content.url}`);
      }
    }
  }

  // Handle expired entries — clear displays that have no more active scheduled content
  const expiredDisplays = await prisma.scheduleEntry.findMany({
    where: {
      isActive: true,
      endTime: { not: null, lt: now },
    },
    select: { displayId: true },
    distinct: ['displayId'],
  });

  for (const { displayId } of expiredDisplays) {
    if (!displayContentMap.has(displayId)) {
      // No active schedule for this display, check if it has scheduled content
      const display = await prisma.display.findUnique({
        where: { id: displayId },
      });
      if (display?.currentContentId) {
        // Only clear if this content was set by schedule
        logger.info(`Scheduler: schedule expired for display ${displayId}`);
      }
    }
  }
}

export function startScheduler(): void {
  if (schedulerTask) {
    schedulerTask.stop();
  }

  // Check every 30 seconds
  schedulerTask = cron.schedule('*/30 * * * * *', () => {
    checkSchedule().catch((err) => {
      logger.error('Scheduler check failed', err);
    });
  });

  logger.info('Scheduler engine started (30s interval)');
}

export function stopScheduler(): void {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    logger.info('Scheduler engine stopped');
  }
}
