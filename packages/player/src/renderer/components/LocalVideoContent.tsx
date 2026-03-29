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

    // Start MUTED — unmute after audio is routed to the correct output
    video.muted = true;
    video.volume = 1.0;

    const routeAndPlay = async (): Promise<void> => {
      // Route audio FIRST
      if (window.electronAPI) {
        try {
          const config = await window.electronAPI.getConfig();
          await autoRouteAudio(video, config.displayId, config.backendUrl, config.displayLabel);
        } catch (err) {
          console.warn('[local-video] Audio routing failed:', err);
        }
      }
      // Unmute — audio goes to routed device (or default if routing failed)
      video.muted = false;
      video.volume = 1.0;

      try {
        await video.play();
      } catch {
        // Some browsers require muted autoplay first, then unmute
        video.muted = true;
        try {
          await video.play();
          // Re-attempt unmute after play starts
          video.muted = false;
        } catch {
          setError(`Failed to play video: ${url}`);
        }
      }
    };

    void routeAndPlay();
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
      loop
      playsInline
      onError={() => setError(`Failed to load video: ${url}`)}
    />
  );
}
