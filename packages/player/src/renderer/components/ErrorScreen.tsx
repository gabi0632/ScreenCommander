import React from 'react';

interface ErrorScreenProps {
  message: string;
}

export function ErrorScreen({ message }: ErrorScreenProps): React.JSX.Element {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0000',
        color: '#ff4d6a',
        fontFamily: 'monospace',
        padding: '32px',
        gap: '16px',
      }}
    >
      <div style={{ fontSize: '48px', opacity: 0.6 }}>!</div>
      <div style={{ fontSize: '16px', textAlign: 'center', maxWidth: '600px', lineHeight: 1.5 }}>
        {message}
      </div>
    </div>
  );
}
