import { useState } from 'react';
import { useSchedule, useCreateScheduleEntry, useDeleteScheduleEntry, useUpdateScheduleEntry } from '../hooks/useSchedule';
import { useDisplays } from '../hooks/useDisplays';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import type { ScheduleEntry } from '@screen-commander/shared';
import { ContentType } from '@screen-commander/shared';
import { contentTypeLabels } from '../lib/constants';
import { ChannelManager } from '../components/ChannelManager';
import { api } from '../lib/api';
import './SchedulerPage.css';

interface ScheduleEntryWithContent extends ScheduleEntry {
  content?: { url: string; type: string };
}

const contentTypeOptions = [
  { value: ContentType.WEB_URL, label: 'כתובת אינטרנט' },
  { value: ContentType.YOUTUBE, label: 'YouTube' },
  { value: ContentType.RTMP_STREAM, label: 'RTMP Stream' },
  { value: ContentType.HLS_STREAM, label: 'HLS Stream' },
  { value: ContentType.LOCAL_VIDEO, label: 'וידאו מקומי' },
  { value: ContentType.LOCAL_IMAGE, label: 'תמונה מקומית' },
  { value: ContentType.CUSTOM_HTML, label: 'HTML מותאם' },
];

/* ── Recurrence builder ── */
type RecurrenceMode = 'none' | 'interval' | 'daily' | 'weekly';

const DAYS_HE = [
  { value: 0, label: 'א׳' },
  { value: 1, label: 'ב׳' },
  { value: 2, label: 'ג׳' },
  { value: 3, label: 'ד׳' },
  { value: 4, label: 'ה׳' },
  { value: 5, label: 'ו׳' },
  { value: 6, label: 'ש׳' },
];

function buildCron(
  mode: RecurrenceMode, intervalValue: number, intervalUnit: 'minutes' | 'hours',
  dailyHour: number, dailyMinute: number,
  weeklyDays: number[], weeklyHour: number, weeklyMinute: number,
): string {
  switch (mode) {
    case 'none': return '';
    case 'interval':
      return intervalUnit === 'minutes' ? `*/${intervalValue} * * * *` : `0 */${intervalValue} * * *`;
    case 'daily': return `${dailyMinute} ${dailyHour} * * *`;
    case 'weekly': {
      if (weeklyDays.length === 0) return '';
      return `${weeklyMinute} ${weeklyHour} * * ${weeklyDays.sort((a, b) => a - b).join(',')}`;
    }
    default: return '';
  }
}

function describeCron(cron: string): string {
  if (!cron) return '';
  const known: Record<string, string> = { '* * * * *': 'כל דקה', '0 * * * *': 'כל שעה', '0 0 * * *': 'כל יום בחצות' };
  if (known[cron]) return known[cron];
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;
  const [min, hour, , , dow] = parts as [string, string, string, string, string];
  if (min.startsWith('*/')) return `כל ${min.slice(2)} דקות`;
  if (hour.startsWith('*/')) return `כל ${hour.slice(2)} שעות`;
  if (dow !== '*') {
    const dayNames = dow.split(',').map((d) => DAYS_HE.find((dh) => dh.value === parseInt(d, 10))?.label ?? d);
    return `ימים ${dayNames.join(', ')} בשעה ${hour}:${min.padStart(2, '0')}`;
  }
  if (min !== '*' && hour !== '*') return `כל יום בשעה ${hour}:${min.padStart(2, '0')}`;
  return cron;
}

/* ── Custom DateTime helpers ── */

/** Parse a Date to { date: 'YYYY-MM-DD', hour, minute } for our custom inputs */
function dateToFields(d: Date): { date: string; hour: number; minute: number } {
  const yyyy = d.getFullYear();
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return { date: `${yyyy}-${mm}-${dd}`, hour: d.getHours(), minute: d.getMinutes() };
}

/** Combine our fields back to an ISO string */
function fieldsToISO(date: string, hour: number, minute: number): string {
  if (!date) return '';
  return new Date(`${date}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`).toISOString();
}

/** Format 'YYYY-MM-DD' → 'DD/MM/YYYY' for display */
function formatDateField(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

/** Format date as DD/MM/YYYY HH:MM (Israeli format, 24h clock) */
function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} שניות`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins} דקות`;
  return `${mins} דקות ו-${secs} שניות`;
}

/* ── Custom DateTimePicker — control-room instrument panel style ── */
function DateTimePicker({ label, date, hour, minute, onDateChange, onHourChange, onMinuteChange }: {
  label: string;
  date: string; // 'YYYY-MM-DD'
  hour: number;
  minute: number;
  onDateChange: (v: string) => void;
  onHourChange: (v: number) => void;
  onMinuteChange: (v: number) => void;
}) {
  // Pre-fill with today if empty
  const now = new Date();
  const effectiveDate = date || `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  const [yyyy, mm, dd] = effectiveDate.split('-');
  const dayVal = parseInt(dd ?? '1', 10);
  const monthVal = parseInt(mm ?? '1', 10);
  const yearVal = parseInt(yyyy ?? now.getFullYear().toString(), 10);

  // Auto-set date on first interaction if empty
  const ensureDate = () => {
    if (!date) onDateChange(effectiveDate);
  };

  const setDay = (v: number) => { ensureDate(); const clamped = Math.max(1, Math.min(31, v));
    onDateChange(`${yearVal}-${monthVal.toString().padStart(2, '0')}-${clamped.toString().padStart(2, '0')}`); };
  const setMonth = (v: number) => { ensureDate(); const clamped = Math.max(1, Math.min(12, v));
    onDateChange(`${yearVal}-${clamped.toString().padStart(2, '0')}-${dayVal.toString().padStart(2, '0')}`); };
  const setYear = (v: number) => { ensureDate();
    onDateChange(`${v}-${monthVal.toString().padStart(2, '0')}-${dayVal.toString().padStart(2, '0')}`); };

  return (
    <div className="sc-input-wrapper">
      {label && <label className="sc-input-label">{label}</label>}
      <div className="dtp-panel">
        <div className="dtp-cell dtp-cell--time">
          <span className="dtp-section-label">שעה</span>
          <div className="dtp-time-display">
            <select value={hour} onChange={(e) => { ensureDate(); onHourChange(parseInt(e.target.value, 10)); }}
              className="dtp-time-select">
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
              ))}
            </select>
            <span className="dtp-colon">:</span>
            <select value={minute} onChange={(e) => { ensureDate(); onMinuteChange(parseInt(e.target.value, 10)); }}
              className="dtp-time-select">
              {Array.from({ length: 60 }, (_, i) => (
                <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="dtp-divider" />
        <div className="dtp-cell dtp-cell--grow">
          <span className="dtp-section-label">תאריך</span>
          <div className="dtp-date-display">
            <div className="dtp-date-cell">
              <input type="number" min={1} max={31} value={dayVal}
                onChange={(e) => setDay(parseInt(e.target.value, 10) || 1)}
                className="dtp-date-input" />
              <span className="dtp-date-hint">יום</span>
            </div>
            <span className="dtp-date-slash">/</span>
            <div className="dtp-date-cell">
              <input type="number" min={1} max={12} value={monthVal}
                onChange={(e) => setMonth(parseInt(e.target.value, 10) || 1)}
                className="dtp-date-input" />
              <span className="dtp-date-hint">חודש</span>
            </div>
            <span className="dtp-date-slash">/</span>
            <div className="dtp-date-cell">
              <input type="number" min={2024} max={2099} value={yearVal}
                onChange={(e) => setYear(parseInt(e.target.value, 10) || 2026)}
                className="dtp-date-input dtp-date-input--year" />
              <span className="dtp-date-hint">שנה</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function SchedulerPage() {
  const { data: entries, isLoading } = useSchedule();
  const { data: displays } = useDisplays();
  const createEntry = useCreateScheduleEntry();
  const deleteEntry = useDeleteScheduleEntry();
  const updateEntry = useUpdateScheduleEntry();
  const { toast } = useToast();

  // Form state
  const [displayId, setDisplayId] = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [contentType, setContentType] = useState<string>(ContentType.WEB_URL);
  const [priority, setPriority] = useState(1);
  // Start datetime
  const [startDate, setStartDate] = useState('');
  const [startHour, setStartHour] = useState(0);
  const [startMinute, setStartMinute] = useState(0);

  // End datetime
  const [useEndTime, setUseEndTime] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [endHour, setEndHour] = useState(0);
  const [endMinute, setEndMinute] = useState(0);

  // Duration
  const [useDuration, setUseDuration] = useState(false);
  const [durationValue, setDurationValue] = useState(60);
  const [durationUnit, setDurationUnit] = useState<'seconds' | 'minutes'>('seconds');

  // Recurrence
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>('none');
  const [intervalValue, setIntervalValue] = useState(30);
  const [intervalUnit, setIntervalUnit] = useState<'minutes' | 'hours'>('minutes');
  const [dailyHour, setDailyHour] = useState(9);
  const [dailyMinute, setDailyMinute] = useState(0);
  const [weeklyDays, setWeeklyDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [weeklyHour, setWeeklyHour] = useState(9);
  const [weeklyMinute, setWeeklyMinute] = useState(0);

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);

  const showChannelPicker = contentType === ContentType.HLS_STREAM || contentType === ContentType.RTMP_STREAM;
  const recurrence = buildCron(recurrenceMode, intervalValue, intervalUnit, dailyHour, dailyMinute, weeklyDays, weeklyHour, weeklyMinute);
  const durationSeconds = useDuration ? (durationUnit === 'minutes' ? durationValue * 60 : durationValue) : null;

  const enabledDisplays = (displays ?? []).filter((d) => d.isEnabled);
  const displayOptions = enabledDisplays.map((d) => ({ value: d.id, label: d.name }));
  const displayNameMap = new Map(displays?.map((d) => [d.id, d.name]));

  const toggleWeeklyDay = (day: number) => {
    setWeeklyDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  };

  const resetForm = () => {
    setContentUrl(''); setStartDate(''); setStartHour(0); setStartMinute(0);
    setUseEndTime(false); setEndDate(''); setEndHour(0); setEndMinute(0);
    setRecurrenceMode('none'); setUseDuration(false); setDurationValue(60);
    setEditingId(null);
  };

  /** Load an existing entry into the form for editing */
  const handleEdit = (entry: ScheduleEntry) => {
    const contentInfo = (entry as ScheduleEntryWithContent).content;
    setEditingId(entry.id);
    setDisplayId(entry.displayId);
    setContentUrl(contentInfo?.url ?? '');
    setContentType(contentInfo?.type ?? ContentType.WEB_URL);
    setPriority(entry.priority);

    const sf = dateToFields(new Date(entry.startTime));
    setStartDate(sf.date); setStartHour(sf.hour); setStartMinute(sf.minute);

    if (entry.endTime) {
      setUseEndTime(true);
      const ef = dateToFields(new Date(entry.endTime));
      setEndDate(ef.date); setEndHour(ef.hour); setEndMinute(ef.minute);
    } else {
      setUseEndTime(false);
    }

    if (entry.durationSeconds) {
      setUseDuration(true);
      if (entry.durationSeconds >= 60 && entry.durationSeconds % 60 === 0) {
        setDurationValue(entry.durationSeconds / 60); setDurationUnit('minutes');
      } else {
        setDurationValue(entry.durationSeconds); setDurationUnit('seconds');
      }
    } else {
      setUseDuration(false);
    }

    // Parse recurrence
    if (!entry.recurrenceRule) {
      setRecurrenceMode('none');
    } else {
      const parts = entry.recurrenceRule.split(' ');
      if (parts.length === 5) {
        const [min, hr, , , dow] = parts as [string, string, string, string, string];
        if (min.startsWith('*/')) { setRecurrenceMode('interval'); setIntervalValue(parseInt(min.slice(2), 10)); setIntervalUnit('minutes'); }
        else if (hr.startsWith('*/')) { setRecurrenceMode('interval'); setIntervalValue(parseInt(hr.slice(2), 10)); setIntervalUnit('hours'); }
        else if (dow !== '*') {
          setRecurrenceMode('weekly');
          setWeeklyDays(dow.split(',').map(Number));
          setWeeklyHour(parseInt(hr, 10)); setWeeklyMinute(parseInt(min, 10));
        } else {
          setRecurrenceMode('daily');
          setDailyHour(parseInt(hr, 10)); setDailyMinute(parseInt(min, 10));
        }
      }
    }

    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const createSingleEntry = (targetDisplayId: string) => {
    return api.post<ScheduleEntry>('/schedule', {
      displayId: targetDisplayId,
      contentUrl: contentUrl.trim(),
      contentType,
      startTime: fieldsToISO(startDate, startHour, startMinute),
      endTime: useEndTime && endDate ? fieldsToISO(endDate, endHour, endMinute) : null,
      recurrenceRule: recurrence || null,
      durationSeconds,
      priority,
    });
  };

  const handleSubmit = async () => {
    if (!displayId || !contentUrl.trim() || !startDate) {
      toast('יש למלא מסך, תוכן ותאריך התחלה', 'error');
      return;
    }

    if (editingId) {
      // Update existing entry
      updateEntry.mutate(
        {
          id: editingId,
          startTime: fieldsToISO(startDate, startHour, startMinute),
          endTime: useEndTime && endDate ? fieldsToISO(endDate, endHour, endMinute) : undefined,
          recurrenceRule: recurrence || undefined,
          priority,
          isActive: true,
        },
        {
          onSuccess: () => { toast('ערך תזמון עודכן', 'success'); resetForm(); },
          onError: () => toast('שגיאה בעדכון תזמון', 'error'),
        },
      );
      return;
    }

    if (displayId === 'all') {
      const results = await Promise.allSettled(enabledDisplays.map((d) => createSingleEntry(d.id)));
      const successes = results.filter((r) => r.status === 'fulfilled').length;
      const failures = results.filter((r) => r.status === 'rejected').length;
      if (successes > 0) {
        toast(`נוצרו ${successes} ערכי תזמון${failures > 0 ? ` (${failures} שגיאות)` : ''}`, 'success');
        resetForm(); createEntry.reset(); window.location.reload();
      } else { toast('שגיאה ביצירת תזמון', 'error'); }
    } else {
      createEntry.mutate(
        {
          displayId, contentUrl: contentUrl.trim(), contentType,
          startTime: fieldsToISO(startDate, startHour, startMinute),
          endTime: useEndTime && endDate ? fieldsToISO(endDate, endHour, endMinute) : null,
          recurrenceRule: recurrence || null, durationSeconds, priority,
        },
        {
          onSuccess: () => { toast('ערך תזמון נוצר', 'success'); resetForm(); },
          onError: () => toast('שגיאה ביצירת תזמון', 'error'),
        },
      );
    }
  };

  const handleDelete = (id: string) => {
    deleteEntry.mutate(id, { onSuccess: () => toast('ערך תזמון נמחק', 'info') });
  };

  // Minute options 0-59
  const allMinuteOptions = Array.from({ length: 60 }, (_, i) => ({
    value: i.toString(), label: i.toString().padStart(2, '0'),
  }));

  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i.toString(), label: i.toString().padStart(2, '0'),
  }));

  // Group entries by display
  const entriesByDisplay = new Map<string, typeof entries>();
  entries?.forEach((e) => {
    const list = entriesByDisplay.get(e.displayId) ?? [];
    list.push(e); entriesByDisplay.set(e.displayId, list);
  });

  return (
    <div className="scheduler-page">
      <div className="scheduler-header">
        <h1 className="text-h1">תזמון</h1>
      </div>

      {/* Form */}
      <Card className="scheduler-form-card">
        <div className="scheduler-form-title-row">
          <h2 className="text-h3">{editingId ? 'עריכת ערך תזמון' : 'הוסף ערך תזמון חדש'}</h2>
          {editingId && (
            <Button size="sm" onClick={resetForm}>ביטול עריכה</Button>
          )}
        </div>
        <div className="scheduler-form">
          {/* Display + Content Type */}
          <div className="scheduler-form-row">
            <Select label="מסך" value={displayId}
              onChange={(e) => setDisplayId(e.target.value)}
              options={[
                { value: '', label: 'בחר מסך...' },
                ...(!editingId ? [{ value: 'all', label: 'כל המסכים' }] : []),
                ...displayOptions,
              ]}
            />
            <Select label="סוג תוכן" value={contentType}
              onChange={(e) => { setContentType(e.target.value); setContentUrl(''); }}
              options={contentTypeOptions}
            />
          </div>

          {/* Channel picker + manager */}
          {showChannelPicker && (
            <ChannelManager selectedUrl={contentUrl} onSelect={setContentUrl} />
          )}

          <Input label="כתובת URL" type="url" value={contentUrl}
            onChange={(e) => setContentUrl(e.target.value)} placeholder="https://..." ltr />

          {/* Start + End — labels on one line, panels aligned below */}
          <div className="scheduler-datetime-labels">
            <span className="sc-input-label">התחלה</span>
            <label className="scheduler-end-label">
              <span className="sc-input-label" style={{ margin: 0 }}>סיום</span>
              <input type="checkbox" checked={useEndTime}
                onChange={(e) => setUseEndTime(e.target.checked)} className="scheduler-checkbox" />
            </label>
          </div>
          <div className="scheduler-form-row scheduler-datetime-panels">
            <DateTimePicker label=""
              date={startDate} hour={startHour} minute={startMinute}
              onDateChange={setStartDate} onHourChange={setStartHour} onMinuteChange={setStartMinute}
            />
            {useEndTime ? (
              <DateTimePicker label=""
                date={endDate} hour={endHour} minute={endMinute}
                onDateChange={setEndDate} onHourChange={setEndHour} onMinuteChange={setEndMinute}
              />
            ) : (
              <div className="scheduler-disabled-panel">ללא הגבלת זמן</div>
            )}
          </div>

          {/* Duration + Priority — always visible, grayed when off */}
          <div className="scheduler-options-row">
            <div className={`scheduler-option${useDuration ? ' scheduler-option--active' : ''}`}
              onClick={() => !useDuration && setUseDuration(true)}>
              <label className="scheduler-toggle-row" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={useDuration}
                  onChange={(e) => setUseDuration(e.target.checked)} className="scheduler-checkbox" />
                <span className="scheduler-option-label">חזור לתוכן קודם אחרי</span>
              </label>
              <div className="scheduler-option-controls">
                <input type="number" min={1} value={durationValue}
                  onChange={(e) => setDurationValue(parseInt(e.target.value, 10) || 1)}
                  className="scheduler-compact-num"
                  disabled={!useDuration} />
                <select value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value as 'seconds' | 'minutes')}
                  className="scheduler-compact-sel"
                  disabled={!useDuration}>
                  <option value="seconds">שנ׳</option>
                  <option value="minutes">דק׳</option>
                </select>
              </div>
            </div>

            <div className="scheduler-option scheduler-option--active">
              <span className="scheduler-option-label">עדיפות</span>
              <input type="number" min={0} max={100} value={priority}
                onChange={(e) => setPriority(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
                className="scheduler-compact-num" />
            </div>
          </div>

          {/* Recurrence — compact */}
          <div className="scheduler-section scheduler-section--compact">
            <div className="scheduler-recurrence-tabs">
              {([['none', 'פעם אחת'], ['interval', 'כל X זמן'], ['daily', 'יומי'], ['weekly', 'שבועי']] as [RecurrenceMode, string][]).map(([mode, label]) => (
                <button key={mode} className={`scheduler-rec-tab${recurrenceMode === mode ? ' active' : ''}`}
                  onClick={() => setRecurrenceMode(mode)}>{label}</button>
              ))}
            </div>

            {recurrenceMode === 'interval' && (
              <div className="scheduler-rec-inline">
                <span className="scheduler-rec-text">כל</span>
                <input type="number" min={1} max={intervalUnit === 'minutes' ? 59 : 23}
                  value={intervalValue}
                  onChange={(e) => setIntervalValue(parseInt(e.target.value, 10) || 1)}
                  className="scheduler-compact-num scheduler-compact-num--accent" />
                <select value={intervalUnit}
                  onChange={(e) => setIntervalUnit(e.target.value as 'minutes' | 'hours')}
                  className="scheduler-compact-sel">
                  <option value="minutes">דקות</option>
                  <option value="hours">שעות</option>
                </select>
              </div>
            )}

            {recurrenceMode === 'daily' && (
              <div className="scheduler-rec-inline">
                <span className="scheduler-rec-text">כל יום בשעה</span>
                <select value={dailyHour} onChange={(e) => setDailyHour(parseInt(e.target.value, 10))}
                  className="scheduler-compact-sel scheduler-compact-sel--time">
                  {hourOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <span className="scheduler-rec-colon">:</span>
                <select value={dailyMinute} onChange={(e) => setDailyMinute(parseInt(e.target.value, 10))}
                  className="scheduler-compact-sel scheduler-compact-sel--time">
                  {allMinuteOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}

            {recurrenceMode === 'weekly' && (
              <>
                <div className="scheduler-days-row">
                  {DAYS_HE.map((day) => (
                    <button key={day.value}
                      className={`scheduler-day-btn${weeklyDays.includes(day.value) ? ' active' : ''}`}
                      onClick={() => toggleWeeklyDay(day.value)}>{day.label}</button>
                  ))}
                </div>
                <div className="scheduler-rec-inline">
                  <span className="scheduler-rec-text">בשעה</span>
                  <select value={weeklyHour} onChange={(e) => setWeeklyHour(parseInt(e.target.value, 10))}
                    className="scheduler-compact-sel scheduler-compact-sel--time">
                    {hourOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <span className="scheduler-rec-colon">:</span>
                  <select value={weeklyMinute} onChange={(e) => setWeeklyMinute(parseInt(e.target.value, 10))}
                    className="scheduler-compact-sel scheduler-compact-sel--time">
                    {allMinuteOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </>
            )}

            {recurrence && <div className="scheduler-cron-preview">{describeCron(recurrence)}</div>}
          </div>

          <Button variant="primary" onClick={() => void handleSubmit()}
            disabled={createEntry.isPending || updateEntry.isPending}>
            {editingId ? 'עדכן תזמון' : displayId === 'all' ? 'צור תזמון לכל המסכים' : 'צור תזמון'}
          </Button>
        </div>
      </Card>

      {/* Timeline */}
      <div className="scheduler-timeline">
        <h2 className="text-h3" style={{ marginBottom: 16 }}>ציר זמן</h2>
        {isLoading ? (
          <p className="text-caption">טוען...</p>
        ) : entries && entries.length > 0 ? (
          <div className="scheduler-entries">
            {Array.from(entriesByDisplay.entries()).map(([dId, dEntries]) => (
              <div key={dId} className="scheduler-display-group">
                <div className="scheduler-display-label">{displayNameMap.get(dId) ?? dId}</div>
                <div className="scheduler-bars">
                  {dEntries?.map((entry) => {
                    const contentInfo = (entry as ScheduleEntryWithContent).content;
                    const typeLabel = contentInfo ? (contentTypeLabels[contentInfo.type] ?? contentInfo.type) : '';
                    const isExpired = entry.endTime && new Date(entry.endTime) < new Date();
                    const isEffectivelyActive = entry.isActive && !isExpired;

                    return (
                      <div key={entry.id} className={`scheduler-entry${!isEffectivelyActive ? ' expired' : ''}`}>
                        <div className="scheduler-entry-bar">
                          <div className="scheduler-entry-info">
                            {typeLabel && (
                              <span style={{ marginBottom: 4 }}><Badge variant="default">{typeLabel}</Badge></span>
                            )}
                            <span className="text-mono" style={{ fontSize: '0.75rem', direction: 'ltr', textAlign: 'left' }}>
                              {contentInfo?.url ?? entry.contentId}
                            </span>
                            <span className="text-caption">
                              {formatDateTime(entry.startTime)}
                              {entry.endTime ? ` — ${formatDateTime(entry.endTime)}` : ''}
                            </span>
                            {entry.recurrenceRule && (
                              <span className="text-caption" style={{ color: 'var(--accent)' }}>
                                {describeCron(entry.recurrenceRule)}
                              </span>
                            )}
                            {entry.durationSeconds && (
                              <span className="text-caption" style={{ color: 'var(--amber)' }}>
                                משך: {formatDuration(entry.durationSeconds)} (חוזר לתוכן הקודם)
                              </span>
                            )}
                            {entry.priority > 0 && (
                              <span className="text-caption" style={{ color: 'var(--text-muted)' }}>
                                עדיפות: {entry.priority}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Badge variant={isEffectivelyActive ? 'accent' : 'default'}>
                              {isEffectivelyActive ? 'פעיל' : 'לא פעיל'}
                            </Badge>
                            {isEffectivelyActive && (
                              <Button size="sm" onClick={() => handleEdit(entry)}>ערוך</Button>
                            )}
                            <Button size="sm" variant="danger" onClick={() => handleDelete(entry.id)}>מחק</Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
