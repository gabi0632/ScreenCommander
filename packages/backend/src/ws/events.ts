import type { Socket } from 'socket.io';
import {
  WS_EVENTS,
  playerRegisterSchema,
  playerHeartbeatSchema,
  playerErrorSchema,
  contentLoadedSchema,
  overlayExpiredSchema,
} from '@screen-commander/shared';
import { prisma } from '../prisma';
import { logger } from '../utils/logger';
import { getTickerPayloadForDisplay } from '../services/ticker.service';
import { getActiveMessages } from '../services/messages.service';

export async function handlePlayerRegister(socket: Socket, data: unknown): Promise<void> {
  const result = playerRegisterSchema.safeParse(data);
  if (!result.success) {
    logger.warn('Invalid player:register payload', result.error.flatten());
    return;
  }

  const { displayId } = result.data;

  await socket.join(`display:${displayId}`);

  await prisma.display.update({
    where: { id: displayId },
    data: { status: 'ONLINE' },
  }).catch(() => {
    logger.warn(`Display ${displayId} not found in DB during registration`);
  });

  socket.data['displayId'] = displayId;

  socket.to('dashboard').emit(WS_EVENTS.DISPLAY_STATUS_CHANGED, {
    displayId,
    status: 'ONLINE',
  });

  // Push current ticker state to the newly registered player
  getTickerPayloadForDisplay(displayId)
    .then((payload) => {
      socket.emit(WS_EVENTS.TICKER_UPDATE, payload);
    })
    .catch((err) => {
      logger.warn(`Failed to push ticker to display ${displayId}:`, err);
    });

  // Push active overlays to the newly registered player
  getActiveMessages()
    .then((activeMessages) => {
      const now = Date.now();
      for (const msg of activeMessages) {
        const targetsThisDisplay = msg.targets.some(
          (t) => t.displayId === displayId && !t.dismissedAt,
        );
        if (!targetsThisDisplay || !msg.sentAt) continue;

        // Calculate remaining duration so overlay auto-dismisses at the correct time
        const elapsedSec = (now - msg.sentAt.getTime()) / 1000;
        const remainingSec = Math.max(1, Math.round(msg.displayDuration - elapsedSec));

        const imageUrl = msg.imageUrl
          ? msg.imageUrl.startsWith('/')
            ? `http://127.0.0.1:${process.env['PORT'] ?? '3000'}${msg.imageUrl}`
            : msg.imageUrl
          : undefined;

        socket.emit(WS_EVENTS.OVERLAY_SHOW, {
          messageId: msg.id,
          text: msg.text,
          imageUrl,
          imageSize: msg.imageSize,
          position: msg.position,
          style: {
            fontSize: msg.fontSize,
            fontColor: msg.fontColor,
            backgroundColor: msg.backgroundColor,
          },
          displayDurationSeconds: remainingSec,
          priority: msg.priority,
        });
      }

      if (activeMessages.length > 0) {
        const count = activeMessages.filter((m) =>
          m.targets.some((t) => t.displayId === displayId && !t.dismissedAt),
        ).length;
        if (count > 0) {
          logger.info(`Pushed ${count} active overlay(s) to newly registered display ${displayId}`);
        }
      }
    })
    .catch((err) => {
      logger.warn(`Failed to push active overlays to display ${displayId}:`, err);
    });

  logger.info(`Player registered for display ${displayId}`);
}

export async function handlePlayerHeartbeat(socket: Socket, data: unknown): Promise<void> {
  const result = playerHeartbeatSchema.safeParse(data);
  if (!result.success) {
    logger.warn('Invalid player:heartbeat payload', result.error.flatten());
    return;
  }

  const { displayId, status } = result.data;

  const prismaStatus = status === 'playing' ? 'PLAYING' : status === 'error' ? 'ERROR' : 'IDLE';

  await prisma.display.update({
    where: { id: displayId },
    data: { status: prismaStatus },
  }).catch(() => {
    // Display may not exist yet
  });

  socket.to('dashboard').emit(WS_EVENTS.DISPLAY_HEARTBEAT, result.data);
}

export async function handlePlayerError(socket: Socket, data: unknown): Promise<void> {
  const result = playerErrorSchema.safeParse(data);
  if (!result.success) {
    logger.warn('Invalid player:error payload', result.error.flatten());
    return;
  }

  const displayId = socket.data['displayId'] as string | undefined;

  if (displayId) {
    await prisma.display.update({
      where: { id: displayId },
      data: { status: 'ERROR' },
    }).catch(() => {});
  }

  logger.error(`Player error from ${displayId ?? socket.id}: ${result.data.error}`);

  socket.to('dashboard').emit(WS_EVENTS.DISPLAY_STATUS_CHANGED, {
    displayId,
    status: 'ERROR',
    error: result.data.error,
  });
}

export async function handleContentLoaded(socket: Socket, data: unknown): Promise<void> {
  const result = contentLoadedSchema.safeParse(data);
  if (!result.success) {
    logger.warn('Invalid content:loaded payload', result.error.flatten());
    return;
  }

  const displayId = socket.data['displayId'] as string | undefined;
  if (!displayId) return;

  logger.info(`Content loaded on ${displayId}: ${result.data.url} (${result.data.loadTimeMs}ms)`);

  socket.to('dashboard').emit(WS_EVENTS.CONTENT_CHANGED, {
    displayId,
    url: result.data.url,
    loadTimeMs: result.data.loadTimeMs,
  });
}

export async function handleOverlayExpired(socket: Socket, data: unknown): Promise<void> {
  const result = overlayExpiredSchema.safeParse(data);
  if (!result.success) {
    logger.warn('Invalid overlay:expired payload', result.error.flatten());
    return;
  }

  const displayId = socket.data['displayId'] as string | undefined;
  if (!displayId) return;

  await prisma.messageTarget.updateMany({
    where: {
      messageId: result.data.messageId,
      displayId,
      dismissedAt: null,
    },
    data: { dismissedAt: new Date() },
  });

  socket.to('dashboard').emit(WS_EVENTS.MESSAGE_DISMISSED, {
    messageId: result.data.messageId,
    displayId,
  });

  logger.info(`Overlay expired on ${displayId}: message ${result.data.messageId}`);
}
