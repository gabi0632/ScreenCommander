import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Toggle } from '../ui/Toggle';
import { Select } from '../ui/Select';
import { useToast } from '../ui/Toast';
import { useSettings, useUpdateSettings, useExportSettings, useImportSettings, useResetSettings } from '../../hooks/useSettings';
import { useDisplays } from '../../hooks/useDisplays';
import { useTestRedAlert } from '../../hooks/useRedAlert';
import type { AppSettings } from '@screen-commander/shared';
import { DEFAULT_SETTINGS } from '@screen-commander/shared';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type Section = 'general' | 'network' | 'players' | 'messages' | 'red-alert' | 'backup' | 'about';

const sections: { key: Section; label: string }[] = [
  { key: 'general', label: 'כללי' },
  { key: 'network', label: 'רשת' },
  { key: 'players', label: 'נגנים' },
  { key: 'messages', label: 'הודעות' },
  { key: 'red-alert', label: 'התרעות' },
  { key: 'backup', label: 'גיבוי' },
  { key: 'about', label: 'אודות' },
];

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { data: settings } = useSettings();
  const { data: displays } = useDisplays();
  const updateSettings = useUpdateSettings();
  const exportSettings = useExportSettings();
  const importSettings = useImportSettings();
  const resetSettings = useResetSettings();
  const testRedAlert = useTestRedAlert();
  const { toast } = useToast();

  const [active, setActive] = useState<Section>('general');
  const [form, setForm] = useState<AppSettings | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (settings) setForm({ ...DEFAULT_SETTINGS, ...settings });
  }, [settings]);

  const handleSave = () => {
    if (!form) return;
    updateSettings.mutate(form, {
      onSuccess: () => {
        toast('ההגדרות נשמרו', 'success');
        onClose();
      },
      onError: () => toast('שגיאה בשמירת ההגדרות', 'error'),
    });
  };

  const handleExport = () => {
    exportSettings.mutate(undefined, {
      onSuccess: (data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'screen-commander-settings.json';
        a.click();
        URL.revokeObjectURL(url);
        toast('הגדרות יוצאו בהצלחה', 'success');
      },
    });
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string) as AppSettings;
          importSettings.mutate(data, {
            onSuccess: () => toast('הגדרות יובאו בהצלחה', 'success'),
            onError: () => toast('שגיאה בייבוא הגדרות', 'error'),
          });
        } catch {
          toast('קובץ לא תקין', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    resetSettings.mutate(undefined, {
      onSuccess: () => {
        toast('ההגדרות אופסו', 'success');
        setConfirmReset(false);
        onClose();
      },
    });
  };

  if (!form) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="הגדרות"
      large
      footer={
        <>
          <Button variant="primary" onClick={handleSave} disabled={updateSettings.isPending}>
            שמור
          </Button>
          <Button onClick={onClose}>ביטול</Button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 24, minHeight: 400 }}>
        {/* Section tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 120 }}>
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: active === s.key ? 'var(--accent-glow)' : 'transparent',
                color: active === s.key ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: '0.875rem',
                fontFamily: 'var(--font-body)',
                cursor: 'pointer',
                textAlign: 'right',
                transition: 'all var(--transition-fast)',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Section content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {active === 'general' && (
            <>
              <Input
                label="שם המערכת"
                value={form.general.systemName}
                onChange={(e) => setForm({ ...form, general: { ...form.general, systemName: e.target.value } })}
              />
              <Select
                label="שפה"
                value={form.general.language}
                onChange={(e) => setForm({ ...form, general: { ...form.general, language: e.target.value } })}
                options={[{ value: 'he', label: 'עברית' }, { value: 'en', label: 'English' }]}
              />
              <Select
                label="ערכת נושא"
                value={form.general.theme}
                onChange={(e) => setForm({ ...form, general: { ...form.general, theme: e.target.value } })}
                options={[{ value: 'dark', label: 'כהה' }, { value: 'light', label: 'בהיר' }]}
              />
            </>
          )}

          {active === 'network' && (
            <>
              <Input
                label="פורט שרת"
                type="number"
                value={form.network.port}
                onChange={(e) => setForm({ ...form, network: { ...form.network, port: parseInt(e.target.value, 10) || 3000 } })}
              />
              <Input
                label="כתובת שרת"
                type="url"
                value={form.network.backendUrl}
                onChange={(e) => setForm({ ...form, network: { ...form.network, backendUrl: e.target.value } })}
                ltr
              />
            </>
          )}

          {active === 'players' && (
            <>
              <Toggle
                label="הפעלה אוטומטית"
                checked={form.players.autoStart}
                onChange={(v) => setForm({ ...form, players: { ...form.players, autoStart: v } })}
              />
              <Toggle
                label="מצב קיוסק"
                checked={form.players.kioskMode}
                onChange={(v) => setForm({ ...form, players: { ...form.players, kioskMode: v } })}
              />
              <Toggle
                label="הסתר סמן"
                checked={form.players.hideCursor}
                onChange={(v) => setForm({ ...form, players: { ...form.players, hideCursor: v } })}
              />
              <Select
                label="איכות עיבוד"
                value={form.players.renderQuality}
                onChange={(e) => setForm({ ...form, players: { ...form.players, renderQuality: e.target.value as 'low' | 'medium' | 'high' } })}
                options={[
                  { value: 'low', label: 'נמוכה' },
                  { value: 'medium', label: 'בינונית' },
                  { value: 'high', label: 'גבוהה' },
                ]}
              />
            </>
          )}

          {active === 'messages' && (
            <>
              <Input
                label="משך ברירת מחדל (שניות)"
                type="number"
                value={form.messages.defaultDuration}
                onChange={(e) => setForm({ ...form, messages: { ...form.messages, defaultDuration: parseInt(e.target.value, 10) || 30 } })}
              />
              <Select
                label="אנימציה ברירת מחדל"
                value={form.messages.defaultAnimation}
                onChange={(e) => setForm({ ...form, messages: { ...form.messages, defaultAnimation: e.target.value } })}
                options={[
                  { value: 'fade-in', label: 'דעיכה' },
                  { value: 'slide-up', label: 'גלילה למעלה' },
                  { value: 'slide-left', label: 'גלילה שמאלה' },
                  { value: 'typewriter', label: 'מכונת כתיבה' },
                ]}
              />
              <Select
                label="מיקום ברירת מחדל"
                value={form.messages.defaultPosition}
                onChange={(e) => setForm({ ...form, messages: { ...form.messages, defaultPosition: e.target.value } })}
                options={[
                  { value: 'top', label: 'למעלה' },
                  { value: 'bottom', label: 'למטה' },
                  { value: 'center', label: 'מרכז' },
                  { value: 'ticker', label: 'טיקר' },
                ]}
              />
              <Input
                label="גודל גופן ברירת מחדל"
                type="number"
                value={form.messages.defaultFontSize}
                onChange={(e) => setForm({ ...form, messages: { ...form.messages, defaultFontSize: parseInt(e.target.value, 10) || 24 } })}
              />
            </>
          )}

          {active === 'red-alert' && (
            <>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: 12 }}>
                חיבור לשירות צבע אדום — התרעות בזמן אמת מפיקוד העורף
              </p>
              <Toggle
                label="הפעל שירות התרעות"
                checked={form.redAlert?.enabled ?? false}
                onChange={(v) => setForm({ ...form, redAlert: { ...form.redAlert, enabled: v } })}
              />
              <div style={{ marginTop: 8, padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                  ערים מנוטרות: <strong style={{ color: 'var(--text-primary)' }}>{(form.redAlert?.watchedCities ?? ['צפת']).join(', ')}</strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ניהול מלא של ערים, מסכי יעד ועיצוב — בעמוד התרעות
                </div>
              </div>
              <div style={{ paddingTop: 8, display: 'flex', gap: 8 }}>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    testRedAlert.mutate(undefined, {
                      onSuccess: () => toast('התרעת מבחן נשלחה', 'success'),
                      onError: () => toast('שגיאה בשליחת התרעת מבחן', 'error'),
                    });
                  }}
                  disabled={testRedAlert.isPending}
                >
                  שלח התרעת מבחן
                </Button>
              </div>
            </>
          )}

          {active === 'backup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 8 }}>
                ייצוא וייבוא הגדרות המערכת
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <Button onClick={handleExport}>ייצוא הגדרות</Button>
                <Button onClick={handleImport}>ייבוא הגדרות</Button>
              </div>
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 8 }}>
                  איפוס כל ההגדרות לערכי ברירת מחדל
                </p>
                {confirmReset ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ color: 'var(--red)', fontSize: '0.875rem', fontWeight: 500 }}>
                      האם אתה בטוח? פעולה זו תאפס את כל ההגדרות
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button variant="danger" onClick={handleReset}>
                        אישור איפוס
                      </Button>
                      <Button onClick={() => setConfirmReset(false)}>
                        ביטול
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="danger" onClick={handleReset}>
                    איפוס הגדרות
                  </Button>
                )}
              </div>
            </div>
          )}

          {active === 'about' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>שם המערכת</div>
                <div style={{ color: 'var(--text-primary)' }}>ScreenCommander</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>גרסה</div>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', direction: 'ltr', textAlign: 'right' }}>0.1.0</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>תיאור</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  מערכת ניהול שידור רב-מסכית לסביבת Windows. מחשב אחד, מספר יציאות HDMI/DisplayPort, כל מסך מציג תוכן שונה.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
