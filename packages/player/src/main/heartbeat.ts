import { ipcMain } from 'electron';
import type { PlayerConfig, PlayerHeartbeatPayload } from '@screen-commander/shared';
import { WS_EVENTS, DEFAULTS } from '@screen-commander/shared';
import { emitEvent } from './ws-client';
import { getPlayerWindow } from './window-manager';

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let startTime: number = Date.now();

interface RendererState {
  status: 'idle' | 'playing' | 'error';
  currentUrl: string | null;
  activeOverlays: string[];
}

let cachedRendererState: RendererState = {
  status: 'idle',
  currentUrl: null,
  activeOverlays: [],
};

export function initHeartbeat(config: PlayerConfig): void {
  startTime = Date.now();

  // Listen for renderer state updates
  ipcMain.on('player-state-update', (_event, state: RendererState) => {
    cachedRendererState = state;
  });

  heartbeatTimer = setInterval(() => {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const memoryUsage = process.memoryUsage();

    const payload: PlayerHeartbeatPayload = {
      displayId: config.displayId,
      status: cachedRendererState.status,
      currentUrl: cachedRendererState.currentUrl,
      uptimeSeconds,
      memoryUsageMB: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
      activeOverlays: cachedRendererState.activeOverlays,
    };

    emitEvent(WS_EVENTS.PLAYER_HEARTBEAT, payload);
  }, DEFAULTS.HEARTBEAT_INTERVAL_MS);
}

export function requestRendererState(): void {
  const win = getPlayerWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send('get-player-state');
  }
}

export function destroyHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  ipcMain.removeAllListeners('player-state-update');
}
