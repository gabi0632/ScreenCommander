import './Toggle.css';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label className={`toggle-label ${disabled ? 'toggle-label--disabled' : ''}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`toggle-track ${checked ? 'toggle-track--on' : 'toggle-track--off'}`}
      >
        <span className={`toggle-thumb ${checked ? 'toggle-thumb--on' : 'toggle-thumb--off'}`} />
      </button>
      {label && <span className="toggle-text">{label}</span>}
    </label>
  );
}
