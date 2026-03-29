import React, { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import { ErrorScreen } from './ErrorScreen';
import { autoRouteAudio } from '../utils/audio-routing';

interface VideoPlayerProps {
  url: string;
  type: 'hls' | 'rtmp';
}

export function VideoPlayer({ url, type }: VideoPlayerProps): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);

    if (type === 'rtmp') {
      setError('RTMP playback requires a transcoding proxy. Direct RTMP is not supported in Electron.');
      return;
    }

    // Start MUTED — we'll unmute after audio is routed to the correct output
    video.muted = true;
    video.volume = 1.0;

    // Route audio to the correct HDMI/DP output, then start playback
    const routeAudioAndPlay = async (): Promise<void> => {
      // Route audio FIRST so setSinkId is set before any sound plays
      if (window.electronAPI) {
        try {
          const config = await window.electronAPI.getConfig();
          await autoRouteAudio(video, config.displayId, config.backendUrl, config.displayLabel);
        } catch (err) {
          console.warn('[video] Audio routing failed:', err);
        }
      }
      // Now unmute — audio goes to the routed device (or default if routing failed)
      video.muted = false;
      video.volume = 1.0;
    };

    // HLS playback
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Route audio THEN play — never unmute before routing completes
        routeAudioAndPlay().then(() => {
          video.play().catch((err) => {
            console.warn('[hls] Play failed:', err);
          });
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('[hls] Network error, attempting recovery...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[hls] Media error, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              setError(`HLS fatal error: ${data.type}`);
              hls.destroy();
              break;
          }
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      routeAudioAndPlay().then(() => {
        video.play().catch(() => {
          console.warn('[hls] Native HLS play failed');
        });
      });
    } else {
      setError('HLS playback is not supported in this environment');
    }

    return undefined;
  }, [url, type]);

  if (error) {
    return <ErrorScreen message={error} />;
  }

  return (
    <video
      ref={videoRef}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        background: '#000',
      }}
      playsInline
    />
  );
}
