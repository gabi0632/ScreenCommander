import { BrowserWindow, screen } from 'electron';
import { join } from 'path';
import type { PlayerConfig } from '@screen-commander/shared';

let playerWindow: BrowserWindow | null = null;

export function createPlayerWindow(config: PlayerConfig): BrowserWindow {
  const displays = screen.getAllDisplays();
  const targetDisplay = displays[config.monitorIndex];

  if (!targetDisplay) {
    throw new Error(
      `Monitor index ${config.monitorIndex} not found. Available: ${displays.length} displays.`
    );
  }

  const { x, y, width, height } = targetDisplay.bounds;
  const scaleFactor = targetDisplay.scaleFactor || 1;

  console.log(`[window] Display ${config.monitorIndex}: bounds=${width}x${height} at (${x},${y}), scale=${scaleFactor}`);
  console.log(`[window] Display size: ${targetDisplay.size.width}x${targetDisplay.size.height}`);

  playerWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    fullscreen: config.fullscreen,
    frame: false,
    kiosk: config.kiosk,
    alwaysOnTop: !config.debug,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#000000',
    // Disable minimum size constraints
    minWidth: 0,
    minHeight: 0,
    // Use content size to match exact resolution
    useContentSize: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      webSecurity: false,
      autoplayPolicy: 'no-user-gesture-required',
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      // Disable zoom to prevent scaling issues
      zoomFactor: 1.0 / scaleFactor,
    },
  });

  // Override the zoom factor to account for display scaling
  playerWindow.webContents.setZoomFactor(1.0 / scaleFactor);

  // Allow webview audio
  playerWindow.webContents.on('did-attach-webview', (_event, webContents) => {
    webContents.setAudioMuted(false);
  });

  if (config.noCursor) {
    playerWindow.webContents.insertCSS('* { cursor: none !important; }');
  }

  playerWindow.once('ready-to-show', () => {
    playerWindow?.show();
    // Ensure audio is not muted after window shows
    if (playerWindow && !playerWindow.isDestroyed()) {
      playerWindow.webContents.setAudioMuted(false);
      playerWindow.setBounds({ x, y, width, height });
      if (config.fullscreen) {
        playerWindow.setFullScreen(true);
      }
    }
  });

  playerWindow.on('closed', () => {
    playerWindow = null;
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    playerWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    playerWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return playerWindow;
}

export function getPlayerWindow(): BrowserWindow | null {
  return playerWindow;
}

export function getTargetDisplayBounds(monitorIndex: number): { width: number; height: number } {
  const displays = screen.getAllDisplays();
  const target = displays[monitorIndex];
  if (!target) {
    return { width: 1920, height: 1080 };
  }
  return { width: target.bounds.width, height: target.bounds.height };
}
