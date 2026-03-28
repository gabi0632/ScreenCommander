export const MessagePosition = {
  TOP: 'top',
  BOTTOM: 'bottom',
  CENTER: 'center',
  TICKER: 'ticker',
} as const;

export type MessagePosition = (typeof MessagePosition)[keyof typeof MessagePosition];
