import React, { useMemo, useRef, useEffect } from 'react';
import { getAudioDeviceLabel, buildAudioRoutingScript } from '../utils/audio-routing';

interface CustomHtmlContentProps {
  html: string;
}

export function CustomHtmlContent({ html }: CustomHtmlContentProps): React.JSX.Element {
  const webviewRef = useRef<HTMLWebViewElement>(null);

  const dataUrl = useMemo(() => {
    const encoded = encodeURIComponent(html);
    return `data:text/html;charset=utf-8,${encoded}`;
  }, [html]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleDomReady = async () => {
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
        // Audio routing is best-effort
      }
    };

    webview.addEventListener('dom-ready', handleDomReady);

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady);
    };
  }, [dataUrl]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <webview
        ref={webviewRef as React.RefObject<HTMLWebViewElement>}
        src={dataUrl}
        style={{ flex: '1 1 auto', display: 'flex', width: '100%', border: 'none' }}
        // @ts-expect-error -- Electron webview uses webpreferences attribute, not sandbox
        webpreferences="sandbox=yes"
      />
    </div>
  );
}
