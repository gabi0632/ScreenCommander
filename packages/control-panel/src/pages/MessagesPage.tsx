import { useState } from 'react';
import { useMessages, useSendMessage, useDismissMessage, useDismissAllMessages, useResendMessage } from '../hooks/useMessages';
import { useDisplays } from '../hooks/useDisplays';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Chip } from '../components/ui/Chip';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { MessagePosition, MessageAnimation, MessagePriority } from '@screen-commander/shared';
import { positionLabels } from '../lib/constants';
import './MessagesPage.css';

export default function MessagesPage() {
  const { data: messages, isLoading } = useMessages();
  const { data: displays } = useDisplays();
  const sendMessage = useSendMessage();
  const dismissMessage = useDismissMessage();
  const dismissAll = useDismissAllMessages();
  const resendMessage = useResendMessage();
  const { toast } = useToast();

  const [text, setText] = useState('');
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [position, setPosition] = useState<string>(MessagePosition.BOTTOM);
  const [animation, setAnimation] = useState<string>(MessageAnimation.FADE_IN);
  const [duration, setDuration] = useState(30);
  const [priority, setPriority] = useState<string>(MessagePriority.NORMAL);
  const [fontSize, setFontSize] = useState(24);
  const [fontColor, setFontColor] = useState('#ffffff');
  const [bgColor, setBgColor] = useState('rgba(0,0,0,0.8)');

  const handleSend = () => {
    if (!text.trim()) {
      toast('יש להזין טקסט', 'error');
      return;
    }
    const ids = targetIds.length > 0
      ? targetIds
      : displays?.filter((d) => d.isEnabled).map((d) => d.id) ?? [];

    sendMessage.mutate(
      {
        text: text.trim(),
        targetDisplayIds: ids,
        position: position as typeof MessagePosition[keyof typeof MessagePosition],
        fontSize,
        fontColor,
        backgroundColor: bgColor,
        animation: animation as typeof MessageAnimation[keyof typeof MessageAnimation],
        displayDuration: duration,
        priority: priority as typeof MessagePriority[keyof typeof MessagePriority],
      },
      {
        onSuccess: () => {
          toast('הודעה נשלחה', 'success');
          setText('');
          setTargetIds([]);
        },
        onError: () => toast('שגיאה בשליחת הודעה', 'error'),
      },
    );
  };

  const toggleTarget = (id: string) => {
    setTargetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleDismiss = (id: string) => {
    dismissMessage.mutate(id, {
      onSuccess: () => toast('הודעה בוטלה', 'info'),
    });
  };

  const handleDismissAll = () => {
    dismissAll.mutate(undefined, {
      onSuccess: () => toast('כל ההודעות בוטלו', 'info'),
    });
  };

  const handleResend = (id: string) => {
    resendMessage.mutate(id, {
      onSuccess: () => toast('הודעה נשלחה מחדש', 'success'),
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('he-IL');
  };

  return (
    <div className="messages-page">
      <div className="messages-header">
        <h1 className="text-h1">הודעות</h1>
      </div>

      {/* Composer */}
      <Card className="messages-composer">
        <h2 className="text-h3" style={{ marginBottom: 16 }}>שלח הודעה חדשה</h2>
        <div className="messages-form">
          <Textarea
            label="טקסט ההודעה"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="הזן הודעה..."
            rows={3}
          />

          <div className="messages-form-row">
            <Select
              label="מיקום"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              options={[
                { value: 'top', label: 'למעלה' },
                { value: 'bottom', label: 'למטה' },
                { value: 'center', label: 'מרכז' },
                { value: 'ticker', label: 'טיקר' },
              ]}
            />
            <Select
              label="אנימציה"
              value={animation}
              onChange={(e) => setAnimation(e.target.value)}
              options={[
                { value: 'fade-in', label: 'דעיכה' },
                { value: 'slide-up', label: 'גלילה למעלה' },
                { value: 'slide-left', label: 'גלילה שמאלה' },
                { value: 'typewriter', label: 'מכונת כתיבה' },
              ]}
            />
            <Input
              label="משך (שניות)"
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10) || 30)}
            />
            <Select
              label="עדיפות"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={[
                { value: 'normal', label: 'רגילה' },
                { value: 'urgent', label: 'דחוף' },
                { value: 'emergency', label: 'חירום' },
              ]}
            />
          </div>

          <div className="messages-form-row">
            <Input
              label="גודל גופן"
              type="number"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value, 10) || 24)}
            />
            <Input
              label="צבע גופן"
              type="text"
              value={fontColor}
              onChange={(e) => setFontColor(e.target.value)}
              ltr
            />
            <Input
              label="צבע רקע"
              type="text"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              ltr
            />
          </div>

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
                    selected={targetIds.includes(d.id)}
                    onClick={() => toggleTarget(d.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="primary" onClick={handleSend} disabled={sendMessage.isPending}>
              שלח הודעה
            </Button>
          </div>
        </div>
      </Card>

      {/* History */}
      <div className="messages-history">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="text-h3">היסטוריית הודעות</h2>
          <Button size="sm" variant="danger" onClick={handleDismissAll}>
            בטל את כל ההודעות
          </Button>
        </div>

        {isLoading ? (
          <p className="text-caption">טוען...</p>
        ) : messages && messages.length > 0 ? (
          <div className="messages-table-wrapper">
            <table className="messages-table">
              <thead>
                <tr>
                  <th>טקסט</th>
                  <th>מיקום</th>
                  <th>עדיפות</th>
                  <th>נשלח</th>
                  <th>בוטל</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((msg) => (
                  <tr key={msg.id}>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {msg.text}
                    </td>
                    <td>{positionLabels[msg.position] ?? msg.position}</td>
                    <td>
                      <Badge
                        variant={
                          msg.priority === 'emergency'
                            ? 'red'
                            : msg.priority === 'urgent'
                              ? 'amber'
                              : 'default'
                        }
                      >
                        {msg.priority === 'emergency' ? 'חירום' : msg.priority === 'urgent' ? 'דחוף' : 'רגילה'}
                      </Badge>
                    </td>
                    <td className="text-mono" style={{ fontSize: '0.75rem' }}>{formatDate(msg.sentAt)}</td>
                    <td className="text-mono" style={{ fontSize: '0.75rem' }}>{formatDate(msg.dismissedAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Button size="sm" onClick={() => handleResend(msg.id)}>
                          שלח מחדש
                        </Button>
                        {!msg.dismissedAt && (
                          <Button size="sm" variant="ghost" onClick={() => handleDismiss(msg.id)}>
                            בטל
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-caption">אין הודעות</p>
        )}
      </div>
    </div>
  );
}
