import type { Display } from '@prisma/client';
import type { CreateDisplayInput, UpdateDisplayInput, AssignContentInput } from '@screen-commander/shared';
import { WS_EVENTS } from '@screen-commander/shared';
import { prisma } from '../prisma';
import { getIO } from '../ws/gateway';
import { logger } from '../utils/logger';
import { spawnPlayer, killPlayer } from '../utils/player-manager';

// In-memory screenshot storage
const MAX_SCREENSHOTS = 50;
const screenshots = new Map<string, string>();

export function storeScreenshot(displayId: string, dataUrl: string): void {
  // Evict oldest entries if at capacity (and not updating an existing key)
  if (!screenshots.has(displayId) && screenshots.size >= MAX_SCREENSHOTS) {
    const oldestKey = screenshots.keys().next().value;
    if (oldestKey !== undefined) {
      screenshots.delete(oldestKey);
    }
  }
  screenshots.set(displayId, dataUrl);
}

export function getScreenshot(displayId: string): string | undefined {
  return screenshots.get(displayId);
}

export async function getAllDisplays(): Promise<Display[]> {
  return prisma.display.findMany({
    include: { currentContent: true },
    orderBy: { monitorIndex: 'asc' },
  });
}

export async function getDisplayById(id: string): Promise<Display | null> {
  return prisma.display.findUnique({
    where: { id },
    include: { currentContent: true },
  });
}

export async function createDisplay(input: CreateDisplayInput): Promise<Display> {
  const hardwareId = input.hardwareId ?? `monitor-${input.monitorIndex}-${Date.now()}`;
  const display = await prisma.display.create({
    data: {
      ...input,
      hardwareId,
    },
  });

  // Auto-launch player for this display
  if (!input.isPrimary) {
    spawnPlayer(display.id, display.monitorIndex);
  }

  return display;
}

export async function updateDisplay(id: string, input: UpdateDisplayInput): Promise<Display> {
  return prisma.display.update({
    where: { id },
    data: input,
  });
}

export async function deleteDisplay(id: string): Promise<Display> {
  // Kill the player process first
  killPlayer(id);

  // Delete related records (foreign key constraints)
  await prisma.playHistory.deleteMany({ where: { displayId: id } });
  await prisma.messageTarget.deleteMany({ where: { displayId: id } });
  await prisma.scheduleEntry.deleteMany({ where: { displayId: id } });
  return prisma.display.delete({ where: { id } });
}

export async function assignContent(displayId: string, input: AssignContentInput): Promise<Display> {
  let content = await prisma.content.findFirst({
    where: { type: input.contentType, url: input.url },
  });
  if (!content) {
    content = await prisma.content.create({
      data: {
        type: input.contentType,
        url: input.url,
      },
    });
  }

  // End previous play history entry
  await prisma.playHistory.updateMany({
    where: { displayId, endedAt: null },
    data: {
      endedAt: new Date(),
    },
  });

  // Update play history durations for ended entries
  const openEntries = await prisma.playHistory.findMany({
    where: { displayId, endedAt: { not: null }, durationSec: null },
  });
  for (const entry of openEntries) {
    if (entry.endedAt) {
      const duration = Math.floor(
        (entry.endedAt.getTime() - entry.startedAt.getTime()) / 1000,
      );
      await prisma.playHistory.update({
        where: { id: entry.id },
        data: { durationSec: duration },
      });
    }
  }

  // Create new play history entry
  await prisma.playHistory.create({
    data: {
      displayId,
      contentUrl: input.url,
      contentType: input.contentType,
    },
  });

  const display = await prisma.display.update({
    where: { id: displayId },
    data: { currentContentId: content.id },
    include: { currentContent: true },
  });

  const io = getIO();
  io.to(`display:${displayId}`).emit(WS_EVENTS.CONTENT_CHANGE, {
    contentType: input.contentType,
    url: input.url,
    transition: input.transition,
    transitionDurationMs: input.transitionDurationMs,
  });

  io.to('dashboard').emit(WS_EVENTS.CONTENT_CHANGED, {
    displayId,
    contentType: input.contentType,
    url: input.url,
  });

  logger.info(`Content assigned to display ${displayId}: ${input.url}`);

  return display;
}

export async function identifyDisplay(displayId: string): Promise<void> {
  const display = await prisma.display.findUnique({ where: { id: displayId } });
  if (!display) {
    throw new Error(`Display ${displayId} not found`);
  }

  const io = getIO();
  io.to(`display:${displayId}`).emit(WS_EVENTS.DISPLAY_IDENTIFY, {
    color: '#00d4aa',
    label: display.name,
  });
}

export async function reloadAll(): Promise<void> {
  const io = getIO();
  const displays = await prisma.display.findMany({ where: { isEnabled: true } });
  for (const display of displays) {
    io.to(`display:${display.id}`).emit(WS_EVENTS.PLAYER_RELOAD);
  }
  logger.info('Reload sent to all players');
}

export async function blackoutAll(): Promise<void> {
  const io = getIO();
  const displays = await prisma.display.findMany({ where: { isEnabled: true } });
  for (const display of displays) {
    io.to(`display:${display.id}`).emit(WS_EVENTS.CONTENT_CHANGE, {
      contentType: 'WEB_URL',
      url: 'about:blank',
      transition: 'cut',
      transitionDurationMs: 0,
    });
  }

  await prisma.display.updateMany({
    where: { isEnabled: true },
    data: { currentContentId: null },
  });

  logger.info('Blackout all displays');
}
