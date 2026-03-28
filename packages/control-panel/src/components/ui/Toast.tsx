import { useState, useCallback, useEffect, createContext, useContext, type ReactNode } from 'react';

interface ToastItem {
  id: number;
  message: string;
  variant: 'success' | 'error' | 'info';
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastItem['variant']) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, variant: ToastItem['variant'] = 'info') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {toasts.map((t) => (
          <ToastMessage key={t.id} item={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastMessage({ item, onRemove }: { item: ToastItem; onRemove: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(item.id), 4000);
    return () => clearTimeout(timer);
  }, [item.id, onRemove]);

  const colorMap = {
    success: 'var(--accent)',
    error: 'var(--red)',
    info: 'var(--blue)',
  };

  return (
    <div
      className="animate-slide-in-up"
      style={{
        padding: '12px 20px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRight: `3px solid ${colorMap[item.variant]}`,
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-primary)',
        fontSize: '0.875rem',
        boxShadow: 'var(--shadow-md)',
        cursor: 'pointer',
        maxWidth: 360,
      }}
      onClick={() => onRemove(item.id)}
    >
      {item.message}
    </div>
  );
}
