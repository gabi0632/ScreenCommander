import React, { useMemo } from 'react';

interface CustomHtmlContentProps {
  html: string;
}

export function CustomHtmlContent({ html }: CustomHtmlContentProps): React.JSX.Element {
  const dataUrl = useMemo(() => {
    const encoded = encodeURIComponent(html);
    return `data:text/html;charset=utf-8,${encoded}`;
  }, [html]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <webview
        src={dataUrl}
        style={{ flex: '1 1 auto', display: 'flex', width: '100%', border: 'none' }}
        // @ts-expect-error -- Electron webview uses webpreferences attribute, not sandbox
        webpreferences="sandbox=yes"
      />
    </div>
  );
}
