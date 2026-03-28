import type { TextMessage } from '@prisma/client';
import type { CreateMessageInput } from '@screen-commander/shared';
import { WS_EVENTS } from '@screen-commander/shared';
import { prisma } from '../prisma';
import { getIO } from '../ws/gateway';
import { logger } from '../utils/logger';

interface MessageWithTargets extends TextMessage {
  targets: Array<{
    id: string;
    messageId: string;
    displayId: string;
    deliveredAt: Date | null;
    dismissedAt: Date | null;
  }>;
}

export async function getAllMessages(): Promise<MessageWithTargets[]> {
  return prisma.textMessage.findMany({
    include: { targets: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getActiveMessages(): Promise<MessageWithTargets[]> {
  const messages = await prisma.textMessage.findMany({
    where: { sentAt: { not: null }, dismissedAt: null },
    include: { targets: true },
    orderBy: { sentAt: 'desc' },
  });

  const now = Date.now();
  const active: MessageWithTargets[] = [];
  const expired: string[] = [];

  for (const msg of messages) {
    if (msg.sentAt) {
      const expiresAt = msg.sentAt.getTime() + msg.displayDuration * 1000;
      if (now >= expiresAt) {
        expired.push(msg.id);
      } else {
        active.push(msg);
      }
    }
  }

  // Auto-dismiss expired messages and emit dismiss events
  if (expired.length > 0) {
    const expiredMessages = messages.filter((m) => expired.includes(m.id));
    await prisma.textMessage.updateMany({
      where: { id: { in: expired } },
      data: { dismissedAt: new Date() },
    });
    await prisma.messageTarget.updateMany({
      where: { messageId: { in: expired }, dismissedAt: null },
      data: { dismissedAt: new Date() },
    });

    // Emit dismiss events to players and dashboard
    const io = getIO();
    const displayIds = new Set<string>();
    for (const msg of expiredMessages) {
      for (const target of msg.targets) {
        displayIds.add(target.displayId);
        io.to(`display:${target.displayId}`).emit(WS_EVENTS.OVERLAY_DISMISS, {
          messageId: msg.id,
        });
      }
      io.to('dashboard').emit(WS_EVENTS.MESSAGE_DISMISSED, { messageId: msg.id });
    }
  }

  return active;
}

export async function getMessageById(id: string): Promise<MessageWithTargets | null> {
  return prisma.textMessage.findUnique({
    where: { id },
    include: { targets: true },
  });
}

export async function createMessage(input: CreateMessageInput): Promise<MessageWithTargets> {
  const { targetDisplayIds, ...messageData } = input;

  const message = await prisma.textMessage.create({
    data: {
      ...messageData,
      scheduledAt: messageData.scheduledAt ? new Date(messageData.scheduledAt) : null,
      sentAt: messageData.scheduledAt ? null : new Date(),
      targets: {
        create: targetDisplayIds.map((displayId) => ({
          displayId,
          deliveredAt: messageData.scheduledAt ? null : new Date(),
        })),
      },
    },
    include: { targets: true },
  });

  // If not scheduled for later, emit immediately
  if (!messageData.scheduledAt) {
    emitOverlay(message);
  }

  return message;
}

function resolveImageUrl(imageUrl: string | null): string | undefined {
  if (!imageUrl) return undefined;
  // Convert relative URLs to absolute so the player can fetch them
  if (imageUrl.startsWith('/')) {
    const port = process.env['PORT'] ?? '3000';
    return `http://127.0.0.1:${port}${imageUrl}`;
  }
  return imageUrl;
}

function emitOverlay(message: MessageWithTargets): void {
  const io = getIO();

  const payload = {
    messageId: message.id,
    text: message.text,
    imageUrl: resolveImageUrl(message.imageUrl),
    imageSize: message.imageSize,
    position: message.position,
    style: {
      fontSize: message.fontSize,
      fontColor: message.fontColor,
      backgroundColor: message.backgroundColor,
    },
    displayDurationSeconds: message.displayDuration,
    priority: message.priority,
  };

  for (const target of message.targets) {
    io.to(`display:${target.displayId}`).emit(WS_EVENTS.OVERLAY_SHOW, payload);
  }

  io.to('dashboard').emit(WS_EVENTS.MESSAGE_SENT, {
    messageId: message.id,
    text: message.text,
    targetCount: message.targets.length,
  });

  logger.info(`Message ${message.id} sent to ${message.targets.length} displays`);
}

export async function dismissMessage(id: string): Promise<TextMessage> {
  const io = getIO();

  const message = await prisma.textMessage.update({
    where: { id },
    data: { dismissedAt: new Date() },
    include: { targets: true },
  });

  await prisma.messageTarget.updateMany({
    where: { messageId: id, dismissedAt: null },
    data: { dismissedAt: new Date() },
  });

  for (const target of message.targets) {
    io.to(`display:${target.displayId}`).emit(WS_EVENTS.OVERLAY_DISMISS, {
      messageId: id,
    });
  }

  io.to('dashboard').emit(WS_EVENTS.MESSAGE_DISMISSED, { messageId: id });

  logger.info(`Message ${id} dismissed`);
  return message;
}

export async function dismissAllMessages(): Promise<void> {
  const io = getIO();

  const activeMessages = await prisma.textMessage.findMany({
    where: { dismissedAt: null, sentAt: { not: null } },
    include: { targets: true },
  });

  await prisma.textMessage.updateMany({
    where: { dismissedAt: null, sentAt: { not: null } },
    data: { dismissedAt: new Date() },
  });

  await prisma.messageTarget.updateMany({
    where: { dismissedAt: null },
    data: { dismissedAt: new Date() },
  });

  const displayIds = new Set<string>();
  for (const msg of activeMessages) {
    for (const target of msg.targets) {
      displayIds.add(target.displayId);
    }
  }

  for (const displayId of displayIds) {
    io.to(`display:${displayId}`).emit(WS_EVENTS.OVERLAY_DISMISS_ALL);
  }

  logger.info('All messages dismissed');
}

export async function resendMessage(id: string): Promise<MessageWithTargets> {
  const message = await prisma.textMessage.findUnique({
    where: { id },
    include: { targets: true },
  });

  if (!message) {
    throw new Error(`Message ${id} not found`);
  }

  const updated = await prisma.textMessage.update({
    where: { id },
    data: {
      sentAt: new Date(),
      dismissedAt: null,
    },
    include: { targets: true },
  });

  await prisma.messageTarget.updateMany({
    where: { messageId: id },
    data: { deliveredAt: new Date(), dismissedAt: null },
  });

  emitOverlay(updated);

  return updated;
}

// Proactive cleanup: dismiss expired messages every 10 seconds
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

export function startMessageCleanup(): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    void getActiveMessages(); // triggers auto-dismiss logic
  }, 10_000);
}

export function stopMessageCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
