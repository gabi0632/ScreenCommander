import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { TickerConfig } from '@screen-commander/shared';
import '../styles/ticker.css';

interface TickerBarProps {
  config: TickerConfig;
}

const clockFormatter = new Intl.DateTimeFormat('he-IL', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function TickerBar({ config }: TickerBarProps): React.JSX.Element | null {
  const { backgroundColor, textColor, fontSize, speed, separator, showClock, clockPosition, messages } = config;

  const activeMessages = messages.filter((m) => m.isActive);

  const [time, setTime] = useState(() => clockFormatter.format(new Date()));
  const scrollRef = useRef<HTMLDivElement>(null);
  const [animDuration, setAnimDuration] = useState(20);

  // Live clock — update every second
  useEffect(() => {
    if (!showClock) return;
    const interval = setInterval(() => {
      setTime(clockFormatter.format(new Date()));
    }, 1000);
    return () => clearInterval(interval);
  }, [showClock]);

  // Measure and set duration based on content width
  const measureAndSetDuration = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // scrollWidth includes the padding-left (100% of parent) + text width
    const totalWidth = el.scrollWidth;
    const pixelsPerSecond = speed * 15;
    const duration = Math.max(5, totalWidth / pixelsPerSecond);
    setAnimDuration(duration);
  }, [speed]);

  useEffect(() => {
    const raf = requestAnimationFrame(measureAndSetDuration);
    const el = scrollRef.current;
    if (!el) return () => cancelAnimationFrame(raf);

    const observer = new ResizeObserver(measureAndSetDuration);
    observer.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [measureAndSetDuration, activeMessages]);

  if (activeMessages.length === 0) return null;

  const sep = separator.trim();
  const messageText = activeMessages.map((m) => m.text).join(` ${sep} `);

  const clockElement = showClock ? (
    <div
      className={`ticker-clock ${clockPosition === 'right' ? 'ticker-clock--right' : 'ticker-clock--left'}`}
      style={{ backgroundColor, color: textColor, fontSize: `${fontSize}px` }}
    >
      {time}
    </div>
  ) : null;

  return (
    <div
      className="ticker-bar"
      style={{ backgroundColor, color: textColor, fontSize: `${fontSize}px` }}
      role="marquee"
      aria-live="off"
      aria-label="הודעות רצות"
    >
      {clockPosition === 'left' && clockElement}

      <div className="ticker-scroll-area">
        <div
          ref={scrollRef}
          className="ticker-scroll-content"
          style={{ animationDuration: `${animDuration}s` }}
        >
          {sep} {messageText}
        </div>
      </div>

      {clockPosition === 'right' && clockElement}
    </div>
  );
}
