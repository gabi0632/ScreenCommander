import { useState } from 'react';
import { useDisplays, useBlackoutAll, useIdentifyDisplay } from '../hooks/useDisplays';
import { useSendMessage, useDismissAllMessages, useActiveMessages, useDismissMessage } from '../hooks/useMessages';
import { DisplayCard } from '../components/DisplayCard';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { Input, Textarea } from '../components/ui/Input';
import { ImageInput } from '../components/ui/ImageInput';
import { Select } from '../components/ui/Select';
import { Chip } from '../components/ui/Chip';
import { Badge } from '../components/ui/Badge';
import { DisplayStatus, MessagePosition, MessageAnimation, MessagePriority } from '@screen-commander/shared';
import './DashboardPage.css';

const positionOptions = [
  { value: MessagePosition.BOTTOM, label: 'למטה' },
  { value: MessagePosition.TOP, label: 'למעלה' },
  { value: MessagePosition.CENTER, label: 'מרכז' },
  { value: MessagePosition.TICKER, label: 'טיקר (גלילה)' },
];

const animationOptions = [
  { value: MessageAnimation.FADE_IN, label: 'דעיכה' },
  { value: MessageAnimation.SLIDE_UP, label: 'גלילה למעלה' },
  { value: MessageAnimation.SLIDE_LEFT, label: 'גלילה שמאלה' },
  { value: MessageAnimation.TYPEWRITER, label: 'מכונת כתיבה' },
];

const priorityOptions = [
  { value: MessagePriority.NORMAL, label: 'רגילה' },
  { value: MessagePriority.URGENT, label: 'דחוף' },
  { value: MessagePriority.EMERGENCY, label: 'חירום' },
];

export default function DashboardPage() {
  const { data: displays, isLoading } = useDisplays();
  const { data: activeMessages } = useActiveMessages();
  const blackoutAll = useBlackoutAll();
  const identifyDisplay = useIdentifyDisplay();
  const sendMessage = useSendMessage();
  const dismissAll = useDismissAllMessages();
  const dismissMessage = useDismissMessage();
  const { toast } = useToast();

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bcText, setBcText] = useState('');
  const [bcImageUrl, setBcImageUrl] = useState('');
  const [bcImageSize, setBcImageSize] = useState(50);
  const [bcPosition, setBcPosition] = useState<string>(MessagePosition.BOTTOM);
  const [bcAnimation, setBcAnimation] = useState<string>(MessageAnimation.FADE_IN);
  const [bcDuration, setBcDuration] = useState(30);
  const [bcPriority, setBcPriority] = useState<string>(MessagePriority.NORMAL);
  const [bcFontSize, setBcFontSize] = useState(24);
  const [bcFontColor, setBcFontColor] = useState('#ffffff');
  const [bcBgColor, setBcBgColor] = useState('rgba(0,0,0,0.8)');

  const activeCount = displays?.filter(
    (d) => d.status === DisplayStatus.ONLINE || d.status === DisplayStatus.PLAYING,
  ).length ?? 0;

  const handleBlackoutAll = () => {
    blackoutAll.mutate(undefined, {
      onSuccess: () => toast('כל המסכים כובו', 'success'),
      onError: () => toast('שגיאה בכיבוי', 'error'),
    });
  };

  const handleBroadcastSend = () => {
    if (!bcText.trim() && !bcImageUrl.trim()) {
      toast('יש להזין טקסט או תמונה', 'error');
      return;
    }
    const targetIds = selectedIds.length > 0
      ? selectedIds
      : displays?.filter((d) => d.isEnabled).map((d) => d.id) ?? [];

    sendMessage.mutate(
      {
        text: bcText.trim(),
        imageUrl: bcImageUrl.trim() || undefined,
        imageSize: bcImageSize,
        targetDisplayIds: targetIds,
        position: bcPosition as MessagePosition,
        fontSize: bcFontSize,
        fontColor: bcFontColor,
        backgroundColor: bcBgColor,
        animation: bcAnimation as MessageAnimation,
        displayDuration: bcDuration,
        priority: bcPriority as MessagePriority,
      },
      {
        onSuccess: () => {
          toast('הודעה נשלחה', 'success');
          setBcText('');
          setBcImageUrl('');
          setSelectedIds([]);
          setBroadcastOpen(false);
        },
        onError: () => toast('שגיאה בשליחת הודעה', 'error'),
      },
    );
  };

  const handleIdentifyAll = () => {
    const enabledDisplays = displays?.filter((d) => d.isEnabled) ?? [];
    for (const d of enabledDisplays) {
      identifyDisplay.mutate(d.id);
    }
    toast('מזהה את כל המסכים', 'info');
  };

  const handleDismissMessage = (id: string) => {
    dismissMessage.mutate(id, {
      onSuccess: () => toast('הודעה הופסקה', 'success'),
    });
  };

  const toggleSelectedId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="text-h1">לוח בקרה</h1>
          <p className="text-caption" style={{ marginTop: 4 }}>
            {activeCount} מסכים פעילים מתוך {displays?.length ?? 0}
          </p>
        </div>
        <div className="dashboard-actions">
          <Button onClick={() => setBroadcastOpen(true)}>
            שלח הודעה לכולם
          </Button>
          <Button onClick={handleIdentifyAll}>
            זיהוי מסכים
          </Button>
          <Button variant="danger" onClick={handleBlackoutAll}>
            כבה הכל
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="dashboard-loading">
          <span className="text-caption">טוען מסכים...</span>
        </div>
      ) : displays && displays.length > 0 ? (
        <div className="dashboard-grid">
          {displays.filter((d) => d.isEnabled).map((d) => (
            <DisplayCard key={d.id} display={d} />
          ))}
        </div>
      ) : (
        <div className="dashboard-empty">
          <p className="text-caption">לא נמצאו מסכים פעילים</p>
          <p className="text-caption" style={{ marginTop: 8 }}>
            עבור לזיהוי מסכים כדי להוסיף מסכים חדשים
          </p>
        </div>
      )}

      {/* Active Messages Section */}
      {activeMessages && activeMessages.length > 0 && (
        <div className="dashboard-active-messages">
          <div className="dashboard-section-header">
            <h2 className="text-h2">הודעות פעילות</h2>
            <Button variant="danger" size="sm" onClick={() => dismissAll.mutate(undefined, { onSuccess: () => toast('כל ההודעות הופסקו', 'success') })}>
              הפסק הכל
            </Button>
          </div>
          <div className="dashboard-active-list">
            {activeMessages.map((msg) => (
              <div key={msg.id} className="active-message-card">
                <div className="active-message-content">
                  <div className="active-message-text">
                    {msg.text || (msg.imageUrl ? '(תמונה)' : '')}
                  </div>
                  <div className="active-message-meta">
                    <Badge variant={msg.priority === 'emergency' ? 'red' : msg.priority === 'urgent' ? 'amber' : 'default'}>
                      {msg.priority === 'emergency' ? 'חירום' : msg.priority === 'urgent' ? 'דחוף' : 'רגילה'}
                    </Badge>
                    <span className="text-caption">
                      {msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString('he-IL') : ''}
                    </span>
                    <span className="text-caption">
                      {msg.displayDuration}ש׳
                    </span>
                  </div>
                </div>
                <Button variant="danger" size="sm" onClick={() => handleDismissMessage(msg.id)}>
                  הפסק
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Broadcast Modal */}
      <Modal
        open={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        title="שלח הודעה"
        footer={
          <>
            <Button variant="primary" onClick={handleBroadcastSend} disabled={sendMessage.isPending}>
              שלח
            </Button>
            <Button onClick={() => setBroadcastOpen(false)}>ביטול</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Textarea
            label="טקסט ההודעה"
            value={bcText}
            onChange={(e) => setBcText(e.target.value)}
            placeholder="הזן הודעה..."
            rows={3}
          />

          <ImageInput
            value={bcImageUrl}
            onChange={setBcImageUrl}
          />

          {bcImageUrl && (
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                גודל תמונה: {bcImageSize}%
              </label>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={bcImageSize}
                onChange={(e) => setBcImageSize(parseInt(e.target.value, 10))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>
          )}

          {displays && displays.filter((d) => d.isEnabled).length > 0 && (
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>
                מסכי יעד (השאר ריק לשליחה לכולם)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {displays.filter((d) => d.isEnabled).map((d) => (
                  <Chip
                    key={d.id}
                    label={d.name}
                    selected={selectedIds.includes(d.id)}
                    onClick={() => toggleSelectedId(d.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="מיקום" value={bcPosition} onChange={(e) => setBcPosition(e.target.value)} options={positionOptions} />
            <Select label="אנימציה" value={bcAnimation} onChange={(e) => setBcAnimation(e.target.value)} options={animationOptions} />
            <Input label="משך (שניות)" type="number" value={bcDuration} onChange={(e) => setBcDuration(parseInt(e.target.value, 10) || 30)} />
            <Select label="עדיפות" value={bcPriority} onChange={(e) => setBcPriority(e.target.value)} options={priorityOptions} />
            <Input label="גודל גופן" type="number" value={bcFontSize} onChange={(e) => setBcFontSize(parseInt(e.target.value, 10) || 24)} />
            <Input label="צבע גופן" value={bcFontColor} onChange={(e) => setBcFontColor(e.target.value)} ltr />
          </div>

          <Input label="צבע רקע" value={bcBgColor} onChange={(e) => setBcBgColor(e.target.value)} ltr />
        </div>
      </Modal>
    </div>
  );
}
