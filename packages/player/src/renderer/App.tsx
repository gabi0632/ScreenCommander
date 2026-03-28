import React, { useEffect, useMemo } from 'react';
import { ContentFrame } from './components/ContentFrame';
import { OverlayManager } from './components/OverlayManager';
import { EmergencyPanel } from './components/EmergencyPanel';
import { TickerBar } from './components/TickerBar';
import { StatusIndicator } from './components/StatusIndicator';
import { IdentifyFlash } from './components/IdentifyFlash';
import { TransitionWrapper } from './components/TransitionWrapper';
import { useContentState } from './hooks/useContentState';
import { useOverlays } from './hooks/useOverlays';
import { useTicker } from './hooks/useTicker';
import { useIdentify } from './hooks/useIdentify';
import { useConnectionStatus } from './hooks/useConnectionStatus';

export function App(): React.JSX.Element {
  const { content, transition, transitionDurationMs } = useContentState();
  const { overlays } = useOverlays();
  const { tickerConfig } = useTicker();
  const { identify, clearIdentify } = useIdentify();
  const { connected } = useConnectionStatus();
  const hasActiveTicker = tickerConfig !== null && tickerConfig.isEnabled;

  // Separate emergency overlays from regular ones
  const emergencyOverlays = useMemo(() => overlays.filter((o) => o.priority === 'emergency'), [overlays]);
  const regularOverlays = useMemo(() => overlays.filter((o) => o.priority !== 'emergency'), [overlays]);

  // Signal to main process that renderer is mounted and ready for state
  useEffect(() => {
    window.electronAPI?.reportRendererReady();
  }, []);

  // Report player state to main process for heartbeat
  useEffect(() => {
    const status = content ? 'playing' : 'idle';
    const currentUrl = content?.url ?? null;
    const activeOverlays = overlays.map((o) => o.messageId);

    window.electronAPI?.sendPlayerState({ status, currentUrl, activeOverlays });
  }, [content, overlays]);

  const tickerActive = hasActiveTicker && (tickerConfig?.messages?.some((m) => m.isActive) ?? false);
  const tickerHeight = tickerActive ? 72 : 0;

  return (
    <>
      {/* Layer 1: Content — shrinks above ticker */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: tickerActive ? `calc(100% - ${tickerHeight}px)` : '100%',
        overflow: 'hidden',
        background: '#000',
      }}>
        <TransitionWrapper
          transition={transition}
          durationMs={transitionDurationMs}
          contentKey={content?.url ?? 'idle'}
        >
          <ContentFrame content={content} />
        </TransitionWrapper>
      </div>

      {/* Layer 2: Connection status */}
      <StatusIndicator connected={connected} />

      {/* Layer 3: Text overlays (non-emergency) */}
      <OverlayManager overlays={regularOverlays} hasActiveTicker={tickerActive} />

      {/* Layer 3b: Emergency panel (right edge) */}
      <EmergencyPanel overlays={emergencyOverlays} />

      {/* Layer 4: Running ticker */}
      {tickerConfig && tickerConfig.isEnabled && (
        <TickerBar config={tickerConfig} />
      )}

      {/* Layer 5: Identify flash */}
      {identify && (
        <IdentifyFlash
          color={identify.color}
          label={identify.label}
          onComplete={clearIdentify}
        />
      )}
    </>
  );
}
