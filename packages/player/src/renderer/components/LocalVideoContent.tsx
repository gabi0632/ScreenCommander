import React, { useRef, useEffect, useState } from 'react';
import { ErrorScreen } from './ErrorScreen';

interface LocalVideoContentProps {
  url: string;
}

interface MediaElementWithSink extends HTMLVideoElement {
  setSinkId(sinkId: string): Promise<void>;
}

interface DisplayAudioMapEntry {
  x: number;
  y: number;
  monitorName: string;
  audioDeviceLabel: string;
}

/**
 * Auto-route audio to the correct HDMI/DP audio output for this display.
 * Uses the backend's display-audio-map (EDID-based) for exact matching.
 * Mutes if no associated audio output exists.
 */
async function autoRouteAudio(video: HTMLVideoElement, displayId: string, backendUrl: string): Promise<void> {
  try {
    const mediaVideo = video as MediaElementWithSink;
    if (typeof mediaVideo.setSinkId !== 'function') return;

    const displayRes = await fetch(`${backendUrl}/api/displays/${displayId}`);
    if (!displayRes.ok) return;
    const display = await displayRes.json() as {
      posX?: number;
      posY?: number;
      portLabel?: string;
    };

    const mapRes = await fetch(`${backendUrl}/api/system/display-audio-map`);
    if (!mapRes.ok) return;
    const audioMap = await mapRes.json() as DisplayAudioMapEntry[];

    const mapEntry = audioMap.find(
      (e) => e.x === display.posX && e.y === display.posY,
    );

    console.log(`[audio:local] Display ${displayId} (${display.portLabel}): pos=(${display.posX},${display.posY}), audio=${mapEntry?.audioDeviceLabel || 'none'}`);

    if (!mapEntry?.audioDeviceLabel) {
      video.muted = true;
      return;
    }

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
      console.log(`[audio:local] Display ${displayId} → "${match.label}"`);
    } else {
      video.muted = true;
    }
  } catch {
    // Ignore
  }
}

export function LocalVideoContent({ url }: LocalVideoContentProps): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

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
