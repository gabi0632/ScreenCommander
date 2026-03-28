import React, { useMemo, useRef, useEffect } from 'react';

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

    const handleNewWindow = (event: Event) => {
      event.preventDefault();
    };

    webview.addEventListener('new-window', handleNewWindow);

    return () => {
      webview.removeEventListener('new-window', handleNewWindow);
    };
  }, []);

  return (
    <webview
      ref={webviewRef as React.RefObject<HTMLWebViewElement>}
      src={dataUrl}
      style={{ width: '100%', height: '100%' }}
      sandbox="true"
    />
  );
}
