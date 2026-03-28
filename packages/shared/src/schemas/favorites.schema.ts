import { z } from 'zod';

export const createFavoriteSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
  type: z.string().min(1),
  icon: z.string().default(''),
  order: z.number().int().min(0).default(0),
});

export const updateFavoriteSchema = z.object({
  name: z.string().min(1).optional(),
  url: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  icon: z.string().optional(),
  order: z.number().int().min(0).optional(),
});

export type CreateFavoriteInput = z.infer<typeof createFavoriteSchema>;
export type UpdateFavoriteInput = z.infer<typeof updateFavoriteSchema>;
