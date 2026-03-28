import type { ReactNode } from 'react';
import './Badge.css';

type BadgeVariant = 'default' | 'accent' | 'red' | 'amber' | 'blue' | 'purple';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  pulse?: boolean;
}

export function Badge({ variant = 'default', children, pulse }: BadgeProps) {
  return (
    <span className={`badge badge--${variant} ${pulse ? 'animate-pulse' : ''}`}>
      {pulse && <span className={`badge-dot`} style={{ background: 'currentColor' }} />}
      {children}
    </span>
  );
}

export function PortBadge({ type }: { type: string }) {
  const isHdmi = type.toUpperCase().includes('HDMI');
  return (
    <Badge variant={isHdmi ? 'blue' : 'purple'}>
      {isHdmi ? 'HDMI' : 'DisplayPort'}
    </Badge>
  );
}
