import { useState } from 'react';
import type { Display } from '@screen-commander/shared';
import { DisplayStatus, ConnectionType } from '@screen-commander/shared';

const CHANNEL_NAMES: Record<string, string> = {
  'https://kancdn.medonecdn.net/livehls/oil/kancdn-live/live/kan11/live.livx/playlist.m3u8': 'כאן 11',
  'https://kancdn.medonecdn.net/livehls/oil/kancdn-live/live/kan_edu/live.livx/playlist.m3u8': 'כאן חינוכית',
  'https://mako-streaming.akamaized.net/direct/hls/live/2033791/k12/index_2200.m3u8': 'ערוץ 12',
  'https://reshet.g-mana.live/media/6f10d1da-0803-48d9-9272-57a811958974/mainManifest.m3u8': 'ערוץ 13',
  'https://bcovlive-a.akamaihd.net/d89ede8094c741b7924120b27764153c/eu-central-1/5377161796001/playlist.m3u8': 'i24NEWS עברית',
  'https://cdn.cybercdn.live/HidabrootIL/Live97/playlist.m3u8': 'הידברות',
  'https://live-hls-apps-aja-fa.getaj.net/AJA/index.m3u8': 'אל ג׳זירה',
  'https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_news_channel_hd/t=3840/v=pv14/b=5070016/main.m3u8': 'BBC News',
  'https://radiovid.foxnews.com/hls/live/661547/RADIOVID/index.m3u8': 'Fox News',
  'http://41.205.93.154/FOX-NEWS/index.m3u8': 'Fox News',
  'https://cbsn-us.cbsnstream.cbsnews.com/out/v1/55a8648e8f134e82a470f83d562deeca/master.m3u8': 'CBS News',
  'https://cbsn-ny.cbsnstream.cbsnews.com/out/v1/ec3897d58a9b45129a77d67aa247d136/master.m3u8': 'CBS New York',
  'https://www.bloomberg.com/media-manifest/streams/us.m3u8': 'Bloomberg TV',
  'https://nmx1ota.akamaized.net/hls/live/2107010/Live_1/index.m3u8': 'Newsmax',
  'https://nmxlive.akamaized.net/hls/live/529965/Live_1/index.m3u8': 'Newsmax 2',
  'https://stream.livenewsplay.com:9443/hls/cnbc/cnbcsd.m3u8': 'CNBC',
};
import { Badge, PortBadge } from './ui/Badge';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';
import { useIdentifyDisplay, useDeleteDisplay, useUpdateDisplay } from '../hooks/useDisplays';
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
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return `${hours}ש ${minutes}ד`;
}

export function DisplayCard({ display }: DisplayCardProps) {
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [msgModalOpen, setMsgModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(display.name);

  const identify = useIdentifyDisplay();
  const deleteDisplay = useDeleteDisplay();
  const updateDisplay = useUpdateDisplay();
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
              זמן פעילות: {formatUptime(display.createdAt)}
            </span>
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
