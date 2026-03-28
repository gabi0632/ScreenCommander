import { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useToast } from '../ui/Toast';
import { useAssignContent } from '../../hooks/useDisplays';
import { ContentType, TransitionType } from '@screen-commander/shared';

interface ChangeUrlModalProps {
  open: boolean;
  onClose: () => void;
  displayId: string;
  displayName: string;
  currentUrl?: string;
}

interface Channel {
  name: string;
  url: string;
  category: string;
}

const PRESET_CHANNELS: Channel[] = [
  // חדשות ואקטואליה
  { name: 'כאן 11', url: 'https://kancdn.medonecdn.net/livehls/oil/kancdn-live/live/kan11/live.livx/playlist.m3u8', category: 'חדשות' },
  { name: 'ערוץ 12', url: 'https://mako-streaming.akamaized.net/direct/hls/live/2033791/k12/index_2200.m3u8', category: 'חדשות' },
  { name: 'ערוץ 13 (כתוביות)', url: 'https://reshet.g-mana.live/media/6f10d1da-0803-48d9-9272-57a811958974/mainManifest.m3u8', category: 'חדשות' },
  { name: 'i24NEWS עברית', url: 'https://bcovlive-a.akamaihd.net/d89ede8094c741b7924120b27764153c/eu-central-1/5377161796001/playlist.m3u8', category: 'חדשות' },
  // ילדים וחינוך
  { name: 'כאן חינוכית', url: 'https://kancdn.medonecdn.net/livehls/oil/kancdn-live/live/kan_edu/live.livx/playlist.m3u8', category: 'ילדים וחינוך' },
  // ציבורי וממשלתי
  // דת ורוחניות
  { name: 'הידברות', url: 'https://cdn.cybercdn.live/HidabrootIL/Live97/playlist.m3u8', category: 'דת' },
  // בינלאומי
  { name: 'אל ג׳זירה', url: 'https://live-hls-apps-aja-fa.getaj.net/AJA/index.m3u8', category: 'בינלאומי' },
  { name: 'BBC News', url: 'https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_news_channel_hd/t=3840/v=pv14/b=5070016/main.m3u8', category: 'בינלאומי' },
  { name: 'Fox News (720p)', url: 'https://radiovid.foxnews.com/hls/live/661547/RADIOVID/index.m3u8', category: 'בינלאומי' },
  { name: 'Fox News (480p)', url: 'http://41.205.93.154/FOX-NEWS/index.m3u8', category: 'בינלאומי' },
  { name: 'CBS News', url: 'https://cbsn-us.cbsnstream.cbsnews.com/out/v1/55a8648e8f134e82a470f83d562deeca/master.m3u8', category: 'בינלאומי' },
  { name: 'CBS New York', url: 'https://cbsn-ny.cbsnstream.cbsnews.com/out/v1/ec3897d58a9b45129a77d67aa247d136/master.m3u8', category: 'בינלאומי' },
  { name: 'Bloomberg TV', url: 'https://www.bloomberg.com/media-manifest/streams/us.m3u8', category: 'בינלאומי' },
  { name: 'Newsmax', url: 'https://nmx1ota.akamaized.net/hls/live/2107010/Live_1/index.m3u8', category: 'בינלאומי' },
  { name: 'Newsmax 2', url: 'https://nmxlive.akamaized.net/hls/live/529965/Live_1/index.m3u8', category: 'בינלאומי' },
  { name: 'CNBC', url: 'https://stream.livenewsplay.com:9443/hls/cnbc/cnbcsd.m3u8', category: 'בינלאומי' },
];

const CATEGORIES = ['הכל', 'חדשות', 'ילדים וחינוך', 'דת', 'בינלאומי'];

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

  const filteredChannels = useMemo(() => {
    let channels = PRESET_CHANNELS;
    if (activeCategory !== 'הכל') {
      channels = channels.filter((ch) => ch.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      channels = channels.filter((ch) => ch.name.toLowerCase().includes(q));
    }
    return channels;
  }, [search, activeCategory]);

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
          <button
            onClick={() => setTab('channels')}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === 'channels' ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -2,
              color: tab === 'channels' ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: tab === 'channels' ? 600 : 400,
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              transition: 'all var(--transition-fast)',
            }}
          >
            ערוצים ({PRESET_CHANNELS.length})
          </button>
          <button
            onClick={() => setTab('custom')}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === 'custom' ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -2,
              color: tab === 'custom' ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: tab === 'custom' ? 600 : 400,
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              transition: 'all var(--transition-fast)',
            }}
          >
            כתובת מותאמת
          </button>
        </div>

        {tab === 'channels' && (
          <>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חפש ערוץ..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                  transition: 'border-color var(--transition-fast)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              />
            </div>

            {/* Category pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '9999px',
                    border: '1px solid',
                    borderColor: activeCategory === cat ? 'var(--accent)' : 'var(--border)',
                    background: activeCategory === cat ? 'var(--accent-glow)' : 'transparent',
                    color: activeCategory === cat ? 'var(--accent)' : 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    transition: 'all var(--transition-fast)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Channel grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: 8,
              maxHeight: 280,
              overflowY: 'auto',
              padding: 2,
            }}>
              {filteredChannels.map((ch) => {
                const isSelected = selectedUrl === ch.url;
                const isCurrent = currentUrl === ch.url;
                return (
                  <button
                    key={ch.url}
                    onClick={() => setSelectedUrl(ch.url)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '14px 8px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: isSelected ? 'var(--accent-glow)' : 'var(--bg-card)',
                      color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.8125rem',
                      fontWeight: isSelected ? 600 : 400,
                      textAlign: 'center',
                      transition: 'all var(--transition-fast)',
                      position: 'relative',
                      minHeight: 64,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.borderColor = 'var(--accent)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    {isCurrent && (
                      <span style={{
                        position: 'absolute',
                        top: 4,
                        left: 4,
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        animation: 'pulse 2s ease-in-out infinite',
                      }} />
                    )}
                    <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>
                      {ch.category === 'חדשות' ? '📺' : ch.category === 'בינלאומי' ? '🌍' : ch.category === 'ילדים וחינוך' ? '🎓' : ch.category === 'ציבורי' ? '🏛' : ch.category === 'דת' ? '✡' : '🛒'}
                    </span>
                    {ch.name}
                  </button>
                );
              })}

              {filteredChannels.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  לא נמצאו ערוצים
                </div>
              )}
            </div>
          </>
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
