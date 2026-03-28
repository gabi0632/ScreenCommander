import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).default('file:./dev.db'),
  PORT: z.string().regex(/^\d+$/).default('3000'),
  HOST: z.string().default('0.0.0.0'),
});

export const env = envSchema.parse(process.env);
