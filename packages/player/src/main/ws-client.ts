import { io, Socket } from 'socket.io-client';
import { app } from 'electron';
import type { PlayerConfig, PlayerRegisterPayload } from '@screen-commander/shared';
import { WS_EVENTS } from '@screen-commander/shared';
import { getPlayerWindow, getTargetDisplayBounds } from './window-manager';

let socket: Socket | null = null;
let connected = false;

export function isConnected(): boolean {
  return connected;
}

export function getSocket(): Socket | null {
  return socket;
}

export function initWebSocket(config: PlayerConfig): Socket {
  lastConfig = config;
  // Socket.IO needs http:// URL even for websocket transport
  const serverUrl = config.backendUrl.replace('ws://', 'http://').replace('wss://', 'https://');
  console.log('[ws-client] Connecting to:', serverUrl);
  socket = io(serverUrl, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    reconnectionAttempts: Infinity,
    query: {
      displayId: config.displayId,
      role: 'player',
    },
  });

  socket.on('connect', () => {
    console.log('[ws-client] Connected to backend:', socket?.id);
    connected = true;
    notifyConnectionStatus(true);

    const bounds = getTargetDisplayBounds(config.monitorIndex);
    const registerPayload: PlayerRegisterPayload = {
      displayId: config.displayId,
      monitorIndex: config.monitorIndex,
      resolution: { width: bounds.width, height: bounds.height },
      electronVersion: process.versions.electron ?? 'unknown',
      appVersion: app.getVersion(),
    };
    socket?.emit(WS_EVENTS.PLAYER_REGISTER, registerPayload);

    // Fetch current content from REST API on connect
    fetchCurrentContent(config);
  });

  socket.on('disconnect', (reason) => {
    console.log('[ws-client] Disconnected:', reason);
    connected = false;
    notifyConnectionStatus(false);
  });

  socket.on('connect_error', (err) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const desc = (err as any).description;
    console.error('[ws-client] Connection error:', err.message, 'description:', desc?.message ?? desc ?? 'none', 'type:', (err as any).type ?? 'none');
  });

  // Forward backend events to renderer via IPC
  socket.on(WS_EVENTS.CONTENT_CHANGE, (payload: unknown) => {
    sendToRenderer('content:change', payload);
  });

  socket.on(WS_EVENTS.OVERLAY_SHOW, (payload: unknown) => {
    sendToRenderer('overlay:show', payload);
  });

  socket.on(WS_EVENTS.OVERLAY_DISMISS, (payload: unknown) => {
    sendToRenderer('overlay:dismiss', payload);
  });

  socket.on(WS_EVENTS.OVERLAY_DISMISS_ALL, () => {
    sendToRenderer('overlay:dismiss-all', null);
  });

  socket.on(WS_EVENTS.DISPLAY_IDENTIFY, (payload: unknown) => {
    sendToRenderer('display:identify', payload);
  });

  socket.on(WS_EVENTS.TICKER_UPDATE, (payload: unknown) => {
    sendToRenderer('ticker:update', payload);
  });

  socket.on(WS_EVENTS.TICKER_CLEAR, () => {
    sendToRenderer('ticker:clear', null);
  });

  socket.on(WS_EVENTS.PLAYER_RESTART, () => {
    app.relaunch();
    app.exit(0);
  });

  socket.on(WS_EVENTS.PLAYER_RELOAD, () => {
    const win = getPlayerWindow();
    if (win) {
      win.webContents.reload();
    }
  });

  return socket;
}

let lastConfig: PlayerConfig | null = null;

export function emitEvent(event: string, payload: unknown): void {
  if (socket?.connected) {
    socket.emit(event, payload);
  }
}

/**
 * Called when the renderer reports it has mounted and is ready to receive state.
 * Fetches current content + ticker from the backend and sends to renderer.
 */
export function handleRendererReady(): void {
  if (!lastConfig) return;
  fetchCurrentContent(lastConfig, 0);
}

function sendToRenderer(channel: string, payload: unknown): void {
  const win = getPlayerWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, payload);
  }
}

function notifyConnectionStatus(status: boolean): void {
  sendToRenderer('connection-status', status);
}

function fetchCurrentContent(config: PlayerConfig, delayMs = 2000): void {
  // Delay to ensure renderer is ready to receive IPC messages
  setTimeout(async () => {
    try {
      const backendHttp = config.backendUrl.replace('ws://', 'http://').replace('wss://', 'https://');
      const url = `${backendHttp}/api/displays/${config.displayId}`;
      const response = await globalThis.fetch(url);
      if (!response.ok) return;
      const display = (await response.json()) as { currentContent?: { type: string; url: string } | null };
      if (display.currentContent) {
        sendToRenderer('content:change', {
          contentType: display.currentContent.type,
          url: display.currentContent.url,
          transition: 'cut',
          transitionDurationMs: 0,
        });
      }
      // Also fetch current ticker state
      const tickerUrl = `${backendHttp}/api/ticker/display/${config.displayId}`;
      const tickerRes = await globalThis.fetch(tickerUrl);
      if (tickerRes.ok) {
        const tickerPayload = await tickerRes.json();
        sendToRenderer('ticker:update', tickerPayload);
      }
    } catch (err) {
      console.error('[ws-client] Failed to fetch current content:', err);
    }
  }, delayMs);
}

export function destroyWebSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    connected = false;
  }
}
