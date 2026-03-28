import { useEffect, useCallback, useRef } from 'react';

interface HotkeyBinding {
  /** Modifier keys required */
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  /** Key to match (lowercase) */
  key: string;
  /** Action to execute */
  action: () => void;
  /** Description for accessibility */
  description?: string;
}

export function useHotkeys(bindings: HotkeyBinding[]) {
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if user is typing in an input/textarea
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    for (const binding of bindingsRef.current) {
      const ctrlMatch = !!binding.ctrl === (e.ctrlKey || e.metaKey);
      const shiftMatch = !!binding.shift === e.shiftKey;
      const altMatch = !!binding.alt === e.altKey;
      const keyMatch = e.key.toLowerCase() === binding.key.toLowerCase();

      if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
        e.preventDefault();
        e.stopPropagation();
        binding.action();
        return;
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
