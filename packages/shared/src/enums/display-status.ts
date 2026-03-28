export const DisplayStatus = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  IDLE: 'IDLE',
  PLAYING: 'PLAYING',
  ERROR: 'ERROR',
} as const;

export type DisplayStatus = (typeof DisplayStatus)[keyof typeof DisplayStatus];
