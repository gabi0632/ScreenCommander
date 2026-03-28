export interface MediaElementWithSink extends HTMLVideoElement {
  setSinkId(sinkId: string): Promise<void>;
  sinkId: string;
}

export interface DisplayAudioMapEntry {
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
export async function autoRouteAudio(video: HTMLVideoElement, displayId: string, backendUrl: string): Promise<void> {
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
