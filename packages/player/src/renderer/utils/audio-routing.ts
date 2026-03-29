export interface MediaElementWithSink extends HTMLVideoElement {
  setSinkId(sinkId: string): Promise<void>;
  sinkId: string;
}

// Cache resolved audio sink per display
let cachedSinkId: string | null = null;
let cachedLabel: string | null = null;
let cacheDisplayId: string | null = null;

/**
 * Find the audio output device for this display.
 *
 * Strategy 1: Use audioDeviceId from the display record (manual override)
 * Strategy 2: Match Electron's display label to Chrome audio device label
 *             (each HDMI/DP port's audio endpoint is named after its monitor)
 * Strategy 3: Fall back to display-audio-map PowerShell endpoint
 */
async function resolveAudioDevice(
  displayId: string,
  backendUrl: string,
  displayLabel: string,
): Promise<MediaDeviceInfo | null> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const audioOutputs = devices.filter((d) => d.kind === 'audiooutput' && d.deviceId !== 'default' && d.deviceId !== 'communications');

  // Strategy 1: Manual override via audioDeviceId on the display record
  try {
    const displayRes = await fetch(`${backendUrl}/api/displays/${displayId}`);
    if (displayRes.ok) {
      const display = await displayRes.json() as { audioDeviceId?: string | null };
      if (display.audioDeviceId) {
        // Check for [N] suffix (disambiguated duplicates from control panel)
        const indexMatch = display.audioDeviceId.match(/^(.+) \[(\d+)\]$/);
        if (indexMatch) {
          const baseName = indexMatch[1];
          const dupIndex = parseInt(indexMatch[2], 10) - 1; // [2] means second occurrence (0-based: 1)
          const sameLabel = audioOutputs.filter((d) => d.label === baseName);
          if (sameLabel[dupIndex]) return sameLabel[dupIndex];
          if (sameLabel.length > 0) return sameLabel[0];
        }

        // Try direct deviceId match, then exact label, then partial
        const match = audioOutputs.find((d) => d.deviceId === display.audioDeviceId)
          ?? audioOutputs.find((d) => d.label === display.audioDeviceId)
          ?? audioOutputs.find((d) => d.label.includes(display.audioDeviceId!) || display.audioDeviceId!.includes(d.label));
        if (match) return match;
        console.warn(`[audio] Manual audioDeviceId "${display.audioDeviceId}" not found`);
      }
    }
  } catch { /* continue to auto-detection */ }

  // Strategy 2: Match Electron display label to Chrome audio device label.
  // GPU drivers name each port's audio endpoint after the connected monitor's EDID name.
  // Electron's display.label gives us the monitor name. Match it to the audio endpoint.
  if (displayLabel && displayLabel !== 'Generic PnP Monitor') {
    const match = audioOutputs.find((d) => d.label.startsWith(displayLabel + ' '));
    if (match) return match;
    // Try contains match
    const fuzzy = audioOutputs.find((d) => d.label.includes(displayLabel));
    if (fuzzy) return fuzzy;
  }

  // Strategy 3: Fall back to PowerShell display-audio-map (position-based)
  try {
    const displayRes = await fetch(`${backendUrl}/api/displays/${displayId}`);
    if (displayRes.ok) {
      const display = await displayRes.json() as { posX?: number; posY?: number };
      const mapRes = await fetch(`${backendUrl}/api/system/display-audio-map`);
      if (mapRes.ok) {
        const audioMap = await mapRes.json() as Array<{ x: number; y: number; audioDeviceLabel: string; audioDeviceIndex: number }>;
        const entry = audioMap.find((e) => e.x === display.posX && e.y === display.posY);
        if (entry?.audioDeviceLabel) {
          const match = audioOutputs.find((d) => d.label === entry.audioDeviceLabel)
            ?? audioOutputs.find((d) => d.label.includes(entry.audioDeviceLabel) || entry.audioDeviceLabel.includes(d.label));
          if (match) return match;
        }
      }
    }
  } catch { /* no map available */ }

  return null;
}

/**
 * Auto-route audio to the correct HDMI/DP audio output for this display.
 * Call BEFORE playing video. Does NOT mute on failure.
 */
export async function autoRouteAudio(video: HTMLVideoElement, displayId: string, backendUrl: string, displayLabel?: string): Promise<void> {
  try {
    const mediaVideo = video as MediaElementWithSink;
    if (typeof mediaVideo.setSinkId !== 'function') {
      console.log('[audio] setSinkId not supported');
      return;
    }

    // Use cache if available
    if (cachedSinkId && cacheDisplayId === displayId) {
      await mediaVideo.setSinkId(cachedSinkId);
      console.log(`[audio] Display ${displayId} → "${cachedLabel}" (cached)`);
      return;
    }

    const label = displayLabel ?? '';
    const match = await resolveAudioDevice(displayId, backendUrl, label);

    if (match) {
      await mediaVideo.setSinkId(match.deviceId);
      cachedSinkId = match.deviceId;
      cachedLabel = match.label;
      cacheDisplayId = displayId;
      console.log(`[audio] Display ${displayId} routed to "${match.label}"`);
    }
  } catch (err) {
    console.warn('[audio] Auto-route error:', err);
  }
}

/**
 * Build a JS snippet that routes all <video>/<audio> elements in a webview
 * to the specified audio output device. Uses a MutationObserver to catch
 * dynamically created media elements.
 */
export function buildAudioRoutingScript(deviceLabel: string): string {
  const escaped = deviceLabel.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
  return `
    (async function() {
      try {
        var devices = await navigator.mediaDevices.enumerateDevices();
        var outputs = devices.filter(function(d) { return d.kind === 'audiooutput' && d.label; });
        var target = outputs.find(function(d) { return d.label === "${escaped}"; })
          || outputs.find(function(d) { return d.label.indexOf("${escaped}") >= 0 || "${escaped}".indexOf(d.label) >= 0; });

        if (!target) return;

        function routeEl(el) {
          if (typeof el.setSinkId === 'function') {
            el.setSinkId(target.deviceId).catch(function(){});
          }
        }

        document.querySelectorAll('video, audio').forEach(routeEl);

        var obs = new MutationObserver(function(mutations) {
          mutations.forEach(function(mut) {
            mut.addedNodes.forEach(function(node) {
              if (node.nodeType === 1) {
                if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO') routeEl(node);
                if (node.querySelectorAll) node.querySelectorAll('video, audio').forEach(routeEl);
              }
            });
          });
        });
        if (document.body) obs.observe(document.body, { childList: true, subtree: true });
      } catch(e) {}
    })();
  `;
}

/**
 * Get the target audio device label for webview injection.
 */
export async function getAudioDeviceLabel(displayId: string, backendUrl: string, displayLabel?: string): Promise<string | null> {
  if (cachedLabel && cacheDisplayId === displayId) return cachedLabel;

  try {
    const match = await resolveAudioDevice(displayId, backendUrl, displayLabel ?? '');
    if (match) {
      cachedSinkId = match.deviceId;
      cachedLabel = match.label;
      cacheDisplayId = displayId;
      return match.label;
    }
  } catch { /* ignore */ }
  return null;
}
