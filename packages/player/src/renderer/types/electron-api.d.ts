type CleanupFn = () => void;
type Listener = (...args: unknown[]) => void;

interface ElectronAPI {
  onContentChange: (callback: Listener) => CleanupFn;
  onOverlayShow: (callback: Listener) => CleanupFn;
  onOverlayDismiss: (callback: Listener) => CleanupFn;
  onOverlayDismissAll: (callback: Listener) => CleanupFn;
  onDisplayIdentify: (callback: Listener) => CleanupFn;
  onGetPlayerState: (callback: Listener) => CleanupFn;
  onConnectionStatusChange: (callback: Listener) => CleanupFn;
  onTickerUpdate: (callback: Listener) => CleanupFn;
  onTickerClear: (callback: Listener) => CleanupFn;
  reportRendererReady: () => void;
  reportContentLoaded: (url: string, loadTimeMs: number) => void;
  reportOverlayExpired: (messageId: string) => void;
  reportError: (error: string, stack?: string) => void;
  sendPlayerState: (state: {
    status: 'idle' | 'playing' | 'error';
    currentUrl: string | null;
    activeOverlays: string[];
  }) => void;
  getConfig: () => Promise<{
    displayId: string;
    monitorIndex: number;
    backendUrl: string;
    fullscreen: boolean;
    noCursor: boolean;
    kiosk: boolean;
    debug: boolean;
    displayLabel: string;
  }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
