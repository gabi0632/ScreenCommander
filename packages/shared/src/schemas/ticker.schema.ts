import { z } from 'zod';

export const createTickerMessageSchema = z.object({
  text: z.string().min(1).max(500),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type CreateTickerMessageInput = z.infer<typeof createTickerMessageSchema>;

export const updateTickerMessageSchema = z.object({
  text: z.string().min(1).max(500).optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateTickerMessageInput = z.infer<typeof updateTickerMessageSchema>;

export const updateTickerConfigSchema = z.object({
  isEnabled: z.boolean().optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  fontSize: z.number().int().min(12).max(120).optional(),
  speed: z.number().int().min(1).max(20).optional(),
  separator: z.string().max(10).optional(),
  fontFamily: z.string().max(100).optional(),
  showClock: z.boolean().optional(),
  clockPosition: z.enum(['left', 'right']).optional(),
  targetDisplayIds: z.union([z.literal('all'), z.array(z.string().min(1))]).optional(),
});

export type UpdateTickerConfigInput = z.infer<typeof updateTickerConfigSchema>;

export const reorderTickerMessagesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export type ReorderTickerMessagesInput = z.infer<typeof reorderTickerMessagesSchema>;
