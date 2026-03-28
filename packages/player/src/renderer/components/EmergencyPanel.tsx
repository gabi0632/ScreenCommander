import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ActiveOverlay } from '../hooks/useOverlays';

interface EmergencyPanelProps {
  overlays: ActiveOverlay[];
}

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

  // Use wider panel with columns when many cities
  const columnCount = uniqueCities.length > 20 ? 3 : uniqueCities.length > 8 ? 2 : 1;
  const panelClass = `emergency-panel${columnCount > 1 ? ` emergency-panel--cols-${columnCount}` : ''}`;

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

          {/* City list — multi-column when many cities */}
          <div className="emergency-panel__cities">
            {uniqueCities.map((city, i) => (
              <motion.div
                key={`${city}-${i}`}
                className="emergency-panel__city"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.04, 1), duration: 0.3 }}
              >
                {city}
              </motion.div>
            ))}
          </div>

          {/* Pulsing stripe at left edge */}
          <div className="emergency-panel__edge" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
