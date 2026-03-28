import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'accent' | 'red' | 'amber' | 'blue' | 'purple';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  pulse?: boolean;
}

const variantStyles: Record<BadgeVariant, { bg: string; color: string; glow: string }> = {
  default: { bg: 'var(--bg-elevated)', color: 'var(--text-secondary)', glow: 'none' },
  accent: { bg: 'var(--accent-glow)', color: 'var(--accent)', glow: 'var(--accent-glow)' },
  red: { bg: 'var(--red-glow)', color: 'var(--red)', glow: 'var(--red-glow)' },
  amber: { bg: 'var(--amber-glow)', color: 'var(--amber)', glow: 'var(--amber-glow)' },
  blue: { bg: 'var(--blue-glow)', color: 'var(--blue)', glow: 'var(--blue-glow)' },
  purple: { bg: 'var(--purple-glow)', color: 'var(--purple)', glow: 'var(--purple-glow)' },
};

export function Badge({ variant = 'default', children, pulse }: BadgeProps) {
  const s = variantStyles[variant];
  return (
    <span
      className={pulse ? 'animate-pulse' : ''}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '2px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 500,
        background: s.bg,
        color: s.color,
        whiteSpace: 'nowrap',
      }}
    >
      {pulse && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: s.color,
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      )}
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
