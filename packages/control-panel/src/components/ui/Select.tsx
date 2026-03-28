import type { SelectHTMLAttributes } from 'react';
import './Input.css';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export function Select({ label, options, error, className = '', ...props }: SelectProps) {
  const classes = [
    'sc-input',
    error ? 'sc-input--error' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="sc-input-wrapper">
      {label && <label className="sc-input-label">{label}</label>}
      <select className={classes} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="sc-input-error">{error}</span>}
    </div>
  );
}
