export const ConnectionType = {
  HDMI: 'HDMI',
  DISPLAY_PORT: 'DisplayPort',
} as const;

export type ConnectionType = (typeof ConnectionType)[keyof typeof ConnectionType];
