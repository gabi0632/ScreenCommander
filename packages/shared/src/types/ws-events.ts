import type { MessageStyle } from './message';

// Backend → Player events
export interface ContentChangePayload {
  contentType: string;
  url: string;
  transition: 'cut' | 'fade' | 'slide';
  transitionDurationMs: number;
}

export interface OverlayShowPayload {
  messageId: string;
  text: string;
  imageUrl?: string;
  imageSize?: number;
  position: string;
  style: MessageStyle;
  displayDurationSeconds: number;
  priority: string;
}

export interface OverlayDismissPayload {
  messageId: string;
}

export interface DisplayIdentifyPayload {
  color: string;
  label: string;
}

// Player → Backend events
export interface PlayerRegisterPayload {
  displayId: string;
  monitorIndex: number;
  resolution: { width: number; height: number };
  electronVersion: string;
  appVersion: string;
}

export interface PlayerHeartbeatPayload {
  displayId: string;
  status: 'idle' | 'playing' | 'error';
  currentUrl: string | null;
  uptimeSeconds: number;
  memoryUsageMB: number;
  activeOverlays: string[];
}

export interface PlayerErrorPayload {
  error: string;
  stack?: string;
}

export interface ContentLoadedPayload {
  url: string;
  loadTimeMs: number;
}

export interface OverlayExpiredPayload {
  messageId: string;
}
