import { useState, useEffect, useCallback } from 'react';
import type { ContentChangePayload } from '@screen-commander/shared';

interface ContentState {
  contentType: string;
  url: string;
}

interface UseContentStateResult {
  content: ContentState | null;
  transition: 'cut' | 'fade' | 'slide';
  transitionDurationMs: number;
}

export function useContentState(): UseContentStateResult {
  const [content, setContent] = useState<ContentState | null>(null);
  const [transition, setTransition] = useState<'cut' | 'fade' | 'slide'>('cut');
  const [transitionDurationMs, setTransitionDurationMs] = useState(500);

  const handleContentChange = useCallback((payload: unknown) => {
    const data = payload as ContentChangePayload;
    setContent({
      contentType: data.contentType,
      url: data.url,
    });
    setTransition(data.transition);
    setTransitionDurationMs(data.transitionDurationMs);

    const loadStart = performance.now();
    requestAnimationFrame(() => {
      const loadTimeMs = Math.round(performance.now() - loadStart);
      window.electronAPI?.reportContentLoaded(data.url, loadTimeMs);
    });
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    const cleanup = window.electronAPI.onContentChange(handleContentChange);
    return cleanup;
  }, [handleContentChange]);

  return { content, transition, transitionDurationMs };
}
