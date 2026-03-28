export interface PlayerConfig {
  displayId: string;
  monitorIndex: number;
  backendUrl: string;
  fullscreen: boolean;
  noCursor: boolean;
  kiosk: boolean;
  debug: boolean;
}

export interface PlayerState {
  status: 'idle' | 'playing' | 'error';
  currentUrl: string | null;
  uptimeSeconds: number;
  memoryUsageMB: number;
  activeOverlays: string[];
}

export interface HeartbeatPayload {
  displayId: string;
  status: 'idle' | 'playing' | 'error';
  currentUrl: string | null;
  uptimeSeconds: number;
  memoryUsageMB: number;
  activeOverlays: string[];
}
