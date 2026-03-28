import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WS_EVENTS } from '@screen-commander/shared';
import { subscribe, isConnected, getSocket } from '../lib/websocket';

export function useWebSocket() {
  const qc = useQueryClient();
  const [connected, setConnected] = useState(isConnected);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    const unsubs = [
      subscribe(WS_EVENTS.DISPLAY_STATUS_CHANGED, () => {
        void qc.invalidateQueries({ queryKey: ['displays'] });
      }),
      subscribe(WS_EVENTS.DISPLAY_HEARTBEAT, () => {
        void qc.invalidateQueries({ queryKey: ['displays'] });
      }),
      subscribe(WS_EVENTS.CONTENT_CHANGED, () => {
        void qc.invalidateQueries({ queryKey: ['displays'] });
        void qc.invalidateQueries({ queryKey: ['analytics'] });
      }),
      subscribe(WS_EVENTS.MESSAGE_SENT, () => {
        void qc.invalidateQueries({ queryKey: ['messages'] });
      }),
      subscribe(WS_EVENTS.MESSAGE_DISMISSED, () => {
        void qc.invalidateQueries({ queryKey: ['messages'] });
      }),
      subscribe(WS_EVENTS.TICKER_CHANGED, () => {
        void qc.invalidateQueries({ queryKey: ['ticker'] });
      }),
      subscribe(WS_EVENTS.RED_ALERT_TRIGGERED, () => {
        void qc.invalidateQueries({ queryKey: ['red-alert'] });
        void qc.invalidateQueries({ queryKey: ['messages'] });
      }),
    ];

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      unsubs.forEach((fn) => fn());
    };
  }, [qc]);

  return { connected };
}
