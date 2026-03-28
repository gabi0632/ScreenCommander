import { Modal } from '../ui/Modal';

interface HotkeysModalProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: 'Ctrl + Shift + D', description: 'מעבר ללוח בקרה' },
  { keys: 'Ctrl + Shift + M', description: 'פתיחת הודעה חדשה' },
  { keys: 'Ctrl + Shift + S', description: 'פתיחת תזמון' },
  { keys: 'Ctrl + Shift + F', description: 'חיפוש מהיר' },
  { keys: 'Ctrl + Shift + R', description: 'רענון כל המסכים' },
  { keys: 'Ctrl + Shift + B', description: 'כיבוי כל המסכים' },
  { keys: 'Ctrl + Shift + I', description: 'זיהוי מסכים' },
  { keys: 'Ctrl + ,', description: 'פתיחת הגדרות' },
  { keys: 'Escape', description: 'סגירת חלון/מודל' },
  { keys: 'Ctrl + Enter', description: 'שליחת טופס' },
];

export function HotkeysModal({ open, onClose }: HotkeysModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="קיצורי מקלדת">
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                textAlign: 'right',
                padding: '8px 0',
                borderBottom: '1px solid var(--border)',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              פעולה
            </th>
            <th
              style={{
                textAlign: 'left',
                padding: '8px 0',
                borderBottom: '1px solid var(--border)',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              קיצור
            </th>
          </tr>
        </thead>
        <tbody>
          {shortcuts.map((s) => (
            <tr key={s.keys}>
              <td
                style={{
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              >
                {s.description}
              </td>
              <td
                style={{
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border)',
                  textAlign: 'left',
                }}
              >
                <kbd
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-secondary)',
                    direction: 'ltr',
                  }}
                >
                  {s.keys}
                </kbd>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
