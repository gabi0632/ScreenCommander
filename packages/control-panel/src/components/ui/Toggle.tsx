interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative',
          width: 40,
          height: 22,
          borderRadius: 11,
          border: 'none',
          background: checked ? 'var(--accent)' : 'var(--bg-elevated)',
          cursor: 'inherit',
          transition: 'background var(--transition-fast)',
          padding: 0,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 20 : 2,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: checked ? 'var(--bg-deep)' : 'var(--text-muted)',
            transition: 'left var(--transition-fast)',
          }}
        />
      </button>
      {label && (
        <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
          {label}
        </span>
      )}
    </label>
  );
}
