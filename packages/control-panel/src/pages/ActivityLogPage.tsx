import { useState, useMemo } from 'react';
import { useActivityLog } from '../hooks/useActivityLog';
import { useDisplays } from '../hooks/useDisplays';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import type { ActivityEventType } from '@screen-commander/shared';
import './ActivityLogPage.css';

const EVENT_TYPE_LABELS: Record<ActivityEventType, string> = {
  content_change: 'שינוי תוכן',
  message_sent: 'הודעה נשלחה',
  message_dismissed: 'הודעה הופסקה',
  display_online: 'מסך מחובר',
  display_offline: 'מסך מנותק',
  schedule_triggered: 'תזמון הופעל',
  system: 'מערכת',
};

const EVENT_TYPE_BADGE: Record<ActivityEventType, 'accent' | 'blue' | 'default' | 'red' | 'amber' | 'purple'> = {
  content_change: 'accent',
  message_sent: 'blue',
  message_dismissed: 'default',
  display_online: 'accent',
  display_offline: 'red',
  schedule_triggered: 'purple',
  system: 'amber',
};

const ALL_EVENT_TYPES: { value: '' | ActivityEventType; label: string }[] = [
  { value: '', label: 'כל האירועים' },
  { value: 'content_change', label: 'שינויי תוכן' },
  { value: 'message_sent', label: 'הודעות שנשלחו' },
  { value: 'message_dismissed', label: 'הודעות שהופסקו' },
  { value: 'display_online', label: 'מסכים שהתחברו' },
  { value: 'display_offline', label: 'מסכים שהתנתקו' },
  { value: 'schedule_triggered', label: 'תזמונים' },
  { value: 'system', label: 'אירועי מערכת' },
];

const PAGE_SIZE = 50;

export default function ActivityLogPage() {
  const [page, setPage] = useState(1);
  const [eventTypeFilter, setEventTypeFilter] = useState<'' | ActivityEventType>('');
  const [displayFilter, setDisplayFilter] = useState('');
  const [searchText, setSearchText] = useState('');

  const { data: displays } = useDisplays();
  const { data: logData, isLoading } = useActivityLog({
    page,
    pageSize: PAGE_SIZE,
    type: eventTypeFilter || undefined,
    displayId: displayFilter || undefined,
  });

  const filteredEntries = useMemo(() => {
    if (!logData?.entries) return [];
    if (!searchText.trim()) return logData.entries;
    const q = searchText.trim().toLowerCase();
    return logData.entries.filter(
      (entry) =>
        entry.description.toLowerCase().includes(q) ||
        (entry.displayName ?? '').toLowerCase().includes(q),
    );
  }, [logData?.entries, searchText]);

  const totalPages = logData ? Math.ceil(logData.total / logData.pageSize) : 0;

  const summaryStats = useMemo(() => {
    if (!logData) return { total: 0, contentChanges: 0, messages: 0, other: 0 };
    return {
      total: logData.total,
      contentChanges: logData.entries.filter((e) => e.type === 'content_change').length,
      messages: logData.entries.filter((e) => e.type === 'message_sent').length,
      other: logData.entries.filter(
        (e) => e.type !== 'content_change' && e.type !== 'message_sent',
      ).length,
    };
  }, [logData]);

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleEventTypeChange = (value: string) => {
    setEventTypeFilter(value as '' | ActivityEventType);
    setPage(1);
  };

  const handleDisplayChange = (value: string) => {
    setDisplayFilter(value);
    setPage(1);
  };

  return (
    <div className="activity-log-page">
      {/* Header */}
      <div className="activity-log-header">
        <div>
          <h1 className="text-h1">יומן פעילות</h1>
          <p className="activity-log-subtitle">
            מעקב אחר כל האירועים במערכת בזמן אמת
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="activity-log-summary">
        <Card className="activity-log-summary-card">
          <div className="activity-log-summary-icon activity-log-summary-icon--accent">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div className="activity-log-summary-info">
            <div className="activity-log-summary-value">{summaryStats.total}</div>
            <div className="activity-log-summary-label">סה״כ אירועים</div>
          </div>
        </Card>
        <Card className="activity-log-summary-card">
          <div className="activity-log-summary-icon activity-log-summary-icon--blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
            </svg>
          </div>
          <div className="activity-log-summary-info">
            <div className="activity-log-summary-value">{summaryStats.contentChanges}</div>
            <div className="activity-log-summary-label">שינויי תוכן</div>
          </div>
        </Card>
        <Card className="activity-log-summary-card">
          <div className="activity-log-summary-icon activity-log-summary-icon--amber">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div className="activity-log-summary-info">
            <div className="activity-log-summary-value">{summaryStats.messages}</div>
            <div className="activity-log-summary-label">הודעות שנשלחו</div>
          </div>
        </Card>
        <Card className="activity-log-summary-card">
          <div className="activity-log-summary-icon activity-log-summary-icon--purple">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="activity-log-summary-info">
            <div className="activity-log-summary-value">{summaryStats.other}</div>
            <div className="activity-log-summary-label">אירועים נוספים</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="activity-log-filters">
        <div className="activity-log-search">
          <svg
            className="activity-log-search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="activity-log-search-input"
            placeholder="חיפוש באירועים..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <select
          className="activity-log-filter-select"
          value={eventTypeFilter}
          onChange={(e) => handleEventTypeChange(e.target.value)}
        >
          {ALL_EVENT_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          className="activity-log-filter-select"
          value={displayFilter}
          onChange={(e) => handleDisplayChange(e.target.value)}
        >
          <option value="">כל המסכים</option>
          {displays?.filter((d) => d.isEnabled).map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Events list */}
      <Card className="activity-log-list-card">
        <div className="activity-log-list-header">
          <h2 className="text-h3">אירועים</h2>
          <Badge variant="default">
            {logData?.total ?? 0} אירועים
          </Badge>
        </div>

        {isLoading ? (
          <div className="activity-log-loading">טוען אירועים...</div>
        ) : filteredEntries.length > 0 ? (
          <>
            <div className="activity-log-list">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="activity-log-item">
                  <span className={`activity-log-dot activity-log-dot--${entry.type}`} />
                  <div className="activity-log-content">
                    <div className="activity-log-description">
                      {entry.description}
                    </div>
                    <div className="activity-log-meta">
                      <span className="activity-log-timestamp">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                      <Badge variant={EVENT_TYPE_BADGE[entry.type]}>
                        {EVENT_TYPE_LABELS[entry.type]}
                      </Badge>
                      {entry.displayName && (
                        <span className="activity-log-display-name">
                          {entry.displayName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="activity-log-pagination">
                <button
                  className="activity-log-page-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  &rarr;
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      className={`activity-log-page-btn ${page === pageNum ? 'activity-log-page-btn--active' : ''}`}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  className="activity-log-page-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  &larr;
                </button>
                <span className="activity-log-page-info">
                  עמוד {page} מתוך {totalPages}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="activity-log-empty">
            <svg
              className="activity-log-empty-icon"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <div>אין אירועים להצגה</div>
            <div className="activity-log-empty-hint">
              אירועי המערכת יופיעו כאן באופן אוטומטי
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
