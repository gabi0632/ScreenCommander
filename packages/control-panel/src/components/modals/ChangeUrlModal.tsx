import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useToast } from '../ui/Toast';
import { useAssignContent } from '../../hooks/useDisplays';
import { ContentType, TransitionType } from '@screen-commander/shared';
import { ChannelManager } from '../ChannelManager';
import { PRESET_CHANNELS } from '../../lib/constants';

interface ChangeUrlModalProps {
  open: boolean;
  onClose: () => void;
  displayId: string;
  displayName: string;
  currentUrl?: string;
}

const transitionOptions = [
  { value: TransitionType.CUT, label: 'חיתוך' },
  { value: TransitionType.FADE, label: 'דעיכה' },
  { value: TransitionType.SLIDE, label: 'גלילה' },
];

function detectContentType(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('.m3u8') || lower.includes('/hls/') || lower.includes('livehls')) return ContentType.HLS_STREAM;
  if (lower.startsWith('rtmp://')) return ContentType.RTMP_STREAM;
  if (/youtube\.com|youtu\.be/i.test(url)) return ContentType.YOUTUBE;
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) return ContentType.LOCAL_VIDEO;
  if (/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)) return ContentType.LOCAL_IMAGE;
  return ContentType.WEB_URL;
}

type TabType = 'channels' | 'custom';

export function ChangeUrlModal({ open, onClose, displayId, displayName, currentUrl }: ChangeUrlModalProps) {
  const [tab, setTab] = useState<TabType>('channels');
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const [customUrl, setCustomUrl] = useState('');
  const [contentType, setContentType] = useState<string>(ContentType.HLS_STREAM);
  const [transition, setTransition] = useState<string>(TransitionType.CUT);
  const [duration, setDuration] = useState(500);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('הכל');

  const assignContent = useAssignContent();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      if (currentUrl) {
        const preset = PRESET_CHANNELS.find((ch) => ch.url === currentUrl);
        if (preset) {
          setTab('channels');
          setSelectedUrl(preset.url);
          setCustomUrl('');
        } else {
          setTab('custom');
          setCustomUrl(currentUrl);
          setSelectedUrl('');
        }
        setContentType(detectContentType(currentUrl));
      } else {
        setTab('channels');
        setSelectedUrl('');
        setCustomUrl('');
      }
      setSearch('');
      setActiveCategory('הכל');
    }
  }, [open, currentUrl]);

  const effectiveUrl = tab === 'custom' ? customUrl.trim() : selectedUrl;
  const currentChannelName = PRESET_CHANNELS.find((ch) => ch.url === currentUrl)?.name;

  const handleSubmit = () => {
    if (!effectiveUrl) {
      toast('יש לבחור ערוץ או להזין כתובת', 'error');
      return;
    }
    assignContent.mutate(
      {
        displayId,
        contentType: (tab === 'custom' ? contentType : detectContentType(effectiveUrl)) as typeof ContentType[keyof typeof ContentType],
        url: effectiveUrl,
        transition: transition as typeof TransitionType[keyof typeof TransitionType],
        transitionDurationMs: duration,
      },
      {
        onSuccess: () => {
          toast(`תוכן עודכן עבור ${displayName}`, 'success');
          onClose();
        },
        onError: () => toast('שגיאה בעדכון תוכן', 'error'),
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`שנה תוכן — ${displayName}`}
      footer={
        <>
          <Button variant="primary" onClick={handleSubmit} disabled={assignContent.isPending || !effectiveUrl}>
            החל
          </Button>
          <Button onClick={onClose}>ביטול</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 400 }}>
        {/* Current content indicator */}
        {currentChannelName && (
          <div style={{
            padding: '8px 14px',
            background: 'var(--accent-glow)',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8125rem',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
            משדר כעת: {currentChannelName}
          </div>
        )}

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)' }}>
          {([['channels', 'ערוצים'], ['custom', 'כתובת מותאמת']] as [TabType, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px 16px', background: 'transparent', border: 'none',
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -2,
                color: tab === t ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: tab === t ? 600 : 400, fontSize: '0.875rem',
                cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all var(--transition-fast)',
              }}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'channels' && (
          <ChannelManager
            selectedUrl={selectedUrl}
            onSelect={(url) => { setSelectedUrl(url); setContentType(detectContentType(url)); }}
          />
        )}

        {tab === 'custom' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input
              label="כתובת URL"
              type="url"
              value={customUrl}
              onChange={(e) => {
                setCustomUrl(e.target.value);
                setContentType(detectContentType(e.target.value));
              }}
              placeholder="https://example.com/stream.m3u8"
              ltr
            />
            <Select
              label="סוג תוכן"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              options={[
                { value: ContentType.WEB_URL, label: 'כתובת אינטרנט' },
                { value: ContentType.YOUTUBE, label: 'YouTube' },
                { value: ContentType.HLS_STREAM, label: 'HLS Stream' },
                { value: ContentType.RTMP_STREAM, label: 'RTMP Stream' },
                { value: ContentType.LOCAL_VIDEO, label: 'וידאו מקומי' },
                { value: ContentType.LOCAL_IMAGE, label: 'תמונה מקומית' },
                { value: ContentType.CUSTOM_HTML, label: 'HTML מותאם' },
              ]}
            />
          </div>
        )}

        {/* Transition settings — compact row */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Select
              label="מעבר"
              value={transition}
              onChange={(e) => setTransition(e.target.value)}
              options={transitionOptions}
            />
          </div>
          <div style={{ width: 120 }}>
            <Input
              label="משך (ms)"
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10) || 500)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
