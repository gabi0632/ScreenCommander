import React, { useRef, useEffect } from 'react';

interface WebViewContentProps {
  url: string;
}

function isJavaScriptUrl(url: string): boolean {
  return url.trim().toLowerCase().startsWith('javascript:');
}

export function WebViewContent({ url }: WebViewContentProps): React.JSX.Element {
  const webviewRef = useRef<HTMLWebViewElement>(null);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleWillNavigate = (event: Event & { url?: string }) => {
      if (event.url && isJavaScriptUrl(event.url)) {
        event.preventDefault();
      }
    };

    webview.addEventListener('will-navigate', handleWillNavigate as EventListener);

    return () => {
      webview.removeEventListener('will-navigate', handleWillNavigate as EventListener);
    };
  }, []);

  if (isJavaScriptUrl(url)) {
    window.electronAPI.reportError('Blocked javascript: URL');
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a0000',
        color: '#ff4d6a',
      }}>
        Blocked: javascript: URLs are not allowed
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <webview
        ref={webviewRef as React.RefObject<HTMLWebViewElement>}
        src={url}
        style={{ flex: '1 1 auto', display: 'flex', width: '100%', border: 'none' }}
        // @ts-expect-error -- Electron webview uses webpreferences attribute, not sandbox
        webpreferences="sandbox=yes"
      />
    </div>
  );
}
