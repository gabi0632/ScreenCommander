import { useState, useEffect } from 'react';

interface UseConnectionStatusResult {
  connected: boolean;
}

export function useConnectionStatus(): UseConnectionStatusResult {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) return;
    const cleanup = window.electronAPI.onConnectionStatusChange((status: unknown) => {
      setConnected(status as boolean);
    });
    return cleanup;
  }, []);

  return { connected };
}
