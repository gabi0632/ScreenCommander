import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { useAudioDevices, useDisplays } from '../../hooks/useDisplays';
import { api } from '../../lib/api';
import './AudioDeviceNamesModal.css';

interface AudioDeviceNamesModalProps {
  open: boolean;
  onClose: () => void;
}

function ComboInput({
  value,
  onChange,
  suggestions,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder: string;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="combo-input-wrapper">
      <div className="combo-input-row">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setDropdownOpen(true)}
          className="combo-input-field"
        />
      </div>
      {dropdownOpen && suggestions.length > 0 && (
        <div className="combo-input-dropdown">
          {suggestions.map((s) => (
            <div
              key={s}
              onClick={() => { onChange(s); setDropdownOpen(false); }}
              className="combo-input-option"
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AudioDeviceNamesModal({ open, onClose }: AudioDeviceNamesModalProps) {
  const { data: devices, isLoading } = useAudioDevices();
  const { data: displays } = useDisplays();
  const [names, setNames] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    if (open && devices) {
      const initial: Record<string, string> = {};
      devices.forEach((d) => {
        if (d.customName) initial[d.name] = d.customName;
      });
      setNames(initial);
    }
  }, [open, devices]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/system/audio-device-names', names);
      void qc.invalidateQueries({ queryKey: ['audio-devices'] });
      toast('שמות יציאות השמע עודכנו', 'success');
      onClose();
    } catch {
      toast('שגיאה בשמירת שמות', 'error');
    } finally {
      setSaving(false);
    }
  };

  const suggestions = displays?.filter((d) => !d.isPrimary).map((d) => d.name) ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="שמות יציאות שמע"
      footer={
        <div className="audio-names-footer">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'שומר...' : 'שמור'}
          </Button>
          <Button variant="ghost" onClick={onClose}>ביטול</Button>
        </div>
      }
    >
      {isLoading ? (
        <p className="audio-names-loading">טוען...</p>
      ) : (
        <div className="audio-names-list">
          <p className="audio-names-hint">
            בחר שם מהרשימה או הקלד שם מותאם לכל יציאת שמע
          </p>

          {devices?.map((d) => (
            <div key={d.deviceId} className="audio-names-row">
              <div className="audio-names-device-info">
                <div className="audio-names-device-name">
                  {d.name}
                </div>
                {d.screenName && (
                  <div className="audio-names-screen-name">
                    {d.screenName}
                  </div>
                )}
              </div>
              <ComboInput
                value={names[d.name] ?? ''}
                onChange={(v) => setNames((prev) => {
                  const next = { ...prev };
                  if (v) { next[d.name] = v; } else { delete next[d.name]; }
                  return next;
                })}
                suggestions={suggestions}
                placeholder="בחר או הקלד שם..."
              />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
