import React, { useRef, useEffect } from 'react';
import { getAudioDeviceLabel, buildAudioRoutingScript } from '../utils/audio-routing';

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

    const handleDomReady = async () => {
      // Inject audio routing into webview guest
      if (!window.electronAPI) return;
      try {
        const config = await window.electronAPI.getConfig();
        const label = await getAudioDeviceLabel(config.displayId, config.backendUrl, config.displayLabel);
        if (label && webview) {
          const script = buildAudioRoutingScript(label);
          // @ts-expect-error -- Electron webview has executeJavaScript
          await webview.executeJavaScript(script);
        }
      } catch {
        // Audio routing in webview is best-effort
      }
    };

    webview.addEventListener('will-navigate', handleWillNavigate as EventListener);
    webview.addEventListener('dom-ready', handleDomReady);

    return () => {
      webview.removeEventListener('will-navigate', handleWillNavigate as EventListener);
      webview.removeEventListener('dom-ready', handleDomReady);
    };
  }, [url]);

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
