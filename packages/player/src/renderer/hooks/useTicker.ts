import { useState, useEffect, useCallback } from 'react';
import type { TickerConfig, TickerUpdatePayload } from '@screen-commander/shared';

interface UseTickerResult {
  tickerConfig: TickerConfig | null;
}

export function useTicker(): UseTickerResult {
  const [tickerConfig, setTickerConfig] = useState<TickerConfig | null>(null);

  const handleTickerUpdate = useCallback((payload: unknown) => {
    const data = payload as TickerUpdatePayload;
    setTickerConfig(data.config ?? null);
  }, []);

  const handleTickerClear = useCallback(() => {
    setTickerConfig(null);
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    const cleanups = [
      window.electronAPI.onTickerUpdate(handleTickerUpdate),
      window.electronAPI.onTickerClear(handleTickerClear),
    ];

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [handleTickerUpdate, handleTickerClear]);

  return { tickerConfig };
}
