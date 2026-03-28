import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTransitionResult {
  isTransitioning: boolean;
  transitionClass: string;
  onTransitionEnd: () => void;
}

export function useTransition(
  transition: 'cut' | 'fade' | 'slide',
  durationMs: number,
  contentKey: string
): UseTransitionResult {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevKeyRef = useRef(contentKey);

  const getTransitionClass = useCallback((): string => {
    if (!isTransitioning) return '';

    switch (transition) {
      case 'fade':
        return 'transition-fade-enter-active';
      case 'slide':
        return 'transition-slide-enter-active';
      case 'cut':
      default:
        return '';
    }
  }, [transition, isTransitioning]);

  const onTransitionEnd = useCallback(() => {
    setIsTransitioning(false);
  }, []);

  useEffect(() => {
    if (contentKey !== prevKeyRef.current) {
      prevKeyRef.current = contentKey;

      if (transition === 'cut') {
        setIsTransitioning(false);
      } else {
        setIsTransitioning(true);
        const timer = setTimeout(() => {
          setIsTransitioning(false);
        }, durationMs);
        return () => clearTimeout(timer);
      }
    }
    return undefined;
  }, [contentKey, transition, durationMs]);

  return {
    isTransitioning,
    transitionClass: getTransitionClass(),
    onTransitionEnd,
  };
}
