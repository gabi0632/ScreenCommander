import { useState } from 'react';
import type { Display } from '@screen-commander/shared';
import { DisplayStatus, ConnectionType } from '@screen-commander/shared';

import { CHANNEL_NAMES } from '../lib/constants';
import { Badge, PortBadge } from './ui/Badge';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';
import { useIdentifyDisplay, useDeleteDisplay, useUpdateDisplay, useAudioDevices } from '../hooks/useDisplays';
import { ChangeUrlModal } from './modals/ChangeUrlModal';
import { SendMessageToDisplayModal } from './modals/SendMessageToDisplayModal';
import './DisplayCard.css';

interface DisplayCardProps {
  display: Display;
}

const statusLabels: Record<string, { label: string; variant: 'accent' | 'amber' | 'red' | 'default' }> = {
  [DisplayStatus.ONLINE]: { label: 'פעיל', variant: 'accent' },
  [DisplayStatus.PLAYING]: { label: 'פעיל', variant: 'accent' },
  [DisplayStatus.IDLE]: { label: 'המתנה', variant: 'amber' },
  [DisplayStatus.OFFLINE]: { label: 'מנותק', variant: 'default' },
  [DisplayStatus.ERROR]: { label: 'שגיאה', variant: 'red' },
};

function formatUptime(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString('he-IL');
}

export function DisplayCard({ display }: DisplayCardProps) {
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [msgModalOpen, setMsgModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(display.name);

  const identify = useIdentifyDisplay();
  const deleteDisplay = useDeleteDisplay();
  const updateDisplay = useUpdateDisplay();
  const { data: audioDevices } = useAudioDevices();
  const { toast } = useToast();

  const handleNameSave = () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === display.name) {
      setEditing(false);
      setEditName(display.name);
      return;
    }
    updateDisplay.mutate(
      { id: display.id, name: trimmed },
      {
        onSuccess: () => {
          toast(`שם עודכן ל-${trimmed}`, 'success');
          setEditing(false);
        },
        onError: () => {
          toast('שגיאה בעדכון שם', 'error');
          setEditName(display.name);
          setEditing(false);
        },
      },
    );
  };

  const statusInfo = statusLabels[display.status] ?? { label: display.status, variant: 'default' as const };

  const handleIdentify = () => {
    identify.mutate(display.id, {
      onSuccess: () => toast(`זוהה: ${display.name}`, 'success'),
    });
  };

  const handleDelete = () => {
    deleteDisplay.mutate(display.id, {
      onSuccess: () => toast(`${display.name} הוסר`, 'info'),
    });
  };

  return (
    <>
      <div className="display-card">
        <div className="display-card-preview">
          <div className="display-card-badges">
            <Badge
              variant={statusInfo.variant}
              pulse={display.status === DisplayStatus.ONLINE || display.status === DisplayStatus.PLAYING}
            >
              {statusInfo.label}
            </Badge>
            <PortBadge
              type={display.connectionType === ConnectionType.HDMI ? 'HDMI' : 'DisplayPort'}
            />
          </div>
          {display.currentContent ? (
            <img
              src={`/api/displays/${display.id}/screenshot?t=${Date.now()}`}
              alt={display.name}
              className="display-card-preview-img"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="display-card-preview-url">ללא תוכן</div>
          )}
        </div>

        <div className="display-card-body">
          <div className="display-card-header">
            {editing ? (
              <input
                className="display-card-name-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSave();
                  if (e.key === 'Escape') { setEditing(false); setEditName(display.name); }
                }}
                autoFocus
              />
            ) : (
              <span
                className="display-card-name"
                onClick={() => { setEditing(true); setEditName(display.name); }}
                title="לחץ לעריכת שם"
                style={{ cursor: 'pointer' }}
              >
                {display.name} ✏️
              </span>
            )}
          </div>

          {display.currentContent && (
            <div className="display-card-url">
              {CHANNEL_NAMES[display.currentContent.url]
                ? `${CHANNEL_NAMES[display.currentContent.url]} — ${display.currentContent.url}`
                : display.currentContent.url}
            </div>
          )}

          <div className="display-card-meta">
            <span className="display-card-meta-item display-card-meta-item--mono">
              {display.width}x{display.height}
            </span>
            <span className="display-card-meta-item">
              {display.portLabel}
            </span>
            <span className="display-card-meta-item">
              פעיל מאז: {formatUptime(display.createdAt)}
            </span>
          </div>

          <div className="display-card-audio">
            <label className="display-card-audio-label">יציאת שמע:</label>
            <select
              className="display-card-audio-select"
              value={display.audioDeviceId ?? ''}
              onChange={(e) => {
                const value = e.target.value || null;
                updateDisplay.mutate(
                  { id: display.id, audioDeviceId: value },
                  {
                    onSuccess: () => {
                      toast(value ? `שמע: ${value}` : 'שמע: ברירת מחדל', 'success');
                      // Reload player so it picks up the new audio device
                      setTimeout(() => {
                        void fetch(`/api/displays/reload-all`, { method: 'POST' }).catch(() => {});
                      }, 300);
                    },
                    onError: () => toast('שגיאה בעדכון שמע', 'error'),
                  },
                );
              }}
            >
              <option value="">אוטומטי (ברירת מחדל)</option>
              {audioDevices?.map((d) => (
                <option key={d.deviceId} value={d.name}>
                  {d.customName || d.screenName ? `${d.customName || d.screenName}` : d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="display-card-actions">
            <Button size="sm" onClick={() => setUrlModalOpen(true)}>
              שנה URL
            </Button>
            <Button size="sm" onClick={() => setMsgModalOpen(true)}>
              הודעה
            </Button>
            <Button size="sm" onClick={handleIdentify}>
              זהה
            </Button>
            <Button size="sm" variant="danger" onClick={handleDelete}>
              הסר
            </Button>
          </div>
        </div>
      </div>

      <ChangeUrlModal
        open={urlModalOpen}
        onClose={() => setUrlModalOpen(false)}
        displayId={display.id}
        displayName={display.name}
        currentUrl={display.currentContent?.url}
      />
      <SendMessageToDisplayModal
        open={msgModalOpen}
        onClose={() => setMsgModalOpen(false)}
        displayId={display.id}
        displayName={display.name}
      />
    </>
  );
}
