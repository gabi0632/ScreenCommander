import React from 'react';

interface StatusIndicatorProps {
  connected: boolean;
}

export function StatusIndicator({ connected }: StatusIndicatorProps): React.JSX.Element {
  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        left: 8,
        width: 10,
        height: 10,
        borderRadius: '50%',
        backgroundColor: connected ? '#00d4aa' : '#ff4d6a',
        zIndex: 50,
        opacity: 0.7,
        boxShadow: connected
          ? '0 0 6px rgba(0, 212, 170, 0.6)'
          : '0 0 6px rgba(255, 77, 106, 0.6)',
        transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
      }}
      title={connected ? 'Connected' : 'Disconnected'}
    />
  );
}
