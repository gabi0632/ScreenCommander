import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { TextOverlay } from './TextOverlay';
import type { ActiveOverlay } from '../hooks/useOverlays';

interface OverlayManagerProps {
  overlays: ActiveOverlay[];
  hasActiveTicker?: boolean;
}

export function OverlayManager({ overlays, hasActiveTicker }: OverlayManagerProps): React.JSX.Element {
  const topOverlays = overlays.filter((o) => o.position === 'top');
  const bottomOverlays = overlays.filter((o) => o.position === 'bottom');
  const centerOverlays = overlays.filter((o) => o.position === 'center');
  const tickerOverlays = overlays.filter((o) => o.position === 'ticker');

  return (
    <>
      {topOverlays.length > 0 && (
        <div className="overlay-container overlay-container--top">
          <AnimatePresence>
            {topOverlays.map((overlay) => (
              <TextOverlay key={overlay.messageId} overlay={overlay} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {centerOverlays.length > 0 && (
        <div className="overlay-container overlay-container--center">
          <AnimatePresence>
            {centerOverlays.map((overlay) => (
              <TextOverlay key={overlay.messageId} overlay={overlay} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {bottomOverlays.length > 0 && (
        <div className="overlay-container overlay-container--bottom" style={hasActiveTicker ? { paddingBottom: 56 } : undefined}>
          <AnimatePresence>
            {bottomOverlays.map((overlay) => (
              <TextOverlay key={overlay.messageId} overlay={overlay} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {tickerOverlays.length > 0 && (
        <div className="overlay-container overlay-container--ticker" style={hasActiveTicker ? { bottom: 48 } : undefined}>
          <AnimatePresence>
            {tickerOverlays.map((overlay) => (
              <TextOverlay key={overlay.messageId} overlay={overlay} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
