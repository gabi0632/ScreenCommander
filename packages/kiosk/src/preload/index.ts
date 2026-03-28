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

const kioskAPI = {
  // Password verification
  verifyPassword: (password: string): Promise<boolean> => {
    return ipcRenderer.invoke('kiosk:verify-password', password);
  },

  // Exit the app completely
  exitApp: (): Promise<boolean> => {
    return ipcRenderer.invoke('kiosk:exit-app');
  },

  // Minimize kiosk (temporary desktop access)
  minimizeApp: (): Promise<boolean> => {
    return ipcRenderer.invoke('kiosk:minimize');
  },

  // Re-lock the kiosk
  relockApp: (): Promise<boolean> => {
    return ipcRenderer.invoke('kiosk:relock');
  },

  // Check if kiosk is locked
  isLocked: (): Promise<boolean> => {
    return ipcRenderer.invoke('kiosk:is-locked');
  },

  // Dismiss the unlock overlay
  dismissOverlay: (): Promise<boolean> => {
    return ipcRenderer.invoke('kiosk:dismiss-overlay');
  },

  // Retry connecting to backend
  retryBackend: (): Promise<boolean> => {
    return ipcRenderer.invoke('kiosk:retry-backend');
  },

  // Listen for unlock overlay trigger (Ctrl+Shift+K)
  onShowUnlock: (callback: Listener): CleanupFn => {
    return createListener('kiosk:show-unlock', callback);
  },

  // Listen for auto-relock event
  onAutoRelocked: (callback: Listener): CleanupFn => {
    return createListener('kiosk:auto-relocked', callback);
  },

  // Listen for backend status updates (splash screen)
  onBackendStatus: (callback: Listener): CleanupFn => {
    return createListener('backend-status', callback);
  },
};

contextBridge.exposeInMainWorld('kioskAPI', kioskAPI);

export type KioskAPI = typeof kioskAPI;
