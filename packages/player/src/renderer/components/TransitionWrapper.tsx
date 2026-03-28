import React, { useState, useEffect, useRef } from 'react';

interface TransitionWrapperProps {
  transition: 'cut' | 'fade' | 'slide';
  durationMs: number;
  contentKey: string;
  children: React.ReactNode;
}

export function TransitionWrapper({
  transition,
  durationMs,
  contentKey,
  children,
}: TransitionWrapperProps): React.JSX.Element {
  const [currentChildren, setCurrentChildren] = useState<React.ReactNode>(children);
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle');
  const prevKeyRef = useRef(contentKey);

  useEffect(() => {
    if (contentKey === prevKeyRef.current) {
      setCurrentChildren(children);
      return;
    }

    prevKeyRef.current = contentKey;

    if (transition === 'cut') {
      setCurrentChildren(children);
      return;
    }

    // Start exit phase
    setPhase('exit');

    const exitTimer = setTimeout(() => {
      setCurrentChildren(children);
      setPhase('enter');

      const enterTimer = setTimeout(() => {
        setPhase('idle');
      }, durationMs);

      return () => clearTimeout(enterTimer);
    }, durationMs);

    return () => clearTimeout(exitTimer);
  }, [contentKey, children, transition, durationMs]);

  const getClassName = (): string => {
    if (phase === 'idle' || transition === 'cut') return 'transition-wrapper';

    const prefix = `transition-${transition}`;
    if (phase === 'exit') return `transition-wrapper ${prefix}-exit ${prefix}-exit-active`;
    if (phase === 'enter') return `transition-wrapper ${prefix}-enter ${prefix}-enter-active`;

    return 'transition-wrapper';
  };

  return (
    <div
      className={getClassName()}
      style={{
        '--transition-duration': `${durationMs}ms`,
      } as React.CSSProperties}
    >
      {currentChildren}
    </div>
  );
}
