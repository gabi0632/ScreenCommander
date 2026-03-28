import { type ReactNode, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  large?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}

export function Modal({ open, onClose, title, large, footer, children }: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return createPortal(
    <div className="sc-modal-overlay" onClick={onClose}>
      <div
        className={`sc-modal ${large ? 'sc-modal--lg' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sc-modal-header">
          <h2 className="sc-modal-title">{title}</h2>
          <button className="sc-modal-close" onClick={onClose} aria-label="סגור">
            &times;
          </button>
        </div>
        <div className="sc-modal-body">{children}</div>
        {footer && <div className="sc-modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
