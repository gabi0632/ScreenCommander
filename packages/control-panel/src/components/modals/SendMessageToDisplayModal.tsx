import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { ImageInput } from '../ui/ImageInput';
import { Select } from '../ui/Select';
import { useToast } from '../ui/Toast';
import { useSendMessage } from '../../hooks/useMessages';
import { MessagePosition, MessageAnimation, MessagePriority } from '@screen-commander/shared';

interface SendMessageToDisplayModalProps {
  open: boolean;
  onClose: () => void;
  displayId: string;
  displayName: string;
}

export function SendMessageToDisplayModal({ open, onClose, displayId, displayName }: SendMessageToDisplayModalProps) {
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageSize, setImageSize] = useState(50);
  const [position, setPosition] = useState<string>(MessagePosition.BOTTOM);
  const [animation, setAnimation] = useState<string>(MessageAnimation.FADE_IN);
  const [duration, setDuration] = useState(30);
  const [priority, setPriority] = useState<string>(MessagePriority.NORMAL);

  const sendMessage = useSendMessage();
  const { toast } = useToast();

  const handleSend = () => {
    if (!text.trim() && !imageUrl.trim()) {
      toast('יש להזין טקסט או תמונה', 'error');
      return;
    }
    sendMessage.mutate(
      {
        text: text.trim(),
        imageUrl: imageUrl.trim() || undefined,
        imageSize,
        targetDisplayIds: [displayId],
        position: position as typeof MessagePosition[keyof typeof MessagePosition],
        fontSize: 24,
        fontColor: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.8)',
        animation: animation as typeof MessageAnimation[keyof typeof MessageAnimation],
        displayDuration: duration,
        priority: priority as typeof MessagePriority[keyof typeof MessagePriority],
      },
      {
        onSuccess: () => {
          toast(`הודעה נשלחה ל-${displayName}`, 'success');
          setText('');
          onClose();
        },
        onError: () => toast('שגיאה בשליחת הודעה', 'error'),
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`שלח הודעה — ${displayName}`}
      footer={
        <>
          <Button variant="primary" onClick={handleSend} disabled={sendMessage.isPending}>
            שלח
          </Button>
          <Button onClick={onClose}>ביטול</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Textarea
          label="טקסט ההודעה"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="הזן הודעה..."
          rows={3}
        />

        <ImageInput
          value={imageUrl}
          onChange={setImageUrl}
        />

        {imageUrl && (
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              גודל תמונה: {imageSize}%
            </label>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={imageSize}
              onChange={(e) => setImageSize(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>
        )}

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
    </Modal>
  );
}
