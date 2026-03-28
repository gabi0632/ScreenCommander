import type { TickerConfig as PrismaTickerConfig } from '@prisma/client';
import type { UpdateTickerConfigInput, CreateTickerMessageInput, UpdateTickerMessageInput } from '@screen-commander/shared';
import { WS_EVENTS } from '@screen-commander/shared';
import { prisma } from '../prisma';
import { getIO } from '../ws/gateway';
import { logger } from '../utils/logger';

type TickerConfigWithMessages = PrismaTickerConfig & {
  messages: Array<{
    id: string;
    text: string;
    order: number;
    isActive: boolean;
    configId: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

async function ensureConfig(): Promise<TickerConfigWithMessages> {
  return prisma.tickerConfig.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {},
    include: { messages: { orderBy: { order: 'asc' } } },
  });
}

export async function getTickerConfig(): Promise<TickerConfigWithMessages> {
  return ensureConfig();
}

export async function updateTickerConfig(input: UpdateTickerConfigInput): Promise<TickerConfigWithMessages> {
  await ensureConfig();

  const data: Record<string, unknown> = {};
  if (input.isEnabled !== undefined) data['isEnabled'] = input.isEnabled;
  if (input.backgroundColor !== undefined) data['backgroundColor'] = input.backgroundColor;
  if (input.textColor !== undefined) data['textColor'] = input.textColor;
  if (input.fontSize !== undefined) data['fontSize'] = input.fontSize;
  if (input.speed !== undefined) data['speed'] = input.speed;
  if (input.separator !== undefined) data['separator'] = input.separator;
  if (input.showClock !== undefined) data['showClock'] = input.showClock;
  if (input.clockPosition !== undefined) data['clockPosition'] = input.clockPosition;
  if (input.targetDisplayIds !== undefined) {
    data['targetDisplayIds'] = Array.isArray(input.targetDisplayIds)
      ? JSON.stringify(input.targetDisplayIds)
      : input.targetDisplayIds;
  }

  const config = await prisma.tickerConfig.update({
    where: { id: 'singleton' },
    data,
    include: { messages: { orderBy: { order: 'asc' } } },
  });

  await broadcastTickerToPlayers(config);
  return config;
}

export async function addTickerMessage(input: CreateTickerMessageInput): Promise<TickerConfigWithMessages> {
  await ensureConfig();

  await prisma.tickerMessage.create({
    data: {
      text: input.text,
      order: input.order,
      isActive: input.isActive,
      configId: 'singleton',
    },
  });

  const config = await getTickerConfig();
  await broadcastTickerToPlayers(config);
  return config;
}

export async function updateTickerMessage(id: string, input: UpdateTickerMessageInput): Promise<TickerConfigWithMessages> {
  await prisma.tickerMessage.update({
    where: { id },
    data: input,
  });

  const config = await getTickerConfig();
  await broadcastTickerToPlayers(config);
  return config;
}

export async function deleteTickerMessage(id: string): Promise<TickerConfigWithMessages> {
  await prisma.tickerMessage.delete({ where: { id } });

  const config = await getTickerConfig();
  await broadcastTickerToPlayers(config);
  return config;
}

export async function reorderTickerMessages(ids: string[]): Promise<TickerConfigWithMessages> {
  const updates = ids.map((id, index) =>
    prisma.tickerMessage.update({ where: { id }, data: { order: index } })
  );
  await prisma.$transaction(updates);

  const config = await getTickerConfig();
  await broadcastTickerToPlayers(config);
  return config;
}

function buildPayload(config: TickerConfigWithMessages) {
  const activeMessages = config.messages.filter((m) => m.isActive);
  if (!config.isEnabled || activeMessages.length === 0) {
    return { config: null };
  }

  let targetDisplayIds: string | string[];
  try {
    const parsed: unknown = JSON.parse(config.targetDisplayIds);
    targetDisplayIds = Array.isArray(parsed) ? parsed as string[] : config.targetDisplayIds;
  } catch {
    targetDisplayIds = config.targetDisplayIds;
  }

  return {
    config: {
      id: config.id,
      isEnabled: config.isEnabled,
      backgroundColor: config.backgroundColor,
      textColor: config.textColor,
      fontSize: config.fontSize,
      speed: config.speed,
      separator: config.separator,
      showClock: config.showClock,
      clockPosition: config.clockPosition,
      targetDisplayIds,
      messages: activeMessages.map((m) => ({
        id: m.id,
        text: m.text,
        order: m.order,
        isActive: m.isActive,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    },
  };
}

async function getTargetDisplayIds(config: TickerConfigWithMessages): Promise<string[]> {
  if (config.targetDisplayIds === 'all') {
    const displays = await prisma.display.findMany({
      where: { isEnabled: true, isPrimary: false },
      select: { id: true },
    });
    return displays.map((d) => d.id);
  }

  try {
    const parsed: unknown = JSON.parse(config.targetDisplayIds);
    if (Array.isArray(parsed)) return parsed as string[];
  } catch {
    // Not valid JSON, treat as "all"
  }
  return [];
}

async function broadcastTickerToPlayers(config: TickerConfigWithMessages): Promise<void> {
  const io = getIO();
  const payload = buildPayload(config);
  const targetIds = await getTargetDisplayIds(config);

  for (const displayId of targetIds) {
    io.to(`display:${displayId}`).emit(WS_EVENTS.TICKER_UPDATE, payload);
  }

  io.to('dashboard').emit(WS_EVENTS.TICKER_CHANGED, { configId: config.id });

  logger.info(`Ticker broadcast to ${targetIds.length} displays (enabled: ${config.isEnabled})`);
}

export async function getTickerPayloadForDisplay(displayId: string): Promise<{ config: unknown }> {
  const config = await getTickerConfig();

  const targetIds = await getTargetDisplayIds(config);
  if (!targetIds.includes(displayId)) {
    return { config: null };
  }

  return buildPayload(config);
}
