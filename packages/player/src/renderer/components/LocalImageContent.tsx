import React, { useState } from 'react';
import { ErrorScreen } from './ErrorScreen';

interface LocalImageContentProps {
  url: string;
}

export function LocalImageContent({ url }: LocalImageContentProps): React.JSX.Element {
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return <ErrorScreen message={error} />;
  }

  return (
    <img
      src={url}
      alt=""
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        background: '#000',
      }}
      onError={() => setError(`Failed to load image: ${url}`)}
      draggable={false}
    />
  );
}
