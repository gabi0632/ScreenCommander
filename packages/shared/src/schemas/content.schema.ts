import { z } from 'zod';

export const createContentSchema = z.object({
  type: z.enum([
    'WEB_URL',
    'YOUTUBE',
    'RTMP_STREAM',
    'HLS_STREAM',
    'LOCAL_VIDEO',
    'LOCAL_IMAGE',
    'CUSTOM_HTML',
  ]),
  url: z.string().min(1),
  title: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const assignContentSchema = z.object({
  contentType: z.enum([
    'WEB_URL',
    'YOUTUBE',
    'RTMP_STREAM',
    'HLS_STREAM',
    'LOCAL_VIDEO',
    'LOCAL_IMAGE',
    'CUSTOM_HTML',
  ]),
  url: z.string().min(1).refine((url) => !url.startsWith('javascript:'), {
    message: 'javascript: URLs are not allowed',
  }),
  transition: z.enum(['cut', 'fade', 'slide']).default('cut'),
  transitionDurationMs: z.number().int().min(0).max(5000).default(500),
});

export type CreateContentInput = z.infer<typeof createContentSchema>;
export type AssignContentInput = z.infer<typeof assignContentSchema>;
