export const ContentType = {
  WEB_URL: 'WEB_URL',
  YOUTUBE: 'YOUTUBE',
  RTMP_STREAM: 'RTMP_STREAM',
  HLS_STREAM: 'HLS_STREAM',
  LOCAL_VIDEO: 'LOCAL_VIDEO',
  LOCAL_IMAGE: 'LOCAL_IMAGE',
  CUSTOM_HTML: 'CUSTOM_HTML',
} as const;

export type ContentType = (typeof ContentType)[keyof typeof ContentType];
