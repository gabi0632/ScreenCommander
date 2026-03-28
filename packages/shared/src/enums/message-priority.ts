export const MessagePriority = {
  NORMAL: 'normal',
  URGENT: 'urgent',
  EMERGENCY: 'emergency',
} as const;

export type MessagePriority = (typeof MessagePriority)[keyof typeof MessagePriority];
