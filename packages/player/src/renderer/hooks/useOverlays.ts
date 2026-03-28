import { useState, useEffect, useCallback, useRef } from 'react';
import type { OverlayShowPayload, OverlayDismissPayload } from '@screen-commander/shared';

export interface ActiveOverlay {
  messageId: string;
  text: string;
  imageUrl?: string;
  imageSize?: number;
  position: string;
  style: {
    fontSize: number;
    fontColor: string;
    backgroundColor: string;
  };
  displayDurationSeconds: number;
  priority: string;
}

interface UseOverlaysResult {
  overlays: ActiveOverlay[];
  dismissOverlay: (messageId: string) => void;
}

const MAX_OVERLAYS = 5;

export function useOverlays(): UseOverlaysResult {
  const [overlays, setOverlays] = useState<ActiveOverlay[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissOverlay = useCallback((messageId: string) => {
    setOverlays((prev) => prev.filter((o) => o.messageId !== messageId));

    const timer = timersRef.current.get(messageId);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(messageId);
    }

    window.electronAPI?.reportOverlayExpired(messageId);
  }, []);

  const handleOverlayShow = useCallback(
    (payload: unknown) => {
      const data = payload as OverlayShowPayload;

      const overlay: ActiveOverlay = {
        messageId: data.messageId,
        text: data.text,
        imageUrl: data.imageUrl,
        imageSize: data.imageSize,
        position: data.position,
        style: data.style,
        displayDurationSeconds: data.displayDurationSeconds,
        priority: data.priority,
      };

      setOverlays((prev) => {
        // Remove existing overlay with same ID
        const filtered = prev.filter((o) => o.messageId !== data.messageId);
        // Enforce max overlays
        const trimmed = filtered.length >= MAX_OVERLAYS ? filtered.slice(1) : filtered;
        return [...trimmed, overlay];
      });

      // Auto-expire timer — clear any existing timer for this message first (e.g. on resend)
      if (data.displayDurationSeconds > 0) {
        const existingTimer = timersRef.current.get(data.messageId);
        if (existingTimer) {
          clearTimeout(existingTimer);
          timersRef.current.delete(data.messageId);
        }

        const timer = setTimeout(() => {
          dismissOverlay(data.messageId);
        }, data.displayDurationSeconds * 1000);
        timersRef.current.set(data.messageId, timer);
      }
    },
    [dismissOverlay]
  );

  const handleOverlayDismiss = useCallback(
    (payload: unknown) => {
      const data = payload as OverlayDismissPayload;
      dismissOverlay(data.messageId);
    },
    [dismissOverlay]
  );

  const handleOverlayDismissAll = useCallback(() => {
    // Clear all timers
    for (const timer of timersRef.current.values()) {
      clearTimeout(timer);
    }
    timersRef.current.clear();

    // Report all as expired
    setOverlays((prev) => {
      for (const overlay of prev) {
        window.electronAPI?.reportOverlayExpired(overlay.messageId);
      }
      return [];
    });
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    const cleanups = [
      window.electronAPI.onOverlayShow(handleOverlayShow),
      window.electronAPI.onOverlayDismiss(handleOverlayDismiss),
      window.electronAPI.onOverlayDismissAll(handleOverlayDismissAll),
    ];

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      // Clear all timers on unmount
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }
      timersRef.current.clear();
    };
  }, [handleOverlayShow, handleOverlayDismiss, handleOverlayDismissAll]);

  return { overlays, dismissOverlay };
}
