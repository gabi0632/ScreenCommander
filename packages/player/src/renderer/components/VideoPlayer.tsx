import React, { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import { ErrorScreen } from './ErrorScreen';

interface VideoPlayerProps {
  url: string;
  type: 'hls' | 'rtmp';
}

interface MediaElementWithSink extends HTMLVideoElement {
  setSinkId(sinkId: string): Promise<void>;
  sinkId: string;
}

interface DisplayAudioMapEntry {
  x: number;
  y: number;
  width: number;
  height: number;
  monitorName: string;
  audioDeviceLabel: string;
}

/**
 * Auto-route audio to the correct HDMI/DP audio output for this display.
 * Uses the backend's display-audio-map (which maps monitors to audio
 * endpoints via EDID names) to find the exact audio device.
 * Mutes if the display has no associated audio output.
 */
async function autoRouteAudio(video: HTMLVideoElement, displayId: string, backendUrl: string): Promise<void> {
  try {
    const mediaVideo = video as MediaElementWithSink;
    if (typeof mediaVideo.setSinkId !== 'function') return;

    // Fetch display info (for position matching)
    const displayRes = await fetch(`${backendUrl}/api/displays/${displayId}`);
    if (!displayRes.ok) return;
    const display = await displayRes.json() as {
      posX?: number;
      posY?: number;
      width?: number;
      height?: number;
      portLabel?: string;
    };

    // Fetch the system's display-to-audio mapping
    const mapRes = await fetch(`${backendUrl}/api/system/display-audio-map`);
    if (!mapRes.ok) {
      console.warn('[audio] Failed to fetch display-audio map');
      return;
    }
    const audioMap = await mapRes.json() as DisplayAudioMapEntry[];

    // Match this display to a map entry by screen position
    const mapEntry = audioMap.find(
      (e) => e.x === display.posX && e.y === display.posY,
    );

    console.log(`[audio] Display ${displayId} (${display.portLabel}): pos=(${display.posX},${display.posY})`);
    console.log('[audio] Map entry:', mapEntry ? `${mapEntry.monitorName} → ${mapEntry.audioDeviceLabel || 'none'}` : 'not found');

    if (!mapEntry?.audioDeviceLabel) {
      console.log(`[audio] Display ${displayId}: no audio endpoint for this output, muting`);
      video.muted = true;
      return;
    }

    // Enumerate browser audio devices and match by label
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioOutputs = devices.filter((d) => d.kind === 'audiooutput' && d.label);

    const targetLabel = mapEntry.audioDeviceLabel;
    const match = audioOutputs.find((d) => d.label === targetLabel)
      ?? audioOutputs.find((d) =>
        d.label.includes(targetLabel) || targetLabel.includes(d.label),
      );

    if (match) {
      await mediaVideo.setSinkId(match.deviceId);
      video.muted = false;
      video.volume = 1.0;
      console.log(`[audio] Display ${displayId} → "${match.label}"`);
    } else {
      console.log(`[audio] Display ${displayId}: audio device "${targetLabel}" not found in browser, muting`);
      video.muted = true;
    }
  } catch (err) {
    console.warn('[audio] Auto-route error:', err);
  }
}

export function VideoPlayer({ url, type }: VideoPlayerProps): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (type === 'rtmp') {
      setError('RTMP playback requires a transcoding proxy. Direct RTMP is not supported in Electron.');
      return;
    }

    video.muted = false;
    video.volume = 1.0;

    // Route audio to the configured output device
    if (window.electronAPI) {
      void window.electronAPI.getConfig().then((config) => {
        void autoRouteAudio(video, config.displayId, config.backendUrl);
      });
    }

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
        video.muted = false;
        video.volume = 1.0;
        video.play().then(() => {
          video.muted = false;
          video.volume = 1.0;
        }).catch((err) => {
          console.warn('[hls] Play failed:', err);
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
      video.play().catch(() => {
        console.warn('[hls] Native HLS play failed');
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
      autoPlay
      playsInline
      muted={false}
    />
  );
}
