export const TransitionType = {
  CUT: 'cut',
  FADE: 'fade',
  SLIDE: 'slide',
} as const;

export type TransitionType = (typeof TransitionType)[keyof typeof TransitionType];
