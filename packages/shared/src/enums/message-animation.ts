export const MessageAnimation = {
  FADE_IN: 'fade-in',
  SLIDE_UP: 'slide-up',
  SLIDE_LEFT: 'slide-left',
  TYPEWRITER: 'typewriter',
} as const;

export type MessageAnimation = (typeof MessageAnimation)[keyof typeof MessageAnimation];
