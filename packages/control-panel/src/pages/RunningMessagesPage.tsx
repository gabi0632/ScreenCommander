import { useState, useEffect, useRef } from 'react';
import {
  useTicker,
  useUpdateTickerConfig,
  useAddTickerMessage,
  useUpdateTickerMessage,
  useDeleteTickerMessage,
  useReorderTickerMessages,
} from '../hooks/useTicker';
import { useDisplays } from '../hooks/useDisplays';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { Toggle } from '../components/ui/Toggle';
import { useToast } from '../components/ui/Toast';
import type { TickerConfig } from '@screen-commander/shared';
import './RunningMessagesPage.css';

const clockFormatter = new Intl.DateTimeFormat('he-IL', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export default function RunningMessagesPage() {
  const { data: ticker, isLoading } = useTicker();
  const { data: displays } = useDisplays();
  const updateConfig = useUpdateTickerConfig();
  const addMessage = useAddTickerMessage();
  const updateMessage = useUpdateTickerMessage();
  const deleteMessage = useDeleteTickerMessage();
  const reorder = useReorderTickerMessages();
  const { toast } = useToast();

  // Settings form state
  const [isEnabled, setIsEnabled] = useState(false);
  const [bgColor, setBgColor] = useState('#cc0000');
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontSize, setFontSize] = useState(28);
  const [speed, setSpeed] = useState(5);
  const [separator, setSeparator] = useState(' ■ ');
  const [showClock, setShowClock] = useState(true);
  const [clockPosition, setClockPosition] = useState<'left' | 'right'>('left');
  const [targetMode, setTargetMode] = useState<'all' | 'specific'>('all');
  const [targetIds, setTargetIds] = useState<string[]>([]);

  // New message state
  const [newMessageText, setNewMessageText] = useState('');

  // Preview clock
  const [previewTime, setPreviewTime] = useState(() => clockFormatter.format(new Date()));

  // Sync form with fetched data
  useEffect(() => {
    if (!ticker) return;
    setIsEnabled(ticker.isEnabled);
    setBgColor(ticker.backgroundColor);
    setTextColor(ticker.textColor);
    setFontSize(ticker.fontSize);
    setSpeed(ticker.speed);
    setSeparator(ticker.separator);
    setShowClock(ticker.showClock);
    setClockPosition(ticker.clockPosition as 'left' | 'right');

    if (ticker.targetDisplayIds === 'all') {
      setTargetMode('all');
      setTargetIds([]);
    } else {
      setTargetMode('specific');
      const ids = typeof ticker.targetDisplayIds === 'string'
        ? (() => { try { return JSON.parse(ticker.targetDisplayIds) as string[]; } catch { return []; } })()
        : ticker.targetDisplayIds;
      setTargetIds(Array.isArray(ids) ? ids : []);
    }
  }, [ticker]);

  // Preview clock tick
  useEffect(() => {
    const interval = setInterval(() => {
      setPreviewTime(clockFormatter.format(new Date()));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveConfig = () => {
    updateConfig.mutate(
      {
        isEnabled,
        backgroundColor: bgColor,
        textColor,
        fontSize,
        speed,
        separator,
        showClock,
        clockPosition,
        targetDisplayIds: targetMode === 'all' ? 'all' : targetIds,
      },
      {
        onSuccess: () => toast('ההגדרות נשמרו', 'success'),
        onError: () => toast('שגיאה בשמירת הגדרות', 'error'),
      },
    );
  };

  const handleAddMessage = () => {
    const trimmed = newMessageText.trim();
    if (!trimmed) {
      toast('יש להזין טקסט', 'error');
      return;
    }
    const nextOrder = ticker?.messages?.length ?? 0;
    addMessage.mutate(
      { text: trimmed, order: nextOrder, isActive: true },
      {
        onSuccess: () => {
          toast('הודעה נוספה', 'success');
          setNewMessageText('');
        },
        onError: () => toast('שגיאה בהוספת הודעה', 'error'),
      },
    );
  };

  const handleToggleMessage = (id: string, currentActive: boolean) => {
    updateMessage.mutate({ id, data: { isActive: !currentActive } });
  };

  const handleDeleteMessage = (id: string) => {
    deleteMessage.mutate(id, {
      onSuccess: () => toast('הודעה נמחקה', 'info'),
    });
  };

  const handleMoveUp = (index: number) => {
    if (!ticker?.messages || index === 0) return;
    const ids = ticker.messages.map((m) => m.id);
    [ids[index - 1]!, ids[index]!] = [ids[index]!, ids[index - 1]!];
    reorder.mutate(ids);
  };

  const handleMoveDown = (index: number) => {
    if (!ticker?.messages || index >= ticker.messages.length - 1) return;
    const ids = ticker.messages.map((m) => m.id);
    [ids[index]!, ids[index + 1]!] = [ids[index + 1]!, ids[index]!];
    reorder.mutate(ids);
  };

  const toggleTarget = (id: string) => {
    setTargetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleQuickToggle = (enabled: boolean) => {
    setIsEnabled(enabled);
    updateConfig.mutate({ isEnabled: enabled }, {
      onSuccess: () => toast(enabled ? 'טיקר הופעל' : 'טיקר כובה', 'success'),
    });
  };

  // Build preview text
  const activeMessages = ticker?.messages?.filter((m) => m.isActive) ?? [];
  const previewText = activeMessages.map((m) => m.text).join(separator);

  if (isLoading) {
    return (
      <div className="running-messages-page">
        <p className="text-caption">טוען...</p>
      </div>
    );
  }

  return (
    <div className="running-messages-page">
      {/* Header */}
      <div className="running-messages-header">
        <h1 className="text-h1">הודעות רצות</h1>
        <Toggle
          checked={isEnabled}
          onChange={handleQuickToggle}
          label={isEnabled ? 'פעיל' : 'כבוי'}
        />
      </div>

      {/* Settings */}
      <Card className="running-messages-settings">
        <h2 className="text-h3" style={{ marginBottom: 16 }}>הגדרות טיקר</h2>
        <div className="running-messages-form">
          <div className="running-messages-form-row">
            <div className="running-messages-color-field">
              <label className="running-messages-label">צבע רקע</label>
              <div className="running-messages-color-input">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="running-messages-color-picker"
                  aria-label="צבע רקע"
                />
                <Input
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  ltr
                />
              </div>
            </div>
            <div className="running-messages-color-field">
              <label className="running-messages-label">צבע טקסט</label>
              <div className="running-messages-color-input">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="running-messages-color-picker"
                  aria-label="צבע טקסט"
                />
                <Input
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  ltr
                />
              </div>
            </div>
            <Input
              label="גודל גופן"
              type="number"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value, 10) || 28)}
            />
            <Input
              label="מהירות גלילה (1-20)"
              type="number"
              value={speed}
              onChange={(e) => setSpeed(Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 5)))}
            />
          </div>

          <div className="running-messages-form-row">
            <Input
              label="מפריד"
              value={separator}
              onChange={(e) => setSeparator(e.target.value)}
              ltr
            />
            <Select
              label="מיקום שעון"
              value={clockPosition}
              onChange={(e) => setClockPosition(e.target.value as 'left' | 'right')}
              options={[
                { value: 'left', label: 'שמאל' },
                { value: 'right', label: 'ימין' },
              ]}
            />
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
              <Toggle
                checked={showClock}
                onChange={setShowClock}
                label="הצג שעון"
              />
            </div>
          </div>

          {/* Target displays */}
          <div>
            <div className="running-messages-label" style={{ marginBottom: 8 }}>מסכי יעד</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <Chip
                label="כל המסכים"
                selected={targetMode === 'all'}
                onClick={() => setTargetMode('all')}
              />
              <Chip
                label="מסכים ספציפיים"
                selected={targetMode === 'specific'}
                onClick={() => setTargetMode('specific')}
              />
            </div>
            {targetMode === 'specific' && displays && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {displays.filter((d) => d.isEnabled).map((d) => (
                  <Chip
                    key={d.id}
                    label={d.name}
                    selected={targetIds.includes(d.id)}
                    onClick={() => toggleTarget(d.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <Button variant="primary" onClick={handleSaveConfig} disabled={updateConfig.isPending}>
            שמור הגדרות
          </Button>
        </div>
      </Card>

      {/* Messages */}
      <Card className="running-messages-list">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="text-h3">הודעות</h2>
        </div>

        {/* Add message */}
        <div className="running-messages-add-row">
          <Input
            value={newMessageText}
            onChange={(e) => setNewMessageText(e.target.value)}
            placeholder="הזן טקסט להודעה חדשה…"
          />
          <Button variant="primary" onClick={handleAddMessage} disabled={addMessage.isPending}>
            + הוסף הודעה
          </Button>
        </div>

        {/* Messages list */}
        {ticker?.messages && ticker.messages.length > 0 ? (
          <div className="running-messages-items">
            {ticker.messages.map((msg, index) => (
              <div key={msg.id} className={`running-messages-item ${!msg.isActive ? 'running-messages-item--inactive' : ''}`}>
                <div className="running-messages-item-order">
                  <button
                    className="running-messages-arrow-btn"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    aria-label="הזז למעלה"
                    type="button"
                  >
                    ▲
                  </button>
                  <span className="running-messages-order-num">{index + 1}</span>
                  <button
                    className="running-messages-arrow-btn"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === ticker.messages.length - 1}
                    aria-label="הזז למטה"
                    type="button"
                  >
                    ▼
                  </button>
                </div>
                <div className="running-messages-item-text">{msg.text}</div>
                <div className="running-messages-item-actions">
                  <Toggle
                    checked={msg.isActive}
                    onChange={() => handleToggleMessage(msg.id, msg.isActive)}
                  />
                  <Button size="sm" variant="danger" onClick={() => handleDeleteMessage(msg.id)}>
                    מחק
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-caption" style={{ textAlign: 'center', padding: '32px 0' }}>
            אין הודעות רצות — הוסף הודעה ראשונה
          </p>
        )}
      </Card>

      {/* Preview */}
      <Card className="running-messages-preview-card">
        <h2 className="text-h3" style={{ marginBottom: 16 }}>תצוגה מקדימה</h2>
        {activeMessages.length > 0 ? (
          <TickerPreview
            bgColor={bgColor}
            textColor={textColor}
            fontSize={Math.min(fontSize, 20)}
            separator={separator}
            showClock={showClock}
            clockPosition={clockPosition}
            text={previewText}
            speed={speed}
            time={previewTime}
          />
        ) : (
          <p className="text-caption" style={{ textAlign: 'center', padding: '16px 0' }}>
            הוסף הודעות כדי לראות תצוגה מקדימה
          </p>
        )}
      </Card>
    </div>
  );
}

// Mini preview component
interface TickerPreviewProps {
  bgColor: string;
  textColor: string;
  fontSize: number;
  separator: string;
  showClock: boolean;
  clockPosition: 'left' | 'right';
  text: string;
  speed: number;
  time: string;
}

function TickerPreview({ bgColor, textColor, fontSize, separator, showClock, clockPosition, text, speed, time }: TickerPreviewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [animDuration, setAnimDuration] = useState(15);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const totalWidth = el.scrollWidth;
    const pxPerSec = speed * 60;
    setAnimDuration(Math.max(3, totalWidth / pxPerSec));
  }, [text, separator, speed, fontSize]);

  const fullText = `${separator.trim()} ${text}`;

  const clockEl = showClock ? (
    <div
      style={{
        flexShrink: 0,
        padding: '0 12px',
        fontFamily: "'IBM Plex Mono', monospace",
        fontWeight: 700,
        fontSize: `${fontSize}px`,
        color: textColor,
        borderRight: clockPosition === 'left' ? '2px solid rgba(255,255,255,0.3)' : undefined,
        borderLeft: clockPosition === 'right' ? '2px solid rgba(255,255,255,0.3)' : undefined,
        fontVariantNumeric: 'tabular-nums',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {time}
    </div>
  ) : null;

  return (
    <div
      className="ticker-preview-bar"
      style={{
        background: bgColor,
        color: textColor,
        fontSize: `${fontSize}px`,
        height: 40,
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        fontFamily: "'Heebo', sans-serif",
        fontWeight: 600,
        direction: 'ltr',
      }}
    >
      {clockPosition === 'left' && clockEl}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', position: 'relative' }}>
        <div
          ref={scrollRef}
          style={{
            display: 'inline-block',
            whiteSpace: 'nowrap',
            willChange: 'transform',
            paddingLeft: '100%',
            animation: `ticker-preview-scroll ${animDuration}s linear infinite`,
          }}
        >
          {fullText}
        </div>
      </div>
      {clockPosition === 'right' && clockEl}
    </div>
  );
}
