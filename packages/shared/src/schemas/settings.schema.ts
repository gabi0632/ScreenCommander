import { z } from 'zod';

export const appSettingsSchema = z.object({
  general: z.object({
    systemName: z.string().min(1).default('ScreenCommander'),
    language: z.string().default('he'),
    theme: z.string().default('dark'),
  }),
  network: z.object({
    port: z.number().int().min(1).max(65535).default(3000),
    backendUrl: z.string().url().default('http://localhost:3000'),
  }),
  players: z.object({
    autoStart: z.boolean().default(true),
    kioskMode: z.boolean().default(true),
    hideCursor: z.boolean().default(true),
    renderQuality: z.enum(['low', 'medium', 'high']).default('high'),
  }),
  messages: z.object({
    defaultDuration: z.number().int().min(1).max(3600).default(30),
    defaultAnimation: z.string().default('fade-in'),
    defaultPosition: z.string().default('bottom'),
    defaultFontSize: z.number().int().min(12).max(120).default(24),
  }),
  redAlert: z.object({
    enabled: z.boolean().default(false),
    watchedCities: z.array(z.string()).default(['צפת']),
    targetDisplayIds: z.union([z.array(z.string()), z.literal('all')]).default('all'),
    displayDuration: z.number().int().min(1).max(3600).default(120),
    fontSize: z.number().int().min(12).max(200).default(48),
    fontColor: z.string().default('#FFFFFF'),
    backgroundColor: z.string().default('#CC0000'),
    position: z.enum(['top', 'bottom', 'center', 'ticker']).default('top'),
    animation: z.enum(['fade-in', 'slide-up', 'slide-left', 'typewriter']).default('fade-in'),
    messageTemplate: z.string().default('🚨 {type}: {cities}'),
  }),
});

export type AppSettingsInput = z.infer<typeof appSettingsSchema>;
