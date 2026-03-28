import { useState, useEffect, useCallback } from 'react';
import type { DisplayIdentifyPayload } from '@screen-commander/shared';

interface IdentifyState {
  color: string;
  label: string;
}

interface UseIdentifyResult {
  identify: IdentifyState | null;
  clearIdentify: () => void;
}

export function useIdentify(): UseIdentifyResult {
  const [identify, setIdentify] = useState<IdentifyState | null>(null);

  const clearIdentify = useCallback(() => {
    setIdentify(null);
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    const cleanup = window.electronAPI.onDisplayIdentify((payload: unknown) => {
      const data = payload as DisplayIdentifyPayload;
      setIdentify({ color: data.color, label: data.label });
    });
    return cleanup;
  }, []);

  return { identify, clearIdentify };
}
