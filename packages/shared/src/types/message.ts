import type { MessageAnimation } from '../enums/message-animation';
import type { MessagePosition } from '../enums/message-position';
import type { MessagePriority } from '../enums/message-priority';

export interface TextMessage {
  id: string;
  text: string;
  imageUrl?: string | null;
  imageSize?: number;
  position: MessagePosition;
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  animation: MessageAnimation;
  displayDuration: number;
  priority: MessagePriority;
  source?: 'manual' | 'red-alert';
  scheduledAt: string | null;
  sentAt: string | null;
  dismissedAt: string | null;
  createdAt: string;
}

export interface MessageStyle {
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
}

export interface MessageTarget {
  id: string;
  messageId: string;
  displayId: string;
  deliveredAt: string | null;
  dismissedAt: string | null;
}
