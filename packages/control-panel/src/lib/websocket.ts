import { io, type Socket } from 'socket.io-client';
import { WS_EVENTS } from '@screen-commander/shared';

type EventCallback = (data: unknown) => void;

let socket: Socket | null = null;
const listeners = new Map<string, Set<EventCallback>>();

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    socket.on('connect', () => {
      console.log('[WS] Connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
    });

    const dashboardEvents = [
      WS_EVENTS.DISPLAY_STATUS_CHANGED,
      WS_EVENTS.DISPLAY_HEARTBEAT,
      WS_EVENTS.CONTENT_CHANGED,
      WS_EVENTS.MESSAGE_SENT,
      WS_EVENTS.MESSAGE_DISMISSED,
    ];

    for (const event of dashboardEvents) {
      socket.on(event, (data: unknown) => {
        const cbs = listeners.get(event);
        if (cbs) {
          for (const cb of cbs) cb(data);
        }
      });
    }
  }
  return socket;
}

export function subscribe(event: string, callback: EventCallback): () => void {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(callback);

  getSocket();

  return () => {
    listeners.get(event)?.delete(callback);
  };
}

export function isConnected(): boolean {
  return socket?.connected ?? false;
}
