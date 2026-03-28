import React, { useEffect } from 'react';

interface IdentifyFlashProps {
  color: string;
  label: string;
  onComplete: () => void;
}

const IDENTIFY_DURATION_MS = 3000;

export function IdentifyFlash({ color, label, onComplete }: IdentifyFlashProps): React.JSX.Element {
  useEffect(() => {
    const timer = setTimeout(onComplete, IDENTIFY_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        animation: 'identify-pulse 0.5s ease-in-out infinite alternate',
      }}
    >
      <style>{`
        @keyframes identify-pulse {
          from { opacity: 0.8; }
          to { opacity: 1; }
        }
      `}</style>
      <span
        style={{
          fontSize: '120px',
          fontWeight: 'bold',
          color: '#fff',
          textShadow: '0 4px 20px rgba(0,0,0,0.5)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {label}
      </span>
    </div>
  );
}
