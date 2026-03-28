import React, { useRef, useEffect, useState } from 'react';
import { ErrorScreen } from './ErrorScreen';
import { autoRouteAudio } from '../utils/audio-routing';

interface LocalVideoContentProps {
  url: string;
}

export function LocalVideoContent({ url }: LocalVideoContentProps): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);

    video.muted = false;
    video.volume = 1.0;

    if (window.electronAPI) {
      void window.electronAPI.getConfig().then((config) => {
        void autoRouteAudio(video, config.displayId, config.backendUrl);
      });
    }

    video.play().catch(() => {
      video.muted = true;
      video.play().catch(() => {
        setError(`Failed to play video: ${url}`);
      });
    });
  }, [url]);

  if (error) {
    return <ErrorScreen message={error} />;
  }

  return (
    <video
      ref={videoRef}
      src={url}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        background: '#000',
      }}
      autoPlay
      loop
      playsInline
      onError={() => setError(`Failed to load video: ${url}`)}
    />
  );
}
