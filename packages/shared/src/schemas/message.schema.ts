import { z } from 'zod';

export const createMessageSchema = z.object({
  text: z.string().max(500).default(''),
  imageUrl: z.string().min(1).optional(),
  imageSize: z.number().int().min(10).max(100).default(50),
  targetDisplayIds: z.array(z.string()).min(1),
  position: z.enum(['top', 'bottom', 'center', 'ticker']).default('bottom'),
  fontSize: z.number().int().min(12).max(120).default(24),
  fontColor: z.string().default('#FFFFFF'),
  backgroundColor: z.string().default('#000000CC'),
  animation: z.enum(['fade-in', 'slide-up', 'slide-left', 'typewriter']).default('fade-in'),
  displayDuration: z.number().int().min(1).max(3600).default(30),
  priority: z.enum(['normal', 'urgent', 'emergency']).default('normal'),
  source: z.enum(['manual', 'red-alert']).default('manual'),
  scheduledAt: z.string().datetime().optional(),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
