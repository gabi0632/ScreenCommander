import { useState, useEffect, useCallback } from 'react';

interface BackendStatus {
  status: 'waiting' | 'ready' | 'error';
  message: string;
}

declare global {
  interface Window {
    kioskAPI?: {
      retryBackend: () => Promise<boolean>;
      onBackendStatus: (callback: (...args: unknown[]) => void) => () => void;
    };
  }
}

export function SplashScreen(): JSX.Element {
  const [status, setStatus] = useState<BackendStatus>({
    status: 'waiting',
    message: 'מחכה לשרת...',
  });

  useEffect(() => {
    const cleanup = window.kioskAPI?.onBackendStatus((data: unknown) => {
      const s = data as BackendStatus;
      setStatus(s);
    });
    return () => cleanup?.();
  }, []);

  const handleRetry = useCallback(() => {
    setStatus({ status: 'waiting', message: 'מנסה להתחבר מחדש...' });
    void window.kioskAPI?.retryBackend();
  }, []);

  return (
    <div className="splash-container">
      <div className="splash-content">
        <div className="splash-logo">
          <div className="logo-icon">SC</div>
          <h1 className="logo-title">ScreenCommander</h1>
        </div>

        <div className="splash-status">
          {status.status === 'waiting' && (
            <>
              <div className="spinner" />
              <p className="status-text">{status.message}</p>
            </>
          )}

          {status.status === 'error' && (
            <>
              <p className="status-text error">{status.message}</p>
              <button className="retry-button" onClick={handleRetry}>
                נסה שוב
              </button>
            </>
          )}

          {status.status === 'ready' && (
            <p className="status-text ready">טוען את לוח הבקרה...</p>
          )}
        </div>
      </div>

      <div className="scanline-overlay" />
    </div>
  );
}
