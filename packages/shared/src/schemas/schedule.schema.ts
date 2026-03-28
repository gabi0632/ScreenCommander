import { z } from 'zod';

export const createScheduleSchema = z.object({
  displayId: z.string().min(1),
  contentId: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  recurrenceRule: z.string().optional(),
  priority: z.number().int().min(0).max(100).default(0),
  isActive: z.boolean().default(true),
});

export const updateScheduleSchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  recurrenceRule: z.string().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
