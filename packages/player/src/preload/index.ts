import { contextBridge, ipcRenderer } from 'electron';

type CleanupFn = () => void;
type Listener = (...args: unknown[]) => void;

function createListener(channel: string, callback: Listener): CleanupFn {
  const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => {
    callback(...args);
  };
  ipcRenderer.on(channel, handler);
  return () => {
    ipcRenderer.removeListener(channel, handler);
  };
}

const electronAPI = {
  // Backend → Player events (forwarded via main process)
  onContentChange: (callback: Listener): CleanupFn => {
    return createListener('content:change', callback);
  },

  onOverlayShow: (callback: Listener): CleanupFn => {
    return createListener('overlay:show', callback);
  },

  onOverlayDismiss: (callback: Listener): CleanupFn => {
    return createListener('overlay:dismiss', callback);
  },

  onOverlayDismissAll: (callback: Listener): CleanupFn => {
    return createListener('overlay:dismiss-all', callback);
  },

  onDisplayIdentify: (callback: Listener): CleanupFn => {
    return createListener('display:identify', callback);
  },

  onTickerUpdate: (callback: Listener): CleanupFn => {
    return createListener('ticker:update', callback);
  },

  onTickerClear: (callback: Listener): CleanupFn => {
    return createListener('ticker:clear', callback);
  },

  // Main process requests player state from renderer
  onGetPlayerState: (callback: Listener): CleanupFn => {
    return createListener('get-player-state', callback);
  },

  // Connection status updates
  onConnectionStatusChange: (callback: Listener): CleanupFn => {
    return createListener('connection-status', callback);
  },

  // Renderer → Main process reports
  reportContentLoaded: (url: string, loadTimeMs: number): void => {
    ipcRenderer.send('content-loaded', { url, loadTimeMs });
  },

  reportOverlayExpired: (messageId: string): void => {
    ipcRenderer.send('overlay-expired', { messageId });
  },

  reportError: (error: string, stack?: string): void => {
    ipcRenderer.send('player-error', { error, stack });
  },

  // Send player state back to main process
  sendPlayerState: (state: {
    status: 'idle' | 'playing' | 'error';
    currentUrl: string | null;
    activeOverlays: string[];
  }): void => {
    ipcRenderer.send('player-state-update', state);
  },

  // Signal that the renderer is mounted and ready to receive state
  reportRendererReady: (): void => {
    ipcRenderer.send('renderer-ready');
  },

  // Get player config
  getConfig: (): Promise<{
    displayId: string;
    monitorIndex: number;
    backendUrl: string;
    fullscreen: boolean;
    noCursor: boolean;
    kiosk: boolean;
    debug: boolean;
    displayLabel: string;
  }> => {
    return ipcRenderer.invoke('get-config');
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
