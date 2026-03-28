import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react';
import './Input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  ltr?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, ltr, className = '', type, ...props }, ref) {
    const inputClasses = [
      'sc-input',
      ltr || type === 'url' || type === 'email' ? 'sc-input--ltr' : '',
      type === 'number' ? 'sc-input--number' : '',
      error ? 'sc-input--error' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="sc-input-wrapper">
        {label && <label className="sc-input-label">{label}</label>}
        <input ref={ref} type={type} className={inputClasses} {...props} />
        {error && <span className="sc-input-error">{error}</span>}
      </div>
    );
  },
);

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, error, className = '', ...props }, ref) {
    const classes = [
      'sc-input',
      'sc-textarea',
      error ? 'sc-input--error' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="sc-input-wrapper">
        {label && <label className="sc-input-label">{label}</label>}
        <textarea ref={ref} className={classes} {...props} />
        {error && <span className="sc-input-error">{error}</span>}
      </div>
    );
  },
);
