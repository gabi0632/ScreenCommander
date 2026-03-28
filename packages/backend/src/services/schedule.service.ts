import type { ScheduleEntry } from '@prisma/client';
import type { CreateScheduleInput, UpdateScheduleInput } from '@screen-commander/shared';
import { WS_EVENTS } from '@screen-commander/shared';
import cron from 'node-cron';
import { prisma } from '../prisma';
import { getIO } from '../ws/gateway';
import { logger } from '../utils/logger';

let schedulerTask: cron.ScheduledTask | null = null;

/**
 * Match a single cron field against a value.
 * Supports: '*', single number, comma-separated, ranges ('1-5'), and step ('* /5').
 */
function matchField(field: string, value: number): boolean {
  if (field === '*') return true;

  for (const part of field.split(',')) {
    const trimmed = part.trim();

    // Step pattern: */N or N-M/S
    if (trimmed.includes('/')) {
      const [range, stepStr] = trimmed.split('/');
      const step = parseInt(stepStr!, 10);
      if (isNaN(step) || step <= 0) continue;
      if (range === '*') {
        if (value % step === 0) return true;
      } else if (range!.includes('-')) {
        const [lo, hi] = range!.split('-').map(Number);
        if (value >= lo! && value <= hi! && (value - lo!) % step === 0) return true;
      }
      continue;
    }

    // Range pattern: N-M
    if (trimmed.includes('-')) {
      const [lo, hi] = trimmed.split('-').map(Number);
      if (value >= lo! && value <= hi!) return true;
      continue;
    }

    // Exact number
    if (parseInt(trimmed, 10) === value) return true;
  }

  return false;
}

/**
 * Check if a cron expression matches the given date.
 * Format: "minute hour dayOfMonth month dayOfWeek"
 */
function checkCronMatch(cronExpr: string, date: Date): boolean {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts as [string, string, string, string, string];

  return (
    matchField(minute, date.getMinutes()) &&
    matchField(hour, date.getHours()) &&
    matchField(dayOfMonth, date.getDate()) &&
    matchField(month, date.getMonth() + 1) &&
    matchField(dayOfWeek, date.getDay())
  );
}

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

export async function createScheduleEntry(input: CreateScheduleInput & { contentId: string }): Promise<ScheduleEntry> {
  return prisma.scheduleEntry.create({
    data: {
      displayId: input.displayId,
      contentId: input.contentId,
      startTime: new Date(input.startTime),
      endTime: input.endTime ? new Date(input.endTime) : null,
      recurrenceRule: input.recurrenceRule ?? null,
      durationSeconds: input.durationSeconds ?? null,
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

  // Also check recurring entries that match the current time
  const recurringEntries = await prisma.scheduleEntry.findMany({
    where: {
      isActive: true,
      recurrenceRule: { not: null },
    },
    include: { display: true, content: true },
    orderBy: { priority: 'desc' },
  });

  for (const entry of recurringEntries) {
    if (entry.recurrenceRule && checkCronMatch(entry.recurrenceRule, now)) {
      // Check if endTime hasn't passed (if set)
      if (!entry.endTime || entry.endTime > now) {
        dueEntries.push(entry);
      }
    }
  }

  // Filter out recurring+duration entries whose duration window has passed
  // For recurring entries with durationSeconds: only show content for durationSeconds
  // after the cron match minute starts (i.e., within the first durationSeconds of the matched minute)
  const filteredDueEntries = dueEntries.filter((entry) => {
    if (!entry.recurrenceRule || !entry.durationSeconds) return true;
    // For recurring+duration: check if we're within durationSeconds of the minute start
    const secondsIntoMinute = now.getSeconds();
    // The cron fires at minute boundary; content should show for durationSeconds
    // Since we check every 30s, we approximate: if durationSeconds < 30, it may be missed
    // Use a wider window: content active if current second-of-minute < durationSeconds
    // For longer durations, we track from the minute start
    return secondsIntoMinute < entry.durationSeconds;
  });

  // Group by display, highest priority wins
  const displayContentMap = new Map<string, { contentType: string; url: string; entryIds: string[]; hasRecurrence: boolean }>();

  // Sort combined entries by priority desc so highest priority is first
  dueEntries.sort((a, b) => b.priority - a.priority);

  for (const entry of filteredDueEntries) {
    const existing = displayContentMap.get(entry.displayId);
    if (!existing) {
      displayContentMap.set(entry.displayId, {
        contentType: entry.content.type,
        url: entry.content.url,
        entryIds: [entry.id],
        hasRecurrence: !!entry.recurrenceRule,
      });
    } else {
      existing.entryIds.push(entry.id);
    }
  }

  const io = getIO();

  for (const [displayId, content] of displayContentMap) {
    const display = await prisma.display.findUnique({
      where: { id: displayId },
      include: { currentContent: true },
    });

    if (display?.currentContent?.url !== content.url) {
      // Content needs to change — save current as fallback before switching
      const contentRecord = await prisma.content.findFirst({
        where: { url: content.url, type: content.contentType },
      });

      if (contentRecord) {
        const updateData: Record<string, unknown> = {
          currentContentId: contentRecord.id,
        };
        // Save current content as fallback (only if not already saved from a previous schedule)
        if (!display?.fallbackContentId && display?.currentContentId) {
          updateData['fallbackContentId'] = display.currentContentId;
        }

        await prisma.display.update({
          where: { id: displayId },
          data: updateData,
        });

        io.to(`display:${displayId}`).emit(WS_EVENTS.CONTENT_CHANGE, {
          contentType: content.contentType,
          url: content.url,
          transition: 'fade',
          transitionDurationMs: 500,
        });

        logger.info(`Scheduler: switched display ${displayId} to ${content.url}`);

        // Deactivate one-time (non-recurring) entries that just triggered
        // For entries with durationSeconds, set endTime so the restore logic picks them up
        for (const entryId of content.entryIds) {
          const entry = dueEntries.find((e) => e.id === entryId);
          if (!entry) continue;
          if (!entry.recurrenceRule) {
            if (entry.durationSeconds && !entry.endTime) {
              // One-time + duration: set endTime = now + duration so restore triggers later
              await prisma.scheduleEntry.update({
                where: { id: entryId },
                data: { endTime: new Date(now.getTime() + entry.durationSeconds * 1000) },
              });
            } else if (!entry.durationSeconds) {
              // One-time without duration: deactivate immediately
              await prisma.scheduleEntry.update({
                where: { id: entryId },
                data: { isActive: false },
              });
            }
          }
        }
      }
    }
  }

  // ── Restore fallback content for displays that have no active schedule ──
  // Find ALL displays that have a fallbackContentId saved (meaning a schedule changed their content)
  const displaysWithFallback = await prisma.display.findMany({
    where: { fallbackContentId: { not: null } },
    include: { fallbackContent: true, currentContent: true },
  });

  for (const display of displaysWithFallback) {
    // Skip if an active schedule is currently serving this display
    if (displayContentMap.has(display.id)) continue;

    // No active schedule for this display — restore the fallback
    if (display.fallbackContent) {
      await prisma.display.update({
        where: { id: display.id },
        data: {
          currentContentId: display.fallbackContentId,
          fallbackContentId: null,
        },
      });

      io.to(`display:${display.id}`).emit(WS_EVENTS.CONTENT_CHANGE, {
        contentType: display.fallbackContent.type,
        url: display.fallbackContent.url,
        transition: 'fade',
        transitionDurationMs: 500,
      });

      io.to('dashboard').emit(WS_EVENTS.CONTENT_CHANGED, {
        displayId: display.id,
        contentType: display.fallbackContent.type,
        url: display.fallbackContent.url,
      });

      logger.info(`Scheduler: restored previous content for display ${display.id}`);
    } else {
      // Fallback ID exists but content was deleted — clear
      await prisma.display.update({
        where: { id: display.id },
        data: { fallbackContentId: null },
      });
    }
  }

  // Deactivate expired non-recurring entries
  await prisma.scheduleEntry.updateMany({
    where: {
      isActive: true,
      recurrenceRule: null,
      endTime: { not: null, lt: now },
    },
    data: { isActive: false },
  });
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
