import { useState } from 'react';
import { useSchedule, useCreateScheduleEntry, useDeleteScheduleEntry } from '../hooks/useSchedule';
import { useDisplays } from '../hooks/useDisplays';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { ContentType } from '@screen-commander/shared';
import './SchedulerPage.css';

const contentTypeOptions = [
  { value: ContentType.WEB_URL, label: 'כתובת אינטרנט' },
  { value: ContentType.YOUTUBE, label: 'YouTube' },
  { value: ContentType.RTMP_STREAM, label: 'RTMP Stream' },
  { value: ContentType.HLS_STREAM, label: 'HLS Stream' },
  { value: ContentType.LOCAL_VIDEO, label: 'וידאו מקומי' },
  { value: ContentType.LOCAL_IMAGE, label: 'תמונה מקומית' },
  { value: ContentType.CUSTOM_HTML, label: 'HTML מותאם' },
];

export default function SchedulerPage() {
  const { data: entries, isLoading } = useSchedule();
  const { data: displays } = useDisplays();
  const createEntry = useCreateScheduleEntry();
  const deleteEntry = useDeleteScheduleEntry();
  const { toast } = useToast();

  const [displayId, setDisplayId] = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [contentType, setContentType] = useState<string>(ContentType.WEB_URL);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [recurrence, setRecurrence] = useState('');
  const [priority, setPriority] = useState(1);

  const handleCreate = () => {
    if (!displayId || !contentUrl.trim() || !startTime) {
      toast('יש למלא את כל השדות הנדרשים', 'error');
      return;
    }
    createEntry.mutate(
      {
        displayId,
        contentUrl: contentUrl.trim(),
        contentType,
        startTime: new Date(startTime).toISOString(),
        endTime: endTime ? new Date(endTime).toISOString() : null,
        recurrenceRule: recurrence || null,
        priority,
      },
      {
        onSuccess: () => {
          toast('ערך תזמון נוצר', 'success');
          setContentUrl('');
          setStartTime('');
          setEndTime('');
          setRecurrence('');
        },
        onError: () => toast('שגיאה ביצירת תזמון', 'error'),
      },
    );
  };

  const handleDelete = (id: string) => {
    deleteEntry.mutate(id, {
      onSuccess: () => toast('ערך תזמון נמחק', 'info'),
    });
  };

  const displayOptions = (displays ?? [])
    .filter((d) => d.isEnabled)
    .map((d) => ({ value: d.id, label: d.name }));

  const displayNameMap = new Map(displays?.map((d) => [d.id, d.name]));

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('he-IL');
  };

  // Group entries by display for the timeline
  const entriesByDisplay = new Map<string, typeof entries>();
  entries?.forEach((e) => {
    const list = entriesByDisplay.get(e.displayId) ?? [];
    list.push(e);
    entriesByDisplay.set(e.displayId, list);
  });

  return (
    <div className="scheduler-page">
      <div className="scheduler-header">
        <h1 className="text-h1">תזמון</h1>
      </div>

      {/* Create Form */}
      <Card className="scheduler-form-card">
        <h2 className="text-h3" style={{ marginBottom: 16 }}>הוסף ערך תזמון חדש</h2>
        <div className="scheduler-form">
          <div className="scheduler-form-row">
            <Select
              label="מסך"
              value={displayId}
              onChange={(e) => setDisplayId(e.target.value)}
              options={[{ value: '', label: 'בחר מסך...' }, ...displayOptions]}
            />
            <Select
              label="סוג תוכן"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              options={contentTypeOptions}
            />
          </div>

          <Input
            label="כתובת URL"
            type="url"
            value={contentUrl}
            onChange={(e) => setContentUrl(e.target.value)}
            placeholder="https://..."
            ltr
          />

          <div className="scheduler-form-row">
            <Input
              label="שעת התחלה"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <Input
              label="שעת סיום"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <div className="scheduler-form-row">
            <Input
              label="חזרה (cron)"
              type="text"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              placeholder="0 9 * * 1-5"
              ltr
            />
            <Input
              label="עדיפות"
              type="number"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value, 10) || 1)}
            />
          </div>

          <Button variant="primary" onClick={handleCreate} disabled={createEntry.isPending}>
            צור תזמון
          </Button>
        </div>
      </Card>

      {/* Timeline visualization */}
      <div className="scheduler-timeline">
        <h2 className="text-h3" style={{ marginBottom: 16 }}>ציר זמן</h2>
        {isLoading ? (
          <p className="text-caption">טוען...</p>
        ) : entries && entries.length > 0 ? (
          <div className="scheduler-entries">
            {Array.from(entriesByDisplay.entries()).map(([dId, dEntries]) => (
              <div key={dId} className="scheduler-display-group">
                <div className="scheduler-display-label">
                  {displayNameMap.get(dId) ?? dId}
                </div>
                <div className="scheduler-bars">
                  {dEntries?.map((entry) => (
                    <div key={entry.id} className="scheduler-entry">
                      <div className="scheduler-entry-bar">
                        <div className="scheduler-entry-info">
                          <span className="text-mono" style={{ fontSize: '0.75rem' }}>
                            {entry.contentId}
                          </span>
                          <span className="text-caption">
                            {formatDate(entry.startTime)}
                            {entry.endTime ? ` — ${formatDate(entry.endTime)}` : ''}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Badge variant={entry.isActive ? 'accent' : 'default'}>
                            {entry.isActive ? 'פעיל' : 'לא פעיל'}
                          </Badge>
                          <Button size="sm" variant="danger" onClick={() => handleDelete(entry.id)}>
                            מחק
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-caption">אין ערכי תזמון</p>
        )}
      </div>
    </div>
  );
}
