import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ActiveOverlay } from '../hooks/useOverlays';

interface EmergencyPanelProps {
  overlays: ActiveOverlay[];
}

/** Pixels scrolled per second */
const SCROLL_SPEED = 35;

export function EmergencyPanel({ overlays }: EmergencyPanelProps): React.JSX.Element {
  // Parse alert type and cities from messages like "🚨 ירי רקטות וטילים: צפת, חיפה"
  let alertType = 'ירי רקטות וטילים';
  const citiesFromText: string[] = [];

  for (const o of overlays) {
    // Match pattern: "🚨 <type>: <cities>" or just "<type>: <cities>"
    const match = o.text.match(/🚨?\s*(.+?):\s*(.+)/);
    if (match) {
      alertType = match[1].trim();
      citiesFromText.push(...match[2].split(',').map((c) => c.trim()));
    } else {
      citiesFromText.push(o.text);
    }
  }

  // Deduplicate cities
  const uniqueCities = [...new Set(citiesFromText)];

  const panelClass = 'emergency-panel';

  // Auto-scroll state: we measure the inner list height and decide whether to scroll
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [needsScroll, setNeedsScroll] = useState(false);
  const [scrollDuration, setScrollDuration] = useState(10);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;
    // inner holds one copy of the city list
    const listHeight = inner.scrollHeight;
    const viewHeight = container.clientHeight;
    if (listHeight > viewHeight) {
      setNeedsScroll(true);
      // Duration = distance / speed. We scroll exactly one copy height so the duplicate takes over.
      setScrollDuration(listHeight / SCROLL_SPEED);
    } else {
      setNeedsScroll(false);
    }
  }, []);

  useEffect(() => {
    measure();
    // Re-measure if the window resizes
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, uniqueCities.length]);

  const cityElements = uniqueCities.map((city, i) => (
    <motion.div
      key={`${city}-${i}`}
      className="emergency-panel__city"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(i * 0.04, 1), duration: 0.3 }}
    >
      {city}
    </motion.div>
  ));

  return (
    <AnimatePresence>
      {overlays.length > 0 && (
        <motion.div
          className={panelClass}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          key="emergency-panel"
        >
          {/* Header */}
          <div className="emergency-panel__header">
            <div className="emergency-panel__siren">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 19h20L12 2z" fill="#ff2d55" opacity="0.2" />
                <path d="M12 2L2 19h20L12 2z" stroke="#fff" strokeWidth="1.5" fill="none" />
                <line x1="12" y1="9" x2="12" y2="13" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="16" r="1" fill="#fff" />
              </svg>
            </div>
            <div className="emergency-panel__title">התרעות</div>
            <div className="emergency-panel__subtitle">פיקוד העורף</div>
          </div>

          {/* Alert type bar */}
          <div className="emergency-panel__type">
            {alertType}
          </div>

          {/* City list with vertical auto-scroll */}
          <div className="emergency-panel__cities" ref={containerRef}>
            <div
              className={`emergency-panel__cities-track${needsScroll ? ' emergency-panel__cities-track--scrolling' : ''}`}
              ref={innerRef}
              style={needsScroll ? { animationDuration: `${scrollDuration}s` } : undefined}
            >
              {cityElements}
            </div>
            {/* Duplicate for seamless loop — only rendered when scrolling */}
            {needsScroll && (
              <div
                className="emergency-panel__cities-track emergency-panel__cities-track--scrolling"
                aria-hidden="true"
                style={{ animationDuration: `${scrollDuration}s` }}
              >
                {uniqueCities.map((city, i) => (
                  <div key={`dup-${city}-${i}`} className="emergency-panel__city">
                    {city}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pulsing stripe at left edge */}
          <div className="emergency-panel__edge" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
