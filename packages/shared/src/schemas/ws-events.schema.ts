import { z } from 'zod';

export const playerRegisterSchema = z.object({
  displayId: z.string().min(1),
  monitorIndex: z.number().int().min(0),
  resolution: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  electronVersion: z.string(),
  appVersion: z.string(),
});

export const playerHeartbeatSchema = z.object({
  displayId: z.string().min(1),
  status: z.enum(['idle', 'playing', 'error']),
  currentUrl: z.string().nullable(),
  uptimeSeconds: z.number().min(0),
  memoryUsageMB: z.number().min(0),
  activeOverlays: z.array(z.string()),
});

export const playerErrorSchema = z.object({
  error: z.string(),
  stack: z.string().optional(),
});

export const contentLoadedSchema = z.object({
  url: z.string(),
  loadTimeMs: z.number().min(0),
});

export const overlayExpiredSchema = z.object({
  messageId: z.string(),
});
