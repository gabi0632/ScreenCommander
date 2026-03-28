import { z } from 'zod';

export const createDisplaySchema = z.object({
  hardwareId: z.string().min(1).optional(),
  name: z.string().min(1),
  monitorIndex: z.number().int().min(0),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  posX: z.number().int(),
  posY: z.number().int(),
  isPrimary: z.boolean().default(false),
  isEnabled: z.boolean().default(true),
  connectionType: z.enum(['HDMI', 'DisplayPort']).default('HDMI'),
  portLabel: z.string().default('HDMI-1'),
});

export const updateDisplaySchema = z.object({
  name: z.string().min(1).optional(),
  isEnabled: z.boolean().optional(),
  connectionType: z.enum(['HDMI', 'DisplayPort']).optional(),
  portLabel: z.string().optional(),
  audioDeviceId: z.string().nullable().optional(),
});

export type CreateDisplayInput = z.infer<typeof createDisplaySchema>;
export type UpdateDisplayInput = z.infer<typeof updateDisplaySchema>;
